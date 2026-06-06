import { useState, useEffect, useCallback } from "react";

const INCLUDE_EDITOR_CONTROLS_KEY = "includeEditorControls";

async function loadEditorControls() {
  await import("../../../fig-editor.css");
  // @ts-expect-error runtime side-effect import for optional editor control registration
  await import("../../../fig-editor.js");
}

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [includeEditorControls, setIncludeEditorControlsState] = useState(
    () => localStorage.getItem(INCLUDE_EDITOR_CONTROLS_KEY) === "true",
  );
  const [editorComponentsVersion, setEditorComponentsVersion] = useState(0);

  const applyTheme = useCallback((dark: boolean) => {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, []);

  const setTheme = useCallback((dark: boolean) => {
    setIsDark(dark);
    applyTheme(dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [applyTheme]);

  const setIncludeEditorControls = useCallback((include: boolean) => {
    setIncludeEditorControlsState(include);
    localStorage.setItem(INCLUDE_EDITOR_CONTROLS_KEY, include ? "true" : "false");
    if (!include && customElements.get("fig-fill-picker")) {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!includeEditorControls) return;
    if (customElements.get("fig-fill-picker")) {
      setEditorComponentsVersion((version) => version + 1);
      return;
    }
    loadEditorControls().then(() => {
      setEditorComponentsVersion((version) => version + 1);
    });
  }, [includeEditorControls]);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark, applyTheme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) setTheme(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [setTheme]);

  return {
    isDark,
    setTheme,
    includeEditorControls,
    setIncludeEditorControls,
    editorComponentsVersion,
  };
}
