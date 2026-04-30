/**
 * FigUI3 Lab — Experimental components
 *
 * These components are unstable and may change or be removed without notice.
 * Import alongside fig.js for opt-in access:
 *
 *   <script src="fig.js"></script>
 *   <script src="fig-lab.js"></script>
 */

/* Field + Slider wrapper */
class FigFieldSlider extends HTMLElement {
  #field = null;
  #label = null;
  #slider = null;
  #observer = null;
  #managedSliderAttrs = new Set();
  #steppersSyncFrame = 0;
  #boundHandleSliderInput = null;
  #boundHandleSliderChange = null;
  #ignoredSliderAttrs = new Set(["variant", "color", "text", "full"]);

  static get observedAttributes() {
    return ["label", "direction"];
  }

  connectedCallback() {
    if (!this.#field) {
      this.#initialize();
    }

    this.#syncField();
    this.#syncSliderAttributes();
    this.#bindSliderEvents();

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncField = false;
        let syncSlider = false;

        for (const mutation of mutations) {
          if (mutation.type === "attributes") {
            if (
              mutation.attributeName &&
              this.#ignoredSliderAttrs.has(mutation.attributeName)
            ) {
              continue;
            }
            if (
              mutation.attributeName === "label" ||
              mutation.attributeName === "direction"
            ) {
              syncField = true;
            } else {
              syncSlider = true;
            }
          }
        }

        if (syncField) this.#syncField();
        if (syncSlider) this.#syncSliderAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    if (this.#steppersSyncFrame) {
      cancelAnimationFrame(this.#steppersSyncFrame);
      this.#steppersSyncFrame = 0;
    }
    this.#unbindSliderEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "label" || name === "direction") {
      this.#syncField();
    }
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter((node) => {
      return (
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())
      );
    });

    const field = document.createElement("fig-field");
    const label = document.createElement("label");
    const slider = document.createElement("fig-slider");
    slider.setAttribute("text", "true");
    for (const attrName of this.#getForwardedSliderAttrNames()) {
      const value = this.getAttribute(attrName);
      slider.setAttribute(attrName, value ?? "");
    }

    field.append(label, slider);

    this.#field = field;
    this.#label = label;
    this.#slider = slider;

    this.replaceChildren(field);

    for (const node of initialChildren) {
      this.#slider.appendChild(node);
    }
  }

  #syncField() {
    if (!this.#field || !this.#label) return;
    const hasLabelAttr = this.hasAttribute("label");
    const rawLabel = this.getAttribute("label");
    const isBlankLabel = hasLabelAttr && (rawLabel ?? "").trim() === "";

    if (isBlankLabel) {
      if (this.#label.parentElement === this.#field) {
        this.#label.remove();
      }
    } else {
      this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      if (this.#label.parentElement !== this.#field) {
        this.#field.prepend(this.#label);
      }
    }

    this.#field.setAttribute(
      "direction",
      this.getAttribute("direction") || "horizontal",
    );
  }

  #syncSliderAttributes() {
    if (!this.#slider) return;
    const hostAttrs = this.#getForwardedSliderAttrNames();

    const nextManaged = new Set(hostAttrs.filter((name) => name !== "text"));

    for (const attrName of this.#managedSliderAttrs) {
      if (!nextManaged.has(attrName)) {
        this.#slider.removeAttribute(attrName);
      }
    }

    for (const attrName of hostAttrs) {
      if (attrName === "text") continue;
      const value = this.getAttribute(attrName);
      this.#slider.setAttribute(attrName, value ?? "");
    }

    this.#slider.removeAttribute("variant");
    this.#slider.removeAttribute("color");
    this.#slider.removeAttribute("transform");
    this.#slider.removeAttribute("full");
    this.#slider.setAttribute("text", "true");

    const sliderType = (this.getAttribute("type") || "range").toLowerCase();
    if (sliderType === "delta" || sliderType === "stepper") {
      this.#slider.setAttribute(
        "default",
        this.getAttribute("default") ?? "50",
      );
    } else if (!this.hasAttribute("default")) {
      this.#slider.removeAttribute("default");
    }
    if (sliderType === "stepper") {
      this.#slider.setAttribute("step", this.getAttribute("step") ?? "10");
    } else if (!this.hasAttribute("step")) {
      this.#slider.removeAttribute("step");
    }
    if (sliderType === "opacity") {
      this.#slider.style.setProperty(
        "--color",
        "var(--figma-color-bg-tertiary)",
      );
    } else {
      this.#slider.style.removeProperty("--color");
    }

    this.#managedSliderAttrs = nextManaged;
    this.#queueSteppersSync();
  }

  #getForwardedSliderAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "steppers",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !this.#ignoredSliderAttrs.has(name),
    );
  }

  #queueSteppersSync() {
    if (this.#steppersSyncFrame) {
      cancelAnimationFrame(this.#steppersSyncFrame);
    }
    this.#steppersSyncFrame = requestAnimationFrame(() => {
      this.#steppersSyncFrame = 0;
      this.#syncSteppersToNumberInput();
    });
  }

  #syncSteppersToNumberInput() {
    if (!this.#slider) return;
    const numberInput = this.#slider.querySelector("fig-input-number");
    if (!numberInput) return;

    const hasSteppers =
      this.hasAttribute("steppers") &&
      this.getAttribute("steppers") !== "false";
    if (!hasSteppers) {
      numberInput.removeAttribute("steppers");
      return;
    }

    const steppersValue = this.getAttribute("steppers");
    numberInput.setAttribute("steppers", steppersValue ?? "");
  }

  #bindSliderEvents() {
    if (!this.#slider) return;
    if (!this.#boundHandleSliderInput) {
      this.#boundHandleSliderInput = this.#forwardSliderEvent.bind(
        this,
        "input",
      );
    }
    if (!this.#boundHandleSliderChange) {
      this.#boundHandleSliderChange = this.#forwardSliderEvent.bind(
        this,
        "change",
      );
    }
    this.#slider.addEventListener("input", this.#boundHandleSliderInput);
    this.#slider.addEventListener("change", this.#boundHandleSliderChange);
  }

  #unbindSliderEvents() {
    if (!this.#slider) return;
    if (this.#boundHandleSliderInput) {
      this.#slider.removeEventListener("input", this.#boundHandleSliderInput);
    }
    if (this.#boundHandleSliderChange) {
      this.#slider.removeEventListener("change", this.#boundHandleSliderChange);
    }
  }

  #forwardSliderEvent(type, event) {
    event.stopPropagation();
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : this.#slider?.value;
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }
}
customElements.define("fig-field-slider", FigFieldSlider);

