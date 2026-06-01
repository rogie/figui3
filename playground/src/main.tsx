import { createRoot } from "react-dom/client";
import App from "./App";
import SandboxApp from "./SandboxApp";
import TestApp from "./TestApp";
import "./App.css";

type PlaygroundMode = "propkit" | "figui3" | "lab" | "sandbox" | "tests";

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function resolveModeFromPath(pathname: string): PlaygroundMode {
  const normalized = normalizePathname(pathname);
  if (normalized === "/propkit/lab" || normalized === "/propskit/lab") {
    return "lab";
  }
  if (
    normalized === "/propkit" ||
    normalized.startsWith("/propkit/") ||
    normalized === "/propskit" ||
    normalized.startsWith("/propskit/")
  ) {
    return "propkit";
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
  if (mode === "propkit") {
    document.title =
      "PropsKit playground: A framework-agnostic, opinionated set of property controls for Figma plugins";
    return;
  }
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
  document.title = "FigUI3 playground: A framework-agnostic set of Figma web components";
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

  if (normalized === "/lab" || normalized.startsWith("/lab/")) {
    const migratedPath = normalized.replace(/^\/lab(?=\/|$)/, "/propskit/lab");
    window.history.replaceState(null, "", `${migratedPath}${search}${hash}`);
    return;
  }

  if (normalized === "/propkit" || normalized.startsWith("/propkit/")) {
    const migratedPath = normalized.replace(/^\/propkit(?=\/|$)/, "/propskit");
    window.history.replaceState(null, "", `${migratedPath}${search}${hash}`);
    return;
  }

  const supported =
    normalized === "/figui3" ||
    normalized.startsWith("/figui3/") ||
    normalized === "/propskit" ||
    normalized.startsWith("/propskit/") ||
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
  if (mode !== "sandbox") {
    await import("../../fig.css");
    // @ts-expect-error runtime side-effect import for custom element registration
    await import("../../fig.js");
    if (localStorage.getItem("includeFillPicker") === "true") {
      await import("../../fig-editor.css");
      // @ts-expect-error runtime side-effect import for optional fill picker registration
      await import("../../fig-editor.js");
    }
    if (mode === "lab") {
      await import("../../fig-lab.css");
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
