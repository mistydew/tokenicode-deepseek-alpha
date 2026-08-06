import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { openUrl as openExternalUrl } from '@tauri-apps/plugin-opener';
import { usePreviewStore, PreviewCommand } from '../../stores/previewStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useT } from '../../lib/i18n';

export function PreviewPanel() {
  const t = useT();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const url = usePreviewStore((s) => s.url);
  const history = usePreviewStore((s) => s.history);
  const historyIndex = usePreviewStore((s) => s.historyIndex);
  const reloadToken = usePreviewStore((s) => s.reloadToken);
  const openUrl = usePreviewStore((s) => s.openUrl);
  const refresh = usePreviewStore((s) => s.refresh);
  const back = usePreviewStore((s) => s.back);
  const forward = usePreviewStore((s) => s.forward);
  const setSecondaryTab = useSettingsStore((s) => s.setSecondaryTab);
  const [draftUrl, setDraftUrl] = useState(url === 'about:blank' ? '' : url);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const isEmbeddedPreview = /^(about:|data:|file:|https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$))/i.test(url);

  const openInAppWindow = async (target: string) => {
    if (!/^https?:\/\//i.test(target)) return;
    const label = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      new WebviewWindow(label, {
        url: target,
        title: target,
        width: 1100,
        height: 760,
        center: true,
      });
      setNotice(t('preview.openedInAppWindow'));
    } catch (error) {
      console.warn('[preview] in-app browser failed, opening system browser', error);
      await openExternalUrl(target);
      setNotice(t('preview.openedExternal'));
    }
  };

  useEffect(() => {
    setDraftUrl(url === 'about:blank' ? '' : url);
  }, [url]);

  useEffect(() => {
    if (url !== 'about:blank') setLoading(true);
  }, [url, reloadToken]);

  useEffect(() => {
    const unlistenPromise = listen<PreviewCommand>('tokenicode-preview-command', (event) => {
      const command = event.payload;
      setSecondaryTab('preview');
      if (command.type === 'open') {
        openUrl(command.url);
        const normalized = usePreviewStore.getState().url;
        if (/^https?:\/\//i.test(normalized)
          && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(normalized)) {
          openInAppWindow(normalized);
        }
      }
      if (command.type === 'refresh') refresh();
      if (command.type === 'back') back();
      if (command.type === 'forward') forward();
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [back, forward, openUrl, refresh, setSecondaryTab]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex >= 0 && historyIndex < history.length - 1;
  const iframeKey = `${url}:${reloadToken}`;

  const submitUrl = () => {
    openUrl(draftUrl);
    const normalized = usePreviewStore.getState().url;
    if (/^https?:\/\//i.test(normalized)
      && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(normalized)) {
      openInAppWindow(normalized);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="px-3 py-2 border-b border-border-subtle space-y-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={back}
            disabled={!canGoBack}
            className="preview-icon-btn"
            title={t('preview.back')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>
          <button
            onClick={forward}
            disabled={!canGoForward}
            className="preview-icon-btn"
            title={t('preview.forward')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
          <button
            onClick={refresh}
            className="preview-icon-btn"
            title={t('preview.refresh')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 8a5 5 0 11-1.46-3.54" />
              <path d="M13 3v4H9" />
            </svg>
          </button>
          <form
            className="flex-1 min-w-0"
            onSubmit={(event) => {
              event.preventDefault();
              submitUrl();
            }}
          >
            <input
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              placeholder={t('preview.urlPlaceholder')}
              className="w-full h-8 px-2 rounded-md bg-bg-secondary border border-border-subtle
                text-[12px] text-text-primary placeholder:text-text-tertiary outline-none
                focus:border-accent/60"
            />
          </form>
          <button
            onClick={submitUrl}
            className="preview-icon-btn"
            title={t('preview.open')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12L12 4" />
              <path d="M6 4h6v6" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 text-[11px] text-text-tertiary truncate">
            {loading ? t('preview.loading') : url}
          </div>
          <div className="flex items-center gap-1">
            {!isEmbeddedPreview && url !== 'about:blank' && (
              <button onClick={() => openInAppWindow(url)} className="preview-action-btn"
                title={t('preview.openInAppWindow')}>
                {t('preview.openInAppWindow')}
              </button>
            )}
            <button
              onClick={() => url !== 'about:blank' && openExternalUrl(url)}
              className="preview-icon-btn"
              title={t('preview.external')}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4H4a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2" />
                <path d="M10 2h4v4" />
                <path d="M8 8l6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 bg-white">
        {url === 'about:blank' ? (
          <div className="h-full flex items-center justify-center bg-bg-primary text-text-tertiary text-sm">
            {t('preview.empty')}
          </div>
        ) : !isEmbeddedPreview ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 bg-bg-primary px-6 text-center">
            <div className="text-sm text-text-primary">{t('preview.remotePageTitle')}</div>
            <div className="text-xs text-text-tertiary max-w-sm">{t('preview.remotePageHint')}</div>
            <button onClick={() => openInAppWindow(url)} className="preview-action-btn">
              {t('preview.openInAppWindow')}
            </button>
          </div>
        ) : (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setNotice(t('preview.loadFailed'));
            }}
          />
        )}
        {loading && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-accent animate-pulse" />
        )}
      </div>

      {notice && (
        <div className="px-3 py-2 border-t border-border-subtle bg-bg-primary text-[11px] text-text-muted">
          <div className="truncate">{notice}</div>
        </div>
      )}
    </div>
  );
}
