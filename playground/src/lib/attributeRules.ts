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
  label: "Aspect ratio",
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
      options: ["", "secondary", "ghost", "link", "input", "overlay"],
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
    action: { label: "Action", type: "enum", options: ["hover", "click", "manual"] },
    show: { label: "Show", type: "boolean", boolMode: "custom", trueValue: "true", falseValue: null },
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
    alpha: {
      label: "Alpha",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    mode: {
      label: "Mode",
      type: "enum",
      options: ["", "solid", "gradient", "image", "video", "webcam"],
    },
  },
  "fig-color-tip": {
    control: {
      label: "Control",
      type: "enum",
      options: ["color", "add", "remove"],
    },
    value: { label: "Value", type: "string" },
    selected: { label: "Selected", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-chit": {
    size: { label: "Size", type: "enum", options: ["small", "medium", "large"] },
    selected: { label: "Selected", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    alpha: { label: "Alpha", type: "number", min: 0, max: 1, step: 0.05 },
  },
  "fig-checkbox": {
    label: { label: "Label", type: "enum", options: ["none", "label"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-radio": {
    label: { label: "Label", type: "enum", options: ["none", "label"] },
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
    "aspect-ratio": aspectRatioRule,
    fit: {
      label: "Fit",
      type: "enum",
      options: ["auto", "cover", "contain"],
    },
    upload: { label: "Upload", type: "boolean", boolMode: "presence" },
    checkerboard: { label: "Checker", type: "boolean", boolMode: "string" },
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
  "fig-field-slider": {
    type: {
      label: "Type",
      type: "enum",
      options: ["range", "hue", "delta", "stepper", "opacity"],
    },
    label: { label: "Label", type: "string" },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "%", "px", "°"],
    },
    steppers: { label: "Steppers", type: "boolean", boolMode: "string" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-input-fill": {
    alpha: {
      label: "Alpha",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-input-palette": {
    add: { label: "Add", type: "boolean", boolMode: "string", defaultChecked: true },
    expanded: { label: "Expanded", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-input-gradient": {
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-input-color": {
    picker: {
      label: "Picker",
      type: "enum",
      options: ["native", "figma"],
    },
    alpha: { label: "Alpha", type: "boolean", boolMode: "string" },
    text: { label: "Text", type: "boolean", boolMode: "string" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
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
    animated: { label: "Animated", type: "boolean", boolMode: "presence" },
    sizing: {
      label: "Sizing",
      type: "enum",
      options: ["equal", "auto"],
    },
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
      options: ["", "rotateX,rotateY,rotateZ", "rotateX,rotateY"],
    },
  },
  "fig-origin-grid": {
    "aspect-ratio": aspectRatioRule,
    drag: { label: "Drag", type: "boolean", boolMode: "string" },
    fields: { label: "Fields", type: "boolean", boolMode: "string" },
  },
  "fig-input-angle": {
    text: { label: "Text", type: "boolean", boolMode: "string" },
    dial: {
      label: "Dial",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    rotations: {
      label: "Rotations",
      type: "boolean",
      boolMode: "presence",
    },
  },
  "fig-joystick": {
    "aspect-ratio": aspectRatioRule,
    "axis-labels": { label: "Axis labels", type: "string" },
    fields: { label: "Fields", type: "boolean", boolMode: "string" },
  },
  "fig-input-text": {
    type: {
      label: "Type",
      type: "enum",
      options: ["text", "email", "password", "search", "url"],
    },
    multiline: { label: "Multiline", type: "boolean", boolMode: "presence" },
    autoresize: { label: "Auto resize", type: "boolean", boolMode: "presence" },
    resizable: { label: "Resizable", type: "boolean", boolMode: "presence" },
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
      options: ["auto", "dark", "light", "danger", "brand", "success"],
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
  "fig-skeleton": {
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
  "fig-tabs": {},
  "fig-header": {
    borderless: { label: "Borderless", type: "boolean", boolMode: "presence" },
  },
  "fig-handle": {
    control: {
      label: "Control",
      type: "enum",
      options: ["", "add", "remove"],
    },
    size: {
      label: "Size",
      type: "enum",
      options: ["", "small"],
    },
    color: { label: "Color", type: "boolean", boolMode: "presence" },
    selected: { label: "Selected", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    drag: { label: "Drag", type: "boolean", boolMode: "presence" },
    "drag-axes": { label: "Axes", type: "enum", options: ["x,y", "x", "y"] },
    "drag-snapping": {
      label: "Snapping",
      type: "enum",
      options: ["false", "modifier", "true"],
    },
  },
  "fig-chooser": {
    layout: {
      label: "Layout",
      type: "enum",
      options: ["vertical", "horizontal", "grid"],
    },
    drag: {
      label: "Drag",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    loop: {
      label: "Loop",
      type: "boolean",
      boolMode: "presence",
    },
    padding: {
      label: "Padding",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
  },
  "fig-canvas-point": {
    type: {
      label: "Type",
      type: "enum",
      options: ["point", "color", "point-radius", "point-radius-angle"],
    },
    name: { label: "Name", type: "string" },
    tooltips: {
      label: "Tooltips",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    snapping: {
      label: "Snapping",
      type: "enum",
      options: ["false", "modifier", "true"],
    },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
};

export function getRuleSetForTarget(
  target: AttributeTarget,
  controlTag: string,
): AttributeRuleSet {
  if (target === "field") return fieldAttributeRules;
  return controlAttributeRules[controlTag] ?? {};
}
