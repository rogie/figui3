import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { bundle, transform } from "lightningcss";

const SCOPE = `:where(.figui-root, [data-figui-overlay-root], dialog[is="fig-popup"], dialog[is="fig-dialog"])`;
const PANEL_ONLY = `.figui-root`;

const NATIVE_TAGS = new Set([
  "html",
  "body",
  "a",
  "p",
  "label",
  "li",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "section",
  "fieldset",
  "hr",
  "iframe",
  "main",
  "button",
  "select",
  "input",
  "textarea",
  "progress",
  "details",
  "dialog",
  "nav",
  "header",
  "footer",
  "ul",
  "ol",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "span",
  "div",
  "img",
  "svg",
  "canvas",
]);

const ENTRY = join("scripts", ".propskit-css-entry.css");
const OUTPUT = join("dist", "propskit.css");

// Force nesting expansion so selector rewriting sees flat selectors.
const targets = { chrome: 90 << 16 };

mkdirSync("dist", { recursive: true });

writeFileSync(
  ENTRY,
  `@import url("../fig.css");\n@import url("../fig-editor.css");\n`,
);

function splitTopLevelSelectors(selector) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = null;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      current += ch;
      if (ch === quote && selector[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function transformSelector(sel) {
  const s = sel.trim();
  if (!s) return s;
  if (s.includes(".figui-root") || s.includes("data-figui-overlay-root")) return s;

  if (s === ":root" || s === ":host" || /^(:root|:host)([.:#[\s]|$)/.test(s)) {
    return s.replace(/:root/g, SCOPE).replace(/:host/g, SCOPE);
  }

  if (/^(html|body)\b/.test(s)) {
    return s.replace(/^html\b/, PANEL_ONLY).replace(/^body\b/, PANEL_ONLY);
  }

  if (s === "*" || s.startsWith("*:") || s.startsWith("*::") || s.startsWith("* ")) {
    return `${PANEL_ONLY} ${s}`;
  }

  // fig-dialog / fig-popup are overlay roots themselves — keep attribute forms,
  // and also match bare `dialog` when it *is* the themed root (not only nested).
  if (/^dialog\[is=["']?fig-/.test(s)) return s;
  if (/^dialog\b/.test(s)) {
    return `dialog:is(${SCOPE})${s.slice("dialog".length)}, ${SCOPE} ${s}`;
  }
  if (/^(fig-|propskit-|vstack|hstack)/.test(s)) return s;

  const firstIdent = s.match(/^([a-zA-Z][\w-]*)/);
  if (firstIdent && NATIVE_TAGS.has(firstIdent[1].toLowerCase())) {
    return `${SCOPE} ${s}`;
  }

  // Pseudo-elements on natives already handled via first ident; class/id roots stay.
  return s;
}

function transformRuleSelectors(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2);
      const slice = end === -1 ? css.slice(i) : css.slice(i, end + 2);
      out += slice;
      i += slice.length;
      continue;
    }

    if (css[i] === "@") {
      let j = i;
      let quote = null;
      while (j < css.length) {
        const ch = css[j];
        if (quote) {
          if (ch === quote && css[j - 1] !== "\\") quote = null;
          j++;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          j++;
          continue;
        }
        if (ch === "{" || ch === ";") break;
        j++;
      }
      const header = css.slice(i, j + (css[j] === ";" || css[j] === "{" ? 1 : 0));
      out += header;
      i = j + (css[j] === ";" || css[j] === "{" ? 1 : 0);
      if (css[j] !== "{") continue;

      const name = header.match(/@([a-zA-Z-]+)/)?.[1];
      let depth = 1;
      let k = i;
      quote = null;
      while (k < css.length && depth > 0) {
        const ch = css[k];
        if (quote) {
          if (ch === quote && css[k - 1] !== "\\") quote = null;
          k++;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          k++;
          continue;
        }
        if (ch === "{") depth++;
        if (ch === "}") depth--;
        k++;
      }
      const inner = css.slice(i, k - 1);
      const keepRaw =
        name === "keyframes" ||
        name === "font-face" ||
        name === "property" ||
        name === "counter-style";
      out += keepRaw ? inner : transformRuleSelectors(inner);
      out += "}";
      i = k;
      continue;
    }

    let j = i;
    let quote = null;
    while (j < css.length) {
      const ch = css[j];
      if (quote) {
        if (ch === quote && css[j - 1] !== "\\") quote = null;
        j++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        j++;
        continue;
      }
      if (ch === "{") break;
      if (ch === "}") {
        out += css.slice(i, j + 1);
        i = j + 1;
        j = i;
        continue;
      }
      j++;
    }
    if (j >= css.length) {
      out += css.slice(i);
      break;
    }
    if (css[j] !== "{") {
      out += css[i];
      i++;
      continue;
    }

    const selectorChunk = css.slice(i, j).trim();
    let k = j + 1;
    let depth = 1;
    quote = null;
    while (k < css.length && depth > 0) {
      const ch = css[k];
      if (quote) {
        if (ch === quote && css[k - 1] !== "\\") quote = null;
        k++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        k++;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      k++;
    }
    const body = css.slice(j + 1, k - 1);
    // Nested rule bodies (if any remain): recurse
    const nestedBody = body.includes("{") ? transformRuleSelectors(body) : body;
    const selectors = splitTopLevelSelectors(selectorChunk)
      .map(transformSelector)
      .filter(Boolean);
    if (selectors.length) out += `${selectors.join(",")}{${nestedBody}}`;
    i = k;
  }
  return out;
}

const bundled = bundle({
  filename: ENTRY,
  minify: false,
  drafts: { nesting: true },
  targets,
});

const flattened = transform({
  filename: "propskit.bundled.css",
  code: bundled.code,
  minify: false,
  drafts: { nesting: true },
  targets,
});

const cssText = Buffer.from(flattened.code).toString("utf8");
const scoped = transformRuleSelectors(cssText);

const themeBoost = `
${SCOPE}{color-scheme:light dark}
.figui-root.figma-light,[data-figui-overlay-root].figma-light,dialog[is="fig-popup"].figma-light,dialog[is="fig-dialog"].figma-light{color-scheme:light}
.figui-root.figma-dark,[data-figui-overlay-root].figma-dark,dialog[is="fig-popup"].figma-dark,dialog[is="fig-dialog"].figma-dark{color-scheme:dark}
`;

const minified = transform({
  filename: "propskit.scoped.css",
  code: Buffer.from(themeBoost + scoped),
  minify: true,
  drafts: { nesting: true },
  targets,
});

writeFileSync(OUTPUT, minified.code);
try {
  unlinkSync(ENTRY);
} catch {
  /* ignore */
}

console.log(`${OUTPUT} ${minified.code.length} bytes`);
