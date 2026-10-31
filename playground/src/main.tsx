import { createRoot } from "react-dom/client";
import App from "./App";
import SandboxApp from "./SandboxApp";
import TestApp from "./TestApp";
import { getPropsKitMigration } from "./data/propkitMigration";
import { hashRequiresEditorControls } from "./lib/editorSections";
import "./App.css";

type PlaygroundMode =
  | "figui3"
  | "lab"
  | "sandbox"
  | "tests";

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function resolveModeFromPath(pathname: string): PlaygroundMode {
  const normalized = normalizePathname(pathname);
  if (
    normalized === "/figui3/lab" ||
    normalized.startsWith("/figui3/lab/")
  ) {
    return "lab";
  }
  if (normalized === "/sandbox" || normalized.startsWith("/sandbox/")) {
    return "sandbox";
  }
  if (normalized === "/tests" || normalized.startsWith("/tests/")) {
    return "tests";
  }
  return "figui3";
}

function applyTitleForMode(mode: PlaygroundMode) {
  if (mode === "lab") {
    document.title = "Lab playground: Experimental FigUI3 components";
    return;
  }
  if (mode === "sandbox") {
    document.title = "Sandbox playground: Styled React sample app";
    return;
  }
  if (mode === "tests") {
    document.title = "FigUI3 component tests";
    return;
  }
  document.title =
    "FigUI3 playground: A framework-agnostic set of Figma web components";
}

function migratePropsKitHash(hash: string): string {
  const route = hash.replace(/^#/, "");
  const [sectionId, exampleId] = route.split("/");
  if (!sectionId || !exampleId) return hash;
  const migration = getPropsKitMigration(sectionId, exampleId);
  return migration
    ? `#${migration.sectionId}/${migration.exampleId}`
    : hash;
}

function ensureSupportedRoute() {
  const pathname = window.location.pathname;
  const normalized = normalizePathname(pathname);
  const search = window.location.search;
  const hash = window.location.hash;
  if (normalized === "/" || normalized === "") {
    window.history.replaceState(null, "", `/figui3${search}${hash}`);
    return;
  }

  if (
    normalized === "/propkit/lab" ||
    normalized.startsWith("/propkit/lab/") ||
    normalized === "/propskit/lab" ||
    normalized.startsWith("/propskit/lab/") ||
    normalized === "/lab" ||
    normalized.startsWith("/lab/")
  ) {
    window.history.replaceState(null, "", `/figui3/lab${search}${hash}`);
    return;
  }

  if (
    normalized === "/propkit" ||
    normalized.startsWith("/propkit/") ||
    normalized === "/propskit" ||
    normalized.startsWith("/propskit/")
  ) {
    window.history.replaceState(
      null,
      "",
      `/figui3${search}${migratePropsKitHash(hash)}`,
    );
    return;
  }

  const supported =
    normalized === "/figui3" ||
    normalized.startsWith("/figui3/") ||
    normalized === "/sandbox" ||
    normalized.startsWith("/sandbox/") ||
    normalized === "/tests" ||
    normalized.startsWith("/tests/");
  if (!supported) {
    window.history.replaceState(null, "", `/figui3${search}${hash}`);
  }
}

const bootstrap = async () => {
  ensureSupportedRoute();
  const mode = resolveModeFromPath(window.location.pathname);
  const appRoot = document.getElementById("app")!;
  appRoot.dataset.mode = mode;
  const hashNeedsEditorControls =
    mode === "figui3" && hashRequiresEditorControls(window.location.hash);
  if (hashNeedsEditorControls) {
    localStorage.setItem("includeEditorControls", "true");
  }

  if (mode !== "sandbox") {
    await import("../../fig.css");
    // @ts-expect-error runtime side-effect import for custom element registration
    await import("../../fig.js");
    await import("../../fig-layer.css");
    // @ts-expect-error runtime side-effect import for layer navigation registration
    await import("../../fig-layer.js");
    if (
      mode === "lab" ||
      localStorage.getItem("includeEditorControls") === "true" ||
      hashNeedsEditorControls
    ) {
      await import("../../fig-editor.css");
      // @ts-expect-error runtime side-effect import for optional editor component registration
      await import("../../fig-editor.js");
    }
    if (mode === "lab") {
      await import("../../fig-lab.css");
    }
    if (mode === "lab") {
      // @ts-expect-error runtime side-effect import for lab component registration
      await import("../../fig-lab.js");
    }
  }

  applyTitleForMode(mode);
  createRoot(appRoot).render(
    mode === "sandbox" ? (
      <SandboxApp />
    ) : mode === "tests" ? (
      <TestApp />
    ) : (
      <App mode={mode} />
    ),
  );
};

bootstrap();
