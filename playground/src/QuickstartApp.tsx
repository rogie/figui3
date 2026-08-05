import { useEffect, useRef, useState } from "react";
import {
  QUICKSTART_PANEL_MARKUP,
  quickstartSections,
} from "./data/quickstartExamples";
import "./QuickstartApp.css";

function runScripts(root: HTMLElement) {
  const scripts = Array.from(root.querySelectorAll("script"));
  for (const oldScript of scripts) {
    const script = document.createElement("script");
    for (const attr of oldScript.attributes) {
      script.setAttribute(attr.name, attr.value);
    }
    script.textContent = oldScript.textContent;
    oldScript.replaceWith(script);
  }
}

export default function QuickstartApp() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open && typeof dialog.show === "function") dialog.show();
  }, []);

  useEffect(() => {
    const mount = panelRef.current;
    if (!mount || mount.dataset.ready) return;
    mount.dataset.ready = "1";
    mount.innerHTML = QUICKSTART_PANEL_MARKUP;
    runScripts(mount);

    const panel = mount.querySelector("#quickstart-properties-panel") ?? mount;
    const log = document.getElementById("quickstart-events-log");
    const lines: string[] = [];
    const push = (type: string, event: Event) => {
      if (!(log instanceof HTMLElement)) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase?.() ?? "unknown";
      const detail =
        "detail" in event && (event as CustomEvent).detail !== undefined
          ? JSON.stringify((event as CustomEvent).detail)
          : "";
      lines.unshift(`${type} ← ${tag}${detail ? ` ${detail}` : ""}`);
      log.textContent = lines.slice(0, 8).join("\n");
    };
    const onInput = (e: Event) => push("input", e);
    const onChange = (e: Event) => push("change", e);
    panel.addEventListener("input", onInput);
    panel.addEventListener("change", onChange);
    return () => {
      panel.removeEventListener("input", onInput);
      panel.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.setAttribute("theme", theme);
    dialog.setAttribute("drag", "");
    dialog.setAttribute("autoresize", "");
    dialog.setAttribute("handle", "fig-header");
    dialog.setAttribute("position", "top right");
    dialog.classList.add("figui-root");
    window.applyFiguiTheme?.(dialog, theme);
    dialog.querySelectorAll("fig-panel, .figui-root").forEach((node) => {
      if (node === dialog) return;
      window.applyFiguiTheme?.(node as HTMLElement, theme);
    });
  }, [theme]);

  return (
    <div className="pk-quickstart">
      <header className="pk-quickstart-header">
        <div>
          <strong>PropsKit Quickstart</strong>
          <span className="pk-quickstart-meta">
            blank host page · one floating Properties panel
          </span>
        </div>
        <a className="pk-quickstart-link" href="/propskit">
          ← PropsKit catalog
        </a>
      </header>

      <main className="pk-quickstart-main">
        <div className="pk-quickstart-host-chrome">
          <p>Host chrome (outside the PropsKit dialog — should stay native)</p>
          <button type="button">Host button</button>
          <input type="text" defaultValue="Host input" />
          <label>
            Panel theme{" "}
            <select
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value as "system" | "light" | "dark")
              }
            >
              <option value="system">system</option>
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              const dialog = dialogRef.current;
              if (!dialog || dialog.open) return;
              dialog.show();
            }}
          >
            Open panel
          </button>
        </div>

        {quickstartSections.map((section) => (
          <section key={section.id} className="pk-quickstart-section">
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <div
              className="pk-quickstart-docs"
              dangerouslySetInnerHTML={{ __html: section.docs }}
            />
          </section>
        ))}
      </main>

      <dialog
        ref={dialogRef}
        is="fig-dialog"
        className="figui-root pk-quickstart-panel-dialog"
        title="Properties"
        open
        style={{ width: "280px" }}
      >
        <fig-content>
          <div ref={panelRef} className="pk-quickstart-panel-body" />
        </fig-content>
      </dialog>
    </div>
  );
}
