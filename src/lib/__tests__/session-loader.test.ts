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

  it('does not let a trailing synthetic zero-usage record erase valid context', () => {
    const loaded = parseSessionMessages([
      {
        type: 'assistant',
        message: {
          model: 'real-model',
          usage: { input_tokens: 156, cache_read_input_tokens: 57_472, output_tokens: 178 },
          content: [],
        },
      },
      {
        type: 'assistant',
        message: {
          model: '<synthetic>',
          usage: { input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 },
          content: [{ type: 'text', text: 'Synthetic completion' }],
        },
      },
    ]);

    expect(loaded.contextInputTokens).toBe(57_628);
    expect(loaded.contextOutputTokens).toBe(178);
    expect(loaded.model).toBe('real-model');
  });

  it('restores the latest verified compact boundary', () => {
    const loaded = parseSessionMessages([
      {
        type: 'system',
        subtype: 'compact_boundary',
        timestamp: '2026-07-13T02:00:00.000Z',
        compactMetadata: { trigger: 'auto', preTokens: 810_000 },
      },
    ]);

    expect(loaded.compaction?.status).toBe('succeeded');
    expect(loaded.compaction?.trigger).toBe('auto');
    expect(loaded.compaction?.beforeTokens).toBe(810_000);
    expect(loaded.compaction?.completedAt).toBe(Date.parse('2026-07-13T02:00:00.000Z'));
  });
});
