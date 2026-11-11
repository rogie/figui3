import { useEffect, useRef, type RefObject } from "react";

type FigPopupDialog = HTMLDialogElement & {
  anchor?: Element | null;
};

/**
 * Keep `fig-popup` anchored to its trigger and mirror native `close` into React state.
 * Re-runs when `open` flips so positioning sees the current trigger element.
 */
export function useFigPopupAnchor(
  popupRef: RefObject<HTMLDialogElement | null>,
  anchorRef: RefObject<Element | null>,
  open: boolean,
  onClose: () => void,
) {
  // Avoid re-subscribing when callers pass a fresh onClose each render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const popup = popupRef.current as FigPopupDialog | null;
    if (!popup) return;

    popup.anchor = anchorRef.current;
    const handleClose = () => onCloseRef.current();
    popup.addEventListener("close", handleClose);
    return () => popup.removeEventListener("close", handleClose);
  }, [popupRef, anchorRef, open]);
}
