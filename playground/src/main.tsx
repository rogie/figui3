import { createRoot } from "react-dom/client";
import App from "./App";
import SandboxApp from "./SandboxApp";
import "./App.css";

type PlaygroundMode = "propkit" | "figui3" | "lab" | "sandbox";

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function resolveModeFromPath(pathname: string): PlaygroundMode {
  const normalized = normalizePathname(pathname);
  if (normalized === "/propkit/lab") {
    return "lab";
  }
  if (normalized === "/propkit" || normalized.startsWith("/propkit/")) {
    return "propkit";
  }
  if (normalized === "/sandbox" || normalized.startsWith("/sandbox/")) {
    return "sandbox";
  }
  return "figui3";
}

function applyTitleForMode(mode: PlaygroundMode) {
  if (mode === "propkit") {
    document.title =
      "Propkit playground: A framework-agnostic, opinionated set of property controls for Figma plugins";
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
    const migratedPath = normalized.replace(/^\/lab(?=\/|$)/, "/propkit/lab");
    window.history.replaceState(null, "", `${migratedPath}${search}${hash}`);
    return;
  }

  const supported =
    normalized === "/figui3" ||
    normalized.startsWith("/figui3/") ||
    normalized === "/propkit" ||
    normalized.startsWith("/propkit/") ||
    normalized === "/sandbox" ||
    normalized.startsWith("/sandbox/");
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
      await import("../../fig-fill-picker.css");
      // @ts-expect-error runtime side-effect import for optional fill picker registration
      await import("../../fig-fill-picker.js");
    }
    if (mode === "lab") {
      await import("../../fig-lab.css");
      // @ts-expect-error runtime side-effect import for lab component registration
      await import("../../fig-lab.js");
    }
  }
  applyTitleForMode(mode);
  createRoot(appRoot).render(
    mode === "sandbox" ? <SandboxApp /> : <App mode={mode} />,
  );
};

bootstrap();
