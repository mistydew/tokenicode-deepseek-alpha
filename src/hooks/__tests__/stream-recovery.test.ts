import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../stores/chatStore';
import { hasAssistantReplyForTurn } from '../useStreamProcessor';

const reply = (timestamp: number, content = 'ok'): ChatMessage => ({
  id: String(timestamp),
  role: 'assistant',
  type: 'text',
  content,
  timestamp,
});

describe('stream exit recovery', () => {
  it('does not let an old reply hide a failed follow-up turn', () => {
    expect(hasAssistantReplyForTurn([reply(100)], 200)).toBe(false);
  });

  it('recognizes text returned during the current turn', () => {
    expect(hasAssistantReplyForTurn([reply(100), reply(250)], 200)).toBe(true);
  });
});
