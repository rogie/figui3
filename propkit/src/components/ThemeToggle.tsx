import { useRef, useEffect } from "react";
import SunIcon from "../icons/sun.svg?react";
import MoonIcon from "../icons/moon.svg?react";

interface Props {
  isDark: boolean;
  setTheme: (dark: boolean) => void;
}

export default function ThemeToggle({ isDark, setTheme }: Props) {
  const switchRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = switchRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      setTheme((e.target as HTMLInputElement).checked);
    };
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [setTheme]);

  useEffect(() => {
    const el = switchRef.current;
    if (!el) return;
    if (isDark) el.setAttribute("checked", "true");
    else el.removeAttribute("checked");
  }, [isDark]);

  return (
    <div className="theme-switch" data-dark={isDark || undefined}>
      <fig-button
        variant="ghost"
        icon
        onClick={() => setTheme(false)}
        style={{
          color: isDark
            ? "var(--figma-color-icon-secondary)"
            : "var(--figma-color-icon-selected)",
        }}
      >
        <SunIcon />
      </fig-button>
      <fig-switch ref={switchRef} />
      <fig-button
        variant="ghost"
        icon
        onClick={() => setTheme(true)}
        style={{
          color: isDark
            ? "var(--figma-color-icon-selected)"
            : "var(--figma-color-icon-secondary)",
        }}
      >
        <MoonIcon />
      </fig-button>
    </div>
  );
}
