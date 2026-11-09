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
  onMarkupChange?: (markup: string) => void;
  lang?: "html" | "json" | "javascript";
  readOnly?: boolean;
  showPromptAction?: boolean;
  title?: string;
}

export default function CodeView({
  markup,
  onMarkupChange,
  lang = "html",
  readOnly = false,
  showPromptAction = true,
  title = "Code",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const htmlCopyTooltipRef = useRef<HTMLElement>(null);
  const promptCopyTooltipRef = useRef<HTMLElement>(null);
  const { showCopyTooltip } = useCopyTooltip();
  const markupRef = useRef(markup);
  const editorOriginRef = useRef(false);
  const suppressOnChangeRef = useRef(false);
  const codeMarkup = lang === "html" ? getCodeSourceMarkup(markup) : markup;
  const codeKind =
    lang === "javascript" ? "JavaScript" : lang === "json" ? "JSON" : "HTML";

  useEffect(() => {
    markupRef.current = markup;
  }, [markup]);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = createEditor(containerRef.current, {
      lang,
      readOnly,
      doc: "",
      onChange: onMarkupChange
        ? (nextCodeMarkup) => {
            if (suppressOnChangeRef.current) return;
            editorOriginRef.current = true;
            onMarkupChange(
              lang === "html"
                ? mergePreviewOnlyElements(markupRef.current, nextCodeMarkup)
                : nextCodeMarkup,
            );
          }
        : undefined,
    });
    editorRef.current = view;
    return () => view.destroy();
  }, [lang, onMarkupChange, readOnly]);

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
    showCopyTooltip(`${codeKind} copied`, htmlCopyTooltipRef.current);
  }, [codeKind, codeMarkup, showCopyTooltip]);

  const handleCopyPrompt = useCallback(async () => {
    if (!codeMarkup) return;
    const prompt = lang === "html" ? buildPrompt(codeMarkup) : codeMarkup;
    await copyText(prompt);
    showCopyTooltip("Prompt copied", promptCopyTooltipRef.current);
  }, [codeMarkup, lang, showCopyTooltip]);

  return (
    <div className="propkit-code-view">
      <fig-header>
        <h3>{title}</h3>
        <div className="propkit-code-view-actions">
          <fig-tooltip ref={htmlCopyTooltipRef} text={`Copy ${codeKind}`}>
            <fig-button
              variant="ghost"
              icon
              onClick={handleCopyCode}
              aria-label={`Copy ${codeKind}`}
            >
              <ClipboardIcon />
            </fig-button>
          </fig-tooltip>
          {showPromptAction ? (
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
          ) : null}
        </div>
      </fig-header>
      <div ref={containerRef} />
    </div>
  );
}
