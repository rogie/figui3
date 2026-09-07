/**
 * FigUI3 Lab — Experimental components
 * Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE.
 *
 * These components are unstable and may change or be removed without notice.
 * Import alongside fig.js for opt-in access:
 *
 *   <script src="fig.js"></script>
 *   <script src="fig-lab.js"></script>
 */

function figLabDefineElement(name, constructor) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

function figLabBooleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

const FIG_LAB_SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function figLabAppendChildren(parent, children) {
  const append = (child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(append);
      return;
    }
    parent.append(child instanceof Node ? child : String(child));
  };
  append(children);
  return parent;
}

function figLabSetAttributes(element, attributes = {}) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "className") {
      if (element.namespaceURI === FIG_LAB_SVG_NAMESPACE) {
        element.setAttribute("class", String(value));
      } else {
        element.className = String(value);
      }
    } else if (value === true) {
      element.setAttribute(name, "");
    } else {
      element.setAttribute(name, String(value));
    }
  }
  return element;
}

function figLabCreateElement(tagName, attributes, children) {
  const element = document.createElement(tagName);
  figLabSetAttributes(element, attributes);
  return figLabAppendChildren(element, children);
}

function figLabCreateSvgElement(tagName, attributes, children) {
  const element = document.createElementNS(FIG_LAB_SVG_NAMESPACE, tagName);
  figLabSetAttributes(element, attributes);
  return figLabAppendChildren(element, children);
}

function figLabSyncDisabledControls(host, controls) {
  const disabled = figLabBooleanAttribute(host, "disabled");
  for (const control of controls) {
    control?.toggleAttribute("disabled", disabled);
  }
}

function figLabColorEventAliases(color, alpha, opacity) {
  const numericAlpha = Number(alpha);
  const numericOpacity = Number(opacity);
  const normalizedAlpha = Number.isFinite(numericAlpha)
    ? Math.max(0, Math.min(1, numericAlpha))
    : Number.isFinite(numericOpacity)
      ? Math.max(0, Math.min(100, numericOpacity)) / 100
      : 1;
  const normalizedOpacity = Number.isFinite(numericOpacity)
    ? Math.max(0, Math.min(100, numericOpacity))
    : Math.round(normalizedAlpha * 100);
  return { color, alpha: normalizedAlpha, opacity: normalizedOpacity };
}

const figLabPropskitResetMenus = new WeakMap();

function figLabConnectPropskitResetMenu(host) {
  let state = figLabPropskitResetMenus.get(host);
  if (!state) {
    const menu = document.createElement("fig-menu");
    menu.setAttribute("position", "bottom left");
    menu.setAttribute("offset", "0 0");
    const resetItem = document.createElement("fig-menu-item");
    resetItem.setAttribute("value", "reset-default");
    resetItem.textContent = "Reset";
    menu.appendChild(resetItem);

    let fallbackTimer = 0;
    const clearPendingOpen = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = 0;
      }
      window.removeEventListener("pointerup", openMenu, true);
      window.removeEventListener("pointercancel", openMenu, true);
    };
    const openMenu = () => {
      clearPendingOpen();
      const point = state?.point;
      if (point) menu.showAt?.(point.x, point.y);
    };
    const handleContextMenu = (event) => {
      if (
        figLabBooleanAttribute(host, "disabled") ||
        event.target?.closest?.("fig-menu")
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      state.point = { x: event.clientX, y: event.clientY };
      clearPendingOpen();
      window.addEventListener("pointerup", openMenu, {
        once: true,
        capture: true,
      });
      window.addEventListener("pointercancel", openMenu, {
        once: true,
        capture: true,
      });
      fallbackTimer = window.setTimeout(openMenu, 180);
    };
    const handleChange = (event) => {
      event.stopPropagation();
      if (event.detail?.value === "reset-default") host.resetToDefault?.();
    };
    state = {
      menu,
      point: null,
      clearPendingOpen,
      handleContextMenu,
      handleChange,
    };
    figLabPropskitResetMenus.set(host, state);
  }

  if (state.menu.parentElement !== host) host.appendChild(state.menu);
  host.removeEventListener("contextmenu", state.handleContextMenu);
  host.addEventListener("contextmenu", state.handleContextMenu);
  state.menu.removeEventListener("change", state.handleChange);
  state.menu.addEventListener("change", state.handleChange);
}

function figLabDisconnectPropskitResetMenu(host) {
  const state = figLabPropskitResetMenus.get(host);
  if (!state) return;
  state.clearPendingOpen();
  host.removeEventListener("contextmenu", state.handleContextMenu);
  state.menu.removeEventListener("change", state.handleChange);
}

function figLabPropskitEventDetail(host, value = host.value) {
  const detail = {
    control: host.localName,
    value,
  };
  const name = host.getAttribute("name");
  if (name !== null && name !== "") detail.name = name;
  return detail;
}

function figLabDispatchPropskitEvent(
  host,
  type,
  value = host.value,
  additionalDetail = null,
) {
  const detail = figLabPropskitEventDetail(host, value);
  if (additionalDetail && typeof additionalDetail === "object") {
    Object.assign(detail, additionalDetail);
  }
  host.dispatchEvent(
    new CustomEvent(type, {
      detail,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}

function figLabFiniteNumberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function figLabEmitPropskitReset(host) {
  for (const type of ["input", "change"]) {
    figLabDispatchPropskitEvent(host, type);
  }
}

function figLabPropskitValuesEqual(value, defaultValue) {
  if (typeof value === "boolean" || typeof defaultValue === "boolean") {
    return Boolean(value) === Boolean(defaultValue);
  }
  return String(value ?? "") === String(defaultValue ?? "");
}

function figLabPropskitJsonValuesEqual(value, defaultValue) {
  const normalize = (input) => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") {
      return Object.keys(input)
        .sort()
        .reduce((result, key) => {
          result[key] = normalize(input[key]);
          return result;
        }, {});
    }
    return input;
  };

  try {
    const parsedValue = typeof value === "string" ? JSON.parse(value) : value;
    const parsedDefault =
      typeof defaultValue === "string" ? JSON.parse(defaultValue) : defaultValue;
    return (
      JSON.stringify(normalize(parsedValue)) ===
      JSON.stringify(normalize(parsedDefault))
    );
  } catch {
    return figLabPropskitValuesEqual(value, defaultValue);
  }
}

function figLabPerceivedColorTheme(context, color, darkTextThreshold = 0.179) {
  if (!context || !color) return null;
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;color:" + color;
  context.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const rawChannels = resolved.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  const channels = resolved.startsWith("rgb")
    ? rawChannels
    : resolved.startsWith("color(srgb") && rawChannels
      ? rawChannels.map((channel) => channel * 255)
      : null;
  if (!channels || channels.length < 3 || channels.some(Number.isNaN)) return null;
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance <= darkTextThreshold ? "light" : "dark";
}

/* Unique IDs for lab components such as propskit-group. */
let figLabUniqueIdCounter = 0;
function figLabUniqueId(prefix = "fig-lab") {
  figLabUniqueIdCounter += 1;
  return `${prefix}-${figLabUniqueIdCounter}`;
}

class FigLabPropskitElement extends HTMLElement {
  get name() {
    return this.getAttribute("name") ?? "";
  }

  set name(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("name");
    } else {
      this.setAttribute("name", String(value));
    }
  }
}

function figLabSyncPropskitLabel(
  host,
  surface,
  label,
  hasCustomLabel = false,
) {
  if (!surface || !label) return null;
  const hasLabelAttr = host.hasAttribute("label");
  const rawLabel = host.getAttribute("label") ?? "";
  const hidden = hasLabelAttr && rawLabel.trim() === "";

  if (!hasCustomLabel) {
    label.textContent = hasLabelAttr ? rawLabel : "Label";
  }

  host.toggleAttribute("data-label-empty", hidden);
  if (hidden) {
    label.remove();
    return null;
  }

  if (!label.id) label.id = figLabUniqueId(`${host.localName}-label`);
  if (label.parentElement !== surface) surface.prepend(label);
  return label.id;
}

function figLabSyncPropskitControlLabel(
  host,
  control,
  labelId,
  fallback = "Label",
) {
  if (!control) return;
  const explicitLabel = host.getAttribute("aria-label")?.trim();
  if (explicitLabel) {
    control.setAttribute("aria-label", explicitLabel);
    control.removeAttribute("aria-labelledby");
  } else if (labelId) {
    control.setAttribute("aria-labelledby", labelId);
    control.removeAttribute("aria-label");
  } else {
    control.setAttribute("aria-label", fallback);
    control.removeAttribute("aria-labelledby");
  }
}

/* Presentation-only composition surface for AI prompt controls. */
class FigAiPrompt extends HTMLElement {}
figLabDefineElement("fig-ai-prompt", FigAiPrompt);

/* Presentation-only open container for attachments and status rows above a prompt. */
class FigAiContext extends HTMLElement {}
figLabDefineElement("fig-ai-context", FigAiContext);

/* Presentation-only message surface for AI conversations. */
class FigChatMessage extends HTMLElement {}
figLabDefineElement("fig-chat-message", FigChatMessage);

/**
 * A removable image attachment for compact prompt surfaces.
 *
 * @attr {string} src - Image preview URL.
 * @attr {string} name - Attachment name used for the tooltip and image alt text.
 * @attr {string} value - Optional application-owned attachment identifier.
 * @attr {boolean|string} removable - "false" hides the remove button.
 * @attr {boolean|string} disabled - Disables removal.
 * @fires remove - Cancelable request for the owning application to remove the attachment.
 */
class FigAttachment extends HTMLElement {
  #tooltip = null;
  #image = null;
  #fallback = null;
  #removeTooltip = null;
  #removeButton = null;
  #mediaImage = null;
  #boundHandleRemove = this.#handleRemove.bind(this);
  #boundHandleImageLoad = this.#handleImageLoad.bind(this);
  #boundHandleImageError = this.#handleImageError.bind(this);

  static get observedAttributes() {
    return ["src", "name", "value", "removable", "disabled"];
  }

  connectedCallback() {
    if (!this.#image) this.#initialize();
    this.#removeButton.removeEventListener("click", this.#boundHandleRemove);
    this.#removeButton.addEventListener("click", this.#boundHandleRemove);
    this.#bindMediaImage();
    this.#sync();
  }

  disconnectedCallback() {
    this.#removeButton?.removeEventListener("click", this.#boundHandleRemove);
    this.#unbindMediaImage();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#image) return;
    this.#sync();
  }

  #initialize() {
    this.#tooltip = document.createElement("fig-tooltip");
    this.#tooltip.className = "fig-attachment-tooltip";

    this.#image = document.createElement("fig-image");
    this.#image.setAttribute("aspect-ratio", "1/1");
    this.#image.setAttribute("fit", "cover");
    this.#image.setAttribute("full", "");

    this.#fallback = document.createElement("span");
    this.#fallback.className = "fig-attachment-fallback";
    this.#fallback.setAttribute("aria-hidden", "true");

    this.#removeTooltip = document.createElement("fig-tooltip");
    this.#removeTooltip.className = "fig-attachment-remove-tooltip";
    this.#removeTooltip.setAttribute("text", "Remove attachment");

    this.#removeButton = document.createElement("fig-button");
    this.#removeButton.className = "fig-attachment-remove";
    this.#removeButton.setAttribute("variant", "overlay");
    this.#removeButton.setAttribute("size", "small");
    this.#removeButton.setAttribute("icon", "");
    const closeIcon = document.createElement("fig-icon");
    closeIcon.setAttribute("name", "close");
    closeIcon.setAttribute("size", "small");
    this.#removeButton.append(closeIcon);
    this.#removeTooltip.append(this.#removeButton);

    this.#image.append(this.#fallback);
    this.#tooltip.append(this.#image);
    this.replaceChildren(this.#tooltip, this.#removeTooltip);

    this.#removeButton.addEventListener("click", this.#boundHandleRemove);
    this.#bindMediaImage();
  }

  #bindMediaImage() {
    const mediaImage = this.#image?.mediaEl;
    if (!mediaImage || mediaImage === this.#mediaImage) return;
    this.#unbindMediaImage();
    this.#mediaImage = mediaImage;
    this.#mediaImage.addEventListener("load", this.#boundHandleImageLoad);
    this.#mediaImage.addEventListener("error", this.#boundHandleImageError);
  }

  #unbindMediaImage() {
    if (!this.#mediaImage) return;
    this.#mediaImage.removeEventListener("load", this.#boundHandleImageLoad);
    this.#mediaImage.removeEventListener("error", this.#boundHandleImageError);
    this.#mediaImage = null;
  }

  #sync() {
    const src = this.getAttribute("src") || "";
    const name = this.getAttribute("name") || "Attachment";
    const removable =
      !this.hasAttribute("removable") || figLabBooleanAttribute(this, "removable");
    const disabled = figLabBooleanAttribute(this, "disabled");

    this.#tooltip.setAttribute("text", name);
    this.#image.setAttribute("alt", name);
    if (src) {
      this.#image.setAttribute("src", src);
    } else {
      this.#image.removeAttribute("src");
    }
    this.#bindMediaImage();

    this.#fallback.textContent = this.#fallbackLabel(name);
    this.#removeButton.hidden = !removable;
    this.#removeButton.toggleAttribute("disabled", disabled);
    this.#removeButton.setAttribute("aria-label", `Remove ${name}`);
    this.toggleAttribute("data-fallback", !src);
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
    } else {
      this.removeAttribute("aria-disabled");
    }
  }

  #fallbackLabel(name) {
    const baseName = name.split(/[\\/]/).pop() || "";
    const dotIndex = baseName.lastIndexOf(".");
    const extension =
      dotIndex > 0 && dotIndex < baseName.length - 1
        ? baseName.slice(dotIndex + 1).toUpperCase()
        : "FILE";
    return extension.slice(0, 4);
  }

  #handleImageLoad() {
    if (this.getAttribute("src")) this.removeAttribute("data-fallback");
  }

  #handleImageError() {
    this.setAttribute("data-fallback", "");
  }

  #handleRemove(event) {
    event.stopPropagation();
    if (
      figLabBooleanAttribute(this, "disabled") ||
      (this.hasAttribute("removable") &&
        !figLabBooleanAttribute(this, "removable"))
    ) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("remove", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          value: this.getAttribute("value"),
          name: this.getAttribute("name") || "",
          src: this.getAttribute("src") || "",
          attachment: this,
        },
      }),
    );
  }
}
figLabDefineElement("fig-attachment", FigAttachment);

/* Wrapping presentation container for one or more attachments. */
class FigAttachments extends HTMLElement {
  #observer = null;

  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "list");
      this.setAttribute("data-generated-role", "");
    }
    this.#syncItems();
    if (!this.#observer) {
      this.#observer = new MutationObserver(() => this.#syncItems());
      this.#observer.observe(this, { childList: true });
    }
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  #syncItems() {
    for (const attachment of this.querySelectorAll(":scope > fig-attachment")) {
      if (!attachment.hasAttribute("role")) {
        attachment.setAttribute("role", "listitem");
        attachment.setAttribute("data-generated-role", "");
      }
    }
  }
}
figLabDefineElement("fig-attachments", FigAttachments);

/* PropsKit switch surface */
class PropskitSwitch extends FigLabPropskitElement {
  #surface = null;
  #label = null;
  #switch = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedSwitchAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #initialChecked = false;

  static get observedAttributes() {
    return ["label", "aria-label", "variant"];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncSurface();
    this.#syncSwitchAttributes();
    this.#bindSwitchEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncSurface = false;
        let syncSwitch = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "aria-label"
          ) {
            syncSurface = true;
          } else {
            syncSwitch = true;
          }
        }

        if (syncSurface) this.#syncSurface();
        if (syncSwitch) this.#syncSwitchAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindSwitchEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "variant") {
      this.#syncSwitchAttributes();
    } else if (name === "label" || name === "aria-label") {
      this.#syncSurface();
    }
  }

  #initialize() {
    this.#initialChecked = figLabBooleanAttribute(this, "checked");
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const surface = figLabCreateElement("div", {
      className: "propskit-switch-surface",
    });
    const label = customLabel || document.createElement("label");
    surface.append(label);
    this.#surface = surface;
    this.#label = label;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);
    this.#ensureSwitchControl();
  }

  #controlVariant() {
    return this.getAttribute("variant") === "segmented-control"
      ? "segmented-control"
      : "switch";
  }

  #ensureSwitchControl() {
    const tagName =
      this.#controlVariant() === "segmented-control"
        ? "fig-segmented-control"
        : "fig-switch";
    if (this.#switch?.localName === tagName) return;

    this.#unbindSwitchEvents();
    this.#switch?.remove();

    const switchControl = document.createElement(tagName);
    if (tagName === "fig-segmented-control") {
      const offSegment = document.createElement("fig-segment");
      const onSegment = document.createElement("fig-segment");
      switchControl.setAttribute("sizing", "equal");
      offSegment.setAttribute("value", "off");
      offSegment.textContent = "Off";
      onSegment.setAttribute("value", "on");
      onSegment.textContent = "On";
      switchControl.append(offSegment, onSegment);
    }

    this.#switch = switchControl;
    this.#managedSwitchAttrs.clear();
    this.#surface?.append(switchControl);
    if (this.isConnected) this.#bindSwitchEvents();
  }

  #syncSurface() {
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#switch, labelId, "Switch");
    if (this.#switch?.localName === "fig-switch" && this.#switch.input) {
      figLabSyncPropskitControlLabel(
        this,
        this.#switch.input,
        labelId,
        "Switch",
      );
    }
  }

  #getForwardedSwitchAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "size",
      "aria-label",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "checked",
      "value",
      "default",
      "variant",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncSwitchAttributes() {
    this.#ensureSwitchControl();
    if (!this.#switch) return;
    const switchAttrs = this.#getForwardedSwitchAttrNames();
    const nextManaged = new Set(switchAttrs);

    for (const attrName of this.#managedSwitchAttrs) {
      if (!nextManaged.has(attrName)) this.#switch.removeAttribute(attrName);
    }
    for (const attrName of switchAttrs) {
      this.#switch.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    const checked = figLabBooleanAttribute(this, "checked");
    if (this.#switch.localName === "fig-switch") {
      this.#switch.checked = checked;
      this.#switch.value = checked ? "on" : "off";
    } else {
      this.#switch.setAttribute("value", checked ? "on" : "off");
    }
    this.#managedSwitchAttrs = nextManaged;
    this.#syncSurface();
  }

  #bindSwitchEvents() {
    if (!this.#switch) return;
    this.#boundHandleInput ??= this.#forwardSwitchEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardSwitchEvent.bind(this, "change");
    this.#switch.addEventListener("input", this.#boundHandleInput);
    this.#switch.addEventListener("change", this.#boundHandleChange);
  }

  #unbindSwitchEvents() {
    if (!this.#switch) return;
    if (this.#boundHandleInput) {
      this.#switch.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#switch.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #forwardSwitchEvent(type, event) {
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const checked =
      this.#switch?.localName === "fig-switch"
        ? Boolean(this.#switch.checked)
        : this.#switch?.value === "on";
    this.toggleAttribute("checked", checked);
    figLabDispatchPropskitEvent(this, type);
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-switch, fig-segmented-control, fig-menu")
    ) {
      return;
    }
    if (this.#switch?.localName === "fig-switch") {
      this.#switch.click();
    } else {
      const value = this.#switch?.value === "on" ? "off" : "on";
      this.#switch?.querySelector(`fig-segment[value="${value}"]`)?.click();
    }
  }

  get checked() {
    if (!this.#switch) return figLabBooleanAttribute(this, "checked");
    return this.#switch.localName === "fig-switch"
      ? Boolean(this.#switch.checked)
      : this.#switch.value === "on";
  }

  set checked(nextChecked) {
    const checked = Boolean(nextChecked);
    this.toggleAttribute("checked", checked);
    if (!this.#switch) return;
    if (this.#switch.localName === "fig-switch") {
      this.#switch.checked = checked;
      this.#switch.value = checked ? "on" : "off";
    } else {
      this.#switch.value = checked ? "on" : "off";
    }
  }

  get value() {
    return this.checked;
  }

  set value(nextValue) {
    const checked =
      typeof nextValue === "string"
        ? !["", "false", "off", "0"].includes(nextValue.trim().toLowerCase())
        : Boolean(nextValue);
    this.checked = checked;
  }

  get defaultValue() {
    return this.hasAttribute("default")
      ? figLabBooleanAttribute(this, "default")
      : this.#initialChecked;
  }

  get isDefault() {
    return this.checked === this.defaultValue;
  }

  resetToDefault() {
    const checked = this.defaultValue;
    this.checked = checked;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    if (this.#switch?.localName === "fig-switch") {
      this.#switch.focus(options);
    } else {
      const selected =
        this.#switch?.querySelector("fig-segment[selected]") ||
        this.#switch?.querySelector("fig-segment");
      selected?.focus(options);
    }
  }
}
figLabDefineElement("propskit-switch", PropskitSwitch);

function figLabParseSolidColor(raw) {
  const value = String(raw ?? "").trim();
  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    return {
      color: value.slice(0, 7),
      alpha: parseInt(value.slice(7, 9), 16) / 255,
    };
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return { color: value, alpha: 1 };
  }
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return {
      color: `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`,
      alpha: 1,
    };
  }
  return { color: value || "#D9D9D9", alpha: 1 };
}

function figLabSolidFillValue(raw) {
  const { color, alpha } = figLabParseSolidColor(raw);
  return JSON.stringify({ type: "solid", color, alpha });
}

function figLabCssUrl(url) {
  return `url("${String(url).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function figLabLooksLikeVideoUrl(raw) {
  const text = String(raw ?? "").trim();
  if (!text || text.startsWith("{") || text.startsWith("#")) return false;
  if (text.startsWith("data:video/")) return true;
  try {
    const path = new URL(text, "https://fig.local").pathname;
    return /\.(mp4|webm|mov|m4v|ogv)$/i.test(path);
  } catch {
    return /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(text);
  }
}

function figLabVideoFillFromUrl(url) {
  return {
    type: "video",
    video: { url, scaleMode: "fill", scale: 50 },
  };
}

function figLabParseFillValue(raw) {
  if (raw && typeof raw === "object") return raw;
  const text = String(raw ?? "").trim();
  if (!text) return { type: "solid", color: "#D9D9D9", alpha: 1 };
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  if (text.startsWith("#")) {
    const { color, alpha } = figLabParseSolidColor(text);
    return { type: "solid", color, alpha };
  }
  if (figLabLooksLikeVideoUrl(text)) return figLabVideoFillFromUrl(text);
  return { type: "solid", color: "#D9D9D9", alpha: 1 };
}

function figLabSerializeFillValue(fill) {
  if (fill == null) return "";
  return typeof fill === "string" ? fill : JSON.stringify(fill);
}

function figLabGradientCss(gradient) {
  if (!gradient) return "";
  const stops = [...(gradient.stops || [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((stop) => `${stop.color} ${stop.position ?? 0}%`)
    .join(", ");
  if (!stops) return "";
  switch (gradient.type) {
    case "radial":
      return `radial-gradient(circle, ${stops})`;
    case "angular":
      return `conic-gradient(from ${gradient.angle || 0}deg, ${stops})`;
    default:
      return `linear-gradient(${gradient.angle ?? 180}deg, ${stops})`;
  }
}

function figLabFillSwatchBackground(fill, slot) {
  switch (fill?.type) {
    case "solid":
      return fill.color || "";
    case "gradient":
      return fill.css || figLabGradientCss(fill.gradient) || "";
    case "image":
      return fill.image?.url ? figLabCssUrl(fill.image.url) : "";
    case "video":
      return fill.video?.poster ? figLabCssUrl(fill.video.poster) : "";
    case "webcam":
      return fill.webcam?.snapshot ? figLabCssUrl(fill.webcam.snapshot) : "";
    default:
      return (
        fill?.swatchBackground ||
        fill?.background ||
        fill?.css ||
        slot?.getAttribute("swatch-background") ||
        ""
      );
  }
}

function figLabFillSwatchMedia(fill) {
  if (!fill || typeof fill !== "object") return null;
  if (fill.type === "image") return fill.image;
  if (fill.type === "video") return fill.video;
  if (fill.type === "webcam") return fill.webcam;
  return null;
}

function figLabFillSwatchSizing(fill) {
  const media = figLabFillSwatchMedia(fill);
  const scale = Number(media?.scale);
  switch (media?.scaleMode) {
    case "fit":
      return { size: "contain", position: "center" };
    case "tile":
      return {
        size: `${Number.isFinite(scale) ? scale : 50}%`,
        position: "top left",
      };
    case "fill":
    case "crop":
      return { size: "cover", position: "center" };
    default:
      return fill?.type === "webcam" || fill?.type === "image" || fill?.type === "video"
        ? { size: "cover", position: "center" }
        : null;
  }
}

function figLabFillSwatchAlpha(fill) {
  switch (fill?.type) {
    case "solid": {
      if (Number.isFinite(fill.alpha)) return fill.alpha;
      if (Number.isFinite(fill.opacity)) return fill.opacity / 100;
      return 1;
    }
    case "gradient":
      return fill.gradient?.opacity ?? fill.opacity ?? 1;
    case "image":
      return fill.image?.opacity ?? 1;
    case "video":
      return fill.video?.opacity ?? 1;
    case "webcam":
      return fill.webcam?.opacity ?? 1;
    default:
      return fill?.opacity ?? fill?.alpha ?? 1;
  }
}

/* PropsKit color surface */
class PropskitColor extends FigLabPropskitElement {
  #surface = null;
  #label = null;
  #input = null;
  #swatch = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #initialValue = null;

  static get observedAttributes() {
    return ["label", "aria-label"];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncSurface();
    this.#syncInputAttributes();
    this.#bindInputEvents();
    if (this.#initialValue === null) {
      this.#initialValue =
        this.getAttribute("default") ?? this.getAttribute("value") ?? "";
    }
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncSurface = false;
        let syncInput = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "aria-label"
          ) {
            syncSurface = true;
          } else if (mutation.attributeName === "direction") {
            continue;
          } else {
            syncInput = true;
          }
        }

        if (syncSurface) this.#syncSurface();
        if (syncInput) this.#syncInputAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "label" || name === "aria-label") {
      this.#syncSurface();
    }
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const surface = figLabCreateElement("div", {
      className: "propskit-color-surface",
    });
    const label = customLabel || document.createElement("label");
    const picker = document.createElement("fig-fill-picker");
    const swatch = document.createElement("fig-swatch");
    picker.anchorElement = this;
    picker.append(swatch);
    swatch.setAttribute("tabindex", "0");
    for (const node of initialChildren) {
      if (node !== customLabel) picker.appendChild(node);
    }
    surface.append(label, picker);
    this.#surface = surface;
    this.#label = label;
    this.#input = picker;
    this.#swatch = swatch;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);
  }

  #syncSurface() {
    if (!this.#surface || !this.#label || !this.#input) return;
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#input, labelId, "Color");
  }

  #parsedHostColor() {
    return figLabParseSolidColor(this.getAttribute("value"));
  }

  #pickerValueFromHost() {
    const { color, alpha } = this.#parsedHostColor();
    return JSON.stringify({ type: "solid", color, alpha });
  }

  #getForwardedInputAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "size",
      "aria-label",
      "text",
      "default",
      "value",
      "mode",
      "variant",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncInputAttributes() {
    if (!this.#input) return;
    const inputAttrs = this.#getForwardedInputAttrNames();
    const nextManaged = new Set(inputAttrs);

    for (const attrName of this.#managedInputAttrs) {
      if (!nextManaged.has(attrName)) this.#input.removeAttribute(attrName);
    }
    for (const attrName of inputAttrs) {
      this.#input.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    this.#input.setAttribute("mode", "solid");
    const nextJson = this.#pickerValueFromHost();
    if (this.#input.getAttribute("value") !== nextJson) {
      this.#input.setAttribute("value", nextJson);
    }
    const { color, alpha } = this.#parsedHostColor();
    if (this.#swatch) {
      this.#swatch.setAttribute("background", color);
      this.#swatch.setAttribute("alpha", String(alpha));
    }
    this.#managedInputAttrs = nextManaged;
  }

  #bindInputEvents() {
    if (!this.#input) return;
    this.#boundHandleInput ??= this.#forwardInputEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardInputEvent.bind(this, "change");
    this.#input.addEventListener("input", this.#boundHandleInput);
    this.#input.addEventListener("change", this.#boundHandleChange);
  }

  #unbindInputEvents() {
    if (!this.#input) return;
    if (this.#boundHandleInput) {
      this.#input.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#input.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #valueFromColorEvent(event) {
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : undefined;
    if (typeof detail === "string" && detail) {
      return figLabParseSolidColor(detail).color;
    }
    if (detail && typeof detail === "object") {
      if (typeof detail.color === "string" && detail.color) return detail.color;
      if (typeof detail.value === "string" && detail.value) {
        return figLabParseSolidColor(detail.value).color;
      }
      if (typeof detail.hex === "string" && detail.hex) return detail.hex;
    }
    const live = this.#input?.value;
    if (live && typeof live === "object" && typeof live.color === "string") {
      return live.color;
    }
    if (typeof live === "string" && live) {
      return figLabParseSolidColor(live).color;
    }
    return this.#parsedHostColor().color;
  }

  #colorDetailFromEvent(event, color) {
    const detail =
      event instanceof CustomEvent && event.detail && typeof event.detail === "object"
        ? event.detail
        : undefined;
    const alpha = Number.isFinite(detail?.alpha)
      ? Math.max(0, Math.min(1, Number(detail.alpha)))
      : this.#parsedHostColor().alpha;
    return {
      color,
      alpha,
      opacity: Math.round(alpha * 100),
    };
  }

  #forwardInputEvent(type, event) {
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.#valueFromColorEvent(event);
    const detail = this.#colorDetailFromEvent(event, value);
    const alphaHex =
      detail.alpha < 1 - 1 / 255
        ? Math.round(detail.alpha * 255)
            .toString(16)
            .padStart(2, "0")
        : "";
    const hostValue = `${detail.color.slice(0, 7)}${alphaHex}`;
    this.setAttribute("value", hostValue);
    const nextJson = this.#pickerValueFromHost();
    if (this.#input && this.#input.getAttribute("value") !== nextJson) {
      this.#input.setAttribute("value", nextJson);
    }
    if (this.#swatch) {
      this.#swatch.setAttribute("background", detail.color);
      this.#swatch.setAttribute("alpha", String(detail.alpha));
    }
    figLabDispatchPropskitEvent(this, type);
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (event.target instanceof Element && event.target.closest("fig-menu")) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("fig-fill-picker, fig-swatch")
    ) {
      return;
    }
    this.focus();
    this.#input?.open?.();
  }

  get value() {
    return this.getAttribute("value") ?? this.#input?.value ?? this.#input?.getAttribute("value") ?? "";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      this.#input?.removeAttribute("value");
      return;
    }
    const next = String(nextValue);
    this.setAttribute("value", next);
    this.#forceInputValue(next);
  }

  /** Force fill-picker refresh even when the serialized value is unchanged. */
  #forceInputValue(next) {
    if (!this.#input) return;
    const json = figLabSolidFillValue(next);
    if (this.#input.getAttribute("value") === json) {
      this.#input.removeAttribute("value");
    }
    this.#input.setAttribute("value", json);
    if (this.#swatch) {
      const parsed = figLabParseSolidColor(next);
      this.#swatch.setAttribute("background", parsed.color);
      this.#swatch.setAttribute("alpha", String(parsed.alpha));
    }
  }

  #defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "";
  }

  get defaultValue() {
    return String(this.#defaultValue());
  }

  get isDefault() {
    return figLabPropskitValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    const next = this.defaultValue;
    this.setAttribute("value", next);
    this.#forceInputValue(next);
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    const swatch = this.querySelector("fig-swatch");
    if (swatch instanceof HTMLElement) swatch.focus(options);
  }
}
figLabDefineElement("propskit-color", PropskitColor);

/* PropsKit fill surface — color-style swatch that opens the full fill picker */
class PropskitFill extends FigLabPropskitElement {
  #surface = null;
  #label = null;
  #input = null;
  #swatch = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #initialValue = null;

  static get observedAttributes() {
    return ["label", "aria-label"];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncSurface();
    this.#syncInputAttributes();
    this.#bindInputEvents();
    if (this.#initialValue === null) {
      this.#initialValue =
        this.getAttribute("default") ?? this.getAttribute("value") ?? "";
    }
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncSurface = false;
        let syncInput = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "aria-label"
          ) {
            syncSurface = true;
          } else if (mutation.attributeName === "direction") {
            continue;
          } else {
            syncInput = true;
          }
        }

        if (syncSurface) this.#syncSurface();
        if (syncInput) this.#syncInputAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "label" || name === "aria-label") {
      this.#syncSurface();
    }
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const surface = figLabCreateElement("div", {
      className: "propskit-fill-surface",
    });
    const label = customLabel || document.createElement("label");
    const picker = document.createElement("fig-fill-picker");
    const swatch = document.createElement("fig-swatch");
    picker.anchorElement = this;
    picker.append(swatch);
    swatch.setAttribute("tabindex", "0");
    for (const node of initialChildren) {
      if (node !== customLabel) picker.appendChild(node);
    }
    surface.append(label, picker);
    this.#surface = surface;
    this.#label = label;
    this.#input = picker;
    this.#swatch = swatch;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);
  }

  #syncSurface() {
    if (!this.#surface || !this.#label || !this.#input) return;
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#input, labelId, "Fill");
  }

  #parsedHostFill() {
    return figLabParseFillValue(this.getAttribute("value"));
  }

  #pickerValueFromHost() {
    return figLabSerializeFillValue(this.#parsedHostFill());
  }

  #customModeSlot() {
    const type = this.#parsedHostFill()?.type;
    if (!type) return null;
    return this.querySelector(`[slot="mode-${type}"]`);
  }

  #livePickerFill() {
    const live = this.#input?.value;
    if (live && typeof live === "object") return live;
    if (typeof live === "string" && live) return figLabParseFillValue(live);
    return null;
  }

  #captureFill(fill) {
    const live = this.#livePickerFill();
    if (!fill || typeof fill !== "object") return fill;
    if (fill.type !== "webcam") return fill;
    const snapshot = fill.webcam?.snapshot || live?.webcam?.snapshot;
    if (!snapshot || fill.webcam?.snapshot) return fill;
    return {
      ...fill,
      webcam: {
        ...(live?.webcam && typeof live.webcam === "object" ? live.webcam : {}),
        ...fill.webcam,
        snapshot,
      },
    };
  }

  #syncSwatch(fill = this.#parsedHostFill()) {
    if (!this.#swatch) return;
    const next = this.#captureFill(fill);
    let background = figLabFillSwatchBackground(next, this.#customModeSlot());
    if (!background) {
      background = figLabFillSwatchBackground(
        this.#livePickerFill(),
        this.#customModeSlot(),
      );
    }
    if (!background) {
      const painted = this.#swatch.getAttribute("background") ?? "";
      if (painted.startsWith("url(")) background = painted;
    }
    this.#swatch.setAttribute("background", background);
    this.#swatch.setAttribute("alpha", String(figLabFillSwatchAlpha(next)));
    const sizing = figLabFillSwatchSizing(next || fill);
    if (sizing) {
      this.#swatch.style.setProperty("--swatch-bg-size", sizing.size);
      this.#swatch.style.setProperty("--swatch-bg-position", sizing.position);
    }
  }

  #getForwardedInputAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "size",
      "aria-label",
      "text",
      "default",
      "value",
      "variant",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncInputAttributes() {
    if (!this.#input) return;
    const inputAttrs = this.#getForwardedInputAttrNames();
    const nextManaged = new Set(inputAttrs);

    for (const attrName of this.#managedInputAttrs) {
      if (!nextManaged.has(attrName)) this.#input.removeAttribute(attrName);
    }
    for (const attrName of inputAttrs) {
      this.#input.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    const nextJson = this.#pickerValueFromHost();
    if (this.#input.getAttribute("value") !== nextJson) {
      this.#input.setAttribute("value", nextJson);
    }
    this.#syncSwatch();
    this.#managedInputAttrs = nextManaged;
  }

  #bindInputEvents() {
    if (!this.#input) return;
    this.#boundHandleInput ??= this.#forwardInputEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardInputEvent.bind(this, "change");
    this.#input.addEventListener("input", this.#boundHandleInput);
    this.#input.addEventListener("change", this.#boundHandleChange);
  }

  #unbindInputEvents() {
    if (!this.#input) return;
    if (this.#boundHandleInput) {
      this.#input.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#input.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #fillFromEvent(event) {
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : undefined;
    if (detail && typeof detail === "object") return detail;
    if (typeof detail === "string" && detail) {
      return figLabParseFillValue(detail);
    }
    const live = this.#input?.value;
    if (live && typeof live === "object") return live;
    if (typeof live === "string" && live) return figLabParseFillValue(live);
    return this.#parsedHostFill();
  }

  #forwardInputEvent(type, event) {
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const fill = this.#captureFill(this.#fillFromEvent(event));
    const serialized = figLabSerializeFillValue(fill);
    this.setAttribute("value", serialized);
    if (this.#input && this.#input.getAttribute("value") !== serialized) {
      this.#input.setAttribute("value", serialized);
    }
    this.#syncSwatch(fill);
    figLabDispatchPropskitEvent(this, type);
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (event.target instanceof Element && event.target.closest("fig-menu")) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("fig-fill-picker, fig-swatch")
    ) {
      return;
    }
    this.focus();
    this.#input?.open?.();
  }

  get value() {
    return (
      this.getAttribute("value") ??
      figLabSerializeFillValue(this.#input?.value) ??
      ""
    );
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      this.#input?.removeAttribute("value");
      this.#syncSwatch({ type: "solid", color: "", alpha: 1 });
      return;
    }
    const serialized = figLabSerializeFillValue(
      typeof nextValue === "string" ? figLabParseFillValue(nextValue) : nextValue,
    );
    this.setAttribute("value", serialized);
    this.#forceInputValue(serialized);
  }

  #forceInputValue(next) {
    if (!this.#input) return;
    const json = figLabSerializeFillValue(figLabParseFillValue(next));
    if (this.#input.getAttribute("value") === json) {
      this.#input.removeAttribute("value");
    }
    this.#input.setAttribute("value", json);
    this.#syncSwatch(figLabParseFillValue(json));
  }

  #defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "";
  }

  get defaultValue() {
    return String(this.#defaultValue());
  }

  get isDefault() {
    return figLabPropskitJsonValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    const next = this.defaultValue;
    this.setAttribute("value", next);
    this.#forceInputValue(next);
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    const swatch = this.querySelector("fig-swatch");
    if (swatch instanceof HTMLElement) swatch.focus(options);
  }
}
figLabDefineElement("propskit-fill", PropskitFill);

/* PropsKit gradient surface */
class PropskitGradient extends FigLabPropskitElement {
  #surface = null;
  #label = null;
  #input = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #initialValue = null;

  static get observedAttributes() {
    return ["label", "aria-label"];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncSurface();
    this.#syncInputAttributes();
    this.#bindInputEvents();
    if (this.#initialValue === null) {
      this.#initialValue =
        this.getAttribute("default") ??
        this.getAttribute("value") ??
        JSON.stringify(this.#input?.value ?? {});
    }
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncSurface = false;
        let syncInput = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "aria-label"
          ) {
            syncSurface = true;
          } else if (mutation.attributeName === "direction") {
            continue;
          } else {
            syncInput = true;
          }
        }

        if (syncSurface) this.#syncSurface();
        if (syncInput) this.#syncInputAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "label" || name === "aria-label") {
      this.#syncSurface();
    }
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const surface = figLabCreateElement("div", {
      className: "propskit-gradient-surface",
    });
    const label = customLabel || document.createElement("label");
    const input = document.createElement("fig-input-gradient");
    input.anchorElement = this;

    surface.append(label, input);
    this.#surface = surface;
    this.#label = label;
    this.#input = input;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);
  }

  #syncSurface() {
    if (!this.#surface || !this.#label || !this.#input) return;
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#input, labelId, "Gradient");
  }

  #getForwardedInputAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "size",
      "aria-label",
      "default",
      "variant",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncInputAttributes() {
    if (!this.#input) return;
    const inputAttrs = this.#getForwardedInputAttrNames();
    const nextManaged = new Set(inputAttrs);

    for (const attrName of this.#managedInputAttrs) {
      if (!nextManaged.has(attrName)) this.#input.removeAttribute(attrName);
    }
    for (const attrName of inputAttrs) {
      const next = this.getAttribute(attrName) ?? "";
      if (
        attrName === "value" &&
        this.#input.getAttribute("value") === next
      ) {
        continue;
      }
      this.#input.setAttribute(attrName, next);
    }

    if (!this.hasAttribute("edit")) this.#input.setAttribute("edit", "picker");
    this.#managedInputAttrs = nextManaged;
  }

  #bindInputEvents() {
    if (!this.#input) return;
    this.#boundHandleInput ??= this.#forwardInputEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardInputEvent.bind(this, "change");
    this.#input.addEventListener("input", this.#boundHandleInput);
    this.#input.addEventListener("change", this.#boundHandleChange);
  }

  #unbindInputEvents() {
    if (!this.#input) return;
    if (this.#boundHandleInput) {
      this.#input.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#input.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #valueFromGradientEvent(event) {
    const detail =
      event instanceof CustomEvent && event.detail && typeof event.detail === "object"
        ? event.detail
        : this.#input?.value;
    if (!detail || typeof detail !== "object") return this.value;
    return JSON.stringify(detail);
  }

  #forwardInputEvent(type, event) {
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.#valueFromGradientEvent(event);
    this.setAttribute("value", value);
    figLabDispatchPropskitEvent(this, type);
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (event.target instanceof Element && event.target.closest("fig-menu")) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-gradient, fig-fill-picker, fig-swatch")
    ) {
      return;
    }
    this.focus();
    this.#input?.querySelector?.("fig-fill-picker")?.open?.();
  }

  get value() {
    return (
      this.getAttribute("value") ??
      JSON.stringify(this.#input?.value ?? {})
    );
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      this.#input?.removeAttribute("value");
      return;
    }
    const next =
      typeof nextValue === "object" ? JSON.stringify(nextValue) : String(nextValue);
    this.setAttribute("value", next);
    if (this.#input && this.#input.getAttribute("value") !== next) {
      this.#input.setAttribute("value", next);
    }
  }

  get defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "";
  }

  get isDefault() {
    return figLabPropskitJsonValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    const next = this.defaultValue;
    if (!next) return;
    this.value = next;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    this.#input?.focus(options);
  }
}
figLabDefineElement("propskit-gradient", PropskitGradient);

/* PropsKit palette select surface */
class PropskitPalette extends FigLabPropskitElement {
  #surface = null;
  #label = null;
  #select = null;
  #palettes = [];
  #hasCustomLabel = false;
  #observer = null;
  #initialValue = [];
  #eventValue = undefined;
  #syncing = false;
  #syncVersion = 0;
  #buttonPreview = null;
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleOptionHover = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandlePointerDown = this.#handlePointerDown.bind(this);
  #closeGesture = false;

  static get observedAttributes() {
    return ["label", "aria-label", "options", "value", "disabled"];
  }

  connectedCallback() {
    if (!this.#surface) {
      this.#initialize();
      this.#initialValue = this.#clonePalette(this.value);
    }
    this.#syncSurface();
    this.#syncSelectAttributes();
    this.#bindSelectEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    this.removeEventListener("pointerdown", this.#boundHandlePointerDown, true);
    this.addEventListener("pointerdown", this.#boundHandlePointerDown, true);
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        if (
          mutations.some(
            ({ type, attributeName }) =>
              type === "attributes" &&
              attributeName &&
              !PropskitPalette.observedAttributes.includes(attributeName) &&
              ![
                "label",
                "name",
                "options",
                "value",
                "default",
                "size",
                "variant",
                "class",
                "style",
                "id",
              ].includes(attributeName) &&
              !attributeName.startsWith("data-"),
          )
        ) {
          this.#syncSelectAttributes();
        }
      });
    }
    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindSelectEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("pointerdown", this.#boundHandlePointerDown, true);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (this.#syncing && name === "value") return;
    if (name === "label" || name === "aria-label") {
      this.#syncSurface();
    } else if (name === "options") {
      this.#syncOptions();
    } else if (name === "value") {
      this.#syncSelection();
    } else if (name === "disabled") {
      this.#syncSelectAttributes();
    }
  }

  #initialize() {
    const customLabel = this.querySelector(":scope > label");
    const surface = figLabCreateElement("div", {
      className: "propskit-palette-surface",
    });
    const label = customLabel || document.createElement("label");
    const select = document.createElement("fig-select");
    const buttonPreview = this.#createPalettePreview([]);
    buttonPreview.setAttribute("slot", "trigger");
    buttonPreview.setAttribute("data-propskit-palette-trigger", "");
    buttonPreview.hidden = true;
    select.setAttribute("full", "");
    select.setAttribute("subtle", "");
    select.append(buttonPreview);
    surface.append(label, select);
    this.#surface = surface;
    this.#label = label;
    this.#select = select;
    this.#buttonPreview = buttonPreview;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);
    this.#syncOptions();
  }

  #clonePalette(palette) {
    if (!Array.isArray(palette)) return [];
    return palette.map((entry) => ({ ...entry }));
  }

  #normalizePalette(value) {
    const palette = document.createElement("fig-input-palette");
    if (typeof value === "string") {
      palette.setAttribute("value", value);
    } else {
      palette.setAttribute("value", JSON.stringify(value ?? []));
    }
    return this.#clonePalette(palette.value);
  }

  #serializePalette(palette) {
    return JSON.stringify(this.#normalizePalette(palette));
  }

  #parseOptions() {
    try {
      const options = JSON.parse(this.getAttribute("options") || "[]");
      if (!Array.isArray(options)) return [];
      return options
        .filter((palette) => Array.isArray(palette))
        .map((palette) => this.#normalizePalette(palette));
    } catch {
      return [];
    }
  }

  #createPalettePreview(palette) {
    const preview = document.createElement("fig-input-palette");
    preview.className = "propskit-palette-preview";
    preview.setAttribute("value", JSON.stringify(palette));
    preview.setAttribute("fixed", "");
    preview.setAttribute("disabled", "");
    preview.setAttribute("full", "");
    preview.setAttribute("aria-hidden", "true");
    return preview;
  }

  #syncButtonPreview(palette) {
    if (!this.#buttonPreview) return;
    this.#buttonPreview.setAttribute("value", JSON.stringify(palette));
    this.#buttonPreview.hidden = !palette.length;
  }

  #syncOptions() {
    if (!this.#select) return;
    const syncVersion = ++this.#syncVersion;
    this.#palettes = this.#parseOptions();
    const panel = document.createElement("fig-select-options");
    panel.setAttribute("slot", "panel");
    panel.className = "propskit-palette-options";

    this.#palettes.forEach((palette, index) => {
      const option = document.createElement("fig-select-option");
      const previewSlot = document.createElement("span");
      option.setAttribute("value", String(index));
      option.setAttribute("label", `Palette ${index + 1}`);
      option.setAttribute("aria-label", `Palette ${index + 1}`);
      previewSlot.setAttribute("slot", "prepend");
      previewSlot.className = "propskit-palette-option-preview";
      previewSlot.append(this.#createPalettePreview(palette));
      option.append(previewSlot);
      panel.append(option);
    });

    this.#syncing = true;
    this.#select.replaceChildren(this.#buttonPreview, panel);
    this.#syncSelection();
    queueMicrotask(() => {
      if (syncVersion !== this.#syncVersion) return;
      this.#syncSelection();
      this.#syncing = false;
    });
  }

  #paletteIndex(value) {
    const palette = this.#normalizePalette(value);
    return this.#palettes.findIndex((option) =>
      figLabPropskitJsonValuesEqual(option, palette),
    );
  }

  #reflectPaletteValue(palette) {
    const serialized = this.#serializePalette(palette);
    if (this.getAttribute("value") === serialized) return;
    const wasSyncing = this.#syncing;
    this.#syncing = true;
    this.setAttribute("value", serialized);
    this.#syncing = wasSyncing;
  }

  #syncSelection() {
    if (!this.#select) return;
    if (!this.#palettes.length) {
      this.#select.removeAttribute("value");
      this.#syncButtonPreview([]);
      const wasSyncing = this.#syncing;
      this.#syncing = true;
      this.removeAttribute("value");
      this.#syncing = wasSyncing;
      return;
    }

    const requested = this.hasAttribute("value")
      ? this.getAttribute("value")
      : this.#palettes[0];
    const requestedIndex = this.#paletteIndex(requested);
    const index = requestedIndex >= 0 ? requestedIndex : 0;
    this.#select.setAttribute("value", String(index));
    this.#reflectPaletteValue(this.#palettes[index]);
    this.#syncButtonPreview(this.#palettes[index]);
  }

  #syncSurface() {
    if (!this.#surface || !this.#label || !this.#select) return;
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#select, labelId, "Palette");
    this.#select.setAttribute(
      "label",
      this.getAttribute("aria-label") ||
        this.#label.textContent?.trim() ||
        "Palette",
    );
    this.#select.setAttribute("full", "");
  }

  #syncSelectAttributes() {
    if (!this.#select) return;
    this.#select.toggleAttribute(
      "disabled",
      figLabBooleanAttribute(this, "disabled"),
    );
    for (const name of ["position", "offset", "closedby"]) {
      if (this.hasAttribute(name)) {
        this.#select.setAttribute(name, this.getAttribute(name) ?? "");
      } else {
        this.#select.removeAttribute(name);
      }
    }
  }

  #bindSelectEvents() {
    if (!this.#select) return;
    this.#boundHandleInput ??= this.#forwardSelectEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardSelectEvent.bind(this, "change");
    this.#boundHandleOptionHover ??= this.#forwardSelectEvent.bind(
      this,
      "optionhover",
    );
    this.#select.addEventListener("input", this.#boundHandleInput);
    this.#select.addEventListener("change", this.#boundHandleChange);
    this.#select.addEventListener("optionhover", this.#boundHandleOptionHover);
  }

  #unbindSelectEvents() {
    if (!this.#select) return;
    if (this.#boundHandleInput) {
      this.#select.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#select.removeEventListener("change", this.#boundHandleChange);
    }
    if (this.#boundHandleOptionHover) {
      this.#select.removeEventListener(
        "optionhover",
        this.#boundHandleOptionHover,
      );
    }
  }

  #paletteAt(index) {
    return this.#clonePalette(this.#palettes[index] ?? []);
  }

  #dispatchPropskitEvent(type, palette) {
    this.#eventValue = palette;
    try {
      figLabDispatchPropskitEvent(this, type, palette);
    } finally {
      this.#eventValue = undefined;
    }
  }

  #forwardSelectEvent(type, event) {
    if (event.target !== this.#select) return;
    event.stopImmediatePropagation();
    if (this.#syncing || figLabBooleanAttribute(this, "disabled")) return;
    const rawIndex =
      type === "optionhover" && event instanceof CustomEvent
        ? event.detail
        : this.#select.getAttribute("value");
    const palette = this.#paletteAt(Number(rawIndex));
    if (type !== "optionhover") {
      this.#reflectPaletteValue(palette);
      this.#syncButtonPreview(palette);
    }
    this.#dispatchPropskitEvent(type, palette);
  }

  #isSelectMenuOpen() {
    if (!this.#select) return false;
    if (this.#select.open) return true;
    const popup = this.#select.shadowRoot?.querySelector(
      'dialog[is="fig-popup"]',
    );
    return Boolean(popup?.open || popup?.matches?.(":open"));
  }

  #handlePointerDown(event) {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("fig-menu")) return;
    if (event.target.closest("fig-select")) {
      this.#closeGesture = false;
      return;
    }
    this.#closeGesture = this.#isSelectMenuOpen();
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-menu, fig-select")
    ) {
      this.#closeGesture = false;
      return;
    }
    if (!this.#select || figLabBooleanAttribute(this.#select, "disabled")) {
      this.#closeGesture = false;
      return;
    }
    this.#select.focus();
    if (this.#closeGesture || this.#isSelectMenuOpen()) {
      this.#closeGesture = false;
      this.#select.open = false;
      return;
    }
    this.#select.open = true;
  }

  get value() {
    if (this.#eventValue !== undefined) {
      return this.#eventValue;
    }
    const index = Number(this.#select?.getAttribute("value"));
    if (Number.isInteger(index) && index >= 0) return this.#paletteAt(index);
    if (this.hasAttribute("value")) {
      return this.#normalizePalette(this.getAttribute("value"));
    }
    return [];
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined) {
      this.removeAttribute("value");
      return;
    }
    this.setAttribute("value", this.#serializePalette(nextValue));
  }

  get defaultValue() {
    if (this.hasAttribute("default")) {
      return this.#normalizePalette(this.getAttribute("default"));
    }
    return this.#clonePalette(this.#initialValue);
  }

  get isDefault() {
    return figLabPropskitJsonValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    this.value = this.defaultValue;
    for (const type of ["input", "change"]) {
      this.#dispatchPropskitEvent(type, this.value);
    }
  }

  focus(options) {
    this.#select?.focus(options);
  }
}
figLabDefineElement("propskit-palette", PropskitPalette);

/* PropsKit select surface */
class PropskitSelect extends FigLabPropskitElement {
  #surface = null;
  #label = null;
  #select = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedSelectAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleOptionHover = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandlePointerDown = this.#handlePointerDown.bind(this);
  /** True when pointerdown saw the menu open — skip click-to-open after light-dismiss. */
  #closeGesture = false;
  #eventValue = undefined;
  #initialValue = null;

  static get observedAttributes() {
    return ["label", "aria-label", "options", "value"];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncSurface();
    this.#syncSelectAttributes();
    this.#bindSelectEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    this.removeEventListener("pointerdown", this.#boundHandlePointerDown, true);
    this.addEventListener("pointerdown", this.#boundHandlePointerDown, true);
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncSurface = false;
        let syncSelect = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          const name = mutation.attributeName;
          if (name === "label" || name === "aria-label") {
            syncSurface = true;
          } else if (name === "direction") {
            continue;
          } else {
            syncSelect = true;
          }
        }

        if (syncSurface) this.#syncSurface();
        if (syncSelect) this.#syncSelectAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindSelectEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("pointerdown", this.#boundHandlePointerDown, true);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "label" || name === "aria-label") {
      this.#syncSurface();
      return;
    }
    if (name === "options" || name === "value") {
      this.#syncSelectAttributes();
    }
  }

  #initialize() {
    this.#initialValue = this.getAttribute("value") ?? "";
    const customLabel = this.querySelector(":scope > label");
    const customOptions = this.querySelector(":scope > fig-select-options");
    const surface = figLabCreateElement("div", {
      className: "propskit-select-surface",
    });
    const label = customLabel || document.createElement("label");
    const select = document.createElement("fig-select");
    // Match menu/control width to the full surface.
    select.setAttribute("full", "");
    if (customOptions) select.append(customOptions);
    surface.append(label, select);
    this.#surface = surface;
    this.#label = label;
    this.#select = select;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);
  }

  #syncSurface() {
    if (!this.#surface || !this.#label || !this.#select) return;
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#select, labelId, "Select");
    this.#select.setAttribute(
      "label",
      this.getAttribute("aria-label") ||
        this.#label.textContent?.trim() ||
        "Select",
    );
    // Always match menu width to the control surface.
    this.#select.setAttribute("full", "");
  }

  #getForwardedSelectAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "size",
      "aria-label",
      "full",
      "default",
      "variant",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncSelectAttributes() {
    if (!this.#select) return;
    const selectAttrs = this.#getForwardedSelectAttrNames().sort((a, b) => {
      // Build options before applying value so fig-select can resolve selection.
      if (a === "options") return -1;
      if (b === "options") return 1;
      if (a === "value") return 1;
      if (b === "value") return -1;
      return 0;
    });
    const nextManaged = new Set(selectAttrs);

    for (const attrName of this.#managedSelectAttrs) {
      if (!nextManaged.has(attrName)) this.#select.removeAttribute(attrName);
    }
    for (const attrName of selectAttrs) {
      this.#select.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    this.#managedSelectAttrs = nextManaged;
  }

  #bindSelectEvents() {
    if (!this.#select) return;
    this.#boundHandleInput ??= this.#forwardSelectEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardSelectEvent.bind(this, "change");
    this.#select.addEventListener("input", this.#boundHandleInput);
    this.#select.addEventListener("change", this.#boundHandleChange);
    this.#boundHandleOptionHover ??= this.#forwardSelectEvent.bind(
      this,
      "optionhover",
    );
    this.#select.addEventListener("optionhover", this.#boundHandleOptionHover);
  }

  #unbindSelectEvents() {
    if (!this.#select) return;
    if (this.#boundHandleInput) {
      this.#select.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#select.removeEventListener("change", this.#boundHandleChange);
    }
    if (this.#boundHandleOptionHover) {
      this.#select.removeEventListener(
        "optionhover",
        this.#boundHandleOptionHover,
      );
    }
  }

  #forwardSelectEvent(type, event) {
    if (event.target !== this.#select) return;
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.#select?.value ?? "";
    if (type !== "optionhover") this.setAttribute("value", String(value));
    const eventValue =
      type === "optionhover" &&
      event instanceof CustomEvent &&
      event.detail !== undefined
        ? event.detail
        : this.value;
    if (type === "optionhover") this.#eventValue = eventValue;
    try {
      figLabDispatchPropskitEvent(this, type, eventValue);
    } finally {
      this.#eventValue = undefined;
    }
  }

  #isSelectMenuOpen() {
    if (!this.#select) return false;
    if (this.#select.open) return true;
    const popup = this.#select.shadowRoot?.querySelector(
      'dialog[is="fig-popup"]',
    );
    return Boolean(popup?.open || popup?.matches?.(":open"));
  }

  #handlePointerDown(event) {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("fig-menu")) return;
    // fig-select owns its trigger clicks.
    if (event.target.closest("fig-select")) {
      this.#closeGesture = false;
      return;
    }
    // Light-dismiss closes on pointerdown; remember so click doesn't reopen.
    this.#closeGesture = this.#isSelectMenuOpen();
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (event.target instanceof Element && event.target.closest("fig-menu")) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("fig-select")
    ) {
      this.#closeGesture = false;
      return;
    }
    if (!this.#select || figLabBooleanAttribute(this.#select, "disabled")) {
      this.#closeGesture = false;
      return;
    }
    this.#select.focus();

    if (this.#closeGesture || this.#isSelectMenuOpen()) {
      this.#closeGesture = false;
      this.#select.open = false;
      return;
    }

    this.#select.open = true;
  }

  get value() {
    return (
      this.#eventValue ??
      this.#select?.value ??
      this.getAttribute("value") ??
      ""
    );
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined) {
      this.removeAttribute("value");
    } else {
      this.setAttribute("value", String(nextValue));
    }
  }

  get defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "";
  }

  get isDefault() {
    return figLabPropskitValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    const value = this.defaultValue;
    this.value = value;
    if (this.#select) this.#select.value = value;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    this.#select?.focus(options);
  }
}
figLabDefineElement("propskit-select", PropskitSelect);

/**
 * Compact selectable list with built-in add, rename, and delete actions.
 *
 * Options accept the same comma, newline, or JSON formats as fig-select.
 * Mutations normalize the options attribute to { value, label } objects so
 * labels can be renamed without changing stable option values.
 *
 * @attr {string} options - Select choices.
 * @attr {string} value - Selected option value.
 * @attr {string} default - Reset option value.
 * @attr {string} aria-label - Accessible control label.
 * @attr {boolean|string} disabled - Disables selection and list mutations.
 * @fires input - Shared PropsKit event with selected value and label.
 * @fires change - Shared PropsKit event with selected value and label.
 * @fires optionhover - Shared PropsKit event with hovered value and label.
 */
class PropskitEditableSelect extends FigLabPropskitElement {
  static observedAttributes = [
    "options",
    "value",
    "default",
    "aria-label",
    "disabled",
  ];

  #field = null;
  #select = null;
  #optionsPanel = null;
  #input = null;
  #editButton = null;
  #addButton = null;
  #editingValue = "";
  #initialValue = "";
  #eventValue = undefined;
  #reflecting = false;
  #suppressSelectEvents = false;
  #observer = null;
  #menuResizeObserver = null;
  #menuFrame = 0;
  #managedSelectAttrs = new Set();
  #renderedOptionsSignature = null;
  #boundSelectInput = this.#forwardSelectEvent.bind(this, "input");
  #boundSelectChange = this.#forwardSelectEvent.bind(this, "change");
  #boundSelectOptionHover = this.#forwardSelectEvent.bind(
    this,
    "optionhover",
  );
  #boundEditClick = this.#handleEditClick.bind(this);
  #boundAddClick = this.#handleAddClick.bind(this);
  #boundHostClick = this.#handleHostClick.bind(this);
  #boundDeletePointerDown = this.#handleDeletePointerDown.bind(this);
  #boundDeleteClick = this.#handleDeleteClick.bind(this);
  #boundOptionKeydown = this.#handleOptionKeydown.bind(this);
  #boundPopupToggle = this.#handlePopupToggle.bind(this);
  #boundEditKeydown = this.#handleEditKeydown.bind(this);
  #boundEditFocusOut = this.#handleEditFocusOut.bind(this);
  #boundStopEditEvent = (event) => event.stopImmediatePropagation();

  connectedCallback() {
    if (!this.#field) this.#initialize();
    this.#syncFromAttributes();
    this.#bindEvents();
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        if (
          mutations.some(
            (mutation) =>
              mutation.type === "attributes" &&
              mutation.attributeName !== "direction" &&
              mutation.attributeName !== "aria-disabled" &&
              !mutation.attributeName?.startsWith("data-") &&
              !PropskitEditableSelect.observedAttributes.includes(
                mutation.attributeName,
              ),
          )
        ) {
          this.#syncSelectAttributes();
        }
      });
    }
    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindEvents();
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "value" && this.#reflecting) return;
    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }
    this.#syncFromAttributes();
  }

  #initialize() {
    this.#initialValue = this.#resolveValue(this.getAttribute("value"));
    const field = figLabCreateElement("div", {
      className: "propskit-editable-select-surface",
    });
    const select = figLabCreateElement("fig-select", {
      subtle: true,
    });
    const optionsPanel = figLabCreateElement("fig-select-options", {
      className: "propskit-editable-select-options",
      slot: "panel",
    });
    select.append(optionsPanel);
    const editButton = this.#createActionButton(
      "propskit-editable-select-edit",
      "Edit item",
      "edit",
    );
    const addButton = this.#createActionButton(
      "propskit-editable-select-add",
      "Add item",
      "add",
    );
    const editTooltip = figLabCreateElement(
      "fig-tooltip",
      {
        className: "propskit-editable-select-edit-tooltip",
        text: "Edit item",
      },
      editButton,
    );
    const addTooltip = figLabCreateElement(
      "fig-tooltip",
      {
        className: "propskit-editable-select-add-tooltip",
        text: "Add item",
      },
      addButton,
    );
    field.append(select, editTooltip, addTooltip);
    this.#field = field;
    this.#select = select;
    this.#optionsPanel = optionsPanel;
    this.#editButton = editButton;
    this.#addButton = addButton;
    this.replaceChildren(field);
    this.#reflectValue(this.#initialValue);
  }

  #createActionButton(className, label, iconName) {
    return figLabCreateElement(
      "fig-button",
      {
        className,
        variant: "secondary",
        icon: true,
        "aria-label": label,
      },
      figLabCreateElement("fig-icon", {
        name: iconName,
        size: "medium",
        "aria-hidden": "true",
      }),
    );
  }

  #parseOptions(value = this.getAttribute("options")) {
    let parsed = value;
    if (typeof value === "string") {
      const text = value.trim();
      if (text.startsWith("[")) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = [];
        }
      } else {
        const delimiter = text.includes("\n") ? "\n" : ",";
        parsed = text
          .split(delimiter)
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
    }
    if (!Array.isArray(parsed)) return [];

    const seen = new Set();
    const options = [];
    for (const option of parsed) {
      const objectOption =
        option && typeof option === "object" && !Array.isArray(option);
      const optionValue = objectOption
        ? option.value ?? option.label ?? ""
        : option;
      const optionLabel = objectOption
        ? option.label ?? option.value ?? ""
        : option;
      const normalizedValue = String(optionValue ?? "").trim();
      const normalizedLabel = String(optionLabel ?? "").trim();
      if (!normalizedValue || seen.has(normalizedValue)) continue;
      seen.add(normalizedValue);
      options.push({
        value: normalizedValue,
        label: normalizedLabel || normalizedValue,
      });
    }
    return options;
  }

  #resolveValue(value) {
    const options = this.#parseOptions();
    const requested = String(value ?? "").trim();
    if (requested && options.some((option) => option.value === requested)) {
      return requested;
    }
    return options[0]?.value || "";
  }

  #reflectValue(value) {
    const resolved = this.#resolveValue(value);
    const current = this.getAttribute("value");
    this.#reflecting = true;
    try {
      if (resolved) {
        if (current !== resolved) this.setAttribute("value", resolved);
      } else if (current !== null) {
        this.removeAttribute("value");
      }
    } finally {
      this.#reflecting = false;
    }
    if (this.#select) this.#select.value = resolved;
    return resolved;
  }

  #getForwardedSelectAttrNames() {
    const reserved = new Set([
      "options",
      "value",
      "default",
      "disabled",
      "name",
      "label",
      "aria-label",
      "aria-disabled",
      "direction",
      "oninput",
      "onchange",
      "onoptionhover",
      "class",
      "style",
      "id",
      "size",
      "variant",
      "full",
      "subtle",
      "data-editing",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncFromAttributes() {
    const resolved = this.#reflectValue(this.getAttribute("value"));
    if (
      this.#input &&
      (!this.#editingValue || resolved !== this.#editingValue)
    ) {
      this.#cancelEditing(false);
    }
    this.#syncSelectAttributes();
    this.#syncDisabled();
  }

  #syncSelectAttributes() {
    if (!this.#select) return;
    const selectAttrs = this.#getForwardedSelectAttrNames();
    const nextManaged = new Set(selectAttrs);
    for (const name of this.#managedSelectAttrs) {
      if (!nextManaged.has(name)) this.#select.removeAttribute(name);
    }
    for (const name of selectAttrs) {
      this.#select.setAttribute(name, this.getAttribute(name) ?? "");
    }
    this.#managedSelectAttrs = nextManaged;

    this.#syncOptionElements();
    const label = this.getAttribute("aria-label")?.trim() || "Select item";
    this.#select.setAttribute("label", label);
    this.#select.setAttribute("aria-label", label);
    this.#select.setAttribute("subtle", "");
    this.#select.setAttribute("options", JSON.stringify(this.options));
    this.#select.value = this.#resolveValue(this.getAttribute("value"));
  }

  #syncOptionElements() {
    if (!this.#optionsPanel) return;
    const options = this.options;
    const signature = JSON.stringify(options);
    if (signature === this.#renderedOptionsSignature) return;
    this.#renderedOptionsSignature = signature;

    for (const option of this.#optionsPanel.querySelectorAll(
      ":scope > fig-select-option",
    )) {
      option.remove();
    }
    const endButton = this.#optionsPanel.querySelector(
      ":scope > .fig-overflow-end",
    );
    for (const entry of options) {
      const option = figLabCreateElement("fig-select-option", {
        value: entry.value,
        label: entry.label,
        "aria-label": `${entry.label}. Press Delete to remove this item.`,
      });
      const label = figLabCreateElement(
        "span",
        { className: "propskit-editable-select-option-label" },
        entry.label,
      );
      const deleteButton = figLabCreateElement(
        "fig-button",
        {
          className: "propskit-editable-select-delete",
          variant: "ghost",
          icon: true,
          "aria-label": `Delete ${entry.label}`,
          "aria-hidden": "true",
          "data-value": entry.value,
        },
        figLabCreateElement("fig-icon", {
          name: "trash",
          size: "small",
          "aria-hidden": "true",
        }),
      );
      const deleteTooltip = figLabCreateElement(
        "fig-tooltip",
        {
          className: "propskit-editable-select-delete-tooltip",
          slot: "append",
          text: `Delete ${entry.label}`,
        },
        deleteButton,
      );
      option.append(label, deleteTooltip);
      if (endButton) this.#optionsPanel.insertBefore(option, endButton);
      else this.#optionsPanel.append(option);
      const innerButton =
        deleteButton.button ||
        deleteButton.shadowRoot?.querySelector("button, [role='button']");
      if (innerButton instanceof HTMLElement) {
        innerButton.inert = true;
        innerButton.style.pointerEvents = "none";
      }
    }
  }

  #syncDisabled() {
    if (!this.#select || !this.#editButton || !this.#addButton) return;
    const disabled = figLabBooleanAttribute(this, "disabled");
    const listLocked = this.options.length <= 1;
    this.setAttribute("aria-disabled", String(disabled));
    this.#select.toggleAttribute("disabled", disabled || listLocked);
    this.#input?.toggleAttribute("disabled", disabled);
    for (const deleteButton of this.#optionsPanel?.querySelectorAll(
      ".propskit-editable-select-delete",
    ) || []) {
      deleteButton.toggleAttribute("disabled", disabled || listLocked);
    }
    this.#addButton.toggleAttribute("disabled", disabled || Boolean(this.#input));
    this.#editButton.toggleAttribute(
      "disabled",
      disabled || (!this.#input && !this.value),
    );
  }

  #syncEditButton() {
    if (!this.#editButton) return;
    const editing = Boolean(this.#input);
    this.toggleAttribute("data-editing", editing);
    this.#editButton.setAttribute(
      "aria-label",
      editing ? "Save item" : "Edit item",
    );
    this.#editButton
      .closest("fig-tooltip")
      ?.setAttribute("text", editing ? "Save item" : "Edit item");
    this.#editButton.setAttribute("variant", editing ? "primary" : "secondary");
    const icon = this.#editButton.querySelector("fig-icon");
    icon?.setAttribute("name", editing ? "checkmark" : "edit");
    this.#syncDisabled();
  }

  #bindEvents() {
    this.#unbindEvents();
    this.#select?.addEventListener("input", this.#boundSelectInput);
    this.#select?.addEventListener("change", this.#boundSelectChange);
    this.#select?.addEventListener(
      "optionhover",
      this.#boundSelectOptionHover,
    );
    this.#editButton?.addEventListener("click", this.#boundEditClick);
    this.#addButton?.addEventListener("click", this.#boundAddClick);
    this.#optionsPanel?.addEventListener(
      "pointerdown",
      this.#boundDeletePointerDown,
    );
    this.#optionsPanel?.addEventListener("click", this.#boundDeleteClick);
    this.#optionsPanel?.addEventListener("keydown", this.#boundOptionKeydown);
    this.addEventListener("click", this.#boundHostClick);
    const popup = this.#getSelectPopup();
    popup?.addEventListener("toggle", this.#boundPopupToggle);
    this.#installMenuPositioning();
    if (!this.#menuResizeObserver && typeof ResizeObserver === "function") {
      this.#menuResizeObserver = new ResizeObserver(() => {
        if (this.#select?.open) this.#queueMenuSurfaceSync();
      });
    }
    if (this.#field) this.#menuResizeObserver?.observe(this.#field);
  }

  #unbindEvents() {
    this.#select?.removeEventListener("input", this.#boundSelectInput);
    this.#select?.removeEventListener("change", this.#boundSelectChange);
    this.#select?.removeEventListener(
      "optionhover",
      this.#boundSelectOptionHover,
    );
    this.#editButton?.removeEventListener("click", this.#boundEditClick);
    this.#addButton?.removeEventListener("click", this.#boundAddClick);
    this.#optionsPanel?.removeEventListener(
      "pointerdown",
      this.#boundDeletePointerDown,
    );
    this.#optionsPanel?.removeEventListener("click", this.#boundDeleteClick);
    this.#optionsPanel?.removeEventListener(
      "keydown",
      this.#boundOptionKeydown,
    );
    this.removeEventListener("click", this.#boundHostClick);
    this.#getSelectPopup()?.removeEventListener(
      "toggle",
      this.#boundPopupToggle,
    );
    this.#menuResizeObserver?.disconnect();
    this.#menuResizeObserver = null;
    cancelAnimationFrame(this.#menuFrame);
    this.#menuFrame = 0;
  }

  #getSelectPopup() {
    return this.#select?.shadowRoot?.querySelector('dialog[is="fig-popup"]');
  }

  #installMenuPositioning() {
    const popup = this.#getSelectPopup();
    if (
      !popup ||
      popup.__propskitEditableSelectPositioning ||
      typeof popup.positionPopup !== "function"
    ) {
      return;
    }
    const positionPopup = popup.positionPopup.bind(popup);
    popup.positionPopup = (...args) => {
      const result = positionPopup(...args);
      this.#queueMenuSurfaceSync();
      return result;
    };
    popup.__propskitEditableSelectPositioning = true;
  }

  #handlePopupToggle(event) {
    if (event.newState === "open" || this.#select?.open) {
      this.#queueMenuSurfaceSync();
    }
  }

  #queueMenuSurfaceSync() {
    cancelAnimationFrame(this.#menuFrame);
    this.#menuFrame = requestAnimationFrame(() => {
      this.#syncMenuToSurface();
      this.#menuFrame = requestAnimationFrame(() => {
        this.#menuFrame = 0;
        this.#syncMenuToSurface();
      });
    });
  }

  #syncMenuToSurface() {
    const popup = this.#getSelectPopup();
    if (!popup || !this.#field || !this.#select?.open) return;
    const surfaceRect = this.#field.getBoundingClientRect();
    if (!surfaceRect.width) return;
    popup.style.setProperty("box-sizing", "border-box", "important");
    popup.style.setProperty("left", `${surfaceRect.left}px`, "important");
    popup.style.setProperty("width", `${surfaceRect.width}px`, "important");
    popup.style.setProperty("min-width", `${surfaceRect.width}px`, "important");
    popup.style.setProperty("max-width", `${surfaceRect.width}px`, "important");
  }

  #forwardSelectEvent(type, event) {
    if (event.target !== this.#select) return;
    event.stopImmediatePropagation();
    if (this.#suppressSelectEvents) return;
    if (figLabBooleanAttribute(this, "disabled")) return;
    const eventValue =
      type === "optionhover" && event instanceof CustomEvent
        ? String(event.detail ?? "")
        : this.#reflectValue(this.#select.value);
    this.#dispatchOptionEvent(type, eventValue);
  }

  #dispatchOptionEvent(type, value = this.value) {
    const eventValue = String(value ?? "");
    const label =
      this.options.find((option) => option.value === eventValue)?.label || "";
    this.#eventValue = eventValue;
    try {
      figLabDispatchPropskitEvent(this, type, eventValue, { label });
    } finally {
      this.#eventValue = undefined;
    }
  }

  #handleEditClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (this.#input) this.#commitEditing();
    else this.#startEditing();
  }

  #handleHostClick(event) {
    if (
      this.#input ||
      !this.#select ||
      figLabBooleanAttribute(this, "disabled") ||
      figLabBooleanAttribute(this.#select, "disabled") ||
      (event.target instanceof Element &&
        event.target.closest(
          ".propskit-editable-select-edit, .propskit-editable-select-add, fig-menu",
        ))
    ) {
      return;
    }
    if (event.target instanceof Element && event.target.closest("fig-select")) {
      return;
    }
    event.preventDefault();
    this.#select.open = true;
  }

  #handleAddClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (figLabBooleanAttribute(this, "disabled") || this.#input) return;

    const options = this.options;
    const value = `item-${options.length}`;
    this.options = [...options, { value, label: "New item" }];
    this.#reflectValue(value);
    this.#syncSelectAttributes();
    for (const type of ["input", "change"]) {
      this.#dispatchOptionEvent(type);
    }
    this.#startEditing();
  }

  #handleDeletePointerDown(event) {
    if (
      !(event.target instanceof Element) ||
      !event.target.closest(".propskit-editable-select-delete")
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  #handleDeleteClick(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".propskit-editable-select-delete");
    if (!button || !this.#optionsPanel?.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (
      figLabBooleanAttribute(this, "disabled") ||
      figLabBooleanAttribute(button, "disabled")
    ) {
      return;
    }
    this.#deleteOption(button.getAttribute("data-value") || "");
  }

  #handleOptionKeydown(event) {
    if (
      (event.key !== "Delete" && event.key !== "Backspace") ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const option = event.target.closest("fig-select-option");
    if (!option || option.parentElement !== this.#optionsPanel) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#deleteOption(option.getAttribute("value") || "");
  }

  #deleteOption(value) {
    if (
      !this.#select ||
      !this.#optionsPanel ||
      figLabBooleanAttribute(this, "disabled")
    ) {
      return;
    }
    const options = this.options;
    if (options.length <= 1) return;
    const index = options.findIndex((option) => option.value === value);
    if (index < 0) return;

    const wasOpen = this.#select.open;
    const selectedValue = this.value;
    const nextOptions = options.filter((option) => option.value !== value);
    const nextFocusIndex = Math.min(index, nextOptions.length - 1);
    const nextValue =
      selectedValue === value
        ? nextOptions[Math.max(0, nextFocusIndex)]?.value || ""
        : selectedValue;

    this.#suppressSelectEvents = true;
    try {
      if (nextValue) this.#reflectValue(nextValue);
      this.options = nextOptions;
      this.#reflectValue(nextValue);
      this.#syncSelectAttributes();
    } finally {
      this.#suppressSelectEvents = false;
    }
    for (const type of ["input", "change"]) {
      this.#dispatchOptionEvent(type);
    }

    queueMicrotask(() => {
      if (nextOptions.length > 1) {
        if (wasOpen) this.#select.open = true;
        const optionElements = [
          ...this.#optionsPanel.querySelectorAll(
            ":scope > fig-select-option",
          ),
        ];
        optionElements[Math.max(0, nextFocusIndex)]?.focus();
      } else {
        this.#select.open = false;
        requestAnimationFrame(() => this.#addButton?.focus());
      }
    });
  }

  #startEditing() {
    if (
      !this.#field ||
      !this.value ||
      figLabBooleanAttribute(this, "disabled")
    ) {
      return;
    }
    const entry = this.options.find((option) => option.value === this.value);
    if (!entry) return;
    const input = figLabCreateElement("fig-input-text", {
      type: "text",
      full: true,
      value: entry.label,
      "aria-label": `Rename ${entry.label}`,
    });
    input.addEventListener("input", this.#boundStopEditEvent);
    input.addEventListener("change", this.#boundStopEditEvent);
    input.addEventListener("keydown", this.#boundEditKeydown);
    input.addEventListener("focusout", this.#boundEditFocusOut);
    this.#editingValue = entry.value;
    this.#input = input;
    this.#select.replaceWith(input);
    this.#syncEditButton();
    queueMicrotask(() => {
      input.focus();
      input.input?.select?.();
    });
  }

  #handleEditKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.#commitEditing();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.#cancelEditing();
    }
  }

  #handleEditFocusOut(event) {
    if (!this.#input) return;
    const next = event.relatedTarget;
    if (next instanceof Node && this.#input.contains(next)) return;
    if (
      next instanceof Node &&
      (next === this.#editButton ||
        this.#editButton?.contains(next) ||
        next.getRootNode() instanceof ShadowRoot &&
          next.getRootNode().host === this.#editButton)
    ) {
      return;
    }
    this.#commitEditing(false);
  }

  #finishEditing(focus = true) {
    if (!this.#field || !this.#select) return;
    const input = this.#input;
    this.#input = null;
    this.#editingValue = "";
    if (input?.parentElement === this.#field) input.replaceWith(this.#select);
    else if (this.#select.parentElement !== this.#field) {
      this.#field.prepend(this.#select);
    }
    this.#syncSelectAttributes();
    this.#syncEditButton();
    if (focus) queueMicrotask(() => this.#select?.focus());
  }

  #commitEditing(focus = true) {
    if (!this.#input || !this.#editingValue) return;
    const editingValue = this.#editingValue;
    const options = this.options;
    const index = options.findIndex(
      (option) => option.value === editingValue,
    );
    if (index < 0) {
      this.#cancelEditing(focus);
      return;
    }
    const label = String(this.#input.value ?? "").trim() || options[index].label;
    const changed = label !== options[index].label;
    this.#finishEditing(false);
    if (changed) {
      options[index] = { ...options[index], label };
      this.options = options;
    }
    this.#reflectValue(editingValue);
    this.#syncSelectAttributes();
    if (changed) {
      for (const type of ["input", "change"]) {
        this.#dispatchOptionEvent(type);
      }
    }
    if (focus) queueMicrotask(() => this.#select?.focus());
  }

  #cancelEditing(focus = true) {
    this.#finishEditing(focus);
  }

  get options() {
    return this.#parseOptions();
  }

  set options(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("options");
      return;
    }
    this.setAttribute("options", JSON.stringify(this.#parseOptions(value)));
  }

  get value() {
    return (
      this.#eventValue ??
      this.#resolveValue(
        this.getAttribute("value") ?? this.#select?.value ?? "",
      )
    );
  }

  set value(value) {
    this.#reflectValue(value);
    this.#syncSelectAttributes();
  }

  get defaultValue() {
    const requested = this.hasAttribute("default")
      ? this.getAttribute("default")
      : this.#initialValue;
    return this.#resolveValue(requested);
  }

  get isDefault() {
    return figLabPropskitValuesEqual(this.value, this.defaultValue);
  }

  get editing() {
    return Boolean(this.#input);
  }

  resetToDefault() {
    this.#cancelEditing(false);
    this.value = this.defaultValue;
    for (const type of ["input", "change"]) {
      this.#dispatchOptionEvent(type);
    }
  }

  focus(options) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (this.#input) this.#input.focus(options);
    else this.#select?.focus(options);
  }
}
figLabDefineElement("propskit-editable-select", PropskitEditableSelect);

/* PropsKit text surface */
class PropskitText extends FigLabPropskitElement {
  #surface = null;
  #label = null;
  #input = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #initialValue = null;

  static get observedAttributes() {
    return ["label", "aria-label"];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncSurface();
    this.#syncInputAttributes();
    this.#bindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncSurface = false;
        let syncInput = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "aria-label"
          ) {
            syncSurface = true;
          } else if (mutation.attributeName === "direction") {
            continue;
          } else {
            syncInput = true;
          }
        }

        if (syncSurface) this.#syncSurface();
        if (syncInput) this.#syncInputAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "label" || name === "aria-label") {
      this.#syncSurface();
    }
  }

  #initialize() {
    this.#initialValue = this.getAttribute("value") ?? "";
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const surface = figLabCreateElement("div", {
      className: "propskit-text-surface",
    });
    const label = customLabel || document.createElement("label");
    const input = document.createElement("fig-input-text");

    for (const node of initialChildren) {
      if (node !== customLabel) input.appendChild(node);
    }
    surface.append(label, input);
    this.#surface = surface;
    this.#label = label;
    this.#input = input;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);
  }

  #syncSurface() {
    if (!this.#surface || !this.#label || !this.#input) return;
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#input, labelId, "Text");
  }

  #getForwardedInputAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "size",
      "type",
      "aria-label",
      "multiline",
      "autoresize",
      "resizable",
      "default",
      "variant",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncInputAttributes() {
    if (!this.#input) return;
    const inputAttrs = this.#getForwardedInputAttrNames();
    const defaultEnabledAttrs = ["multiline", "autoresize"];
    const nextManaged = new Set([...inputAttrs, ...defaultEnabledAttrs, "type"]);

    for (const attrName of this.#managedInputAttrs) {
      if (!nextManaged.has(attrName)) this.#input.removeAttribute(attrName);
    }
    for (const attrName of inputAttrs) {
      this.#input.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }
    for (const attrName of defaultEnabledAttrs) {
      this.#input.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }
    this.#input.setAttribute("type", "text");

    this.#managedInputAttrs = nextManaged;
  }

  #bindInputEvents() {
    if (!this.#input) return;
    this.#boundHandleInput ??= this.#forwardInputEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardInputEvent.bind(this, "change");
    this.#input.addEventListener("input", this.#boundHandleInput);
    this.#input.addEventListener("change", this.#boundHandleChange);
  }

  #unbindInputEvents() {
    if (!this.#input) return;
    if (this.#boundHandleInput) {
      this.#input.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#input.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #forwardInputEvent(type, event) {
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.#input?.value ?? "";
    this.setAttribute("value", String(value));
    figLabDispatchPropskitEvent(this, type);
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-text, fig-menu")
    ) {
      return;
    }
    this.focus();
  }

  get value() {
    return this.#input?.value ?? this.getAttribute("value") ?? "";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined) {
      this.removeAttribute("value");
      if (this.#input) this.#input.value = "";
    } else {
      const next = String(nextValue);
      this.setAttribute("value", next);
      if (this.#input) this.#input.value = next;
    }
  }

  get defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "";
  }

  get isDefault() {
    return figLabPropskitValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    const value = this.defaultValue;
    this.value = value;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    this.#input?.focus(options);
  }
}
figLabDefineElement("propskit-text", PropskitText);

/* PropsKit number surface */
class PropskitNumber extends FigLabPropskitElement {
  #surface = null;
  #label = null;
  #input = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandleKeyDown = this.#handleKeyDown.bind(this);
  #initialValue = null;

  static get observedAttributes() {
    return ["label", "aria-label"];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncSurface();
    this.#syncInputAttributes();
    this.#bindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    figLabConnectPropskitResetMenu(this);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncSurface = false;
        let syncInput = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "aria-label"
          ) {
            syncSurface = true;
          } else if (mutation.attributeName === "direction") {
            continue;
          } else {
            syncInput = true;
          }
        }

        if (syncSurface) this.#syncSurface();
        if (syncInput) this.#syncInputAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "label" || name === "aria-label") this.#syncSurface();
  }

  #initialize() {
    this.#initialValue =
      this.getAttribute("value") ?? this.getAttribute("min") ?? "0";
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const surface = figLabCreateElement("div", {
      className: "propskit-number-surface",
    });
    const label = customLabel || document.createElement("label");
    const input = document.createElement("fig-input-number");

    surface.append(label, input);
    this.#surface = surface;
    this.#label = label;
    this.#input = input;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);

    for (const node of initialChildren) {
      if (node !== customLabel) input.appendChild(node);
    }
  }

  #syncSurface() {
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#input, labelId, "Number");
  }

  #getForwardedInputAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "size",
      "aria-label",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "default",
      "variant",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncInputAttributes() {
    if (!this.#input) return;
    const inputAttrs = this.#getForwardedInputAttrNames();
    const nextManaged = new Set(inputAttrs);

    for (const attrName of this.#managedInputAttrs) {
      if (!nextManaged.has(attrName)) this.#input.removeAttribute(attrName);
    }
    for (const attrName of inputAttrs) {
      this.#input.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    this.#managedInputAttrs = nextManaged;
  }

  #bindInputEvents() {
    if (!this.#input) return;
    this.#boundHandleInput ??= this.#forwardInputEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardInputEvent.bind(this, "change");
    this.#input.addEventListener("input", this.#boundHandleInput);
    this.#input.addEventListener("change", this.#boundHandleChange);
  }

  #unbindInputEvents() {
    if (!this.#input) return;
    if (this.#boundHandleInput) {
      this.#input.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#input.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #forwardInputEvent(type, event) {
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = figLabFiniteNumberOrNull(this.#input?.value);
    if (value === null) this.removeAttribute("value");
    else this.setAttribute("value", String(value));
    figLabDispatchPropskitEvent(this, type);
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-number, fig-menu")
    ) {
      return;
    }
    this.focus();
  }

  #handleKeyDown(event) {
    if (
      !["ArrowUp", "ArrowDown"].includes(event.key) ||
      !(event.target instanceof Element) ||
      !event.target.closest("fig-input-number")
    ) {
      return;
    }
    event.stopPropagation();
    const input = this.#input?.querySelector("input");
    queueMicrotask(() => {
      if (this.isConnected && !figLabBooleanAttribute(this, "disabled")) {
        input?.focus({ preventScroll: true });
      }
    });
  }

  get value() {
    return figLabFiniteNumberOrNull(
      this.#input?.value ?? this.getAttribute("value"),
    );
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      if (this.#input) this.#input.value = "";
    } else {
      const next = String(nextValue);
      this.setAttribute("value", next);
      if (this.#input) this.#input.value = next;
    }
  }

  get defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "0";
  }

  get isDefault() {
    return figLabPropskitValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    const value = this.defaultValue;
    this.value = value;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    this.#input?.focus(options);
  }
}
figLabDefineElement("propskit-number", PropskitNumber);

/**
 * Compact X/Y editor.
 *
 * @attr {number} x - Horizontal value.
 * @attr {number} y - Vertical value.
 * @attr {string} default - JSON reset value with x and y.
 * @attr {string} label - Surface label. Omitted values use "Label"; empty hides it.
 * @attr {string} units - Set to "percent" to show percentage units.
 * @attr {boolean|string} disabled - Disables both number inputs.
 * @fires input - Composed event with { x, y }.
 * @fires change - Composed event with { x, y }.
 */
class PropskitPosition extends FigLabPropskitElement {
  static observedAttributes = [
    "x",
    "y",
    "default",
    "label",
    "aria-label",
    "units",
    "disabled",
  ];

  #surface = null;
  #label = null;
  #hasCustomLabel = false;
  #xInput = null;
  #yInput = null;
  #initialValue = null;
  #initialized = false;
  #reflecting = false;
  #boundHandleInput = this.#handleInputEvent.bind(this, "input");
  #boundHandleChange = this.#handleInputEvent.bind(this, "change");
  #boundHandleClick = this.#handleClick.bind(this);

  connectedCallback() {
    if (!this.#initialized) {
      this.#initialValue = this.#readValue();
      this.#reflectValue(this.#initialValue);
      this.#initialized = true;
    }
    if (!this.#surface) this.#render();
    this.#syncLabel();
    this.#syncInputs();
    this.#bindEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    figLabConnectPropskitResetMenu(this);
  }

  disconnectedCallback() {
    this.#unbindEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized) return;
    if ((name === "x" || name === "y") && !this.#reflecting) {
      this.#syncInputs();
    } else if (name === "label" || name === "aria-label") {
      this.#syncLabel();
    } else if (name === "units") {
      this.#syncUnits();
    } else if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  #finiteNumber(value, fallback = 50) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  #readValue() {
    const x = this.getAttribute("x");
    const y = this.getAttribute("y");
    return {
      x: x === null || !x.trim() ? 50 : this.#finiteNumber(x, 50),
      y: y === null || !y.trim() ? 50 : this.#finiteNumber(y, 50),
    };
  }

  #parseDefault(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }
      return {
        x: this.#finiteNumber(parsed.x, this.#initialValue?.x ?? 50),
        y: this.#finiteNumber(parsed.y, this.#initialValue?.y ?? 50),
      };
    } catch {
      return null;
    }
  }

  #reflectValue(value) {
    const current = this.#readValue();
    const normalized = {
      x: this.#finiteNumber(value?.x, current.x),
      y: this.#finiteNumber(value?.y, current.y),
    };
    this.#reflecting = true;
    this.setAttribute("x", String(normalized.x));
    this.setAttribute("y", String(normalized.y));
    this.#reflecting = false;
    return normalized;
  }

  #createNumber(axis, value) {
    const input = document.createElement("fig-input-number");
    input.setAttribute("data-propskit-position-axis", axis);
    input.setAttribute("value", String(value));
    input.setAttribute("min", "0");
    input.setAttribute("max", "100");
    input.setAttribute("step", "1");
    input.setAttribute("precision", "2");
    if (this.units === "percent") input.setAttribute("units", "%");
    input.setAttribute("aria-label", `${axis.toUpperCase()} position`);
    const prepend = document.createElement("span");
    prepend.setAttribute("slot", "prepend");
    prepend.textContent = axis.toUpperCase();
    input.append(prepend);
    if (figLabBooleanAttribute(this, "disabled")) {
      input.setAttribute("disabled", "");
    }
    return input;
  }

  #render() {
    const value = this.#readValue();
    const customLabel = this.querySelector(":scope > label");
    const surface = figLabCreateElement("div", {
      className: "propskit-position-surface",
      role: "group",
    });
    const label = customLabel || document.createElement("label");
    const xInput = this.#createNumber("x", value.x);
    const yInput = this.#createNumber("y", value.y);
    surface.append(label, xInput, yInput);
    this.#surface = surface;
    this.#label = label;
    this.#hasCustomLabel = Boolean(customLabel);
    this.#xInput = xInput;
    this.#yInput = yInput;
    this.replaceChildren(surface);
    figLabConnectPropskitResetMenu(this);
  }

  #syncLabel() {
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#surface, labelId, "Position");
  }

  #syncInputs() {
    const value = this.#readValue();
    this.#xInput?.setAttribute("value", String(value.x));
    this.#yInput?.setAttribute("value", String(value.y));
    this.#syncUnits();
    this.#syncDisabled();
  }

  #syncUnits() {
    const units = this.units === "percent" ? "%" : null;
    for (const input of [this.#xInput, this.#yInput]) {
      if (!input) continue;
      if (units) input.setAttribute("units", units);
      else input.removeAttribute("units");
    }
  }

  #syncDisabled() {
    const disabled = figLabBooleanAttribute(this, "disabled");
    this.#xInput?.toggleAttribute("disabled", disabled);
    this.#yInput?.toggleAttribute("disabled", disabled);
  }

  #bindEvents() {
    this.#unbindEvents();
    this.#xInput?.addEventListener("input", this.#boundHandleInput);
    this.#xInput?.addEventListener("change", this.#boundHandleChange);
    this.#yInput?.addEventListener("input", this.#boundHandleInput);
    this.#yInput?.addEventListener("change", this.#boundHandleChange);
  }

  #unbindEvents() {
    this.#xInput?.removeEventListener("input", this.#boundHandleInput);
    this.#xInput?.removeEventListener("change", this.#boundHandleChange);
    this.#yInput?.removeEventListener("input", this.#boundHandleInput);
    this.#yInput?.removeEventListener("change", this.#boundHandleChange);
  }

  #handleInputEvent(type, event) {
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const axis = event.currentTarget?.getAttribute("data-propskit-position-axis");
    if (axis !== "x" && axis !== "y") return;
    const value = this.value;
    value[axis] = this.#finiteNumber(event.currentTarget.value, value[axis]);
    this.#reflectValue(value);
    figLabDispatchPropskitEvent(this, type);
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-number, fig-menu")
    ) {
      return;
    }
    this.focus();
  }

  get x() {
    return this.#readValue().x;
  }

  set x(value) {
    this.setAttribute("x", String(this.#finiteNumber(value, 50)));
  }

  get y() {
    return this.#readValue().y;
  }

  set y(value) {
    this.setAttribute("y", String(this.#finiteNumber(value, 50)));
  }

  get units() {
    return this.getAttribute("units")?.trim().toLowerCase() === "percent"
      ? "percent"
      : "none";
  }

  set units(value) {
    this.setAttribute(
      "units",
      String(value).trim().toLowerCase() === "none" ? "none" : "percent",
    );
  }

  get value() {
    return { ...this.#readValue() };
  }

  set value(value) {
    const normalized = this.#reflectValue(value);
    this.#syncInputs(normalized);
  }

  get defaultValue() {
    return (
      this.#parseDefault(this.getAttribute("default")) || {
        ...(this.#initialValue || { x: 50, y: 50 }),
      }
    );
  }

  get isDefault() {
    return figLabPropskitJsonValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    const value = this.defaultValue;
    this.value = value;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    this.#xInput?.focus(options);
  }
}
figLabDefineElement("propskit-position", PropskitPosition);

/**
 * Labeled two-axis joystick.
 *
 * @attr {string} value - JSON object with percentage x and y coordinates.
 * @attr {string} default - JSON reset value with percentage x and y coordinates.
 * @attr {string} label - Surface label. Omitted values use "Label"; empty hides it.
 * @attr {string} axis-labels - Forwarded to the inner fig-joystick.
 * @attr {string} coordinates - Forwarded coordinate mode: "screen" or "math".
 * @attr {number} precision - Forwarded number-field display precision.
 * @attr {boolean|string} disabled - Disables the joystick and both fields.
 * @fires input - Shared PropsKit event with a typed { x, y } value.
 * @fires change - Shared PropsKit event with a typed { x, y } value.
 */
class PropskitJoystick extends FigLabPropskitElement {
  static observedAttributes = [
    "value",
    "default",
    "label",
    "aria-label",
    "axis-labels",
    "coordinates",
    "precision",
    "disabled",
  ];

  #surface = null;
  #label = null;
  #hasCustomLabel = false;
  #joystick = null;
  #observer = null;
  #initialValue = { x: 50, y: 50 };
  #reflecting = false;
  #boundInput = this.#handlePrimitiveEvent.bind(this, "input");
  #boundChange = this.#handlePrimitiveEvent.bind(this, "change");

  connectedCallback() {
    if (!this.#surface) {
      this.#initialValue = this.#normalizeValue(
        this.getAttribute("value"),
        this.#initialValue,
      );
      this.#reflectValue(this.#initialValue);
      this.#render();
    }
    this.#syncLabel();
    this.#syncPrimitive();
    this.#bindEvents();
    this.#observer?.observe(this.#joystick, { childList: true, subtree: true });
    figLabConnectPropskitResetMenu(this);
  }

  disconnectedCallback() {
    this.#unbindEvents();
    this.#observer?.disconnect();
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "value" && !this.#reflecting) {
      this.#reflectValue(this.#normalizeValue(newValue, this.value));
      this.#syncPrimitiveValue();
    } else if (name === "label" || name === "aria-label") {
      this.#syncLabel();
    } else if (
      name === "axis-labels" ||
      name === "coordinates" ||
      name === "precision"
    ) {
      this.#syncForwardedAttributes();
    } else if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  #finitePercent(value, fallback = 50) {
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.max(0, Math.min(100, number))
      : fallback;
  }

  #normalizeValue(value, fallback = { x: 50, y: 50 }) {
    let parsed = value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return { ...fallback };
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        const parts = trimmed.split(/[\s,]+/).filter(Boolean);
        const parseAxis = (token, axisFallback) => {
          if (!token) return axisFallback;
          const numeric = Number.parseFloat(token.replace(/%/g, ""));
          if (!Number.isFinite(numeric)) return axisFallback;
          return token.includes("%") || Math.abs(numeric) > 1
            ? numeric
            : numeric * 100;
        };
        parsed = {
          x: parseAxis(parts[0], fallback.x),
          y: parseAxis(parts[1] ?? parts[0], fallback.y),
        };
      }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...fallback };
    }
    return {
      x: this.#finitePercent(parsed.x, fallback.x),
      y: this.#finitePercent(parsed.y, fallback.y),
    };
  }

  #reflectValue(value) {
    const normalized = this.#normalizeValue(value, this.#initialValue);
    const serialized = JSON.stringify(normalized);
    if (this.getAttribute("value") !== serialized) {
      this.#reflecting = true;
      this.setAttribute("value", serialized);
      this.#reflecting = false;
    }
    return normalized;
  }

  #render() {
    const customLabel = this.querySelector(":scope > label");
    const surface = figLabCreateElement("div", {
      className: "propskit-joystick-surface",
      role: "group",
    });
    const label = customLabel || document.createElement("label");
    const joystick = document.createElement("fig-joystick");
    joystick.setAttribute("fields", "true");
    joystick.setAttribute("aspect-ratio", "1 / 1");
    surface.append(label, joystick);
    this.#surface = surface;
    this.#label = label;
    this.#hasCustomLabel = Boolean(customLabel);
    this.#joystick = joystick;
    this.replaceChildren(surface);
    this.#observer = new MutationObserver(() => this.#syncDescendantState());
    this.#observer.observe(joystick, { childList: true, subtree: true });
  }

  #syncLabel() {
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#joystick, labelId, "Joystick");
    this.#syncDescendantState();
  }

  #syncPrimitive() {
    this.#syncForwardedAttributes();
    this.#syncPrimitiveValue();
    this.#syncDisabled();
  }

  #syncForwardedAttributes() {
    if (!this.#joystick) return;
    this.#joystick.setAttribute("fields", "true");
    this.#joystick.setAttribute("aspect-ratio", "1 / 1");
    for (const name of ["axis-labels", "coordinates", "precision"]) {
      if (this.hasAttribute(name)) {
        this.#joystick.setAttribute(name, this.getAttribute(name) ?? "");
      } else {
        this.#joystick.removeAttribute(name);
      }
    }
  }

  #syncPrimitiveValue() {
    if (!this.#joystick) return;
    const value = this.value;
    const serialized = `${value.x}% ${value.y}%`;
    if (this.#joystick.getAttribute("value") !== serialized) {
      this.#joystick.setAttribute("value", serialized);
    }
  }

  #syncDisabled() {
    if (!this.#joystick || !this.#surface) return;
    const disabled = figLabBooleanAttribute(this, "disabled");
    this.#surface.setAttribute("aria-disabled", String(disabled));
    this.#joystick.toggleAttribute("disabled", disabled);
    this.#joystick.inert = disabled;
    this.#syncDescendantState();
  }

  #syncDescendantState() {
    if (!this.#joystick) return;
    const disabled = figLabBooleanAttribute(this, "disabled");
    const labelId = this.#label?.isConnected ? this.#label.id : "";
    const explicitLabel = this.getAttribute("aria-label")?.trim();
    const handle = this.#joystick.querySelector("fig-handle");
    if (handle) {
      handle.toggleAttribute("disabled", disabled);
      if (explicitLabel) {
        handle.setAttribute("aria-label", explicitLabel);
        handle.removeAttribute("aria-labelledby");
      } else if (labelId) {
        handle.setAttribute("aria-labelledby", labelId);
        handle.removeAttribute("aria-label");
      } else {
        handle.setAttribute("aria-label", "Joystick");
        handle.removeAttribute("aria-labelledby");
      }
    }
    for (const input of this.#joystick.querySelectorAll("fig-input-number")) {
      input.toggleAttribute("disabled", disabled);
    }
  }

  #bindEvents() {
    this.#unbindEvents();
    this.#joystick?.addEventListener("input", this.#boundInput);
    this.#joystick?.addEventListener("change", this.#boundChange);
  }

  #unbindEvents() {
    this.#joystick?.removeEventListener("input", this.#boundInput);
    this.#joystick?.removeEventListener("change", this.#boundChange);
  }

  #handlePrimitiveEvent(type, event) {
    event.stopImmediatePropagation();
    if (
      event.target !== this.#joystick ||
      figLabBooleanAttribute(this, "disabled")
    ) {
      return;
    }
    const value = this.#normalizeValue(event.detail?.value, this.value);
    this.#reflectValue(value);
    this.#syncPrimitiveValue();
    figLabDispatchPropskitEvent(this, type);
  }

  get value() {
    return this.#normalizeValue(
      this.getAttribute("value"),
      this.#initialValue,
    );
  }

  set value(value) {
    this.#reflectValue(value);
    this.#syncPrimitiveValue();
  }

  get defaultValue() {
    return this.#normalizeValue(
      this.getAttribute("default"),
      this.#initialValue,
    );
  }

  get isDefault() {
    return figLabPropskitJsonValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    this.value = this.defaultValue;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    this.#joystick?.focus(options);
  }
}
figLabDefineElement("propskit-joystick", PropskitJoystick);

/**
 * Labeled transform-origin grid.
 *
 * @attr {string} value - JSON object with percentage x and y coordinates.
 * @attr {string} default - JSON reset value with percentage x and y coordinates.
 * @attr {string} label - Surface label. Omitted values use "Label"; empty hides it.
 * @attr {number} precision - Forwarded number-field display precision.
 * @attr {boolean|string} drag - Forwarded drag behavior.
 * @attr {boolean|string} disabled - Disables the origin grid and both fields.
 * @fires input - Shared PropsKit event with a typed { x, y } value.
 * @fires change - Shared PropsKit event with a typed { x, y } value.
 */
class PropskitOrigin extends FigLabPropskitElement {
  static observedAttributes = [
    "value",
    "default",
    "label",
    "aria-label",
    "precision",
    "drag",
    "disabled",
  ];

  #surface = null;
  #label = null;
  #hasCustomLabel = false;
  #origin = null;
  #observer = null;
  #initialValue = { x: 50, y: 50 };
  #reflecting = false;
  #boundInput = this.#handlePrimitiveEvent.bind(this, "input");
  #boundChange = this.#handlePrimitiveEvent.bind(this, "change");

  connectedCallback() {
    if (!this.#surface) {
      this.#initialValue = this.#normalizeValue(
        this.getAttribute("value"),
        this.#initialValue,
      );
      this.#reflectValue(this.#initialValue);
      this.#render();
    }
    this.#syncLabel();
    this.#syncPrimitive();
    this.#bindEvents();
    this.#observer?.observe(this.#origin, { childList: true, subtree: true });
    figLabConnectPropskitResetMenu(this);
  }

  disconnectedCallback() {
    this.#unbindEvents();
    this.#observer?.disconnect();
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "value" && !this.#reflecting) {
      this.#reflectValue(this.#normalizeValue(newValue, this.value));
      this.#syncPrimitiveValue();
    } else if (name === "label" || name === "aria-label") {
      this.#syncLabel();
    } else if (name === "precision" || name === "drag") {
      this.#syncForwardedAttributes();
    } else if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  #finiteNumber(value, fallback = 50) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  #parseAxisToken(token, axis, fallback) {
    const normalized = String(token ?? "").trim().toLowerCase();
    const keywords =
      axis === "x"
        ? { left: 0, center: 50, right: 100 }
        : { top: 0, center: 50, bottom: 100 };
    if (normalized in keywords) return keywords[normalized];
    const number = Number.parseFloat(normalized.replace(/%/g, ""));
    return Number.isFinite(number) ? number : fallback;
  }

  #normalizeValue(value, fallback = { x: 50, y: 50 }) {
    let parsed = value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return { ...fallback };
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        const parts = trimmed.replace(/,/g, " ").split(/\s+/).filter(Boolean);
        parsed = {
          x: this.#parseAxisToken(parts[0], "x", fallback.x),
          y: this.#parseAxisToken(parts[1] ?? parts[0], "y", fallback.y),
        };
      }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...fallback };
    }
    return {
      x: this.#finiteNumber(parsed.x, fallback.x),
      y: this.#finiteNumber(parsed.y, fallback.y),
    };
  }

  #reflectValue(value) {
    const normalized = this.#normalizeValue(value, this.#initialValue);
    const serialized = JSON.stringify(normalized);
    if (this.getAttribute("value") !== serialized) {
      this.#reflecting = true;
      this.setAttribute("value", serialized);
      this.#reflecting = false;
    }
    return normalized;
  }

  #render() {
    const customLabel = this.querySelector(":scope > label");
    const surface = figLabCreateElement("div", {
      className: "propskit-origin-surface",
      role: "group",
    });
    const label = customLabel || document.createElement("label");
    const origin = document.createElement("fig-origin-grid");
    origin.setAttribute("fields", "true");
    origin.setAttribute("aspect-ratio", "1 / 1");
    surface.append(label, origin);
    this.#surface = surface;
    this.#label = label;
    this.#hasCustomLabel = Boolean(customLabel);
    this.#origin = origin;
    this.replaceChildren(surface);
    this.#observer = new MutationObserver(() => this.#syncDescendantState());
    this.#observer.observe(origin, { childList: true, subtree: true });
  }

  #syncLabel() {
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#origin, labelId, "Origin");
    this.#syncDescendantState();
  }

  #syncPrimitive() {
    this.#syncForwardedAttributes();
    this.#syncPrimitiveValue();
    this.#syncDisabled();
  }

  #syncForwardedAttributes() {
    if (!this.#origin) return;
    this.#origin.setAttribute("fields", "true");
    this.#origin.setAttribute("aspect-ratio", "1 / 1");
    for (const name of ["precision", "drag"]) {
      if (this.hasAttribute(name)) {
        this.#origin.setAttribute(name, this.getAttribute(name) ?? "");
      } else {
        this.#origin.removeAttribute(name);
      }
    }
  }

  #syncPrimitiveValue() {
    if (!this.#origin) return;
    const value = this.value;
    const serialized = `${value.x}% ${value.y}%`;
    if (this.#origin.getAttribute("value") !== serialized) {
      this.#origin.setAttribute("value", serialized);
    }
  }

  #syncDisabled() {
    if (!this.#origin || !this.#surface) return;
    const disabled = figLabBooleanAttribute(this, "disabled");
    this.#surface.setAttribute("aria-disabled", String(disabled));
    this.#origin.toggleAttribute("disabled", disabled);
    this.#origin.inert = disabled;
    this.#syncDescendantState();
  }

  #syncDescendantState() {
    if (!this.#origin) return;
    const disabled = figLabBooleanAttribute(this, "disabled");
    const labelId = this.#label?.isConnected ? this.#label.id : "";
    const explicitLabel = this.getAttribute("aria-label")?.trim();
    const handle = this.#origin.querySelector("fig-handle");
    if (handle) {
      handle.toggleAttribute("disabled", disabled);
      if (explicitLabel) {
        handle.setAttribute("aria-label", explicitLabel);
        handle.removeAttribute("aria-labelledby");
      } else if (labelId) {
        handle.setAttribute("aria-labelledby", labelId);
        handle.removeAttribute("aria-label");
      } else {
        handle.setAttribute("aria-label", "Origin");
        handle.removeAttribute("aria-labelledby");
      }
    }
    for (const input of this.#origin.querySelectorAll("fig-input-number")) {
      input.toggleAttribute("disabled", disabled);
    }
  }

  #bindEvents() {
    this.#unbindEvents();
    this.#origin?.addEventListener("input", this.#boundInput);
    this.#origin?.addEventListener("change", this.#boundChange);
  }

  #unbindEvents() {
    this.#origin?.removeEventListener("input", this.#boundInput);
    this.#origin?.removeEventListener("change", this.#boundChange);
  }

  #handlePrimitiveEvent(type, event) {
    event.stopImmediatePropagation();
    if (
      event.target !== this.#origin ||
      figLabBooleanAttribute(this, "disabled")
    ) {
      return;
    }
    const value = this.#normalizeValue(event.detail, this.value);
    this.#reflectValue(value);
    this.#syncPrimitiveValue();
    figLabDispatchPropskitEvent(this, type);
  }

  get value() {
    return this.#normalizeValue(
      this.getAttribute("value"),
      this.#initialValue,
    );
  }

  set value(value) {
    this.#reflectValue(value);
    this.#syncPrimitiveValue();
  }

  get defaultValue() {
    return this.#normalizeValue(
      this.getAttribute("default"),
      this.#initialValue,
    );
  }

  get isDefault() {
    return figLabPropskitJsonValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    this.value = this.defaultValue;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    this.#origin?.querySelector("fig-handle")?.focus(options);
  }
}
figLabDefineElement("propskit-origin", PropskitOrigin);

/**
 * Shared labeled curve editor for PropsKit easing and spring controls.
 */
class PropskitCurve extends FigLabPropskitElement {
  static observedAttributes = [
    "value",
    "default",
    "label",
    "aria-label",
    "precision",
    "edit",
    "disabled",
  ];

  #surface = null;
  #label = null;
  #hasCustomLabel = false;
  #curve = null;
  #observer = null;
  #initialValue = null;
  #reflecting = false;
  #boundInput = this.#handlePrimitiveEvent.bind(this, "input");
  #boundChange = this.#handlePrimitiveEvent.bind(this, "change");

  connectedCallback() {
    if (!this.#surface) {
      this.#initialValue = this.#normalizeValue(
        this.getAttribute("value"),
        this.#fallbackValue(),
      );
      this.#reflectValue(this.#initialValue);
      this.#render();
    }
    this.#syncLabel();
    this.#syncPrimitive();
    this.#bindEvents();
    this.#observer?.observe(this.#curve, { childList: true, subtree: true });
    figLabConnectPropskitResetMenu(this);
  }

  disconnectedCallback() {
    this.#unbindEvents();
    this.#observer?.disconnect();
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "value" && !this.#reflecting) {
      this.#reflectValue(this.#normalizeValue(newValue, this.value));
      this.#syncPrimitiveValue();
    } else if (name === "label" || name === "aria-label") {
      this.#syncLabel();
    } else if (name === "precision" || name === "edit") {
      this.#syncForwardedAttributes();
    } else if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  #isSpring() {
    return this.localName === "propskit-spring";
  }

  #fallbackValue() {
    return this.#isSpring()
      ? { stiffness: 200, damping: 15, mass: 1 }
      : { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
  }

  #finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  #positiveNumber(value, fallback) {
    const number = this.#finiteNumber(value, fallback);
    return number > 0 ? number : fallback;
  }

  #normalizeValue(value, fallback = this.#fallbackValue()) {
    let parsed = value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return { ...fallback };
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        if (this.#isSpring()) {
          const match = trimmed.match(
            /^spring\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/,
          );
          parsed = match
            ? {
                stiffness: Number(match[1]),
                damping: Number(match[2]),
                mass: Number(match[3]),
              }
            : null;
        } else {
          const raw = trimmed
            .replace(/^cubic-bezier\(\s*/i, "")
            .replace(/\s*\)$/, "");
          const parts = raw.split(",").map((part) => Number(part.trim()));
          parsed =
            parts.length === 4 && parts.every(Number.isFinite)
              ? { x1: parts[0], y1: parts[1], x2: parts[2], y2: parts[3] }
              : null;
        }
      }
    }

    if (this.#isSpring()) {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ...fallback };
      }
      return {
        stiffness: this.#positiveNumber(parsed.stiffness, fallback.stiffness),
        damping: this.#positiveNumber(parsed.damping, fallback.damping),
        mass: this.#positiveNumber(parsed.mass, fallback.mass),
      };
    }

    if (Array.isArray(parsed)) {
      parsed = {
        x1: parsed[0],
        y1: parsed[1],
        x2: parsed[2],
        y2: parsed[3],
      };
    }
    if (!parsed || typeof parsed !== "object") return { ...fallback };
    return {
      x1: Math.max(
        0,
        Math.min(1, this.#finiteNumber(parsed.x1, fallback.x1)),
      ),
      y1: this.#finiteNumber(parsed.y1, fallback.y1),
      x2: Math.max(
        0,
        Math.min(1, this.#finiteNumber(parsed.x2, fallback.x2)),
      ),
      y2: this.#finiteNumber(parsed.y2, fallback.y2),
    };
  }

  #reflectValue(value) {
    const fallback = this.#initialValue || this.#fallbackValue();
    const normalized = this.#normalizeValue(value, fallback);
    const serialized = JSON.stringify(normalized);
    if (this.getAttribute("value") !== serialized) {
      this.#reflecting = true;
      this.setAttribute("value", serialized);
      this.#reflecting = false;
    }
    return normalized;
  }

  #render() {
    const customLabel = this.querySelector(":scope > label");
    const surface = figLabCreateElement("div", {
      className: `${this.localName}-surface`,
      role: "group",
    });
    const label = customLabel || document.createElement("label");
    const curve = document.createElement("fig-easing-curve");
    curve.setAttribute("mode", this.#isSpring() ? "spring" : "bezier");
    curve.setAttribute("aspect-ratio", "1 / 1");
    surface.append(label, curve);
    this.#surface = surface;
    this.#label = label;
    this.#hasCustomLabel = Boolean(customLabel);
    this.#curve = curve;
    this.replaceChildren(surface);
    this.#observer = new MutationObserver(() => this.#syncDescendantState());
    this.#observer.observe(curve, { childList: true, subtree: true });
  }

  #syncLabel() {
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(
      this,
      this.#curve,
      labelId,
      this.#isSpring() ? "Spring" : "Easing",
    );
    this.#syncDescendantState();
  }

  #syncPrimitive() {
    this.#syncForwardedAttributes();
    this.#syncPrimitiveValue();
    this.#syncDisabled();
  }

  #syncForwardedAttributes() {
    if (!this.#curve) return;
    this.#curve.setAttribute("mode", this.#isSpring() ? "spring" : "bezier");
    this.#curve.setAttribute("aspect-ratio", "1 / 1");
    for (const name of ["precision", "edit"]) {
      if (this.hasAttribute(name)) {
        this.#curve.setAttribute(name, this.getAttribute(name) ?? "");
      } else {
        this.#curve.removeAttribute(name);
      }
    }
  }

  #syncPrimitiveValue() {
    if (!this.#curve) return;
    const value = this.value;
    const serialized = this.#isSpring()
      ? `spring(${value.stiffness}, ${value.damping}, ${value.mass})`
      : `${value.x1}, ${value.y1}, ${value.x2}, ${value.y2}`;
    if (this.#curve.getAttribute("value") !== serialized) {
      this.#curve.setAttribute("value", serialized);
    }
  }

  #syncDisabled() {
    if (!this.#curve || !this.#surface) return;
    const disabled = figLabBooleanAttribute(this, "disabled");
    this.#surface.setAttribute("aria-disabled", String(disabled));
    this.#curve.toggleAttribute("disabled", disabled);
    this.#curve.inert = disabled;
    this.#syncDescendantState();
  }

  #syncDescendantState() {
    if (!this.#curve) return;
    const disabled = figLabBooleanAttribute(this, "disabled");
    this.#curve
      .querySelector("fig-select")
      ?.setAttribute("variant", "ghost");
    for (const control of this.#curve.querySelectorAll(
      "fig-handle, fig-select, fig-dropdown, fig-input-text",
    )) {
      control.toggleAttribute("disabled", disabled);
    }
    for (const control of this.#curve.querySelectorAll("input, select")) {
      control.disabled = disabled;
    }
  }

  #bindEvents() {
    this.#unbindEvents();
    this.#curve?.addEventListener("input", this.#boundInput);
    this.#curve?.addEventListener("change", this.#boundChange);
  }

  #unbindEvents() {
    this.#curve?.removeEventListener("input", this.#boundInput);
    this.#curve?.removeEventListener("change", this.#boundChange);
  }

  #handlePrimitiveEvent(type, event) {
    event.stopImmediatePropagation();
    if (
      event.target !== this.#curve ||
      figLabBooleanAttribute(this, "disabled")
    ) {
      return;
    }
    const value = this.#normalizeValue(event.detail?.value, this.value);
    this.#reflectValue(value);
    this.#syncPrimitiveValue();
    figLabDispatchPropskitEvent(this, type);
  }

  get value() {
    return this.#normalizeValue(
      this.getAttribute("value"),
      this.#initialValue || this.#fallbackValue(),
    );
  }

  set value(value) {
    this.#reflectValue(value);
    this.#syncPrimitiveValue();
  }

  get defaultValue() {
    return this.#normalizeValue(
      this.getAttribute("default"),
      this.#initialValue || this.#fallbackValue(),
    );
  }

  get isDefault() {
    return figLabPropskitJsonValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    this.value = this.defaultValue;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    this.#curve
      ?.querySelector("fig-select, fig-dropdown, fig-handle, fig-input-text")
      ?.focus(options);
  }
}

/**
 * Labeled cubic-bezier easing editor with a typed { x1, y1, x2, y2 } value.
 */
class PropskitEasing extends PropskitCurve {}
figLabDefineElement("propskit-easing", PropskitEasing);

/**
 * Labeled spring editor with a typed { stiffness, damping, mass } value.
 */
class PropskitSpring extends PropskitCurve {}
figLabDefineElement("propskit-spring", PropskitSpring);

/**
 * Labeled image chooser with built-in upload and per-image removal actions.
 *
 * @attr {string} options - JSON array of image URLs.
 * @attr {string} value - Selected image URL.
 * @attr {string} default - Reset image URL.
 * @attr {string} label - Surface label. Omitted values use "Label"; empty hides it.
 * @attr {boolean|string} disabled - Disables uploading and image selection.
 * @fires input - Shared PropsKit event with the selected image URL.
 * @fires change - Shared PropsKit event with the selected image URL.
 */
class PropskitImage extends FigLabPropskitElement {
  static observedAttributes = [
    "options",
    "value",
    "default",
    "label",
    "aria-label",
    "disabled",
  ];

  #surface = null;
  #header = null;
  #label = null;
  #hasCustomLabel = false;
  #uploadButton = null;
  #fileInput = null;
  #chooser = null;
  #chooserObserver = null;
  #initialValue = "";
  #reflecting = false;
  #blobUrls = new Set();
  #uploadLabels = new Map();
  #boundChooserInput = this.#handleChooserEvent.bind(this, "input");
  #boundChooserChange = this.#handleChooserEvent.bind(this, "change");
  #boundFileInput = (event) => event.stopImmediatePropagation();
  #boundFileChange = this.#handleFileChange.bind(this);

  connectedCallback() {
    if (!this.#surface) {
      this.#initialValue = this.#resolveValue(this.getAttribute("value"));
      this.#reflectValue(this.#initialValue);
      this.#render();
    }
    this.#syncLabel();
    this.#syncChoices();
    this.#syncDisabled();
    this.#bindEvents();
    this.#chooserObserver?.observe(this.#chooser, { childList: true });
    this.#syncNavigationAccessibility();
    figLabConnectPropskitResetMenu(this);
  }

  disconnectedCallback() {
    this.#unbindEvents();
    this.#chooserObserver?.disconnect();
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "options") {
      this.#releaseRemovedBlobUrls();
      this.#syncChoices();
    } else if (name === "value" && !this.#reflecting) {
      this.#reflectValue(newValue);
    } else if (name === "label" || name === "aria-label") {
      this.#syncLabel();
    } else if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  #parseOptions(value = this.getAttribute("options")) {
    let parsed = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value || "[]");
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    const unique = new Set();
    for (const option of parsed) {
      if (typeof option !== "string") continue;
      const url = option.trim();
      if (url) unique.add(url);
    }
    return [...unique];
  }

  #resolveValue(value) {
    const options = this.#parseOptions();
    const requested = String(value ?? "").trim();
    if (requested && options.includes(requested)) return requested;
    return options[0] || "";
  }

  #reflectValue(value) {
    const resolved = this.#resolveValue(value);
    const current = this.getAttribute("value");
    if (resolved) {
      if (current !== resolved) {
        this.#reflecting = true;
        this.setAttribute("value", resolved);
        this.#reflecting = false;
      }
    } else if (current !== null) {
      this.#reflecting = true;
      this.removeAttribute("value");
      this.#reflecting = false;
    }
    if (this.#chooser) this.#chooser.value = resolved;
    return resolved;
  }

  #render() {
    const customLabel = this.querySelector(":scope > label");
    const surface = figLabCreateElement("div", {
      className: "propskit-image-surface",
      role: "group",
    });
    const header = figLabCreateElement("div", {
      className: "propskit-image-header",
    });
    const label = customLabel || document.createElement("label");
    const uploadTooltip = figLabCreateElement("fig-tooltip", {
      className: "propskit-image-upload-tooltip",
      text: "Upload image",
    });
    const uploadButton = figLabCreateElement("fig-button", {
      className: "propskit-image-upload",
      variant: "ghost",
      type: "upload",
      icon: true,
      "aria-label": "Upload images",
    });
    const uploadIcon = figLabCreateElement("fig-icon", {
      name: "upload",
      "aria-hidden": "true",
    });
    const fileInput = figLabCreateElement("input", {
      type: "file",
      accept: "image/*",
      multiple: true,
      "aria-label": "Upload images",
    });
    const chooser = figLabCreateElement("fig-chooser", {
      className: "propskit-image-chooser",
      layout: "grid",
      columns: "2",
      overflow: "buttons",
      full: true,
    });
    uploadButton.append(uploadIcon, fileInput);
    uploadTooltip.append(uploadButton);
    header.append(label, uploadTooltip);
    surface.append(header, chooser);
    this.#surface = surface;
    this.#header = header;
    this.#label = label;
    this.#hasCustomLabel = Boolean(customLabel);
    this.#uploadButton = uploadButton;
    this.#fileInput = fileInput;
    this.#chooser = chooser;
    this.#chooserObserver = new MutationObserver(() =>
      this.#syncNavigationAccessibility(),
    );
    this.replaceChildren(surface);
  }

  #syncLabel() {
    if (!this.#header || !this.#label || !this.#chooser || !this.#surface) {
      return;
    }
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#header,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#chooser, labelId, "Images");
    const explicitLabel = this.getAttribute("aria-label")?.trim();
    if (explicitLabel) {
      this.#surface.setAttribute("aria-label", explicitLabel);
      this.#surface.removeAttribute("aria-labelledby");
    } else if (labelId) {
      this.#surface.setAttribute("aria-labelledby", labelId);
      this.#surface.removeAttribute("aria-label");
    } else {
      this.#surface.setAttribute("aria-label", "Images");
      this.#surface.removeAttribute("aria-labelledby");
    }
  }

  #imageLabel(url, index) {
    const uploadedLabel = this.#uploadLabels.get(url);
    if (uploadedLabel) return uploadedLabel;
    try {
      const filename = new URL(url, document.baseURI).pathname
        .split("/")
        .filter(Boolean)
        .pop();
      if (filename) return decodeURIComponent(filename);
    } catch {}
    return `Image ${index + 1}`;
  }

  #syncChoices() {
    if (!this.#chooser) return;
    const options = this.#parseOptions();
    const selected = this.#resolveValue(this.getAttribute("value"));
    const choices = options.map((url, index) => {
      const label = this.#imageLabel(url, index);
      const choice = figLabCreateElement("fig-choice", {
        value: url,
        "aria-label": label,
        selected: url === selected,
      });
      const image = figLabCreateElement("fig-image", {
        src: url,
        alt: "",
        full: true,
        "aspect-ratio": "1 / 1",
        fit: "cover",
      });
      const removeTooltip = figLabCreateElement("fig-tooltip", {
        className: "propskit-image-remove-tooltip",
        text: "Remove image",
      });
      const removeButton = figLabCreateElement("span", {
        className: "propskit-image-remove",
        "aria-hidden": "true",
        "data-propskit-image-remove": "",
      });
      const removeIcon = figLabCreateElement("fig-icon", {
        name: "close",
        size: "small",
        "aria-hidden": "true",
      });
      removeButton.append(removeIcon);
      removeButton.addEventListener("click", (event) =>
        this.#removeOption(url, index, event),
      );
      choice.addEventListener("keydown", (event) => {
        if (event.key !== "Delete" && event.key !== "Backspace") return;
        this.#removeOption(url, index, event);
      });
      removeTooltip.append(removeButton);
      choice.dataset.propskitImageLabel = label;
      choice.append(image, removeTooltip);
      return choice;
    });
    this.#chooser.replaceChildren(...choices);
    this.#chooser.setAttribute("layout", "grid");
    this.#chooser.setAttribute("columns", "2");
    this.#chooser.setAttribute("overflow", "buttons");
    this.#chooser.toggleAttribute("hidden", choices.length === 0);
    this.#reflectValue(selected);
    this.#syncChoiceRemovalState();
    queueMicrotask(() => this.#syncNavigationAccessibility());
  }

  #syncChoiceRemovalState() {
    const disabled = figLabBooleanAttribute(this, "disabled");
    for (const choice of this.#chooser?.querySelectorAll(
      ":scope > fig-choice",
    ) || []) {
      if (disabled) {
        choice.removeAttribute("aria-description");
        choice.removeAttribute("aria-keyshortcuts");
      } else {
        choice.setAttribute(
          "aria-description",
          "Press Delete or Backspace to remove this image.",
        );
        choice.setAttribute("aria-keyshortcuts", "Delete Backspace");
      }
      const removeButton = choice.querySelector(
        ":scope > .propskit-image-remove-tooltip > .propskit-image-remove",
      );
      removeButton?.setAttribute("aria-hidden", "true");
    }
  }

  #syncNavigationAccessibility() {
    for (const button of this.#chooser?.querySelectorAll(
      ":scope > [data-fig-chooser-nav]",
    ) || []) {
      button.setAttribute("aria-hidden", "true");
    }
  }

  #syncDisabled() {
    if (
      !this.#surface ||
      !this.#uploadButton ||
      !this.#fileInput ||
      !this.#chooser
    ) {
      return;
    }
    const disabled = figLabBooleanAttribute(this, "disabled");
    this.#surface.setAttribute("aria-disabled", String(disabled));
    this.#uploadButton.toggleAttribute("disabled", disabled);
    this.#fileInput.disabled = disabled;
    this.#chooser.toggleAttribute("disabled", disabled);
    this.#chooser.inert = disabled;
    this.#syncChoiceRemovalState();
  }

  #bindEvents() {
    this.#unbindEvents();
    this.#chooser?.addEventListener("input", this.#boundChooserInput);
    this.#chooser?.addEventListener("change", this.#boundChooserChange);
    this.#fileInput?.addEventListener("input", this.#boundFileInput);
    this.#fileInput?.addEventListener("change", this.#boundFileChange);
  }

  #unbindEvents() {
    this.#chooser?.removeEventListener("input", this.#boundChooserInput);
    this.#chooser?.removeEventListener("change", this.#boundChooserChange);
    this.#fileInput?.removeEventListener("input", this.#boundFileInput);
    this.#fileInput?.removeEventListener("change", this.#boundFileChange);
  }

  #handleChooserEvent(type, event) {
    if (event.target !== this.#chooser) return;
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.#reflectValue(this.#chooser.value);
    figLabDispatchPropskitEvent(this, type, value);
  }

  #handleFileChange(event) {
    if (event.target !== this.#fileInput) return;
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const files = [...(this.#fileInput.files || [])].filter(
      (file) => !file.type || file.type.startsWith("image/"),
    );
    if (!files.length) return;
    const urls = files.map((file) => {
      const url = URL.createObjectURL(file);
      this.#blobUrls.add(url);
      this.#uploadLabels.set(url, file.name);
      return url;
    });
    this.options = [...this.options, ...urls];
    this.value = urls[0];
    this.#fileInput.value = "";
    for (const type of ["input", "change"]) {
      figLabDispatchPropskitEvent(this, type, this.value);
    }
  }

  #removeOption(url, index, event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const options = this.options;
    if (!options.includes(url)) return;
    const previousValue = this.value;
    const removedSelected = previousValue === url;
    this.options = options.filter((option) => option !== url);
    const value = this.value;
    if (value !== previousValue) {
      for (const type of ["input", "change"]) {
        figLabDispatchPropskitEvent(this, type, value);
      }
    }
    queueMicrotask(() => {
      const choices = [
        ...(this.#chooser?.querySelectorAll(":scope > fig-choice") || []),
      ];
      const target = removedSelected
        ? this.#chooser?.selectedChoice
        : choices[Math.min(index, choices.length - 1)];
      if (target instanceof HTMLElement) {
        target.focus();
      } else {
        this.#fileInput?.focus();
      }
    });
  }

  #releaseRemovedBlobUrls() {
    const options = new Set(this.#parseOptions());
    for (const url of this.#blobUrls) {
      if (options.has(url)) continue;
      URL.revokeObjectURL(url);
      this.#blobUrls.delete(url);
      this.#uploadLabels.delete(url);
    }
  }

  get options() {
    return this.#parseOptions();
  }

  set options(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("options");
      return;
    }
    this.setAttribute("options", JSON.stringify(this.#parseOptions(value)));
  }

  get value() {
    return this.#resolveValue(
      this.#chooser?.value ?? this.getAttribute("value"),
    );
  }

  set value(value) {
    this.#reflectValue(value);
  }

  get defaultValue() {
    const fallback = this.#initialValue || this.#resolveValue(null);
    return this.#resolveValue(
      this.hasAttribute("default") ? this.getAttribute("default") : fallback,
    );
  }

  get isDefault() {
    return figLabPropskitValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    this.value = this.defaultValue;
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    const choice =
      this.#chooser?.selectedChoice ||
      this.#chooser?.querySelector("fig-choice");
    if (choice instanceof HTMLElement) {
      choice.focus(options);
    } else {
      this.#fileInput?.focus(options);
    }
  }
}
figLabDefineElement("propskit-image", PropskitImage);

/**
 * Collapsible color-point group composed from color and position controls.
 *
 * @attr {string} label - Passed to the internal fig-group name.
 * @attr {boolean|string} collapsible - Internal group collapsibility; defaults true.
 * @attr {boolean|string} open - Internal group expanded state; defaults true.
 * @attr {boolean|string} disabled - Disables both internal controls.
 * @attr {string} value - JSON object with x, y, and color.
 * @fires input - Composed event with { x, y, color }.
 * @fires change - Composed event with { x, y, color }.
 * @fires openchange - Composed event mirroring the internal fig-group.
 */
class PropskitColorPoint extends FigLabPropskitElement {
  static observedAttributes = [
    "label",
    "collapsible",
    "open",
    "disabled",
    "value",
  ];

  #group = null;
  #colorControl = null;
  #positionControl = null;
  #initialized = false;
  #reflectingValue = false;
  #reflectingOpen = false;
  #boundHandleInput = this.#handleControlEvent.bind(this, "input");
  #boundHandleChange = this.#handleControlEvent.bind(this, "change");
  #boundHandleOpenChange = this.#handleOpenChange.bind(this);

  connectedCallback() {
    if (!this.#initialized) {
      this.#reflectValue(this.#readValue());
      this.#initialized = true;
    }
    if (!this.#group) this.#render();
    this.#syncGroupAttributes();
    this.#syncDisabled();
    this.#syncControls(this.#readValue());
    this.removeEventListener("input", this.#boundHandleInput);
    this.addEventListener("input", this.#boundHandleInput);
    this.removeEventListener("change", this.#boundHandleChange);
    this.addEventListener("change", this.#boundHandleChange);
    this.removeEventListener("openchange", this.#boundHandleOpenChange);
    this.addEventListener("openchange", this.#boundHandleOpenChange);
  }

  disconnectedCallback() {
    this.removeEventListener("input", this.#boundHandleInput);
    this.removeEventListener("change", this.#boundHandleChange);
    this.removeEventListener("openchange", this.#boundHandleOpenChange);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized) return;
    if (name === "value") {
      if (!this.#reflectingValue) {
        const value = this.#reflectValue(this.#readValue());
        this.#syncControls(value);
      }
      return;
    }
    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }
    this.#syncGroupAttributes();
  }

  #finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  #normalizeValue(value) {
    let source = value;
    if (typeof value === "string") {
      try {
        source = JSON.parse(value);
      } catch {
        source = null;
      }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      source = {};
    }
    return {
      x: this.#finiteNumber(source.x, 50),
      y: this.#finiteNumber(source.y, 50),
      color:
        typeof source.color === "string" && source.color.trim()
          ? source.color.trim()
          : "#D9D9D9",
    };
  }

  #readValue() {
    return this.#normalizeValue(this.getAttribute("value"));
  }

  #reflectValue(value) {
    const normalized = this.#normalizeValue(value);
    const serialized = JSON.stringify(normalized);
    if (this.getAttribute("value") === serialized) return normalized;
    this.#reflectingValue = true;
    this.setAttribute("value", serialized);
    this.#reflectingValue = false;
    return normalized;
  }

  #render() {
    const value = this.#readValue();
    const group = document.createElement("fig-group");
    const color = document.createElement("propskit-color");
    const position = document.createElement("propskit-position");
    group.setAttribute("compact", "");
    color.setAttribute("label", "Color");
    color.setAttribute("value", value.color);
    color.setAttribute("data-propskit-color-point-control", "color");
    position.setAttribute("label", "Position");
    position.setAttribute("x", String(value.x));
    position.setAttribute("y", String(value.y));
    position.setAttribute("units", "percent");
    position.setAttribute("data-propskit-color-point-control", "position");
    this.#group = group;
    this.#colorControl = color;
    this.#positionControl = position;
    this.#syncGroupAttributes();
    this.#syncDisabled();
    group.append(color, position);
    this.replaceChildren(group);
  }

  #syncGroupAttributes() {
    if (!this.#group) return;
    this.#group.setAttribute("compact", "");
    const label = this.getAttribute("label")?.trim();
    if (label) this.#group.setAttribute("name", label);
    else this.#group.removeAttribute("name");
    this.#group.toggleAttribute("collapsible", this.collapsible);
    if (this.collapsible) {
      this.#group.setAttribute("open", String(this.open));
    } else {
      this.#group.removeAttribute("open");
    }
  }

  #syncDisabled() {
    figLabSyncDisabledControls(this, [
      this.#colorControl,
      this.#positionControl,
    ]);
  }

  #syncControls(value) {
    const normalized = this.#normalizeValue(value);
    if (this.#colorControl) this.#colorControl.value = normalized.color;
    if (this.#positionControl) {
      this.#positionControl.value = {
        x: normalized.x,
        y: normalized.y,
      };
    }
  }

  #handleControlEvent(type, event) {
    if (event.target === this) return;
    const control = event.target?.closest?.(
      "[data-propskit-color-point-control]",
    );
    if (!control || !this.contains(control)) return;
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.value;
    const kind = control.getAttribute("data-propskit-color-point-control");
    if (kind === "color") {
      value.color = control.value || control.getAttribute("value");
    } else if (kind === "position") {
      value.x = this.#finiteNumber(control.value?.x, value.x);
      value.y = this.#finiteNumber(control.value?.y, value.y);
    } else {
      return;
    }
    this.#reflectValue(value);
    figLabDispatchPropskitEvent(this, type);
  }

  #handleOpenChange(event) {
    if (event.target !== this.#group || this.#reflectingOpen) return;
    event.stopImmediatePropagation();
    const open = Boolean(event.detail?.open);
    this.#reflectingOpen = true;
    this.setAttribute("open", String(open));
    this.#reflectingOpen = false;
    this.dispatchEvent(
      new CustomEvent("openchange", {
        detail: { open },
        bubbles: true,
        composed: true,
      }),
    );
  }

  get collapsible() {
    const value = this.getAttribute("collapsible");
    return value === null || value !== "false";
  }

  set collapsible(value) {
    this.setAttribute("collapsible", String(Boolean(value)));
  }

  get open() {
    const value = this.getAttribute("open");
    return value === null || value !== "false";
  }

  set open(value) {
    this.setAttribute("open", String(Boolean(value)));
  }

  get value() {
    return { ...this.#readValue() };
  }

  set value(value) {
    const normalized = this.#reflectValue(value);
    this.#syncControls(normalized);
  }

  focus(options) {
    this.#colorControl?.focus(options);
  }
}
figLabDefineElement("propskit-color-point", PropskitColorPoint);

/**
 * Collapsible point-radius group composed from position and number controls.
 *
 * @attr {string} label - Passed to the internal fig-group name.
 * @attr {boolean|string} collapsible - Internal group collapsibility; defaults true.
 * @attr {boolean|string} open - Internal group expanded state; defaults true.
 * @attr {string} units - Passed to the internal position and radius controls.
 * @attr {boolean|string} disabled - Disables both internal controls.
 * @attr {string} value - JSON object with x, y, and radius.
 * @fires input - Composed event with { x, y, radius }.
 * @fires change - Composed event with { x, y, radius }.
 * @fires openchange - Composed event mirroring the internal fig-group.
 */
class PropskitPointRadius extends FigLabPropskitElement {
  static observedAttributes = [
    "label",
    "collapsible",
    "open",
    "units",
    "disabled",
    "value",
  ];

  #group = null;
  #positionControl = null;
  #radiusControl = null;
  #initialized = false;
  #reflectingValue = false;
  #reflectingOpen = false;
  #boundHandleInput = this.#handleControlEvent.bind(this, "input");
  #boundHandleChange = this.#handleControlEvent.bind(this, "change");
  #boundHandleOpenChange = this.#handleOpenChange.bind(this);

  connectedCallback() {
    if (!this.#initialized) {
      this.#reflectValue(this.#readValue());
      this.#initialized = true;
    }
    if (!this.#group) this.#render();
    this.#syncGroupAttributes();
    this.#syncUnits();
    this.#syncDisabled();
    this.#syncControls(this.#readValue());
    this.removeEventListener("input", this.#boundHandleInput);
    this.addEventListener("input", this.#boundHandleInput);
    this.removeEventListener("change", this.#boundHandleChange);
    this.addEventListener("change", this.#boundHandleChange);
    this.removeEventListener("openchange", this.#boundHandleOpenChange);
    this.addEventListener("openchange", this.#boundHandleOpenChange);
  }

  disconnectedCallback() {
    this.removeEventListener("input", this.#boundHandleInput);
    this.removeEventListener("change", this.#boundHandleChange);
    this.removeEventListener("openchange", this.#boundHandleOpenChange);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized) return;
    if (name === "value") {
      if (!this.#reflectingValue) {
        const value = this.#reflectValue(this.#readValue());
        this.#syncControls(value);
      }
      return;
    }
    if (name === "units") {
      this.#syncUnits();
      return;
    }
    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }
    this.#syncGroupAttributes();
  }

  #finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  #normalizeRadius(value) {
    if (typeof value === "string" && value.trim().endsWith("%")) {
      const number = Number.parseFloat(value);
      if (Number.isFinite(number)) return `${number}%`;
    }
    return this.#finiteNumber(value, 0);
  }

  #normalizeValue(value) {
    let source = value;
    if (typeof value === "string") {
      try {
        source = JSON.parse(value);
      } catch {
        source = null;
      }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      source = {};
    }
    return {
      x: this.#finiteNumber(source.x, 50),
      y: this.#finiteNumber(source.y, 50),
      radius: this.#normalizeRadius(source.radius),
    };
  }

  #readValue() {
    return this.#normalizeValue(this.getAttribute("value"));
  }

  #reflectValue(value) {
    const normalized = this.#normalizeValue(value);
    const serialized = JSON.stringify(normalized);
    if (this.getAttribute("value") === serialized) return normalized;
    this.#reflectingValue = true;
    this.setAttribute("value", serialized);
    this.#reflectingValue = false;
    return normalized;
  }

  #radiusParts(radius) {
    const percent =
      typeof radius === "string" && radius.trim().endsWith("%");
    return {
      value: percent ? Number.parseFloat(radius) : radius,
      units: percent ? "%" : "px",
    };
  }

  #render() {
    const value = this.#readValue();
    const radiusValue = this.#radiusParts(value.radius);
    const group = document.createElement("fig-group");
    const position = document.createElement("propskit-position");
    const radius = document.createElement("propskit-number");
    group.setAttribute("compact", "");
    position.setAttribute("label", "Position");
    position.setAttribute("x", String(value.x));
    position.setAttribute("y", String(value.y));
    if (this.hasAttribute("units")) position.setAttribute("units", this.units);
    position.setAttribute("data-propskit-point-radius-control", "position");
    radius.setAttribute("label", "Radius");
    radius.setAttribute("value", String(radiusValue.value));
    if (this.units === "percent") radius.setAttribute("units", "%");
    radius.setAttribute("units-disallow", "");
    radius.setAttribute("min", "0");
    radius.setAttribute("precision", "2");
    radius.setAttribute("data-propskit-point-radius-control", "radius");
    this.#group = group;
    this.#positionControl = position;
    this.#radiusControl = radius;
    this.#syncGroupAttributes();
    this.#syncDisabled();
    group.append(position, radius);
    this.replaceChildren(group);
  }

  #syncGroupAttributes() {
    if (!this.#group) return;
    this.#group.setAttribute("compact", "");
    const label = this.getAttribute("label")?.trim();
    if (label) this.#group.setAttribute("name", label);
    else this.#group.removeAttribute("name");
    this.#group.toggleAttribute("collapsible", this.collapsible);
    if (this.collapsible) {
      this.#group.setAttribute("open", String(this.open));
    } else {
      this.#group.removeAttribute("open");
    }
  }

  #syncUnits() {
    if (this.hasAttribute("units")) {
      this.#positionControl?.setAttribute("units", this.units);
    } else {
      this.#positionControl?.removeAttribute("units");
    }
    if (this.units === "percent") {
      this.#radiusControl?.setAttribute("units", "%");
    } else {
      this.#radiusControl?.removeAttribute("units");
    }
  }

  #syncDisabled() {
    figLabSyncDisabledControls(this, [
      this.#positionControl,
      this.#radiusControl,
    ]);
  }

  #syncControls(value) {
    const normalized = this.#normalizeValue(value);
    if (this.#positionControl) {
      this.#positionControl.value = {
        x: normalized.x,
        y: normalized.y,
      };
    }
    if (this.#radiusControl) {
      const radius = this.#radiusParts(normalized.radius);
      this.#radiusControl.value = radius.value;
    }
  }

  #radiusFromControl(control, fallback) {
    const fallbackValue = this.#radiusParts(fallback).value;
    const value = this.#finiteNumber(control.value, fallbackValue);
    const units =
      control.querySelector("fig-input-number")?.getAttribute("units") ||
      control.getAttribute("units");
    return units === "%" ? `${value}%` : value;
  }

  #handleControlEvent(type, event) {
    if (event.target === this) return;
    const control = event.target?.closest?.(
      "[data-propskit-point-radius-control]",
    );
    if (!control || !this.contains(control)) return;
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.value;
    const kind = control.getAttribute("data-propskit-point-radius-control");
    if (kind === "position") {
      value.x = this.#finiteNumber(control.value?.x, value.x);
      value.y = this.#finiteNumber(control.value?.y, value.y);
    } else if (kind === "radius") {
      value.radius = this.#radiusFromControl(control, value.radius);
    } else {
      return;
    }
    this.#reflectValue(value);
    figLabDispatchPropskitEvent(this, type);
  }

  #handleOpenChange(event) {
    if (event.target !== this.#group || this.#reflectingOpen) return;
    event.stopImmediatePropagation();
    const open = Boolean(event.detail?.open);
    this.#reflectingOpen = true;
    this.setAttribute("open", String(open));
    this.#reflectingOpen = false;
    this.dispatchEvent(
      new CustomEvent("openchange", {
        detail: { open },
        bubbles: true,
        composed: true,
      }),
    );
  }

  get collapsible() {
    const value = this.getAttribute("collapsible");
    return value === null || value !== "false";
  }

  set collapsible(value) {
    this.setAttribute("collapsible", String(Boolean(value)));
  }

  get open() {
    const value = this.getAttribute("open");
    return value === null || value !== "false";
  }

  set open(value) {
    this.setAttribute("open", String(Boolean(value)));
  }

  get units() {
    return this.getAttribute("units")?.trim().toLowerCase() === "percent"
      ? "percent"
      : "none";
  }

  set units(value) {
    this.setAttribute(
      "units",
      String(value).trim().toLowerCase() === "none" ? "none" : "percent",
    );
  }

  get value() {
    return { ...this.#readValue() };
  }

  set value(value) {
    const normalized = this.#reflectValue(value);
    this.#syncControls(normalized);
  }

  focus(options) {
    this.#positionControl?.focus(options);
  }
}
figLabDefineElement("propskit-point-radius", PropskitPointRadius);

/**
 * Collapsible point-radius-angle group composed from PropsKit controls.
 *
 * @attr {string} label - Passed to the internal fig-group name.
 * @attr {boolean|string} collapsible - Internal group collapsibility; defaults true.
 * @attr {boolean|string} open - Internal group expanded state; defaults true.
 * @attr {string} units - Passed to the internal position and radius controls.
 * @attr {boolean|string} disabled - Disables every internal control.
 * @attr {string} value - JSON object with x, y, radius, and angle.
 * @fires input - Composed event with { x, y, radius, angle }.
 * @fires change - Composed event with { x, y, radius, angle }.
 * @fires openchange - Composed event mirroring the internal fig-group.
 */
class PropskitPointRadiusAngle extends FigLabPropskitElement {
  static observedAttributes = [
    "label",
    "collapsible",
    "open",
    "units",
    "disabled",
    "value",
  ];

  #group = null;
  #positionControl = null;
  #radiusControl = null;
  #angleControl = null;
  #initialized = false;
  #reflectingValue = false;
  #reflectingOpen = false;
  #boundHandleInput = this.#handleControlEvent.bind(this, "input");
  #boundHandleChange = this.#handleControlEvent.bind(this, "change");
  #boundHandleOpenChange = this.#handleOpenChange.bind(this);

  connectedCallback() {
    if (!this.#initialized) {
      this.#reflectValue(this.#readValue());
      this.#initialized = true;
    }
    if (!this.#group) this.#render();
    this.#syncGroupAttributes();
    this.#syncUnits();
    this.#syncDisabled();
    this.#syncControls(this.#readValue());
    this.removeEventListener("input", this.#boundHandleInput);
    this.addEventListener("input", this.#boundHandleInput);
    this.removeEventListener("change", this.#boundHandleChange);
    this.addEventListener("change", this.#boundHandleChange);
    this.removeEventListener("openchange", this.#boundHandleOpenChange);
    this.addEventListener("openchange", this.#boundHandleOpenChange);
  }

  disconnectedCallback() {
    this.removeEventListener("input", this.#boundHandleInput);
    this.removeEventListener("change", this.#boundHandleChange);
    this.removeEventListener("openchange", this.#boundHandleOpenChange);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized) return;
    if (name === "value") {
      if (!this.#reflectingValue) {
        const value = this.#reflectValue(this.#readValue());
        this.#syncControls(value);
      }
      return;
    }
    if (name === "units") {
      this.#syncUnits();
      return;
    }
    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }
    this.#syncGroupAttributes();
  }

  #finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  #normalizeRadius(value) {
    if (typeof value === "string" && value.trim().endsWith("%")) {
      const number = Number.parseFloat(value);
      if (Number.isFinite(number)) return `${number}%`;
    }
    return this.#finiteNumber(value, 0);
  }

  #normalizeValue(value) {
    let source = value;
    if (typeof value === "string") {
      try {
        source = JSON.parse(value);
      } catch {
        source = null;
      }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      source = {};
    }
    return {
      x: this.#finiteNumber(source.x, 50),
      y: this.#finiteNumber(source.y, 50),
      radius: this.#normalizeRadius(source.radius),
      angle: this.#finiteNumber(source.angle, 0),
    };
  }

  #readValue() {
    return this.#normalizeValue(this.getAttribute("value"));
  }

  #reflectValue(value) {
    const normalized = this.#normalizeValue(value);
    const serialized = JSON.stringify(normalized);
    if (this.getAttribute("value") === serialized) return normalized;
    this.#reflectingValue = true;
    this.setAttribute("value", serialized);
    this.#reflectingValue = false;
    return normalized;
  }

  #radiusParts(radius) {
    const percent =
      typeof radius === "string" && radius.trim().endsWith("%");
    return {
      value: percent ? Number.parseFloat(radius) : radius,
      units: percent ? "%" : "px",
    };
  }

  #render() {
    const value = this.#readValue();
    const radiusValue = this.#radiusParts(value.radius);
    const group = document.createElement("fig-group");
    const position = document.createElement("propskit-position");
    const radius = document.createElement("propskit-number");
    const angle = document.createElement("propskit-number");
    group.setAttribute("compact", "");
    position.setAttribute("label", "Position");
    position.setAttribute("x", String(value.x));
    position.setAttribute("y", String(value.y));
    if (this.hasAttribute("units")) position.setAttribute("units", this.units);
    position.setAttribute(
      "data-propskit-point-radius-angle-control",
      "position",
    );
    radius.setAttribute("label", "Radius");
    radius.setAttribute("value", String(radiusValue.value));
    if (this.units === "percent") radius.setAttribute("units", "%");
    radius.setAttribute("units-disallow", "");
    radius.setAttribute("min", "0");
    radius.setAttribute("precision", "2");
    radius.setAttribute("data-propskit-point-radius-angle-control", "radius");
    angle.setAttribute("label", "Angle");
    angle.setAttribute("value", String(value.angle));
    angle.setAttribute("units", "°");
    angle.setAttribute("units-disallow", "");
    angle.setAttribute("precision", "1");
    angle.setAttribute("data-propskit-point-radius-angle-control", "angle");
    this.#group = group;
    this.#positionControl = position;
    this.#radiusControl = radius;
    this.#angleControl = angle;
    this.#syncGroupAttributes();
    this.#syncDisabled();
    group.append(position, radius, angle);
    this.replaceChildren(group);
  }

  #syncGroupAttributes() {
    if (!this.#group) return;
    this.#group.setAttribute("compact", "");
    const label = this.getAttribute("label")?.trim();
    if (label) this.#group.setAttribute("name", label);
    else this.#group.removeAttribute("name");
    this.#group.toggleAttribute("collapsible", this.collapsible);
    if (this.collapsible) {
      this.#group.setAttribute("open", String(this.open));
    } else {
      this.#group.removeAttribute("open");
    }
  }

  #syncUnits() {
    if (this.hasAttribute("units")) {
      this.#positionControl?.setAttribute("units", this.units);
    } else {
      this.#positionControl?.removeAttribute("units");
    }
    if (this.units === "percent") {
      this.#radiusControl?.setAttribute("units", "%");
    } else {
      this.#radiusControl?.removeAttribute("units");
    }
  }

  #syncDisabled() {
    figLabSyncDisabledControls(this, [
      this.#positionControl,
      this.#radiusControl,
      this.#angleControl,
    ]);
  }

  #syncControls(value) {
    const normalized = this.#normalizeValue(value);
    if (this.#positionControl) {
      this.#positionControl.value = {
        x: normalized.x,
        y: normalized.y,
      };
    }
    if (this.#radiusControl) {
      const radius = this.#radiusParts(normalized.radius);
      this.#radiusControl.value = radius.value;
    }
    if (this.#angleControl) {
      this.#angleControl.value = normalized.angle;
    }
  }

  #radiusFromControl(control, fallback) {
    const fallbackValue = this.#radiusParts(fallback).value;
    const value = this.#finiteNumber(control.value, fallbackValue);
    const units =
      control.querySelector("fig-input-number")?.getAttribute("units") ||
      control.getAttribute("units");
    return units === "%" ? `${value}%` : value;
  }

  #handleControlEvent(type, event) {
    if (event.target === this) return;
    const control = event.target?.closest?.(
      "[data-propskit-point-radius-angle-control]",
    );
    if (!control || !this.contains(control)) return;
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.value;
    const kind = control.getAttribute(
      "data-propskit-point-radius-angle-control",
    );
    if (kind === "position") {
      value.x = this.#finiteNumber(control.value?.x, value.x);
      value.y = this.#finiteNumber(control.value?.y, value.y);
    } else if (kind === "radius") {
      value.radius = this.#radiusFromControl(control, value.radius);
    } else if (kind === "angle") {
      value.angle = this.#finiteNumber(control.value, value.angle);
    } else {
      return;
    }
    this.#reflectValue(value);
    figLabDispatchPropskitEvent(this, type);
  }

  #handleOpenChange(event) {
    if (event.target !== this.#group || this.#reflectingOpen) return;
    event.stopImmediatePropagation();
    const open = Boolean(event.detail?.open);
    this.#reflectingOpen = true;
    this.setAttribute("open", String(open));
    this.#reflectingOpen = false;
    this.dispatchEvent(
      new CustomEvent("openchange", {
        detail: { open },
        bubbles: true,
        composed: true,
      }),
    );
  }

  get collapsible() {
    const value = this.getAttribute("collapsible");
    return value === null || value !== "false";
  }

  set collapsible(value) {
    this.setAttribute("collapsible", String(Boolean(value)));
  }

  get open() {
    const value = this.getAttribute("open");
    return value === null || value !== "false";
  }

  set open(value) {
    this.setAttribute("open", String(Boolean(value)));
  }

  get units() {
    return this.getAttribute("units")?.trim().toLowerCase() === "percent"
      ? "percent"
      : "none";
  }

  set units(value) {
    this.setAttribute(
      "units",
      String(value).trim().toLowerCase() === "none" ? "none" : "percent",
    );
  }

  get value() {
    return { ...this.#readValue() };
  }

  set value(value) {
    const normalized = this.#reflectValue(value);
    this.#syncControls(normalized);
  }

  focus(options) {
    this.#positionControl?.focus(options);
  }
}
figLabDefineElement(
  "propskit-point-radius-angle",
  PropskitPointRadiusAngle,
);

/**
 * Collapsible point-point group composed from two position controls.
 *
 * @attr {string} label - Passed to the internal fig-group name.
 * @attr {boolean|string} collapsible - Internal group collapsibility; defaults true.
 * @attr {boolean|string} open - Internal group expanded state; defaults true.
 * @attr {string} units - Passed to both internal position controls.
 * @attr {boolean|string} disabled - Disables both internal position controls.
 * @attr {string} value - JSON object with x, y, x2, and y2.
 * @fires input - Composed event with { x, y, x2, y2 }.
 * @fires change - Composed event with { x, y, x2, y2 }.
 * @fires openchange - Composed event mirroring the internal fig-group.
 */
class PropskitPointPoint extends FigLabPropskitElement {
  static observedAttributes = [
    "label",
    "collapsible",
    "open",
    "units",
    "disabled",
    "value",
  ];

  #group = null;
  #startControl = null;
  #endControl = null;
  #initialized = false;
  #reflectingValue = false;
  #reflectingOpen = false;
  #boundHandleInput = this.#handleControlEvent.bind(this, "input");
  #boundHandleChange = this.#handleControlEvent.bind(this, "change");
  #boundHandleOpenChange = this.#handleOpenChange.bind(this);

  connectedCallback() {
    if (!this.#initialized) {
      this.#reflectValue(this.#readValue());
      this.#initialized = true;
    }
    if (!this.#group) this.#render();
    this.#syncGroupAttributes();
    this.#syncUnits();
    this.#syncDisabled();
    this.#syncControls(this.#readValue());
    this.removeEventListener("input", this.#boundHandleInput);
    this.addEventListener("input", this.#boundHandleInput);
    this.removeEventListener("change", this.#boundHandleChange);
    this.addEventListener("change", this.#boundHandleChange);
    this.removeEventListener("openchange", this.#boundHandleOpenChange);
    this.addEventListener("openchange", this.#boundHandleOpenChange);
  }

  disconnectedCallback() {
    this.removeEventListener("input", this.#boundHandleInput);
    this.removeEventListener("change", this.#boundHandleChange);
    this.removeEventListener("openchange", this.#boundHandleOpenChange);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized) return;
    if (name === "value") {
      if (!this.#reflectingValue) {
        const value = this.#reflectValue(this.#readValue());
        this.#syncControls(value);
      }
      return;
    }
    if (name === "units") {
      this.#syncUnits();
      return;
    }
    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }
    this.#syncGroupAttributes();
  }

  #finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  #normalizeValue(value) {
    let source = value;
    if (typeof value === "string") {
      try {
        source = JSON.parse(value);
      } catch {
        source = null;
      }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      source = {};
    }
    return {
      x: this.#finiteNumber(source.x, 50),
      y: this.#finiteNumber(source.y, 50),
      x2: this.#finiteNumber(source.x2, 75),
      y2: this.#finiteNumber(source.y2, 75),
    };
  }

  #readValue() {
    return this.#normalizeValue(this.getAttribute("value"));
  }

  #reflectValue(value) {
    const normalized = this.#normalizeValue(value);
    const serialized = JSON.stringify(normalized);
    if (this.getAttribute("value") === serialized) return normalized;
    this.#reflectingValue = true;
    this.setAttribute("value", serialized);
    this.#reflectingValue = false;
    return normalized;
  }

  #createPosition(label, role, x, y) {
    const control = document.createElement("propskit-position");
    control.setAttribute("label", label);
    control.setAttribute("x", String(x));
    control.setAttribute("y", String(y));
    if (this.hasAttribute("units")) control.setAttribute("units", this.units);
    control.setAttribute("data-propskit-point-point-control", role);
    return control;
  }

  #render() {
    const value = this.#readValue();
    const group = document.createElement("fig-group");
    const start = this.#createPosition("Start", "start", value.x, value.y);
    const end = this.#createPosition("End", "end", value.x2, value.y2);
    group.setAttribute("compact", "");
    this.#group = group;
    this.#startControl = start;
    this.#endControl = end;
    this.#syncGroupAttributes();
    this.#syncDisabled();
    group.append(start, end);
    this.replaceChildren(group);
  }

  #syncGroupAttributes() {
    if (!this.#group) return;
    this.#group.setAttribute("compact", "");
    const label = this.getAttribute("label")?.trim();
    if (label) this.#group.setAttribute("name", label);
    else this.#group.removeAttribute("name");
    this.#group.toggleAttribute("collapsible", this.collapsible);
    if (this.collapsible) {
      this.#group.setAttribute("open", String(this.open));
    } else {
      this.#group.removeAttribute("open");
    }
  }

  #syncUnits() {
    for (const control of [this.#startControl, this.#endControl]) {
      if (!control) continue;
      if (this.hasAttribute("units")) control.setAttribute("units", this.units);
      else control.removeAttribute("units");
    }
  }

  #syncDisabled() {
    figLabSyncDisabledControls(this, [
      this.#startControl,
      this.#endControl,
    ]);
  }

  #syncControls(value) {
    const normalized = this.#normalizeValue(value);
    if (this.#startControl) {
      this.#startControl.value = {
        x: normalized.x,
        y: normalized.y,
      };
    }
    if (this.#endControl) {
      this.#endControl.value = {
        x: normalized.x2,
        y: normalized.y2,
      };
    }
  }

  #handleControlEvent(type, event) {
    if (event.target === this) return;
    const control = event.target?.closest?.(
      "[data-propskit-point-point-control]",
    );
    if (!control || !this.contains(control)) return;
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const value = this.value;
    const point = control.value;
    const role = control.getAttribute("data-propskit-point-point-control");
    if (role === "start") {
      value.x = this.#finiteNumber(point?.x, value.x);
      value.y = this.#finiteNumber(point?.y, value.y);
    } else if (role === "end") {
      value.x2 = this.#finiteNumber(point?.x, value.x2);
      value.y2 = this.#finiteNumber(point?.y, value.y2);
    } else {
      return;
    }
    this.#reflectValue(value);
    figLabDispatchPropskitEvent(this, type);
  }

  #handleOpenChange(event) {
    if (event.target !== this.#group || this.#reflectingOpen) return;
    event.stopImmediatePropagation();
    const open = Boolean(event.detail?.open);
    this.#reflectingOpen = true;
    this.setAttribute("open", String(open));
    this.#reflectingOpen = false;
    this.dispatchEvent(
      new CustomEvent("openchange", {
        detail: { open },
        bubbles: true,
        composed: true,
      }),
    );
  }

  get collapsible() {
    const value = this.getAttribute("collapsible");
    return value === null || value !== "false";
  }

  set collapsible(value) {
    this.setAttribute("collapsible", String(Boolean(value)));
  }

  get open() {
    const value = this.getAttribute("open");
    return value === null || value !== "false";
  }

  set open(value) {
    this.setAttribute("open", String(Boolean(value)));
  }

  get units() {
    return this.getAttribute("units")?.trim().toLowerCase() === "percent"
      ? "percent"
      : "none";
  }

  set units(value) {
    this.setAttribute(
      "units",
      String(value).trim().toLowerCase() === "none" ? "none" : "percent",
    );
  }

  get value() {
    return { ...this.#readValue() };
  }

  set value(value) {
    const normalized = this.#reflectValue(value);
    this.#syncControls(normalized);
  }

  focus(options) {
    this.#startControl?.focus(options);
  }
}
figLabDefineElement("propskit-point-point", PropskitPointPoint);

/* Collapsible property group — always collapsible (no collapsible attr). */
class PropskitGroup extends FigLabPropskitElement {
  static observedAttributes = ["name", "open", "show-reset", "disabled"];

  static #CONTROL_SELECTOR = [
    "propskit-color",
    "propskit-fill",
    "propskit-gradient",
    "propskit-easing",
    "propskit-image",
    "propskit-joystick",
    "propskit-number",
    "propskit-origin",
    "propskit-position",
    "propskit-color-point",
    "propskit-point-radius",
    "propskit-point-radius-angle",
    "propskit-point-point",
    "propskit-editable-select",
    "propskit-select",
    "propskit-slider",
    "propskit-spring",
    "propskit-switch",
    "propskit-text",
    "propskit-wheel",
    "propskit-oscillator",
  ].join(",");

  #header = null;
  #chevron = null;
  #resetTooltip = null;
  #childObserver = null;
  #dirtyFrame = 0;
  #boundOnControlEvent = () => this.#queueDirtySync();

  connectedCallback() {
    this.#render();
    this.#syncDisabled();
    this.#bindDirtyListeners();
    requestAnimationFrame(() => {
      this.#syncDirtyState();
    });
  }

  disconnectedCallback() {
    this.#unbindDirtyListeners();
    if (this.#dirtyFrame) {
      cancelAnimationFrame(this.#dirtyFrame);
      this.#dirtyFrame = 0;
    }
    this.#header?.removeEventListener("click", this.#handleToggle);
    this.#header?.removeEventListener("keydown", this.#handleHeaderKeyDown);
    const resetBtn = this.#resetTooltip?.querySelector("fig-button");
    resetBtn?.removeEventListener("click", this.#handleReset);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "open") {
      this.#header?.setAttribute("aria-expanded", String(this.open));
      return;
    }
    if (name === "show-reset") {
      this.#syncResetButton();
      this.#syncDirtyState();
      return;
    }
    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }
    this.#render();
  }

  get open() {
    const attr = this.getAttribute("open");
    return attr !== null && attr !== "false";
  }

  set open(value) {
    const was = this.open;
    if (value) {
      this.setAttribute("open", "true");
    } else {
      this.setAttribute("open", "false");
    }
    this.#header?.setAttribute("aria-expanded", String(!!value));
    if (was !== !!value) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: !!value },
          bubbles: true,
        }),
      );
    }
  }

  /** When true (default), show the reset control while the group is dirty. */
  get showReset() {
    const attr = this.getAttribute("show-reset");
    if (attr === null) return true;
    return attr !== "false";
  }

  set showReset(value) {
    if (value) this.setAttribute("show-reset", "true");
    else this.setAttribute("show-reset", "false");
  }

  get dirty() {
    return this.hasAttribute("data-dirty") && this.getAttribute("data-dirty") !== "false";
  }

  /** Restore all propskit controls in this group to their captured defaults. */
  resetProperties() {
    this.#resetControls();
  }

  #bindDirtyListeners() {
    this.removeEventListener("input", this.#boundOnControlEvent, true);
    this.removeEventListener("change", this.#boundOnControlEvent, true);
    this.addEventListener("input", this.#boundOnControlEvent, true);
    this.addEventListener("change", this.#boundOnControlEvent, true);

    if (!this.#childObserver) {
      this.#childObserver = new MutationObserver(() => {
        this.#syncDisabled();
        this.#queueDirtySync();
      });
    }
    this.#childObserver.disconnect();
    this.#childObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["value", "checked", "default", "x", "y"],
    });
  }

  #unbindDirtyListeners() {
    this.removeEventListener("input", this.#boundOnControlEvent, true);
    this.removeEventListener("change", this.#boundOnControlEvent, true);
    this.#childObserver?.disconnect();
  }

  #queueDirtySync() {
    if (this.#dirtyFrame) return;
    this.#dirtyFrame = requestAnimationFrame(() => {
      this.#dirtyFrame = 0;
      this.#syncDirtyState();
    });
  }

  #isResetTarget(target) {
    return (
      target instanceof Element &&
      Boolean(
        target.closest(
          ".propskit-group-reset, .propskit-group-reset-tooltip",
        ),
      )
    );
  }

  #handleToggle = (e) => {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (this.#isResetTarget(e.target)) return;
    e.stopPropagation();
    this.open = !this.open;
  };

  #handleHeaderKeyDown = (e) => {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (this.#isResetTarget(e.target)) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    this.open = !this.open;
  };

  #handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    this.#resetControls();
  };

  #controls() {
    return [
      ...this.querySelectorAll(PropskitGroup.#CONTROL_SELECTOR),
    ].filter(
      (el) =>
        el.closest("propskit-group") === this &&
        !el.parentElement?.closest(PropskitGroup.#CONTROL_SELECTOR),
    );
  }

  #syncDisabled() {
    const disabled = figLabBooleanAttribute(this, "disabled");
    for (const control of this.#controls()) {
      if (disabled) {
        if (!figLabBooleanAttribute(control, "disabled")) {
          control.setAttribute("disabled", "");
          control.setAttribute("data-propskit-group-disabled", "");
        }
      } else if (control.hasAttribute("data-propskit-group-disabled")) {
        control.removeAttribute("disabled");
        control.removeAttribute("data-propskit-group-disabled");
      }
    }
    this.#header?.setAttribute("aria-disabled", String(disabled));
    this.#header?.setAttribute("tabindex", disabled ? "-1" : "0");
    this.#resetTooltip
      ?.querySelector("fig-button")
      ?.toggleAttribute("disabled", disabled);
  }

  #controlIsDirty(el) {
    return el.isDefault === false;
  }

  #computeDirty() {
    for (const el of this.#controls()) {
      if (this.#controlIsDirty(el)) return true;
    }
    return false;
  }

  #syncDirtyState() {
    const dirty = this.#computeDirty();
    if (dirty) this.setAttribute("data-dirty", "");
    else this.removeAttribute("data-dirty");
    this.#syncResetButton();
  }

  #restoreControl(el) {
    if (typeof el.resetToDefault === "function") {
      el.resetToDefault();
    }
  }

  #resetControls() {
    for (const el of this.#controls()) this.#restoreControl(el);
    this.#syncDirtyState();
    this.dispatchEvent(
      new CustomEvent("reset", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  #syncResetButton() {
    if (!this.showReset) {
      this.#resetTooltip?.setAttribute("hidden", "");
      return;
    }
    this.#ensureResetButton();
    this.#resetTooltip?.removeAttribute("hidden");
  }

  #ensureResetButton() {
    if (!this.#header || !this.showReset) return;
    let tip = this.#header.querySelector(":scope > .propskit-group-reset-tooltip");
    if (!tip) {
      tip = document.createElement("fig-tooltip");
      tip.className = "propskit-group-reset-tooltip";
      tip.setAttribute("text", "Reset properties");
      const btn = document.createElement("fig-button");
      btn.className = "propskit-group-reset";
      btn.setAttribute("variant", "ghost");
      btn.setAttribute("icon", "");
      btn.setAttribute("aria-label", "Reset properties");
      const icon = document.createElement("fig-icon");
      icon.setAttribute("name", "reset");
      btn.appendChild(icon);
      tip.appendChild(btn);
      this.#header.appendChild(tip);
      btn.addEventListener("click", this.#handleReset);
    } else {
      const btn = tip.querySelector("fig-button");
      btn?.removeEventListener("click", this.#handleReset);
      btn?.addEventListener("click", this.#handleReset);
    }
    this.#resetTooltip = tip;
  }

  #render() {
    const nameAttr = this.getAttribute("name");
    const label = nameAttr || "Group";
    const userHeader = this.querySelector(":scope > fig-header");

    if (userHeader) {
      this.#header = userHeader;
    } else if (
      !this.#header ||
      !this.#header.dataset.generated ||
      this.#header.parentElement !== this
    ) {
      this.#header = document.createElement("fig-header");
      this.#header.setAttribute("borderless", "");
      this.#header.dataset.generated = "true";
      this.prepend(this.#header);
    }

    let h3 = this.#header.querySelector(":scope > h3");
    const legacyDisclosure = this.#header.querySelector(
      ":scope > fig-button.propskit-group-disclosure",
    );
    if (!h3 && legacyDisclosure) {
      h3 = legacyDisclosure.querySelector(":scope > h3");
      if (h3) this.#header.insertBefore(h3, legacyDisclosure);
      legacyDisclosure.remove();
    }
    if (!h3) {
      h3 = document.createElement("h3");
      this.#header.prepend(h3);
    }

    const disclosure = h3.querySelector(
      ":scope > button.propskit-group-disclosure",
    );
    if (disclosure) {
      while (disclosure.firstChild) {
        h3.insertBefore(disclosure.firstChild, disclosure);
      }
      disclosure.remove();
    }

    if (!h3.id) h3.id = figLabUniqueId("propskit-group");
    if (this.#header.dataset.generated) {
      h3.textContent = label;
    }
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (
      !this.hasAttribute("aria-label") &&
      !this.hasAttribute("aria-labelledby")
    ) {
      this.setAttribute("aria-labelledby", h3.id);
    }

    let chevron =
      this.#header.querySelector(":scope > .propskit-group-chevron") ||
      h3.querySelector(":scope > .propskit-group-chevron");
    if (!chevron) {
      chevron = document.createElement("fig-icon");
      chevron.setAttribute("name", "chevron");
      chevron.setAttribute("size", "small");
      chevron.className = "propskit-group-chevron";
    }
    this.#header.insertBefore(chevron, h3);
    this.#chevron = chevron;
    this.#syncResetButton();
    this.#header.setAttribute("role", "button");
    this.#syncDisabled();
    this.#header.setAttribute("aria-expanded", String(this.open));
    this.#header.removeEventListener("click", this.#handleToggle);
    this.#header.addEventListener("click", this.#handleToggle);
    this.#header.removeEventListener("keydown", this.#handleHeaderKeyDown);
    this.#header.addEventListener("keydown", this.#handleHeaderKeyDown);

    if (!this.hasAttribute("open")) {
      this.setAttribute("open", "false");
      this.#header.setAttribute("aria-expanded", "false");
    }
  }
}
figLabDefineElement("propskit-group", PropskitGroup);

/* PropsKit slider surface */
class PropskitSlider extends FigLabPropskitElement {
  static #DRAG_THRESHOLD_PX = 4;
  static #DRAGGING_BODY_CLASS = "propskit-slider-dragging";
  static #TEXT_MEASURE_CANVAS = null;

  #surface = null;
  #label = null;
  #slider = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedSliderAttrs = new Set();
  #steppersSyncFrame = 0;
  #focusSyncFrame = 0;
  #handleProximityFrame = 0;
  #handleProximityObserver = null;
  #handleProximityMetricsDirty = true;
  #handleRadius = 0;
  #handleFadeStartThreshold = 1;
  #handleFadeEndThreshold = 0;
  #rangeInput = null;
  #contextMenu = null;
  #pendingClickTimer = 0;
  #pendingClickValue = null;
  #initialValue = null;
  #isElasticTracking = false;
  #elasticMaxPx = 0;
  #elasticRangeRect = null;
  #elasticHostWidth = 0;
  #elasticPointerId = null;
  #surfacePointerStartX = 0;
  #numberPointerId = null;
  #numberPointerStartX = 0;
  #numberPointerStartY = 0;
  #isNumberScrubbing = false;
  #suppressNumberClick = false;
  #numberClickResetTimer = 0;
  #boundHandleSliderInput = null;
  #boundHandleSliderChange = null;
  #boundHandleElasticPointerDown = this.#handleElasticPointerDown.bind(this);
  #boundHandleElasticPointerMove = this.#handleElasticPointerMove.bind(this);
  #boundHandleElasticPointerEnd = this.#handleElasticPointerEnd.bind(this);
  #boundHandleNumberPointerDown = this.#handleNumberPointerDown.bind(this);
  #boundHandleNumberPointerMove = this.#handleNumberPointerMove.bind(this);
  #boundHandleNumberPointerEnd = this.#handleNumberPointerEnd.bind(this);
  #boundHandleRangeDoubleClick = this.#handleRangeDoubleClick.bind(this);
  #boundHandleContextMenu = this.#handleContextMenu.bind(this);
  #boundHandleContextMenuChange = this.#handleContextMenuChange.bind(this);
  #boundHandleClick = this.#handleClick.bind(this);
  #ignoredSliderAttrs = new Set([
    "variant",
    "color",
    "text",
    "full",
    "elastic",
    "size",
    "name",
    "class",
    "data-wave-index",
    "data-active",
    "data-elastic-dragging",
    "default",
    "style",
  ]);

  static get observedAttributes() {
    return ["label", "aria-label"];
  }

  connectedCallback() {
    if (!this.#surface) {
      this.#initialize();
    }

    this.#syncSurface();
    this.#syncSliderAttributes();
    this.#bindSliderEvents();
    this.#queueFocusDelegationSync();
    this.#connectHandleProximityObserver();
    this.#queueHandleProximitySync();
    this.removeEventListener("pointerdown", this.#boundHandleElasticPointerDown, {
      capture: true,
    });
    this.addEventListener("pointerdown", this.#boundHandleElasticPointerDown, {
      capture: true,
      passive: true,
    });
    this.removeEventListener("pointerdown", this.#boundHandleNumberPointerDown, {
      capture: true,
    });
    this.addEventListener("pointerdown", this.#boundHandleNumberPointerDown, {
      capture: true,
    });
    this.removeEventListener("contextmenu", this.#boundHandleContextMenu);
    this.addEventListener("contextmenu", this.#boundHandleContextMenu);
    this.removeEventListener("click", this.#boundHandleClick, true);
    this.addEventListener("click", this.#boundHandleClick, true);
    this.#contextMenu?.removeEventListener(
      "change",
      this.#boundHandleContextMenuChange,
    );
    this.#contextMenu?.addEventListener(
      "change",
      this.#boundHandleContextMenuChange,
    );

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncSurface = false;
        let syncSlider = false;

        for (const mutation of mutations) {
          if (mutation.type === "attributes") {
            if (mutation.attributeName === "value") {
              this.#pushExternalValueToSlider();
              continue;
            }
            if (mutation.attributeName === "color") {
              syncSlider = true;
              continue;
            }
            if (
              mutation.attributeName &&
              this.#ignoredSliderAttrs.has(mutation.attributeName)
            ) {
              continue;
            }
            if (
              mutation.attributeName === "label" ||
              mutation.attributeName === "aria-label"
            ) {
              syncSurface = true;
            } else if (mutation.attributeName === "direction") {
              continue;
            } else {
              syncSlider = true;
            }
          }
        }

        if (syncSurface) {
          this.#syncSurface();
          this.#queueFocusDelegationSync();
        }
        if (syncSlider) {
          this.#syncSliderAttributes();
          this.#queueFocusDelegationSync();
        }
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
    if (this.#focusSyncFrame) {
      cancelAnimationFrame(this.#focusSyncFrame);
      this.#focusSyncFrame = 0;
    }
    if (this.#handleProximityFrame) {
      cancelAnimationFrame(this.#handleProximityFrame);
      this.#handleProximityFrame = 0;
    }
    this.#handleProximityObserver?.disconnect();
    this.#clearPendingClick();
    this.#stopNumberTracking();
    clearTimeout(this.#numberClickResetTimer);
    this.#numberClickResetTimer = 0;
    this.#stopElasticTracking();
    this.#resetElasticPull();
    this.#unbindRangeInput();
    this.#unbindSliderEvents();
    this.removeEventListener("pointerdown", this.#boundHandleElasticPointerDown, {
      capture: true,
    });
    this.removeEventListener("pointerdown", this.#boundHandleNumberPointerDown, {
      capture: true,
    });
    this.removeEventListener("contextmenu", this.#boundHandleContextMenu);
    this.removeEventListener("click", this.#boundHandleClick, true);
    this.#contextMenu?.removeEventListener("change", this.#boundHandleContextMenuChange);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "label" || name === "aria-label") {
      this.#syncSurface();
      this.#queueFocusDelegationSync();
    }
  }

  #initialize() {
    const sliderType = (this.getAttribute("type") || "range").toLowerCase();
    this.#initialValue =
      this.getAttribute("value") ??
      this.getAttribute("default") ??
      (sliderType === "delta" ? "0" : this.getAttribute("min") ?? "0");
    const initialChildren = Array.from(this.childNodes).filter((node) => {
      return (
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())
      );
    });

    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const surface = figLabCreateElement("div", {
      className: "propskit-slider-surface",
    });
    const label = customLabel || document.createElement("label");
    const slider = document.createElement("fig-slider");
    slider.setAttribute("text", "true");
    for (const attrName of this.#getForwardedSliderAttrNames()) {
      const value = this.getAttribute(attrName);
      slider.setAttribute(attrName, value ?? "");
    }

    surface.append(label, slider);

    this.#surface = surface;
    this.#label = label;
    this.#slider = slider;
    this.#hasCustomLabel = Boolean(customLabel);

    this.replaceChildren(surface);
    this.#setupContextMenu();

    for (const node of initialChildren) {
      if (node === customLabel) continue;
      this.#slider.appendChild(node);
    }
  }

  #setupContextMenu() {
    const menu = document.createElement("fig-menu");
    menu.setAttribute("position", "bottom left");
    menu.setAttribute("offset", "0 0");

    const resetItem = document.createElement("fig-menu-item");
    resetItem.setAttribute("value", "reset-default");
    resetItem.textContent = "Reset";
    menu.appendChild(resetItem);
    menu.addEventListener("change", this.#boundHandleContextMenuChange);

    this.#contextMenu = menu;
    this.appendChild(menu);
  }

  #syncSurface() {
    figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    this.#queueHandleProximitySync();
  }

  #syncSliderAttributes() {
    if (!this.#slider) return;
    const hostAttrs = this.#getForwardedSliderAttrNames();

    const nextManaged = new Set(
      hostAttrs.filter((name) => name !== "text" && name !== "value"),
    );

    for (const attrName of this.#managedSliderAttrs) {
      if (!nextManaged.has(attrName)) {
        this.#slider.removeAttribute(attrName);
      }
    }

    for (const attrName of hostAttrs) {
      if (attrName === "text" || attrName === "value") continue;
      const value = this.getAttribute(attrName) ?? "";
      if (this.#slider.getAttribute(attrName) !== value) {
        this.#slider.setAttribute(attrName, value);
      }
    }

    this.#slider.removeAttribute("variant");
    this.#slider.removeAttribute("color");
    this.#slider.removeAttribute("transform");
    this.#slider.removeAttribute("full");
    this.#slider.setAttribute("text", "true");

    const sliderType = (this.getAttribute("type") || "range").toLowerCase();
    if (sliderType === "delta") {
      const min = Number(this.#slider.min);
      const max = Number(this.#slider.max);
      const midpoint =
        Number.isFinite(min) && Number.isFinite(max)
          ? min + (max - min) / 2
          : 0;
      this.#slider.setAttribute("default", String(midpoint));
    } else {
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
        this.getAttribute("color") || "var(--figma-color-bg-secondary)",
      );
    } else {
      this.#slider.style.removeProperty("--color");
    }
    this.#syncNumberTheme(sliderType);

    this.#managedSliderAttrs = nextManaged;
    this.#pushExternalValueToSlider();
    this.#queueSteppersSync();
    this.#handleProximityMetricsDirty = true;
    this.#connectHandleProximityObserver();
    this.#queueHandleProximitySync();
  }

  #syncNumberTheme(sliderType) {
    const numberInput = this.#slider?.querySelector("fig-input-number");
    const usesColorSurface =
      sliderType === "hue" ||
      (sliderType === "opacity" && this.hasAttribute("color"));
    if (!usesColorSurface) {
      numberInput?.removeAttribute("theme");
      this.style.removeProperty("--propskit-slider-filled-text-color");
      return;
    }
    const min = Number(this.#slider?.min);
    const max = Number(this.#slider?.max);
    const value = Number(this.#slider?.value);
    const complete =
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max > min &&
      Number.isFinite(value)
        ? Math.max(0, Math.min(1, (value - min) / (max - min)))
        : 0;
    const color = this.getAttribute("color");
    const effectiveColor =
      sliderType === "hue"
        ? `hsl(${complete * 360}deg 100% 50%)`
        : `color-mix(in srgb, ${color} ${complete * 100}%, var(--figma-color-bg-secondary))`;
    const darkSurface =
      getComputedStyle(this).colorScheme.trim().toLowerCase() === "dark";
    const theme = figLabPerceivedColorTheme(
      this.#slider,
      effectiveColor,
      sliderType === "hue" ? 0.35 : darkSurface ? 0.2 : 0.35,
    );
    if (theme) {
      numberInput?.setAttribute("theme", theme);
      const useDefaultTextToken =
        (theme === "light" && darkSurface) ||
        (theme === "dark" && !darkSurface);
      this.style.setProperty(
        "--propskit-slider-filled-text-color",
        useDefaultTextToken
          ? "var(--figma-color-text)"
          : "var(--figma-color-text-oninverse)",
      );
    } else {
      numberInput?.removeAttribute("theme");
      this.style.removeProperty("--propskit-slider-filled-text-color");
    }
  }

  #syncProgressStyles() {
    if (!this.#slider) return;
    const min = Number(this.#slider.min);
    const max = Number(this.#slider.max);
    const value = Number(this.#slider.value);
    const complete =
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max > min &&
      Number.isFinite(value)
        ? Math.max(0, Math.min(1, (value - min) / (max - min)))
        : 0;
    this.style.setProperty("--propskit-slider-complete", String(complete));
    this.#syncNumberTheme((this.getAttribute("type") || "range").toLowerCase());
    this.#queueHandleProximitySync();
  }

  #connectHandleProximityObserver() {
    if (!globalThis.ResizeObserver) return;
    if (!this.#handleProximityObserver) {
      this.#handleProximityObserver = new ResizeObserver(() => {
        this.#handleProximityMetricsDirty = true;
        this.#queueHandleProximitySync();
      });
    }
    this.#handleProximityObserver.disconnect();
    for (const element of [
      this,
      this.#label,
      this.#slider?.querySelector("fig-input-number"),
      this.#slider?.querySelector("fig-input-number input"),
      this.#slider?.querySelector('input[type="range"]'),
    ]) {
      if (element) this.#handleProximityObserver.observe(element);
    }
  }

  #queueHandleProximitySync() {
    if (this.#handleProximityFrame) {
      cancelAnimationFrame(this.#handleProximityFrame);
    }
    this.#handleProximityFrame = requestAnimationFrame(() => {
      this.#handleProximityFrame = 0;
      this.#syncHandleProximity();
    });
  }

  #syncHandleProximity() {
    const rangeInput = this.#slider?.querySelector('input[type="range"]');
    if (!rangeInput || !this.#slider) return;
    const rangeRect = rangeInput.getBoundingClientRect();
    if (!rangeRect.width) return;

    const min = Number(rangeInput.min || 0);
    const max = Number(rangeInput.max || 100);
    const value = Number(rangeInput.value);
    const complete =
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max > min &&
      Number.isFinite(value)
        ? Math.max(0, Math.min(1, (value - min) / (max - min)))
        : 0;
    const handleCenter = rangeRect.left + complete * rangeRect.width;
    if (this.#handleProximityMetricsDirty) {
      this.#handleRadius =
        this.#readCssLength("--slider-thumb-width", this.#slider) / 2;
      this.#handleFadeStartThreshold = Math.max(
        1,
        this.#readCssLength(
          "--propskit-slider-handle-fade-start-threshold",
        ),
      );
      this.#handleFadeEndThreshold = Math.min(
        this.#handleFadeStartThreshold,
        this.#readCssLength(
          "--propskit-slider-handle-fade-end-threshold",
        ),
      );
      this.#handleProximityMetricsDirty = false;
    }
    const handleRadius = this.#handleRadius;
    const distances = [];
    const labelRect =
      this.#label?.parentElement === this.#surface
        ? this.#contentRect(this.#label)
        : null;
    const numberInput = this.#slider.querySelector("fig-input-number input");
    const numberRect = numberInput ? this.#inputTextRect(numberInput) : null;

    if (
      labelRect?.width &&
      labelRect.bottom > rangeRect.top &&
      labelRect.top < rangeRect.bottom
    ) {
      distances.push(handleCenter - handleRadius - labelRect.right);
    }
    if (
      numberRect?.width &&
      numberRect.bottom > rangeRect.top &&
      numberRect.top < rangeRect.bottom
    ) {
      distances.push(numberRect.left - handleCenter - handleRadius);
    }

    const fadeStartThreshold = this.#handleFadeStartThreshold;
    const fadeEndThreshold = this.#handleFadeEndThreshold;
    const nearestDistance = distances.length
      ? Math.min(...distances)
      : fadeStartThreshold;
    const fadeRange = Math.max(
      0.001,
      fadeStartThreshold - fadeEndThreshold,
    );
    const proximity = Math.max(
      0,
      Math.min(1, (nearestDistance - fadeEndThreshold) / fadeRange),
    );
    this.style.setProperty(
      "--propskit-slider-handle-proximity",
      String(proximity),
    );
  }

  #contentRect(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()].filter(
      (rect) => rect.width > 0 && rect.height > 0,
    );
    range.detach?.();
    if (!rects.length) return null;
    const left = Math.min(...rects.map((rect) => rect.left));
    const right = Math.max(...rects.map((rect) => rect.right));
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  #inputTextRect(input) {
    const text = input.value || input.placeholder || "";
    if (!text) return null;
    const inputRect = input.getBoundingClientRect();
    const style = getComputedStyle(input);
    const textWidth = this.#measureTextWidth(text, style);
    const contentLeft =
      inputRect.left +
      (Number.parseFloat(style.borderLeftWidth) || 0) +
      (Number.parseFloat(style.paddingLeft) || 0);
    const contentRight =
      inputRect.right -
      (Number.parseFloat(style.borderRightWidth) || 0) -
      (Number.parseFloat(style.paddingRight) || 0);
    const contentWidth = Math.max(0, contentRight - contentLeft);
    const width = Math.min(contentWidth, textWidth);
    const alignment = style.textAlign;
    let left = contentLeft;
    if (alignment === "right" || alignment === "end") {
      left = contentRight - width;
    } else if (alignment === "center") {
      left = contentLeft + (contentWidth - width) / 2;
    }
    return {
      left,
      right: left + width,
      top: inputRect.top,
      bottom: inputRect.bottom,
      width,
      height: inputRect.height,
    };
  }

  #measureTextWidth(text, style) {
    if (!PropskitSlider.#TEXT_MEASURE_CANVAS) {
      PropskitSlider.#TEXT_MEASURE_CANVAS = document.createElement("canvas");
    }
    const context = PropskitSlider.#TEXT_MEASURE_CANVAS.getContext("2d");
    if (!context) return 0;
    context.font =
      style.font ||
      `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ("fontKerning" in context) context.fontKerning = style.fontKerning;
    if ("fontStretch" in context) context.fontStretch = style.fontStretch;
    if ("fontVariantCaps" in context) {
      context.fontVariantCaps = style.fontVariantCaps;
    }
    if ("letterSpacing" in context) {
      context.letterSpacing = style.letterSpacing;
    }
    return context.measureText(text).width;
  }

  #readCssLength(property, context = this) {
    const probe = document.createElement("div");
    probe.style.setProperty(
      property,
      getComputedStyle(context).getPropertyValue(property),
    );
    Object.assign(probe.style, {
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      width: `var(${property})`,
    });
    this.appendChild(probe);
    const value = Number.parseFloat(getComputedStyle(probe).width);
    probe.remove();
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  #pushExternalValueToSlider() {
    if (!this.#slider) return;
    const next = this.hasAttribute("value")
      ? this.getAttribute("value") ?? ""
      : this.#initialValue ?? "";
    if (String(this.#slider.value) !== next) {
      this.#slider.value = next;
    }
    this.#syncProgressStyles();
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
      this.#syncFocusDelegation();
    });
  }

  #queueFocusDelegationSync() {
    if (this.#focusSyncFrame) {
      cancelAnimationFrame(this.#focusSyncFrame);
    }
    this.#focusSyncFrame = requestAnimationFrame(() => {
      this.#focusSyncFrame = 0;
      this.#syncFocusDelegation();
    });
  }

  #syncFocusDelegation() {
    const rangeInput = this.#slider?.querySelector('input[type="range"]');
    const numberInput = this.#slider?.querySelector("fig-input-number input");
    if (rangeInput !== this.#rangeInput) {
      this.#bindRangeInput(rangeInput);
    }
    if (rangeInput) {
      rangeInput.removeAttribute("tabindex");
      rangeInput.removeAttribute("aria-hidden");
      const explicitLabel = this.getAttribute("aria-label")?.trim();
      if (explicitLabel) {
        rangeInput.setAttribute("aria-label", explicitLabel);
        rangeInput.removeAttribute("aria-labelledby");
      } else if (
        this.#label?.parentElement === this.#surface &&
        this.#label.id
      ) {
        rangeInput.setAttribute("aria-labelledby", this.#label.id);
        rangeInput.removeAttribute("aria-label");
      } else {
        rangeInput.setAttribute("aria-label", "Slider");
        rangeInput.removeAttribute("aria-labelledby");
      }
    }
    if (numberInput) {
      numberInput.removeAttribute("tabindex");
      numberInput.removeAttribute("aria-hidden");
    }
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-number, fig-menu")
    ) {
      if (
        this.#suppressNumberClick &&
        event.target.closest("fig-input-number")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.#suppressNumberClick = false;
      }
      return;
    }
    this.#queueRangeFocus();
  }

  #queueRangeFocus() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.isConnected && !figLabBooleanAttribute(this, "disabled")) {
          this.focus();
        }
      });
    });
  }

  #bindRangeInput(rangeInput) {
    this.#unbindRangeInput();
    this.#rangeInput = rangeInput;
    if (!this.#rangeInput) return;
    this.#rangeInput.addEventListener("dblclick", this.#boundHandleRangeDoubleClick, {
      capture: true,
    });
  }

  #unbindRangeInput() {
    if (!this.#rangeInput) return;
    this.#rangeInput.removeEventListener("dblclick", this.#boundHandleRangeDoubleClick, {
      capture: true,
    });
    this.#rangeInput = null;
  }

  #handleRangeDoubleClick(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#resetToDefault();
  }

  #handleNumberPointerDown(event) {
    if (
      event.button !== 0 ||
      event.altKey ||
      figLabBooleanAttribute(this, "disabled") ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const input = event.target.closest("fig-input-number input");
    if (!input || input === document.activeElement) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    this.#stopNumberTracking();
    this.#numberPointerId = event.pointerId;
    this.#numberPointerStartX = event.clientX;
    this.#numberPointerStartY = event.clientY;
    this.#isNumberScrubbing = false;
    window.addEventListener("pointermove", this.#boundHandleNumberPointerMove);
    window.addEventListener("pointerup", this.#boundHandleNumberPointerEnd, {
      once: true,
    });
    window.addEventListener("pointercancel", this.#boundHandleNumberPointerEnd, {
      once: true,
    });
    window.addEventListener("blur", this.#boundHandleNumberPointerEnd, {
      once: true,
    });
  }

  #handleNumberPointerMove(event) {
    if (event.pointerId !== this.#numberPointerId) return;
    if (event.buttons === 0) {
      this.#handleNumberPointerEnd(event);
      return;
    }
    if (!this.#isNumberScrubbing) {
      const distance = Math.hypot(
        event.clientX - this.#numberPointerStartX,
        event.clientY - this.#numberPointerStartY,
      );
      if (distance < 4) return;
      this.#isNumberScrubbing = true;
      this.setAttribute("data-number-scrubbing", "");
      this.#setDraggingCursor(true);
    }
    this.#setSliderValue(this.#valueFromPointer(event), "input");
  }

  #handleNumberPointerEnd(event) {
    if (
      event?.pointerId !== undefined &&
      this.#numberPointerId !== null &&
      event.pointerId !== this.#numberPointerId
    ) {
      return;
    }
    const wasScrubbing = this.#isNumberScrubbing;
    this.#stopNumberTracking();
    if (wasScrubbing) {
      this.#setSliderValue(this.#slider?.value, "change");
      this.#suppressNumberClick = true;
      clearTimeout(this.#numberClickResetTimer);
      this.#numberClickResetTimer = window.setTimeout(() => {
        this.#suppressNumberClick = false;
        this.#numberClickResetTimer = 0;
      }, 0);
      this.#queueRangeFocus();
      return;
    }
    this.#slider?.querySelector("fig-input-number input")?.focus();
  }

  #stopNumberTracking() {
    window.removeEventListener("pointermove", this.#boundHandleNumberPointerMove);
    window.removeEventListener("pointerup", this.#boundHandleNumberPointerEnd);
    window.removeEventListener("pointercancel", this.#boundHandleNumberPointerEnd);
    window.removeEventListener("blur", this.#boundHandleNumberPointerEnd);
    this.#numberPointerId = null;
    this.#isNumberScrubbing = false;
    this.removeAttribute("data-number-scrubbing");
    this.#setDraggingCursor(false);
  }

  #handleElasticPointerDown(event) {
    if (event.button !== 0 || figLabBooleanAttribute(this, "disabled")) return;
    if (event.target?.closest?.("fig-input-number")) return;
    const rangeInput =
      this.#slider?.querySelector('input[type="range"]') ?? this.#rangeInput;
    if (!rangeInput) return;
    this.#stopElasticTracking();
    this.#resetElasticPull();
    this.#rangeInput = rangeInput;
    this.#isElasticTracking = true;
    this.#elasticPointerId = event.pointerId;
    this.#surfacePointerStartX = event.clientX;
    this.#elasticMaxPx =
      this.getAttribute("elastic") === "false"
        ? 0
        : this.#readElasticDistance();
    const rect = rangeInput.getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    this.#elasticRangeRect = {
      left: rect.left,
      right: rect.right,
      width: rect.width,
    };
    this.#elasticHostWidth = hostRect.width;
    window.addEventListener("pointermove", this.#boundHandleElasticPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", this.#boundHandleElasticPointerEnd, {
      once: true,
    });
    window.addEventListener("pointercancel", this.#boundHandleElasticPointerEnd, {
      once: true,
    });
    window.addEventListener("blur", this.#boundHandleElasticPointerEnd, {
      once: true,
    });
  }

  #handleElasticPointerMove(event) {
    if (!this.#isElasticTracking) return;
    if (event.pointerId !== this.#elasticPointerId) return;
    if (event.buttons === 0) {
      this.#handleElasticPointerEnd(event);
      return;
    }
    if (
      Math.abs(event.clientX - this.#surfacePointerStartX) >=
      PropskitSlider.#DRAG_THRESHOLD_PX
    ) {
      this.#setDraggingCursor(true);
    }
    if (this.#elasticMaxPx) this.#updateElasticPull(event.clientX);
  }

  #handleElasticPointerEnd(event) {
    if (
      event?.pointerId !== undefined &&
      this.#elasticPointerId !== null &&
      event.pointerId !== this.#elasticPointerId
    ) {
      return;
    }
    const shouldFocus =
      event?.type === "pointerup" ||
      (event?.type === "pointermove" && event.buttons === 0);
    this.#stopElasticTracking();
    this.#resetElasticPull();
    if (shouldFocus) this.#queueRangeFocus();
  }

  #stopElasticTracking() {
    window.removeEventListener("pointermove", this.#boundHandleElasticPointerMove);
    window.removeEventListener("pointerup", this.#boundHandleElasticPointerEnd);
    window.removeEventListener("pointercancel", this.#boundHandleElasticPointerEnd);
    window.removeEventListener("blur", this.#boundHandleElasticPointerEnd);
    this.#isElasticTracking = false;
    this.#elasticPointerId = null;
    this.#surfacePointerStartX = 0;
    this.#setDraggingCursor(false);
  }

  #setDraggingCursor(active) {
    this.toggleAttribute("data-propskit-slider-dragging", active);
    document.body.classList.toggle(PropskitSlider.#DRAGGING_BODY_CLASS, active);
  }

  #handleContextMenu(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.#clearPendingClick();
    this.#showContextMenuAfterPointerRelease(event.clientX, event.clientY);
  }

  #showContextMenuAfterPointerRelease(x, y) {
    let opened = false;
    let fallbackTimer = 0;
    const openMenu = () => {
      if (opened) return;
      opened = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("pointerup", openMenu, true);
      window.removeEventListener("pointercancel", openMenu, true);
      requestAnimationFrame(() => {
        this.#contextMenu?.showAt?.(x, y);
      });
    };
    window.addEventListener("pointerup", openMenu, { once: true, capture: true });
    window.addEventListener("pointercancel", openMenu, {
      once: true,
      capture: true,
    });
    fallbackTimer = window.setTimeout(openMenu, 180);
  }

  #handleContextMenuChange(event) {
    event.stopPropagation();
    if (event.detail?.value !== "reset-default") return;
    this.#resetToDefault();
  }

  #clearPendingClick() {
    if (this.#pendingClickTimer) {
      clearTimeout(this.#pendingClickTimer);
      this.#pendingClickTimer = 0;
    }
    this.#pendingClickValue = null;
  }

  #readElasticDistance() {
    let raw = getComputedStyle(this)
      .getPropertyValue("--propskit-slider-elastic-distance")
      .trim();
    if (raw.includes("var(") || !raw.endsWith("px")) {
      const probe = document.createElement("div");
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        width: "var(--propskit-slider-elastic-distance)",
      });
      this.appendChild(probe);
      raw = getComputedStyle(probe).width;
      probe.remove();
    }
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  #updateElasticPull(pointerX) {
    const rect = this.#elasticRangeRect;
    if (!rect || !this.#elasticMaxPx) {
      this.#resetElasticPull();
      return;
    }
    const overshoot =
      pointerX < rect.left
        ? pointerX - rect.left
        : pointerX > rect.right
          ? pointerX - rect.right
          : 0;
    if (!overshoot) {
      this.#clearElasticPull();
      return;
    }
    const offset = Math.max(
      -this.#elasticMaxPx,
      Math.min(this.#elasticMaxPx, overshoot * 0.5),
    );
    const stretch = Math.abs(offset);
    const scale = this.#elasticHostWidth
      ? (this.#elasticHostWidth + stretch) / this.#elasticHostWidth
      : 1;
    this.dataset.elasticDragging = "true";
    this.style.setProperty("--propskit-slider-elastic-size", `${stretch}px`);
    this.style.setProperty("--propskit-slider-elastic-scale", `${scale}`);
    this.style.setProperty(
      "--propskit-slider-elastic-origin",
      offset < 0 ? "right center" : "left center",
    );
  }

  #resetElasticPull() {
    this.#clearElasticPull();
    this.#elasticMaxPx = 0;
    this.#elasticRangeRect = null;
    this.#elasticHostWidth = 0;
    this.#elasticPointerId = null;
  }

  #clearElasticPull() {
    this.removeAttribute("data-elastic-dragging");
    this.style.removeProperty("--propskit-slider-elastic-size");
    this.style.removeProperty("--propskit-slider-elastic-scale");
  }

  #valueFromPointer(event) {
    const input = this.#rangeInput;
    if (!input) return this.#slider?.value ?? "";
    const rect = input.getBoundingClientRect();
    const percent = rect.width
      ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      : 0;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const step = input.step === "any" ? 0 : Number(input.step || 1);
    const raw = min + (max - min) * percent;
    if (!step) return String(raw);
    const snapped = Math.round((raw - min) / step) * step + min;
    const decimals = Math.max(0, `${step}`.split(".")[1]?.length || 0);
    return String(Number(snapped.toFixed(decimals)));
  }

  #defaultValue() {
    return (
      this.getAttribute("default") ??
      this.#initialValue ??
      this.#rangeInput?.min ??
      "0"
    );
  }

  #resetToDefault() {
    this.#clearPendingClick();
    this.#setSliderValue(this.#defaultValue(), "input");
    this.#setSliderValue(this.#defaultValue(), "change");
  }

  #setSliderValue(value, eventType) {
    if (!this.#slider || value === null || value === undefined) return;
    this.#slider.value = value;
    this.setAttribute("value", String(this.#slider.value));
    figLabDispatchPropskitEvent(this, eventType);
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
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (type === "change") {
      this.#resetElasticPull();
    }
    if (this.#slider?.value !== undefined) {
      const next = String(this.#slider.value);
      if (this.getAttribute("value") !== next) {
        this.setAttribute("value", next);
      }
    }
    this.#syncProgressStyles();
    figLabDispatchPropskitEvent(this, type);
  }

  focus(options) {
    this.#syncFocusDelegation();
    const range = this.#slider?.querySelector('input[type="range"]');
    range?.setAttribute("data-propskit-focus-called", "");
    range?.focus(options);
  }

  get value() {
    return figLabFiniteNumberOrNull(
      this.getAttribute("value") ?? this.#slider?.value,
    );
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      if (this.#slider) this.#slider.value = "";
      return;
    }
    const next = String(nextValue);
    this.setAttribute("value", next);
    if (this.#slider) this.#slider.value = next;
  }

  get defaultValue() {
    return this.#defaultValue();
  }

  get isDefault() {
    return figLabPropskitValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    this.#resetToDefault();
  }
}
figLabDefineElement("propskit-slider", PropskitSlider);

/**
 * Standalone interactive numeric wheel.
 *
 * @attr {number} value - Numeric value. Unbounded unless min/max are set.
 * @attr {number} min - Inclusive lower bound. Omitted = unbounded below.
 * @attr {number} max - Inclusive upper bound. Omitted = unbounded above.
 * @attr {number} step - Increment. Defaults to 1.
 * @attr {boolean|string} spin - Keeps ticks synchronized to value. Defaults to true.
 * @attr {boolean|string} disabled - Disables interaction and focus.
 * @fires input - Numeric composed event during interaction.
 * @fires change - Numeric composed event on commit.
 */
class FigInputWheel extends HTMLElement {
  static #TICK_COUNT = 33;
  static #HALF_FOV_DEG = 60;
  static #PERSPECTIVE_K = 0.55;
  static #FAST_MOTION_THRESHOLD_PX_PER_MS = 1.5;
  static #FAST_MOTION_TIMEOUT_MS = 80;
  static #DRAG_THRESHOLD_PX = 4;
  static #DRAGGING_BODY_CLASS = "fig-input-wheel-dragging";

  #surface = null;
  #track = null;
  #wheel = null;
  #svg = null;
  #tickPath = null;
  #tickMetrics = null;
  #tickMetricProbe = null;
  #wheelWidth = 0;
  #wheelHeight = 0;
  #layoutFrame = 0;
  #keyboardAnimationFrame = 0;
  #keyboardSettleTimer = 0;
  #resizeObserver = null;
  #isDragging = false;
  #dragPointerId = null;
  #dragStartX = 0;
  #dragStartValue = 0;
  #hasCrossedDragThreshold = false;
  #visualValue = null;
  #handleDragMaxPx = 0;
  #motionLastX = null;
  #motionLastTime = 0;
  #motionBlurTimer = 0;
  #boundPointerDown = this.#handlePointerDown.bind(this);
  #boundPointerMove = this.#handlePointerMove.bind(this);
  #boundPointerUp = this.#handlePointerUp.bind(this);
  #boundWheel = this.#handleWheel.bind(this);
  #boundKeyDown = this.#handleKeyDown.bind(this);

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "step",
      "min",
      "max",
      "spin",
    ];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncDisabled();
    this.#syncValueFromHost();
    this.#bindEvents();
    this.#resizeObserver?.disconnect();
    if (globalThis.ResizeObserver) {
      this.#resizeObserver = new ResizeObserver((entries) => {
        const rect = entries.at(-1)?.contentRect;
        if (rect) this.#setWheelSize(rect.width, rect.height);
      });
      this.#resizeObserver.observe(this);
    }
    this.#queueWheelLayout();
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    if (this.#layoutFrame) cancelAnimationFrame(this.#layoutFrame);
    this.#layoutFrame = 0;
    this.#stopKeyboardAnimation();
    this.#unbindEvents();
    this.#stopDrag();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "disabled") this.#syncDisabled();
    if (name === "value" && !this.#isDragging) {
      this.#syncValueFromHost();
    }
    if (name === "step") {
      this.#syncWheelAria();
      this.#queueWheelLayout();
    }
    if (name === "spin") this.#queueWheelLayout();
    if (name === "min" || name === "max") {
      this.#commitValue(this.#numericValue());
    }
  }

  #initialize() {
    this.#surface = this;
    this.#track = this;
    this.#wheel = this;
    this.setAttribute("role", "spinbutton");
    if (
      !this.hasAttribute("aria-label") &&
      !this.hasAttribute("aria-labelledby")
    ) {
      this.setAttribute("aria-label", "Value");
    }
    this.setAttribute("tabindex", "0");
    const svg = figLabCreateSvgElement("svg", {
      className: "fig-input-wheel-svg",
      "aria-hidden": "true",
    });
    const handle = figLabCreateElement("div", {
      className: "fig-input-wheel-handle",
    });
    this.#svg = svg;
    this.replaceChildren(svg, handle);

    const metricProbe = document.createElement("div");
    metricProbe.setAttribute("aria-hidden", "true");
    metricProbe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;left:0;top:0";
    const maxEl = document.createElement("div");
    maxEl.style.height = "var(--fig-input-wheel-tick-height)";
    const minEl = document.createElement("div");
    minEl.style.height = "var(--fig-input-wheel-tick-height-min)";
    const maxWidthEl = document.createElement("div");
    maxWidthEl.style.width = "var(--fig-input-wheel-tick-width)";
    const minWidthEl = document.createElement("div");
    minWidthEl.style.width = "var(--fig-input-wheel-tick-width-min)";
    metricProbe.append(maxEl, minEl, maxWidthEl, minWidthEl);
    this.append(metricProbe);
    this.#tickMetricProbe = {
      maxEl,
      minEl,
      maxWidthEl,
      minWidthEl,
    };

    this.#ensureTickPath();
  }

  #ensureTickPath() {
    if (!this.#svg || this.#tickPath) return;
    this.#tickPath = figLabCreateSvgElement("path", {
      className: "fig-input-wheel-tick",
    });
    this.#svg.append(this.#tickPath);
  }

  #readTickMetrics() {
    if (this.#tickMetrics) return this.#tickMetrics;
    this.#tickMetrics = {
      maxH: this.#tickMetricProbe?.maxEl.getBoundingClientRect().height || 8,
      minH: this.#tickMetricProbe?.minEl.getBoundingClientRect().height || 4,
      maxW:
        this.#tickMetricProbe?.maxWidthEl.getBoundingClientRect().width || 2,
      minW:
        this.#tickMetricProbe?.minWidthEl.getBoundingClientRect().width || 1,
    };
    return this.#tickMetrics;
  }

  #step() {
    if (this.hasAttribute("step")) {
      const parsed = Number(this.getAttribute("step"));
      if (parsed > 0) return parsed;
    }
    return 1;
  }

  #numericValue() {
    const parsed = Number(this.getAttribute("value") ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  #parseBound(name) {
    if (!this.hasAttribute(name)) return null;
    const raw = this.getAttribute(name);
    if (raw === null || raw.trim() === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  #boundMin() {
    return this.#parseBound("min");
  }

  #boundMax() {
    return this.#parseBound("max");
  }

  #writeBound(name, nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute(name);
      return;
    }
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) {
      this.removeAttribute(name);
      return;
    }
    this.setAttribute(name, String(parsed));
  }

  #clamp(value) {
    let next = value;
    const min = this.#boundMin();
    const max = this.#boundMax();
    if (min !== null) next = Math.max(min, next);
    if (max !== null) next = Math.min(max, next);
    return next;
  }

  #snap(value) {
    const step = this.#step();
    if (step <= 0) return value;
    const base = this.#boundMin() ?? 0;
    const snapped = Math.round((value - base) / step) * step + base;
    return Number(snapped.toPrecision(15));
  }

  #commitValue(value, { snap = false, emit = null } = {}) {
    let next = snap ? this.#snap(value) : value;
    next = this.#clamp(next);
    const asString = String(next);
    if (this.getAttribute("value") !== asString) {
      this.setAttribute("value", asString);
    }
    this.#syncWheelAria(next);
    this.#queueWheelLayout();
    if (emit) {
      this.dispatchEvent(
        new CustomEvent(emit, {
          detail: next,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
    }
  }

  #syncValueFromHost() {
    const value = this.#numericValue();
    const clamped = this.#clamp(value);
    if (
      clamped !== value ||
      this.getAttribute("value") !== String(clamped)
    ) {
      this.#commitValue(clamped);
      return;
    }
    this.#syncWheelAria(value);
    this.#queueWheelLayout();
  }

  #syncWheelAria(value = this.#numericValue()) {
    if (!this.#wheel) return;
    const min = this.#boundMin();
    const max = this.#boundMax();
    this.#wheel.setAttribute("aria-valuenow", String(value));
    this.#wheel.setAttribute("aria-valuetext", String(value));
    if (min === null) this.#wheel.removeAttribute("aria-valuemin");
    else this.#wheel.setAttribute("aria-valuemin", String(min));
    if (max === null) this.#wheel.removeAttribute("aria-valuemax");
    else this.#wheel.setAttribute("aria-valuemax", String(max));
  }

  #syncDisabled() {
    const disabled = figLabBooleanAttribute(this, "disabled");
    if (!this.#wheel) return;
    if (disabled) {
      if (this.#isDragging) this.#stopDrag();
      this.#stopKeyboardAnimation();
      this.setAttribute("aria-disabled", "true");
      this.#wheel.setAttribute("tabindex", "-1");
      this.#wheel.setAttribute("aria-disabled", "true");
    } else {
      this.removeAttribute("aria-disabled");
      this.#wheel.setAttribute("tabindex", "0");
      this.#wheel.removeAttribute("aria-disabled");
    }
  }

  #setWheelSize(width, height) {
    if (!this.#svg || width < 1 || height < 1) return;
    if (width === this.#wheelWidth && height === this.#wheelHeight) return;
    this.#wheelWidth = width;
    this.#wheelHeight = height;
    this.#tickMetrics = null;
    this.#svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.#svg.setAttribute("width", String(width));
    this.#svg.setAttribute("height", String(height));
    this.#queueWheelLayout();
  }

  #queueWheelLayout() {
    if (this.#layoutFrame) return;
    this.#layoutFrame = requestAnimationFrame(() => {
      if (!this.isConnected) {
        this.#layoutFrame = 0;
        return;
      }
      if (this.#wheelWidth < 1 || this.#wheelHeight < 1) {
        const rect = this.#wheel?.getBoundingClientRect();
        if (rect) this.#setWheelSize(rect.width, rect.height);
      }
      this.#layoutWheel();
      this.#layoutFrame = 0;
    });
  }

  #layoutWheel() {
    if (!this.#tickPath) return;
    const width = this.#wheelWidth;
    const height = this.#wheelHeight;
    if (width < 1 || height < 1) return;

    const value =
      this.getAttribute("spin") === "false"
        ? (this.#boundMin() ?? 0)
        : (this.#visualValue ?? this.#numericValue());
    const tickStep = 360 / FigInputWheel.#TICK_COUNT;
    const step = this.#step();
    const base = this.#boundMin() ?? 0;
    const offsetDeg = ((value - base) / step) * tickStep;
    const k = FigInputWheel.#PERSPECTIVE_K;
    const cx = width / 2;
    const cy = height / 2;

    const { maxH, minH, maxW, minW } = this.#readTickMetrics();
    const fov = FigInputWheel.#HALF_FOV_DEG;
    const visibleHalf = Math.max(width / 2, 1);
    const radius = visibleHalf * 0.84;
    const commands = [];

    for (let index = 0; index < FigInputWheel.#TICK_COUNT; index += 1) {
      let theta = offsetDeg + index * tickStep;
      theta = ((((theta + 180) % 360) + 360) % 360) - 180;
      if (theta < -fov || theta >= fov) continue;
      const rad = (theta * Math.PI) / 180;
      const x = cx + (radius * Math.sin(rad)) / (1 - k * Math.cos(rad));
      const t = Math.min(1, Math.abs(x - cx) / Math.max(visibleHalf, 1));
      const taper = Math.cos(t * Math.PI * 0.5);
      const visualH = minH + (maxH - minH) * taper;
      const visualW = minW + (maxW - minW) * taper;
      const halfH = visualH / 2;
      const halfW = visualW / 2;
      const top = cy - halfH;
      const bottom = cy + halfH;
      const left = x - halfW;
      const right = x + halfW;
      commands.push(
        `M ${x} ${top}` +
          ` Q ${right} ${top} ${right} ${top + halfW}` +
          ` V ${bottom - halfW}` +
          ` Q ${right} ${bottom} ${x} ${bottom}` +
          ` Q ${left} ${bottom} ${left} ${bottom - halfW}` +
          ` V ${top + halfW}` +
          ` Q ${left} ${top} ${x} ${top} Z`,
      );
    }
    this.#tickPath.setAttribute("d", commands.join(" "));
  }

  #bindEvents() {
    this.#surface?.addEventListener("pointerdown", this.#boundPointerDown);
    this.#wheel?.addEventListener("wheel", this.#boundWheel, { passive: false });
    this.#wheel?.addEventListener("keydown", this.#boundKeyDown);
  }

  #unbindEvents() {
    this.#surface?.removeEventListener("pointerdown", this.#boundPointerDown);
    this.#wheel?.removeEventListener("wheel", this.#boundWheel);
    this.#wheel?.removeEventListener("keydown", this.#boundKeyDown);
    window.removeEventListener("pointermove", this.#boundPointerMove);
    window.removeEventListener("pointerup", this.#boundPointerUp);
    window.removeEventListener("pointercancel", this.#boundPointerUp);
  }

  #handlePointerDown(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (event.button !== 0) return;
    event.preventDefault();
    if (!this.beginScrub(event)) return;
    this.#surface?.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", this.#boundPointerMove);
    window.addEventListener("pointerup", this.#boundPointerUp);
    window.addEventListener("pointercancel", this.#boundPointerUp);
  }

  beginScrub(start = {}) {
    if (figLabBooleanAttribute(this, "disabled")) return false;
    const clientX =
      typeof start === "number" ? start : Number(start?.clientX ?? start?.x);
    if (!Number.isFinite(clientX)) return false;
    this.#stopKeyboardAnimation();
    this.#isDragging = true;
    this.#dragPointerId =
      start && typeof start === "object" && start.pointerId !== undefined
        ? start.pointerId
        : null;
    this.#dragStartX = clientX;
    const requestedStart =
      start && typeof start === "object"
        ? Number(start.startValue)
        : Number.NaN;
    this.#dragStartValue = Number.isFinite(requestedStart)
      ? this.#clamp(requestedStart)
      : this.#numericValue();
    this.#hasCrossedDragThreshold = false;
    this.#startTickMotionTracking(clientX);
    this.#startHandlePull();
    this.setAttribute("data-fig-input-wheel-active", "");
    document.body.classList.remove(FigInputWheel.#DRAGGING_BODY_CLASS);
    this.focus();
    return true;
  }

  updateScrub(position, speed) {
    if (!this.#isDragging) return this.#numericValue();
    const clientX =
      typeof position === "number"
        ? position
        : Number(position?.clientX ?? position?.x);
    if (!Number.isFinite(clientX)) return this.#numericValue();
    const multiplier =
      speed ??
      (typeof position === "object" && position?.shiftKey ? 10 : 1);
    this.#updateDrag(clientX, multiplier);
    return this.#numericValue();
  }

  endScrub(commit = true) {
    if (!this.#isDragging) return this.#numericValue();
    if (commit && this.#numericValue() !== this.#dragStartValue) {
      this.#commitValue(this.#numericValue(), { snap: true, emit: "change" });
    }
    this.#stopDrag();
    return this.#numericValue();
  }

  #handlePointerMove(event) {
    if (!this.#isDragging) return;
    if (this.#dragPointerId !== null && event.pointerId !== this.#dragPointerId) {
      return;
    }
    this.updateScrub(event);
  }

  #updateDrag(clientX, speed = 1) {
    if (
      !this.#hasCrossedDragThreshold &&
      Math.abs(clientX - this.#dragStartX) >=
        FigInputWheel.#DRAG_THRESHOLD_PX
    ) {
      this.#hasCrossedDragThreshold = true;
      document.body.classList.add(FigInputWheel.#DRAGGING_BODY_CLASS);
    }
    const width = this.#wheel?.clientWidth || 1;
    const visibleSteps =
      FigInputWheel.#TICK_COUNT *
      ((FigInputWheel.#HALF_FOV_DEG * 2) / 360);
    const visibleUnits = this.#step() * visibleSteps;
    const delta =
      (clientX - this.#dragStartX) * (visibleUnits / width) * speed;
    const previousVisualValue = this.#visualValue ?? this.#dragStartValue;
    const rawValue = this.#clamp(this.#dragStartValue + delta);
    this.#updateTickMotionBlur(
      clientX,
      speed,
      rawValue !== previousVisualValue,
    );
    this.#visualValue = rawValue;
    this.#commitValue(rawValue, {
      snap: true,
      emit: "input",
    });
    this.#updateHandlePull(clientX);
  }

  #handlePointerUp(event) {
    if (!this.#isDragging) return;
    if (this.#dragPointerId !== null && event.pointerId !== this.#dragPointerId) {
      return;
    }
    this.endScrub();
  }

  #stopDrag() {
    this.#isDragging = false;
    this.#dragPointerId = null;
    this.#hasCrossedDragThreshold = false;
    this.#visualValue = null;
    this.removeAttribute("data-fig-input-wheel-active");
    document.body.classList.remove(FigInputWheel.#DRAGGING_BODY_CLASS);
    this.#stopTickMotionTracking();
    this.#resetHandlePull();
    window.removeEventListener("pointermove", this.#boundPointerMove);
    window.removeEventListener("pointerup", this.#boundPointerUp);
    window.removeEventListener("pointercancel", this.#boundPointerUp);
    this.#queueWheelLayout();
  }

  #startHandlePull() {
    this.#resetHandlePull();
    this.#handleDragMaxPx = this.#readCssLength(
      "--fig-input-wheel-handle-drag-max",
    );
  }

  #readCssLength(propertyName) {
    let raw = getComputedStyle(this)
      .getPropertyValue(propertyName)
      .trim();
    if (raw.includes("var(") || !raw.endsWith("px")) {
      const probe = document.createElement("div");
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        width: `var(${propertyName})`,
      });
      this.appendChild(probe);
      raw = getComputedStyle(probe).width;
      probe.remove();
    }
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  #updateHandlePull(pointerX) {
    if (!this.#handleDragMaxPx) {
      this.#clearHandlePull();
      return;
    }
    const dragDelta = pointerX - this.#dragStartX;
    if (!dragDelta) {
      this.#clearHandlePull();
      return;
    }
    const offset =
      this.#handleDragMaxPx *
      Math.tanh(
        dragDelta / Math.max(1, this.#handleDragMaxPx * 3),
      );
    this.style.setProperty(
      "--fig-input-wheel-handle-drag-offset",
      `${offset}px`,
    );
  }

  #resetHandlePull() {
    this.#clearHandlePull();
    this.#handleDragMaxPx = 0;
  }

  #clearHandlePull() {
    this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
  }

  #startTickMotionTracking(clientX) {
    this.#stopTickMotionTracking();
    this.#motionLastX = clientX;
    this.#motionLastTime = performance.now();
  }

  #updateTickMotionBlur(clientX, speed, moved) {
    const now = performance.now();
    const elapsed = now - this.#motionLastTime;
    const distance =
      this.#motionLastX === null ? 0 : Math.abs(clientX - this.#motionLastX);
    this.#motionLastX = clientX;
    this.#motionLastTime = now;
    const velocity =
      elapsed > 0 ? (distance / elapsed) * Math.max(1, Math.abs(speed)) : 0;
    if (
      !moved ||
      velocity < FigInputWheel.#FAST_MOTION_THRESHOLD_PX_PER_MS
    ) {
      this.#clearTickMotionBlur();
      return;
    }
    this.toggleAttribute("data-fig-input-wheel-fast", true);
    clearTimeout(this.#motionBlurTimer);
    this.#motionBlurTimer = window.setTimeout(() => {
      this.#clearTickMotionBlur();
    }, FigInputWheel.#FAST_MOTION_TIMEOUT_MS);
  }

  #stopTickMotionTracking() {
    this.#motionLastX = null;
    this.#motionLastTime = 0;
    this.#clearTickMotionBlur();
  }

  #clearTickMotionBlur() {
    clearTimeout(this.#motionBlurTimer);
    this.#motionBlurTimer = 0;
    this.removeAttribute("data-fig-input-wheel-fast");
  }

  #handleWheel(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    event.preventDefault();
    const direction = event.deltaY === 0 ? Math.sign(event.deltaX) : Math.sign(event.deltaY);
    if (!direction) return;
    const multiplier = event.shiftKey ? 10 : 1;
    this.#commitValue(this.#numericValue() + this.#step() * multiplier * direction, {
      snap: true,
      emit: "input",
    });
    this.#commitValue(this.#numericValue(), { emit: "change" });
  }

  #handleKeyDown(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-number")
    ) {
      return;
    }
    if (event.key === "Home") {
      const min = this.#boundMin();
      if (min === null) return;
      event.preventDefault();
      this.#commitValue(min, { snap: true, emit: "input" });
      this.#commitValue(this.#numericValue(), { emit: "change" });
      return;
    }
    if (event.key === "End") {
      const max = this.#boundMax();
      if (max === null) return;
      event.preventDefault();
      this.#commitValue(max, { snap: true, emit: "input" });
      this.#commitValue(this.#numericValue(), { emit: "change" });
      return;
    }
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1;
    const multiplier = event.shiftKey ? 10 : 1;
    const previousValue = this.#numericValue();
    this.#commitValue(previousValue + this.#step() * multiplier * direction, {
      snap: true,
      emit: "input",
    });
    this.#animateKeyboardMovement(
      previousValue,
      this.#numericValue(),
      direction,
      multiplier,
    );
    this.#commitValue(this.#numericValue(), { emit: "change" });
  }

  #animateKeyboardMovement(
    from,
    to,
    direction,
    multiplier,
    animateHandle = true,
  ) {
    if (
      from === to ||
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      this.#stopKeyboardAnimation();
      return;
    }

    if (this.#keyboardAnimationFrame) {
      cancelAnimationFrame(this.#keyboardAnimationFrame);
      this.#keyboardAnimationFrame = 0;
    }
    clearTimeout(this.#keyboardSettleTimer);
    this.#keyboardSettleTimer = 0;
    this.removeAttribute("data-fig-input-wheel-keyboard-settling");
    const visualFrom = this.#visualValue ?? from;
    const handleFrom =
      Number.parseFloat(
        this.style.getPropertyValue("--fig-input-wheel-handle-drag-offset"),
      ) || 0;
    const duration = multiplier > 1 ? 120 : 90;
    const startedAt = performance.now();
    const shouldAnimateHandle = animateHandle;
    this.setAttribute("data-fig-input-wheel-keyboard-moving", "");

    const frame = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      this.#visualValue = visualFrom + (to - visualFrom) * progress;
      if (shouldAnimateHandle) {
        const eased = Math.sin((progress * Math.PI) / 2);
        const offset = handleFrom + (direction * 4 - handleFrom) * eased;
        this.style.setProperty(
          "--fig-input-wheel-handle-drag-offset",
          `${offset}px`,
        );
      }
      this.#layoutWheel();

      if (progress < 1) {
        this.#keyboardAnimationFrame = requestAnimationFrame(frame);
        return;
      }

      this.#keyboardAnimationFrame = 0;
      this.#visualValue = null;
      this.removeAttribute("data-fig-input-wheel-keyboard-moving");
      this.setAttribute("data-fig-input-wheel-keyboard-settling", "");
      this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
      this.#keyboardSettleTimer = window.setTimeout(() => {
        this.removeAttribute("data-fig-input-wheel-keyboard-settling");
        this.#keyboardSettleTimer = 0;
      }, 140);
      this.#queueWheelLayout();
    };

    this.#keyboardAnimationFrame = requestAnimationFrame(frame);
  }

  #stopKeyboardAnimation() {
    if (this.#keyboardAnimationFrame) {
      cancelAnimationFrame(this.#keyboardAnimationFrame);
      this.#keyboardAnimationFrame = 0;
    }
    clearTimeout(this.#keyboardSettleTimer);
    this.#keyboardSettleTimer = 0;
    this.#visualValue = null;
    this.removeAttribute("data-fig-input-wheel-keyboard-moving");
    this.removeAttribute("data-fig-input-wheel-keyboard-settling");
    this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
    if (this.isConnected) this.#queueWheelLayout();
  }

  get value() {
    return this.getAttribute("value") ?? "0";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.#commitValue(0);
      return;
    }
    const parsed = Number(nextValue);
    this.#commitValue(Number.isFinite(parsed) ? parsed : 0);
  }

  spinTo(nextValue, { animateHandle = false } = {}) {
    const previousValue = this.#numericValue();
    this.value = nextValue;
    const value = this.#numericValue();
    if (this.getAttribute("spin") === "false") {
      this.#stopKeyboardAnimation();
      return value;
    }
    const direction = Math.sign(value - previousValue);
    this.#animateKeyboardMovement(
      previousValue,
      value,
      direction,
      Math.abs(value - previousValue) > this.#step() ? 10 : 1,
      animateHandle,
    );
    return value;
  }

  get min() {
    return this.#boundMin();
  }

  set min(nextValue) {
    this.#writeBound("min", nextValue);
  }

  get max() {
    return this.#boundMax();
  }

  set max(nextValue) {
    this.#writeBound("max", nextValue);
  }

  get step() {
    return this.#step();
  }

  focus(options) {
    HTMLElement.prototype.focus.call(this, options);
  }
}
figLabDefineElement("fig-input-wheel", FigInputWheel);

/**
 * Labeled numeric wheel with an optional editable number field.
 *
 * @attr {string} label - Surface label. Defaults to "Label"; empty hides it.
 * @attr {string} default - Reset target.
 * @attr {number} precision - Number field display decimals.
 * @attr {boolean|string} elastic - Enables resisted row stretching. Defaults to true.
 * @attr {boolean|string} spin - Keeps wheel ticks synchronized to value. Defaults to true.
 * @attr {boolean|string} text - Shows the number field. Defaults to true.
 * @fires input - Retargeted numeric composed event.
 * @fires change - Retargeted numeric composed event.
 */
class PropskitWheel extends FigLabPropskitElement {
  static #RESERVED_ATTRS = new Set([
    "label",
    "size",
    "disabled",
    "variant",
    "elastic",
    "spin",
    "text",
    "default",
    "class",
    "style",
    "id",
    "oninput",
    "onchange",
  ]);

  static get observedAttributes() {
    return [
      "label",
      "aria-label",
      "units",
      "value",
      "disabled",
      "step",
      "precision",
      "min",
      "max",
      "elastic",
      "spin",
      "text",
    ];
  }

  #surface = null;
  #wheel = null;
  #label = null;
  #input = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #initialValue = null;
  #elasticPointerId = null;
  #elasticMaxPx = 0;
  #elasticRangeRect = null;
  #elasticHostWidth = 0;
  #surfacePointerId = null;
  #numberPointerId = null;
  #numberPointerStartX = 0;
  #numberPointerStartY = 0;
  #numberPointerStartValue = 0;
  #isNumberScrubbing = false;
  #suppressNumberClick = false;
  #numberClickResetTimer = 0;
  #animateNumberInputHandle = false;
  #boundPrimitiveInput = this.#handlePrimitiveEvent.bind(this, "input");
  #boundPrimitiveChange = this.#handlePrimitiveEvent.bind(this, "change");
  #boundNumberInput = this.#handleNumberEvent.bind(this, "input");
  #boundNumberChange = this.#handleNumberEvent.bind(this, "change");
  #boundNumberKeyDown = this.#handleNumberKeyDown.bind(this);
  #boundNumberPointerDown = this.#handleNumberPointerDown.bind(this);
  #boundNumberPointerMove = this.#handleNumberPointerMove.bind(this);
  #boundNumberPointerEnd = this.#handleNumberPointerEnd.bind(this);
  #boundSurfacePointerDown = this.#handleSurfacePointerDown.bind(this);
  #boundSurfacePointerMove = this.#handleSurfacePointerMove.bind(this);
  #boundSurfacePointerEnd = this.#handleSurfacePointerEnd.bind(this);
  #boundElasticPointerMove = this.#handleElasticPointerMove.bind(this);
  #boundElasticPointerEnd = this.#handleElasticPointerEnd.bind(this);
  #boundClick = this.#handleClick.bind(this);

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncLabel();
    this.#syncText();
    this.#syncPrimitive();
    this.#syncInputAttributes();
    this.#bindEvents();
    figLabConnectPropskitResetMenu(this);
    this.#observer?.disconnect();
    this.#observer = new MutationObserver((mutations) => {
      if (
        mutations.some(
          ({ type, attributeName }) =>
            type === "attributes" &&
            attributeName &&
            !PropskitWheel.#RESERVED_ATTRS.has(attributeName) &&
            !PropskitWheel.observedAttributes.includes(attributeName) &&
            !attributeName.startsWith("data-"),
        )
      ) {
        this.#syncInputAttributes();
      }
    });
    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#stopSurfaceTracking();
    this.#stopElasticTracking();
    this.#unbindEvents();
    this.#stopNumberTracking();
    clearTimeout(this.#numberClickResetTimer);
    this.#numberClickResetTimer = 0;
    this.#wheel?.endScrub(false);
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "label" || name === "aria-label") this.#syncLabel();
    if (name === "text") this.#syncText();
    if (name === "elastic" && newValue === "false") {
      this.#stopElasticTracking();
    }
    if (
      [
        "units",
        "value",
        "disabled",
        "step",
        "min",
        "max",
        "elastic",
        "spin",
      ].includes(name)
    ) {
      this.#syncPrimitive();
    }
    if (
      ["units", "value", "disabled", "step", "precision", "min", "max"].includes(
        name,
      )
    ) {
      this.#syncInputAttributes();
    }
  }

  #initialize() {
    this.#initialValue = this.getAttribute("value") ?? "0";
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const surface = figLabCreateElement("div", {
      className: "propskit-wheel-surface",
    });
    const label = customLabel || document.createElement("label");
    const wheel = document.createElement("fig-input-wheel");
    const input = document.createElement("fig-input-number");
    surface.append(label, wheel, input);
    this.#surface = surface;
    this.#wheel = wheel;
    this.#label = label;
    this.#input = input;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(surface);
    for (const node of initialChildren) {
      if (node !== customLabel) input.appendChild(node);
    }
  }

  #syncLabel() {
    const labelId = figLabSyncPropskitLabel(
      this,
      this.#surface,
      this.#label,
      this.#hasCustomLabel,
    );
    figLabSyncPropskitControlLabel(this, this.#wheel, labelId, "Wheel");
    figLabSyncPropskitControlLabel(this, this.#input, labelId, "Number");
  }

  #syncText() {
    if (!this.#surface || !this.#input) return;
    const enabled = this.getAttribute("text") !== "false";
    const isInserted = this.#input.parentElement === this.#surface;
    if (enabled && !isInserted) this.#surface.append(this.#input);
    else if (!enabled && isInserted) this.#input.remove();
  }

  #mirrorAttribute(name) {
    if (!this.#wheel) return;
    if (this.hasAttribute(name)) {
      this.#wheel.setAttribute(name, this.getAttribute(name) ?? "");
    } else {
      this.#wheel.removeAttribute(name);
    }
  }

  #syncPrimitive() {
    if (!this.#wheel) return;
    this.#wheel.removeAttribute("units");
    for (const name of ["min", "max", "spin"]) {
      this.#mirrorAttribute(name);
    }
    if (this.hasAttribute("step")) this.#mirrorAttribute("step");
    else this.#wheel.setAttribute("step", String(this.#defaultStep()));
    this.#wheel.toggleAttribute(
      "disabled",
      figLabBooleanAttribute(this, "disabled"),
    );
    const publicValue = figLabFiniteNumberOrNull(this.getAttribute("value"));
    this.#wheel.value = publicValue ?? 0;
    const normalized = String(this.#wheel.value);
    if (publicValue !== null && this.getAttribute("value") !== normalized) {
      this.setAttribute("value", normalized);
    }
    const inputValue = publicValue === null ? "" : normalized;
    if (this.#input?.getAttribute("value") !== inputValue) {
      this.#input?.setAttribute("value", inputValue);
    }
    this.#syncPrimitiveAria();
  }

  #getForwardedInputAttrNames() {
    return this.getAttributeNames().filter(
      (name) =>
        !PropskitWheel.#RESERVED_ATTRS.has(name) &&
        !PropskitWheel.observedAttributes.includes(name) &&
        !name.startsWith("data-"),
    );
  }

  #units() {
    const raw = (this.getAttribute("units") || "").trim();
    const normalized = raw.toLowerCase();
    if (
      normalized === "ms" ||
      normalized === "millisecond" ||
      normalized === "milliseconds"
    ) {
      return "ms";
    }
    if (
      normalized === "s" ||
      normalized === "second" ||
      normalized === "seconds"
    ) {
      return "s";
    }
    return raw;
  }

  #defaultStep() {
    const units = this.#units();
    if (units === "s") return 0.1;
    if (units === "ms") return 100;
    return 1;
  }

  #defaultPrecision() {
    return this.#units() === "s" ? 2 : 0;
  }

  #syncPrimitiveAria() {
    if (!this.#wheel) return;
    const value = Number(this.#wheel.value);
    const units = this.#units();
    this.#wheel.setAttribute(
      "aria-valuetext",
      units
        ? `${value} ${
            units === "s" ? "seconds" : units === "ms" ? "milliseconds" : units
          }`
        : String(value),
    );
  }

  #syncInputAttributes() {
    if (!this.#input || !this.#wheel) return;
    const forwarded = this.#getForwardedInputAttrNames();
    const nextManaged = new Set(forwarded);
    for (const name of this.#managedInputAttrs) {
      if (!nextManaged.has(name)) this.#input.removeAttribute(name);
    }
    for (const name of forwarded) {
      this.#input.setAttribute(name, this.getAttribute(name) ?? "");
    }
    const units = this.#units();
    if (units) this.#input.setAttribute("units", units);
    else this.#input.removeAttribute("units");
    this.#input.setAttribute("step", String(this.#wheel.step));
    if (this.hasAttribute("precision")) {
      this.#input.setAttribute(
        "precision",
        this.getAttribute("precision") ?? "",
      );
    } else {
      this.#input.setAttribute("precision", String(this.#defaultPrecision()));
    }
    for (const name of ["min", "max"]) {
      const value = this.#wheel[name];
      if (value === null) this.#input.removeAttribute(name);
      else this.#input.setAttribute(name, String(value));
    }
    this.#input.toggleAttribute(
      "disabled",
      figLabBooleanAttribute(this, "disabled"),
    );
    this.#input.setAttribute("value", String(this.value ?? ""));
    this.#managedInputAttrs = nextManaged;
  }

  #bindEvents() {
    this.#unbindEvents();
    this.#wheel?.addEventListener("input", this.#boundPrimitiveInput);
    this.#wheel?.addEventListener("change", this.#boundPrimitiveChange);
    this.#input?.addEventListener("input", this.#boundNumberInput);
    this.#input?.addEventListener("change", this.#boundNumberChange);
    this.#input?.addEventListener("keydown", this.#boundNumberKeyDown, {
      capture: true,
    });
    this.addEventListener("pointerdown", this.#boundSurfacePointerDown, {
      capture: true,
    });
    this.addEventListener("pointerdown", this.#boundNumberPointerDown, {
      capture: true,
    });
    this.addEventListener("click", this.#boundClick, true);
  }

  #unbindEvents() {
    this.#wheel?.removeEventListener("input", this.#boundPrimitiveInput);
    this.#wheel?.removeEventListener("change", this.#boundPrimitiveChange);
    this.#input?.removeEventListener("input", this.#boundNumberInput);
    this.#input?.removeEventListener("change", this.#boundNumberChange);
    this.#input?.removeEventListener("keydown", this.#boundNumberKeyDown, {
      capture: true,
    });
    this.removeEventListener("pointerdown", this.#boundSurfacePointerDown, {
      capture: true,
    });
    this.removeEventListener("pointerdown", this.#boundNumberPointerDown, {
      capture: true,
    });
    this.removeEventListener("click", this.#boundClick, true);
  }

  #setSynchronizedValue(
    value,
    { spin = false, animateHandle = false } = {},
  ) {
    const parsed = figLabFiniteNumberOrNull(value);
    if (parsed === null) {
      this.removeAttribute("value");
      if (this.#wheel) this.#wheel.value = 0;
      this.#input?.setAttribute("value", "");
      this.#syncPrimitiveAria();
      return null;
    }
    if (!this.#wheel) {
      this.setAttribute("value", String(parsed));
      return parsed;
    }
    if (spin) this.#wheel.spinTo(parsed, { animateHandle });
    else this.#wheel.value = parsed;
    const normalized = this.#wheel.value;
    if (this.getAttribute("value") !== normalized) {
      this.setAttribute("value", normalized);
    }
    if (this.#input?.getAttribute("value") !== normalized) {
      this.#input?.setAttribute("value", normalized);
    }
    this.#syncPrimitiveAria();
    return Number(normalized);
  }

  #emit(type) {
    figLabDispatchPropskitEvent(this, type);
  }

  #handlePrimitiveEvent(type, event) {
    event.stopImmediatePropagation();
    this.#setSynchronizedValue(event.detail);
    this.#emit(type);
  }

  #handleNumberEvent(type, event) {
    event.stopImmediatePropagation();
    if (figLabBooleanAttribute(this, "disabled")) return;
    const raw =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : this.#input?.value;
    this.#setSynchronizedValue(raw, {
      spin: type === "input",
      animateHandle: type === "input" && this.#animateNumberInputHandle,
    });
    if (type === "input") this.#animateNumberInputHandle = false;
    this.#emit(type);
  }

  #handleNumberKeyDown(event) {
    this.#animateNumberInputHandle =
      !figLabBooleanAttribute(this, "disabled") &&
      (event.key === "ArrowUp" || event.key === "ArrowDown");
    window.setTimeout(() => {
      this.#animateNumberInputHandle = false;
    }, 0);
  }

  #handleSurfacePointerDown(event) {
    if (
      event.button !== 0 ||
      figLabBooleanAttribute(this, "disabled") ||
      !(event.target instanceof Element) ||
      event.target.closest("fig-input-number") ||
      event.target.closest(".propskit-wheel-surface") !== this.#surface
    ) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#stopSurfaceTracking();
    const started = this.#wheel?.beginScrub({
      clientX: event.clientX,
      pointerId: event.pointerId,
      startValue: Number(this.#wheel.value),
    });
    if (!started) return;
    this.#surfacePointerId = event.pointerId;
    this.#startElasticTracking(event.pointerId);
    window.addEventListener("pointermove", this.#boundSurfacePointerMove);
    window.addEventListener("pointerup", this.#boundSurfacePointerEnd);
    window.addEventListener("pointercancel", this.#boundSurfacePointerEnd);
    window.addEventListener("blur", this.#boundSurfacePointerEnd);
  }

  #handleSurfacePointerMove(event) {
    if (event.pointerId !== this.#surfacePointerId) return;
    if (event.buttons === 0) {
      this.#handleSurfacePointerEnd(event);
      return;
    }
    this.#wheel?.updateScrub(event);
  }

  #handleSurfacePointerEnd(event) {
    if (
      event?.pointerId !== undefined &&
      this.#surfacePointerId !== null &&
      event.pointerId !== this.#surfacePointerId
    ) {
      return;
    }
    this.#wheel?.endScrub();
    this.#stopSurfaceTracking();
    this.#stopElasticTracking();
  }

  #stopSurfaceTracking() {
    window.removeEventListener("pointermove", this.#boundSurfacePointerMove);
    window.removeEventListener("pointerup", this.#boundSurfacePointerEnd);
    window.removeEventListener("pointercancel", this.#boundSurfacePointerEnd);
    window.removeEventListener("blur", this.#boundSurfacePointerEnd);
    this.#surfacePointerId = null;
  }

  #startElasticTracking(pointerId) {
    this.#stopElasticTracking();
    if (this.getAttribute("elastic") === "false") return;
    this.#elasticPointerId = pointerId;
    this.#elasticMaxPx = this.#readCssLength(
      "--propskit-wheel-elastic-distance",
    );
    const rangeRect = this.getBoundingClientRect();
    if (rangeRect) {
      this.#elasticRangeRect = {
        left: rangeRect.left,
        right: rangeRect.right,
      };
    }
    this.#elasticHostWidth = this.getBoundingClientRect().width;
    window.addEventListener("pointermove", this.#boundElasticPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", this.#boundElasticPointerEnd);
    window.addEventListener("pointercancel", this.#boundElasticPointerEnd);
    window.addEventListener("blur", this.#boundElasticPointerEnd);
  }

  #handleElasticPointerMove(event) {
    if (event.pointerId !== this.#elasticPointerId) return;
    if (event.buttons === 0) {
      this.#handleElasticPointerEnd(event);
      return;
    }
    this.#updateElasticStretch(event.clientX);
  }

  #handleElasticPointerEnd(event) {
    if (
      event?.pointerId !== undefined &&
      this.#elasticPointerId !== null &&
      event.pointerId !== this.#elasticPointerId
    ) {
      return;
    }
    this.#stopElasticTracking();
  }

  #updateElasticStretch(pointerX) {
    const rect = this.#elasticRangeRect;
    if (!rect || !this.#elasticMaxPx) {
      this.#clearElasticStretch();
      return;
    }
    const overshoot =
      pointerX < rect.left
        ? pointerX - rect.left
        : pointerX > rect.right
          ? pointerX - rect.right
          : 0;
    if (!overshoot) {
      this.#clearElasticStretch();
      return;
    }
    const stretch = Math.min(this.#elasticMaxPx, Math.abs(overshoot) * 0.5);
    const scale = this.#elasticHostWidth
      ? (this.#elasticHostWidth + stretch) / this.#elasticHostWidth
      : 1;
    this.toggleAttribute("data-propskit-wheel-elastic-dragging", true);
    this.style.setProperty("--propskit-wheel-elastic-scale", String(scale));
    this.style.setProperty(
      "--propskit-wheel-elastic-origin",
      overshoot < 0 ? "right center" : "left center",
    );
  }

  #readCssLength(propertyName) {
    let raw = getComputedStyle(this).getPropertyValue(propertyName).trim();
    if (raw.includes("var(") || !raw.endsWith("px")) {
      const probe = document.createElement("div");
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        width: `var(${propertyName})`,
      });
      this.appendChild(probe);
      raw = getComputedStyle(probe).width;
      probe.remove();
    }
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  #stopElasticTracking() {
    window.removeEventListener("pointermove", this.#boundElasticPointerMove);
    window.removeEventListener("pointerup", this.#boundElasticPointerEnd);
    window.removeEventListener("pointercancel", this.#boundElasticPointerEnd);
    window.removeEventListener("blur", this.#boundElasticPointerEnd);
    this.#elasticPointerId = null;
    this.#elasticMaxPx = 0;
    this.#elasticRangeRect = null;
    this.#elasticHostWidth = 0;
    this.#clearElasticStretch();
  }

  #clearElasticStretch() {
    this.removeAttribute("data-propskit-wheel-elastic-dragging");
    this.style.removeProperty("--propskit-wheel-elastic-scale");
    this.style.removeProperty("--propskit-wheel-elastic-origin");
  }

  #handleNumberPointerDown(event) {
    if (
      event.button !== 0 ||
      event.altKey ||
      figLabBooleanAttribute(this, "disabled") ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const input = event.target.closest("fig-input-number input");
    if (!input || input === document.activeElement) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#stopNumberTracking();
    this.#numberPointerId = event.pointerId;
    this.#numberPointerStartX = event.clientX;
    this.#numberPointerStartY = event.clientY;
    this.#numberPointerStartValue = Number(this.#wheel?.value ?? 0);
    window.addEventListener("pointermove", this.#boundNumberPointerMove);
    window.addEventListener("pointerup", this.#boundNumberPointerEnd, {
      once: true,
    });
    window.addEventListener("pointercancel", this.#boundNumberPointerEnd, {
      once: true,
    });
    window.addEventListener("blur", this.#boundNumberPointerEnd, {
      once: true,
    });
  }

  #handleNumberPointerMove(event) {
    if (event.pointerId !== this.#numberPointerId) return;
    if (event.buttons === 0) {
      this.#handleNumberPointerEnd(event);
      return;
    }
    if (!this.#isNumberScrubbing) {
      const distance = Math.hypot(
        event.clientX - this.#numberPointerStartX,
        event.clientY - this.#numberPointerStartY,
      );
      if (distance < 4) return;
      this.#isNumberScrubbing = true;
      this.setAttribute("data-number-scrubbing", "");
      this.#startElasticTracking(event.pointerId);
      this.#wheel?.beginScrub({
        clientX: this.#numberPointerStartX,
        pointerId: event.pointerId,
        startValue: this.#numberPointerStartValue,
      });
    }
    this.#wheel?.updateScrub(event);
    this.#updateElasticStretch(event.clientX);
  }

  #handleNumberPointerEnd(event) {
    if (
      event?.pointerId !== undefined &&
      this.#numberPointerId !== null &&
      event.pointerId !== this.#numberPointerId
    ) {
      return;
    }
    const wasScrubbing = this.#isNumberScrubbing;
    this.#stopElasticTracking();
    this.#stopNumberTracking();
    if (wasScrubbing) {
      this.#wheel?.endScrub();
      this.#suppressNumberClick = true;
      clearTimeout(this.#numberClickResetTimer);
      this.#numberClickResetTimer = window.setTimeout(() => {
        this.#suppressNumberClick = false;
        this.#numberClickResetTimer = 0;
      }, 0);
      requestAnimationFrame(() => this.#wheel?.focus());
      return;
    }
    this.#input?.querySelector("input")?.focus();
  }

  #stopNumberTracking() {
    window.removeEventListener("pointermove", this.#boundNumberPointerMove);
    window.removeEventListener("pointerup", this.#boundNumberPointerEnd);
    window.removeEventListener("pointercancel", this.#boundNumberPointerEnd);
    window.removeEventListener("blur", this.#boundNumberPointerEnd);
    this.#numberPointerId = null;
    this.#isNumberScrubbing = false;
    this.removeAttribute("data-number-scrubbing");
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-number, fig-menu")
    ) {
      if (
        this.#suppressNumberClick &&
        event.target.closest("fig-input-number")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.#suppressNumberClick = false;
      }
      return;
    }
    if (
      !(event.target instanceof Element) ||
      !event.target.closest("fig-input-wheel")
    ) {
      this.#wheel?.focus();
    }
  }

  get value() {
    return figLabFiniteNumberOrNull(this.getAttribute("value"));
  }

  set value(nextValue) {
    this.#setSynchronizedValue(nextValue);
  }

  get min() {
    return this.#wheel?.min ?? null;
  }

  set min(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("min");
    } else {
      const parsed = Number(nextValue);
      if (Number.isFinite(parsed)) this.setAttribute("min", String(parsed));
      else this.removeAttribute("min");
    }
  }

  get max() {
    return this.#wheel?.max ?? null;
  }

  set max(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("max");
    } else {
      const parsed = Number(nextValue);
      if (Number.isFinite(parsed)) this.setAttribute("max", String(parsed));
      else this.removeAttribute("max");
    }
  }

  get defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "0";
  }

  get isDefault() {
    return figLabPropskitValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    this.#setSynchronizedValue(this.defaultValue);
    figLabEmitPropskitReset(this);
  }

  focus(options) {
    this.#wheel?.focus(options);
  }
}
figLabDefineElement("propskit-wheel", PropskitWheel);

/* Canvas Control */
/**
 * A composite spatial control built from one or more fig-handle elements.
 * @attr {number} precision - Decimal places for positions, radius, angle, and internal handle dragging (default 2).
 */
class FigCanvasControl extends HTMLElement {
  static observedAttributes = [
    "type",
    "value",
    "color",
    "name",
    "tooltips",
    "disabled",
    "drag-surface",
    "snapping",
    "precision",
  ];

  #x = 50;
  #y = 50;
  #x2 = 75;
  #y2 = 75;
  #radius = 0;
  #radiusIsPercent = false;
  #angle = 0;
  #pointHandle = null;
  #secondHandle = null;
  #angleHandle = null;
  #radiusSvg = null;
  #angleSvg = null;
  #pointTooltip = null;
  #secondTooltip = null;
  #radiusTooltip = null;
  #angleTooltip = null;
  #isDragging = false;
  #isSecondDragging = false;
  #isRadiusDragging = false;
  #isAngleDragging = false;
  #moveCursorPointerId = null;
  #moveCursorPrevBodyCursor = "";
  #moveCursorPrevBodyCursorPriority = "";
  #boundMoveCursorEnd = null;
  #rotateCursorPointerId = null;
  #rotateCursorHandle = null;
  #rotateCursorPrevBodyCursor = "";
  #rotateCursorPrevBodyCursorPriority = "";
  #boundRotateCursorEnd = null;
  #activeGestureController = null;
  #activeGestureFinish = null;

  get #type() {
    return this.getAttribute("type") || "point";
  }

  get #hasRadius() {
    return this.#type === "point-radius" || this.#type === "point-radius-angle";
  }

  get #hasAngle() {
    return this.#type === "point-radius-angle";
  }

  get #hasSecondPoint() {
    return this.#type === "point-point";
  }

  get #hasLine() {
    return this.#type === "point-radius-angle" || this.#type === "point-point";
  }

  get #tooltipsEnabled() {
    const v = this.getAttribute("tooltips");
    return v === null || v !== "false";
  }

  get #snappingMode() {
    const raw = this.getAttribute("snapping");
    if (raw === null) return "false";
    const n = raw.trim().toLowerCase();
    if (n === "modifier") return "modifier";
    if (n === "" || n === "true") return "true";
    return "false";
  }

  get #precision() {
    const parsed = Number(this.getAttribute("precision") ?? 2);
    if (!Number.isFinite(parsed)) return 2;
    return Math.max(0, Math.min(8, Math.trunc(parsed)));
  }

  #roundPosition(value) {
    const factor = 10 ** this.#precision;
    const rounded = Math.round(value * factor) / factor;
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  #syncHandlePrecision() {
    const precision = this.getAttribute("precision");
    for (const handle of [
      this.#pointHandle,
      this.#angleHandle,
      this.#secondHandle,
    ]) {
      if (!handle) continue;
      if (precision === null) handle.removeAttribute("precision");
      else handle.setAttribute("precision", String(this.#precision));
    }
  }

  #shouldSnap(shiftKey) {
    const mode = this.#snappingMode;
    if (mode === "true") return true;
    if (mode === "modifier") return !!shiftKey;
    return false;
  }

  get #pointTipText() {
    const name = this.getAttribute("name");
    if (name) {
      const parts = name.split(",");
      return parts[0].trim();
    }
    return `${this.#roundPosition(this.#x)}%, ${this.#roundPosition(this.#y)}%`;
  }

  get #secondTipText() {
    const name = this.getAttribute("name");
    if (name) {
      const parts = name.split(",");
      if (parts.length > 1) return parts[1].trim();
    }
    return `${this.#roundPosition(this.#x2)}%, ${this.#roundPosition(this.#y2)}%`;
  }

  get #dragSurface() {
    return this.getAttribute("drag-surface") || "parent";
  }

  get #container() {
    const surface = this.#dragSurface;
    if (surface === "parent") return this.parentElement;
    return this.closest(surface);
  }

  get #handleDragSurface() {
    const surface = this.#dragSurface;
    if (surface === "parent") {
      const container = this.parentElement;
      if (container) {
        container.setAttribute("data-fig-canvas-control-surface", "");
        return "[data-fig-canvas-control-surface]";
      }
    }
    return surface;
  }

  #resolveRadius(containerWidth) {
    if (this.#radiusIsPercent) return (this.#radius / 100) * containerWidth;
    return this.#radius;
  }

  #formatRadius() {
    const radius = this.#roundPosition(this.#radius);
    if (this.#radiusIsPercent) return `Radius ${radius}%`;
    return `Radius ${radius}`;
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
  }

  disconnectedCallback() {
    this.#cancelActiveGesture();
    this.#teardownRadiusDrag();
    this.#deactivateMoveCursor();
    this.#deactivateRotateCursor();
    document.body.classList.remove("fig-lab-move-active");
    document.body.classList.remove("fig-lab-rotate-active");
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (
      name === "value" &&
      !this.#isDragging &&
      !this.#isSecondDragging &&
      !this.#isRadiusDragging &&
      !this.#isAngleDragging
    ) {
      this.#parseValue();
      if (this.#pointHandle) this.#syncPositions();
      else this.#render();
    }
    if (name === "type") {
      this.#cancelActiveGesture();
      this.#parseValue();
      this.#render();
    }
    if (name === "color" && this.#pointHandle) {
      if (newVal) this.#pointHandle.setAttribute("color", newVal);
      else this.#pointHandle.removeAttribute("color");
    }
    if (name === "disabled") {
      this.#cancelActiveGesture();
      this.#render();
    }
    if (name === "tooltips") {
      this.#render();
    }
    if (name === "snapping" && this.#pointHandle) {
      this.#pointHandle.setAttribute("drag-snapping", newVal || "false");
      if (this.#secondHandle)
        this.#secondHandle.setAttribute("drag-snapping", newVal || "false");
    }
    if (name === "precision") {
      if (!this.isConnected) return;
      this.#syncHandlePrecision();
      this.#x = this.#roundPosition(this.#x);
      this.#y = this.#roundPosition(this.#y);
      this.#x2 = this.#roundPosition(this.#x2);
      this.#y2 = this.#roundPosition(this.#y2);
      this.#radius = this.#roundPosition(this.#radius);
      this.#angle = this.#roundPosition(this.#angle);
      this.#syncPositions();
      this.#syncValueAttribute();
    }
    if (name === "name") {
      if (this.#pointTooltip)
        this.#pointTooltip.setAttribute("text", this.#pointTipText);
      if (this.#secondTooltip)
        this.#secondTooltip.setAttribute("text", this.#secondTipText);
    }
  }

  #parseValue() {
    const raw = this.getAttribute("value");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      if (typeof v.x === "number") this.#x = this.#roundPosition(v.x);
      if (typeof v.y === "number") this.#y = this.#roundPosition(v.y);
      if (v.radius !== undefined) {
        const rs = String(v.radius);
        if (rs.endsWith("%")) {
          this.#radiusIsPercent = true;
          this.#radius = this.#roundPosition(parseFloat(rs));
        } else {
          this.#radiusIsPercent = false;
          this.#radius = this.#roundPosition(parseFloat(rs));
        }
        if (!Number.isFinite(this.#radius)) this.#radius = 0;
      }
      if (typeof v.angle === "number")
        this.#angle = this.#roundPosition(v.angle);
      if (typeof v.x2 === "number") this.#x2 = this.#roundPosition(v.x2);
      if (typeof v.y2 === "number") this.#y2 = this.#roundPosition(v.y2);
      if (
        this.#type === "color" &&
        typeof v.color === "string" &&
        v.color.trim() &&
        this.getAttribute("color") !== v.color.trim()
      ) {
        this.setAttribute("color", v.color.trim());
      }
    } catch {
      /* ignore */
    }
  }

  get value() {
    const v = {
      x: this.#roundPosition(this.#x),
      y: this.#roundPosition(this.#y),
    };
    if (this.#type === "color") {
      const color =
        this.getAttribute("color") || this.#pointHandle?.getAttribute("color");
      if (color) v.color = color;
    }
    if (this.#hasRadius) {
      const radius = this.#roundPosition(this.#radius);
      v.radius = this.#radiusIsPercent ? `${radius}%` : radius;
    }
    if (this.#hasAngle) v.angle = this.#roundPosition(this.#angle);
    if (this.#hasSecondPoint) {
      v.x2 = this.#roundPosition(this.#x2);
      v.y2 = this.#roundPosition(this.#y2);
    }
    return v;
  }

  set value(val) {
    if (typeof val === "object") {
      this.setAttribute("value", JSON.stringify(val));
    } else if (typeof val === "string") {
      this.setAttribute("value", val);
    }
  }

  #render() {
    this.#cancelActiveGesture();
    this.replaceChildren();
    this.#pointHandle = null;
    this.#secondHandle = null;
    this.#angleHandle = null;
    this.#radiusSvg = null;
    this.#angleSvg = null;
    this.#pointTooltip = null;
    this.#secondTooltip = null;
    this.#radiusTooltip = null;
    this.#angleTooltip = null;

    const disabled = figLabBooleanAttribute(this, "disabled");
    const type = this.#type;
    const tooltips = this.#tooltipsEnabled;

    const handleSurface = this.#handleDragSurface;

    const handle = document.createElement("fig-handle");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("drag-snapping", this.#snappingMode);
    handle.setAttribute("value", `${this.#x}% ${this.#y}%`);
    if (this.hasAttribute("precision")) {
      handle.setAttribute("precision", String(this.#precision));
    }
    if (disabled) handle.setAttribute("disabled", "");
    if (type === "color") {
      handle.setAttribute("type", "color");
      const color = this.getAttribute("color");
      if (color) handle.setAttribute("color", color);
    } else {
      handle.setAttribute("type", "canvas");
    }
    if (this.#hasSecondPoint) {
      handle.setAttribute("hit-area", "12 circle");
      handle.setAttribute("hit-area-mode", "delegate");
    }
    this.#pointHandle = handle;

    if (this.#hasRadius) {
      this.#createRadiusSvg();
    }

    if (this.#hasLine) {
      this.#createAngleSvg();
    }

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#pointTipText);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#pointTooltip = tip;
    } else {
      this.appendChild(handle);
    }

    if (this.#hasAngle) {
      this.#createAngleHandle(disabled, tooltips, handleSurface);
    }

    if (this.#hasSecondPoint) {
      this.#createSecondHandle(disabled, tooltips, handleSurface);
    }

    this.#setupHandleDragCursor(this.#pointHandle);
    this.#setupHandleDragCursor(this.#angleHandle);
    this.#setupHandleDragCursor(this.#secondHandle);
    this.#setupEventListeners();
    this.#wireHoverTooltips();
    requestAnimationFrame(() => this.#syncPositions());
  }

  #setupHandleDragCursor(handle) {
    if (!handle) return;
    handle.addEventListener(
      "pointerdown",
      (e) => {
        // Hit-area (outside ring) = rotate; handle body = move/resize.
        const onHitArea = e.target?.classList?.contains("fig-handle-hit-area");
        if (onHitArea && handle.querySelector(".fig-handle-hit-area")) {
          this.#activateRotateCursor(e, handle);
        } else {
          this.#activateMoveCursor(e);
        }
      },
      { capture: true },
    );
  }

  #activateMoveCursor(e) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (e?.button !== undefined && e.button !== 0) return;
    if (e?.isPrimary === false) return;

    if (this.#moveCursorPointerId === null) {
      this.#moveCursorPrevBodyCursor =
        document.body.style.getPropertyValue("cursor");
      this.#moveCursorPrevBodyCursorPriority =
        document.body.style.getPropertyPriority("cursor");
    }

    this.#moveCursorPointerId = e?.pointerId ?? -1;
    document.body.classList.add("fig-lab-move-active");
    document.body.style.setProperty(
      "cursor",
      "var(--fig-lab-cursor-move)",
      "important",
    );

    if (!this.#boundMoveCursorEnd) {
      this.#boundMoveCursorEnd = (event) => {
        if (
          event?.pointerId !== undefined &&
          this.#moveCursorPointerId !== null &&
          event.pointerId !== this.#moveCursorPointerId
        ) {
          return;
        }
        if (event?.type === "blur") {
          this.#deactivateMoveCursor();
        } else {
          requestAnimationFrame(() => this.#deactivateMoveCursor());
        }
      };
    }

    window.addEventListener("pointerup", this.#boundMoveCursorEnd);
    window.addEventListener("pointercancel", this.#boundMoveCursorEnd);
    window.addEventListener("blur", this.#boundMoveCursorEnd);
  }

  #deactivateMoveCursor() {
    if (this.#moveCursorPointerId === null) return;
    document.body.classList.remove("fig-lab-move-active");
    if (this.#moveCursorPrevBodyCursor) {
      document.body.style.setProperty(
        "cursor",
        this.#moveCursorPrevBodyCursor,
        this.#moveCursorPrevBodyCursorPriority,
      );
    } else {
      document.body.style.removeProperty("cursor");
    }
    this.#moveCursorPointerId = null;
    this.#moveCursorPrevBodyCursor = "";
    this.#moveCursorPrevBodyCursorPriority = "";
    if (this.#boundMoveCursorEnd) {
      window.removeEventListener("pointerup", this.#boundMoveCursorEnd);
      window.removeEventListener("pointercancel", this.#boundMoveCursorEnd);
      window.removeEventListener("blur", this.#boundMoveCursorEnd);
    }
  }

  #rotateDegForHandle(handle) {
    if (!handle) return 0;
    if (handle === this.#angleHandle) return this.#angle;
    if (!this.#hasSecondPoint) return 0;
    const lineDeg = this.#pointPointLineDeg();
    return handle === this.#pointHandle ? lineDeg + 180 : lineDeg;
  }

  #refreshBodyRotateCursor() {
    if (this.#rotateCursorPointerId === null) return;
    const cursor = this.#rotateCursorSvg(
      this.#rotateDegForHandle(this.#rotateCursorHandle),
    );
    document.body.style.setProperty("--fig-lab-cursor-rotate", cursor);
    document.body.style.setProperty("cursor", cursor, "important");
  }

  #activateRotateCursor(e, handle) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (e?.button !== undefined && e.button !== 0) return;
    if (e?.isPrimary === false) return;

    if (this.#rotateCursorPointerId === null) {
      this.#rotateCursorPrevBodyCursor =
        document.body.style.getPropertyValue("cursor");
      this.#rotateCursorPrevBodyCursorPriority =
        document.body.style.getPropertyPriority("cursor");
    }

    this.#rotateCursorPointerId = e?.pointerId ?? -1;
    this.#rotateCursorHandle = handle;
    document.body.classList.add("fig-lab-rotate-active");
    this.#refreshBodyRotateCursor();

    if (!this.#boundRotateCursorEnd) {
      this.#boundRotateCursorEnd = (event) => {
        if (
          event?.pointerId !== undefined &&
          this.#rotateCursorPointerId !== null &&
          event.pointerId !== this.#rotateCursorPointerId
        ) {
          return;
        }
        if (event?.type === "blur") {
          this.#deactivateRotateCursor();
        } else {
          requestAnimationFrame(() => this.#deactivateRotateCursor());
        }
      };
    }

    window.addEventListener("pointerup", this.#boundRotateCursorEnd);
    window.addEventListener("pointercancel", this.#boundRotateCursorEnd);
    window.addEventListener("blur", this.#boundRotateCursorEnd);
  }

  #deactivateRotateCursor() {
    if (this.#rotateCursorPointerId === null) return;
    document.body.classList.remove("fig-lab-rotate-active");
    document.body.style.removeProperty("--fig-lab-cursor-rotate");
    if (this.#rotateCursorPrevBodyCursor) {
      document.body.style.setProperty(
        "cursor",
        this.#rotateCursorPrevBodyCursor,
        this.#rotateCursorPrevBodyCursorPriority,
      );
    } else {
      document.body.style.removeProperty("cursor");
    }
    this.#rotateCursorPointerId = null;
    this.#rotateCursorHandle = null;
    this.#rotateCursorPrevBodyCursor = "";
    this.#rotateCursorPrevBodyCursorPriority = "";
    if (this.#boundRotateCursorEnd) {
      window.removeEventListener("pointerup", this.#boundRotateCursorEnd);
      window.removeEventListener("pointercancel", this.#boundRotateCursorEnd);
      window.removeEventListener("blur", this.#boundRotateCursorEnd);
    }
  }

  #wireHoverTooltip(target, getTooltip, getText, isDraggingRef) {
    if (!target) return;
    const shouldSuppress = () => !!isDraggingRef?.();
    const hideTooltip = () => {
      const tip = getTooltip();
      if (!tip) return;
      tip.removeAttribute("show");
      tip.hidePopup?.();
    };
    const show = () => {
      if (shouldSuppress()) {
        hideTooltip();
        return;
      }
      const tip = getTooltip();
      if (!tip) return;
      if (getText) tip.setAttribute("text", getText());
      tip.setAttribute("show", "true");
      tip.showPopup?.();
    };
    const hide = () => {
      hideTooltip();
    };
    target.addEventListener("pointerenter", show);
    target.addEventListener("pointerleave", hide);
  }

  #hasActiveInteraction() {
    return (
      this.#isDragging ||
      this.#isSecondDragging ||
      this.#isRadiusDragging ||
      this.#isAngleDragging
    );
  }

  #wireHoverTooltips() {
    if (this.#pointHandle) {
      this.#wireHoverTooltip(
        this.#pointHandle,
        () => this.#pointTooltip,
        () => this.#pointTipText,
        () =>
          this.#hasActiveInteraction() ||
          !!this.#pointHandle?.querySelector("fig-color-tip"),
      );
    }
    if (this.#angleHandle) {
      this.#wireHoverTooltip(
        this.#angleHandle,
        () => this.#angleTooltip,
        () => `Angle ${this.#roundPosition(this.#angle)}°`,
        () => this.#hasActiveInteraction(),
      );
    }
    if (this.#secondHandle) {
      this.#wireHoverTooltip(
        this.#secondHandle,
        () => this.#secondTooltip,
        () => this.#secondTipText,
        () => this.#hasActiveInteraction(),
      );
    }
    if (this.#radiusSvg) {
      const hit = this.#radiusSvg.querySelector(
        ".fig-canvas-control-radius-hit",
      );
      this.#wireRadiusHoverTooltip(hit || this.#radiusSvg);
    }

    if (this.#type === "color" && this.#pointHandle && this.#pointTooltip) {
      const obs = new MutationObserver(() => {
        if (this.#pointHandle?.querySelector("fig-color-tip")) {
          this.#pointTooltip?.removeAttribute("show");
          this.#pointTooltip?.hidePopup?.();
        }
      });
      obs.observe(this.#pointHandle, { childList: true, subtree: true });
    }
  }

  #setRadiusTooltipAnchorAt(clientX, clientY) {
    const tip = this.#radiusTooltip;
    if (!tip?.popup) return;
    const y = clientY - 8;
    tip.popup.anchor = {
      getBoundingClientRect: () => ({
        left: clientX,
        top: y,
        right: clientX,
        bottom: y,
        width: 0,
        height: 0,
        x: clientX,
        y,
      }),
    };
    tip.popup.queueReposition?.();
  }

  #wireRadiusHoverTooltip(target) {
    if (!target) return;
    target.addEventListener("pointerenter", (e) => {
      const tip = this.#radiusTooltip;
      if (!tip) return;
      tip.setAttribute("text", this.#formatRadius());
      tip.setAttribute("show", "true");
      tip.showPopup?.();
      this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
    });
    target.addEventListener("pointermove", (e) => {
      if (this.#isRadiusDragging) return;
      this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
    });
    target.addEventListener("pointerleave", () => {
      if (this.#isRadiusDragging) return;
      const tip = this.#radiusTooltip;
      if (!tip) return;
      tip.removeAttribute("show");
    });
  }

  #createRadiusSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.classList.add("fig-canvas-control-radius");
    svg.setAttribute("overflow", "visible");
    const hitCircle = document.createElementNS(ns, "circle");
    hitCircle.classList.add("fig-canvas-control-radius-hit");
    svg.appendChild(hitCircle);
    const haloCircle = document.createElementNS(ns, "circle");
    haloCircle.classList.add("fig-canvas-control-radius-halo");
    svg.appendChild(haloCircle);
    const circle = document.createElementNS(ns, "circle");
    svg.appendChild(circle);
    this.#radiusSvg = svg;

    if (this.#tooltipsEnabled) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#formatRadius());
      tip.appendChild(svg);
      this.appendChild(tip);
      this.#radiusTooltip = tip;
    } else {
      this.appendChild(svg);
    }

    this.#setupRadiusDrag(hitCircle);
  }

  #createAngleSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.classList.add("fig-canvas-control-angle-svg");
    svg.setAttribute("overflow", "visible");
    svg.style.position = "absolute";
    svg.style.pointerEvents = "none";
    if (this.#hasSecondPoint) {
      const hitLine = document.createElementNS(ns, "line");
      hitLine.classList.add("fig-canvas-control-angle-line-hit");
      hitLine.setAttribute("stroke", "transparent");
      hitLine.setAttribute("stroke-width", "12");
      hitLine.setAttribute("stroke-linecap", "round");
      hitLine.style.pointerEvents = "stroke";
      svg.appendChild(hitLine);
      this.#setupLineDrag(hitLine);
    }
    const haloLine = document.createElementNS(ns, "line");
    haloLine.classList.add("fig-canvas-control-angle-line-halo");
    svg.appendChild(haloLine);
    const line = document.createElementNS(ns, "line");
    line.classList.add("fig-canvas-control-angle-line");
    svg.appendChild(line);
    this.#angleSvg = svg;
    this.appendChild(svg);
  }

  #setupLineDrag(hitLine) {
    hitLine.addEventListener("pointerdown", (e) => {
      if (figLabBooleanAttribute(this, "disabled")) return;
      e.preventDefault();
      e.stopPropagation();
      const container = this.#container;
      if (!container) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const x0 = this.#x;
      const y0 = this.#y;
      const x20 = this.#x2;
      const y20 = this.#y2;
      this.#isDragging = true;
      this.#isSecondDragging = true;
      document.body.classList.add("fig-lab-move-active");
      hitLine.style.pointerEvents = "none";

      const onMove = (ev) => {
        const rect = container.getBoundingClientRect();
        const dxPctRaw =
          rect.width > 0 ? ((ev.clientX - startX) / rect.width) * 100 : 0;
        const dyPctRaw =
          rect.height > 0 ? ((ev.clientY - startY) / rect.height) * 100 : 0;
        const minDx = -Math.min(x0, x20);
        const maxDx = 100 - Math.max(x0, x20);
        const minDy = -Math.min(y0, y20);
        const maxDy = 100 - Math.max(y0, y20);
        const dxPct = Math.max(minDx, Math.min(maxDx, dxPctRaw));
        const dyPct = Math.max(minDy, Math.min(maxDy, dyPctRaw));
        this.#x = this.#roundPosition(x0 + dxPct);
        this.#y = this.#roundPosition(y0 + dyPct);
        this.#x2 = this.#roundPosition(x20 + dxPct);
        this.#y2 = this.#roundPosition(y20 + dyPct);
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        document.body.classList.remove("fig-lab-move-active");
        hitLine.style.pointerEvents = "stroke";
        this.#isDragging = false;
        this.#isSecondDragging = false;
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    });
  }

  #createAngleHandle(disabled, tooltips, handleSurface) {
    const handle = document.createElement("fig-handle");
    handle.setAttribute("type", "canvas");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("size", "small");
    handle.setAttribute("hit-area", "12 circle");
    handle.setAttribute("hit-area-mode", "delegate");
    if (this.hasAttribute("precision")) {
      handle.setAttribute("precision", String(this.#precision));
    }
    if (disabled) handle.setAttribute("disabled", "");
    this.#angleHandle = handle;

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", `${this.#roundPosition(this.#angle)}°`);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#angleTooltip = tip;
    } else {
      this.appendChild(handle);
    }
  }

  #createSecondHandle(disabled, tooltips, handleSurface) {
    const handle = document.createElement("fig-handle");
    handle.setAttribute("type", "canvas");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("drag-snapping", this.#snappingMode);
    handle.setAttribute("hit-area", "12 circle");
    handle.setAttribute("hit-area-mode", "delegate");
    handle.setAttribute("value", `${this.#x2}% ${this.#y2}%`);
    if (this.hasAttribute("precision")) {
      handle.setAttribute("precision", String(this.#precision));
    }
    if (disabled) handle.setAttribute("disabled", "");
    this.#secondHandle = handle;

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#secondTipText);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#secondTooltip = tip;
    } else {
      this.appendChild(handle);
    }
  }

  #resizeCursorSvg(deg) {
    const r = Math.round(deg);
    return `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(${r} 16 16)'%3E%3Cg filter='url(%23f)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M11.1212 16.9998L11.5607 17.4394C12.1465 18.0252 12.1464 18.975 11.5606 19.5607C10.9748 20.1465 10.0251 20.1465 9.4393 19.5606L6.4393 16.5604C5.85354 15.9746 5.85357 15.0249 6.43938 14.4391L9.43938 11.4393C10.0252 10.8535 10.9749 10.8536 11.5607 11.4394C12.1465 12.0252 12.1464 12.9749 11.5606 13.5607L11.1215 13.9998L20.8786 13.9999L20.4394 13.5607C19.8536 12.9749 19.8535 12.0252 20.4393 11.4394C21.0251 10.8536 21.9749 10.8536 22.5606 11.4394L25.5606 14.4393C25.842 14.7206 26 15.1021 26 15.4999C26 15.8978 25.842 16.2793 25.5607 16.5606L22.5607 19.5607C21.9749 20.1465 21.0251 20.1465 20.4393 19.5607C19.8536 18.9749 19.8535 18.0252 20.4393 17.4394L20.8788 16.9999L11.1212 16.9998Z' fill='white'/%3E%3C/g%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.8536 12.1465C11.0488 12.3417 11.0488 12.6583 10.8535 12.8536L8.70715 14.9998L23.2929 14.9999L21.1465 12.8536C20.9512 12.6583 20.9512 12.3417 21.1464 12.1465C21.3417 11.9512 21.6583 11.9512 21.8535 12.1465L24.8535 15.1464C24.9473 15.2402 25 15.3673 25 15.4999C25 15.6326 24.9473 15.7597 24.8536 15.8535L21.8536 18.8536C21.6583 19.0488 21.3417 19.0488 21.1465 18.8536C20.9512 18.6583 20.9512 18.3417 21.1464 18.1465L23.2929 15.9999L8.70705 15.9998L10.8536 18.1465C11.0488 18.3417 11.0488 18.6583 10.8535 18.8536C10.6583 19.0488 10.3417 19.0488 10.1464 18.8535L7.14643 15.8533C6.95118 15.658 6.95119 15.3415 7.14646 15.1462L10.1465 12.1464C10.3417 11.9512 10.6583 11.9512 10.8536 12.1465Z' fill='black'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='f' x='3' y='9' width='26' height='15' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='a'/%3E%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='b'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/%3E%3CfeBlend in2='a' result='c'/%3E%3CfeBlend in='SourceGraphic' in2='c'/%3E%3C/filter%3E%3C/defs%3E%3C/svg%3E") 16 16, nwse-resize`;
  }

  #rotateCursorSvg(deg) {
    const r = Math.round(deg - 45);
    return `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(${r} 16 16)'%3E%3Cg filter='url(%23f)'%3E%3Cpath d='M12.5607 22.4393L12.0216 21.9002C17.1558 21.2216 21.2216 17.1558 21.9002 12.0216L22.4393 12.5607C23.0251 13.1464 23.9749 13.1464 24.5607 12.5607C25.1464 11.9749 25.1464 11.0251 24.5607 10.4393L21.5607 7.43934C20.9749 6.85355 20.0251 6.85355 19.4393 7.43934L16.4393 10.4393C15.8536 11.0251 15.8536 11.9749 16.4393 12.5607C17.0251 13.1464 17.9749 13.1464 18.5607 12.5607L18.8056 12.3157C18.1013 15.5527 15.5527 18.1013 12.3157 18.8056L12.5607 18.5607C13.1464 17.9749 13.1464 17.0251 12.5607 16.4393C11.9749 15.8536 11.0251 15.8536 10.4393 16.4393L7.43934 19.4393C6.85356 20.0251 6.85356 20.9749 7.43934 21.5607L10.4393 24.5607C11.0251 25.1464 11.9749 25.1464 12.5607 24.5607C13.1464 23.9749 13.1464 23.0251 12.5607 22.4393Z' fill='white'/%3E%3C/g%3E%3Cpath d='M23.8536 11.8536C23.6583 12.0488 23.3417 12.0488 23.1464 11.8536L21 9.70711V10.5C21 16.299 16.299 21 10.5 21H9.70711L11.8536 23.1464C12.0488 23.3417 12.0488 23.6583 11.8536 23.8536C11.6583 24.0488 11.3417 24.0488 11.1464 23.8536L8.14645 20.8536C7.95119 20.6583 7.95119 20.3417 8.14645 20.1464L11.1464 17.1464C11.3417 16.9512 11.6583 16.9512 11.8536 17.1464C12.0488 17.3417 12.0488 17.6583 11.8536 17.8536L9.70711 20H10.5C15.7467 20 20 15.7467 20 10.5V9.70711L17.8536 11.8536C17.6583 12.0488 17.3417 12.0488 17.1464 11.8536C16.9512 11.6583 16.9512 11.3417 17.1464 11.1464L20.1464 8.14645C20.3417 7.95119 20.6583 7.95119 20.8536 8.14645L23.8536 11.1464C24.0488 11.3417 24.0488 11.6583 23.8536 11.8536Z' fill='black'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='f' x='4' y='5' width='24' height='24' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='a'/%3E%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='b'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/%3E%3CfeBlend in2='a' result='c'/%3E%3CfeBlend in='SourceGraphic' in2='c'/%3E%3C/filter%3E%3C/defs%3E%3C/svg%3E") 16 16, pointer`;
  }

  #setHitCursor(el, cursor) {
    if (!el) return;
    // !important — fig-canvas-control hover rules override plain inline cursor.
    el.style.setProperty("cursor", cursor, "important");
  }

  #applyRotateCursor(handle, deg) {
    if (!handle) return;
    // Rotate only on the outside hit-area ring — handle body uses normal point cursor.
    const hitArea = handle.querySelector(".fig-handle-hit-area");
    if (!hitArea) return;
    hitArea.setAttribute("data-cursor", "rotate");
    this.#setHitCursor(hitArea, this.#rotateCursorSvg(deg));
    if (this.#rotateCursorHandle === handle) {
      this.#refreshBodyRotateCursor();
    }
  }

  #syncAngleCursor() {
    if (!this.#angleHandle || !this.#hasAngle) return;
    this.#applyRotateCursor(this.#angleHandle, this.#angle);
  }

  #pointPointLineDeg() {
    return (Math.atan2(this.#y2 - this.#y, this.#x2 - this.#x) * 180) / Math.PI;
  }

  #syncPointPointCursors() {
    if (!this.#hasSecondPoint) return;
    const deg = this.#pointPointLineDeg();
    // Handle body: leave cursor to CSS (same as default point handle).
    this.#pointHandle?.style.removeProperty("cursor");
    this.#secondHandle?.style.removeProperty("cursor");
    this.#applyRotateCursor(this.#pointHandle, deg + 180);
    this.#applyRotateCursor(this.#secondHandle, deg);
  }

  #positionHandle(handle, xPct, yPct, rect) {
    handle.style.setProperty("--fig-handle-position-translate", "-50% -50%");
    handle.style.left = `${(xPct / 100) * rect.width}px`;
    handle.style.top = `${(yPct / 100) * rect.height}px`;
  }

  #syncPositions() {
    const container = this.#container;
    if (!container || !this.#pointHandle) return;
    const rect = container.getBoundingClientRect();

    this.#positionHandle(this.#pointHandle, this.#x, this.#y, rect);

    if (this.#radiusSvg) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const r = this.#resolveRadius(rect.width);
      const svg = this.#radiusSvg;
      const d = Math.max(r * 2, 1);
      svg.style.position = "absolute";
      svg.style.width = `${d}px`;
      svg.style.height = `${d}px`;
      svg.style.left = `${cx - r}px`;
      svg.style.top = `${cy - r}px`;
      svg.setAttribute("viewBox", `0 0 ${d} ${d}`);
      const circles = svg.querySelectorAll("circle");
      for (const c of circles) {
        c.setAttribute("cx", String(r));
        c.setAttribute("cy", String(r));
        c.setAttribute("r", String(Math.max(r - 1, 0)));
      }
    }

    if (this.#angleSvg && this.#hasLine) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      let lx2, ly2;
      if (this.#hasSecondPoint) {
        lx2 = (this.#x2 / 100) * rect.width;
        ly2 = (this.#y2 / 100) * rect.height;
      } else {
        const r = this.#resolveRadius(rect.width);
        const angleRad = (this.#angle * Math.PI) / 180;
        lx2 = cx + r * Math.cos(angleRad);
        ly2 = cy + r * Math.sin(angleRad);
      }

      const svg = this.#angleSvg;
      svg.style.width = `${rect.width}px`;
      svg.style.height = `${rect.height}px`;
      svg.style.left = "0";
      svg.style.top = "0";
      svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      const lines = svg.querySelectorAll(
        ".fig-canvas-control-angle-line, .fig-canvas-control-angle-line-halo, .fig-canvas-control-angle-line-hit",
      );
      for (const line of lines) {
        line.setAttribute("x1", String(cx));
        line.setAttribute("y1", String(cy));
        line.setAttribute("x2", String(lx2));
        line.setAttribute("y2", String(ly2));
      }
    }

    if (this.#angleHandle && this.#hasAngle) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const r = this.#resolveRadius(rect.width);
      const angleRad = (this.#angle * Math.PI) / 180;
      const ax = cx + r * Math.cos(angleRad);
      const ay = cy + r * Math.sin(angleRad);
      const pxPct = rect.width > 0 ? (ax / rect.width) * 100 : 0;
      const pyPct = rect.height > 0 ? (ay / rect.height) * 100 : 0;
      this.#positionHandle(this.#angleHandle, pxPct, pyPct, rect);
    }

    if (this.#secondHandle && this.#hasSecondPoint) {
      this.#positionHandle(this.#secondHandle, this.#x2, this.#y2, rect);
    }

    this.#syncAngleCursor();
    this.#syncPointPointCursors();
  }

  #emitInput(detail = this.value) {
    this.dispatchEvent(
      new CustomEvent("input", { bubbles: true, detail }),
    );
  }

  #emitChange(detail = this.value) {
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, detail }),
    );
  }

  #colorEventDetail(detail) {
    return {
      ...this.value,
      ...figLabColorEventAliases(
        detail.color,
        detail.alpha,
        detail.opacity,
      ),
    };
  }

  #syncValueAttribute() {
    this.setAttribute("value", JSON.stringify(this.value));
  }

  #setupEventListeners() {
    if (!this.#pointHandle) return;

    this.#pointHandle.addEventListener("input", (e) => {
      e.stopPropagation();
      if (e.detail?.color) {
        this.setAttribute(
          "color",
          this.#pointHandle.getAttribute("color") || e.detail.color,
        );
        this.#emitInput(this.#colorEventDetail(e.detail));
        return;
      }
      this.#isDragging = true;
      const px = e.detail?.px ?? this.#x / 100;
      const py = e.detail?.py ?? this.#y / 100;
      this.#x = this.#roundPosition(
        Math.max(0, Math.min(100, px * 100)),
      );
      this.#y = this.#roundPosition(
        Math.max(0, Math.min(100, py * 100)),
      );
      if (this.#pointTooltip) {
        this.#pointTooltip.removeAttribute("show");
        this.#pointTooltip.hidePopup?.();
      }
      this.#syncPositions();
      this.#emitInput();
    });

    this.#pointHandle.addEventListener("change", (e) => {
      e.stopPropagation();
      if (e.detail?.color) {
        this.setAttribute(
          "color",
          this.#pointHandle.getAttribute("color") || e.detail.color,
        );
        this.#emitChange(this.#colorEventDetail(e.detail));
        return;
      }
      const px = e.detail?.px ?? this.#x / 100;
      const py = e.detail?.py ?? this.#y / 100;
      this.#x = this.#roundPosition(
        Math.max(0, Math.min(100, px * 100)),
      );
      this.#y = this.#roundPosition(
        Math.max(0, Math.min(100, py * 100)),
      );
      if (this.#pointTooltip) this.#pointTooltip.removeAttribute("show");
      this.#syncPositions();
      this.#syncValueAttribute();
      this.#emitChange();
      requestAnimationFrame(() => {
        this.#isDragging = false;
      });
    });

    if (this.#angleHandle) {
      this.#angleHandle.addEventListener("input", (e) => {
        e.stopPropagation();
        const container = this.#container;
        if (!container) return;
        this.#isAngleDragging = true;
        this.classList.add("fig-canvas-control-ring-active");
        const rect = container.getBoundingClientRect();
        const cx = (this.#x / 100) * rect.width;
        const cy = (this.#y / 100) * rect.height;
        const hx = e.detail?.x ?? 0;
        const hy = e.detail?.y ?? 0;
        const hw = this.#angleHandle.offsetWidth / 2;
        const hh = this.#angleHandle.offsetHeight / 2;
        const dx = hx + hw - cx;
        const dy = hy + hh - cy;
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (this.#shouldSnap(e.detail?.shiftKey)) {
          angle = Math.round(angle / 15) * 15;
        }
        this.#angle = this.#roundPosition(angle);

        let dist = Math.sqrt(dx * dx + dy * dy);
        if (this.#shouldSnap(e.detail?.shiftKey)) {
          const step = this.#radiusIsPercent ? 5 : 10;
          if (this.#radiusIsPercent) {
            let pct = (dist / rect.width) * 100;
            pct = Math.round(pct / step) * step;
            dist = (pct / 100) * rect.width;
          } else {
            dist = Math.round(dist / step) * step;
          }
        }
        if (this.#radiusIsPercent) {
          this.#radius = this.#roundPosition(
            Math.max(0, (dist / rect.width) * 100),
          );
        } else {
          this.#radius = this.#roundPosition(Math.max(0, dist));
        }

        if (this.#angleTooltip) {
          this.#angleTooltip.setAttribute(
            "text",
            `Angle ${this.#roundPosition(this.#angle)}°`,
          );
          this.#angleTooltip.setAttribute("show", "true");
          this.#angleTooltip.showPopup?.();
        }
        this.#syncPositions();
        this.#emitInput();
      });

      this.#angleHandle.addEventListener("change", (e) => {
        e.stopPropagation();
        this.classList.remove("fig-canvas-control-ring-active");
        if (this.#angleTooltip) this.#angleTooltip.removeAttribute("show");
        this.#syncPositions();
        this.#syncValueAttribute();
        this.#emitChange();
        requestAnimationFrame(() => {
          this.#isAngleDragging = false;
        });
      });

      this.#angleHandle.addEventListener("hitareadown", (e) => {
        e.stopPropagation();
        const origEvent = e.detail?.originalEvent;
        if (!origEvent) return;
        origEvent.preventDefault();
        const container = this.#container;
        if (!container) return;
        this.#isAngleDragging = true;
        this.classList.add("fig-canvas-control-ring-active");
        this.#angleHandle.setAttribute("selected", "");

        if (this.#angleTooltip) {
          this.#angleTooltip.setAttribute("show", "true");
          this.#angleTooltip.showPopup?.();
        }

        const onMove = (ev) => {
          const rect = container.getBoundingClientRect();
          const cx = (this.#x / 100) * rect.width;
          const cy = (this.#y / 100) * rect.height;
          const dx = ev.clientX - rect.left - cx;
          const dy = ev.clientY - rect.top - cy;
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (this.#shouldSnap(ev.shiftKey)) {
            angle = Math.round(angle / 15) * 15;
          }
          this.#angle = this.#roundPosition(angle);
          if (this.#angleTooltip)
            this.#angleTooltip.setAttribute(
              "text",
              `Angle ${this.#roundPosition(angle)}°`,
            );
          this.#syncPositions();
          this.#emitInput();
        };

        const gesture = this.#beginActiveGesture((commit) => {
          this.#isAngleDragging = false;
          this.classList.remove("fig-canvas-control-ring-active");
          this.#angleHandle.removeAttribute("selected");
          if (this.#angleTooltip) this.#angleTooltip.removeAttribute("show");
          if (commit) {
            this.#syncValueAttribute();
            this.#emitChange();
          }
        });

        window.addEventListener("pointermove", onMove, { signal: gesture.signal });
        window.addEventListener("pointerup", () => gesture.finish(true), {
          signal: gesture.signal,
        });
        window.addEventListener("pointercancel", () => gesture.finish(false), {
          signal: gesture.signal,
        });
      });
    }

    if (this.#secondHandle) {
      this.#secondHandle.addEventListener("input", (e) => {
        e.stopPropagation();
        this.#isSecondDragging = true;
        const px = e.detail?.px ?? this.#x2 / 100;
        const py = e.detail?.py ?? this.#y2 / 100;
        this.#x2 = this.#roundPosition(
          Math.max(0, Math.min(100, px * 100)),
        );
        this.#y2 = this.#roundPosition(
          Math.max(0, Math.min(100, py * 100)),
        );
        if (this.#secondTooltip) {
          this.#secondTooltip.removeAttribute("show");
          this.#secondTooltip.hidePopup?.();
        }
        this.#syncPositions();
        this.#emitInput();
      });

      this.#secondHandle.addEventListener("change", (e) => {
        e.stopPropagation();
        if (this.#secondTooltip) this.#secondTooltip.removeAttribute("show");
        this.#syncPositions();
        this.#syncValueAttribute();
        this.#emitChange();
        requestAnimationFrame(() => {
          this.#isSecondDragging = false;
        });
      });

      this.#setupPointPointHitArea(this.#pointHandle, true);
      this.#setupPointPointHitArea(this.#secondHandle, false);
    }
  }

  #setupPointPointHitArea(handle, isFirst) {
    if (!handle) return;
    handle.addEventListener("hitareadown", (e) => {
      e.stopPropagation();
      const origEvent = e.detail?.originalEvent;
      if (!origEvent) return;
      origEvent.preventDefault();
      const container = this.#container;
      if (!container) return;
      this.#isDragging = true;
      const rect = container.getBoundingClientRect();

      const pivotX = isFirst ? this.#x2 : this.#x;
      const pivotY = isFirst ? this.#y2 : this.#y;
      const movingX = isFirst ? this.#x : this.#x2;
      const movingY = isFirst ? this.#y : this.#y2;
      const pcx = (pivotX / 100) * rect.width;
      const pcy = (pivotY / 100) * rect.height;
      const mcx = (movingX / 100) * rect.width;
      const mcy = (movingY / 100) * rect.height;
      const fixedLen = Math.sqrt((mcx - pcx) ** 2 + (mcy - pcy) ** 2);

      const tooltip = isFirst ? this.#pointTooltip : this.#secondTooltip;
      if (tooltip) {
        tooltip.removeAttribute("show");
        tooltip.hidePopup?.();
      }

      const onMove = (ev) => {
        const r = container.getBoundingClientRect();
        const px = (pivotX / 100) * r.width;
        const py = (pivotY / 100) * r.height;
        const dx = ev.clientX - r.left - px;
        const dy = ev.clientY - r.top - py;
        let angle = Math.atan2(dy, dx);
        if (this.#shouldSnap(ev.shiftKey)) {
          const snapDeg = Math.round((angle * 180) / Math.PI / 15) * 15;
          angle = (snapDeg * Math.PI) / 180;
        }
        const nx = px + fixedLen * Math.cos(angle);
        const ny = py + fixedLen * Math.sin(angle);
        const newPctX = Math.max(0, Math.min(100, (nx / r.width) * 100));
        const newPctY = Math.max(0, Math.min(100, (ny / r.height) * 100));
        if (isFirst) {
          this.#x = this.#roundPosition(newPctX);
          this.#y = this.#roundPosition(newPctY);
        } else {
          this.#x2 = this.#roundPosition(newPctX);
          this.#y2 = this.#roundPosition(newPctY);
        }
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        this.#isDragging = false;
        if (tooltip) tooltip.removeAttribute("show");
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    });
  }

  #setupRadiusDrag(circle) {
    if (!circle) return;
    circle.addEventListener("pointermove", (e) => {
      if (this.#isRadiusDragging) return;
      const container = this.#container;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const deg =
        (Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) *
          180) /
        Math.PI;
      this.#setHitCursor(circle, this.#resizeCursorSvg(deg));
    });
    const onDown = (e) => {
      if (figLabBooleanAttribute(this, "disabled")) return;
      e.preventDefault();
      e.stopPropagation();
      this.#isRadiusDragging = true;
      this.classList.add("fig-canvas-control-ring-active");
      const container = this.#container;
      if (!container) return;

      if (this.#radiusTooltip) {
        this.#radiusTooltip.setAttribute("show", "true");
        this.#radiusTooltip.showPopup?.();
        this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
      }
      if (this.#angleTooltip) {
        this.#angleTooltip.removeAttribute("show");
        this.#angleTooltip.hidePopup?.();
      }
      const prevAnglePointerEvents = this.#angleHandle?.style.pointerEvents;
      const angleHitArea = this.#angleHandle?.querySelector(
        ".fig-handle-hit-area",
      );
      const prevAngleHitPointerEvents = angleHitArea?.style.pointerEvents;
      if (this.#angleHandle) {
        this.#angleHandle.style.pointerEvents = "none";
      }
      if (angleHitArea) {
        angleHitArea.style.pointerEvents = "none";
      }

      const prevBodyCursor = document.body.style.cursor;
      circle.style.pointerEvents = "none";
      const rect0 = container.getBoundingClientRect();
      const cx0 = (this.#x / 100) * rect0.width;
      const cy0 = (this.#y / 100) * rect0.height;
      const initDeg =
        (Math.atan2(e.clientY - rect0.top - cy0, e.clientX - rect0.left - cx0) *
          180) /
        Math.PI;
      let lastCursorDeg = Math.round(initDeg);
      document.body.style.cursor = this.#resizeCursorSvg(lastCursorDeg);

      const onMove = (ev) => {
        const rect = container.getBoundingClientRect();
        const cx = (this.#x / 100) * rect.width;
        const cy = (this.#y / 100) * rect.height;
        const dx = ev.clientX - rect.left - cx;
        const dy = ev.clientY - rect.top - cy;
        const curDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
        if (curDeg !== lastCursorDeg) {
          lastCursorDeg = curDeg;
          document.body.style.cursor = this.#resizeCursorSvg(curDeg);
        }
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (this.#shouldSnap(ev.shiftKey)) {
          const step = this.#radiusIsPercent ? 5 : 10;
          if (this.#radiusIsPercent) {
            let pct = (dist / rect.width) * 100;
            pct = Math.round(pct / step) * step;
            dist = (pct / 100) * rect.width;
          } else {
            dist = Math.round(dist / step) * step;
          }
        }
        if (this.#radiusIsPercent) {
          this.#radius = this.#roundPosition(
            Math.max(0, (dist / rect.width) * 100),
          );
        } else {
          this.#radius = this.#roundPosition(Math.max(0, dist));
        }
        if (this.#radiusTooltip) {
          this.#radiusTooltip.setAttribute("text", this.#formatRadius());
          this.#setRadiusTooltipAnchorAt(ev.clientX, ev.clientY);
        }
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        this.#isRadiusDragging = false;
        this.classList.remove("fig-canvas-control-ring-active");
        circle.style.pointerEvents = "";
        if (this.#angleHandle) {
          this.#angleHandle.style.pointerEvents = prevAnglePointerEvents ?? "";
        }
        if (angleHitArea) {
          angleHitArea.style.pointerEvents = prevAngleHitPointerEvents ?? "";
        }
        document.body.style.cursor = prevBodyCursor;
        if (this.#radiusTooltip) this.#radiusTooltip.removeAttribute("show");
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    };
    circle.addEventListener("pointerdown", onDown);
    this._radiusDragCleanup = () =>
      circle.removeEventListener("pointerdown", onDown);
  }

  #teardownRadiusDrag() {
    if (this._radiusDragCleanup) {
      this._radiusDragCleanup();
      this._radiusDragCleanup = null;
    }
  }

  #beginActiveGesture(onFinish) {
    this.#cancelActiveGesture();
    const controller = new AbortController();
    let finished = false;
    const finish = (commit = false) => {
      if (finished) return;
      finished = true;
      controller.abort();
      if (this.#activeGestureController === controller) {
        this.#activeGestureController = null;
        this.#activeGestureFinish = null;
      }
      onFinish(commit);
    };
    this.#activeGestureController = controller;
    this.#activeGestureFinish = finish;
    return { signal: controller.signal, finish };
  }

  #cancelActiveGesture() {
    this.#activeGestureFinish?.(false);
    this.#activeGestureController?.abort();
    this.#activeGestureController = null;
    this.#activeGestureFinish = null;
  }
}
figLabDefineElement("fig-canvas-control", FigCanvasControl);

/* Oscillator Input */
/**
 * A waveform oscillator input with live SVG preview and parameter controls.
 * @attr {string} value - JSON string: {"waves":[{"type":"sine","frequency":1,"amplitude":1,"phase":0,"offset":0}]}
 * @attr {number} precision - Decimal places for output values.
 * @attr {string} aspect-ratio - SVG editor aspect ratio.
 * @attr {boolean} edit - Whether to show the editor and number fields. Defaults to true.
 */
class PropskitOscillator extends FigLabPropskitElement {
  #waves = [PropskitOscillator.#defaultWave()];
  #activeWaveIndex = 0;
  #precision = 2;
  #drawWidth = 240;
  #drawHeight = 120;
  #valueRange = { min: -1, max: 1 };
  #isDragging = null;
  #svg = null;
  #path = null;
  #playhead = null;
  #playheadFrame = 0;
  #baseline = null;
  #bounds = null;
  #handleAmplitude = null;
  #handleFrequency = null;
  #fields = [];
  #typeControls = [];
  #waveRows = [];
  #waveGroups = [];
  #expandedWaveIndices = new Set();
  #resizeObserver = null;
  #activeFieldInput = null;
  #dragController = null;
  #dragCleanup = null;
  #initialValue = null;

  static TYPES = [
    { name: "Wave", value: "sine" },
    { name: "Square", value: "square" },
    { name: "Sawtooth", value: "sawtooth" },
    { name: "Triangle", value: "triangle" },
  ];

  static #defaultWave(type = "sine") {
    return {
      type,
      frequency: 1,
      amplitude: 1,
      phase: 0,
      offset: 0,
    };
  }

  static get observedAttributes() {
    return ["value", "precision", "aspect-ratio", "edit", "disabled"];
  }

  connectedCallback() {
    if (this.#initialValue === null) {
      this.#initialValue =
        this.getAttribute("default") ??
        this.getAttribute("value") ??
        JSON.stringify({ waves: [PropskitOscillator.#defaultWave()] });
    }
    this.#precision = this.#readInteger("precision", 2);
    this.#parseValue(this.getAttribute("value"));
    this.#syncAspectRatio();
    this.#render();
    this.#setupResizeObserver();
    figLabConnectPropskitResetMenu(this);
  }

  disconnectedCallback() {
    this.#cancelDrag();
    this.#stopPlayhead();
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
    figLabDisconnectPropskitResetMenu(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "value") {
      this.#parseValue(newValue);
      if (this.isConnected) this.#render();
      return;
    }

    if (name === "precision") {
      this.#precision = this.#readInteger("precision", 2);
      if (this.isConnected) this.#syncUI();
      return;
    }

    if (name === "aspect-ratio") {
      this.#syncAspectRatio();
      if (this.#svg) this.#updateWaveform();
      return;
    }

    if (name === "edit" || name === "disabled") {
      if (this.isConnected) this.#render();
    }
  }

  get value() {
    return JSON.stringify(this.data);
  }

  set value(value) {
    this.setAttribute(
      "value",
      typeof value === "object" && value !== null ? JSON.stringify(value) : value,
    );
  }

  get defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "";
  }

  get isDefault() {
    const defaultWaves = this.#normalizedWaves(this.defaultValue);
    if (!defaultWaves) return false;
    return (
      JSON.stringify(this.data.waves) ===
      JSON.stringify(defaultWaves.map((wave) => this.#roundWave(wave)))
    );
  }

  resetToDefault() {
    const value = this.defaultValue;
    if (!value) return;
    this.value = value;
    this.#emit("input");
    this.#emit("change");
  }

  get data() {
    return {
      waves: this.#waves.map((wave) => this.#roundWave(wave)),
    };
  }

  get preset() {
    const wave = this.#activeWave;
    return PropskitOscillator.TYPES.find((type) => type.value === wave.type)?.name;
  }

  #readInteger(name, fallback) {
    const value = Number.parseInt(this.getAttribute(name) || "", 10);
    return Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : fallback;
  }

  #readBooleanAttribute(name, defaultValue = false) {
    const value = this.getAttribute(name);
    if (value === null) return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (normalized === "" || normalized === "true") return true;
    if (normalized === "false") return false;
    return true;
  }

  #isEditEnabled() {
    return this.getAttribute("edit") !== "false";
  }

  #isDisabled() {
    return this.#readBooleanAttribute("disabled", false);
  }

  #syncAspectRatio() {
    const aspectRatio = this.getAttribute("aspect-ratio") || "2 / 1";
    this.style.setProperty("--aspect-ratio", aspectRatio);
  }

  #parseValue(value) {
    const nextWaves = this.#normalizedWaves(value);
    if (!nextWaves) return false;
    this.#waves = nextWaves;
    if (!this.#waves.length) {
      this.#waves = [PropskitOscillator.#defaultWave()];
    }
    this.#activeWaveIndex = Math.min(this.#activeWaveIndex, this.#waves.length - 1);
    return true;
  }

  #normalizedWaves(value) {
    if (!value) return null;
    let parsed = null;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        return null;
      }
    } else if (typeof value === "object") {
      parsed = value;
    }
    if (!parsed) return null;
    const waves = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.waves)
        ? parsed.waves
        : [parsed];
    return waves.map((wave) => this.#normalizeWave(wave));
  }

  #normalizeWave(state = {}) {
    return {
      type: this.#normalizeType(state.type),
      frequency: this.#clampNumber(state.frequency, 1, 0.1, 16),
      amplitude: this.#clampNumber(state.amplitude, 1, -4, 4),
      phase: this.#clampNumber(state.phase, 0, -360, 360),
      offset: this.#clampNumber(state.offset, 0, -4, 4),
    };
  }

  #roundWave(wave) {
    return {
      type: wave.type,
      frequency: this.#round(wave.frequency),
      amplitude: this.#round(wave.amplitude),
      phase: this.#round(wave.phase),
      offset: this.#round(wave.offset),
    };
  }

  get #activeWave() {
    if (!this.#waves[this.#activeWaveIndex]) {
      this.#activeWaveIndex = 0;
    }
    return this.#waves[this.#activeWaveIndex] || PropskitOscillator.#defaultWave();
  }

  #normalizeType(type) {
    const normalized = String(type || "").toLowerCase();
    return PropskitOscillator.TYPES.some((item) => item.value === normalized)
      ? normalized
      : "sine";
  }

  #clampNumber(value, fallback, min, max) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  #round(value) {
    const scale = 10 ** this.#precision;
    return Math.round(value * scale) / scale;
  }

  static #labelForType(type) {
    return PropskitOscillator.TYPES.find((item) => item.value === type)?.name || "Wave";
  }

  static #waveIconPath(type, size = 24) {
    const samples = 32;
    const pad = 5;
    const draw = size - pad * 2;
    let d = "";
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const value = PropskitOscillator.#waveValue(type, t);
      const x = pad + t * draw;
      const y = pad + (1 - (value + 1) / 2) * draw;
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  }

  static #createWaveIcon(type, size = 24) {
    return figLabCreateSvgElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: `0 0 ${size} ${size}`,
        fill: "none",
      },
      figLabCreateSvgElement("path", {
        d: PropskitOscillator.#waveIconPath(type, size),
        stroke: "currentColor",
        "stroke-width": "1",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }),
    );
  }

  static waveIcon(type, size = 24) {
    const d = PropskitOscillator.#waveIconPath(type, size);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none"><path d="${d}" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  static #waveValue(type, t, phase = 0) {
    const cycle = t + phase / 360;
    const wrapped = cycle - Math.floor(cycle);
    const angle = cycle * Math.PI * 2;

    switch (type) {
      case "square":
        return Math.sin(angle) >= 0 ? 1 : -1;
      case "sawtooth":
        return wrapped * 2 - 1;
      case "triangle":
        return 1 - Math.abs(wrapped * 4 - 2);
      default:
        return Math.sin(angle);
    }
  }

  #render() {
    this.#cancelDrag();
    this.#stopPlayhead();
    this.replaceChildren(...this.#createContent());
    this.#cacheRefs();
    this.#syncViewportSize();
    this.#updateWaveform();
    this.#setupEvents();
    if (!this.#isDisabled()) this.#startPlayhead();
    figLabConnectPropskitResetMenu(this);
  }

  #createOscillatorHandle(type, label) {
    return figLabCreateSvgElement(
      "foreignObject",
      {
        className: `propskit-oscillator-handle propskit-oscillator-${type}-handle`,
        "data-handle": type,
        width: "20",
        height: "20",
      },
      figLabCreateElement(
        "div",
        { className: "propskit-oscillator-handle-inner" },
        figLabCreateElement(
          "fig-tooltip",
          { text: label },
          figLabCreateElement("fig-handle", {
            size: "small",
            type: "minimal",
            "aria-label": `Oscillator ${type} handle`,
          }),
        ),
      ),
    );
  }

  #createContent() {
    const interactive = this.#isEditEnabled() && !this.#isDisabled();
    const svgChildren = [
      figLabCreateSvgElement("rect", {
        className: "propskit-oscillator-bounds",
        x: "0",
        y: "0",
        width: this.#drawWidth,
        height: this.#drawHeight,
      }),
      figLabCreateSvgElement("line", {
        className: "propskit-oscillator-baseline",
      }),
      figLabCreateSvgElement("path", {
        className: "propskit-oscillator-path",
      }),
      figLabCreateSvgElement("circle", {
        className: "propskit-oscillator-playhead",
      }),
    ];
    if (interactive) {
      svgChildren.push(
        this.#createOscillatorHandle("amplitude", "Amplitude"),
        this.#createOscillatorHandle("frequency", "Frequency"),
      );
    }
    const svg = figLabCreateSvgElement(
      "svg",
      {
        viewBox: `0 0 ${this.#drawWidth} ${this.#drawHeight}`,
        className: "propskit-oscillator-svg",
      },
      svgChildren,
    );
    const content = [
      figLabCreateElement(
        "div",
        { className: "propskit-oscillator-svg-container" },
        svg,
      ),
    ];
    if (this.#isEditEnabled()) {
      content.push(
        figLabCreateElement(
          "div",
          { className: "propskit-oscillator-waves" },
          this.#waves.map((wave, index) =>
            this.#createWaveRow(wave, index, !interactive),
          ),
        ),
      );
    }
    return content;
  }

  #createWaveRow(wave, index, disabled) {
    const removeDisabled = disabled || this.#waves.length <= 1;
    const active = index === this.#activeWaveIndex;
    const label = PropskitOscillator.#labelForType(wave.type);
    const removeButton = figLabCreateElement(
      "fig-tooltip",
      { text: "Remove form" },
      figLabCreateElement(
        "fig-button",
        {
          className: "propskit-oscillator-remove-button",
          variant: "ghost",
          icon: true,
          "data-wave-index": index,
          "aria-label": "Remove form",
          disabled: removeDisabled,
        },
        figLabCreateElement("fig-icon", { name: "minus" }),
      ),
    );
    const header = figLabCreateElement(
      "fig-header",
      { borderless: true },
      [
        figLabCreateElement("h3", {}, label),
        removeButton,
        this.#createWaveTypeMenu(disabled, index),
      ],
    );
    const fields = figLabCreateElement(
      "div",
      {
        className: "propskit-oscillator-fields",
        "data-wave-index": index,
        "data-active": active,
      },
      [
        this.#createNumberField(index, "frequency", "Frequency", 0.1, 16, 0.1, ""),
        this.#createNumberField(index, "amplitude", "Amplitude", -4, 4, 0.1, ""),
        this.#createNumberField(index, "phase", "Phase", -360, 360, 1, "°"),
        this.#createNumberField(index, "offset", "Offset", -4, 4, 0.1, ""),
      ],
    );
    return figLabCreateElement(
      "fig-group",
      {
        className: "propskit-oscillator-wave",
        collapsible: true,
        borderless: true,
        compact: "true",
        open: this.#expandedWaveIndices.has(index) ? "true" : "false",
        "data-wave-index": index,
      },
      [header, fields],
    );
  }

  #createWaveTypeMenu(disabled, index) {
    const trigger = figLabCreateElement(
      "fig-tooltip",
      { text: "Add form" },
      figLabCreateElement(
        "fig-button",
        {
          className: "propskit-oscillator-add-type-button",
          variant: "ghost",
          icon: true,
          "fig-menu-trigger": true,
          "aria-label": "Add form",
          disabled,
        },
        figLabCreateElement("fig-icon", { name: "plus" }),
      ),
    );
    const items = PropskitOscillator.TYPES.map((type) =>
      figLabCreateElement(
        "fig-menu-item",
        { value: type.value },
        [
          PropskitOscillator.#createWaveIcon(type.value, 24),
          figLabCreateElement("span", {}, type.name),
        ],
      ),
    );
    return figLabCreateElement(
      "fig-menu",
      {
        className: "propskit-oscillator-add-type",
        position: "bottom right",
        "data-wave-index": index,
        disabled,
      },
      [trigger, items],
    );
  }

  #createNumberField(index, name, label, min, max, step, units) {
    const wave = this.#waves[index] || PropskitOscillator.#defaultWave();
    const isDelta = name === "amplitude" || name === "offset";
    return figLabCreateElement("propskit-slider", {
      className: "propskit-oscillator-field",
      label,
      name,
      "data-wave-index": index,
      value: this.#round(wave[name]),
      min,
      max,
      step,
      precision: this.#precision,
      elastic: "false",
      type: isDelta ? "delta" : null,
      default: isDelta ? "0" : null,
      units: units || null,
      disabled: this.#isDisabled(),
    });
  }

  #cacheRefs() {
    this.#svg = this.querySelector(".propskit-oscillator-svg");
    this.#path = this.querySelector(".propskit-oscillator-path");
    this.#playhead = this.querySelector(".propskit-oscillator-playhead");
    this.#baseline = this.querySelector(".propskit-oscillator-baseline");
    this.#bounds = this.querySelector(".propskit-oscillator-bounds");
    this.#handleAmplitude = this.querySelector('[data-handle="amplitude"]');
    this.#handleFrequency = this.querySelector('[data-handle="frequency"]');
    this.#typeControls = Array.from(
      this.querySelectorAll(".propskit-oscillator-wave-type"),
    );
    this.#fields = Array.from(this.querySelectorAll("propskit-slider[name]"));
    this.#waveGroups = Array.from(
      this.querySelectorAll("fig-group.propskit-oscillator-wave"),
    );
    this.#waveRows = Array.from(
      this.querySelectorAll(".propskit-oscillator-fields"),
    );
  }

  #reindexExpandedWaves(removedIndex) {
    const nextExpanded = new Set();
    for (const index of this.#expandedWaveIndices) {
      if (index < removedIndex) nextExpanded.add(index);
      else if (index > removedIndex) nextExpanded.add(index - 1);
    }
    this.#expandedWaveIndices = nextExpanded;
  }

  #reindexExpandedWavesAfterInsert(insertIndex) {
    const nextExpanded = new Set();
    for (const index of this.#expandedWaveIndices) {
      nextExpanded.add(index >= insertIndex ? index + 1 : index);
    }
    nextExpanded.add(insertIndex);
    this.#expandedWaveIndices = nextExpanded;
  }

  #setupResizeObserver() {
    if (this.#resizeObserver || !window.ResizeObserver) return;
    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#syncViewportSize()) this.#updateWaveform();
    });
    this.#resizeObserver.observe(this);
  }

  #syncViewportSize() {
    if (!this.#svg) return false;
    const rect = this.#svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 240));
    const height = Math.max(1, Math.round(rect.height || 120));
    const changed = width !== this.#drawWidth || height !== this.#drawHeight;
    this.#drawWidth = width;
    this.#drawHeight = height;
    this.#svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    return changed;
  }

  #getValueRange() {
    let span = 1;
    const samples = 256;
    for (let i = 0; i <= samples; i++) {
      span = Math.max(span, Math.abs(this.#sampleAt(i / samples)));
    }
    return {
      min: -span,
      max: span,
    };
  }

  #toY(value) {
    const { min, max } = this.#valueRange;
    return this.#drawHeight - ((value - min) / (max - min)) * this.#drawHeight;
  }

  #fromY(y) {
    const { min, max } = this.#valueRange;
    return min + (1 - y / this.#drawHeight) * (max - min);
  }

  #sampleAt(t) {
    return this.#waves.reduce((sum, wave) => {
      const cycleT = t * wave.frequency;
      const value = PropskitOscillator.#waveValue(wave.type, cycleT, wave.phase);
      return sum + wave.offset + value * wave.amplitude;
    }, 0);
  }

  #updateWaveform() {
    if (!this.#svg || !this.#path) return;
    this.#syncViewportSize();
    this.#valueRange = this.#getValueRange();

    if (this.#bounds) {
      this.#bounds.setAttribute("width", this.#drawWidth);
      this.#bounds.setAttribute("height", this.#drawHeight);
    }

    const maxFrequency = Math.max(...this.#waves.map((wave) => wave.frequency));
    const hasSharpWave = this.#waves.some(
      (wave) => wave.type === "square" || wave.type === "sawtooth",
    );
    const samples = hasSharpWave
      ? Math.max(192, Math.ceil(maxFrequency * 64))
      : Math.max(96, Math.ceil(maxFrequency * 64));
    let d = "";
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = t * this.#drawWidth;
      const y = this.#toY(this.#sampleAt(t));
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    this.#path.setAttribute("d", d);

    const baselineY = this.#toY(0);
    this.#baseline?.setAttribute("x1", "0");
    this.#baseline?.setAttribute("y1", baselineY);
    this.#baseline?.setAttribute("x2", this.#drawWidth);
    this.#baseline?.setAttribute("y2", baselineY);

    this.#positionHandles();
  }

  #startPlayhead() {
    if (this.#playheadFrame || !this.#playhead) return;

    const tick = (time) => {
      if (!this.isConnected || !this.#playhead) {
        this.#playheadFrame = 0;
        return;
      }
      this.#updatePlayhead((time % 1000) / 1000);
      this.#playheadFrame = requestAnimationFrame(tick);
    };

    this.#playheadFrame = requestAnimationFrame(tick);
  }

  #stopPlayhead() {
    if (!this.#playheadFrame) return;
    cancelAnimationFrame(this.#playheadFrame);
    this.#playheadFrame = 0;
  }

  #updatePlayhead(t) {
    if (!this.#playhead) return;
    const x = t * this.#drawWidth;
    const y = this.#toY(this.#sampleAt(t));
    this.#playhead.setAttribute("cx", x.toFixed(1));
    this.#playhead.setAttribute("cy", y.toFixed(1));
  }

  #positionHandles() {
    const radius = 8;
    const wave = this.#activeWave;
    const amplitudeX = this.#getAmplitudeHandleX();
    const frequencyX = Math.max(
      radius,
      Math.min(this.#drawWidth - radius, this.#drawWidth / wave.frequency),
    );
    const amplitudeY = this.#toY(this.#sampleAt(amplitudeX / this.#drawWidth));
    const frequencyY = this.#toY(this.#sampleAt(frequencyX / this.#drawWidth));

    this.#setHandlePosition(this.#handleAmplitude, amplitudeX, amplitudeY, radius);
    this.#setHandlePosition(this.#handleFrequency, frequencyX, frequencyY, radius);
  }

  #getAmplitudeHandleX() {
    const wave = this.#activeWave;
    const phaseCycle = wave.phase / 360;
    const frequency = Math.max(0.1, wave.frequency);
    let targetCycle = 0.25;
    if (wave.type === "triangle") targetCycle = 0.5;
    if (wave.type === "sawtooth") targetCycle = 1;
    let t = (targetCycle - phaseCycle) / frequency;

    while (t < 0) t += 1 / frequency;
    while (t > 1) t -= 1 / frequency;

    if (t < 0 || t > 1 || !Number.isFinite(t)) {
      t = 0.25;
    }

    return Math.max(8, Math.min(this.#drawWidth - 8, t * this.#drawWidth));
  }

  #setHandlePosition(handle, x, y, radius) {
    if (!handle) return;
    handle.setAttribute("x", x - radius);
    handle.setAttribute("y", y - radius);
    handle.setAttribute("width", radius * 2);
    handle.setAttribute("height", radius * 2);
  }

  #setupEvents() {
    if (!this.#isEditEnabled() || this.#isDisabled()) return;
    for (const typeControl of this.#typeControls) {
      typeControl.addEventListener("change", (event) => {
        if (this.#isDisabled()) return;
        const index = this.#indexFromElement(typeControl);
        this.#setActiveWave(index);
        this.#waves[index].type = this.#normalizeType(
          event.detail ?? event.target?.value,
        );
        this.#syncUI();
        this.#emit("input");
        this.#emit("change");
      });
    }

    for (const field of this.#fields) {
      field.addEventListener("input", (event) => {
        event.stopPropagation();
        this.#activeFieldInput = field;
        try {
          this.#applyFieldValue(
            this.#indexFromElement(field),
            field.getAttribute("name"),
            event.detail?.value ??
              event.currentTarget?.value ??
              event.target?.value,
            "input",
          );
        } finally {
          this.#activeFieldInput = null;
        }
      });
      field.addEventListener("change", (event) => {
        event.stopPropagation();
        this.#applyFieldValue(
          this.#indexFromElement(field),
          field.getAttribute("name"),
          event.detail?.value ??
            event.currentTarget?.value ??
            event.target?.value,
          "change",
        );
      });
    }

    for (const group of this.#waveGroups) {
      group.addEventListener("pointerdown", () => {
        this.#setActiveWave(this.#indexFromElement(group));
      });
      group.addEventListener("focusin", () => {
        this.#setActiveWave(this.#indexFromElement(group));
      });
      group.addEventListener("openchange", (event) => {
        const index = this.#indexFromElement(group);
        if (event.detail?.open) {
          this.#expandedWaveIndices.add(index);
        } else {
          this.#expandedWaveIndices.delete(index);
        }
      });
    }

    for (const control of this.querySelectorAll(".propskit-oscillator-add-type")) {
      const stopHeaderToggle = (event) => {
        event.stopPropagation();
      };
      control.addEventListener("pointerdown", stopHeaderToggle);
      control.addEventListener("click", stopHeaderToggle);
      control.addEventListener("change", (event) => {
        if (event.target !== control) return;
        if (this.#isDisabled()) return;
        const insertAfter = this.#indexFromElement(control);
        const insertIndex = insertAfter + 1;
        const type = this.#normalizeType(event.detail?.value ?? control.value);
        this.#waves.splice(insertIndex, 0, PropskitOscillator.#defaultWave(type));
        this.#reindexExpandedWavesAfterInsert(insertIndex);
        this.#activeWaveIndex = insertIndex;
        this.#render();
        this.#emit("input");
        this.#emit("change");
      });
    }

    for (const button of this.querySelectorAll(".propskit-oscillator-add-type-button")) {
      const stopHeaderToggle = (event) => {
        event.stopPropagation();
      };
      button.addEventListener("pointerdown", stopHeaderToggle);
      button.addEventListener("click", stopHeaderToggle);
      button.closest("fig-tooltip")?.addEventListener("pointerdown", stopHeaderToggle);
      button.closest("fig-tooltip")?.addEventListener("click", stopHeaderToggle);
    }

    for (const button of this.querySelectorAll(".propskit-oscillator-remove-button")) {
      button.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.#isDisabled() || this.#waves.length <= 1) return;
        const index = this.#indexFromElement(button);
        this.#waves.splice(index, 1);
        this.#reindexExpandedWaves(index);
        this.#activeWaveIndex = Math.min(this.#activeWaveIndex, this.#waves.length - 1);
        this.#render();
        this.#emit("input");
        this.#emit("change");
      });
    }

    for (const handle of [
      this.#handleAmplitude,
      this.#handleFrequency,
    ]) {
      this.#setupHandle(handle);
    }

    const surface = this.querySelector(".propskit-oscillator-svg-container");
    surface?.addEventListener("pointerdown", (event) => {
      if (this.#isDisabled()) return;
      if (event.target?.closest?.(".propskit-oscillator-handle, fig-handle")) {
        return;
      }
      this.#startDrag(event, "offset");
    });
  }

  #indexFromElement(element) {
    const index = Number.parseInt(element?.getAttribute("data-wave-index") || "", 10);
    return Number.isFinite(index) ? Math.min(this.#waves.length - 1, Math.max(0, index)) : 0;
  }

  #setupHandle(handleContainer) {
    const handle = handleContainer?.querySelector("fig-handle");
    const type = handleContainer?.getAttribute("data-handle");
    if (!handle || !type) return;

    handle.addEventListener(
      "pointerdown",
      (event) => {
        if (this.#isDisabled()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.#startDrag(event, type);
      },
      { capture: true },
    );

    handle.addEventListener(
      "keydown",
      (event) => {
        if (this.#isDisabled()) return;
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
            event.key,
          )
        ) {
          return;
        }
        if (!this.#handleKeyboard(event, type)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
  }

  #setActiveWave(index) {
    const nextIndex = Math.min(this.#waves.length - 1, Math.max(0, index));
    if (nextIndex === this.#activeWaveIndex) return;
    this.#activeWaveIndex = nextIndex;
    this.#syncActiveWave();
    this.#positionHandles();
  }

  #applyFieldValue(index, name, value, eventType) {
    if (this.#isDisabled()) return;
    this.#setActiveWave(index);
    const next = Number.parseFloat(value);
    if (!Number.isFinite(next)) {
      if (eventType === "change") this.#syncFields();
      return;
    }

    this.#waves[index] = this.#normalizeWave({
      ...this.#waves[index],
      [name]: next,
    });
    this.#syncUI({ skipFieldSync: eventType == "input" });
    this.#emit(eventType);
  }

  #handleKeyboard(event, type) {
    const step = event.shiftKey ? 0.5 : 0.1;
    const wave = this.#activeWave;
    switch (type) {
      case "amplitude":
        if (event.key === "ArrowUp") wave.amplitude += step;
        else if (event.key === "ArrowDown") wave.amplitude -= step;
        else if (event.key === "Home") wave.amplitude = -4;
        else if (event.key === "End") wave.amplitude = 4;
        else return false;
        break;
      case "offset":
        if (event.key === "ArrowUp") wave.offset += step;
        else if (event.key === "ArrowDown") wave.offset -= step;
        else if (event.key === "Home") wave.offset = -4;
        else if (event.key === "End") wave.offset = 4;
        else return false;
        break;
      case "frequency":
        if (event.key === "ArrowLeft") wave.frequency -= step;
        else if (event.key === "ArrowRight") wave.frequency += step;
        else if (event.key === "Home") wave.frequency = 0.1;
        else if (event.key === "End") wave.frequency = 16;
        else return false;
        break;
      default:
        return false;
    }

    this.#waves[this.#activeWaveIndex] = this.#normalizeWave(wave);
    this.#syncUI();
    this.#emit("input");
    this.#emit("change");
    return true;
  }

  #clientToSVG(event) {
    const ctm = this.#svg?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return {
      x: inv.a * event.clientX + inv.c * event.clientY + inv.e,
      y: inv.b * event.clientX + inv.d * event.clientY + inv.f,
    };
  }

  #startDrag(event, type) {
    this.#cancelDrag();
    this.#isDragging = type;
    this.#svg?.classList.add("dragging");
    const dragCursor =
      type === "frequency" ? "ew-resize" : type === "amplitude" ? "ns-resize" : "";
    const prevBodyCursor = document.body.style.cursor;
    if (dragCursor) {
      document.body.style.cursor = dragCursor;
    }

    const onMove = (moveEvent) => {
      if (!this.#isDragging) return;
      const point = this.#clientToSVG(moveEvent);
      const wave = this.#activeWave;

      if (type === "frequency") {
        const x = Math.max(1, Math.min(this.#drawWidth, point.x));
        wave.frequency = this.#drawWidth / x;
      } else if (type === "offset") {
        const t = this.#clampNumber(point.x / this.#drawWidth, 0, 0, 1);
        const activeValue = this.#activeWaveValueAt(wave, t);
        wave.offset =
          this.#fromY(point.y) -
          this.#sampleAtWithoutWave(this.#activeWaveIndex, t) -
          activeValue * wave.amplitude;
      } else if (type === "amplitude") {
        const t = this.#clampNumber(point.x / this.#drawWidth, 0, 0, 1);
        const activeValue = this.#activeWaveValueAt(wave, t);
        const nextAmplitude =
          this.#fromY(point.y) -
          this.#sampleAtWithoutWave(this.#activeWaveIndex, t) -
          wave.offset;
        wave.amplitude =
          Math.abs(activeValue) < 0.001 ? wave.amplitude : nextAmplitude / activeValue;
      }

      this.#waves[this.#activeWaveIndex] = this.#normalizeWave(wave);
      this.#syncUI();
      this.#emit("input");
    };

    const controller = new AbortController();
    const finish = (commit = false) => {
      this.#isDragging = null;
      this.#svg?.classList.remove("dragging");
      if (dragCursor) {
        document.body.style.cursor = prevBodyCursor;
      }
      controller.abort();
      if (this.#dragController === controller) {
        this.#dragController = null;
        this.#dragCleanup = null;
      }
      if (commit) this.#emit("change");
    };
    this.#dragController = controller;
    this.#dragCleanup = finish;

    document.addEventListener("pointermove", onMove, { signal: controller.signal });
    document.addEventListener("pointerup", () => finish(true), {
      signal: controller.signal,
    });
    document.addEventListener("pointercancel", () => finish(false), {
      signal: controller.signal,
    });
    window.addEventListener("blur", () => finish(false), {
      signal: controller.signal,
    });
  }

  #cancelDrag() {
    this.#dragCleanup?.(false);
    this.#dragController?.abort();
    this.#dragController = null;
    this.#dragCleanup = null;
    this.#isDragging = null;
    this.#svg?.classList.remove("dragging");
  }

  #sampleAtWithoutWave(excludedIndex, t) {
    return this.#waves.reduce((sum, wave, index) => {
      if (index === excludedIndex) return sum;
      const cycleT = t * wave.frequency;
      const value = PropskitOscillator.#waveValue(wave.type, cycleT, wave.phase);
      return sum + wave.offset + value * wave.amplitude;
    }, 0);
  }

  #activeWaveValueAt(wave, t) {
    return PropskitOscillator.#waveValue(
      wave.type,
      t * wave.frequency,
      wave.phase,
    );
  }

  #syncUI({ skipFieldSync = false } = {}) {
    this.#syncTypeControls();
    if (!skipFieldSync) this.#syncFields();
    this.#syncActiveWave();
    this.#updateWaveform();
  }

  #syncTypeControls() {
    for (const control of this.#typeControls) {
      const index = this.#indexFromElement(control);
      control.value = this.#waves[index]?.type || "sine";
    }
  }

  #syncFields() {
    for (const field of this.#fields) {
      if (field === this.#activeFieldInput) continue;
      const index = this.#indexFromElement(field);
      const name = field.getAttribute("name");
      const next = this.#round(this.#waves[index]?.[name] ?? 0);
      const slider = field.querySelector("fig-slider");
      if (slider) {
        slider.value = next;
      } else {
        field.setAttribute("value", String(next));
      }
    }
  }

  #syncActiveWave() {
    for (const row of this.#waveRows) {
      if (this.#indexFromElement(row) === this.#activeWaveIndex) {
        row.setAttribute("data-active", "");
      } else {
        row.removeAttribute("data-active");
      }
    }
  }

  #emit(type) {
    figLabDispatchPropskitEvent(this, type);
  }
}
figLabDefineElement("propskit-oscillator", PropskitOscillator);

/* Angle Input */
/**
 * A custom angle chooser input element.
 * @attr {number} value - The current angle of the handle in degrees.
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {boolean} text - Whether to display a text input for the angle value.
 * @attr {boolean} dial - Whether to display the circular dial control. Defaults to true.
 * @attr {number} adjacent - The adjacent value of the angle.
 * @attr {number} opposite - The opposite value of the angle.
 * @attr {boolean} rotations - Whether to display a rotation count (×N) when rotations > 1. Defaults to false.
 */
class FigInputAngle extends HTMLElement {
  // Private fields
  #adjacent;
  #opposite;
  #prevRawAngle = null;
  #boundHandleRawChange;
  #boundHandleMouseDown;
  #boundHandleTouchStart;
  #boundHandleKeyDown;
  #boundHandleKeyUp;
  #boundHandleAngleInput;
  #boundHandleDialKeyDown;
  #gestureController = null;
  #gestureCleanup = null;

  constructor() {
    super();

    this.angle = 0;
    this.#adjacent = 1;
    this.#opposite = 0;
    this.isDragging = false;
    this.isShiftHeld = false;
    this.handle = null;
    this.angleInput = null;
    this.plane = null;
    this.units = "°";
    this.min = null;
    this.max = null;
    this.dial = true;
    this.showRotations = false;
    this.rotationSpan = null;

    this.#boundHandleRawChange = this.#handleRawChange.bind(this);
    this.#boundHandleMouseDown = this.#handleMouseDown.bind(this);
    this.#boundHandleTouchStart = this.#handleTouchStart.bind(this);
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
    this.#boundHandleKeyUp = this.#handleKeyUp.bind(this);
    this.#boundHandleAngleInput = this.#handleAngleInput.bind(this);
    this.#boundHandleDialKeyDown = this.#handleDialKeyDown.bind(this);
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      if (!this.isConnected) return;
      this.precision = this.getAttribute("precision") || 1;
      this.precision = parseInt(this.precision);
      this.text = this.getAttribute("text") === "true";

      let rawUnits = this.getAttribute("units") || "°";
      if (rawUnits === "deg") rawUnits = "°";
      this.units = rawUnits;

      this.min = this.hasAttribute("min")
        ? Number(this.getAttribute("min"))
        : null;
      this.max = this.hasAttribute("max")
        ? Number(this.getAttribute("max"))
        : null;
      this.dial = this.#readBooleanAttribute("dial", true);
      this.showRotations = this.#readRotationsEnabled();

      this.#render();
      this.#setupListeners();

      this.#syncHandlePosition();
      if (this.text && this.angleInput) {
        this.angleInput.setAttribute(
          "value",
          this.angle.toFixed(this.precision),
        );
      }
    });
  }

  disconnectedCallback() {
    this.#cancelGesture();
    this.#cleanupListeners();
  }

  #render() {
    this.#cancelGesture();
    this.#cleanupListeners();
    const step = this.#getStepForUnit();
    const disabled = this.#isDisabled();
    const name =
      this.getAttribute("aria-label") || this.getAttribute("name") || "Angle";
    const ariaMin = this.min ?? this.#fromDegrees(0);
    const ariaMax = this.max ?? this.#fromDegrees(360);
    const children = [];

    if (this.dial) {
      children.push(
        figLabCreateElement(
          "div",
          {
            className: "fig-input-angle-plane",
            role: "slider",
            tabindex: disabled ? "-1" : "0",
            "aria-label": name,
            "aria-valuemin": ariaMin,
            "aria-valuemax": ariaMax,
            "aria-valuenow": this.angle,
            "aria-valuetext": `${this.angle.toFixed(this.precision)}${this.units}`,
            "aria-disabled": disabled ? "true" : null,
          },
          figLabCreateElement("div", {
            className: "fig-input-angle-handle",
          }),
        ),
      );
    }

    if (this.text) {
      children.push(
        figLabCreateElement(
          "fig-input-number",
          {
            name: "angle",
            step,
            value: this.angle,
            min: this.min,
            max: this.max,
            units: this.units,
            "aria-label": name,
            disabled,
          },
          this.showRotations
            ? figLabCreateElement("span", {
                slot: "append",
                className: "fig-input-angle-rotations",
              })
            : null,
        ),
      );
    }

    this.replaceChildren(...children);
  }

  #readBooleanAttribute(name, defaultValue = false) {
    const value = this.getAttribute(name);
    if (value === null) return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (normalized === "" || normalized === "true") return true;
    if (normalized === "false") return false;
    return true;
  }

  #readRotationsEnabled() {
    if (this.hasAttribute("rotations")) {
      return this.#readBooleanAttribute("rotations", false);
    }
    if (this.hasAttribute("show-rotations")) {
      return this.#readBooleanAttribute("show-rotations", false);
    }
    return false;
  }

  #getRotationCount() {
    const degrees = Math.abs(this.#toDegrees(this.angle));
    return Math.floor(degrees / 360);
  }

  #isDisabled() {
    return figLabBooleanAttribute(this, "disabled");
  }

  #clampValue(value) {
    let next = Number(value);
    if (!Number.isFinite(next)) return this.angle;
    if (this.min !== null && Number.isFinite(this.min)) {
      next = Math.max(this.min, next);
    }
    if (this.max !== null && Number.isFinite(this.max)) {
      next = Math.min(this.max, next);
    }
    return next;
  }

  #setValue(value, { reflect = true } = {}) {
    const next = this.#clampValue(value);
    this.angle = next;
    this.#calculateAdjacentAndOpposite();
    if (reflect) {
      const serialized = String(next);
      if (this.getAttribute("value") !== serialized) {
        this.setAttribute("value", serialized);
      }
    }
    this.#syncHandlePosition();
    if (this.angleInput) {
      this.angleInput.value = next.toFixed(this.precision);
    }
    this.#syncDialState();
    this.#updateRotationDisplay();
  }

  #syncDialState() {
    if (!this.plane) return;
    this.plane.setAttribute("aria-valuenow", String(this.angle));
    this.plane.setAttribute(
      "aria-valuetext",
      `${this.angle.toFixed(this.precision)}${this.units}`,
    );
  }

  #updateRotationDisplay() {
    if (!this.rotationSpan) return;
    const rotations = this.#getRotationCount();
    if (rotations > 1) {
      this.rotationSpan.textContent = `\u00d7${rotations}`;
      this.rotationSpan.style.display = "";
    } else {
      this.rotationSpan.textContent = "";
      this.rotationSpan.style.display = "none";
    }
  }

  #getStepForUnit() {
    switch (this.units) {
      case "rad":
        return 0.01;
      case "turn":
        return 0.001;
      default:
        return 0.1;
    }
  }

  #toDegrees(value) {
    switch (this.units) {
      case "rad":
        return (value * 180) / Math.PI;
      case "turn":
        return value * 360;
      default:
        return value;
    }
  }

  #fromDegrees(degrees) {
    switch (this.units) {
      case "rad":
        return (degrees * Math.PI) / 180;
      case "turn":
        return degrees / 360;
      default:
        return degrees;
    }
  }

  #convertAngle(value, fromUnit, toUnit) {
    let degrees;
    switch (fromUnit) {
      case "rad":
        degrees = (value * 180) / Math.PI;
        break;
      case "turn":
        degrees = value * 360;
        break;
      default:
        degrees = value;
    }
    switch (toUnit) {
      case "rad":
        return (degrees * Math.PI) / 180;
      case "turn":
        return degrees / 360;
      default:
        return degrees;
    }
  }

  #setupListeners() {
    this.handle = this.querySelector(".fig-input-angle-handle");
    this.plane = this.querySelector(".fig-input-angle-plane");
    this.angleInput = this.querySelector("fig-input-number[name='angle']");
    this.rotationSpan = this.querySelector(".fig-input-angle-rotations");
    this.#updateRotationDisplay();
    this.plane?.addEventListener("mousedown", this.#boundHandleMouseDown);
    this.plane?.addEventListener("touchstart", this.#boundHandleTouchStart);
    this.plane?.addEventListener("keydown", this.#boundHandleDialKeyDown);
    window.addEventListener("keydown", this.#boundHandleKeyDown);
    window.addEventListener("keyup", this.#boundHandleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.addEventListener("input", this.#boundHandleAngleInput);
      this.angleInput.addEventListener("change", this.#boundHandleAngleInput);
    }
    this.addEventListener("change", this.#boundHandleRawChange, true);
  }

  #cleanupListeners() {
    this.plane?.removeEventListener("mousedown", this.#boundHandleMouseDown);
    this.plane?.removeEventListener("touchstart", this.#boundHandleTouchStart);
    this.plane?.removeEventListener("keydown", this.#boundHandleDialKeyDown);
    window.removeEventListener("keydown", this.#boundHandleKeyDown);
    window.removeEventListener("keyup", this.#boundHandleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.removeEventListener("input", this.#boundHandleAngleInput);
      this.angleInput.removeEventListener("change", this.#boundHandleAngleInput);
    }
    this.removeEventListener("change", this.#boundHandleRawChange, true);
  }

  #handleRawChange(e) {
    if (!e.target?.matches?.("input")) return;
    const raw = e.target.value;
    const match = raw.match(/^(-?\d*\.?\d+)\s*(turn|rad|deg|°)$/i);
    if (match) {
      const num = parseFloat(match[1]);
      let fromUnit = match[2].toLowerCase();
      if (fromUnit === "deg") fromUnit = "°";
      if (fromUnit !== this.units) {
        const converted = this.#convertAngle(num, fromUnit, this.units);
        e.target.value = String(converted);
      }
    }
  }

  #handleAngleInput(e) {
    e.stopPropagation();
    if (this.#isDisabled()) return;
    this.#setValue(Number(e.target.value));
    if (e.type === "change") this.#emitChangeEvent();
    else this.#emitInputEvent();
  }

  #calculateAdjacentAndOpposite() {
    const degrees = this.#toDegrees(this.angle);
    const radians = (degrees * Math.PI) / 180;
    this.#adjacent = Math.cos(radians);
    this.#opposite = Math.sin(radians);
  }

  #snapToIncrement(angle) {
    if (!this.isShiftHeld) return angle;
    const increment = 45;
    return Math.round(angle / increment) * increment;
  }

  #getRawAngle(e) {
    const rect = this.plane.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  }

  #updateAngle(e) {
    let rawAngle = this.#getRawAngle(e);
    let normalizedAngle = ((rawAngle % 360) + 360) % 360;
    normalizedAngle = this.#snapToIncrement(normalizedAngle);

    const isBounded = this.min !== null || this.max !== null;

    if (isBounded) {
      this.angle = this.#clampValue(this.#fromDegrees(normalizedAngle));
    } else {
      if (this.#prevRawAngle === null) {
        this.#prevRawAngle = normalizedAngle;
        const currentDeg = this.#toDegrees(this.angle);
        const currentMod = ((currentDeg % 360) + 360) % 360;
        let delta = normalizedAngle - currentMod;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle = this.#clampValue(this.angle + this.#fromDegrees(delta));
      } else {
        let delta = normalizedAngle - this.#prevRawAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle = this.#clampValue(this.angle + this.#fromDegrees(delta));
        this.#prevRawAngle = normalizedAngle;
      }
    }

    this.#calculateAdjacentAndOpposite();
    this.setAttribute("value", String(this.angle));

    this.#syncHandlePosition();
    if (this.text && this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }
    this.#updateRotationDisplay();
    this.#syncDialState();

    this.#emitInputEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, angle: this.angle },
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, angle: this.angle },
      }),
    );
  }

  #syncHandlePosition() {
    if (this.handle) {
      const degrees = this.#toDegrees(this.angle);
      const radians = (degrees * Math.PI) / 180;
      const radius = this.plane.offsetWidth / 2 - this.handle.offsetWidth / 2;
      const x = Math.cos(radians) * radius;
      const y = Math.sin(radians) * radius;
      this.handle.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  #handleMouseDown(e) {
    if (this.#isDisabled() || e.button !== 0) return;
    this.#cancelGesture();
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e);

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e);
    };

    const controller = new AbortController();
    const finish = (commit = false) => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      controller.abort();
      if (this.#gestureController === controller) {
        this.#gestureController = null;
        this.#gestureCleanup = null;
      }
      if (commit) this.#emitChangeEvent();
    };
    this.#gestureController = controller;
    this.#gestureCleanup = finish;

    window.addEventListener("mousemove", handleMouseMove, {
      signal: controller.signal,
    });
    window.addEventListener("mouseup", () => finish(true), {
      signal: controller.signal,
    });
    window.addEventListener("blur", () => finish(false), {
      signal: controller.signal,
    });
  }

  #handleTouchStart(e) {
    if (this.#isDisabled()) return;
    e.preventDefault();
    this.#cancelGesture();
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e.touches[0]);
    };

    const controller = new AbortController();
    const finish = (commit = false) => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      controller.abort();
      if (this.#gestureController === controller) {
        this.#gestureController = null;
        this.#gestureCleanup = null;
      }
      if (commit) this.#emitChangeEvent();
    };
    this.#gestureController = controller;
    this.#gestureCleanup = finish;

    window.addEventListener("touchmove", handleTouchMove, {
      signal: controller.signal,
    });
    window.addEventListener("touchend", () => finish(true), {
      signal: controller.signal,
    });
    window.addEventListener("touchcancel", () => finish(false), {
      signal: controller.signal,
    });
  }

  #cancelGesture() {
    this.#gestureCleanup?.(false);
    this.#gestureController?.abort();
    this.#gestureController = null;
    this.#gestureCleanup = null;
    this.isDragging = false;
    this.#prevRawAngle = null;
    this.plane?.classList.remove("dragging");
  }

  #handleDialKeyDown(e) {
    if (this.#isDisabled()) return;
    const step = this.#getStepForUnit() * (e.shiftKey ? 10 : 1);
    let next = this.angle;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next -= step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next += step;
    else if (e.key === "Home") next = this.min ?? this.#fromDegrees(0);
    else if (e.key === "End") next = this.max ?? this.#fromDegrees(360);
    else return;
    e.preventDefault();
    e.stopPropagation();
    this.#setValue(next);
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #handleKeyDown(e) {
    if (e.key === "Shift") this.isShiftHeld = true;
  }

  #handleKeyUp(e) {
    if (e.key === "Shift") this.isShiftHeld = false;
  }

  focus() {
    this.plane?.focus();
  }

  static get observedAttributes() {
    return [
      "value",
      "precision",
      "text",
      "min",
      "max",
      "units",
      "dial",
      "rotations",
      "show-rotations",
      "disabled",
      "aria-label",
      "name",
    ];
  }

  get value() {
    return this.angle;
  }

  get adjacent() {
    return this.#adjacent;
  }

  get opposite() {
    return this.#opposite;
  }

  set value(value) {
    if (isNaN(value)) {
      console.error("Invalid value: must be a number.");
      return;
    }
    this.#setValue(Number(value));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        if (this.isDragging) break;
        if (newValue !== null) this.#setValue(Number(newValue), { reflect: false });
        break;
      case "precision":
        this.precision = parseInt(newValue);
        break;
      case "text":
        if (newValue !== oldValue) {
          this.text = newValue?.toLowerCase() === "true";
          if (this.isConnected) {
            this.#render();
            this.#setupListeners();
            this.#syncHandlePosition();
          }
        }
        break;
      case "dial":
        this.dial = this.#readBooleanAttribute("dial", true);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "units": {
        let units = newValue || "°";
        if (units === "deg") units = "°";
        this.units = units;
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      }
      case "min":
        this.min = newValue !== null ? Number(newValue) : null;
        this.#setValue(this.angle);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "max":
        this.max = newValue !== null ? Number(newValue) : null;
        this.#setValue(this.angle);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "disabled":
        this.#cancelGesture();
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "aria-label":
      case "name":
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "rotations":
      case "show-rotations":
        this.showRotations = this.#readRotationsEnabled();
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
    }
  }
}
figLabDefineElement("fig-input-angle", FigInputAngle);

/* Reorder wrapper */
class FigReorder extends HTMLElement {
  static observedAttributes = ["axis", "handle", "disabled"];

  static #DRAG_THRESHOLD = 6;

  static #NESTED_DRAG_SELECTORS = [
    '[draggable]:not([draggable="false"])',
    'img:not([draggable="false"])',
    'a[href]:not([draggable="false"])',
    'input[type="range"]',
    "fig-handle",
    "fig-slider",
    "fig-input-number",
    "fig-input-gradient",
    "fig-easing-curve",
    "fig-input-angle",
    "fig-input-wheel",
    "fig-joystick",
    "fig-origin-grid",
    "fig-chooser",
    "fig-canvas-control",
    "propskit-color-point",
    "propskit-image",
    "propskit-number",
    "propskit-point-point",
    "propskit-point-radius",
    "propskit-point-radius-angle",
    "propskit-position",
    "propskit-editable-select",
    "propskit-slider",
    "propskit-oscillator",
  ];

  #childObserver = null;
  #bindings = new Map();
  #drag = null;
  #indicator = null;
  #liveRegion = null;

  connectedCallback() {
    this.style.display = "contents";
    if (!this.hasAttribute("role")) this.setAttribute("role", "list");
    if (!this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", "Reorderable list");
    }
    this.#ensureLiveRegion();
    this.#syncChildren();
    this.#childObserver = new MutationObserver(() => this.#syncChildren());
    this.#childObserver.observe(this, { childList: true });
  }

  disconnectedCallback() {
    this.#childObserver?.disconnect();
    this.#childObserver = null;
    this.#unbindAll();
    this.#cancelDrag();
    this.#removeIndicator();
    this.#liveRegion?.remove();
    this.#liveRegion = null;
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      if (this.#disabled) this.#cancelDrag();
      this.#syncChildren();
    }
  }

  get #disabled() {
    return (
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false"
    );
  }

  get #axis() {
    const value = (this.getAttribute("axis") || "vertical").trim().toLowerCase();
    return value === "horizontal" ? "horizontal" : "vertical";
  }

  get #handleSelector() {
    return (this.getAttribute("handle") || "").trim();
  }

  #getElementChildren() {
    return [...this.children].filter(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        !node.hasAttribute("data-reorder-live"),
    );
  }

  #syncChildren() {
    const children = this.#getElementChildren();
    const childSet = new Set(children);

    for (const [child, binding] of this.#bindings) {
      if (!childSet.has(child)) {
        binding.target.removeEventListener(
          "pointerdown",
          binding.onPointerDown,
          true,
        );
        binding.target.removeEventListener("keydown", binding.onKeyDown);
        this.#restoreKeyboardAttrs(binding);
        this.#bindings.delete(child);
      }
    }

    this.#clearHandleMarks(children);
    this.#clearReorderItemMarks(children);

    if (this.#disabled || children.length < 2) {
      this.#unbindAll();
      return;
    }

    for (const child of children) {
      const target = this.#getDragTarget(child);
      const existing = this.#bindings.get(child);
      if (existing && existing.target === target) continue;
      if (existing) {
        existing.target.removeEventListener(
          "pointerdown",
          existing.onPointerDown,
          true,
        );
        this.#bindings.delete(child);
      }
      if (!target) continue;
      this.#bindChild(child, target);
    }

    this.#markHandles(children);
    this.#markReorderItems(children);
  }

  #clearReorderItemMarks(children) {
    for (const child of children) {
      child.removeAttribute("data-reorder-item");
      if (child.hasAttribute("data-reorder-generated-role")) {
        child.removeAttribute("role");
        child.removeAttribute("data-reorder-generated-role");
      }
    }
  }

  #markReorderItems(children) {
    for (const child of children) {
      child.setAttribute("data-reorder-item", "");
      if (!child.hasAttribute("role")) {
        child.setAttribute("role", "listitem");
        child.setAttribute("data-reorder-generated-role", "");
      }
    }
  }

  #clearHandleMarks(children) {
    for (const child of children) {
      child
        .querySelectorAll("[data-reorder-handle]")
        .forEach((node) => {
          node.removeAttribute("data-reorder-handle");
          node.removeAttribute("aria-roledescription");
        });
    }
  }

  #markHandles(children) {
    if (!this.#handleSelector) return;
    for (const child of children) {
      const handle = child.querySelector(this.#handleSelector);
      if (handle) {
        handle.setAttribute("data-reorder-handle", "");
        handle.setAttribute("aria-roledescription", "reorder handle");
      }
    }
  }

  #getDragTarget(child) {
    if (this.#handleSelector) {
      return child.querySelector(this.#handleSelector);
    }
    return child;
  }

  #bindChild(child, target) {
    const onPointerDown = (event) => {
      if (this.#disabled || this.#getElementChildren().length < 2) return;
      if (event.button !== 0) return;
      if (
        !this.#handleSelector &&
        this.#isNestedDragTarget(event.target, child)
      ) {
        return;
      }
      this.#startPendingDrag(event, child, target);
    };
    const originalTabIndex = target.getAttribute("tabindex");
    const originalAriaLabel = target.getAttribute("aria-label");
    const originalRole = target.getAttribute("role");
    const itemName =
      child.getAttribute("aria-label") ||
      child.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
      "item";
    target.setAttribute("tabindex", "0");
    target.setAttribute("aria-label", `Move ${itemName}`);
    if (target !== child && !target.hasAttribute("role")) {
      target.setAttribute("role", "button");
    }
    const onKeyDown = (event) => {
      if (this.#disabled) return;
      const horizontal = this.#axis === "horizontal";
      const previousKey = horizontal ? "ArrowLeft" : "ArrowUp";
      const nextKey = horizontal ? "ArrowRight" : "ArrowDown";
      if (
        event.key !== previousKey &&
        event.key !== nextKey &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const items = this.#getElementChildren();
      const oldIndex = items.indexOf(child);
      let newIndex = oldIndex;
      if (event.key === previousKey) newIndex = Math.max(0, oldIndex - 1);
      else if (event.key === nextKey) {
        newIndex = Math.min(items.length - 1, oldIndex + 1);
      } else if (event.key === "Home") newIndex = 0;
      else if (event.key === "End") newIndex = items.length - 1;
      if (newIndex === oldIndex) {
        this.#announce(`${itemName}, position ${oldIndex + 1} of ${items.length}`);
        return;
      }
      this.#moveItemToFinalIndex(child, newIndex);
      this.#syncChildren();
      this.#getDragTarget(child)?.focus();
      this.dispatchEvent(
        new CustomEvent("reorder", {
          bubbles: true,
          detail: { oldIndex, newIndex, item: child },
        }),
      );
      this.#announce(`${itemName}, position ${newIndex + 1} of ${items.length}`);
    };

    target.addEventListener("pointerdown", onPointerDown, true);
    target.addEventListener("keydown", onKeyDown);
    this.#bindings.set(child, {
      target,
      onPointerDown,
      onKeyDown,
      originalTabIndex,
      originalAriaLabel,
      originalRole,
    });
  }

  #restoreKeyboardAttrs(binding) {
    const { target, originalTabIndex, originalAriaLabel, originalRole } = binding;
    if (originalTabIndex === null) target.removeAttribute("tabindex");
    else target.setAttribute("tabindex", originalTabIndex);
    if (originalAriaLabel === null) target.removeAttribute("aria-label");
    else target.setAttribute("aria-label", originalAriaLabel);
    if (originalRole === null) target.removeAttribute("role");
    else target.setAttribute("role", originalRole);
  }

  #ensureLiveRegion() {
    if (this.#liveRegion?.isConnected) return;
    const region = document.createElement("span");
    region.setAttribute("data-reorder-live", "");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    Object.assign(region.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    });
    this.#liveRegion = region;
    document.body.appendChild(region);
  }

  #announce(message) {
    if (!this.#liveRegion) return;
    this.#liveRegion.textContent = "";
    requestAnimationFrame(() => {
      if (this.#liveRegion) this.#liveRegion.textContent = message;
    });
  }

  #isNestedDragTarget(target, child) {
    let node = target;
    while (node && node !== child) {
      if (node instanceof Element) {
        for (const selector of FigReorder.#NESTED_DRAG_SELECTORS) {
          if (node.matches(selector)) return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  static #DRAGGING_BODY_CLASS = "fig-reorder-dragging";

  static #setDocumentDragging(active) {
    document.body.classList.toggle(FigReorder.#DRAGGING_BODY_CLASS, active);
  }

  #startPendingDrag(event, item, target) {
    this.#cancelDrag();

    const state = {
      item,
      target,
      pointerId: event.pointerId,
      oldIndex: this.#getElementChildren().indexOf(item),
      targetIndex: this.#getElementChildren().indexOf(item),
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      onMove: null,
      onUp: null,
      onKeyDown: null,
    };

    state.onMove = (moveEvent) => {
      if (moveEvent.pointerId !== state.pointerId) return;

      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;

      if (!state.active) {
        if (dx * dx + dy * dy < FigReorder.#DRAG_THRESHOLD * FigReorder.#DRAG_THRESHOLD) {
          return;
        }
        state.active = true;
        event.preventDefault();
        event.stopPropagation();
        item.classList.add("dragging");
        FigReorder.#setDocumentDragging(true);
        try {
          target.setPointerCapture(state.pointerId);
        } catch {}
      }

      moveEvent.preventDefault();
      const pointer =
        this.#axis === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const index = this.#getInsertIndex(pointer);
      state.targetIndex = index;
      this.#updateIndicator(index, item);
    };

    state.onKeyDown = (keyEvent) => {
      if (keyEvent.key !== "Escape" || !state.active) return;
      keyEvent.preventDefault();
      this.#finishDrag(state, true);
    };

    state.onUp = (upEvent) => {
      if (upEvent.pointerId !== state.pointerId) return;
      this.#finishDrag(state, upEvent.type === "pointercancel");
    };

    this.#drag = state;
    window.addEventListener("pointermove", state.onMove);
    window.addEventListener("pointerup", state.onUp);
    window.addEventListener("pointercancel", state.onUp);
    window.addEventListener("keydown", state.onKeyDown);
  }

  #getInsertIndex(pointer) {
    const items = this.#getElementChildren();
    const horizontal = this.#axis === "horizontal";

    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const midpoint = horizontal
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      if (pointer < midpoint) return i;
    }

    return items.length;
  }

  #shouldShowIndicator(item, index) {
    const items = this.#getElementChildren();
    const currentIndex = items.indexOf(item);
    if (currentIndex === -1) return false;

    const clamped = Math.max(0, Math.min(index, items.length));

    if (index === currentIndex) return false;

    // Hide only the redundant bottom line when the dragged item is already last.
    if (clamped >= items.length && currentIndex === items.length - 1) {
      return false;
    }

    return true;
  }

  #getReorderBounds(items) {
    if (!items.length) return null;

    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
    }

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  #ensureIndicator() {
    if (this.#indicator) return this.#indicator;

    const indicator = document.createElement("div");
    indicator.className = "fig-reorder-indicator";
    indicator.setAttribute("data-axis", this.#axis);
    document.body.appendChild(indicator);
    this.#indicator = indicator;
    return indicator;
  }

  #updateIndicator(index, item) {
    const items = this.#getElementChildren();
    if (!this.#shouldShowIndicator(item, index)) {
      this.#removeIndicator();
      return;
    }

    const bounds = this.#getReorderBounds(items);
    if (!bounds) {
      this.#removeIndicator();
      return;
    }

    const indicator = this.#ensureIndicator();
    indicator.setAttribute("data-axis", this.#axis);

    if (this.#axis === "horizontal") {
      let x;
      if (index <= 0) {
        x = items[0].getBoundingClientRect().left;
      } else if (index >= items.length) {
        x = items[items.length - 1].getBoundingClientRect().right;
      } else {
        x = items[index].getBoundingClientRect().left;
      }

      indicator.style.left = `${x - 1}px`;
      indicator.style.top = `${bounds.top}px`;
      indicator.style.width = "2px";
      indicator.style.height = `${bounds.height}px`;
      return;
    }

    let y;
    if (index <= 0) {
      y = items[0].getBoundingClientRect().top;
    } else if (index >= items.length) {
      y = items[items.length - 1].getBoundingClientRect().bottom;
    } else {
      y = items[index].getBoundingClientRect().top;
    }

    indicator.style.left = `${bounds.left}px`;
    indicator.style.top = `${y - 1}px`;
    indicator.style.width = `${bounds.width}px`;
    indicator.style.height = "2px";
  }

  #removeIndicator() {
    this.#indicator?.remove();
    this.#indicator = null;
  }

  #moveItemToIndex(item, index) {
    const items = this.#getElementChildren();
    const clamped = Math.max(0, Math.min(index, items.length));

    if (clamped >= items.length) {
      if (items[items.length - 1] !== item) this.appendChild(item);
      return;
    }

    const ref = items[clamped];
    if (ref !== item) this.insertBefore(item, ref);
  }

  #moveItemToFinalIndex(item, newIndex) {
    const items = this.#getElementChildren().filter((candidate) => candidate !== item);
    const ref = items[newIndex] ?? null;
    if (ref) this.insertBefore(item, ref);
    else this.appendChild(item);
  }

  #finishDrag(state, revert) {
    const { item, oldIndex, active, onMove, onUp, onKeyDown } = state;

    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKeyDown);

    if (active) {
      if (!revert) {
        this.#moveItemToIndex(item, state.targetIndex);
        const newIndex = this.#getElementChildren().indexOf(item);
        if (newIndex !== -1 && newIndex !== oldIndex) {
          this.dispatchEvent(
            new CustomEvent("reorder", {
              bubbles: true,
              detail: { oldIndex, newIndex, item },
            }),
          );
          const name =
            item.getAttribute("aria-label") ||
            item.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
            "item";
          this.#announce(
            `${name}, position ${newIndex + 1} of ${this.#getElementChildren().length}`,
          );
        }
      }
    }

    item.classList.remove("dragging");
    FigReorder.#setDocumentDragging(false);
    this.#removeIndicator();
    if (this.#drag === state) this.#drag = null;
  }

  #unbindAll() {
    for (const [, binding] of this.#bindings) {
      binding.target.removeEventListener(
        "pointerdown",
        binding.onPointerDown,
        true,
      );
      binding.target.removeEventListener("keydown", binding.onKeyDown);
      this.#restoreKeyboardAttrs(binding);
    }
    this.#bindings.clear();
  }

  #cancelDrag() {
    if (!this.#drag) return;
    this.#finishDrag(this.#drag, true);
  }
}

figLabDefineElement("fig-reorder", FigReorder);
