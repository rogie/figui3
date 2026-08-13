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
  units?: string;
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
      options: [
        "",
        "secondary",
        "destructive",
        "destructiveSecondary",
        "destructiveGhost",
        "destructiveLink",
        "ghost",
        "link",
        "input",
        "overlay",
      ],
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
    pointer: {
      label: "Pointer",
      type: "boolean",
      boolMode: "custom",
      trueValue: null,
      falseValue: "false",
      defaultChecked: true,
    },
    show: { label: "Show", type: "boolean", boolMode: "custom", trueValue: "true", falseValue: null },
    delay: { label: "Delay", type: "number", min: 0, max: 5000, step: 50 },
    theme: {
      label: "Theme",
      type: "enum",
      options: ["", "dark", "light", "brand"],
    },
  },
  "fig-dialog": {
    modal: { label: "Modal", type: "boolean", boolMode: "presence" },
    drag: { label: "Drag", type: "boolean", boolMode: "presence" },
    resizable: { label: "Resizable", type: "boolean", boolMode: "presence" },
    autoresize: { label: "Auto resize", type: "boolean", boolMode: "presence" },
    handle: { label: "Drag handle", type: "string" },
    footer: {
      label: "Footer",
      type: "boolean",
      boolMode: "presence",
      defaultChecked: false,
    },
    closedby: {
      label: "Closed by",
      type: "enum",
      options: ["any", "closerequest", "none"],
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
    variant: {
      label: "Variant",
      type: "enum",
      options: ["", "popover", "tooltip"],
    },
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
  "fig-swatch": {
    size: { label: "Size", type: "enum", options: ["small", "medium", "large"] },
    selected: { label: "Selected", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    alpha: { label: "Alpha", type: "number", min: 0, max: 1, step: 0.05 },
  },
  "fig-checkbox": {
    label: { label: "Label", type: "enum", options: ["none", "label"] },
    checked: { label: "Checked", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-radio": {
    label: { label: "Label", type: "enum", options: ["none", "label"] },
    checked: { label: "Checked", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-field": {
    direction: {
      label: "Direction",
      type: "enum",
      options: ["horizontal", "vertical"],
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
    caption: { label: "Caption", type: "string" },
    "aspect-ratio": aspectRatioRule,
    fit: {
      label: "Fit",
      type: "enum",
      options: ["contain", "cover", "fill", "none", "scale-down"],
    },
    upload: {
      label: "Upload",
      type: "boolean",
      boolMode: "presence",
      defaultChecked: false,
    },
    "loading-indicator": {
      label: "Loading indicator",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    checkerboard: { label: "Checkered", type: "boolean", boolMode: "string" },
  },
  "fig-card": {
    src: { label: "Src", type: "string" },
    label: { label: "Label", type: "string" },
    sublabel: { label: "Sublabel", type: "string" },
    selected: { label: "Selected", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    full: { label: "Full", type: "boolean", boolMode: "presence" },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    "aspect-ratio": aspectRatioRule,
    fit: {
      label: "Fit",
      type: "enum",
      options: ["contain", "cover", "fill", "none", "scale-down"],
    },
    "label-line-clamp": {
      label: "Label lines",
      type: "enum",
      options: ["1", "2"],
    },
  },
  "fig-media": {
    caption: { label: "Caption", type: "string" },
    "aspect-ratio": aspectRatioRule,
    fit: {
      label: "Fit",
      type: "enum",
      options: ["contain", "cover", "fill", "none", "scale-down"],
    },
    upload: {
      label: "Upload",
      type: "boolean",
      boolMode: "presence",
      defaultChecked: false,
    },
    "loading-indicator": {
      label: "Loading indicator",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    checkerboard: { label: "Checkered", type: "boolean", boolMode: "string" },
    controls: {
      label: "Controls",
      type: "boolean",
      boolMode: "string",
      defaultChecked: false,
    },
    autoplay: { label: "Autoplay", type: "boolean", boolMode: "string" },
    loop: { label: "Loop", type: "boolean", boolMode: "string" },
    muted: { label: "Muted", type: "boolean", boolMode: "string" },
    poster: { label: "Poster", type: "string" },
  },
  "fig-video": {
    caption: { label: "Caption", type: "string" },
    "aspect-ratio": aspectRatioRule,
    fit: {
      label: "Fit",
      type: "enum",
      options: ["contain", "cover", "fill", "none", "scale-down"],
    },
    upload: {
      label: "Upload",
      type: "boolean",
      boolMode: "presence",
      defaultChecked: false,
    },
    checkerboard: { label: "Checkered", type: "boolean", boolMode: "string" },
    controls: {
      label: "Controls",
      type: "boolean",
      boolMode: "string",
      defaultChecked: false,
    },
    autoplay: { label: "Autoplay", type: "boolean", boolMode: "string" },
    loop: { label: "Loop", type: "boolean", boolMode: "string" },
    muted: { label: "Muted", type: "boolean", boolMode: "string" },
    poster: { label: "Poster", type: "string" },
  },
  "fig-media-controls": {
    playing: { label: "Playing", type: "boolean", boolMode: "presence" },
    overlay: { label: "Overlay", type: "boolean", boolMode: "presence" },
    duration: { label: "Duration", type: "number", min: 0, max: 600, step: 1 },
    time: { label: "Time", type: "number", min: 0, max: 600, step: 1 },
  },
  "fig-preview": {
    "aspect-ratio": aspectRatioRule,
    fit: {
      label: "Fit",
      type: "enum",
      options: ["contain", "cover", "fill", "none", "scale-down"],
    },
    full: { label: "Full", type: "boolean", boolMode: "presence" },
    checkerboard: {
      label: "Checkered",
      type: "boolean",
      boolMode: "presence",
    },
  },
  "fig-slider": {
    variant: {
      label: "Variant",
      type: "enum",
      options: ["default", "classic"],
    },
    text: {
      label: "Text",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    placeholder: { label: "Placeholder", type: "string" },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "%", "px", "°"],
    },
  },
  "fig-reorder": {
    axis: {
      label: "Axis",
      type: "enum",
      options: ["vertical", "horizontal"],
    },
    handle: { label: "Handle", type: "string" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-select": {
    value: { label: "Value", type: "string" },
    label: { label: "Label", type: "string" },
    options: { label: "Options", type: "string" },
    full: { label: "Full", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    position: {
      label: "Position",
      type: "enum",
      options: [
        "bottom left",
        "bottom right",
        "top left",
        "top right",
        "bottom center",
        "top center",
      ],
    },
  },
  "propskit-switch": {
    label: { label: "Label", type: "string" },
    checked: { label: "Checked", type: "boolean", boolMode: "presence" },
    default: { label: "Default", type: "boolean", boolMode: "string" },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-color": {
    label: { label: "Label", type: "string" },
    default: { label: "Default", type: "string" },
    alpha: {
      label: "Alpha",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-color-point": {
    label: { label: "Label", type: "string" },
    value: { label: "Value", type: "string" },
    collapsible: {
      label: "Collapsible",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    open: {
      label: "Open",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-gradient": {
    label: { label: "Label", type: "string" },
    default: { label: "Default", type: "string" },
    edit: { label: "Edit", type: "enum", options: ["true", "false", "picker"] },
    mode: { label: "Mode", type: "enum", options: ["handle", "tip"] },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-select": {
    label: { label: "Label", type: "string" },
    value: { label: "Value", type: "string" },
    default: { label: "Default", type: "string" },
    options: { label: "Options", type: "string" },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-text": {
    label: { label: "Label", type: "string" },
    default: { label: "Default", type: "string" },
    type: {
      label: "Type",
      type: "enum",
      options: ["text", "email", "password", "search", "url"],
    },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    readonly: { label: "Readonly", type: "boolean", boolMode: "presence" },
  },
  "propskit-number": {
    label: { label: "Label", type: "string" },
    default: { label: "Default", type: "number", min: -1000, max: 1000, step: 1 },
    min: { label: "Min", type: "number", min: -1000, max: 1000, step: 1 },
    max: { label: "Max", type: "number", min: -1000, max: 1000, step: 1 },
    step: { label: "Step", type: "number", min: 0.001, max: 100, step: 0.001 },
    precision: {
      label: "Precision",
      type: "number",
      min: 0,
      max: 10,
      step: 1,
    },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "%", "px", "°"],
    },
    steppers: { label: "Steppers", type: "boolean", boolMode: "string" },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-position": {
    label: { label: "Label", type: "string" },
    x: { label: "X", type: "number", min: 0, max: 100, step: 1 },
    y: { label: "Y", type: "number", min: 0, max: 100, step: 1 },
    default: { label: "Default", type: "string" },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "percent"],
    },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-point-radius": {
    label: { label: "Label", type: "string" },
    value: { label: "Value", type: "string" },
    collapsible: {
      label: "Collapsible",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    open: {
      label: "Open",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "percent"],
    },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-group": {
    name: { label: "Name", type: "string" },
    open: { label: "Open", type: "boolean", boolMode: "string" },
    "show-reset": {
      label: "Show reset",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-point-radius-angle": {
    label: { label: "Label", type: "string" },
    value: { label: "Value", type: "string" },
    collapsible: {
      label: "Collapsible",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    open: {
      label: "Open",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "percent"],
    },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-point-point": {
    label: { label: "Label", type: "string" },
    value: { label: "Value", type: "string" },
    collapsible: {
      label: "Collapsible",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    open: {
      label: "Open",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "percent"],
    },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "propskit-slider": {
    type: {
      label: "Type",
      type: "enum",
      options: ["range", "hue", "delta", "stepper", "opacity"],
    },
    color: { label: "Color", type: "string" },
    label: { label: "Label", type: "string" },
    default: { label: "Default", type: "number", min: -1000, max: 1000, step: 1 },
    units: {
      label: "Units",
      type: "enum",
      options: ["", "%", "px", "°"],
    },
    elastic: {
      label: "Elastic",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    size: { label: "Size", type: "enum", options: ["", "large"] },
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
    fixed: { label: "Fixed", type: "boolean", boolMode: "presence" },
    open: { label: "Open", type: "boolean", boolMode: "presence" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-input-gradient": {
    edit: { label: "Edit", type: "enum", options: ["true", "false", "picker"] },
    mode: { label: "Mode", type: "enum", options: ["handle", "tip"] },
    size: { label: "Size", type: "enum", options: ["", "large"] },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  // Gradient/interpolation controls are custom-rendered in AttributesView.
  "fig-interpolation-swatch": {
    size: { label: "Size", type: "enum", options: ["small", "large"] },
  },
  "fig-input-color": {
    alpha: {
      label: "Alpha",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    text: { label: "Text", type: "boolean", boolMode: "string" },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-switch": {
    checked: {
      label: "Checked",
      type: "boolean",
      boolMode: "presence",
    },
    indeterminate: {
      label: "Indeterminate",
      type: "boolean",
      boolMode: "presence",
    },
    disabled: {
      label: "Disabled",
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
  "fig-options": {
    options: { label: "Options", type: "string" },
    value: { label: "Value", type: "string" },
    sizing: {
      label: "Sizing",
      type: "enum",
      options: ["equal", "auto"],
    },
    disabled: { label: "Disabled", type: "boolean" },
    full: { label: "Full width", type: "boolean" },
  },
  "fig-easing-curve": {
    edit: {
      label: "Edit",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
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
  "propskit-oscillator": {
    value: { label: "Value", type: "string" },
    default: { label: "Default", type: "string" },
    edit: {
      label: "Edit",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    "aspect-ratio": aspectRatioRule,
    precision: {
      label: "Precision",
      type: "number",
      min: 0,
      max: 4,
      step: 1,
    },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
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
    "units-disallow": {
      label: "Units disallow",
      type: "string",
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
  "fig-icon": {
    name: {
      label: "Name",
      type: "enum",
      options: [
        "add",
        "send",
        "adjust",
        "minus",
        "close",
        "back",
        "forward",
        "chevron",
        "checkmark",
        "reset",
        "arrow-left",
        "rotate",
        "swap",
        "play",
        "pause",
        "search",
        "download",
        "upload",
        "sun",
        "moon",
        "visible",
        "hidden",
        "edit",
        "settings",
        "more",
        "eyedropper",
        "steppers",
        "globe",
      ],
    },
    size: {
      label: "Size",
      type: "enum",
      options: ["medium", "small"],
    },
    color: {
      label: "Color",
      type: "enum",
      options: [
        "var(--figma-color-icon)",
        "var(--figma-color-icon-secondary)",
        "var(--figma-color-icon-tertiary)",
        "var(--figma-color-icon-disabled)",
        "var(--figma-color-icon-brand)",
      ],
    },
  },
  "fig-spinner": {
    size: { label: "Size", type: "enum", options: ["default", "small"] },
  },
  "fig-shimmer": {
    duration: {
      label: "Duration",
      type: "number",
      min: 0.2,
      max: 8,
      step: 0.1,
      units: "s",
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
      units: "s",
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
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-header": {
    borderless: { label: "Borderless", type: "boolean", boolMode: "presence" },
    compact: { label: "Compact", type: "boolean", boolMode: "string" },
  },
  "fig-footer": {
    borderless: { label: "Borderless", type: "boolean", boolMode: "presence" },
    sticky: { label: "Sticky", type: "boolean", boolMode: "presence" },
  },
  "fig-group": {
    name: { label: "Name", type: "string" },
    collapsible: { label: "Collapsible", type: "boolean", boolMode: "presence" },
    open: { label: "Open", type: "boolean", boolMode: "presence" },
    compact: { label: "Compact", type: "boolean", boolMode: "string" },
  },
  "fig-handle": {
    type: {
      label: "Type",
      type: "enum",
      options: ["default", "color", "canvas"],
    },
    tip: {
      label: "Tip",
      type: "enum",
      options: ["", "color", "add", "remove"],
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
    columns: {
      label: "Columns",
      type: "number",
      min: 2,
      max: 4,
      step: 1,
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
  },
  progress: {
    value: { label: "Value", type: "number", min: 0, max: 100, step: 1 },
    max: { label: "Max", type: "number", min: 1, max: 100, step: 1 },
  },
  "fig-canvas-control": {
    type: {
      label: "Type",
      type: "enum",
      options: ["point", "color", "point-radius", "point-radius-angle", "point-point"],
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
  "fig-separator": {
    label: { label: "Label", type: "string" },
    borderless: {
      label: "Borderless",
      type: "boolean",
      boolMode: "presence",
    },
  },
  "fig-menu-separator": {
    label: { label: "Label", type: "string" },
    borderless: {
      label: "Borderless",
      type: "boolean",
      boolMode: "presence",
    },
  },
  "fig-attachment": {
    src: { label: "Source", type: "string" },
    name: { label: "Name", type: "string" },
    value: { label: "Value", type: "string" },
    removable: {
      label: "Removable",
      type: "boolean",
      boolMode: "string",
      defaultChecked: true,
    },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
  },
  "fig-chat-message": {
    from: { label: "From", type: "enum", options: ["agent", "user"] },
  },
  "fig-menu": {
    position: {
      label: "Position",
      type: "enum",
      options: [
        "top",
        "right",
        "bottom",
        "left",
        "top left",
        "top right",
        "bottom left",
        "bottom right",
      ],
    },
    offset: { label: "Offset", type: "string" },
    closedby: {
      label: "Closed by",
      type: "enum",
      options: ["auto", "any", "none"],
    },
    disabled: { label: "Disabled", type: "boolean", boolMode: "presence" },
    open: { label: "Open", type: "boolean", boolMode: "presence" },
  },
  "fig-truncate": {
    position: { label: "Position", type: "enum", options: ["right", "left", "middle"] },
    tail: { label: "Tail", type: "string" },
    tooltip: { label: "Tooltip", type: "boolean", boolMode: "presence" },
  },
  "fig-input-file": {
    variant: {
      label: "Variant",
      type: "enum",
      options: ["input", "primary", "secondary", "ghost", "link", "overlay"],
    },
    accepts: { label: "Accepts", type: "string" },
    multiple: { label: "Multiple", type: "boolean", boolMode: "presence" },
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
