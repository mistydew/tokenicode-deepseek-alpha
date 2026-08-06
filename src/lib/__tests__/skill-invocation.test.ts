import { describe, expect, it } from 'vitest';
import type { UnifiedCommand } from '../tauri-bridge';
import { buildSkillPrompt, resolveSkillInvocation } from '../skill-invocation';

const skill = (name: string, path: string): UnifiedCommand => ({
  name,
  description: name,
  source: 'global',
  category: 'skill',
  has_args: true,
  path,
  immediate: false,
});

describe('skill invocation', () => {
  it('parses multiple leading slash skills without forwarding them as CLI commands', () => {
    const skills = [skill('/review', 'C:/skills/review/SKILL.md'), skill('/test', 'D:/skills/test/SKILL.md')];
    const result = resolveSkillInvocation('/review /test 修复这个问题', [], skills);
    expect(result.skills.map((item) => item.name)).toEqual(['/review', '/test']);
    expect(result.userText).toBe('修复这个问题');
  });

  it('combines all selected skill instructions with the user request', () => {
    const prompt = buildSkillPrompt([
      { name: '/review', path: 'review/SKILL.md', content: 'Review carefully.' },
      { name: '/test', path: 'test/SKILL.md', content: 'Run tests.' },
    ], 'Fix it.');
    expect(prompt).toContain('Review carefully.');
    expect(prompt).toContain('Run tests.');
    expect(prompt).toContain('Fix it.');
  });
});
