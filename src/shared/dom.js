/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

const FIG_SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function figAppendChildren(parent, children) {
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

function figSetAttributes(element, attributes = {}) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "className") {
      if (element.namespaceURI === FIG_SVG_NAMESPACE) {
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

function figCreateElement(tagName, attributes, children) {
  const element = document.createElement(tagName);
  figSetAttributes(element, attributes);
  return figAppendChildren(element, children);
}

function figCreateSvgElement(tagName, attributes, children) {
  const element = document.createElementNS(FIG_SVG_NAMESPACE, tagName);
  figSetAttributes(element, attributes);
  return figAppendChildren(element, children);
}

/** Run callback on the next frame; skip if the host disconnected first. */
function figNextFrame(host, callback) {
  requestAnimationFrame(() => {
    if (host && !host.isConnected) return;
    callback();
  });
}

function figBooleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

function figCloneValue(value) {
  if (Array.isArray(value)) return value.map((entry) => figCloneValue(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, figCloneValue(entry)]),
    );
  }
  return value;
}

function figValuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (typeof left === "number" && typeof right === "number") {
    return (
      Number.isFinite(left) &&
      Number.isFinite(right) &&
      Math.abs(left - right) <=
        Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right)) * 16
    );
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => figValuesEqual(entry, right[index]))
    );
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      figValuesEqual(leftKeys, rightKeys) &&
      leftKeys.every((key) => figValuesEqual(left[key], right[key]))
    );
  }
  return false;
}

function figBindFormReset(host, callback) {
  const form = host.closest("form");
  if (!form) return () => {};

  const handleReset = (event) => {
    queueMicrotask(() => {
      if (!event.defaultPrevented && host.isConnected) callback();
    });
  };

  form.addEventListener("reset", handleReset);
  return () => form.removeEventListener("reset", handleReset);
}

export {
  FIG_SVG_NAMESPACE,
  figAppendChildren,
  figBindFormReset,
  figBooleanAttribute,
  figCloneValue,
  figCreateElement,
  figCreateSvgElement,
  figNextFrame,
  figSetAttributes,
  figValuesEqual,
};
