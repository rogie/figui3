/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  FIG_ICON_TOKENS,
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

function figIconCssVar(name, size = "medium") {
  const token = name && FIG_ICON_TOKENS[name];
  if (!token) return "";

  const tokenName =
    typeof token === "string"
      ? token
      : token[size === "small" ? "small" : "medium"];
  return tokenName ? `var(${tokenName})` : "";
}

const FIG_ICON_COLOR_TOKENS = {
  primary: "--figma-color-icon",
  secondary: "--figma-color-icon-secondary",
  tertiary: "--figma-color-icon-tertiary",
  disabled: "--figma-color-icon-disabled",
  brand: "--figma-color-icon-brand",
  component: "--figma-color-icon-component",
  danger: "--figma-color-icon-danger",
  success: "--figma-color-icon-success",
  warning: "--figma-color-icon-warning",
  selected: "--figma-color-icon-selected",
  hover: "--figma-color-icon-hover",
  pressed: "--figma-color-icon-pressed",
  onbrand: "--figma-color-icon-onbrand",
  oncomponent: "--figma-color-icon-oncomponent",
  ondanger: "--figma-color-icon-ondanger",
  ondisabled: "--figma-color-icon-ondisabled",
  oninverse: "--figma-color-icon-oninverse",
  onselected: "--figma-color-icon-onselected",
  onsuccess: "--figma-color-icon-onsuccess",
  onwarning: "--figma-color-icon-onwarning",
};

function figIconColorValue(color) {
  if (!color) return "";
  if (color.startsWith("var(")) return color;
  const token = FIG_ICON_COLOR_TOKENS[color.toLowerCase()];
  return token ? `var(${token})` : color;
}

/**
 * Masked icon using design-token SVGs from :root.
 * @attr {string} name - Icon name (chevron, add, close, …)
 * @attr {'small'|'medium'} size - Display size; medium (default) uses --spacer-4, small uses --spacer-3
 * @attr {string} color - Icon color alias (primary, secondary, tertiary, disabled, brand, component, danger, success, warning, selected, hover, pressed, onbrand, …), CSS variable, or CSS color.
 */
class FigIcon extends HTMLElement {
  static get observedAttributes() {
    return ["name", "size", "color"];
  }

  connectedCallback() {
    this.#sync();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this.#sync();
  }

  #sync() {
    const iconName = this.getAttribute("name");
    const size = this.getAttribute("size") || "medium";
    const cssVar = figIconCssVar(iconName, size);
    if (cssVar) this.style.setProperty("--icon", cssVar);
    else this.style.removeProperty("--icon");

    if (size === "small") {
      this.style.setProperty("--size", "var(--spacer-3)");
    } else {
      this.style.removeProperty("--size");
    }

    const color = figIconColorValue(this.getAttribute("color"));
    if (color) {
      this.style.backgroundColor = color;
      this.style.setProperty("--icon-color", color);
    } else {
      this.style.removeProperty("background-color");
      this.style.removeProperty("--icon-color");
    }

    if (!this.hasAttribute("aria-hidden")) {
      this.setAttribute("aria-hidden", "true");
    }
  }
}
figDefineElement("fig-icon", FigIcon);

export { FigIcon };
