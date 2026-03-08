const PROP_PANEL_CLASS = "propkit-example";

function normalizeMarkup(markup: string): string {
  return markup.trim();
}

function dedentMarkup(markup: string): string {
  const lines = markup
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (!nonEmptyLines.length) return "";

  const firstContentLine = nonEmptyLines[0];
  const firstIndentMatch = firstContentLine.match(/^[\t ]*/);
  const firstIndent = firstIndentMatch ? firstIndentMatch[0].length : 0;
  if (firstIndent > 0) {
    return lines
      .map((line) => (line.trim() ? line.slice(firstIndent) : ""))
      .join("\n");
  }

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^[\t ]*/);
      return match ? match[0].length : 0;
    }),
  );

  if (minIndent <= 0) return lines.join("\n");
  return lines
    .map((line) => (line.trim() ? line.slice(minIndent) : ""))
    .join("\n");
}

function unwrapPropPanel(markup: string): string | null {
  const trimmed = normalizeMarkup(markup);
  const wrapperMatch = trimmed.match(
    /^<div\s+class=["'](?:propkit-example|prop-panel)["']\s*>([\s\S]*)<\/div>$/i,
  );
  if (!wrapperMatch) return null;
  return wrapperMatch[1].trim();
}

export function getExampleSourceMarkup(markup: string): string {
  return dedentMarkup(unwrapPropPanel(markup) ?? normalizeMarkup(markup));
}

export function getInjectedExampleMarkup(markup: string): string {
  const trimmed = normalizeMarkup(markup);
  const content = unwrapPropPanel(trimmed) ?? trimmed;
  return `<div class="${PROP_PANEL_CLASS}">\n${content}\n</div>`;
}
