import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore, MODEL_OPTIONS } from '../../stores/settingsStore';
import { useChatStore, useActiveTab } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { ConversationList } from '../conversations/ConversationList';
import { useT } from '../../lib/i18n';
import { useAgentStore } from '../../stores/agentStore';
import { IS_ALPHA } from '../../lib/edition';
import { displayDeepSeekModelName } from '../../lib/deepseek-models';
import { ProfileStatsModal } from '../profile/ProfileStatsModal';

/** Map raw model ID to friendly display name */
function getModelDisplayName(modelId: string): string {
  const option = MODEL_OPTIONS.find((m) => modelId.includes(m.id));
  return option?.short || displayDeepSeekModelName(modelId);
}

/** Format token count: 1234 → "1.2k", 123456 → "123k", 1234567 → "1.2M" */
function formatTokenCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return (n / 1000).toFixed(1) + 'k';
  if (n < 1_000_000) return Math.round(n / 1000) + 'k';
  return (n / 1_000_000).toFixed(1) + 'M';
}

export function Sidebar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const toggleSettings = useSettingsStore((s) => s.toggleSettings);
  const setSecondaryTab = useSettingsStore((s) => s.setSecondaryTab);
  const updateAvailable = useSettingsStore((s) => s.updateAvailable);
  const cliUpdateAvailable = useSettingsStore((s) => s.cliUpdateAvailable);
  const sessionMeta = useActiveTab((t) => t.sessionMeta);
  const sessionStatus = useActiveTab((t) => t.sessionStatus);
  const t = useT();

  const startProjectDraft = (folderPath: string) => {
    useSettingsStore.getState().setWorkingDirectory(folderPath);

    const currentTabId = useSessionStore.getState().selectedSessionId;
    if (currentTabId) {
      useChatStore.getState().saveToCache(currentTabId);
      useAgentStore.getState().saveToCache(currentTabId);
    }

    const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    useChatStore.getState().ensureTab(newDraftId);
    useChatStore.getState().resetTab(newDraftId);
    useSessionStore.getState().addDraftSession(newDraftId, folderPath);
  };

  const addExistingProject = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t('sidebar.addProjectTitle'),
    });
    if (typeof selected === 'string') {
      startProjectDraft(selected);
    }
  };

  // Window dragging handled via CSS -webkit-app-region: drag on the top strip

  return (
    <div className="flex flex-col h-full pt-8 pb-4">
      {/* Logo area */}
      <div
        className="flex items-center justify-between mb-6 px-5 cursor-default">
        <div className="flex items-center">
          {IS_ALPHA ? (
            <>
              <span className="text-[14px] font-bold tracking-tight text-text-primary">
                TC<span style={{color: 'var(--color-accent)'}}>/</span>Alpha
              </span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase
                bg-accent/15 text-accent leading-none">
                alpha
              </span>
            </>
          ) : (
            /* Text logo — TOKEN/CODE, slash uses theme accent */
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProfileOpen(true)}
                className="rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40"
                title="个人资料"
              >
                <img src="/app-icon.png" alt="" className="w-8 h-8 rounded-lg shadow-sm" />
              </button>
              <span className="text-[18px] font-bold tracking-wide text-text-primary">
                TOKEN<span className="text-accent">/</span>CODE
              </span>
              <span className="text-[16px] text-success">♧</span>
            </div>
          )}
        </div>
        <button onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-tertiary
            transition-smooth" title={t('sidebar.hide')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <path d="M10 4L6 8L10 12" />
          </svg>
        </button>
      </div>

      {/* New Chat — navigate to WelcomeScreen where user picks a folder */}
      <div className="px-3">
      <button onClick={() => {
        const workingDirectory = useSettingsStore.getState().workingDirectory;
        if (!workingDirectory) {
          useSessionStore.getState().setSelectedSession(null);
          return;
        }
        startProjectDraft(workingDirectory);
      }}
        className="w-full py-2.5 px-4 rounded-[20px] text-sm font-medium
          bg-accent hover:bg-accent-hover text-text-inverse
          hover:shadow-glow transition-smooth mb-2
          flex items-center justify-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
        {t('sidebar.newChat')}
      </button>
      <button
        onClick={addExistingProject}
        className="w-full py-2.5 px-4 rounded-[16px] text-sm font-medium
          border border-border-subtle bg-bg-secondary text-text-primary
          hover:bg-bg-tertiary hover:border-border-default
          transition-smooth mb-4 flex items-center justify-center gap-2"
        title={t('sidebar.addProjectTitle')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M2.5 4.5h4l1.2 1.5h5.8v6.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
          <path d="M11 8v3M9.5 9.5h3" />
        </svg>
        {t('sidebar.addProject')}
      </button>

      {/* Current Session — compressed single-line card */}
      {sessionMeta.sessionId && (
        <div className="px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle mb-3
          flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-smooth
            ${sessionStatus === 'running'
              ? 'bg-success shadow-[0_0_8px_var(--color-accent-glow)] animate-pulse-soft'
              : sessionStatus === 'completed' ? 'bg-success'
              : sessionStatus === 'error' ? 'bg-error'
              : 'bg-text-tertiary'}`} />
          <span className="text-xs font-medium text-text-primary truncate">
            {sessionMeta.model ? getModelDisplayName(sessionMeta.model) : 'DeepSeek'}
          </span>
          {(sessionMeta.totalInputTokens || sessionMeta.totalOutputTokens
            || sessionMeta.inputTokens || sessionMeta.outputTokens) ? (
            <span className="text-[10px] text-text-tertiary font-mono flex items-center gap-1 ml-auto flex-shrink-0">
              <span>↑{formatTokenCount(sessionMeta.totalInputTokens || sessionMeta.inputTokens || 0)}</span>
              <span>↓{formatTokenCount(sessionMeta.totalOutputTokens || sessionMeta.outputTokens || 0)}</span>
            </span>
          ) : (
            <span className="text-[10px] text-text-tertiary capitalize ml-auto flex-shrink-0">{sessionStatus}</span>
          )}
        </div>
      )}
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 -mr-1.5 pr-1.5">
        <ConversationList />
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-border-subtle px-3">
        <button onClick={() => setSecondaryTab('preview')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
            text-sm text-text-muted hover:bg-bg-secondary hover:text-text-primary
            transition-smooth">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M2 4h12v8H2zM5 14h6" />
          </svg>
          {t('panel.preview')}
        </button>
        <button onClick={() => setSecondaryTab('skills')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
            text-sm text-text-muted hover:bg-bg-secondary hover:text-text-primary
            transition-smooth">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M8 1L1 4.5l7 3.5 7-3.5L8 1zM1 11.5l7 3.5 7-3.5M1 8l7 3.5L15 8" />
          </svg>
          {t('panel.skills')}
        </button>
        <button onClick={toggleSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
            text-sm text-text-muted hover:bg-bg-secondary hover:text-text-primary
            transition-smooth">
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
            </svg>
            {(updateAvailable || cliUpdateAvailable) && (
              <span className={`absolute -top-1 -right-1.5 w-2 h-2 rounded-full
                border-[1.5px] border-bg-sidebar ${cliUpdateAvailable ? 'bg-red-500' : 'bg-green-500'}`} />
            )}
          </div>
          {t('settings.title')}
        </button>
      </div>
      <ProfileStatsModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
