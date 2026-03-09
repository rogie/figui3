import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const applyTheme = useCallback((dark: boolean) => {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, []);

  const setTheme = useCallback((dark: boolean) => {
    setIsDark(dark);
    applyTheme(dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [applyTheme]);

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

  return { isDark, setTheme };
}
