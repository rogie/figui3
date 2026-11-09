/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

const warnedInvariants = new Set();
let uniqueId = 0;

function figWarnInvariant(key, message) {
  if (warnedInvariants.has(key)) return;
  warnedInvariants.add(key);
  console.warn(`[figui3] ${message}`);
}

function figDefineCustomElement(name, constructor, options) {
  if (typeof customElements === "undefined") return false;
  const existing = customElements.get(name);
  if (existing) {
    if (existing !== constructor) {
      figWarnInvariant(
        `registration:${name}`,
        `Custom element "${name}" is already registered with a different constructor.`,
      );
    }
    return existing === constructor;
  }
  customElements.define(name, constructor, options);
  return true;
}

function figQuerySelector(
  scope,
  selector,
  label = "selector",
  { warnMissing = true } = {},
) {
  if (!scope?.querySelectorAll || typeof selector !== "string") return null;
  try {
    const matches = scope.querySelectorAll(selector);
    if (matches.length === 0) {
      if (warnMissing) {
        figWarnInvariant(
          `selector:missing:${label}:${selector}`,
          `${label} "${selector}" did not match an element.`,
        );
      }
      return null;
    }
    if (matches.length > 1) {
      figWarnInvariant(
        `selector:ambiguous:${label}:${selector}`,
        `${label} "${selector}" matched ${matches.length} elements; using the first.`,
      );
    }
    return matches[0];
  } catch {
    figWarnInvariant(
      `selector:invalid:${label}:${selector}`,
      `${label} "${selector}" is not a valid selector.`,
    );
    return null;
  }
}

function figClosest(element, selector, label = "selector") {
  if (!element?.closest || typeof selector !== "string") return null;
  try {
    return element.closest(selector);
  } catch {
    figWarnInvariant(
      `closest:invalid:${label}:${selector}`,
      `${label} "${selector}" is not a valid selector.`,
    );
    return null;
  }
}

function figInvariantId(prefix = "fig") {
  uniqueId += 1;
  return `${prefix}-${uniqueId.toString(36)}`;
}

export {
  figClosest,
  figDefineCustomElement,
  figInvariantId,
  figQuerySelector,
  figWarnInvariant,
};
