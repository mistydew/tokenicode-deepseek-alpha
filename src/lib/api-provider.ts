import { useProviderStore } from '../stores/providerStore';
import type { ModelId } from '../stores/settingsStore';
import {
  DEEPSEEK_V4_FLASH,
  DEEPSEEK_V4_PRO,
} from './deepseek-models';

const TIER_MAP: Record<string, 'opus' | 'sonnet' | 'haiku'> = {
  'claude-opus-4-6': 'opus',
  'claude-opus-4-6-1m': 'opus',
  'claude-sonnet-4-6': 'sonnet',
  'claude-haiku-4-5-20251001': 'haiku',
};

/**
 * Result of model resolution — either a mapped model name or an error.
 */
export type ModelResolution =
  | { ok: true; model: string }
  | { ok: false; reason: 'no_mapping'; tier: string; providerName: string };

/**
 * Resolve the UI-selected model ID to the provider's actual model name,
 * returning an error if the provider has no mapping for the selected tier.
 */
export function resolveModelOrError(selectedModel: string): ModelResolution {
  const provider = useProviderStore.getState().getActive();
  if (!provider) {
    // Inherit mode (no active provider): pass the selected model through
    // verbatim. The CLI/subprocess is expected to resolve it from the
    // upstream environment (CC-Switch, ANTHROPIC_DEFAULT_*_MODEL, etc.).
    // We must NOT inject an internal alias like DEEPSEEK_V4_FLASH — that
    // string is not a real upstream model ID and causes 400 [1211] errors.
    return { ok: true, model: selectedModel };
  }

  // 1. Check direct model ID mapping first (e.g. 'claude-opus-4-6-1m' → 'glm-5-1m')
  // Pass the user-entered providerModel through verbatim — the value they typed
  // IS the upstream API model ID. UI-only normalization (display labels like
  // "DeepseekV4Pro") must not mutate the request payload, otherwise the CLI
  // forwards a string the upstream doesn't know → 400 [1211] 模型不存在.
  const directMapping = provider.modelMappings.find(
    (m) => m.tier === selectedModel && m.providerModel,
  );
  if (directMapping?.providerModel) {
    return { ok: true, model: directMapping.providerModel.trim() };
  }

  // 2. Fall back to tier mapping
  const tier = TIER_MAP[selectedModel];
  if (!tier) {
    const fallback = provider.modelMappings.find(
      (m) => m.tier === 'sonnet' && m.providerModel,
    ) || provider.modelMappings.find(
      (m) => m.tier === 'haiku' && m.providerModel,
    ) || provider.modelMappings.find(
      (m) => m.tier === 'opus' && m.providerModel,
    ) || provider.modelMappings.find((m) => m.providerModel);

    if (fallback?.providerModel) {
      return { ok: true, model: fallback.providerModel.trim() };
    }

    return { ok: false, reason: 'no_mapping', tier: selectedModel, providerName: provider.name };
  }

  const mapping = provider.modelMappings.find(
    (m) => m.tier === tier && m.providerModel,
  );
  if (!mapping?.providerModel) {
    return { ok: false, reason: 'no_mapping', tier, providerName: provider.name };
  }
  return { ok: true, model: mapping.providerModel.trim() };
}

/**
 * Resolve the UI-selected model ID to the provider's actual model name.
 * When a provider is active, looks up the model mapping for the selected tier.
 * Returns the original model ID if no mapping is configured (silent fallback).
 */
/** Map internal model IDs to CLI-expected format */
const CLI_MODEL_MAP: Partial<Record<ModelId, string>> = {
  'claude-opus-4-6-1m': 'claude-opus-4-6[1m]',
};

export function resolveModelForProvider(selectedModel: string): string {
  const r = resolveModelOrError(selectedModel);
  const model = r.ok ? r.model : selectedModel;
  return CLI_MODEL_MAP[model as ModelId] ?? model;
}

export function supportsDeepSeekThinking(model: string): boolean {
  // Direct string match on the canonical deepseek-v4-* IDs.
  // normalizeProviderModelName is now a no-op (see deepseek-models.ts), so
  // legacy "DeepseekV4Pro" labels are not auto-recognized here; that is
  // intentional — only upstream model IDs flow through request paths.
  return model === DEEPSEEK_V4_PRO || model === DEEPSEEK_V4_FLASH;
}

export function resolveThinkingLevelForProvider(selectedModel: string, requestedLevel: string): string {
  if (requestedLevel === 'off') return 'off';
  const resolvedModel = resolveModelForProvider(selectedModel);
  return supportsDeepSeekThinking(resolvedModel) ? requestedLevel : 'off';
}

/**
 * Stable fingerprint of the current API provider config.
 * Any provider config change invalidates the pre-warmed session.
 */
export function envFingerprint(): string {
  const { activeProviderId, providers } = useProviderStore.getState();
  const provider = providers.find((p) => p.id === activeProviderId);
  return JSON.stringify({
    activeProviderId,
    updatedAt: provider?.updatedAt ?? 0,
  });
}
