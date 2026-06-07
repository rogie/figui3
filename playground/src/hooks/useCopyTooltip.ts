import { useCallback, useEffect, useRef } from "react";

const COPY_TOOLTIP_DURATION_MS = 5000;

type FigTooltipElement = HTMLElement & {
  text?: string;
  showPopup?: () => void;
  hidePopup?: () => void;
};

export function useCopyTooltip() {
  const timeoutRef = useRef<number | null>(null);
  const activeTooltipRef = useRef<FigTooltipElement | null>(null);
  const originalTextRef = useRef("");

  const clearCopyTooltip = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const tooltip = activeTooltipRef.current;
    if (!tooltip) return;

    tooltip.hidePopup?.();
    tooltip.text = originalTextRef.current;
    activeTooltipRef.current = null;
    originalTextRef.current = "";
  }, []);

  const showCopyTooltip = useCallback(
    (message: string, tooltip: FigTooltipElement | null) => {
      if (!tooltip) return;

      clearCopyTooltip();
      activeTooltipRef.current = tooltip;
      originalTextRef.current = tooltip.getAttribute("text") ?? "";
      tooltip.text = message;
      tooltip.showPopup?.();

      timeoutRef.current = window.setTimeout(() => {
        clearCopyTooltip();
      }, COPY_TOOLTIP_DURATION_MS);
    },
    [clearCopyTooltip],
  );

  useEffect(() => clearCopyTooltip, [clearCopyTooltip]);

  return { showCopyTooltip };
}
