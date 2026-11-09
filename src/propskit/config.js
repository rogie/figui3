/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

export const PROPSKIT_CONTROL_TYPES = new Set([
  "action",
  "audio",
  "color",
  "easing",
  "file",
  "gradient",
  "image",
  "joystick",
  "number",
  "options",
  "palette",
  "point",
  "rotate",
  "switch",
  "text",
  "video",
]);

export const DEFAULT_PROPSKIT_JOYSTICK_UNIT_SCALE = 100;

const GROUP_KEYS = new Set(["_collapsed", "_compact", "_label"]);
const PROPSKIT_SLIDER_VARIANTS = new Set([
  "range",
  "hue",
  "delta",
  "opacity",
]);

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clonePropsKitValue(value) {
  if (Array.isArray(value)) return value.map(clonePropsKitValue);
  if (
    isRecord(value) &&
    !(typeof File !== "undefined" && value instanceof File)
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        clonePropsKitValue(entry),
      ]),
    );
  }
  return value;
}

export function deepFreezePropsKitValue(value) {
  if (Array.isArray(value) || isRecord(value)) {
    if (typeof File !== "undefined" && value instanceof File) return value;
    Object.values(value).forEach(deepFreezePropsKitValue);
    Object.freeze(value);
  }
  return value;
}

export function propsKitValuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => propsKitValuesEqual(entry, right[index]))
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      propsKitValuesEqual(leftKeys, rightKeys) &&
      leftKeys.every((key) => propsKitValuesEqual(left[key], right[key]))
    );
  }
  return false;
}

export function formatPropsKitLabel(key) {
  return String(key)
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase())
    .trim();
}

export function isNumberRange(value) {
  return (
    Array.isArray(value) &&
    (value.length === 3 || value.length === 4) &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

export function inferNumberRange(value) {
  if (value >= 0 && value <= 1) return { min: 0, max: 1, step: 0.01 };
  if (value >= 0 && value <= 10) {
    return { min: 0, max: value * 3 || 10, step: 0.1 };
  }
  if (value >= 0 && value <= 100) {
    return { min: 0, max: value * 3 || 100, step: 1 };
  }
  if (value >= 0) return { min: 0, max: value * 3 || 1000, step: 10 };
  return { min: value * 3, max: -value * 3, step: 1 };
}

function looksLikeColor(value) {
  const text = value.trim();
  return (
    /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(text) ||
    /^(?:rgb|rgba|hsl|hsla|oklch|oklab|color)\(/i.test(text)
  );
}

export function normalizePropsKitOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => {
    if (isRecord(option)) {
      return {
        value: String(option.value ?? ""),
        label: String(option.label ?? option.value ?? ""),
      };
    }
    const value = String(option);
    return { value, label: value };
  });
}

export function normalizePropsKitMediaOptions(options) {
  return normalizePropsKitOptions(options);
}

export function isPropsKitLeaf(value) {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    PROPSKIT_CONTROL_TYPES.has(value.type)
  );
}

function inferredDefinition(raw) {
  if (isNumberRange(raw)) {
    return {
      type: "number",
      control: "slider",
      variant: "range",
      default: raw[0],
      min: raw[1],
      max: raw[2],
      ...(raw[3] === undefined ? {} : { step: raw[3] }),
    };
  }
  if (typeof raw === "number") {
    return {
      type: "number",
      control: "slider",
      variant: "range",
      default: raw,
      ...inferNumberRange(raw),
    };
  }
  if (typeof raw === "boolean") {
    return { type: "switch", default: raw };
  }
  if (typeof raw === "string") {
    return {
      type: looksLikeColor(raw) ? "color" : "text",
      default: raw,
    };
  }
  if (isRecord(raw) && raw.type === "number") {
    const defaultValue =
      typeof raw.default === "number" && Number.isFinite(raw.default)
        ? raw.default
        : 0;
    return { ...inferNumberRange(defaultValue), ...raw };
  }
  return raw;
}

function defaultForDefinition(definition) {
  if (definition.type === "action") return undefined;
  if (Object.prototype.hasOwnProperty.call(definition, "default")) {
    return clonePropsKitValue(definition.default);
  }
  switch (definition.type) {
    case "number":
      return Number.isFinite(definition.min) ? definition.min : 0;
    case "switch":
      return false;
    case "color":
      return "#000000";
    case "gradient":
      return "";
    case "palette":
      return [];
    case "point":
      return { x: 50, y: 50 };
    case "joystick": {
      const midpoint =
        (definition.unitScale ??
          DEFAULT_PROPSKIT_JOYSTICK_UNIT_SCALE) / 2;
      return { x: midpoint, y: midpoint };
    }
    case "rotate":
      return "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    case "file":
      return { files: [], url: "", filename: "" };
    case "image":
    case "video":
      return normalizePropsKitMediaOptions(definition.options)[0]?.value ?? "";
    case "audio":
      return definition.multiple === true ? [] : "";
    case "options":
      return normalizePropsKitOptions(definition.options)[0]?.value ?? "";
    case "easing":
      return "0.42, 0, 0.58, 1";
    case "text":
    default:
      return "";
  }
}

function attributesForDefinition(definition) {
  return Object.fromEntries(
    Object.entries(definition).filter(
      ([key]) =>
        ![
          "type",
          "label",
          "default",
          "onClick",
          "control",
          "multiple",
          "options",
          "unitScale",
        ].includes(key),
    ),
  );
}

function invalidValue(reason) {
  return { valid: false, reason };
}

function validValue(value, warning) {
  return { valid: true, value, ...(warning ? { warning } : {}) };
}

export function normalizePropsKitValue(node, value) {
  switch (node.controlType) {
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return invalidValue("must be a finite number");
      }
      const min = Number.isFinite(node.definition.min)
        ? node.definition.min
        : -Infinity;
      const max = Number.isFinite(node.definition.max)
        ? node.definition.max
        : Infinity;
      const normalized = Math.max(min, Math.min(max, value));
      return validValue(
        normalized,
        normalized === value
          ? undefined
          : `was clamped to the configured range ${min}…${max}`,
      );
    }
    case "switch":
      return typeof value === "boolean"
        ? validValue(value)
        : invalidValue("must be a boolean");
    case "text":
    case "color":
    case "gradient":
    case "easing":
    case "rotate":
      return typeof value === "string"
        ? validValue(value)
        : invalidValue("must be a string");
    case "palette":
      return Array.isArray(value)
        ? validValue(clonePropsKitValue(value))
        : invalidValue("must be an array");
    case "options": {
      if (typeof value !== "string") return invalidValue("must be a string");
      const allowed = new Set(
        normalizePropsKitOptions(node.definition.options).map(
          (option) => option.value,
        ),
      );
      return allowed.has(value)
        ? validValue(value)
        : invalidValue(`must match one of: ${[...allowed].join(", ")}`);
    }
    case "point":
    case "joystick":
      return isRecord(value) &&
        Number.isFinite(value.x) &&
        Number.isFinite(value.y)
        ? validValue({ x: Number(value.x), y: Number(value.y) })
        : invalidValue("must be an object with finite x and y numbers");
    case "file":
      return isRecord(value) &&
        Array.isArray(value.files) &&
        typeof value.url === "string" &&
        typeof value.filename === "string"
        ? validValue(clonePropsKitValue(value))
        : invalidValue(
            "must contain a files array plus string url and filename fields",
          );
    case "image":
    case "video":
    case "audio": {
      if (node.multiple) {
        if (
          !Array.isArray(value) ||
          value.some((entry) => typeof entry !== "string")
        ) {
          return invalidValue("must be an array of source strings");
        }
        const maxItems = node.maxItems ?? Infinity;
        const normalized = value.slice(0, maxItems);
        return validValue(
          normalized,
          normalized.length === value.length
            ? undefined
            : `was truncated to maxItems=${maxItems}`,
        );
      }
      return typeof value === "string"
        ? validValue(value)
        : invalidValue("must be a single source string");
    }
    case "action":
      return validValue(undefined);
    default:
      return invalidValue(`has unsupported type "${node.controlType}"`);
  }
}

function validateDefinition(path, node) {
  const { definition } = node;
  if (definition.type === "number") {
    if (definition.steppers !== undefined) {
      throw new TypeError(
        `[propskit] "${path}" uses steppers; use the singular stepper boolean instead.`,
      );
    }
    if (
      definition.variant !== undefined &&
      !PROPSKIT_SLIDER_VARIANTS.has(definition.variant)
    ) {
      const guidance =
        definition.variant === "stepper"
          ? ' Use stepper: true instead.'
          : "";
      throw new TypeError(
        `[propskit] "${path}" has unsupported number variant "${definition.variant}".${guidance}`,
      );
    }
    if (
      definition.stepper !== undefined &&
      typeof definition.stepper !== "boolean"
    ) {
      throw new TypeError(`[propskit] "${path}" stepper must be boolean.`);
    }
    for (const key of ["default", "min", "max", "step"]) {
      if (
        definition[key] !== undefined &&
        (typeof definition[key] !== "number" ||
          !Number.isFinite(definition[key]))
      ) {
        throw new TypeError(`[propskit] "${path}" ${key} must be finite.`);
      }
    }
    if (
      definition.min !== undefined &&
      definition.max !== undefined &&
      definition.min > definition.max
    ) {
      throw new RangeError(`[propskit] "${path}" min must not exceed max.`);
    }
    if (definition.step !== undefined && definition.step <= 0) {
      throw new RangeError(`[propskit] "${path}" step must be greater than 0.`);
    }
  }
  if (definition.type === "options") {
    if (!Array.isArray(definition.options) || !definition.options.length) {
      throw new TypeError(
        `[propskit] "${path}" options controls require a non-empty options array.`,
      );
    }
    const options = normalizePropsKitOptions(definition.options);
    const values = options.map((option) => option.value);
    if (new Set(values).size !== values.length) {
      throw new RangeError(
        `[propskit] "${path}" option values must be unique.`,
      );
    }
  }
  if (["image", "video"].includes(definition.type)) {
    if (definition.multiple !== undefined || definition.maxItems !== undefined) {
      throw new TypeError(
        `[propskit] "${path}" ${definition.type} controls use options for selectable media; multiple and maxItems are not supported.`,
      );
    }
    if (definition.options !== undefined) {
      if (!Array.isArray(definition.options) || !definition.options.length) {
        throw new TypeError(
          `[propskit] "${path}" media options must be a non-empty array.`,
        );
      }
      for (const option of definition.options) {
        const valid =
          (typeof option === "string" && option.length > 0) ||
          (
            isRecord(option) &&
            typeof option.value === "string" &&
            option.value.length > 0 &&
            typeof option.label === "string"
          );
        if (!valid) {
          throw new TypeError(
            `[propskit] "${path}" media options must be source strings or { value, label } objects.`,
          );
        }
      }
      const values = normalizePropsKitMediaOptions(definition.options).map(
        (option) => option.value,
      );
      if (new Set(values).size !== values.length) {
        throw new RangeError(
          `[propskit] "${path}" media option values must be unique.`,
        );
      }
    }
  }
  if (definition.type === "audio") {
    if (
      definition.multiple !== undefined &&
      typeof definition.multiple !== "boolean"
    ) {
      throw new TypeError(`[propskit] "${path}" multiple must be boolean.`);
    }
    if (
      definition.maxItems !== undefined &&
      (!Number.isInteger(definition.maxItems) || definition.maxItems < 1)
    ) {
      throw new RangeError(
        `[propskit] "${path}" maxItems must be a positive integer.`,
      );
    }
  }
  if (
    definition.type === "joystick" &&
    definition.unitScale !== undefined &&
    (
      typeof definition.unitScale !== "number" ||
      !Number.isFinite(definition.unitScale) ||
      definition.unitScale <= 0
    )
  ) {
    throw new RangeError(
      `[propskit] "${path}" unitScale must be a finite number greater than 0.`,
    );
  }
  const normalized = normalizePropsKitValue(node, node.defaultValue);
  if (!normalized.valid) {
    throw new TypeError(
      `[propskit] "${path}" default ${normalized.reason}.`,
    );
  }
  if (!propsKitValuesEqual(normalized.value, node.defaultValue)) {
    throw new RangeError(
      `[propskit] "${path}" default ${normalized.warning || "is outside its configured contract"}.`,
    );
  }
}

export function compilePropsKitConfig(config) {
  if (!isRecord(config)) {
    throw new TypeError("[propskit] Config must be an object.");
  }
  const defaults = {};
  const paths = new Set();
  const groupPaths = new Set();
  const nodesByPath = new Map();

  const visit = (group, prefix = "") => {
    const nodes = [];
    for (const [key, raw] of Object.entries(group)) {
      if (GROUP_KEYS.has(key) || raw === undefined) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (
        Array.isArray(raw) &&
        !isNumberRange(raw)
      ) {
        throw new TypeError(
          `[propskit] "${path}" arrays are only valid as number ranges; use an explicit media definition for list defaults.`,
        );
      }
      if (typeof raw === "number" && !Number.isFinite(raw)) {
        throw new TypeError(`[propskit] "${path}" must be a finite number.`);
      }
      if (
        isRecord(raw) &&
        typeof raw.type === "string" &&
        !isPropsKitLeaf(raw)
      ) {
        throw new TypeError(
          `[propskit] "${path}" has unknown control type "${raw.type}".`,
        );
      }
      if (isRecord(raw) && !isPropsKitLeaf(raw)) {
        groupPaths.add(path);
        nodes.push({
          kind: "group",
          path,
          label: raw._label || formatPropsKitLabel(key),
          collapsible: Object.prototype.hasOwnProperty.call(raw, "_collapsed"),
          collapsed: raw._collapsed === true,
          compact: raw._compact === true,
          children: visit(raw, path),
        });
        continue;
      }

      const definition = inferredDefinition(raw);
      if (!isPropsKitLeaf(definition)) {
        throw new TypeError(`[propskit] "${path}" is not a valid control.`);
      }
      if (
        definition.type === "number" &&
        definition.control !== undefined &&
        !["slider", "number"].includes(definition.control)
      ) {
        throw new TypeError(
          `[propskit] "${path}" number control must be "slider" or "number".`,
        );
      }
      const defaultValue = defaultForDefinition(definition);
      const multiple =
        definition.type === "audio" &&
        (definition.multiple ?? Array.isArray(definition.default));
      const node = {
        kind: "control",
        path,
        label: definition.label || formatPropsKitLabel(key),
        controlType: definition.type,
        defaultValue,
        attributes: attributesForDefinition(definition),
        definition,
        multiple,
        mediaOptions:
          definition.type === "image" || definition.type === "video"
            ? normalizePropsKitMediaOptions(definition.options)
            : [],
        joystickUnitScale:
          definition.type === "joystick"
            ? definition.unitScale ??
              DEFAULT_PROPSKIT_JOYSTICK_UNIT_SCALE
            : undefined,
        maxItems: Number.isInteger(definition.maxItems)
          ? definition.maxItems
          : undefined,
      };
      validateDefinition(path, node);
      nodes.push(node);
      nodesByPath.set(path, node);
      if (definition.type !== "action") {
        paths.add(path);
        defaults[path] = clonePropsKitValue(defaultValue);
      }
    }
    return nodes;
  };

  const nodes = visit(config);
  return { nodes, defaults, paths, groupPaths, nodesByPath };
}

export function resolvePropsKitValues(config, flatValues) {
  const visit = (group, prefix = "") => {
    const result = {};
    for (const [key, raw] of Object.entries(group)) {
      if (GROUP_KEYS.has(key) || raw === undefined) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (isRecord(raw) && !isPropsKitLeaf(raw)) {
        result[key] = visit(raw, path);
      } else {
        const definition = inferredDefinition(raw);
        if (definition.type === "action") continue;
        result[key] = clonePropsKitValue(
          Object.prototype.hasOwnProperty.call(flatValues, path)
            ? flatValues[path]
            : defaultForDefinition(definition),
        );
      }
    }
    return result;
  };
  return visit(config);
}

export function flattenPropsKitUpdates(compiled, updates, onInvalid = () => {}) {
  const result = {};
  const visit = (value, prefix = "") => {
    if (!isRecord(value)) {
      onInvalid(prefix, "must be an object");
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (compiled.paths.has(path)) {
        result[path] = clonePropsKitValue(entry);
      } else if (compiled.groupPaths.has(path) && isRecord(entry)) {
        visit(entry, path);
      } else if (compiled.groupPaths.has(path)) {
        onInvalid(path, "must be a nested object");
      } else {
        onInvalid(path, "is not a compiled control path");
      }
    }
  };
  visit(updates);
  return result;
}
