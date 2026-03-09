import { useRef, useEffect } from "react";
import type { Example } from "../data/sections";
import { getInjectedExampleMarkup } from "../lib/exampleMarkup";

interface Props {
  example: Example;
  markup: string;
  onPersistImageSource?: (fieldIndex: number, src: string) => void;
  onPersistDialogOpenState?: (fieldIndex: number, isOpen: boolean) => void;
  onPersistSwitchCheckedState?: (fieldIndex: number, isChecked: boolean) => void;
}

export default function ExampleView({
  example,
  markup,
  onPersistImageSource,
  onPersistDialogOpenState,
  onPersistSwitchCheckedState,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getPrimaryControls = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("*")).filter((node) => {
      const el = node as Element;
      if (!el.tagName.toLowerCase().startsWith("fig-")) return false;
      let parent = el.parentElement;
      while (parent) {
        if (parent.tagName.toLowerCase().startsWith("fig-")) return false;
        parent = parent.parentElement;
      }
      return true;
    });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onPersistImageSource) return;

    const handleLoaded = (event: Event) => {
      const customEvent = event as CustomEvent<{ base64?: string }>;
      const imageEl = event.target as HTMLElement | null;
      if (!imageEl || imageEl.tagName.toLowerCase() !== "fig-image") return;

      const srcAttr = imageEl.getAttribute("src") ?? "";
      if (!srcAttr.startsWith("blob:")) return;

      const base64 = customEvent.detail?.base64;
      if (!base64) return;

      const field = imageEl.closest("fig-field");
      let fieldIndex = -1;
      if (field) {
        const fields = Array.from(container.querySelectorAll("fig-field"));
        fieldIndex = fields.indexOf(field);
      } else {
        const controls = getPrimaryControls(container);
        fieldIndex = controls.indexOf(imageEl);
      }
      if (fieldIndex < 0) return;

      onPersistImageSource(fieldIndex, base64);
    };

    container.addEventListener("loaded", handleLoaded as EventListener);
    return () => {
      container.removeEventListener("loaded", handleLoaded as EventListener);
    };
  }, [onPersistImageSource]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onPersistDialogOpenState) return;

    const getPrimaryControls = () =>
      Array.from(container.querySelectorAll("*")).filter((node) => {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        const isFigDialog =
          tag === "dialog" && (el.getAttribute("is")?.toLowerCase() ?? "") === "fig-dialog";
        const isFigTag = tag.startsWith("fig-") || isFigDialog;
        if (!isFigTag) return false;
        if (el.getAttribute("data-playground-ignore-controls") === "true") return false;
        let parent = el.parentElement;
        while (parent) {
          const parentTag = parent.tagName.toLowerCase();
          const parentIsFigDialog =
            parentTag === "dialog" &&
            (parent.getAttribute("is")?.toLowerCase() ?? "") === "fig-dialog";
          if (parentTag.startsWith("fig-") || parentIsFigDialog) return false;
          parent = parent.parentElement;
        }
        return true;
      });

    const syncDialogState = (dialog: HTMLDialogElement) => {
      const controls = getPrimaryControls();
      const fieldIndex = controls.indexOf(dialog);
      if (fieldIndex < 0) return;
      onPersistDialogOpenState(fieldIndex, dialog.hasAttribute("open"));
    };

    const dialogs = Array.from(
      container.querySelectorAll<HTMLDialogElement>('dialog[is="fig-dialog"]'),
    );
    const closeHandlers = new Map<HTMLDialogElement, EventListener>();
    dialogs.forEach((dialog) => {
      const onClose = () => syncDialogState(dialog);
      closeHandlers.set(dialog, onClose as EventListener);
      dialog.addEventListener("close", onClose as EventListener);
      dialog.addEventListener("cancel", onClose as EventListener);
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type !== "attributes" || mutation.attributeName !== "open") return;
        const dialog = mutation.target as HTMLDialogElement;
        syncDialogState(dialog);
      });
    });
    dialogs.forEach((dialog) => {
      observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    });

    return () => {
      observer.disconnect();
      dialogs.forEach((dialog) => {
        const handler = closeHandlers.get(dialog);
        if (!handler) return;
        dialog.removeEventListener("close", handler);
        dialog.removeEventListener("cancel", handler);
      });
    };
  }, [onPersistDialogOpenState, markup]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onPersistSwitchCheckedState) return;

    const getPrimaryControls = () =>
      Array.from(container.querySelectorAll("*")).filter((node) => {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        const isFigDialog =
          tag === "dialog" && (el.getAttribute("is")?.toLowerCase() ?? "") === "fig-dialog";
        const isFigTag = tag.startsWith("fig-") || isFigDialog;
        if (!isFigTag) return false;
        if (el.getAttribute("data-playground-ignore-controls") === "true") return false;
        let parent = el.parentElement;
        while (parent) {
          const parentTag = parent.tagName.toLowerCase();
          const parentIsFigDialog =
            parentTag === "dialog" &&
            (parent.getAttribute("is")?.toLowerCase() ?? "") === "fig-dialog";
          if (parentTag.startsWith("fig-") || parentIsFigDialog) return false;
          parent = parent.parentElement;
        }
        return true;
      });

    const syncSwitchCheckedState = (switchEl: HTMLElement) => {
      const controls = getPrimaryControls();
      const fieldIndex = controls.indexOf(switchEl);
      if (fieldIndex < 0) return;
      const isChecked = switchEl.hasAttribute("checked");
      onPersistSwitchCheckedState(fieldIndex, isChecked);
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName.toLowerCase() !== "fig-switch") return;
      syncSwitchCheckedState(target);
    };

    container.addEventListener("input", handleInput as EventListener);
    return () => {
      container.removeEventListener("input", handleInput as EventListener);
    };
  }, [onPersistSwitchCheckedState, markup]);

  return (
    <div>
      <div
        ref={containerRef}
        key={example.id}
        dangerouslySetInnerHTML={{ __html: getInjectedExampleMarkup(markup) }}
      />
    </div>
  );
}
