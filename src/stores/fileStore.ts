import { create } from 'zustand';
import { bridge, FileNode, RecentProject } from '../lib/tauri-bridge';

export type FileChangeKind = 'created' | 'modified' | 'removed';
export type PreviewMode = 'preview' | 'source' | 'edit';

// Batch buffer for markFileChanged — collect changes within a single frame, flush once via rAF
const _pendingChanges = new Map<string, FileChangeKind>();
let _changeFlushRaf = 0;

interface FileState {
  rootPath: string;

  // Flat directory cache — one entry per navigated-to directory, single level only
  dirContents: Map<string, FileNode[]>;
  loadingDirs: Set<string>;
  expandedDirs: Set<string>;

  isLoading: boolean;
  selectedFile: string | null;
  fileContent: string | null;
  isLoadingContent: boolean;
  previewMode: PreviewMode;

  // Editing state
  editContent: string | null;
  isSaving: boolean;

  // Unsaved changes navigation guard
  pendingNavigation: string | null;
  showUnsavedDialog: boolean;

  // Project management
  recentProjects: RecentProject[];
  isLoadingProjects: boolean;

  // File change tracking
  changedFiles: Map<string, FileChangeKind>;

  // Directory missing detection
  directoryMissing: boolean;

  // External drag-drop state
  isDragOverTree: boolean;

  /** Load the root directory (single level). Clears all caches on directory switch. */
  loadTree: (path: string) => Promise<void>;
  /** Fetch a directory's entries and mark it expanded. */
  expandDir: (path: string) => Promise<void>;
  /** Mark a directory as collapsed. */
  collapseDir: (path: string) => void;
  /** Re-read a single directory level. Only refreshes if the dir is already cached. */
  refreshDir: (path: string) => Promise<void>;
  selectFile: (path: string) => Promise<void>;
  clearSelection: () => void;
  closePreview: () => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setEditContent: (content: string) => void;
  saveFile: () => Promise<void>;
  discardEdits: () => void;
  fetchRecentProjects: () => Promise<void>;
  /** Reload the currently previewed file content without toggling selection */
  reloadContent: () => Promise<void>;
  markFileChanged: (path: string, kind: FileChangeKind) => void;
  clearChangedFiles: () => void;
  // Unsaved changes actions
  confirmDiscard: () => void;
  confirmSaveAndSwitch: () => Promise<void>;
  cancelNavigation: () => void;
  // New file/folder actions
  createFile: (parentDir: string, name: string) => Promise<void>;
  createFolder: (parentDir: string, name: string) => Promise<void>;
  // External drag state
  setDragOverTree: (v: boolean) => void;
}

export const useFileStore = create<FileState>()((set, get) => ({
  rootPath: '',
  dirContents: new Map(),
  loadingDirs: new Set(),
  expandedDirs: new Set(),
  isLoading: false,
  selectedFile: null,
  fileContent: null,
  isLoadingContent: false,
  previewMode: 'preview' as PreviewMode,
  editContent: null,
  isSaving: false,
  pendingNavigation: null,
  showUnsavedDialog: false,
  recentProjects: [],
  isLoadingProjects: false,
  changedFiles: new Map(),
  directoryMissing: false,
  isDragOverTree: false,

  loadTree: async (path: string) => {
    if (!path) return;
    const prevRoot = get().rootPath;
    const isNewDir = path !== prevRoot;
    set({
      rootPath: path,
      isLoading: true,
      // Clear all caches on directory switch
      ...(isNewDir ? { dirContents: new Map(), expandedDirs: new Set(), loadingDirs: new Set(), changedFiles: new Map(), directoryMissing: false } : {}),
    });
    try {
      const entries = await bridge.readFileTree(path, 1);
      if (get().rootPath === path) {
        const next = new Map(get().dirContents);
        next.set(path, entries);
        set({ dirContents: next, isLoading: false, changedFiles: new Map(), directoryMissing: false });
      }
    } catch (err) {
      if (get().rootPath === path) {
        const missing = String(err).includes('does not exist');
        set({ isLoading: false, directoryMissing: missing });
      }
    }
  },

  expandDir: async (path: string) => {
    const { dirContents, expandedDirs, loadingDirs } = get();
    const nextExpanded = new Set(expandedDirs);
    nextExpanded.add(path);
    set({ expandedDirs: nextExpanded });

    // Already cached — nothing to fetch
    if (dirContents.has(path)) return;

    // Already loading — avoid duplicate fetch
    if (loadingDirs.has(path)) return;

    const nextLoading = new Set(loadingDirs);
    nextLoading.add(path);
    set({ loadingDirs: nextLoading });

    try {
      const entries = await bridge.readFileTree(path, 1);
      const next = new Map(get().dirContents);
      next.set(path, entries);
      // Only apply if still expanded (not collapsed during fetch)
      if (get().expandedDirs.has(path)) {
        const doneLoading = new Set(get().loadingDirs);
        doneLoading.delete(path);
        set({ dirContents: next, loadingDirs: doneLoading });
      }
    } catch {
      // Clean up loading state silently
      const doneLoading = new Set(get().loadingDirs);
      doneLoading.delete(path);
      set({ loadingDirs: doneLoading });
    }
  },

  collapseDir: (path: string) => {
    const next = new Set(get().expandedDirs);
    next.delete(path);
    set({ expandedDirs: next });
  },

  refreshDir: async (path: string) => {
    // Only refresh dirs that are currently expanded
    if (!get().expandedDirs.has(path)) return;
    try {
      const entries = await bridge.readFileTree(path, 1);
      const next = new Map(get().dirContents);
      next.set(path, entries);
      set({ dirContents: next });
    } catch {
      // Silently fail — keep previous entries
    }
  },

  selectFile: async (path: string) => {
    const { selectedFile, editContent, fileContent } = get();
    const isDirty = editContent !== null && editContent !== fileContent;

    if (isDirty && path !== selectedFile) {
      set({ pendingNavigation: path, showUnsavedDialog: true });
      return;
    }

    if (selectedFile === path) {
      set({ selectedFile: null, fileContent: null, isLoadingContent: false, editContent: null });
    } else {
      set({ selectedFile: path, fileContent: null, isLoadingContent: true, previewMode: 'preview', editContent: null });

      const ext = path.split('.').pop()?.toLowerCase() || '';
      const BINARY_PREVIEW = new Set([
        'png','jpg','jpeg','gif','webp','bmp','ico',
        'pdf','mp4','webm','mov','avi',
        'mp3','wav','ogg','aac','m4a',
      ]);

      if (BINARY_PREVIEW.has(ext)) {
        try {
          const dataUrl = await bridge.readFileBase64(path);
          if (get().selectedFile === path) {
            set({ fileContent: dataUrl, isLoadingContent: false });
          }
        } catch {
          if (get().selectedFile === path) {
            set({ fileContent: null, isLoadingContent: false });
          }
        }
      } else {
        try {
          const content = await bridge.readFileContent(path);
          if (get().selectedFile === path) {
            set({ fileContent: content, isLoadingContent: false });
          }
        } catch {
          if (get().selectedFile === path) {
            set({ fileContent: '// Error loading file', isLoadingContent: false });
          }
        }
      }
    }
  },

  clearSelection: () => set({ selectedFile: null, fileContent: null, isLoadingContent: false, editContent: null }),

  closePreview: () => set({ selectedFile: null, fileContent: null, isLoadingContent: false, editContent: null }),

  setPreviewMode: (mode: PreviewMode) => {
    const state = get();
    if (mode === 'edit') {
      set({ previewMode: mode, editContent: state.fileContent });
    } else {
      set({ previewMode: mode });
    }
  },

  setEditContent: (content: string) => set({ editContent: content }),

  saveFile: async () => {
    const { selectedFile, editContent } = get();
    if (!selectedFile || editContent === null) return;
    set({ isSaving: true });
    try {
      await bridge.writeFileContent(selectedFile, editContent);
      set({ fileContent: editContent, editContent: null, isSaving: false, previewMode: 'preview' });
    } catch {
      set({ isSaving: false });
    }
  },

  discardEdits: () => {
    set({ editContent: null, previewMode: 'preview' });
  },

  fetchRecentProjects: async () => {
    set({ isLoadingProjects: true });
    try {
      const projects = await bridge.listRecentProjects();
      set({ recentProjects: projects, isLoadingProjects: false });
    } catch {
      set({ isLoadingProjects: false });
    }
  },

  reloadContent: async () => {
    const path = get().selectedFile;
    if (!path) return;
    if (get().editContent !== null) return;
    try {
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const BINARY_PREVIEW = new Set([
        'png','jpg','jpeg','gif','webp','bmp','ico',
        'pdf','mp4','webm','mov','avi',
        'mp3','wav','ogg','aac','m4a',
      ]);
      if (BINARY_PREVIEW.has(ext)) {
        const dataUrl = await bridge.readFileBase64(path);
        if (get().selectedFile === path) set({ fileContent: dataUrl });
      } else {
        const content = await bridge.readFileContent(path);
        if (get().selectedFile === path) set({ fileContent: content });
      }
    } catch {
      // Silently fail — keep existing content
    }
  },

  markFileChanged: (path: string, kind: FileChangeKind) => {
    _pendingChanges.set(path, kind);
    if (!_changeFlushRaf) {
      _changeFlushRaf = requestAnimationFrame(() => {
        _changeFlushRaf = 0;
        if (_pendingChanges.size === 0) return;
        const next = new Map(get().changedFiles);
        for (const [p, k] of _pendingChanges) {
          next.set(p, k);
        }
        _pendingChanges.clear();
        set({ changedFiles: next });
      });
    }
  },

  clearChangedFiles: () => set({ changedFiles: new Map() }),

  confirmDiscard: () => {
    const pending = get().pendingNavigation;
    set({ editContent: null, showUnsavedDialog: false, pendingNavigation: null });
    if (pending) get().selectFile(pending);
  },

  confirmSaveAndSwitch: async () => {
    const pending = get().pendingNavigation;
    await get().saveFile();
    set({ showUnsavedDialog: false, pendingNavigation: null });
    if (pending) get().selectFile(pending);
  },

  cancelNavigation: () => {
    set({ pendingNavigation: null, showUnsavedDialog: false });
  },

  createFile: async (parentDir: string, name: string) => {
    const path = `${parentDir}/${name}`;
    try {
      await bridge.writeFileContent(path, '');
      await get().refreshDir(parentDir);
      get().selectFile(path);
    } catch {
      // Silently fail
    }
  },

  createFolder: async (parentDir: string, name: string) => {
    try {
      await bridge.createDirectory(`${parentDir}/${name}`);
      await get().refreshDir(parentDir);
    } catch {
      // Silently fail
    }
  },

  setDragOverTree: (v: boolean) => set({ isDragOverTree: v }),
}));
