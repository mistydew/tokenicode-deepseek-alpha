export const DEEPSEEK_V4_PRO = 'deepseek-v4-pro';
export const DEEPSEEK_V4_FLASH = 'deepseek-v4-flash';
export const DEEPSEEK_V4_PRO_LABEL = 'DeepseekV4Pro';
export const DEEPSEEK_V4_FLASH_LABEL = 'DeepseekV4Flash';

export function normalizeDeepSeekModelName(model: string | undefined | null): string {
  if (!model) return '';

  const trimmed = model.trim();
  const lower = trimmed.toLowerCase();
  const compact = lower.replace(/[\s_.()[\]-]/g, '');

  if (compact.includes('deepseekv4pro')) return DEEPSEEK_V4_PRO;
  if (compact.includes('deepseekv4flash')) return DEEPSEEK_V4_FLASH;

  if (lower.includes('fable') || lower.includes('opus') || compact.includes('claudeopus')) {
    return DEEPSEEK_V4_PRO;
  }

  if (lower.includes('sonnet') || lower.includes('haiku') || compact.includes('claudesonnet') || compact.includes('claudehaiku')) {
    return DEEPSEEK_V4_FLASH;
  }

  return trimmed;
}

export function normalizeProviderModelName(model: string | undefined | null): string {
  if (!model) return '';
  // Display-only legacy alias. The previous implementation rewrote
  // "DeepseekV4Pro"/"DeepseekV4Flash" tokens to "deepseek-v4-pro"/
  // "deepseek-v4-flash" — that string was forwarded to the upstream API,
  // which doesn't recognize it and returned 400 [1211] 模型不存在.
  // Display labels should go through `displayProviderModelName` instead;
  // this function is now a pass-through so it can never corrupt a request
  // payload again.
  return model.trim();
}

export function displayDeepSeekModelName(model: string | undefined | null): string {
  const normalized = normalizeDeepSeekModelName(model);
  if (normalized === DEEPSEEK_V4_PRO) return DEEPSEEK_V4_PRO_LABEL;
  if (normalized === DEEPSEEK_V4_FLASH) return DEEPSEEK_V4_FLASH_LABEL;
  return normalized;
}

export function displayProviderModelName(model: string | undefined | null): string {
  const normalized = normalizeProviderModelName(model);
  if (normalized === DEEPSEEK_V4_PRO) return DEEPSEEK_V4_PRO_LABEL;
  if (normalized === DEEPSEEK_V4_FLASH) return DEEPSEEK_V4_FLASH_LABEL;
  return normalized;
}
