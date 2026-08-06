import { describe, expect, it } from 'vitest';
import { parseSessionMessages } from '../session-loader';

describe('session history loading', () => {
  it('drops replayed JSONL records with the same source UUID', () => {
    const user = {
      type: 'user',
      uuid: 'user-1',
      timestamp: 1,
      message: { content: [{ type: 'text', text: 'hello' }] },
    };
    const assistant = {
      type: 'assistant',
      uuid: 'assistant-1',
      timestamp: 2,
      message: { content: [{ type: 'text', text: 'world' }] },
    };
    const loaded = parseSessionMessages([user, assistant, user, assistant]);
    expect(loaded.messages.map((message) => message.content)).toEqual(['hello', 'world']);
  });
});
