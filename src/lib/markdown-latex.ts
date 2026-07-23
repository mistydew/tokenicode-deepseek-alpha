/** Convert Claude-style LaTeX delimiters to the dollar syntax understood by remark-math. */
export function normalizeLatexDelimiters(content: string): string {
  const fenced = content.split(/(```[\s\S]*?```)/g);
  return fenced.map((part, i) => {
    if (i % 2 === 1) return part;
    const inlined = part.split(/(`[^`\n]+`)/g);
    return inlined.map((segment, j) => {
      if (j % 2 === 1) return segment;
      return segment
        .replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula: string) => `\n$$\n${formula.trim()}\n$$\n`)
        .replace(/\\\(([^\n]*?)\\\)/g, (_match, formula: string) => `$${formula.trim()}$`);
    }).join('');
  }).join('');
}
