import { useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { SecondaryPanel } from './components/layout/SecondaryPanel';
import { CommandPalette } from './components/commands/CommandPalette';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ImageLightbox } from './components/shared/ImageLightbox';
import { ChangelogModal } from './components/shared/ChangelogModal';
import { Toast } from './components/shared/Toast';
import { useSettingsStore } from './stores/settingsStore';
import { useProviderStore } from './stores/providerStore';
import type { ColorTheme, FontFamily, Theme } from './stores/settingsStore';
import { useFileStore } from './stores/fileStore';
import { useChatStore } from './stores/chatStore';
import { useSessionStore } from './stores/sessionStore';
import { APP_NAME } from './lib/edition';
import { useAgentStore } from './stores/agentStore';
import { bridge, onFileChange, onClaudeStream, onSessionExit } from './lib/tauri-bridge';
import { useScrollZoom } from './lib/useScrollZoom';
import { useT } from './lib/i18n';
import { openUrl } from '@tauri-apps/plugin-opener';
import { loadClaudeUuid } from './hooks/useStreamProcessor';
import {
  getContextInputTokens,
  getContextOutputTokens,
  hasMeaningfulContextUsage,
} from './lib/context-usage';
import './App.css';

// --- Token state cache (survives F5 via sessionStorage) ---
// Primary F5 recovery: fast, real-time, covers active streaming sessions.
// JSONL (Claude native) is authoritative for historical/archived sessions.
// On reconnect we try JSONL first; sessionStorage is the reliable fallback.

const TOKEN_STATE_KEY = 'tokenicode_token_state_v2';

interface PersistedTokenState {
  inputTokens?: number;
  outputTokens?: number;
  contextInputTokens?: number;
  contextOutputTokens?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
}

function saveTokenState(tabId: string, meta: PersistedTokenState) {
  try {
    const data = JSON.parse(sessionStorage.getItem(TOKEN_STATE_KEY) || '{}');
    data[tabId] = {
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      contextInputTokens: meta.contextInputTokens,
      contextOutputTokens: meta.contextOutputTokens,
      totalInputTokens: meta.totalInputTokens,
      totalOutputTokens: meta.totalOutputTokens,
    };
    sessionStorage.setItem(TOKEN_STATE_KEY, JSON.stringify(data));
  } catch {/* ignore */}
}

function loadTokenState(tabId: string): PersistedTokenState | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(TOKEN_STATE_KEY) || '{}');
    return data[tabId] || null;
  } catch {
    return null;
  }
}

/** Accent colors per theme for the slash in the icon */
const THEME_ACCENT_COLORS: Record<ColorTheme, string> = {
  black: '#FFFFFF',
  blue: '#4E80F7',
  orange: '#C47252',
  green: '#57A64B',
};

const FONT_FAMILY_STACKS: Record<FontFamily, string> = {
  system: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif',
  microsoft: '"Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", Arial, sans-serif',
  sourceHan: '"Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif',
  lxgw: '"LXGW WenKai Screen", "LXGW WenKai", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif',
  mono: '"Cascadia Code", "JetBrains Mono", "SF Mono", Consolas, "Microsoft YaHei UI", monospace',
};

/** Render the app icon SVG as base64 PNG for macOS Dock.
 *  Uses the bundled watercolor app icon so dock and window branding match. */
function renderIconPng(_accentColor: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const size = 512;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => {
      reject(new Error('Failed to render icon'));
    };
    img.src = '/app-icon.png';
  });
}

async function updateDockIcon(colorTheme: ColorTheme, _theme: Theme) {
  try {
    const accentColor = THEME_ACCENT_COLORS[colorTheme];
    const pngBase64 = await renderIconPng(accentColor);
    await bridge.setDockIcon(pngBase64);
  } catch {
    // Silently ignore on non-macOS or errors
  }
}

function App() {
  const theme = useSettingsStore((s) => s.theme);
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const backgroundTheme = useSettingsStore((s) => s.backgroundTheme);
  const customBgImage = useSettingsStore((s) => s.customBgImage);
  const customBgSize = useSettingsStore((s) => s.customBgSize);
  const customBgPositionX = useSettingsStore((s) => s.customBgPositionX);
  const customBgPositionY = useSettingsStore((s) => s.customBgPositionY);
  const glassBlur = useSettingsStore((s) => s.glassBlur);
  const glassOpacity = useSettingsStore((s) => s.glassOpacity);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const monoFontFollowsInterface = useSettingsStore((s) => s.monoFontFollowsInterface);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);
  const workingDirectory = useSettingsStore((s) => s.workingDirectory);
  const lastSeenVersion = useSettingsStore((s) => s.lastSeenVersion);
  const setLastSeenVersion = useSettingsStore((s) => s.setLastSeenVersion);
  const selectedSessionId = useSessionStore((s) => s.selectedSessionId);
  const loadTree = useFileStore((s) => s.loadTree);
  const refreshTree = useFileStore((s) => s.refreshTree);
  const markFileChanged = useFileStore((s) => s.markFileChanged);
  const prevDirRef = useRef<string | null>(null);
  const homeDirRef = useRef<string>('');
  const [homeDirReady, setHomeDirReady] = useState(false);

  const t = useT();

  // Auto-check for app updates on startup (disabled to diagnose startup error)
  // useAutoUpdateCheck();

  // CLI update detection: check on startup + poll every 30 minutes
  useEffect(() => {
    const checkCliUpdate = () => {
      bridge.checkCliUpdate().then((result) => {
        useSettingsStore.setState({
          cliUpdateAvailable: result.update_available,
          cliLatestVersion: result.latest ?? '',
        });
      }).catch(() => {}); // silently ignore
    };
    checkCliUpdate();
    const interval = setInterval(checkCliUpdate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Confirm before closing the window (red X / Cmd+Q)
  const closePendingRef = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      win.onCloseRequested(async (event) => {
        if (closePendingRef.current) { event.preventDefault(); return; }
        event.preventDefault();
        closePendingRef.current = true;
        try {
          const { ask } = await import('@tauri-apps/plugin-dialog');
          const confirmed = await ask(tRef.current('confirm.exit'), {
            title: APP_NAME,
            kind: 'warning',
            okLabel: tRef.current('common.confirm'),
            cancelLabel: tRef.current('common.cancel'),
          });
          if (confirmed) {
            const { exit } = await import('@tauri-apps/plugin-process');
            await exit(0);
          }
        } finally {
          closePendingRef.current = false;
        }
      }).then((fn) => { unlisten = fn; });
    });
    return () => { unlisten?.(); };
  }, []);

  // TK-329: On app startup (incl. browser F5 refresh), handle active backend processes.
  // - Processes WITH stdinToTab mapping: re-register event listeners and restore streaming state
  // - Processes WITHOUT stdinToTab mapping: kill them (orphaned, no frontend mapping)
  // Use a ref to prevent double-run in React Strict Mode (dev only; harmless in prod)
  const reconnectRanRef = useRef(false);
  useEffect(() => {
    if (reconnectRanRef.current) return;
    reconnectRanRef.current = true;
    bridge.listActiveProcesses().then((activeIds) => {
      if (!activeIds.length) return;
      const sessionState = useSessionStore.getState();
      const { stdinToTab } = sessionState;
      const chatState = useChatStore.getState();
      const agentState = useAgentStore.getState();

      for (const stdinId of activeIds) {
        const tabId = stdinToTab[stdinId];
        if (!tabId) {
          // Orphaned: no frontend mapping — kill it
          console.log('[TOKENICODE:cleanup] killing orphaned process:', stdinId);
          bridge.killSession(stdinId).catch(() => {});
          continue;
        }

        // Reconnect: the session has a valid tab mapping
        console.log('[TOKENICODE:reconnect] reconnecting to:', stdinId, '→ tab:', tabId);

        // Ensure tab exists before setting state (tab may not exist yet at startup)
        chatState.ensureTab(tabId);

        // Mark session as running and streaming
        chatState.setSessionStatus(tabId, 'running');
        chatState.setSessionMeta(tabId, { stdinId });

        // Restore token totals: sessionStorage first (real-time, works for active streaming),
        // then JSONL as authoritative check (covers completed/historical sessions).
        const cachedTokens = loadTokenState(tabId);
        if (cachedTokens) {
          chatState.setSessionMeta(tabId, cachedTokens);
          console.log('[reconnect] restored tokens from cache for', tabId, cachedTokens);
        }
        // Background: cross-check with Claude's native JSONL for authoritative totals
        const claudeUuid = loadClaudeUuid(tabId);
        if (claudeUuid) {
          bridge.getSessionTokens(claudeUuid).then((jsonlTokens) => {
            // JSONL is authoritative; use it to correct if it has more data
            const current = chatState.getTab(tabId)?.sessionMeta ?? {};
            const corrected = {
              totalInputTokens: Math.max(current.totalInputTokens ?? 0, jsonlTokens.totalInputTokens),
              totalOutputTokens: Math.max(current.totalOutputTokens ?? 0, jsonlTokens.totalOutputTokens),
            };
            chatState.setSessionMeta(tabId, corrected);
            console.log('[reconnect] JSONL cross-check for', tabId, jsonlTokens, '→ merged:', corrected);
          }).catch(() => {
            // JSONL not available yet (active streaming session) — cache is sufficient
          });
        }
        const tab = chatState.getTab(tabId);
        if (tab) {
          useChatStore.setState({
            tabs: new Map(chatState.tabs).set(tabId, {
              ...tab,
              isStreaming: true,
            }),
          });
        }
        sessionState.setSessionRunning(tabId, true);

        // Reset agent state: clear stale "completed" agents from disk load,
        // then create a fresh main agent to reflect the running session.
        // Also save to agentCache so that handleLoadSession's restoreFromCache
        // doesn't wipe the agents (restoreFromCache clears agents on cache miss).
        agentState.clearAgents();
        agentState.upsertAgent({
          id: 'main',
          parentId: null,
          description: 'Reconnected',
          phase: 'thinking',
          startTime: Date.now(),
          isMain: true,
        });
        agentState.saveToCache(tabId);

        // Skip if listeners already exist (e.g. InputBar already set them up)
        if ((window as any).__claudeUnlisteners?.[stdinId]) continue;

        // Re-register stream listener — handle text/thinking deltas, token tracking,
        // agent phase updates, and process exit.
        onClaudeStream(stdinId, (msg: any) => {
          msg.__stdinId = stdinId;
          const ownerTabId = useSessionStore.getState().getTabForStdin(stdinId);
          const activeTabId = useSessionStore.getState().selectedSessionId;
          const targetTabId = ownerTabId || activeTabId;
          if (!targetTabId) return;

          const store = useChatStore.getState();
          const agStore = useAgentStore.getState();

          if (msg.type === 'stream_event' && msg.event) {
            const evt = msg.event;

            if (evt.type === 'content_block_delta') {
              const delta = evt.delta;
              if (delta?.type === 'text_delta' && delta.text) {
                store.updatePartialMessage(targetTabId, delta.text);
                agStore.updatePhase('main', 'writing');
              } else if (delta?.type === 'thinking_delta' && delta.thinking) {
                store.updatePartialThinking(targetTabId, delta.thinking);
                agStore.updatePhase('main', 'thinking');
              }
            }

            // Track input tokens from message_start (per-turn + cumulative total)
            if (evt.type === 'message_start' && evt.message?.usage) {
              const meta = store.getTab(targetTabId)?.sessionMeta ?? {};
              const delta = evt.message.usage.input_tokens || 0;
              const usage = evt.message.usage;
              store.setSessionMeta(targetTabId, {
                inputTokens: (meta.inputTokens || 0) + delta,
                totalInputTokens: (meta.totalInputTokens || 0) + delta,
                ...(hasMeaningfulContextUsage(usage) ? {
                  contextInputTokens: getContextInputTokens(usage),
                  contextOutputTokens: 0,
                } : {}),
              });
              const updated = store.getTab(targetTabId)?.sessionMeta;
              if (updated) saveTokenState(targetTabId, updated);
            }

            // Track output tokens from message_delta (per-turn + cumulative total)
            if (evt.type === 'message_delta' && evt.usage?.output_tokens) {
              const meta = store.getTab(targetTabId)?.sessionMeta ?? {};
              const delta = evt.usage.output_tokens;
              store.setSessionMeta(targetTabId, {
                outputTokens: (meta.outputTokens || 0) + delta,
                totalOutputTokens: (meta.totalOutputTokens || 0) + delta,
                contextOutputTokens: getContextOutputTokens(evt.usage),
              });
              const updated = store.getTab(targetTabId)?.sessionMeta;
              if (updated) saveTokenState(targetTabId, updated);
            }

            // Create sub-agents for Task/Agent tool_use starts
            if (evt.type === 'content_block_start'
                && evt.content_block?.type === 'tool_use'
                && (evt.content_block?.name === 'Task' || evt.content_block?.name === 'Agent')) {
              agStore.upsertAgent({
                id: evt.content_block.id || `task_${Date.now()}`,
                parentId: 'main',
                description: '',
                phase: 'spawning',
                startTime: Date.now(),
                isMain: false,
              });
            }
          }

          // Handle process exit — complete all agents and mark session idle
          if (msg.type === 'process_exit') {
            agStore.completeAll();
            store.setSessionStatus(targetTabId, 'idle');
          }
        }).then((unlisten) => {
          // Store unlisten for cleanup
          if (!(window as any).__claudeUnlisteners) {
            (window as any).__claudeUnlisteners = {};
          }
          if (!(window as any).__claudeUnlisteners[stdinId]) {
            (window as any).__claudeUnlisteners[stdinId] = unlisten;
          }
        });

        // Re-register exit listener
        onSessionExit(stdinId, () => {
          const exitTabId = useSessionStore.getState().getTabForStdin(stdinId);
          if (exitTabId) {
            useAgentStore.getState().completeAll();
            useChatStore.getState().setSessionStatus(exitTabId, 'idle');
          }
        });
      }
    }).catch(() => {});
  }, []);

  // macOS Full Disk Access check — detect TCC restrictions on startup
  const [showPermDialog, setShowPermDialog] = useState(false);
  useEffect(() => {
    const isMac = navigator.userAgent.includes('Mac');
    if (!isMac) return;
    // Skip if user previously dismissed the dialog
    if (localStorage.getItem('tokenicode-perm-dismissed')) return;
    bridge.checkFileAccess('/Users').then((ok) => {
      if (!ok) setShowPermDialog(true);
    }).catch(() => {});
  }, []);

  // Load custom session names and provider config on startup
  useEffect(() => {
    useSessionStore.getState().loadCustomPreviewsFromDisk();
    useProviderStore.getState().load();
    bridge.getHomeDir().then((dir) => { homeDirRef.current = dir; setHomeDirReady(true); }).catch(() => setHomeDirReady(true));
    // Notification permission is requested lazily on first need (see useStreamProcessor.ts)
  }, []);

  // Changelog modal state
  const [showChangelog, setShowChangelog] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState('');

  useEffect(() => {
    import('@tauri-apps/api/app').then(({ getVersion }) =>
      getVersion().then((version) => {
        setCurrentAppVersion(version);
        if (version && version !== lastSeenVersion) {
          import('./lib/changelog').then(({ getChangelog }) => {
            if (getChangelog(version)) {
              setShowChangelog(true);
            } else {
              setLastSeenVersion(version);
            }
          });
        }
      }).catch(() => {})
    );
  }, []);

  // Disable browser context menu globally (native app feel)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow context menu only in input fields and textareas
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
        || target.isContentEditable) return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  // Apply dark/light mode class to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => {
        if (mq.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      };
      apply();
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  // Apply color theme class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-blue', 'theme-orange', 'theme-green');
    if (colorTheme === 'blue') {
      root.classList.add('theme-blue');
    } else if (colorTheme === 'orange') {
      root.classList.add('theme-orange');
    } else if (colorTheme === 'green') {
      root.classList.add('theme-green');
    }
    // 'black' is the default — no class needed
  }, [colorTheme]);

  // Apply watercolor background skin class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('bg-theme-garden', 'bg-theme-sakura', 'bg-theme-lake', 'bg-theme-dusk', 'bg-theme-ink', 'bg-theme-vscode', 'bg-theme-minimal');
    root.classList.add(`bg-theme-${backgroundTheme}`);
  }, [backgroundTheme]);

  // Apply custom background image + glass morphism CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (customBgImage) {
      root.classList.add('custom-bg-active');
      root.style.setProperty('--custom-bg-image', `url(${customBgImage})`);
      root.style.setProperty('--custom-bg-size', customBgSize === 'fill' ? '100% 100%' : customBgSize);
      root.style.setProperty('--custom-bg-pos-x', `${customBgPositionX}%`);
      root.style.setProperty('--custom-bg-pos-y', `${customBgPositionY}%`);
      root.style.setProperty('--glass-blur', `${glassBlur}px`);
      root.style.setProperty('--glass-opacity', `${glassOpacity / 100}`);
    } else {
      root.classList.remove('custom-bg-active');
      root.style.removeProperty('--custom-bg-image');
      root.style.removeProperty('--custom-bg-size');
      root.style.removeProperty('--custom-bg-pos-x');
      root.style.removeProperty('--custom-bg-pos-y');
      root.style.removeProperty('--glass-blur');
      root.style.removeProperty('--glass-opacity');
    }
  }, [customBgImage, customBgSize, customBgPositionX, customBgPositionY, glassBlur, glassOpacity]);

  // Update macOS dock icon when color theme changes
  useEffect(() => {
    updateDockIcon(colorTheme, theme);
  }, [colorTheme, theme]);

  // Apply font size to document root
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  // Ctrl/Cmd+wheel UI zoom (ported from vscode-cc-enhance)
  useScrollZoom();

  // Apply font family to document root
  useEffect(() => {
    const stack = FONT_FAMILY_STACKS[fontFamily] || FONT_FAMILY_STACKS.microsoft;
    document.documentElement.style.setProperty('--tokenicode-font-family', stack);
  }, [fontFamily]);

  useEffect(() => {
    document.documentElement.dataset.monoFollowsInterface = monoFontFollowsInterface ? 'true' : 'false';
  }, [monoFontFollowsInterface]);

  // Cmd+/- global shortcut for font size
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        useSettingsStore.getState().increaseFontSize();
      } else if (e.key === '-') {
        e.preventDefault();
        useSettingsStore.getState().decreaseFontSize();
      } else if (e.key === '0') {
        e.preventDefault();
        useSettingsStore.getState().setFontSize(14);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Ctrl+Tab: quick-switch between the two most recent sessions
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const sessionState = useSessionStore.getState();
        const { previousSessionId, selectedSessionId, sessions } = sessionState;
        if (!previousSessionId || previousSessionId === selectedSessionId) return;
        // Verify previous session still exists
        const prevSession = sessions.find((s) => s.id === previousSessionId);
        if (!prevSession) return;

        // Save current session to cache
        if (selectedSessionId) {
          useChatStore.getState().saveToCache(selectedSessionId);
          useAgentStore.getState().saveToCache(selectedSessionId);
        }

        // Close file preview
        useFileStore.getState().closePreview();

        // Switch selection (this also updates previousSessionId)
        sessionState.setSelectedSession(previousSessionId);

        // Restore from cache
        const restored = useChatStore.getState().restoreFromCache(previousSessionId);
        if (restored) {
          useAgentStore.getState().restoreFromCache(previousSessionId);
          // Restore working directory
          const projectPath = prevSession.project || prevSession.projectDir;
          if (projectPath) {
            // Resolve project path using same logic as ConversationList
            let resolved = projectPath;
            if (!projectPath.startsWith('/') && !/^[A-Za-z]:[/\\]/.test(projectPath)) {
              if (projectPath.startsWith('~/')) {
                resolved = projectPath; // will work with home dir expansion
              } else if (/^[A-Za-z]-/.test(projectPath)) {
                const drive = projectPath[0];
                resolved = `${drive}:\\${projectPath.slice(2).replace(/-/g, '\\')}`;
              } else {
                resolved = projectPath.replace(/-/g, '/');
              }
            }
            useSettingsStore.getState().setWorkingDirectory(resolved);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load file tree + start watcher when working directory changes
  useEffect(() => {
    if (!workingDirectory) return;

    // Never watch the user's home directory — it has too many system file changes
    const normalizedHome = homeDirRef.current.replace(/\\/g, '/').replace(/\/$/, '');
    const normalizedWorkdir = workingDirectory.replace(/\\/g, '/').replace(/\/$/, '');
    if (normalizedWorkdir === normalizedHome) {
      console.log('[TOKENICODE] Skipping file watch on home directory:', workingDirectory);
      return;
    }

    // Unwatch previous directory
    if (prevDirRef.current && prevDirRef.current !== workingDirectory) {
      bridge.unwatchDirectory(prevDirRef.current).catch(() => {});
    }
    prevDirRef.current = workingDirectory;

    // Load tree and start watching
    loadTree(workingDirectory);
    bridge.watchDirectory(workingDirectory).catch(console.error);

    return () => {
      bridge.unwatchDirectory(workingDirectory).catch(() => {});
    };
  }, [workingDirectory, homeDirReady]);

  // Listen for file change events from the watcher
  // Debounce tree refresh for created/removed events (structure changes)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unlisten = onFileChange((event) => {
      // Defense-in-depth: skip paths under noisy directories (also filtered in Rust)
      const filtered = event.paths.filter((p) =>
        !/(^|[/\\])(\.(claude|git)|node_modules|__pycache__)[/\\]/.test(p)
      );
      if (filtered.length === 0) return;

      for (const filePath of filtered) {
        markFileChanged(filePath, event.kind);
      }

      // When files are created or removed, the tree structure changes —
      // debounce a full tree reload (300ms to batch rapid changes)
      if (event.kind === 'created' || event.kind === 'removed') {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          refreshTree();
          refreshTimerRef.current = null;
        }, 300);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [markFileChanged, refreshTree]);

  return (
    <>
      <AppShell
        sidebar={<Sidebar />}
        main={<ChatPanel key={selectedSessionId || 'new'} />}
        secondary={<SecondaryPanel />}
      />
      <CommandPalette />
      {settingsOpen && <SettingsPanel />}
      <ImageLightbox />
      {showChangelog && currentAppVersion && (
        <ChangelogModal
          version={currentAppVersion}
          onClose={() => {
            setShowChangelog(false);
            setLastSeenVersion(currentAppVersion);
          }}
        />
      )}
      {showPermDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-bg-primary rounded-2xl border border-border-subtle shadow-2xl
            max-w-md w-full mx-4 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 pt-6 pb-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
                  stroke="currentColor" strokeWidth="1.5" className="text-warning">
                  <path d="M10 2L1.5 17h17L10 2z" />
                  <path d="M10 8v4M10 14.5v.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">{t('perm.title')}</h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{t('perm.desc')}</p>
              </div>
            </div>
            {/* Path hint */}
            <div className="mx-6 px-3 py-2 rounded-lg bg-bg-secondary text-[11px] text-text-tertiary font-mono">
              {t('perm.path')}
            </div>
            {/* Actions */}
            <div className="px-6 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  localStorage.setItem('tokenicode-perm-dismissed', '1');
                  setShowPermDialog(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium
                  text-text-muted hover:text-text-primary hover:bg-bg-tertiary
                  transition-smooth cursor-pointer"
              >
                {t('perm.later')}
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('tokenicode-perm-dismissed', '1');
                  openUrl('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
                  setShowPermDialog(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold
                  bg-accent text-text-inverse hover:bg-accent-hover
                  transition-smooth cursor-pointer shadow-sm"
              >
                {t('perm.openSettings')}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast />
    </>
  );
}

export default App;
