import { createRoot, type Root } from "react-dom/client";
import EditorApp from "./EditorApp";
import editorStyles from "./editor.css?inline";
import figStyles from "../../fig.css?inline";
import type { MountOptions, EditorNode, FigUIEditorAPI } from "./types";

const HOST_ID = "figui-editor";

let root: Root | null = null;
let shadowHost: HTMLElement | null = null;
let currentNode: EditorNode | null = null;

function resolveTarget(target?: string | HTMLElement): HTMLElement {
  if (target instanceof HTMLElement) return target;
  if (typeof target === "string") {
    const el = document.querySelector<HTMLElement>(target);
    if (el) return el;
  }
  const existing = document.getElementById(HOST_ID);
  if (existing) return existing;
  const created = document.createElement("div");
  created.id = HOST_ID;
  document.body.appendChild(created);
  return created;
}

async function injectStyles(
  shadow: ShadowRoot,
  cssUrl?: string,
) {
  let figCss = figStyles;
  if (cssUrl) {
    try {
      const res = await fetch(cssUrl);
      figCss = await res.text();
    } catch {
      // fall back to bundled CSS
    }
  }

  if (shadow.adoptedStyleSheets !== undefined) {
    const figSheet = new CSSStyleSheet();
    figSheet.replaceSync(figCss);
    const editorSheet = new CSSStyleSheet();
    editorSheet.replaceSync(editorStyles);
    shadow.adoptedStyleSheets = [figSheet, editorSheet];
  } else {
    const style = document.createElement("style");
    style.textContent = figCss + "\n" + editorStyles;
    shadow.appendChild(style);
  }
}

function loadFigJS(figJsUrl?: string): Promise<void> {
  const url = figJsUrl ?? "/fig.js";
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn(
        `[FigUIEditor] Could not load fig.js from "${url}". Custom elements may not be registered.`,
      );
      resolve();
    };
    document.head.appendChild(script);
  });
}

async function mount(options: MountOptions = {}) {
  if (root) return;

  const host = resolveTarget(options.target);
  shadowHost = host;

  const shadow =
    host.shadowRoot ?? host.attachShadow({ mode: "open" });

  await Promise.all([
    injectStyles(shadow, options.cssUrl),
    loadFigJS(options.figJsUrl),
  ]);

  const container = document.createElement("div");
  shadow.appendChild(container);

  root = createRoot(container);
  root.render(<EditorApp />);
}

function unmount() {
  if (!root) return;
  root.unmount();
  root = null;

  if (shadowHost?.shadowRoot) {
    shadowHost.shadowRoot.innerHTML = "";
  }
  shadowHost = null;
}

function setNode(node: EditorNode | null) {
  currentNode = node;
  // Future: trigger re-render with node data
}

const api: FigUIEditorAPI = { mount, unmount, setNode };

declare global {
  interface Window {
    FigUIEditor: FigUIEditorAPI;
  }
}

window.FigUIEditor = api;

// Auto-mount when the script loads
mount();

export { mount, unmount, setNode };
export type { EditorNode, MountOptions, FigUIEditorAPI };
