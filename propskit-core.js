/**
 * PropsKit core — config store, theme, and DOM renderer.
 * Framework-agnostic. Bundled into propskit.js.
 */

export const PROPSKIT_SCOPE_ROOT_CLASS = "figui-root";
export const PROPSKIT_OVERLAY_ROOT_ATTR = "data-figui-overlay-root";

/** @typedef {'system' | 'light' | 'dark'} PropsKitTheme */

/**
 * @param {Element} el
 * @param {PropsKitTheme} [theme]
 */
export function applyFiguiTheme(el, theme = "system") {
  if (!el) return;
  const normalized =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";
  el.setAttribute("theme", normalized);
  el.classList.add(PROPSKIT_SCOPE_ROOT_CLASS);
  el.classList.toggle("figma-light", normalized === "light");
  el.classList.toggle("figma-dark", normalized === "dark");
  if (normalized === "system") {
    el.style.setProperty("color-scheme", "light dark");
  } else {
    el.style.setProperty("color-scheme", normalized);
  }
}

/**
 * Sync theme from a panel root onto the document overlay portal.
 * @param {Element | null} [source]
 */
export function syncOverlayTheme(source) {
  if (typeof document === "undefined" || !document.body) return null;
  const attr = PROPSKIT_OVERLAY_ROOT_ATTR;
  let root = document.body.querySelector(`:scope > [${attr}]`);
  if (!root) {
    root = document.createElement("div");
    root.setAttribute(attr, "");
    document.body.append(root);
  }

  const panel =
    source?.closest?.(`.${PROPSKIT_SCOPE_ROOT_CLASS}`) ??
    document.querySelector(`.${PROPSKIT_SCOPE_ROOT_CLASS}`);

  if (!panel) return root;

  const themeAttr = panel.getAttribute("theme");
  const theme =
    themeAttr === "light" || themeAttr === "dark" || themeAttr === "system"
      ? themeAttr
      : panel.classList.contains("figma-dark")
        ? "dark"
        : panel.classList.contains("figma-light")
          ? "light"
          : "system";

  applyFiguiTheme(root, theme);
  // Overlay root is not the panel; keep portal class semantics without forcing layout.
  root.classList.remove(PROPSKIT_SCOPE_ROOT_CLASS);
  root.setAttribute(attr, "");
  if (theme === "light") root.classList.add("figma-light");
  if (theme === "dark") root.classList.add("figma-dark");
  return root;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isHexColor(value) {
  return typeof value === "string" && /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {{ kind: string, key: string, label: string, [k: string]: unknown }}
 */
export function inferControl(key, value) {
  const label = key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();

  if (Array.isArray(value) && value.length >= 3 && value.every((n) => typeof n === "number")) {
    const [def, min, max, step] = value;
    return {
      kind: "slider",
      key,
      label,
      default: def,
      min,
      max,
      step: step ?? (max - min <= 1 ? 0.01 : 1),
    };
  }

  if (isPlainObject(value) && typeof value.type === "string") {
    const type = value.type;
    if (type === "select") {
      return {
        kind: "select",
        key,
        label,
        options: value.options ?? [],
        default: value.default ?? value.options?.[0]?.value ?? value.options?.[0] ?? "",
      };
    }
    if (type === "color") {
      return { kind: "color", key, label, default: value.default ?? "#000000" };
    }
    if (type === "text") {
      return {
        kind: "text",
        key,
        label,
        default: value.default ?? "",
        placeholder: value.placeholder,
      };
    }
    if (type === "easing" || type === "spring") {
      return {
        kind: "easing",
        key,
        label,
        default: value.value ?? value.ease ?? value.default ?? [0.4, 0, 0.2, 1],
        spring: type === "spring" ? value : undefined,
      };
    }
    if (type === "action") {
      return { kind: "action", key, label };
    }
  }

  if (isPlainObject(value)) {
    const { _collapsed, ...rest } = value;
    return {
      kind: "folder",
      key,
      label,
      collapsed: Boolean(_collapsed),
      children: Object.entries(rest).map(([k, v]) => inferControl(k, v)),
    };
  }

  if (typeof value === "boolean") {
    return { kind: "switch", key, label, default: value };
  }

  if (typeof value === "number") {
    const abs = Math.abs(value) || 1;
    const max = abs <= 1 ? 1 : abs * 2;
    const min = abs <= 1 ? 0 : 0;
    return {
      kind: "slider",
      key,
      label,
      default: value,
      min,
      max,
      step: abs <= 1 ? 0.01 : 1,
    };
  }

  if (isHexColor(value)) {
    return { kind: "color", key, label, default: value };
  }

  if (typeof value === "string") {
    return { kind: "text", key, label, default: value };
  }

  return { kind: "text", key, label, default: String(value ?? "") };
}

/**
 * @param {Record<string, unknown>} config
 */
export function parseConfig(config) {
  return Object.entries(config ?? {}).map(([key, value]) => inferControl(key, value));
}

function optionValue(option) {
  if (option && typeof option === "object") return String(option.value ?? "");
  return String(option ?? "");
}

function optionLabel(option) {
  if (option && typeof option === "object") {
    return String(option.label ?? option.value ?? "");
  }
  return String(option ?? "");
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!isPlainObject(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

function defaultsFromDescriptors(descriptors, target = {}) {
  for (const d of descriptors) {
    if (d.kind === "folder") {
      target[d.key] = {};
      defaultsFromDescriptors(d.children, target[d.key]);
    } else if (d.kind !== "action") {
      target[d.key] = d.default;
    }
  }
  return target;
}

function cloneValues(values) {
  return structuredClone(values);
}

/**
 * @param {ReturnType<typeof inferControl>} descriptor
 * @param {string} path
 * @param {Record<string, unknown>} values
 * @param {(type: string, path: string, value?: unknown) => void} emit
 */
function renderControl(descriptor, path, values, emit) {
  if (descriptor.kind === "folder") {
    const group = document.createElement("propskit-group");
    group.setAttribute("name", descriptor.label);
    if (!descriptor.collapsed) group.setAttribute("open", "true");
    else group.setAttribute("open", "false");
    for (const child of descriptor.children) {
      group.append(
        renderControl(child, path ? `${path}.${child.key}` : child.key, values, emit),
      );
    }
    return group;
  }

  if (descriptor.kind === "action") {
    const button = document.createElement("fig-button");
    button.textContent = descriptor.label;
    button.addEventListener("click", () => emit("action", path || descriptor.key));
    return button;
  }

  if (descriptor.kind === "slider") {
    const el = document.createElement("propskit-slider");
    el.setAttribute("label", descriptor.label);
    el.setAttribute("min", String(descriptor.min));
    el.setAttribute("max", String(descriptor.max));
    el.setAttribute("step", String(descriptor.step));
    el.setAttribute("value", String(getPath(values, path) ?? descriptor.default));
    el.setAttribute("full", "");
    const forward = (event) => {
      const detail =
        event instanceof CustomEvent && event.detail !== undefined
          ? event.detail
          : el.value;
      const next = typeof detail === "number" ? detail : Number(detail);
      emit("change", path, Number.isFinite(next) ? next : detail);
    };
    el.addEventListener("input", forward);
    el.addEventListener("change", forward);
    return el;
  }

  if (descriptor.kind === "switch") {
    const el = document.createElement("propskit-switch");
    el.setAttribute("label", descriptor.label);
    if (getPath(values, path) ?? descriptor.default) el.setAttribute("checked", "");
    const forward = (event) => {
      const detail =
        event instanceof CustomEvent && event.detail !== undefined
          ? event.detail
          : null;
      const checked =
        detail && typeof detail === "object" && "checked" in detail
          ? Boolean(detail.checked)
          : el.hasAttribute("checked");
      emit("change", path, checked);
    };
    el.addEventListener("input", forward);
    el.addEventListener("change", forward);
    return el;
  }

  if (descriptor.kind === "color") {
    const el = document.createElement("propskit-color");
    el.setAttribute("label", descriptor.label);
    el.setAttribute("value", String(getPath(values, path) ?? descriptor.default));
    const forward = (event) => {
      const detail =
        event instanceof CustomEvent && event.detail !== undefined
          ? event.detail
          : el.value;
      emit("change", path, detail);
    };
    el.addEventListener("input", forward);
    el.addEventListener("change", forward);
    return el;
  }

  if (descriptor.kind === "text") {
    const el = document.createElement("propskit-text");
    el.setAttribute("label", descriptor.label);
    el.setAttribute("value", String(getPath(values, path) ?? descriptor.default ?? ""));
    if (descriptor.placeholder) el.setAttribute("placeholder", descriptor.placeholder);
    const forward = (event) => {
      const detail =
        event instanceof CustomEvent && event.detail !== undefined
          ? event.detail
          : el.value;
      emit("change", path, detail);
    };
    el.addEventListener("input", forward);
    el.addEventListener("change", forward);
    return el;
  }

  if (descriptor.kind === "select") {
    const el = document.createElement("propskit-select");
    el.setAttribute("label", descriptor.label);
    const options = (descriptor.options ?? [])
      .map((opt) => optionLabel(opt))
      .join(",");
    el.setAttribute("options", options);
    const current = getPath(values, path) ?? descriptor.default;
    el.setAttribute("value", String(current ?? ""));
    const forward = (event) => {
      const detail =
        event instanceof CustomEvent && event.detail !== undefined
          ? event.detail
          : el.value;
      const raw = typeof detail === "object" && detail && "value" in detail
        ? detail.value
        : detail;
      const match = (descriptor.options ?? []).find(
        (opt) => optionLabel(opt) === String(raw) || optionValue(opt) === String(raw),
      );
      emit("change", path, match ? optionValue(match) || optionLabel(match) : raw);
    };
    el.addEventListener("input", forward);
    el.addEventListener("change", forward);
    return el;
  }

  if (descriptor.kind === "easing") {
    const field = document.createElement("fig-field");
    field.setAttribute("direction", "horizontal");
    const label = document.createElement("label");
    label.textContent = descriptor.label;
    const curve = document.createElement("fig-easing-curve");
    const current = getPath(values, path) ?? descriptor.default;
    if (Array.isArray(current)) {
      curve.setAttribute("value", current.join(","));
    }
    field.append(label, curve);
    const forward = (event) => {
      const detail =
        event instanceof CustomEvent && event.detail !== undefined
          ? event.detail
          : null;
      emit(
        "change",
        path,
        detail && typeof detail === "object" && "value" in detail
          ? detail.value
          : detail,
      );
    };
    curve.addEventListener("input", forward);
    curve.addEventListener("change", forward);
    return field;
  }

  const fallback = document.createElement("propskit-text");
  fallback.setAttribute("label", descriptor.label);
  fallback.setAttribute("value", String(getPath(values, path) ?? ""));
  return fallback;
}

/**
 * @param {ParentNode} target
 * @param {string} name
 * @param {Record<string, unknown>} config
 * @param {{
 *   theme?: PropsKitTheme,
 *   onChange?: (path: string, value: unknown, values: Record<string, unknown>) => void,
 *   onAction?: (name: string) => void,
 *   scoped?: boolean,
 * }} [options]
 */
export function createPropsKit(target, name, config, options = {}) {
  if (
    !target ||
    (!(target instanceof Element) && !(target instanceof DocumentFragment))
  ) {
    throw new Error("createPropsKit requires a mount element");
  }

  const mount =
    target instanceof DocumentFragment
      ? (() => {
          const el = document.createElement("div");
          target.append(el);
          return el;
        })()
      : target;

  const theme = options.theme ?? "system";
  const scoped = options.scoped !== false;
  if (scoped) applyFiguiTheme(mount, theme);
  else applyFiguiTheme(mount, theme);

  const descriptors = parseConfig(config);
  /** @type {Record<string, unknown>} */
  let values = defaultsFromDescriptors(descriptors);
  const listeners = new Set();

  const panel = document.createElement("propskit-group");
  if (name) {
    panel.setAttribute("name", name);
    panel.setAttribute("open", "true");
  }

  const emit = (type, path, value) => {
    if (type === "action") {
      options.onAction?.(path);
      return;
    }
    setPath(values, path, value);
    const snapshot = cloneValues(values);
    options.onChange?.(path, value, snapshot);
    for (const fn of listeners) fn(snapshot);
    mount.dispatchEvent(
      new CustomEvent("change", {
        detail: { path, value, values: snapshot },
        bubbles: true,
        composed: true,
      }),
    );
  };

  for (const descriptor of descriptors) {
    panel.append(renderControl(descriptor, descriptor.key, values, emit));
  }

  mount.replaceChildren(panel);
  syncOverlayTheme(mount);

  const themeObserver = new MutationObserver(() => syncOverlayTheme(mount));
  themeObserver.observe(mount, {
    attributes: true,
    attributeFilter: ["theme", "class"],
  });

  return {
    get values() {
      return cloneValues(values);
    },
    get(path) {
      return getPath(values, path);
    },
    set(path, value) {
      setPath(values, path, value);
      const snapshot = cloneValues(values);
      options.onChange?.(path, value, snapshot);
      for (const fn of listeners) fn(snapshot);
      // Re-render for simplicity
      mount.replaceChildren();
      const nextPanel = document.createElement("propskit-group");
      if (name) {
        nextPanel.setAttribute("name", name);
        nextPanel.setAttribute("open", "true");
      }
      for (const descriptor of descriptors) {
        nextPanel.append(renderControl(descriptor, descriptor.key, values, emit));
      }
      mount.append(nextPanel);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    destroy() {
      themeObserver.disconnect();
      listeners.clear();
      mount.replaceChildren();
    },
  };
}

/** Panel shell: marks `.figui-root` and honors `theme`. */
class FigPanel extends HTMLElement {
  static get observedAttributes() {
    return ["theme"];
  }

  connectedCallback() {
    this.#apply();
  }

  attributeChangedCallback() {
    this.#apply();
  }

  #apply() {
    const theme = this.getAttribute("theme") || "system";
    applyFiguiTheme(this, /** @type {PropsKitTheme} */ (theme));
    syncOverlayTheme(this);
  }
}

if (typeof customElements !== "undefined" && !customElements.get("fig-panel")) {
  customElements.define("fig-panel", FigPanel);
}

// Auto-sync overlay theme when interacting inside a scoped root.
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (event) => {
      const t = event.target;
      if (!(t instanceof Element)) return;
      if (t.closest(`.${PROPSKIT_SCOPE_ROOT_CLASS}`)) syncOverlayTheme(t);
    },
    true,
  );
  document.addEventListener(
    "focusin",
    (event) => {
      const t = event.target;
      if (!(t instanceof Element)) return;
      if (t.closest(`.${PROPSKIT_SCOPE_ROOT_CLASS}`)) syncOverlayTheme(t);
    },
    true,
  );
}
