import { useState, useEffect, useCallback } from "react";

const INCLUDE_FILL_PICKER_KEY = "includeFillPicker";

async function loadFillPicker() {
  await import("../../../fig-fill-picker.css");
  // @ts-expect-error runtime side-effect import for optional fill picker registration
  await import("../../../fig-fill-picker.js");
}

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [includeFillPicker, setIncludeFillPickerState] = useState(
    () => localStorage.getItem(INCLUDE_FILL_PICKER_KEY) === "true",
  );

  const applyTheme = useCallback((dark: boolean) => {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, []);

  const setTheme = useCallback((dark: boolean) => {
    setIsDark(dark);
    applyTheme(dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [applyTheme]);

  const setIncludeFillPicker = useCallback((include: boolean) => {
    setIncludeFillPickerState(include);
    localStorage.setItem(INCLUDE_FILL_PICKER_KEY, include ? "true" : "false");
    if (include) {
      loadFillPicker();
      return;
    }
    if (customElements.get("fig-fill-picker")) {
      window.location.reload();
    }
  }, []);

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

  return { isDark, setTheme, includeFillPicker, setIncludeFillPicker };
}
