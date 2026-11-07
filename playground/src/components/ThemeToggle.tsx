import { useRef, useState } from "react";
import SunIcon from "../icons/sun.svg?react";
import MoonIcon from "../icons/moon.svg?react";
import AdjustIcon from "../icons/icon.24.adjust.svg?react";
import { useFigPopupAnchor } from "../hooks/useFigPopupAnchor";

interface Props {
  isDark: boolean;
  setTheme: (dark: boolean) => void;
  includeEditorControls: boolean;
  setIncludeEditorControls: (include: boolean) => void;
}

export default function ThemeToggle({
  isDark,
  setTheme,
  includeEditorControls,
  setIncludeEditorControls,
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

  useFigPopupAnchor(popupRef, settingsButtonRef, preferencesOpen, () =>
    setPreferencesOpen(false),
  );

  const handleModeChange = (event: any) => {
    const nextMode = (event as CustomEvent).detail ?? event.target?.value;
    if (typeof nextMode !== "string") return;
    setTheme(nextMode.toLowerCase() === "dark");
  };

  const handleEditorControlsInput = (event: any) => {
    const customEvent = event as CustomEvent<{ checked?: boolean }>;
    const checked =
      customEvent.detail?.checked ?? Boolean((event.target as any)?.checked);
    setIncludeEditorControls(checked);
  };

  return (
    <fig-stack className="theme-switch" data-dark={isDark || undefined}>
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
          aria-haspopup="dialog"
          aria-controls="preferences-popup"
          aria-expanded={preferencesOpen}
          onClick={() => setPreferencesOpen((open) => !open)}
        >
          <AdjustIcon />
        </fig-button>
      </fig-tooltip>
      <dialog
        id="preferences-popup"
        ref={popupRef}
        {...popupAttrs}
        open={preferencesOpen ? true : undefined}
        className="preferences-popup"
        aria-labelledby="preferences-popup-title"
      >
        <fig-header>
          <h3 id="preferences-popup-title">Preferences</h3>
        </fig-header>
        <fig-content>
          <fig-field columns="half">
            <label>Full editor</label>
            <fig-switch
              checked={includeEditorControls ? "true" : undefined}
              onInput={handleEditorControlsInput}
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
    </fig-stack>
  );
}
