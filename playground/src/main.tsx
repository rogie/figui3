import "../../fig.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

function resolveModeFromPath(pathname: string): "propkit" | "figui3" {
  if (pathname === "/propkit" || pathname.startsWith("/propkit/")) {
    return "propkit";
  }
  return "figui3";
}

function applyTitleForMode(mode: "propkit" | "figui3") {
  document.title =
    mode === "propkit"
      ? "Propkit playground: A framework-agnostic, opinionated set of property controls for Figma plugins"
      : "FigUI3 playground: A framework-agnostic set of Figma web components";
}

function ensureSupportedRoute() {
  const pathname = window.location.pathname;
  if (pathname === "/" || pathname === "") {
    window.history.replaceState(null, "", `/figui3${window.location.hash}`);
    return;
  }

  const supported = pathname.startsWith("/figui3") || pathname.startsWith("/propkit");
  if (!supported) {
    window.history.replaceState(null, "", `/figui3${window.location.hash}`);
  }
}

const bootstrap = async () => {
  ensureSupportedRoute();
  // @ts-expect-error runtime side-effect import for custom element registration
  await import("../../fig.js");
  const mode = resolveModeFromPath(window.location.pathname);
  applyTitleForMode(mode);
  createRoot(document.getElementById("app")!).render(<App mode={mode} />);
};

bootstrap();
