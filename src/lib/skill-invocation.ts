import type { UnifiedCommand } from './tauri-bridge';

export interface SkillInvocation {
  skills: UnifiedCommand[];
  command?: UnifiedCommand;
  userText: string;
}

export function resolveSkillInvocation(
  input: string,
  selected: UnifiedCommand[],
  available: UnifiedCommand[],
): SkillInvocation {
  const prefixes = [...selected];
  let userText = input.trim();

  if (prefixes.length === 0 && userText.startsWith('/')) {
    const tokens = userText.split(/\s+/);
    while (tokens.length > 0) {
      const match = available.find(
        (candidate) => candidate.category === 'skill'
          && candidate.name.toLowerCase() === tokens[0].toLowerCase(),
      );
      if (!match) break;
      prefixes.push(match);
      tokens.shift();
    }
    if (prefixes.length > 0) userText = tokens.join(' ').trim();
  }

  return {
    skills: prefixes.filter((item) => item.category === 'skill' && item.path),
    command: prefixes.find((item) => item.category !== 'skill'),
    userText,
  };
}

export function buildSkillPrompt(
  skills: Array<{ name: string; path?: string; content: string }>,
  userText: string,
): string {
  const instructions = skills.map((skill) =>
    `--- BEGIN SELECTED SKILL ${skill.name} (${skill.path || ''}) ---\n${skill.content}\n--- END SELECTED SKILL ${skill.name} ---`,
  ).join('\n\n');
  return `The user explicitly selected the following Claude-compatible skills. Follow all of them for this request.\n\n${instructions}\n\n--- USER REQUEST ---\n${userText || 'Apply the selected skills and ask for any required input.'}`;
}
