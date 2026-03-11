import { useRef, useEffect } from "react";
import type { Example } from "../data/sections";
import { getInjectedExampleMarkup } from "../lib/exampleMarkup";

interface Props {
  example: Example;
  markup: string;
  onPersistImageSource?: (fieldIndex: number, src: string) => void;
  onPersistDialogOpenState?: (fieldIndex: number, isOpen: boolean) => void;
  onPersistSwitchCheckedState?: (fieldIndex: number, isChecked: boolean) => void;
  onPersistControlValue?: (fieldIndex: number, value: string) => void;
}

export default function ExampleView({
  example,
  markup,
  onPersistImageSource,
  onPersistDialogOpenState,
  onPersistSwitchCheckedState,
  onPersistControlValue,
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

  const controlValueCacheRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const VALUE_SYNC_TAGS = new Set(["fig-3d-rotate", "fig-origin-grid"]);

    const resolveFieldIndex = (target: HTMLElement): number => {
      const field = target.closest("fig-field");
      if (field) {
        const fields = Array.from(container.querySelectorAll("fig-field"));
        return fields.indexOf(field);
      }
      return getPrimaryControls(container).indexOf(target);
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || !VALUE_SYNC_TAGS.has(target.tagName.toLowerCase())) return;
      const value = target.getAttribute("value");
      if (value === null) return;
      const fieldIndex = resolveFieldIndex(target);
      if (fieldIndex < 0) return;
      controlValueCacheRef.current.set(fieldIndex, value);
    };

    const handleChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || !VALUE_SYNC_TAGS.has(target.tagName.toLowerCase())) return;
      const value = target.getAttribute("value");
      if (value === null) return;
      const fieldIndex = resolveFieldIndex(target);
      if (fieldIndex < 0) return;
      controlValueCacheRef.current.delete(fieldIndex);
      onPersistControlValue?.(fieldIndex, value);
    };

    container.addEventListener("input", handleInput as EventListener);
    container.addEventListener("change", handleChange as EventListener);
    return () => {
      container.removeEventListener("input", handleInput as EventListener);
      container.removeEventListener("change", handleChange as EventListener);
    };
  }, [onPersistControlValue, markup]);

  useEffect(() => {
    const container = containerRef.current;
    const cache = controlValueCacheRef.current;
    if (!container || !cache.size) return;

    const fields = Array.from(container.querySelectorAll("fig-field"));
    const controls = fields.length ? null : getPrimaryControls(container);

    for (const [fieldIndex, value] of cache) {
      let target: Element | null = null;
      if (fields.length && fields[fieldIndex]) {
        target = fields[fieldIndex].querySelector("fig-3d-rotate, fig-origin-grid");
      } else if (controls) {
        target = controls[fieldIndex] ?? null;
      }
      target?.setAttribute("value", value);
    }
  }, [markup]);

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
