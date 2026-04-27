import { useState, useEffect, useRef } from "react";
import { createEditor, replaceDoc } from "../lib/codemirror";
import type { EditorView } from "@codemirror/view";

export default function EventView() {
  const [latest, setLatest] = useState<unknown | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const container = document.querySelector(".example-view-container");
    if (!container) return;

    let rafId = 0;
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail === undefined || ce.detail === null) return;
      const target = e.target as HTMLElement | null;
      if (!target?.tagName.toLowerCase().startsWith("fig-")) return;
      const detail =
        ce.detail !== null && typeof ce.detail === "object"
          ? ce.detail
          : { value: ce.detail };
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setLatest(detail));
    };

    container.addEventListener("input", handler);
    container.addEventListener("change", handler);
    return () => {
      container.removeEventListener("input", handler);
      container.removeEventListener("change", handler);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!editorContainerRef.current) return;
    const view = createEditor(editorContainerRef.current, {
      lang: "json",
      readOnly: true,
      minimal: true,
      doc: "",
    });
    editorRef.current = view;
    return () => view.destroy();
  }, []);

  useEffect(() => {
    if (!editorRef.current || latest === null) return;
    replaceDoc(editorRef.current, JSON.stringify(latest, null, 2));
  }, [latest]);

  return (
    <div className="propkit-attributes-view">
      <fig-header borderless>
        <h3>Event output</h3>
      </fig-header>
      <section className="propkit-attributes-content event-view-content">
        {latest === null && (
          <fig-field className="event-view-empty">
            <label>Interact with the component to see event output</label>
          </fig-field>
        )}
        <fig-field
          ref={editorContainerRef}
          className="event-view-editor"
          style={{ display: latest === null ? "none" : undefined }}
        />
      </section>
    </div>
  );
}
