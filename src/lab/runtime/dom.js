/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/

export const HTMLElement = globalThis.HTMLElement ?? class {};
export const CustomEvent = class extends (globalThis.CustomEvent ?? class {}) {
  constructor(type, options = {}) {
    super(
      type,
      options.bubbles && options.composed === undefined
        ? { ...options, composed: true }
        : options,
    );
  }
};

export function figLabDefineElement(name, constructor) {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

export function figLabBooleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

const FIG_LAB_SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function figLabAppendChildren(parent, children) {
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

export function figLabSetAttributes(element, attributes = {}) {
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

export function figLabCreateElement(tagName, attributes, children) {
  const element = document.createElement(tagName);
  figLabSetAttributes(element, attributes);
  return figLabAppendChildren(element, children);
}

export function figLabCreateSvgElement(tagName, attributes, children) {
  const element = document.createElementNS(FIG_LAB_SVG_NAMESPACE, tagName);
  figLabSetAttributes(element, attributes);
  return figLabAppendChildren(element, children);
}

export function figLabColorEventAliases(color, alpha, opacity) {
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
