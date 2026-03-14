import { useRef, useEffect, useCallback } from "react";
import { createEditor, replaceDoc } from "../lib/codemirror";
import { buildPrompt, copyText } from "../lib/prompt";
import type { EditorView } from "@codemirror/view";
import ClipboardIcon from "../icons/icon.24.clipboard.svg?react";
import ChatIcon from "../icons/icon.24.cursor-chat.svg?react";
import { getCodeSourceMarkup, mergePreviewOnlyElements } from "../lib/exampleMarkup";

interface Props {
  markup: string;
  onMarkupChange: (markup: string) => void;
}

export default function CodeView({ markup, onMarkupChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const toastRef = useRef<HTMLElement>(null);
  const markupRef = useRef(markup);
  const codeMarkup = getCodeSourceMarkup(markup);

  useEffect(() => {
    markupRef.current = markup;
  }, [markup]);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = createEditor(containerRef.current, {
      lang: "html",
      doc: "",
      onChange: (nextCodeMarkup) => {
        onMarkupChange(mergePreviewOnlyElements(markupRef.current, nextCodeMarkup));
      },
    });
    editorRef.current = view;
    return () => view.destroy();
  }, [onMarkupChange]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc === codeMarkup) return;
    replaceDoc(view, codeMarkup);
  }, [codeMarkup]);

  const showToast = useCallback((message: string) => {
    const el = toastRef.current as HTMLElement & { showToast?: () => void };
    const colorScheme =
      document.documentElement.style.colorScheme ||
      window.getComputedStyle(document.documentElement).colorScheme;
    const isDark = colorScheme.includes("dark");
    el?.setAttribute("theme", isDark ? "light" : "dark");
    if (el) {
      el.textContent = message;
    }
    el?.showToast?.();
  }, []);

  const handleCopyCode = useCallback(async () => {
    if (!codeMarkup) return;
    await copyText(codeMarkup);
    showToast("HTML copied");
  }, [codeMarkup, showToast]);

  const handleCopyPrompt = useCallback(async () => {
    if (!codeMarkup) return;
    const prompt = buildPrompt(codeMarkup);
    await copyText(prompt);
    showToast("Prompt copied");
  }, [codeMarkup, showToast]);

  return (
    <div className="propkit-code-view">
      <fig-header>
        <h3>Code</h3>
        <div className="propkit-code-view-actions">
          <fig-tooltip text="Copy HTML">
            <fig-button variant="ghost" icon onClick={handleCopyCode} aria-label="Copy HTML">
              <ClipboardIcon />
            </fig-button>
          </fig-tooltip>
          <fig-tooltip text="Copy prompt">
            <fig-button
              variant="ghost"
              icon
              onClick={handleCopyPrompt}
              aria-label="Copy prompt"
            >
              <ChatIcon />
            </fig-button>
          </fig-tooltip>
        </div>
      </fig-header>
      <div ref={containerRef} />
      <dialog is="fig-toast" ref={toastRef as React.RefObject<HTMLDialogElement>}>
        HTML copied
      </dialog>
    </div>
  );
}
