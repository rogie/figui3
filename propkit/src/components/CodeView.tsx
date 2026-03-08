import { useRef, useEffect, useCallback } from "react";
import { createEditor, replaceDoc } from "../lib/codemirror";
import { buildPropkitPrompt, copyText } from "../lib/prompt";
import type { EditorView } from "@codemirror/view";
import ClipboardIcon from "../icons/icon.24.clipboard.svg?react";
import ChatIcon from "../icons/icon.24.cursor-chat.svg?react";

interface Props {
  markup: string;
  onMarkupChange: (markup: string) => void;
}

export default function CodeView({ markup, onMarkupChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const toastRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = createEditor(containerRef.current, {
      lang: "html",
      doc: "",
      onChange: onMarkupChange,
    });
    editorRef.current = view;
    return () => view.destroy();
  }, [onMarkupChange]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc === markup) return;
    replaceDoc(view, markup);
  }, [markup]);

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
    if (!markup) return;
    await copyText(markup);
    showToast("HTML copied");
  }, [markup, showToast]);

  const handleCopyPrompt = useCallback(async () => {
    const container = document.querySelector(".example-view-container");
    if (!container) return;
    const prompt = buildPropkitPrompt(container);
    await copyText(prompt);
    showToast("Prompt copied");
  }, [showToast]);

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
      <dialog
        is="fig-toast"
        ref={toastRef as React.RefObject<HTMLDialogElement>}
        duration="1500"
        theme="dark"
      >
        HTML copied
      </dialog>
    </div>
  );
}
