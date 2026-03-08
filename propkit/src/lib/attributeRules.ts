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
  trueValue?: string;
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
};

export const controlAttributeRules: Record<string, AttributeRuleSet> = {
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
    checked: { label: "Checked", type: "boolean", boolMode: "presence" },
  },
  "fig-segmented-control": {},
  "fig-easing-curve": {
    dropdown: { label: "Dropdown", type: "boolean", boolMode: "string" },
    "aspect-ratio": aspectRatioRule,
  },
  "fig-3d-rotate": {
    "aspect-ratio": aspectRatioRule,
    fields: {
      label: "Fields",
      type: "enum",
      options: [
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
  "fig-input-angle": {
    text: { label: "Text", type: "boolean", boolMode: "string" },
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
};

export function getRuleSetForTarget(
  target: AttributeTarget,
  controlTag: string,
): AttributeRuleSet {
  if (target === "field") return fieldAttributeRules;
  return controlAttributeRules[controlTag] ?? {};
}
