/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBooleanAttribute,
  figDefineElement,
  figNextFrame,
} from "../runtime/index.js";
import { figWarnInvariant } from "../../shared/invariants.js";

/* Options */
/**
 * A responsive option picker that renders as a segmented control by default,
 * automatically swapping to a dropdown when any label overflows.
 * @attr {string} options - Comma-separated list of option labels
 * @attr {string} value - Currently selected value
 * @attr {boolean} disabled - Disables the control
 * @attr {boolean} full - Full-width segmented control
 * @attr {string} sizing - Segment sizing mode: "equal" (default) or "auto"
 */
class FigOptions extends HTMLElement {
  static get observedAttributes() {
    return ["options", "value", "disabled", "full", "sizing"];
  }

  #currentMode = "segments"; // "segments" | "dropdown"
  #naturalWidth = 0;
  #resizeObserver = null;
  #parsedOptions = [];
  #propertyOptions = null;
  #childControl = null;
  #suppressEvents = false;

  #normalizeChildEventValue(e) {
    const detailValue = e?.detail;
    if (typeof detailValue === "string") return detailValue;
    const fallbackValue =
      e?.currentTarget?.value ?? e?.target?.value ?? this.getAttribute("value");
    if (fallbackValue === null || fallbackValue === undefined) return null;
    return String(fallbackValue);
  }

  #canReuseControl() {
    if (this.#parsedOptions.length === 0) return false;
    const segments = this.querySelector(":scope > fig-segmented-control");
    if (segments) {
      const opts = segments.querySelectorAll("fig-segment");
      if (opts.length !== this.#parsedOptions.length) return false;
      return Array.from(opts).every(
        (seg, i) =>
          seg.getAttribute("value") === this.#parsedOptions[i].value &&
          seg.textContent === this.#parsedOptions[i].label,
      );
    }
    const dropdown = this.querySelector(":scope > fig-dropdown");
    if (dropdown) {
      const opts = dropdown.querySelectorAll("option");
      return (
        opts.length === this.#parsedOptions.length &&
        Array.from(opts).every(
          (opt, i) =>
            opt.value === this.#parsedOptions[i].value &&
            opt.textContent === this.#parsedOptions[i].label,
        )
      );
    }
    return false;
  }

  #reuseControl() {
    const segments = this.querySelector(":scope > fig-segmented-control");
    if (segments) {
      this.#childControl = segments;
      this.#currentMode = "segments";
    } else {
      this.#childControl = this.querySelector(":scope > fig-dropdown");
      this.#currentMode = "dropdown";
    }
    this.#syncValueToChild();
  }

  connectedCallback() {
    this.#parseOptions();
    if (this.#canReuseControl()) {
      this.#reuseControl();
      this.#startResizeObserver();
      figNextFrame(this, () => figNextFrame(this, () => this.#checkOverflow()));
      return;
    }
    this.#renderSegments();
    this.#startResizeObserver();
    figNextFrame(this, () => figNextFrame(this, () => this.#checkOverflow()));
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    if (val === null || val === undefined) {
      this.removeAttribute("value");
    } else {
      this.setAttribute("value", String(val));
    }
  }

  get options() {
    return this.#parsedOptions.map(({ value, label }) =>
      value === label ? value : { value, label },
    );
  }

  set options(val) {
    if (Array.isArray(val)) {
      this.#propertyOptions = val.map((option) =>
        typeof option === "object" && option !== null
          ? {
              value: String(option.value ?? ""),
              label: String(option.label ?? option.value ?? ""),
            }
          : String(option),
      );
    } else {
      this.#propertyOptions = null;
      if (val !== null && val !== undefined) {
        this.setAttribute("options", String(val));
        return;
      }
    }
    this.#parseOptions();
    if (this.isConnected) this.#rebuildCurrentControl();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "options") {
      this.#propertyOptions = null;
      this.#parseOptions();
      this.#rebuildCurrentControl();
      return;
    }

    if (name === "value") {
      this.#syncValueToChild();
      return;
    }

    if (name === "disabled") {
      this.#syncAttrToChild("disabled");
      return;
    }

    if (name === "full") {
      this.#syncAttrToChild("full");
      return;
    }

    if (name === "sizing") {
      this.#syncAttrToChild("sizing");
      this.#rebuildCurrentControl();
    }
  }

  #parseOptions() {
    const normalize = (options) => {
      const normalized = (Array.isArray(options) ? options : []).map((option) => {
        if (typeof option === "object" && option !== null) {
          return {
            value: String(option.value ?? ""),
            label: String(option.label ?? option.value ?? ""),
          };
        }
        const value = String(option);
        return { value, label: value };
      });
      const seen = new Set();
      return normalized.filter((option) => {
        if (!seen.has(option.value)) {
          seen.add(option.value);
          return true;
        }
        figWarnInvariant(
          `fig-options-duplicate:${option.value}`,
          `fig-options ignored duplicate value "${option.value}".`,
        );
        return false;
      });
    };
    if (this.#propertyOptions) {
      this.#parsedOptions = normalize(this.#propertyOptions);
      return;
    }
    const raw = this.getAttribute("options") || "";
    if (raw.startsWith("[")) {
      try {
        this.#parsedOptions = normalize(JSON.parse(raw));
        return;
      } catch {}
    }
    const delimiter = raw.includes("\n") ? "\n" : ",";
    this.#parsedOptions = normalize(
      raw.split(delimiter).map((s) => s.trim()).filter(Boolean),
    );
  }

  #renderSegments() {
    this.replaceChildren();
    if (this.#parsedOptions.length === 0) return;

    const sc = document.createElement("fig-segmented-control");
    sc.setAttribute("sizing", this.getAttribute("sizing") || "equal");

    if (figBooleanAttribute(this, "disabled")) sc.setAttribute("disabled", "");
    if (figBooleanAttribute(this, "full")) sc.setAttribute("full", "");

    const currentValue = this.getAttribute("value");

    for (const opt of this.#parsedOptions) {
      const seg = document.createElement("fig-segment");
      seg.setAttribute("value", opt.value);
      seg.textContent = opt.label;
      if (currentValue === opt.value) {
        seg.setAttribute("selected", "true");
      }
      sc.appendChild(seg);
    }

    if (currentValue) sc.setAttribute("value", currentValue);

    sc.addEventListener("input", (e) => {
      e.stopPropagation();
      if (this.#suppressEvents) return;
      const nextValue = this.#normalizeChildEventValue(e);
      if (nextValue === null) return;
      this.#suppressEvents = true;
      this.setAttribute("value", nextValue);
      this.#suppressEvents = false;
      this.dispatchEvent(
        new CustomEvent("input", {
          detail: nextValue,
          bubbles: true,
          composed: true,
        }),
      );
    });
    sc.addEventListener("change", (e) => {
      e.stopPropagation();
      if (this.#suppressEvents) return;
      const nextValue = this.#normalizeChildEventValue(e);
      if (nextValue === null) return;
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: nextValue,
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.appendChild(sc);
    this.#childControl = sc;
    this.#currentMode = "segments";
  }

  #renderDropdown() {
    this.replaceChildren();
    if (this.#parsedOptions.length === 0) return;

    const dd = document.createElement("fig-dropdown");
    if (figBooleanAttribute(this, "disabled")) dd.setAttribute("disabled", "");

    const currentValue = this.getAttribute("value");

    for (const opt of this.#parsedOptions) {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      if (currentValue === opt.value) option.selected = true;
      dd.appendChild(option);
    }

    if (currentValue) dd.setAttribute("value", currentValue);

    dd.addEventListener("input", (e) => {
      e.stopPropagation();
      if (this.#suppressEvents) return;
      const nextValue = this.#normalizeChildEventValue(e);
      if (!nextValue) return;
      this.#suppressEvents = true;
      this.setAttribute("value", nextValue);
      this.#suppressEvents = false;
      this.dispatchEvent(
        new CustomEvent("input", {
          detail: nextValue,
          bubbles: true,
          composed: true,
        }),
      );
    });
    dd.addEventListener("change", (e) => {
      e.stopPropagation();
      if (this.#suppressEvents) return;
      const nextValue = this.#normalizeChildEventValue(e);
      if (!nextValue) return;
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: nextValue,
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.appendChild(dd);
    this.#childControl = dd;
    this.#currentMode = "dropdown";
  }

  #rebuildCurrentControl() {
    if (this.#currentMode === "segments") {
      this.#renderSegments();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.#checkOverflow());
      });
    } else {
      this.#renderDropdown();
    }
  }

  #syncValueToChild() {
    if (!this.#childControl || this.#suppressEvents) return;
    const val = this.getAttribute("value") || "";
    this.#childControl.value = val;
  }

  #syncAttrToChild(attr) {
    if (!this.#childControl) return;
    if (this.hasAttribute(attr)) {
      this.#childControl.setAttribute(attr, this.getAttribute(attr) || "");
    } else {
      this.#childControl.removeAttribute(attr);
    }
  }

  #startResizeObserver() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#checkOverflow();
    });
    this.#resizeObserver.observe(this);
  }

  #isSegmentTruncated(seg) {
    const range = document.createRange();
    range.selectNodeContents(seg);
    const textWidth = range.getBoundingClientRect().width;
    const segRect = seg.getBoundingClientRect();
    const segWidth = segRect.width;
    const cs = getComputedStyle(seg);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const contentWidth = segWidth - padL - padR;
    return textWidth > contentWidth + 0.5;
  }

  #anySegmentTruncated() {
    const segments = this.querySelectorAll("fig-segment");
    for (const seg of segments) {
      if (this.#isSegmentTruncated(seg)) return true;
    }
    return false;
  }

  #checkOverflow() {
    if (this.#parsedOptions.length <= 1) return;

    if (this.#currentMode === "segments") {
      const sc = this.#childControl;
      const containerOverflow = sc && sc.scrollWidth > sc.clientWidth + 1;
      if (containerOverflow || this.#anySegmentTruncated()) {
        this.#naturalWidth = this.clientWidth;
        this.#renderDropdown();
      }
    } else {
      if (this.#naturalWidth > 0 && this.clientWidth >= this.#naturalWidth) {
        this.#renderSegments();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const sc = this.#childControl;
            const containerOverflow = sc && sc.scrollWidth > sc.clientWidth + 1;
            if (containerOverflow || this.#anySegmentTruncated()) {
              this.#renderDropdown();
            }
          });
        });
      }
    }
  }
}
figDefineElement("fig-options", FigOptions);

export { FigOptions };
