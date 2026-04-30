import { createRoot } from "react-dom/client";
import App from "./App";
import SandboxApp from "./SandboxApp";
import "./App.css";

type PlaygroundMode = "propkit" | "figui3" | "lab" | "sandbox";

function resolveModeFromPath(pathname: string): PlaygroundMode {
  if (pathname === "/propkit" || pathname.startsWith("/propkit/")) {
    return "propkit";
  }
  if (pathname === "/lab" || pathname.startsWith("/lab/")) {
    return "lab";
  }
  if (pathname === "/sandbox" || pathname.startsWith("/sandbox/")) {
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
  if (pathname === "/" || pathname === "") {
    window.history.replaceState(null, "", `/figui3${window.location.hash}`);
    return;
  }

  const supported =
    pathname.startsWith("/figui3") ||
    pathname.startsWith("/propkit") ||
    pathname.startsWith("/lab") ||
    pathname.startsWith("/sandbox");
  if (!supported) {
    window.history.replaceState(null, "", `/figui3${window.location.hash}`);
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
