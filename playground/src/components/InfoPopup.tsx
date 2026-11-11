import { useRef, useState } from "react";
import AboutIcon from "../icons/icon.24.info.svg?react";
import InfoAboutContent from "./InfoAboutContent";
import { useFigPopupAnchor } from "../hooks/useFigPopupAnchor";

interface Props {
  appTitle: string;
  isDark: boolean;
}

export default function InfoPopup({ appTitle, isDark }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDialogElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const popupAttrs = {
    is: "fig-popup",
    variant: "popover",
    position: "bottom",
    offset: "0 8",
    // Invert theme so the popup contrasts against the nav chrome.
    theme: isDark ? "light" : "dark",
  } as any;

  const toggleInfo = () => setInfoOpen((open) => !open);

  useFigPopupAnchor(popupRef, triggerRef, infoOpen, () => setInfoOpen(false));

  return (
    <fig-stack className="nav-title-info" data-dark={isDark || undefined}>
      {/* Title + icon are one hover/click target. */}
      <fig-tooltip text="About Figma PropsKit">
        <button
          ref={triggerRef}
          type="button"
          className="nav-title-trigger"
          aria-label="About Figma PropsKit"
          aria-haspopup="dialog"
          aria-controls="info-popup"
          aria-expanded={infoOpen}
          onClick={toggleInfo}
        >
          <h1>{appTitle}</h1>
          <AboutIcon aria-hidden="true" />
        </button>
      </fig-tooltip>
      <dialog
        id="info-popup"
        ref={popupRef}
        {...popupAttrs}
        open={infoOpen ? true : undefined}
        className="info-popup"
        aria-labelledby="info-popup-title"
      >
        <fig-header compact>
          <h3 id="info-popup-title">About</h3>
        </fig-header>
        <fig-content>
          <InfoAboutContent />
        </fig-content>
      </dialog>
    </fig-stack>
  );
}
