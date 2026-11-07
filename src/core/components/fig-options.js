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
        (seg, i) => seg.getAttribute("value") === this.#parsedOptions[i],
      );
    }
    const dropdown = this.querySelector(":scope > fig-dropdown");
    if (dropdown) {
      const opts = dropdown.querySelectorAll("option");
      return (
        opts.length === this.#parsedOptions.length &&
        Array.from(opts).every(
          (opt, i) => opt.textContent?.trim() === this.#parsedOptions[i],
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
    return this.#parsedOptions.slice();
  }

  set options(val) {
    if (Array.isArray(val)) {
      const hasComma = val.some((v) => String(v).includes(","));
      const str = hasComma ? JSON.stringify(val) : val.join(",");
      this.setAttribute("options", str);
    } else {
      this.setAttribute("options", String(val || ""));
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "options") {
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
    const raw = this.getAttribute("options") || "";
    if (raw.startsWith("[")) {
      try { this.#parsedOptions = JSON.parse(raw); return; } catch {}
    }
    const delimiter = raw.includes("\n") ? "\n" : ",";
    this.#parsedOptions = raw.split(delimiter).map((s) => s.trim()).filter(Boolean);
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
      seg.setAttribute("value", opt);
      seg.textContent = opt;
      if (currentValue === opt) {
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
      option.value = opt;
      option.textContent = opt;
      if (currentValue === opt) option.selected = true;
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
