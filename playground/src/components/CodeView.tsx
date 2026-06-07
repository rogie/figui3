import { useRef, useEffect, useCallback } from "react";
import { createEditor, replaceDoc } from "../lib/codemirror";
import { buildPrompt, copyText } from "../lib/prompt";
import type { EditorView } from "@codemirror/view";
import { useCopyTooltip } from "../hooks/useCopyTooltip";
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
  const htmlCopyTooltipRef = useRef<HTMLElement>(null);
  const promptCopyTooltipRef = useRef<HTMLElement>(null);
  const { showCopyTooltip } = useCopyTooltip();
  const markupRef = useRef(markup);
  const editorOriginRef = useRef(false);
  const suppressOnChangeRef = useRef(false);
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
        if (suppressOnChangeRef.current) return;
        editorOriginRef.current = true;
        onMarkupChange(mergePreviewOnlyElements(markupRef.current, nextCodeMarkup));
      },
    });
    editorRef.current = view;
    return () => view.destroy();
  }, [onMarkupChange]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    const fromEditor = editorOriginRef.current;
    editorOriginRef.current = false;
    const currentDoc = view.state.doc.toString();
    if (fromEditor || currentDoc === codeMarkup) return;
    suppressOnChangeRef.current = true;
    replaceDoc(view, codeMarkup);
    suppressOnChangeRef.current = false;
  }, [codeMarkup]);

  const handleCopyCode = useCallback(async () => {
    if (!codeMarkup) return;
    await copyText(codeMarkup);
    showCopyTooltip("HTML copied", htmlCopyTooltipRef.current);
  }, [codeMarkup, showCopyTooltip]);

  const handleCopyPrompt = useCallback(async () => {
    if (!codeMarkup) return;
    const prompt = buildPrompt(codeMarkup);
    await copyText(prompt);
    showCopyTooltip("Prompt copied", promptCopyTooltipRef.current);
  }, [codeMarkup, showCopyTooltip]);

  return (
    <div className="propkit-code-view">
      <fig-header>
        <h3>Code</h3>
        <div className="propkit-code-view-actions">
          <fig-tooltip ref={htmlCopyTooltipRef} text="Copy HTML">
            <fig-button
              variant="ghost"
              icon
              onClick={handleCopyCode}
              aria-label="Copy HTML"
            >
              <ClipboardIcon />
            </fig-button>
          </fig-tooltip>
          <fig-tooltip ref={promptCopyTooltipRef} text="Copy prompt">
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
    </div>
  );
}
