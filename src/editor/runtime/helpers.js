/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
const HTMLElement = globalThis.HTMLElement ?? class {};
const CustomEvent = class extends (globalThis.CustomEvent ?? class {}) {
  constructor(type, options = {}) {
    super(
      type,
      options.bubbles && options.composed === undefined
        ? { ...options, composed: true }
        : options,
    );
  }
};

function figEditorDefineElement(name, constructor) {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

function figEditorGetOverlayRoot() {
  if (!document.body) return null;
  const attribute = "data-figui-overlay-root";
  let root = document.body.querySelector(`:scope > [${attribute}]`);
  if (!root) {
    root = document.createElement("div");
    root.setAttribute(attribute, "");
    document.body.append(root);
  }
  return root;
}

function figEditorEscapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function figEditorBooleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

function figEditorUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function figEditorCssUrl(url) {
  if (!url) return "";
  return `url("${String(url).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function figEditorLooksLikeVideoUrl(raw) {
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

function figEditorCreateIcon(name, options = {}) {
  const icon = document.createElement("fig-icon");
  if (name) icon.setAttribute("name", name);
  if (options.size) icon.setAttribute("size", options.size);
  if (options.className) icon.className = options.className;
  return icon;
}

function figEditorAppendChildren(parent, children) {
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

function figEditorSetAttributes(element, attributes = {}) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "className") {
      element.className = String(value);
    } else if (value === true) {
      element.setAttribute(name, "");
    } else {
      element.setAttribute(name, String(value));
    }
  }
  return element;
}

function figEditorCreateElement(tagName, attributes, children) {
  const element = document.createElement(tagName);
  figEditorSetAttributes(element, attributes);
  return figEditorAppendChildren(element, children);
}

const FIG_EDITOR_SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function figEditorCreateSvgElement(tagName, attributes, children) {
  const element = document.createElementNS(FIG_EDITOR_SVG_NAMESPACE, tagName);
  for (const [name, value] of Object.entries(attributes || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "className") {
      element.setAttribute("class", String(value));
    } else if (value === true) {
      element.setAttribute(name, "");
    } else {
      element.setAttribute(name, String(value));
    }
  }
  return figEditorAppendChildren(element, children);
}

function figEditorCreateOverflowButtons({
  owner,
  onStart,
  onEnd,
  startClass = "",
  endClass = "",
  chevronClass = "",
  startLabel = "Scroll back",
  endLabel = "Scroll forward",
} = {}) {
  const makeButton = (direction, onPointerDown) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "fig-overflow",
      `fig-overflow-${direction}`,
      direction === "start" ? startClass : endClass,
    ]
      .filter(Boolean)
      .join(" ");
    button.dataset.figOverflow = direction;
    if (owner) button.setAttribute(`data-fig-${owner}-nav`, direction);
    button.setAttribute("tabindex", "-1");
    button.setAttribute(
      "aria-label",
      direction === "start" ? startLabel : endLabel,
    );
    button.appendChild(
      figEditorCreateIcon("chevron", {
        size: "small",
        className: ["fig-overflow-chevron", chevronClass].filter(Boolean).join(" "),
      }),
    );
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onPointerDown?.(event);
    });
    return button;
  };

  return {
    start: makeButton("start", onStart),
    end: makeButton("end", onEnd),
  };
}

function figEditorSyncOverflowState(host, scrollEl, axis = "x", threshold = 2) {
  if (!host || !scrollEl) return false;
  const isHorizontal = axis === "x";
  const scrollSize = isHorizontal ? scrollEl.scrollWidth : scrollEl.scrollHeight;
  const clientSize = isHorizontal ? scrollEl.clientWidth : scrollEl.clientHeight;
  const scrollPosition = isHorizontal ? scrollEl.scrollLeft : scrollEl.scrollTop;
  const scrollable = scrollSize - clientSize > threshold;
  const atStart = !scrollable || scrollPosition <= threshold;
  const atEnd = !scrollable || scrollPosition + clientSize >= scrollSize - threshold;
  host.classList.toggle("overflow-start", !atStart);
  host.classList.toggle("overflow-end", !atEnd);
  return scrollable;
}

function figEditorScrollOverflowPage(scrollEl, axis = "x", direction = 1) {
  if (!scrollEl) return;
  const isHorizontal = axis === "x";
  const pageSize = isHorizontal ? scrollEl.clientWidth : scrollEl.clientHeight;
  const scrollAmount = pageSize * 0.8 * direction;
  scrollEl.scrollBy({
    [isHorizontal ? "left" : "top"]: scrollAmount,
    behavior: "smooth",
  });
}

function figEditorScrollElementToCenter(
  scrollEl,
  element,
  axis = "y",
  behavior = "auto",
) {
  if (!scrollEl || !element || !scrollEl.contains(element)) return;
  requestAnimationFrame(() => {
    if (!scrollEl.isConnected || !element.isConnected) return;
    const isHorizontal = axis === "x";
    const scrollSize = isHorizontal
      ? scrollEl.scrollWidth
      : scrollEl.scrollHeight;
    const clientSize = isHorizontal
      ? scrollEl.clientWidth
      : scrollEl.clientHeight;
    if (scrollSize <= clientSize + 1) {
      figEditorSyncOverflowState(scrollEl, scrollEl, axis);
      return;
    }
    const elementRect = element.getBoundingClientRect();
    const hostRect = scrollEl.getBoundingClientRect();
    const currentScroll = isHorizontal
      ? scrollEl.scrollLeft
      : scrollEl.scrollTop;
    const elementStart =
      (isHorizontal ? elementRect.left - hostRect.left : elementRect.top - hostRect.top) +
      currentScroll;
    const elementSize = isHorizontal ? elementRect.width : elementRect.height;
    const maxScroll = scrollSize - clientSize;
    const nextScroll = Math.max(
      0,
      Math.min(elementStart + elementSize / 2 - clientSize / 2, maxScroll),
    );
    scrollEl.scrollTo({
      [isHorizontal ? "left" : "top"]: nextScroll,
      behavior,
    });
    figEditorSyncOverflowState(scrollEl, scrollEl, axis);
  });
}

export {
  HTMLElement,
  CustomEvent,
  figEditorDefineElement,
  figEditorGetOverlayRoot,
  figEditorEscapeAttribute,
  figEditorBooleanAttribute,
  figEditorUniqueId,
  figEditorCssUrl,
  figEditorLooksLikeVideoUrl,
  figEditorCreateIcon,
  figEditorAppendChildren,
  figEditorSetAttributes,
  figEditorCreateElement,
  FIG_EDITOR_SVG_NAMESPACE,
  figEditorCreateSvgElement,
  figEditorCreateOverflowButtons,
  figEditorSyncOverflowState,
  figEditorScrollOverflowPage,
  figEditorScrollElementToCenter,
};
