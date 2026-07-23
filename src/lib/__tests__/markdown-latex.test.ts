import { describe, expect, it } from 'vitest';
import { normalizeLatexDelimiters } from '../markdown-latex';

describe('normalizeLatexDelimiters', () => {
  it('normalizes Claude-style inline and block delimiters', () => {
    const source = String.raw`Inline \(x^2 + y^2\) and block \[\frac{a}{b}\]`;
    expect(normalizeLatexDelimiters(source)).toContain('$x^2 + y^2$');
    expect(normalizeLatexDelimiters(source)).toContain('$$\n\\frac{a}{b}\n$$');
  });

  it('does not alter LaTeX-looking text inside code', () => {
    const source = String.raw`
\(rendered\)

` + '```tex\n\\[not-rendered\\]\n```' + String.raw`

` + '`\\(also-not-rendered\\)`';
    const normalized = normalizeLatexDelimiters(source);
    expect(normalized).toContain('$rendered$');
    expect(normalized).toContain('\\[not-rendered\\]');
    expect(normalized).toContain('`\\(also-not-rendered\\)`');
  });
});
