import { useRef, useCallback, useState, type ChangeEvent } from 'react';
import {
  useSettingsStore,
  MODEL_OPTIONS,
  ColorTheme,
  BackgroundTheme,
  FontFamily,
  ContextWindowMode,
  getContextWindowForModel,
  getAutoCompactThreshold,
} from '../../stores/settingsStore';
import { useProviderStore } from '../../stores/providerStore';
import { useT } from '../../lib/i18n';
import { displayProviderModelName } from '../../lib/deepseek-models';
import { AiAvatar } from '../shared/AiAvatar';
import { UserAvatar } from '../shared/UserAvatar';
import { AvatarCropModal } from './AvatarCropModal';

const TIER_MAP: Record<string, string> = {
  'claude-opus-4-6': 'opus',
  'claude-opus-4-6-1m': 'opus',
  'claude-sonnet-4-6': 'sonnet',
  'claude-haiku-4-5-20251001': 'haiku',
};

const COLOR_THEMES: { id: ColorTheme; labelKey: string; preview: string; previewDark: string }[] = [
  {
    id: 'black',
    labelKey: 'settings.black',
    preview: '#333333',
    previewDark: '#D0D0D0',
  },
  {
    id: 'blue',
    labelKey: 'settings.blue',
    preview: '#4E80F7',
    previewDark: '#6B9AFF',
  },
  {
    id: 'orange',
    labelKey: 'settings.orange',
    preview: '#C47252',
    previewDark: '#D4856A',
  },
  {
    id: 'green',
    labelKey: 'settings.green',
    preview: '#57A64B',
    previewDark: '#6DBF62',
  },
];

const BACKGROUND_THEMES: { id: BackgroundTheme; label: string; accent: string; preview: string }[] = [
  {
    id: 'garden',
    label: '花园',
    accent: '#D9857A',
    preview: 'radial-gradient(circle at 15% 90%, #AFCB8C 0 18%, transparent 20%), linear-gradient(135deg, #FFF8EA, #F7D9C6)',
  },
  {
    id: 'sakura',
    label: '粉樱',
    accent: '#C97D98',
    preview: 'radial-gradient(circle at 85% 18%, #F2B7C9 0 20%, transparent 22%), linear-gradient(135deg, #FFF4F7, #F7E6CF)',
  },
  {
    id: 'lake',
    label: '湖蓝',
    accent: '#6D9CB8',
    preview: 'radial-gradient(circle at 15% 85%, #A9CFBF 0 18%, transparent 20%), linear-gradient(135deg, #F3FBF8, #DCEEF4)',
  },
  {
    id: 'dusk',
    label: '暮紫',
    accent: '#9A83B8',
    preview: 'radial-gradient(circle at 82% 18%, #D8B6C9 0 20%, transparent 22%), linear-gradient(135deg, #F7F1FB, #E9DFD1)',
  },
  {
    id: 'ink',
    label: '墨纸',
    accent: '#7E8792',
    preview: 'radial-gradient(circle at 18% 90%, #C4CABA 0 18%, transparent 20%), linear-gradient(135deg, #F8F5EC, #E6E2D5)',
  },
  {
    id: 'vscode',
    label: 'VS Code Dark',
    accent: '#007ACC',
    preview: 'linear-gradient(90deg, #252526 0 24%, #1E1E1E 24% 100%)',
  },
  {
    id: 'minimal',
    label: '纯白简约',
    accent: '#111827',
    preview: 'linear-gradient(90deg, #F7F7F8 0 24%, #FFFFFF 24% 100%)',
  },
];

const FONT_FAMILY_OPTIONS: { id: FontFamily; label: string; sample: string }[] = [
  { id: 'microsoft', label: '微软雅黑 UI', sample: '中文 Aa 123' },
  { id: 'system', label: '系统清晰字体', sample: '中文 Aa 123' },
  { id: 'sourceHan', label: '思源黑体 / Noto', sample: '中文 Aa 123' },
  { id: 'lxgw', label: '霞鹜文楷', sample: '中文 Aa 123' },
  { id: 'mono', label: '等宽字体', sample: '中文 Aa 123' },
];

const CONTEXT_WINDOW_OPTIONS: { id: ContextWindowMode; label: string; hint: string }[] = [
  { id: 'default', label: '标准 200K', hint: '自动 compact 阈值 160K' },
  { id: 'large1m', label: '声明 1M', hint: '自动 compact 阈值 800K' },
];

/* Mini app preview — simplified chat interface thumbnail */
function ThemePreview({ color }: { color: string }) {
  return (
    <div className="w-full aspect-[5/3] rounded-lg overflow-hidden border border-black/[0.06] bg-[#f5f5f5] dark:bg-[#1a1a1a] dark:border-white/[0.06] flex">
      {/* Sidebar */}
      <div className="w-[22%] border-r border-black/[0.06] dark:border-white/[0.06] p-2 flex flex-col gap-1.5">
        <div className="w-full h-2 rounded-full bg-black/[0.07] dark:bg-white/[0.08]" />
        <div className="w-[80%] h-2 rounded-full" style={{ background: color, opacity: 0.3 }} />
        <div className="w-[60%] h-2 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
      </div>
      {/* Main content */}
      <div className="flex-1 flex flex-col p-2.5 gap-2">
        {/* Messages */}
        <div className="flex-1 flex flex-col gap-1.5 justify-center">
          <div className="w-[65%] h-2.5 rounded bg-black/[0.06] dark:bg-white/[0.07]" />
          <div className="w-[45%] h-2.5 rounded bg-black/[0.06] dark:bg-white/[0.07]" />
          <div className="w-[75%] h-2.5 rounded bg-black/[0.04] dark:bg-white/[0.05] self-end" />
        </div>
        {/* Input bar */}
        <div className="flex items-center gap-1">
          <div className="flex-1 h-3.5 rounded bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]" />
          <div className="w-3.5 h-3.5 rounded flex-shrink-0" style={{ background: color }} />
        </div>
      </div>
    </div>
  );
}

export function GeneralTab() {
  const t = useT();
  const activeProvider = useProviderStore((s) => {
    if (!s.activeProviderId) return null;
    return s.providers.find((p) => p.id === s.activeProviderId) ?? null;
  });
  const theme = useSettingsStore((s) => s.theme);
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const backgroundTheme = useSettingsStore((s) => s.backgroundTheme);
  const locale = useSettingsStore((s) => s.locale);
  const selectedModel = useSettingsStore((s) => s.selectedModel);
  const contextWindowMode = useSettingsStore((s) => s.contextWindowMode);
  const autoCompactThresholdTokens = useSettingsStore((s) => s.autoCompactThresholdTokens);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const monoFontFollowsInterface = useSettingsStore((s) => s.monoFontFollowsInterface);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setColorTheme = useSettingsStore((s) => s.setColorTheme);
  const setBackgroundTheme = useSettingsStore((s) => s.setBackgroundTheme);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const setContextWindowMode = useSettingsStore((s) => s.setContextWindowMode);
  const setAutoCompactThresholdTokens = useSettingsStore((s) => s.setAutoCompactThresholdTokens);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const setMonoFontFollowsInterface = useSettingsStore((s) => s.setMonoFontFollowsInterface);
  const aiAvatarUrl = useSettingsStore((s) => s.aiAvatarUrl);
  const setAiAvatarUrl = useSettingsStore((s) => s.setAiAvatarUrl);
  const userAvatarUrl = useSettingsStore((s) => s.userAvatarUrl);
  const setUserAvatarUrl = useSettingsStore((s) => s.setUserAvatarUrl);
  const userDisplayName = useSettingsStore((s) => s.userDisplayName);
  const setUserDisplayName = useSettingsStore((s) => s.setUserDisplayName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<'ai' | 'user'>('ai');
  const selectedTier = TIER_MAP[selectedModel];
  const selectedMapping = selectedTier
    ? activeProvider?.modelMappings.find((m) => m.tier === selectedTier)
    : undefined;
  const actualModel = selectedMapping?.providerModel || selectedModel;
  const contextWindow = getContextWindowForModel(actualModel, contextWindowMode);
  const compactThreshold = getAutoCompactThreshold(actualModel, contextWindowMode, autoCompactThresholdTokens);
  const tierMappings = activeProvider?.modelMappings
    .filter((m) => ['opus', 'sonnet', 'haiku'].includes(m.tier) && m.providerModel)
    .map((m) => `${m.tier}=${displayProviderModelName(m.providerModel)}`)
    .join(' / ');

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, target: 'ai' | 'user') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropTarget(target);
    setCropFile(file);
    e.target.value = '';
  }, []);

  return (
    <div className="space-y-6">
      {/* Avatars — AI & User side by side */}
      <div>
        <h3 className="text-[13px] font-medium text-text-primary mb-3">{t('settings.aiAvatar')} / {t('settings.userAvatar')}</h3>
        <div className="flex items-start gap-6">
          {/* AI Avatar */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group relative cursor-pointer"
              title={t('settings.aiAvatarChange')}
            >
              <AiAvatar size="w-14 h-14" rounded="rounded-2xl" />
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100
                transition-smooth flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 9v4H4V9M8 3v7M5 6l3-3 3 3" />
                </svg>
              </div>
            </button>
            <span className="text-[11px] text-text-tertiary">AI</span>
            {aiAvatarUrl && (
              <button
                onClick={() => setAiAvatarUrl('')}
                className="text-[11px] text-text-muted hover:text-red-500 transition-smooth"
              >
                {t('settings.aiAvatarReset')}
              </button>
            )}
          </div>

          {/* User Avatar + Name */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => userFileInputRef.current?.click()}
              className="group relative cursor-pointer"
              title={t('settings.userAvatarChange')}
            >
              <UserAvatar size="w-14 h-14" rounded="rounded-2xl" />
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100
                transition-smooth flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 9v4H4V9M8 3v7M5 6l3-3 3 3" />
                </svg>
              </div>
            </button>
            <input
              type="text"
              value={userDisplayName}
              onChange={(e) => setUserDisplayName(e.target.value)}
              placeholder={t('settings.userNamePlaceholder')}
              className="w-24 px-2 py-1 rounded-lg text-[11px] text-center bg-bg-secondary border border-border-subtle
                text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent/50 transition-smooth"
              maxLength={20}
            />
            {userAvatarUrl && (
              <button
                onClick={() => setUserAvatarUrl('')}
                className="text-[11px] text-text-muted hover:text-red-500 transition-smooth"
              >
                {t('settings.userAvatarReset')}
              </button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFileSelect(e, 'ai')} />
          <input ref={userFileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFileSelect(e, 'user')} />
        </div>
      </div>

      {/* Avatar crop modal */}
      {cropFile && (
        <AvatarCropModal
          imageFile={cropFile}
          onSave={(dataUrl) => {
            if (cropTarget === 'ai') setAiAvatarUrl(dataUrl);
            else setUserAvatarUrl(dataUrl);
            setCropFile(null);
          }}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Theme Color — single row of 4 */}
      <div>
        <h3 className="text-[13px] font-medium text-text-primary mb-3">{t('settings.colorTheme')}</h3>
        <div className="grid grid-cols-4 gap-3">
          {COLOR_THEMES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setColorTheme(ct.id)}
              title={t(ct.labelKey)}
              className={`group relative rounded-xl p-2 transition-smooth text-left
                ${colorTheme === ct.id
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-card bg-accent/[0.03]'
                  : 'hover:scale-[1.02] border border-border-subtle hover:border-black/10 dark:hover:border-white/10'
                }`}
            >
              <ThemePreview color={ct.preview} />
            </button>
          ))}
        </div>
      </div>

      {/* Background Skin */}
      <div>
        <h3 className="text-[13px] font-medium text-text-primary mb-3">背景风格</h3>
        <div className="grid grid-cols-5 gap-3">
          {BACKGROUND_THEMES.map((bg) => (
            <button
              key={bg.id}
              onClick={() => setBackgroundTheme(bg.id)}
              title={bg.label}
              className={`group relative rounded-xl p-2 transition-smooth text-left
                ${backgroundTheme === bg.id
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-card bg-accent/[0.03]'
                  : 'hover:scale-[1.02] border border-border-subtle hover:border-black/10 dark:hover:border-white/10'
                }`}
            >
              <div className="w-full aspect-[5/3] rounded-lg overflow-hidden border border-black/[0.06] relative"
                style={{ background: bg.preview }}>
                <div className="absolute inset-x-2 top-2 h-2 rounded-full bg-white/45" />
                <div className="absolute left-2 bottom-2 w-10 h-5 rounded-md bg-white/45" />
                <div className="absolute right-2 bottom-2 w-5 h-5 rounded-md"
                  style={{ background: bg.accent }} />
              </div>
              <div className="mt-2 text-center text-[12px] font-medium text-text-muted">
                {bg.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Background Image */}
      <div>
        <h3 className="text-[13px] font-medium text-text-primary mb-3">自定义聊天背景</h3>
        <CustomBackgroundSection />
      </div>

      {/* Settings row */}
      <div className="flex items-start gap-8 flex-wrap">
        {/* Appearance */}
        <div>
          <h3 className="text-[13px] font-medium text-text-primary mb-2">{t('settings.appearance')}</h3>
          <div className="inline-flex rounded-lg border border-border-subtle overflow-hidden">
            {(['light', 'dark', 'system'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTheme(m)}
                className={`py-1.5 px-3 text-[13px] font-medium transition-smooth
                  border-r border-border-subtle last:border-r-0 whitespace-nowrap
                  ${theme === m
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:bg-bg-secondary'
                  }`}
              >
                {t(`settings.${m}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <h3 className="text-[13px] font-medium text-text-primary mb-2">{t('settings.language')}</h3>
          <div className="inline-flex rounded-lg border border-border-subtle overflow-hidden">
            {(['zh', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`py-1.5 px-3 text-[13px] font-medium transition-smooth
                  border-r border-border-subtle last:border-r-0
                  ${locale === l
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:bg-bg-secondary'
                  }`}
              >
                {l === 'zh' ? '中文' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <h3 className="text-[13px] font-medium text-text-primary mb-2">{t('settings.fontSize')}</h3>
          <div className="inline-flex items-center rounded-lg border border-border-subtle
            overflow-hidden">
            <button
              onClick={() => setFontSize(fontSize - 1)}
              disabled={fontSize <= 10}
              className="w-8 h-8 text-[13px] font-bold text-text-primary
                hover:bg-bg-secondary transition-smooth
                disabled:opacity-30 disabled:cursor-not-allowed
                flex items-center justify-center border-r border-border-subtle"
            >-</button>
            <span className="w-12 text-center text-[13px] font-semibold text-text-primary">
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize(fontSize + 1)}
              disabled={fontSize >= 36}
              className="w-8 h-8 text-[13px] font-bold text-text-primary
                hover:bg-bg-secondary transition-smooth
                disabled:opacity-30 disabled:cursor-not-allowed
                flex items-center justify-center border-l border-border-subtle"
            >+</button>
          </div>
        </div>

        {/* Font Family */}
        <div>
          <h3 className="text-[13px] font-medium text-text-primary mb-2">{t('settings.fontFamily')}</h3>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as FontFamily)}
            className="h-8 min-w-40 px-2 rounded-lg bg-bg-secondary border border-border-subtle
              text-[13px] text-text-primary outline-none focus:border-accent/60"
          >
            {FONT_FAMILY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {option.sample}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-text-tertiary">
            {t('settings.fontFamilyHint')}
          </p>
          <button
            onClick={() => setMonoFontFollowsInterface(!monoFontFollowsInterface)}
            className="mt-2 inline-flex items-center gap-2 text-[12px] text-text-secondary
              hover:text-text-primary transition-smooth"
          >
            <span className={`relative w-8 h-4 rounded-full transition-smooth
              ${monoFontFollowsInterface ? 'bg-accent/80' : 'bg-bg-tertiary border border-border-subtle'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform
                ${monoFontFollowsInterface ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </span>
            {t('settings.monoFontFollowsInterface')}
          </button>
        </div>

        {/* Default Model */}
        <div>
          <h3 className="text-[13px] font-medium text-text-primary mb-2">{t('settings.defaultModel')}</h3>
          <div className="flex flex-wrap gap-2">
            {MODEL_OPTIONS.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2
                  rounded-lg text-[13px] font-medium transition-smooth
                  ${selectedModel === model.id
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-text-muted hover:bg-bg-secondary border border-border-subtle'
                  }`}
              >
                {selectedModel === model.id && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M3 8l4 4 6-7" />
                  </svg>
                )}
                {(() => {
                  if (!activeProvider) return model.short;
                  const tier = TIER_MAP[model.id];
                  const mapping = activeProvider.modelMappings.find((mm) => mm.tier === tier);
                  return mapping?.providerModel ? displayProviderModelName(mapping.providerModel) : model.short;
                })()}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-tertiary leading-relaxed">
            Actual model: <span className="font-mono text-text-muted">{displayProviderModelName(actualModel)}</span>
            {activeProvider && tierMappings && (
              <span className="ml-2">Mappings: {tierMappings}</span>
            )}
          </div>
        </div>

        {/* Context Window */}
        <div>
          <h3 className="text-[13px] font-medium text-text-primary mb-2">上下文窗口</h3>
          <div className="grid grid-cols-2 gap-2">
            {CONTEXT_WINDOW_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setContextWindowMode(option.id)}
                className={`text-left px-3 py-2 rounded-lg border transition-smooth
                  ${contextWindowMode === option.id
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'text-text-muted hover:bg-bg-secondary border-border-subtle'
                  }`}
              >
                <div className="text-[13px] font-medium">{option.label}</div>
                <div className="mt-0.5 text-[11px] text-text-tertiary">{option.hint}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-tertiary leading-relaxed">
            当前声明：{contextWindow.toLocaleString()} tokens；自动 compact 阈值：{compactThreshold.toLocaleString()} tokens。
            如果你的 CC Switch / DeepSeek 路由实际支持 1M，请选择“声明 1M”。
          </p>
        </div>

        {/* Auto compact threshold */}
        <div>
          <h3 className="text-[13px] font-medium text-text-primary mb-2">自动 compact 阈值</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={1000}
              step={10}
              value={Math.round(autoCompactThresholdTokens / 1000)}
              onChange={(e) => setAutoCompactThresholdTokens(Number(e.target.value) * 1000)}
              className="w-28 px-3 py-2 text-[13px] bg-bg-chat border border-border-subtle
                rounded-lg text-text-primary focus:outline-none focus:border-accent"
            />
            <span className="text-xs text-text-tertiary">K tokens</span>
            <div className="flex flex-wrap gap-1.5">
              {[160, 400, 800, 950].map((value) => (
                <button
                  key={value}
                  onClick={() => setAutoCompactThresholdTokens(value * 1000)}
                  className={`px-2 py-1 rounded-md text-[11px] border transition-smooth
                    ${Math.round(autoCompactThresholdTokens / 1000) === value
                      ? 'bg-accent/10 text-accent border-accent/30'
                      : 'text-text-muted hover:bg-bg-secondary border-border-subtle'
                    }`}
                >
                  {value}K
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-text-tertiary leading-relaxed">
            这个值会直接决定自动发送 `/compact` 的时机；改完后对当前会话立即生效。
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Custom Background Section ─── */
function CustomBackgroundSection() {
  const customBgImage = useSettingsStore((s) => s.customBgImage);
  const customBgSize = useSettingsStore((s) => s.customBgSize);
  const customBgPositionX = useSettingsStore((s) => s.customBgPositionX);
  const customBgPositionY = useSettingsStore((s) => s.customBgPositionY);
  const glassBlur = useSettingsStore((s) => s.glassBlur);
  const glassOpacity = useSettingsStore((s) => s.glassOpacity);
  const setCustomBgImage = useSettingsStore((s) => s.setCustomBgImage);
  const setCustomBgSize = useSettingsStore((s) => s.setCustomBgSize);
  const setCustomBgPositionX = useSettingsStore((s) => s.setCustomBgPositionX);
  const setCustomBgPositionY = useSettingsStore((s) => s.setCustomBgPositionY);
  const setGlassBlur = useSettingsStore((s) => s.setGlassBlur);
  const setGlassOpacity = useSettingsStore((s) => s.setGlassOpacity);
  const clearCustomBg = useSettingsStore((s) => s.clearCustomBg);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleBgUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomBgImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [setCustomBgImage]);

  return (
    <div className="space-y-3">
      {/* Upload / Preview */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => bgInputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed transition-smooth overflow-hidden flex flex-col items-center justify-center gap-1.5 hover:bg-bg-secondary
            ${customBgImage
              ? 'border-accent/40 w-36 h-24'
              : 'border-border-subtle hover:border-accent/30 w-36 h-24'
            }`}
        >
          {customBgImage ? (
            <>
              <img src={customBgImage} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100
                transition-smooth flex items-center justify-center rounded-xl">
                <span className="text-white text-xs font-medium">更换</span>
              </div>
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                className="text-text-tertiary">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span className="text-xs text-text-muted">上传图片</span>
            </>
          )}
        </button>
        <input ref={bgInputRef} type="file" accept="image/*" className="hidden"
          onChange={handleBgUpload} />

        <div className="flex-1">
          {customBgImage ? (
            <div className="space-y-2">
              <span className="text-xs text-text-secondary">已设置自定义背景</span>
              <button
                onClick={clearCustomBg}
                className="px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200
                  hover:bg-red-50 dark:hover:bg-red-900/10 transition-smooth"
              >
                移除背景，恢复默认
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary leading-relaxed">
              上传一张图片作为聊天背景（JPG/PNG/WebP）。图片存储在本地，不会上传。
            </p>
          )}
        </div>
      </div>

      {customBgImage && (
        <>
          {/* Size */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary w-16 shrink-0">背景尺寸</span>
            <div className="inline-flex rounded-md border border-border-subtle overflow-hidden">
              {(['cover', 'contain', 'fill'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setCustomBgSize(size)}
                  className={`px-3 py-1 text-xs font-medium border-r border-border-subtle last:border-r-0 transition-smooth
                    ${customBgSize === size
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-muted hover:bg-bg-secondary'
                    }`}
                >
                  {{ cover: '填充', contain: '适应', fill: '拉伸' }[size]}
                </button>
              ))}
            </div>
          </div>

          <Slider label="水平位置" value={customBgPositionX} onChange={setCustomBgPositionX}
            left="左" right="右" />
          <Slider label="垂直位置" value={customBgPositionY} onChange={setCustomBgPositionY}
            left="上" right="下" />
          <Slider label="毛玻璃模糊" value={glassBlur} onChange={setGlassBlur}
            min={0} max={20} unit="px" />
          <Slider label="面板透明度" value={glassOpacity} onChange={setGlassOpacity}
            min={30} max={100} unit="%"
            hint="值越高面板越不透明，文字越清晰" />
        </>
      )}
    </div>
  );
}

/* ─── Tiny Slider ─── */
function Slider({
  label, value, onChange, min = 0, max = 100, unit = '', left, right, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; unit?: string; left?: string; right?: string; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-tertiary">{label}</span>
        <span className="text-xs font-mono text-text-secondary">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        {left && <span className="text-[11px] text-text-tertiary shrink-0">{left}</span>}
        <input type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none bg-bg-tertiary cursor-pointer"
          style={{ accentColor: 'var(--color-accent)' }} />
        {right && <span className="text-[11px] text-text-tertiary shrink-0">{right}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-text-tertiary">{hint}</p>}
    </div>
  );
}
