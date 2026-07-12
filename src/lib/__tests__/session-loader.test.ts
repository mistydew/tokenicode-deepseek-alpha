import { describe, expect, it } from 'vitest';
import { parseSessionMessages } from '../session-loader';

describe('parseSessionMessages context usage', () => {
  it('restores the latest model call context from a historical session', () => {
    const loaded = parseSessionMessages([
      {
        type: 'assistant',
        message: {
          model: 'older-model',
          usage: { input_tokens: 100, cache_read_input_tokens: 10_000, output_tokens: 50 },
          content: [],
        },
      },
      {
        type: 'assistant',
        message: {
          model: 'latest-model',
          usage: { input_tokens: 250, cache_read_input_tokens: 60_000, output_tokens: 400 },
          content: [],
        },
      },
    ]);

    expect(loaded.contextInputTokens).toBe(60_250);
    expect(loaded.contextOutputTokens).toBe(400);
    expect(loaded.model).toBe('latest-model');
  });
});
