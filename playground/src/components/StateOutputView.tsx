import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import { createEditor, replaceDoc } from "../lib/codemirror";

interface Props {
  title: string;
  json?: string;
  emptyText?: string;
  kind: "values" | "event";
}

export default function StateOutputView({
  title,
  json,
  emptyText,
  kind,
}: Props) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorContainerRef.current) return;
    const view = createEditor(editorContainerRef.current, {
      lang: "json",
      readOnly: true,
      minimal: true,
      doc: json ?? "",
    });
    editorRef.current = view;
    return () => view.destroy();
  }, []);

  useEffect(() => {
    if (json === undefined) return;
    replaceDoc(editorRef.current, json);
  }, [json]);

  return (
    <div
      className="propkit-attributes-view"
      data-propskit-values={kind === "values" ? true : undefined}
      data-propskit-event={kind === "event" ? true : undefined}
    >
      <fig-header borderless>
        <h3>{title}</h3>
      </fig-header>
      <section className="propkit-attributes-content event-view-content">
        {json === undefined && emptyText ? (
          <div className="event-view-empty">{emptyText}</div>
        ) : null}
        <div
          ref={editorContainerRef}
          className="event-view-editor"
          style={{ display: json === undefined ? "none" : undefined }}
        />
      </section>
    </div>
  );
}
