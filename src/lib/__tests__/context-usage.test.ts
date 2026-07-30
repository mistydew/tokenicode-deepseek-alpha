import { describe, expect, it } from 'vitest';
import {
  getContextInputTokens,
  getContextOutputTokens,
  getContextUsedTokens,
  hasMeaningfulContextUsage,
} from '../context-usage';

describe('context usage', () => {
  it('includes cached input in the occupied context', () => {
    expect(getContextInputTokens({
      input_tokens: 109,
      cache_read_input_tokens: 56_448,
      cache_creation_input_tokens: 2_000,
    })).toBe(58_557);
  });

  it('includes nested cache creation tokens', () => {
    expect(getContextInputTokens({
      input_tokens: 30,
      cache_creation: {
        ephemeral_1h_input_tokens: 1_000,
        ephemeral_5m_input_tokens: 2_000,
      },
    })).toBe(3_030);
  });

  it('does not double-count cache creation totals and their breakdown', () => {
    expect(getContextInputTokens({
      input_tokens: 30,
      cache_creation_input_tokens: 3_000,
      cache_creation: {
        ephemeral_1h_input_tokens: 1_000,
        ephemeral_5m_input_tokens: 2_000,
      },
    })).toBe(3_030);
  });

  it('ignores missing, invalid, and all-zero usage records', () => {
    expect(getContextInputTokens(undefined)).toBe(0);
    expect(getContextInputTokens({ input_tokens: -1 })).toBe(0);
    expect(getContextOutputTokens({ output_tokens: Number.NaN })).toBe(0);
    expect(hasMeaningfulContextUsage({ input_tokens: 0, output_tokens: 0 })).toBe(false);
    expect(hasMeaningfulContextUsage({ cache_read_input_tokens: 1 })).toBe(true);
  });

  it('keeps the context snapshot when per-turn counters reset', () => {
    expect(getContextUsedTokens({
      inputTokens: 0,
      outputTokens: 0,
      contextInputTokens: 58_557,
      contextOutputTokens: 1_443,
    })).toBe(60_000);
  });
});
