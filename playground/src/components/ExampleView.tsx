import { useRef, useEffect } from "react";
import type { Example } from "../data/sections";
import { getInjectedExampleMarkup } from "../lib/exampleMarkup";
import { gradientValueToCss } from "../lib/gradientPreview";

interface Props {
  example: Example;
  markup: string;
  onPersistImageSource?: (fieldIndex: number, src: string) => void;
  onPersistDialogOpenState?: (fieldIndex: number, isOpen: boolean) => void;
  onPersistSwitchCheckedState?: (fieldIndex: number, isChecked: boolean) => void;
  onPersistControlValue?: (fieldIndex: number, value: string) => void;
}

function isComponentTag(tag: string): boolean {
  return tag.startsWith("fig-") || tag.startsWith("propskit-");
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
      if (!isComponentTag(el.tagName.toLowerCase())) return false;
      let parent = el.parentElement;
      while (parent) {
        if (isComponentTag(parent.tagName.toLowerCase())) return false;
        parent = parent.parentElement;
      }
      return true;
    });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onPersistImageSource) return;

    const handleLoaded = (event: Event) => {
      const customEvent = event as CustomEvent<{ src?: string; file?: File }>;
      const imageEl = event.target as HTMLElement | null;
      if (!imageEl || imageEl.tagName.toLowerCase() !== "fig-image") return;

      const src = customEvent.detail?.src;
      if (!src) return;

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

      onPersistImageSource(fieldIndex, src);
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
        const isFigTag = isComponentTag(tag) || isFigDialog;
        if (!isFigTag) return false;
        if (el.getAttribute("data-playground-ignore-controls") === "true") return false;
        let parent = el.parentElement;
        while (parent) {
          const parentTag = parent.tagName.toLowerCase();
          const parentIsFigDialog =
            parentTag === "dialog" &&
            (parent.getAttribute("is")?.toLowerCase() ?? "") === "fig-dialog";
          if (isComponentTag(parentTag) || parentIsFigDialog) return false;
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
        const isFigTag = isComponentTag(tag) || isFigDialog;
        if (!isFigTag) return false;
        if (el.getAttribute("data-playground-ignore-controls") === "true") return false;
        let parent = el.parentElement;
        while (parent) {
          const parentTag = parent.tagName.toLowerCase();
          const parentIsFigDialog =
            parentTag === "dialog" &&
            (parent.getAttribute("is")?.toLowerCase() ?? "") === "fig-dialog";
          if (isComponentTag(parentTag) || parentIsFigDialog) return false;
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
      const tag = target?.tagName.toLowerCase();
      if (!target || (tag !== "fig-switch" && tag !== "propskit-switch")) return;
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

    const VALUE_SYNC_TAGS = new Set([
      "fig-3d-rotate",
      "fig-origin-grid",
      "fig-joystick",
      "fig-segmented-control",
      "propskit-color-point",
      "propskit-color",
      "propskit-gradient",
      "propskit-number",
      "propskit-point-point",
      "propskit-point-radius",
      "propskit-point-radius-angle",
      "propskit-select",
      "propskit-slider",
      "propskit-text",
    ]);

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
      const tagName = target?.tagName.toLowerCase();
      if (!target || !tagName || !VALUE_SYNC_TAGS.has(tagName)) return;
      const value = target.getAttribute("value");
      if (value === null) return;
      const fieldIndex = resolveFieldIndex(target);
      if (fieldIndex < 0) return;
      controlValueCacheRef.current.delete(fieldIndex);
      const shouldSkipPersistForFocusedControl =
        tagName === "fig-segmented-control" ||
        tagName === "fig-joystick" ||
        tagName === "fig-origin-grid";
      if (shouldSkipPersistForFocusedControl) {
        // Avoid full example markup refresh after keyboard interaction; preserving DOM state
        // keeps focus on roving segments and draggable handles.
        return;
      }
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
        target = fields[fieldIndex].querySelector(
          "fig-3d-rotate, fig-origin-grid, fig-joystick, fig-segmented-control",
        );
      } else if (controls) {
        target = controls[fieldIndex] ?? null;
      }
      target?.setAttribute("value", value);
    }
  }, [markup]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scripts in example markup do not run via innerHTML — re-execute them.
    const scripts = Array.from(container.querySelectorAll("script"));
    for (const oldScript of scripts) {
      const script = document.createElement("script");
      for (const attr of oldScript.attributes) {
        script.setAttribute(attr.name, attr.value);
      }
      script.textContent = oldScript.textContent;
      oldScript.replaceWith(script);
    }
  }, [markup, example.id]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncGradientPreview = (sourceEl: HTMLElement) => {
      const panel = sourceEl.closest(".propkit-example");
      const preview = panel?.querySelector(".gradient-result-preview");
      if (!preview) return;
      const host = sourceEl as HTMLElement & { value?: unknown };
      const raw =
        typeof host.value === "string"
          ? host.value
          : typeof host.value === "object" && host.value
            ? JSON.stringify(host.value)
            : sourceEl.getAttribute("value");
      if (!raw) return;
      preview.setAttribute("background", gradientValueToCss(raw));
    };

    const handleGradientEvent = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (
        !target ||
        (tag !== "fig-interpolation-swatch" && tag !== "fig-input-gradient")
      ) {
        return;
      }
      syncGradientPreview(target);
    };

    container.addEventListener("input", handleGradientEvent as EventListener);
    container.addEventListener("change", handleGradientEvent as EventListener);

    container
      .querySelectorAll<HTMLElement>("fig-interpolation-swatch")
      .forEach((el) => syncGradientPreview(el));

    return () => {
      container.removeEventListener("input", handleGradientEvent as EventListener);
      container.removeEventListener("change", handleGradientEvent as EventListener);
    };
  }, [markup, example.id]);

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
