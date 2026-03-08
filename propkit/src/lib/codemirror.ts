import { minimalSetup } from "codemirror";
import {
  EditorView,
  highlightActiveLine,
  highlightSpecialChars,
  drawSelection,
  keymap,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { html as htmlLang } from "@codemirror/lang-html";
import { json as jsonLang } from "@codemirror/lang-json";
import {
  HighlightStyle,
  syntaxHighlighting,
  codeFolding,
  foldEffect,
} from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { tags } from "@lezer/highlight";

const figmaTheme = EditorView.theme({
  "&": {
    fontSize: "11px",
    backgroundColor: "var(--figma-color-bg-secondary)",
    color: "var(--figma-color-text)",
  },
  ".cm-content": {
    fontFamily: '"IBM Plex Mono", monospace',
    fontWeight: "400",
    padding: "8px 0",
    caretColor: "var(--figma-color-bg-brand)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--figma-color-bg-brand)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--figma-color-bg-selected) !important",
  },
  ".cm-activeLine": {
    backgroundColor:
      "color-mix(in srgb, var(--figma-color-bg-hover) 50%, transparent)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "var(--figma-color-bg-brand-tertiary)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor:
      "color-mix(in srgb, var(--figma-color-bg-selected) 55%, transparent)",
    border: "1px solid var(--figma-color-border-selected)",
    color: "var(--figma-color-text-secondary)",
    borderRadius: "var(--radius-small)",
    padding: "0 4px",
  },
});

const figmaHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--figma-color-text-component)" },
  { tag: tags.tagName, color: "var(--figma-color-text-component)" },
  { tag: tags.attributeName, color: "var(--figma-color-text-brand)" },
  { tag: tags.attributeValue, color: "var(--figma-color-text-success)" },
  { tag: tags.string, color: "var(--figma-color-text-success)" },
  { tag: tags.number, color: "var(--figma-color-text-warning)" },
  { tag: tags.bool, color: "var(--figma-color-text-warning)" },
  {
    tag: tags.comment,
    color: "var(--figma-color-text-tertiary)",
    fontStyle: "italic",
  },
  { tag: tags.punctuation, color: "var(--figma-color-text-secondary)" },
  { tag: tags.bracket, color: "var(--figma-color-text-secondary)" },
  { tag: tags.angleBracket, color: "var(--figma-color-text-secondary)" },
  { tag: tags.propertyName, color: "var(--figma-color-text-brand)" },
  { tag: tags.operator, color: "var(--figma-color-text-secondary)" },
  { tag: tags.typeName, color: "var(--figma-color-text-component)" },
  {
    tag: tags.definition(tags.variableName),
    color: "var(--figma-color-text-brand)",
  },
]);

const codeSetup = [
  highlightSpecialChars(),
  history(),
  drawSelection(),
  codeFolding(),
  syntaxHighlighting(figmaHighlight),
  closeBrackets(),
  highlightActiveLine(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
];

function getSvgFoldRanges(doc: string): Array<{ from: number; to: number }> {
  const tagRegex = /<\/?svg\b[^>]*>/gi;
  const stack: number[] = [];
  const ranges: Array<{ from: number; to: number }> = [];

  let match: RegExpExecArray | null = null;
  while ((match = tagRegex.exec(doc))) {
    const tag = match[0];
    const index = match.index;
    const isClosing = tag.startsWith("</");
    const isSelfClosing = /\/>$/.test(tag);

    if (isClosing) {
      const openTagEnd = stack.pop();
      const closeTagStart = index;
      if (
        typeof openTagEnd === "number" &&
        openTagEnd < closeTagStart
      ) {
        ranges.push({ from: openTagEnd, to: closeTagStart });
      }
    } else if (!isSelfClosing) {
      stack.push(index + tag.length);
    }
  }

  return ranges;
}

function foldSvgTags(view: EditorView) {
  const doc = view.state.doc.toString();
  const ranges = getSvgFoldRanges(doc);
  if (!ranges.length) return;
  view.dispatch({
    effects: ranges.map((range) => foldEffect.of(range)),
  });
}

export function createEditor(
  parent: HTMLElement,
  options: {
    lang?: "html" | "json";
    readOnly?: boolean;
    minimal?: boolean;
    doc?: string;
    onChange?: (doc: string) => void;
  } = {},
): EditorView {
  const {
    lang = "html",
    readOnly = false,
    minimal = false,
    doc = "",
    onChange,
  } = options;
  const langExt = lang === "json" ? jsonLang() : htmlLang();

  const extensions = [
    minimal ? minimalSetup : codeSetup,
    langExt,
    figmaTheme,
    EditorView.lineWrapping,
  ];
  if (minimal) extensions.push(syntaxHighlighting(figmaHighlight));
  if (readOnly) {
    extensions.push(
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
    );
  }
  if (onChange) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        onChange(update.state.doc.toString());
      }),
    );
  }

  const view = new EditorView({
    state: EditorState.create({ doc, extensions }),
    parent,
  });
  foldSvgTags(view);
  return view;
}

export function replaceDoc(view: EditorView | null, newDoc: string) {
  if (!view) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newDoc },
  });
  foldSvgTags(view);
}
