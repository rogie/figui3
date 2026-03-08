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
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
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
  syntaxHighlighting(figmaHighlight),
  closeBrackets(),
  highlightActiveLine(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
];

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

  return new EditorView({
    state: EditorState.create({ doc, extensions }),
    parent,
  });
}

export function replaceDoc(view: EditorView | null, newDoc: string) {
  if (!view) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newDoc },
  });
}
