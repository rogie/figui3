export type AttributeTarget = "field" | "control";

export type BoolMode = "presence" | "string" | "custom";

export interface BaseAttributeRule {
  label: string;
  type: "boolean" | "number" | "enum" | "string";
}

export interface BooleanAttributeRule extends BaseAttributeRule {
  type: "boolean";
  boolMode?: BoolMode;
  defaultChecked?: boolean;
  trueValue?: string | null;
  falseValue?: string | null;
}

export interface NumberAttributeRule extends BaseAttributeRule {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface EnumAttributeRule extends BaseAttributeRule {
  type: "enum";
  options: string[];
}

export interface StringAttributeRule extends BaseAttributeRule {
  type: "string";
}

export type AttributeRule =
  | BooleanAttributeRule
  | NumberAttributeRule
  | EnumAttributeRule
  | StringAttributeRule;

export type AttributeRuleSet = Record<string, AttributeRule>;

const aspectRatioRule: AttributeRule = {
  label: "Aspect Ratio",
  type: "enum",
  options: ["1/1", "4/3", "16/9"],
};

export const fieldAttributeRules: AttributeRuleSet = {
  direction: {
    label: "Direction",
    type: "enum",
    options: ["horizontal", "vertical"],
  },
  columns: {
    label: "Columns",
    type: "enum",
    options: ["thirds", "half"],
  },
};

export const controlAttributeRules: Record<string, AttributeRuleSet> = {
  "fig-button": {
    variant: {
      label: "Variant",
      type: "enum",
      options: ["", "secondary", "ghost", "link", "input"],
    },
    type: {
      label: "Type",
      type: "enum",
      options: ["button", "toggle", "submit", "select", "upload"],
    },
    size: {
      label: "Size",
      type: "enum",
      options: ["", "large", "compact"],
    },
    selected: { label: "Selected", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    icon: { label: "Icon", type: "boolean", boolMode: "presence" },
  },
  "fig-avatar": {
    image: {
      label: "Image",
      type: "boolean",
      boolMode: "presence",
      defaultChecked: true,
    },
    name: { label: "Name", type: "string" },
    size: { label: "Size", type: "enum", options: ["", "large"] },
  },
  "fig-tooltip": {
    text: { label: "Text", type: "string" },
    action: { label: "Action", type: "enum", options: ["hover", "click"] },
    delay: { label: "Delay", type: "number", min: 0, max: 5000, step: 50 },
  },
  "fig-dialog": {
    modal: { label: "Modal", type: "boolean", boolMode: "presence" },
    drag: { label: "Drag", type: "boolean", boolMode: "presence" },
    handle: { label: "Drag handle", type: "string" },
    "close-button": {
      label: "Close button",
      type: "boolean",
      boolMode: "presence",
      defaultChecked: true,
    },
    footer: {
      label: "Footer",
      type: "boolean",
      boolMode: "presence",
      defaultChecked: false,
    },
    position: {
      label: "Position",
      type: "enum",
      options: [
        "",
        "top left",
        "top center",
        "top right",
        "center left",
        "center center",
        "center right",
        "bottom left",
        "bottom center",
        "bottom right",
      ],
    },
  },
  "fig-popup": {
    position: {
      label: "Position",
      type: "enum",
      options: [
        "top",
        "right",
        "bottom",
        "left",
        "center",
        "top left",
        "top center",
        "top right",
        "center left",
        "center center",
        "center right",
        "bottom left",
        "bottom center",
        "bottom right",
      ],
    },
    offset: { label: "Offset", type: "string" },
    "viewport-margin": { label: "Viewport margin", type: "string" },
    theme: {
      label: "Theme",
      type: "enum",
      options: ["light", "dark", "menu"],
    },
    variant: { label: "Variant", type: "enum", options: ["", "popover"] },
  },
  "fig-fill-picker": {
    alpha: { label: "Alpha", type: "boolean", boolMode: "string" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    mode: {
      label: "Mode",
      type: "enum",
      options: ["", "solid", "gradient", "image", "video", "webcam"],
    },
  },
  "fig-chit": {
    size: { label: "Size", type: "enum", options: ["small", "large"] },
    selected: { label: "Selected", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    alpha: { label: "Alpha", type: "number", min: 0, max: 1, step: 0.05 },
  },
  "fig-checkbox": {
    checked: { label: "Checked", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    name: { label: "Name", type: "string" },
    value: { label: "Value", type: "string" },
    label: { label: "Label", type: "string" },
  },
  "fig-radio": {
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-field": {
    direction: {
      label: "Direction",
      type: "enum",
      options: ["column", "row", "horizontal"],
    },
    label: { label: "Label", type: "string" },
  },
  "fig-combo-input": {
    options: { label: "Options", type: "string" },
    placeholder: { label: "Placeholder", type: "string" },
    value: { label: "Value", type: "string" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-image": {
    upload: { label: "Upload", type: "boolean", boolMode: "presence" },
    fit: {
      label: "Fit",
      type: "enum",
      options: ["auto", "cover", "contain"],
    },
    "aspect-ratio": aspectRatioRule,
  },
  "fig-slider": {
    variant: {
      label: "Variant",
      type: "enum",
      options: ["default", "minimal", "neue"],
    },
    text: { label: "Text", type: "boolean", boolMode: "string" },
    placeholder: { label: "Placeholder", type: "string" },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "%", "px", "°"],
    },
  },
  "fig-input-fill": {
    alpha: {
      label: "Alpha",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
  },
  "fig-input-color": {
    alpha: { label: "Alpha", type: "boolean", boolMode: "string" },
  },
  "fig-dropdown": {
    experimental: {
      label: "Experimental",
      type: "boolean",
      boolMode: "custom",
      trueValue: "modern",
      falseValue: null,
    },
  },
  "fig-switch": {
    indeterminate: {
      label: "Indeterminate",
      type: "boolean",
      boolMode: "presence",
    },
  },
  "fig-segmented-control": {
    value: { label: "Value", type: "string" },
    name: { label: "Name", type: "string" },
  },
  "fig-easing-curve": {
    dropdown: { label: "Dropdown", type: "boolean", boolMode: "string" },
    "aspect-ratio": aspectRatioRule,
  },
  "fig-3d-rotate": {
    "aspect-ratio": aspectRatioRule,
    perspective: {
      label: "Perspective",
      type: "boolean",
      boolMode: "custom",
      trueValue: null,
      falseValue: "none",
      defaultChecked: true,
    },
    "perspective-distance": {
      label: "Distance",
      type: "number",
      min: 0,
      max: 1000,
      step: 1,
    },
    fields: {
      label: "Fields",
      type: "enum",
      options: [
        "",
        "rotateX,rotateY,rotateZ",
        "rotateX,rotateY",
        "rotateX,rotateZ",
        "rotateY,rotateZ",
        "rotateX",
        "rotateY",
        "rotateZ",
      ],
    },
  },
  "fig-origin-grid": {
    "aspect-ratio": aspectRatioRule,
    drag: { label: "Drag", type: "boolean", boolMode: "string" },
    fields: { label: "Fields", type: "boolean", boolMode: "string" },
  },
  "fig-input-angle": {
    text: { label: "Text", type: "boolean", boolMode: "string" },
  },
  "fig-joystick": {
    "aspect-ratio": aspectRatioRule,
    "axis-labels": { label: "Axis Labels", type: "string" },
    fields: { label: "Fields", type: "boolean", boolMode: "string" },
  },
  "fig-input-text": {
    type: {
      label: "Type",
      type: "enum",
      options: ["text", "number", "email", "password", "search", "url"],
    },
    multiline: { label: "Multiline", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    readonly: { label: "Readonly", type: "boolean", boolMode: "presence" },
  },
  "fig-input-number": {
    min: { label: "Min", type: "number", min: -1000, max: 1000, step: 1 },
    max: { label: "Max", type: "number", min: -1000, max: 1000, step: 1 },
    step: { label: "Step", type: "number", min: 0.001, max: 100, step: 0.001 },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "%", "px", "°"],
    },
    steppers: { label: "Steppers", type: "boolean", boolMode: "string" },
  },
  "fig-toast": {
    duration: {
      label: "Duration",
      type: "number",
      min: 0,
      max: 10000,
      step: 100,
    },
    offset: { label: "Offset", type: "number", min: 0, max: 200, step: 1 },
    theme: {
      label: "Theme",
      type: "enum",
      options: ["dark", "light", "danger", "brand"],
    },
  },
  "fig-spinner": {},
  "fig-shimmer": {
    duration: {
      label: "Duration",
      type: "number",
      min: 0.2,
      max: 8,
      step: 0.1,
    },
    direction: {
      label: "Direction",
      type: "enum",
      options: ["", "vertical", "diagonal"],
    },
    playing: {
      label: "Playing",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
  },
  "fig-layer": {
    open: { label: "Open", type: "boolean", boolMode: "presence" },
    visible: { label: "Visible", type: "boolean", boolMode: "string" },
  },
  "fig-tabs": {
    value: { label: "Value", type: "string" },
    name: { label: "Name", type: "string" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-header": {},
};

export function getRuleSetForTarget(
  target: AttributeTarget,
  controlTag: string,
): AttributeRuleSet {
  if (target === "field") return fieldAttributeRules;
  return controlAttributeRules[controlTag] ?? {};
}
