import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEEPSEEK_V4_FLASH,
  DEEPSEEK_V4_FLASH_LABEL,
  DEEPSEEK_V4_PRO,
  DEEPSEEK_V4_PRO_LABEL,
  normalizeDeepSeekModelName,
} from '../lib/deepseek-models';

// --- Types ---

export type Theme = 'light' | 'dark' | 'system';
export type ColorTheme = 'black' | 'blue' | 'orange' | 'green';
export type BackgroundTheme = 'garden' | 'sakura' | 'lake' | 'dusk' | 'ink' | 'vscode' | 'minimal';
export type SecondaryPanelTab = 'files' | 'preview' | 'skills' | 'plugins';
export type ModelId = 'claude-opus-4-6' | 'claude-opus-4-6-1m' | 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001';
export type SessionMode = 'code' | 'ask' | 'plan' | 'bypass';
export type FontFamily = 'system' | 'microsoft' | 'sourceHan' | 'lxgw' | 'mono';
/** CLI permission mode for the SDK control protocol */
export type CliPermissionMode = 'acceptEdits' | 'default' | 'plan' | 'bypassPermissions';
export type Locale = 'zh' | 'en';

/** Map frontend session mode to CLI permission mode */
export function mapSessionModeToPermissionMode(mode: SessionMode): CliPermissionMode {
  switch (mode) {
    case 'code': return 'acceptEdits';
    case 'ask': return 'default';
    case 'plan': return 'plan';
    case 'bypass': return 'bypassPermissions';
  }
}
export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high' | 'max';
export type ContextWindowMode = 'default' | 'large1m';

function defaultAutoCompactThreshold(mode: ContextWindowMode): number {
  return mode === 'large1m' ? 800_000 : 160_000;
}

function clampAutoCompactThreshold(tokens: number): number {
  if (!Number.isFinite(tokens)) return 160_000;
  return Math.max(10_000, Math.min(1_000_000, Math.round(tokens)));
}

// --- Model options (display mapping) ---

export const MODEL_OPTIONS: { id: ModelId; label: string; short: string }[] = [
  { id: 'claude-opus-4-6', label: DEEPSEEK_V4_PRO_LABEL, short: DEEPSEEK_V4_PRO_LABEL },
  { id: 'claude-sonnet-4-6', label: DEEPSEEK_V4_FLASH_LABEL, short: DEEPSEEK_V4_FLASH_LABEL },
];

function migrateModelSelection(model: unknown): ModelId | undefined {
  if (typeof model !== 'string') return undefined;
  const normalized = normalizeDeepSeekModelName(model);
  if (normalized === DEEPSEEK_V4_PRO) return 'claude-opus-4-6';
  if (normalized === DEEPSEEK_V4_FLASH) return 'claude-sonnet-4-6';
  if (model === 'claude-opus-4-6-1m') return 'claude-opus-4-6';
  if (model === 'claude-haiku-4-5-20251001' || model === 'claude-haiku-4-5') return 'claude-sonnet-4-6';
  return undefined;
}

// --- Store State & Actions ---

interface SettingsState {
  theme: Theme;
  colorTheme: ColorTheme;
  backgroundTheme: BackgroundTheme;
  sidebarOpen: boolean;
  secondaryPanelOpen: boolean;
  secondaryPanelTab: SecondaryPanelTab;
  secondaryPanelWidth: number;
  settingsOpen: boolean;
  workingDirectory: string;
  selectedModel: string;
  sessionMode: SessionMode;
  locale: Locale;
  /** Global UI font size in px (default 18) */
  fontSize: number;
  /** Global UI font family preset */
  fontFamily: FontFamily;
  /** Whether mono-styled UI labels should follow the selected interface font */
  monoFontFollowsInterface: boolean;
  /** Sidebar width in px (default 280) */
  sidebarWidth: number;
  /** Whether the CLI setup wizard has been completed or skipped */
  setupCompleted: boolean;
  /** Thinking effort level: off disables, low/medium/high/max set effort */
  thinkingLevel: ThinkingLevel;
  /** Declares that the selected/provider model supports a 1M context window. */
  contextWindowMode: ContextWindowMode;
  /** User-adjustable auto compact threshold in tokens. */
  autoCompactThresholdTokens: number;
  /** Whether a newer version is available (set by auto-check on startup) */
  updateAvailable: boolean;
  /** Whether a newer CLI version is available */
  cliUpdateAvailable: boolean;
  /** Latest CLI version string (for display) */
  cliLatestVersion: string;
  /** Version string of the available update */
  updateVersion: string;
  /** Whether the update has been downloaded and is ready for restart (transient, not persisted) */
  updateDownloaded: boolean;
  /** Last app version the user has seen the changelog for */
  lastSeenVersion: string;
  /** Custom AI avatar image (data URL or empty string for default </> icon) */
  aiAvatarUrl: string;
  /** Custom user avatar image (data URL or empty string for default initials) */
  userAvatarUrl: string;
  /** User display name shown next to messages */
  userDisplayName: string;
  /** Whether to show dotfiles (hidden files) in the file tree */
  showHiddenFiles: boolean;

  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
  setBackgroundTheme: (backgroundTheme: BackgroundTheme) => void;
  /** Whether the floating agent panel is open */
  agentPanelOpen: boolean;

  toggleSidebar: () => void;
  toggleSecondaryPanel: () => void;
  toggleAgentPanel: () => void;
  setSecondaryTab: (tab: SecondaryPanelTab) => void;
  setSecondaryPanelWidth: (width: number) => void;
  toggleSettings: () => void;
  setWorkingDirectory: (dir: string) => void;
  setSelectedModel: (model: string) => void;
  setSessionMode: (mode: SessionMode) => void;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: FontFamily) => void;
  setMonoFontFollowsInterface: (enabled: boolean) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setSidebarWidth: (width: number) => void;
  setSetupCompleted: (completed: boolean) => void;
  setThinkingLevel: (level: ThinkingLevel) => void;
  setContextWindowMode: (mode: ContextWindowMode) => void;
  setAutoCompactThresholdTokens: (tokens: number) => void;
  setUpdateAvailable: (available: boolean, version?: string) => void;
  setUpdateDownloaded: (downloaded: boolean) => void;
  setLastSeenVersion: (version: string) => void;
  setAiAvatarUrl: (url: string) => void;
  setUserAvatarUrl: (url: string) => void;
  setUserDisplayName: (name: string) => void;
  toggleHiddenFiles: () => void;
}

// --- Theme cycle order ---

const themeCycle: Theme[] = ['light', 'dark', 'system'];

function nextTheme(current: Theme): Theme {
  const idx = themeCycle.indexOf(current);
  return themeCycle[(idx + 1) % themeCycle.length];
}

// --- Store ---

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      colorTheme: 'black',
      backgroundTheme: 'garden',
      sidebarOpen: true,
      secondaryPanelOpen: false,
      secondaryPanelTab: 'files',
      secondaryPanelWidth: 300,
      settingsOpen: false,
      agentPanelOpen: false,
      workingDirectory: '',
      selectedModel: 'claude-sonnet-4-6',
      sessionMode: 'bypass',
      locale: 'zh',
      fontSize: 18,
      fontFamily: 'microsoft',
      monoFontFollowsInterface: true,
      sidebarWidth: 280,
      setupCompleted: false,
      thinkingLevel: 'medium' as ThinkingLevel,
      contextWindowMode: 'default',
      autoCompactThresholdTokens: 160_000,
      updateAvailable: false,
      updateVersion: '',
      cliUpdateAvailable: false,
      cliLatestVersion: '',
      updateDownloaded: false,
      lastSeenVersion: '',
      aiAvatarUrl: '',
      userAvatarUrl: '',
      userDisplayName: '',
      showHiddenFiles: false,

      toggleTheme: () =>
        set((state) => ({ theme: nextTheme(state.theme) })),

      setTheme: (theme) => set(() => ({ theme })),

      setColorTheme: (colorTheme) => set(() => ({ colorTheme })),

      setBackgroundTheme: (backgroundTheme) => set(() => ({ backgroundTheme })),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleSecondaryPanel: () =>
        set((state) => ({
          secondaryPanelOpen: !state.secondaryPanelOpen,
        })),

      toggleAgentPanel: () =>
        set((state) => ({ agentPanelOpen: !state.agentPanelOpen })),

      setSecondaryTab: (tab) =>
        set(() => ({
          secondaryPanelTab: tab,
          secondaryPanelOpen: true,
        })),

      setSecondaryPanelWidth: (width) =>
        set(() => ({ secondaryPanelWidth: width })),

      toggleSettings: () =>
        set((state) => ({
          settingsOpen: !state.settingsOpen,
          // Clear update badge when opening settings
          ...(!state.settingsOpen && state.updateAvailable ? { updateAvailable: false } : {}),
        })),

      setWorkingDirectory: (dir) =>
        set(() => ({ workingDirectory: dir })),

      setSelectedModel: (model) =>
        set(() => ({ selectedModel: model })),

      setSessionMode: (mode) =>
        set(() => ({ sessionMode: mode })),

      setLocale: (locale) =>
        set(() => ({ locale })),

      toggleLocale: () =>
        set((state) => ({ locale: state.locale === 'zh' ? 'en' : 'zh' })),

      setFontSize: (size) =>
        set(() => ({ fontSize: Math.max(10, Math.min(36, size)) })),

      setFontFamily: (fontFamily) =>
        set(() => ({ fontFamily })),

      setMonoFontFollowsInterface: (monoFontFollowsInterface) =>
        set(() => ({ monoFontFollowsInterface })),

      increaseFontSize: () =>
        set((state) => ({ fontSize: Math.min(36, state.fontSize + 1) })),

      decreaseFontSize: () =>
        set((state) => ({ fontSize: Math.max(10, state.fontSize - 1) })),

      setSidebarWidth: (width) =>
        set(() => ({ sidebarWidth: Math.max(180, Math.min(450, width)) })),

      setSetupCompleted: (completed) =>
        set(() => ({ setupCompleted: completed })),

      setThinkingLevel: (level) =>
        set(() => ({ thinkingLevel: level })),

      setContextWindowMode: (contextWindowMode) =>
        set((state) => {
          const oldDefault = defaultAutoCompactThreshold(state.contextWindowMode);
          const nextDefault = defaultAutoCompactThreshold(contextWindowMode);
          return {
            contextWindowMode,
            ...(state.autoCompactThresholdTokens === oldDefault
              ? { autoCompactThresholdTokens: nextDefault }
              : {}),
          };
        }),

      setAutoCompactThresholdTokens: (autoCompactThresholdTokens) =>
        set(() => ({ autoCompactThresholdTokens: clampAutoCompactThreshold(autoCompactThresholdTokens) })),

      setUpdateAvailable: (available, version) =>
        set(() => ({
          updateAvailable: available,
          ...(version !== undefined ? { updateVersion: version } : {}),
          ...(!available ? { updateVersion: '', updateDownloaded: false } : {}),
        })),

      setUpdateDownloaded: (downloaded) =>
        set(() => ({ updateDownloaded: downloaded })),

      setLastSeenVersion: (version) =>
        set(() => ({ lastSeenVersion: version })),

      setAiAvatarUrl: (url) =>
        set(() => ({ aiAvatarUrl: url })),

      setUserAvatarUrl: (url) =>
        set(() => ({ userAvatarUrl: url })),

      setUserDisplayName: (name) =>
        set(() => ({ userDisplayName: name.slice(0, 20) })),
      toggleHiddenFiles: () =>
        set((state) => ({ showHiddenFiles: !state.showHiddenFiles })),
    }),
    {
      name: 'tokenicode-settings',
      version: 11,
      migrate: (persistedState: unknown, version: number) => {
        const persisted = persistedState as Record<string, unknown>;
        if (version === 0) {
          // Migrate legacy model IDs to current ones
          const legacyMap: Record<string, ModelId> = {
            'claude-opus-4-0': 'claude-opus-4-6',
            'claude-sonnet-4-0': 'claude-sonnet-4-6',
            'claude-haiku-3-5': 'claude-haiku-4-5-20251001',
          };
          const old = persisted.selectedModel as string;
          if (old && legacyMap[old]) {
            persisted.selectedModel = legacyMap[old];
          }
        }
        if (version < 2) {
          persisted.updateAvailable = false;
          persisted.updateVersion = '';
          persisted.lastSeenVersion = '';
        }
        if (version < 3) {
          persisted.apiProviderMode = 'inherit';
          persisted.customProviderName = '';
          persisted.customProviderBaseUrl = '';
          persisted.customProviderModelMappings = [];
          persisted.customProviderApiFormat = 'anthropic';
        }
        if (version < 4) {
          // Migrate boolean thinkingEnabled → ThinkingLevel
          const oldThinking = persisted.thinkingEnabled;
          persisted.thinkingLevel = oldThinking === false ? 'off' : 'high';
          delete persisted.thinkingEnabled;
        }
        if (version < 5) {
          // Force default mode to bypass — old versions may have persisted 'code'/'ask'
          persisted.sessionMode = 'bypass';
        }
        if (version < 6) {
          // Fix Haiku model ID: claude-haiku-4-5 → claude-haiku-4-5-20251001
          if (persisted.selectedModel === 'claude-haiku-4-5') {
            persisted.selectedModel = 'claude-haiku-4-5-20251001';
          }
        }
        if (version < 7) {
          const migratedModel = migrateModelSelection(persisted.selectedModel);
          if (migratedModel) {
            persisted.selectedModel = migratedModel;
          }
        }
        if (version < 8) {
          persisted.backgroundTheme = 'garden';
        }
        if (version < 9) {
          persisted.monoFontFollowsInterface = true;
        }
        if (version < 10) {
          persisted.contextWindowMode = 'default';
        }
        if (version < 11) {
          const mode = persisted.contextWindowMode === 'large1m' ? 'large1m' : 'default';
          persisted.autoCompactThresholdTokens = defaultAutoCompactThreshold(mode);
        }
        return persisted;
      },
      partialize: (state) => ({
        theme: state.theme,
        colorTheme: state.colorTheme,
        backgroundTheme: state.backgroundTheme,
        sidebarOpen: state.sidebarOpen,
        secondaryPanelWidth: state.secondaryPanelWidth,
        workingDirectory: state.workingDirectory,
        selectedModel: state.selectedModel,
        sessionMode: state.sessionMode,
        locale: state.locale,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        monoFontFollowsInterface: state.monoFontFollowsInterface,
        sidebarWidth: state.sidebarWidth,
        setupCompleted: state.setupCompleted,
        thinkingLevel: state.thinkingLevel,
        contextWindowMode: state.contextWindowMode,
        autoCompactThresholdTokens: state.autoCompactThresholdTokens,
        updateAvailable: state.updateAvailable,
        updateVersion: state.updateVersion,
        lastSeenVersion: state.lastSeenVersion,
        aiAvatarUrl: state.aiAvatarUrl,
        userAvatarUrl: state.userAvatarUrl,
        userDisplayName: state.userDisplayName,
        showHiddenFiles: state.showHiddenFiles,
      }),
    },
  ),
);

// --- Per-session effective value helpers (Phase 4) ---
// These read the snapshotted value from SessionMeta, falling back to the global store.
// Import SessionMeta lazily to avoid circular dependency.

/** Get the effective session mode for a given session's meta snapshot */
export function getEffectiveMode(meta: { snapshotMode?: SessionMode } | undefined): SessionMode {
  return meta?.snapshotMode ?? useSettingsStore.getState().sessionMode;
}

/** Get the effective model for a given session's meta snapshot */
export function getEffectiveModel(meta: { snapshotModel?: string } | undefined): string {
  return meta?.snapshotModel ?? useSettingsStore.getState().selectedModel;
}

/** Get the effective thinking level for a given session's meta snapshot */
export function getEffectiveThinking(meta: { snapshotThinking?: ThinkingLevel } | undefined): ThinkingLevel {
  return meta?.snapshotThinking ?? useSettingsStore.getState().thinkingLevel;
}

export function isLargeContextMode(model?: string, mode?: ContextWindowMode): boolean {
  if (mode === 'large1m') return true;
  const lower = (model || '').toLowerCase();
  return lower.includes('1m') || lower.includes('[1m]');
}

export function getContextWindowForModel(model?: string, mode?: ContextWindowMode): number {
  return isLargeContextMode(model, mode) ? 1_000_000 : 200_000;
}

export function getAutoCompactThreshold(model?: string, mode?: ContextWindowMode, overrideTokens?: number): number {
  if (typeof overrideTokens === 'number') {
    return clampAutoCompactThreshold(overrideTokens);
  }
  return getContextWindowForModel(model, mode) >= 1_000_000 ? 800_000 : 160_000;
}

// --- Runtime mode switching via SDK control protocol ---
// When sessionMode changes and there's an active CLI session, send set_permission_mode.

let _skipNextModeSync = false;

/** Update frontend sessionMode WITHOUT sending set_permission_mode to CLI.
 *  Use when CLI already switched modes internally (e.g. after ExitPlanMode allow). */
export function setSessionModeLocal(mode: SessionMode): void {
  _skipNextModeSync = true;
  useSettingsStore.getState().setSessionMode(mode);
}

useSettingsStore.subscribe((state, prevState) => {
  if (state.sessionMode === prevState.sessionMode) return;

  if (_skipNextModeSync) {
    _skipNextModeSync = false;
    return;
  }

  const cliMode = mapSessionModeToPermissionMode(state.sessionMode);

  // bypass uses --dangerously-skip-permissions at startup; can't switch TO bypass at runtime
  if (cliMode === 'bypassPermissions') return;

  // Dynamically import to avoid circular deps
  Promise.all([
    import('../lib/tauri-bridge'),
    import('./chatStore'),
  ]).then(([{ bridge }, { getActiveTabState }]) => {
    const stdinId = getActiveTabState().sessionMeta.stdinId;
    if (!stdinId) return; // No active session

    bridge.setPermissionMode(stdinId, cliMode).catch((err: unknown) => {
      console.error('[TOKENICODE] Failed to set permission mode:', err);
    });
  });
});
