import { useEffect, useRef, useState } from "react";
import SunIcon from "../icons/sun.svg?react";
import MoonIcon from "../icons/moon.svg?react";
import AdjustIcon from "../icons/icon.24.adjust.svg?react";

interface Props {
  isDark: boolean;
  setTheme: (dark: boolean) => void;
  includeFillPicker: boolean;
  setIncludeFillPicker: (include: boolean) => void;
}

export default function ThemeToggle({
  isDark,
  setTheme,
  includeFillPicker,
  setIncludeFillPicker,
}: Props) {
  const tooltip = isDark ? "Switch to light mode" : "Switch to dark mode";
  const toggleTheme = () => setTheme(!isDark);
  const settingsButtonRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDialogElement>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const popupAttrs = {
    is: "fig-popup",
    variant: "popover",
    position: "bottom",
    offset: "0 8",
    theme: isDark ? "light" : "dark",
  } as any;

  useEffect(() => {
    const popup = popupRef.current;
    if (!popup) return;
    (popup as any).anchor = settingsButtonRef.current;
    const handleClose = () => setPreferencesOpen(false);
    popup.addEventListener("close", handleClose);
    return () => popup.removeEventListener("close", handleClose);
  }, []);

  useEffect(() => {
    if (!popupRef.current || !settingsButtonRef.current) return;
    (popupRef.current as any).anchor = settingsButtonRef.current;
  }, [preferencesOpen]);

  const handleFillPickerInput = (event: any) => {
    const customEvent = event as CustomEvent<{ checked?: boolean }>;
    const checked =
      customEvent.detail?.checked ?? Boolean((event.target as any)?.checked);
    setIncludeFillPicker(checked);
  };

  const handleModeChange = (event: any) => {
    const nextMode = (event as CustomEvent).detail ?? event.target?.value;
    if (typeof nextMode !== "string") return;
    setTheme(nextMode.toLowerCase() === "dark");
  };

  return (
    <div className="theme-switch" data-dark={isDark || undefined}>
      <fig-tooltip text={tooltip}>
        <fig-button
          variant="ghost"
          icon
          aria-label={tooltip}
          onClick={toggleTheme}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </fig-button>
      </fig-tooltip>
      <fig-tooltip text="Preferences">
        <fig-button
          ref={settingsButtonRef}
          variant="ghost"
          icon
          aria-label="Preferences"
          onClick={() => setPreferencesOpen((open) => !open)}
        >
          <AdjustIcon />
        </fig-button>
      </fig-tooltip>
      <dialog
        ref={popupRef}
        {...popupAttrs}
        open={preferencesOpen ? true : undefined}
        className="preferences-popup"
      >
        <fig-header>
          <h3>Preferences</h3>
        </fig-header>
        <fig-content>
          <fig-field columns="half">
            <label>Fill picker</label>
            <fig-switch
              checked={includeFillPicker ? "true" : undefined}
              onInput={handleFillPickerInput}
            ></fig-switch>
          </fig-field>
          <fig-field columns="half">
            <label>Mode</label>
            <fig-options
              options="Light,Dark"
              value={isDark ? "Dark" : "Light"}
              onChange={handleModeChange}
            ></fig-options>
          </fig-field>
        </fig-content>
      </dialog>
    </div>
  );
}
