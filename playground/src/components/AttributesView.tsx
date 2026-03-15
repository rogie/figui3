import { useMemo, useCallback, useEffect, useRef } from "react";
import {
  applyAttributeMutation,
  applyButtonIconMutation,
  applyButtonTypeMutation,
  applyDialogCloseButtonMutation,
  applyDialogFooterMutation,
  applyFieldControlMutation,
  applyFieldLabelMutation,
  applyChooserContentMutation,
  applyChooserMaxSizeMutation,
  applyHeaderIconMutation,
  applyPrependSlotMutation,
  getChooserContentMode,
  getHeaderIconEnabled,
  getPrependSlotMode,
  parseAttributeTargets,
  type ChooserContentMode,
  type PrependSlotMode,
} from "../lib/attributeParser";
import {
  getRuleSetForTarget,
  type AttributeRule,
  type BoolMode,
} from "../lib/attributeRules";

interface Props {
  markup: string;
  onMarkupChange: (markup: string) => void;
  showFieldControls?: boolean;
  includeFullControl?: boolean;
}

interface RuleEntry {
  name: string;
  value: string | undefined;
  rule: AttributeRule;
}

type FieldInputTag =
  | "fig-checkbox"
  | "fig-dropdown"
  | "fig-image"
  | "fig-input-color"
  | "fig-input-fill"
  | "fig-input-number"
  | "fig-input-text"
  | "fig-segmented-control"
  | "fig-slider"
  | "fig-switch";

const FIELD_INPUT_OPTIONS: Array<{ tag: FieldInputTag; label: string }> = [
  { tag: "fig-checkbox", label: "Checkbox" },
  { tag: "fig-input-color", label: "Color" },
  { tag: "fig-dropdown", label: "Dropdown" },
  { tag: "fig-input-fill", label: "Fill" },
  { tag: "fig-image", label: "Image" },
  { tag: "fig-input-number", label: "Number" },
  { tag: "fig-segmented-control", label: "Segmented control" },
  { tag: "fig-slider", label: "Slider" },
  { tag: "fig-switch", label: "Switch" },
  { tag: "fig-input-text", label: "Text" },
];

function resolveFieldInputTag(value: string): FieldInputTag | undefined {
  const normalized = value.trim().toLowerCase();
  const byTag = FIELD_INPUT_OPTIONS.find((option) => option.tag === normalized);
  if (byTag) return byTag.tag;
  const byLabel = FIELD_INPUT_OPTIONS.find(
    (option) => option.label.toLowerCase() === normalized,
  );
  return byLabel?.tag;
}

function createRandomAvatarUrl(): string {
  const id = Math.floor(Math.random() * 70) + 1;
  return `https://i.pravatar.cc/128?img=${id}`;
}

function readBooleanValue(
  value: string | undefined,
  mode: BoolMode,
  defaultChecked = false,
): boolean {
  if (value === undefined) return defaultChecked;
  if (mode === "presence") return value !== undefined;
  if (mode === "custom") return value !== undefined;
  return value?.toLowerCase() === "true";
}

function toNumberValue(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toTitle(text: string): string {
  if (!text) return "Field";
  return text;
}

function toSentenceCaseLabel(value: string): string {
  if (!value) return value;
  const withSpaces = value.replace(/[-_]+/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function toFieldsLabel(value: string): string {
  return value
    .split(",")
    .map((part) => part.trim().replace(/^rotate/i, "").toUpperCase())
    .join(", ");
}

function resolveEnumOption(options: string[], rawValue: string): string {
  if (options.includes(rawValue)) return rawValue;
  const normalized = rawValue.trim().toLowerCase();
  const directMatch = options.find((option) => option.toLowerCase() === normalized);
  if (directMatch !== undefined) return directMatch;
  const labelMatch = options.find(
    (option) => toSentenceCaseLabel(option).toLowerCase() === normalized,
  );
  return labelMatch ?? rawValue;
}

function sentenceCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getInputPanelTitle(controlTag: string): string {
  const titles: Record<string, string> = {
    "fig-button": "Button",
    "fig-avatar": "Avatar",
    "fig-tooltip": "Tooltip",
    "fig-dialog": "Dialog",
    "fig-popup": "Popup",
    "fig-fill-picker": "Fill picker",
    "fig-checkbox": "Checkbox",
    "fig-chit": "Chit",
    "fig-radio": "Radio",
    "fig-field": "Field",
    "fig-combo-input": "Combo input",
    "fig-image": "Image",
    "fig-input-color": "Color",
    "fig-input-fill": "Fill",
    "fig-slider": "Slider",
    "fig-input-number": "Number",
    "fig-input-text": "Text input",
    "fig-switch": "Switch",
    "fig-dropdown": "Dropdown",
    "fig-segmented-control": "Segmented control",
    "fig-easing-curve": "Easing curve",
    "fig-3d-rotate": "3D rotate",
    "fig-origin-grid": "Origin grid",
    "fig-input-angle": "Angle input",
    "fig-joystick": "Joystick",
    "fig-toast": "Toast",
    "fig-spinner": "Spinner",
    "fig-shimmer": "Shimmer",
    "fig-layer": "Layer",
    "fig-header": "Header",
    "fig-tabs": "Tabs",
    "fig-chooser": "Chooser",
  };
  return titles[controlTag] ?? sentenceCase(toTitle(controlTag.replace(/^fig-/, "")));
}

function getNumberAttrDefault(
  controlTag: string,
  attrName: string,
): number | undefined {
  if (controlTag === "fig-tooltip" && attrName === "delay") return 500;
  if (controlTag === "fig-input-number") {
    if (attrName === "min") return 0;
    if (attrName === "max") return 100;
    if (attrName === "step") return 0.5;
  }
  return undefined;
}

export default function AttributesView({
  markup,
  onMarkupChange,
  showFieldControls = true,
  includeFullControl = false,
}: Props) {
  const targets = useMemo(() => parseAttributeTargets(markup), [markup]);
  const labelMemoryRef = useRef<Record<number, string>>({});

  const applyChange = useCallback(
    (
      fieldIndex: number,
      target: "field" | "control",
      name: string,
      value: string | null,
    ) => {
      onMarkupChange(
        applyAttributeMutation(markup, {
          fieldIndex,
          target,
          name,
          value,
        }),
      );
    },
    [markup, onMarkupChange],
  );

  const applyLabelChange = useCallback(
    (fieldIndex: number, enabled: boolean, text?: string) => {
      onMarkupChange(
        applyFieldLabelMutation(markup, {
          fieldIndex,
          enabled,
          text,
        }),
      );
    },
    [markup, onMarkupChange],
  );

  const applyFieldInputChange = useCallback(
    (fieldIndex: number, controlTag: FieldInputTag) => {
      onMarkupChange(
        applyFieldControlMutation(markup, {
          fieldIndex,
          controlTag,
        }),
      );
    },
    [markup, onMarkupChange],
  );

  useEffect(() => {
    targets.forEach((target) => {
      if (target.hasLabel && target.label.trim()) {
        labelMemoryRef.current[target.fieldIndex] = target.label.trim();
      }
    });
  }, [targets]);

  if (!targets.length) return null;

  return (
    <>
      {targets.map((target) => {
          const fieldRules = getRuleSetForTarget("field", target.controlTag);
          const controlRules = getRuleSetForTarget("control", target.controlTag);
          const fullSupportedTags = new Set([
            "fig-button",
            "fig-checkbox",
            "fig-image",
            "fig-dropdown",
            "fig-slider",
            "fig-input-text",
            "fig-input-number",
            "fig-input-color",
            "fig-input-fill",
            "fig-segmented-control",
            "fig-easing-curve",
            "fig-3d-rotate",
            "fig-origin-grid",
            "fig-input-angle",
            "fig-combo-input",
            "fig-joystick",
            "fig-radio",
            "fig-input-angle",
            "fig-chooser",
          ]);
          const mergedControlRules = { ...controlRules };
          if (
            includeFullControl &&
            fullSupportedTags.has(target.controlTag) &&
            !("full" in mergedControlRules)
          ) {
            mergedControlRules.full = {
              label: "Full",
              type: "boolean",
              boolMode: "presence",
            };
          }

          const fieldDirection = (
            target.fieldAttributes.direction ?? "horizontal"
          ).toLowerCase();
          const fieldEntries: RuleEntry[] = Object.entries(fieldRules)
            .filter(
              ([name]) =>
                !(
                  (name === "direction" && !target.hasLabel) ||
                  (name === "columns" &&
                    (fieldDirection === "vertical" || !target.hasLabel))
                ),
            )
            .map(([name, rule]) => ({
              name,
              value: target.fieldAttributes[name],
              rule,
            }));
          const suppressControlAttributes =
            target.fieldAttributes["data-playground-field-only-controls"] === "true";
          const showFieldInputSelector =
            includeFullControl && suppressControlAttributes;
          const currentFieldInputTag = FIELD_INPUT_OPTIONS.some(
            (option) => option.tag === target.controlTag,
          )
            ? (target.controlTag as FieldInputTag)
            : "fig-slider";
          const hiddenControlAttrs = new Set(
            (target.controlAttributes["data-playground-hide-attrs"] ?? "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          );
          if (target.controlTag === "fig-segmented-control") {
            hiddenControlAttrs.add("value");
            hiddenControlAttrs.add("name");
          }

          const controlEntries: RuleEntry[] = suppressControlAttributes
            ? []
            : Object.entries(mergedControlRules).map(([name, rule]) => ({
                name,
                value:
                  name === "perspective-distance"
                    ? target.controlAttributes.perspective
                    : target.controlAttributes[name],
                rule,
              }));
          const sliderTextEnabled =
            target.controlTag === "fig-slider" &&
            (target.controlAttributes.text ?? "").toLowerCase() === "true";
          const dialogDragEnabled =
            target.controlTag === "fig-dialog" &&
            target.controlAttributes.drag !== undefined &&
            target.controlAttributes.drag.toLowerCase() !== "false";
          const perspectiveEnabled =
            target.controlTag === "fig-3d-rotate" &&
            (target.controlAttributes.perspective ?? "") !== "none";
          const textInputMultiline =
            target.controlTag === "fig-input-text" &&
            target.controlAttributes.multiline !== undefined;
          const visibleControlEntries = controlEntries.filter(
            (entry) =>
              !hiddenControlAttrs.has(entry.name) &&
              !(
                entry.name === "placeholder" &&
                target.controlTag === "fig-slider" &&
                !sliderTextEnabled
              ) &&
              !(
                entry.name === "units" &&
                target.controlTag === "fig-slider" &&
                !sliderTextEnabled
              ) &&
              !(
                entry.name === "handle" &&
                target.controlTag === "fig-dialog" &&
                !dialogDragEnabled
              ) &&
              !(
                entry.name === "perspective-distance" &&
                target.controlTag === "fig-3d-rotate" &&
                !perspectiveEnabled
              ) &&
              !(
                entry.name === "multiline" &&
                target.controlTag === "fig-input-text"
              ) &&
              !(
                (entry.name === "autoresize" ||
                  entry.name === "resizable") &&
                target.controlTag === "fig-input-text" &&
                !textInputMultiline
              ) &&
              !(
                entry.name === "type" &&
                target.controlTag === "fig-input-text" &&
                textInputMultiline
              ),
          );

          const renderControl = (
            entry: RuleEntry,
            scope: "field" | "control",
          ) => {
            const { name, rule, value } = entry;

            if (rule.type === "boolean") {
              const mode = rule.boolMode ?? "presence";
              const checked =
                target.controlTag === "fig-avatar" && name === "image"
                  ? Boolean(target.controlAttributes.src?.trim())
                  : target.controlTag === "fig-dialog" && name === "close-button"
                    ? markup.includes("<fig-tooltip text=\"Close\">")
                    : target.controlTag === "fig-dialog" && name === "footer"
                      ? markup.includes("<footer>")
                  : target.controlTag === "fig-3d-rotate" && name === "perspective"
                    ? (value ?? "") !== "none"
                  : readBooleanValue(value, mode, rule.defaultChecked ?? false);
              return (
                <fig-switch
                  checked={checked ? "true" : undefined}
                  onInput={(e: any) => {
                    const customEvent = e as CustomEvent<{ checked?: boolean }>;
                    const host = e.currentTarget as HTMLElement & {
                      checked?: boolean;
                    };
                    const next =
                      typeof customEvent.detail?.checked === "boolean"
                        ? customEvent.detail.checked
                        : Boolean(host.checked ?? host.hasAttribute("checked"));

                    if (
                      target.controlTag === "fig-avatar" &&
                      scope === "control" &&
                      name === "image"
                    ) {
                      applyChange(
                        target.fieldIndex,
                        "control",
                        "src",
                        next ? createRandomAvatarUrl() : null,
                      );
                      return;
                    }

                    if (
                      target.controlTag === "fig-dialog" &&
                      scope === "control" &&
                      name === "close-button"
                    ) {
                      onMarkupChange(
                        applyDialogCloseButtonMutation(markup, target.fieldIndex, next),
                      );
                      return;
                    }
                    if (
                      target.controlTag === "fig-dialog" &&
                      scope === "control" &&
                      name === "footer"
                    ) {
                      onMarkupChange(
                        applyDialogFooterMutation(markup, target.fieldIndex, next),
                      );
                      return;
                    }

                    if (
                      target.controlTag === "fig-button" &&
                      scope === "control" &&
                      name === "icon"
                    ) {
                      onMarkupChange(applyButtonIconMutation(markup, target.fieldIndex, next));
                      return;
                    }

                    if (
                      target.controlTag === "fig-switch" &&
                      scope === "control" &&
                      name === "indeterminate"
                    ) {
                      if (next) {
                        let nextMarkup = applyAttributeMutation(markup, {
                          fieldIndex: target.fieldIndex,
                          target: "control",
                          name: "checked",
                          value: null,
                        });
                        nextMarkup = applyAttributeMutation(nextMarkup, {
                          fieldIndex: target.fieldIndex,
                          target: "control",
                          name: "indeterminate",
                          value: "",
                        });
                        onMarkupChange(nextMarkup);
                        return;
                      }
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }

                    if (mode === "presence") {
                      applyChange(
                        target.fieldIndex,
                        scope,
                        name,
                        next ? "" : null,
                      );
                    } else if (mode === "custom") {
                      applyChange(
                        target.fieldIndex,
                        scope,
                        name,
                        next ? (rule.trueValue ?? "true") : (rule.falseValue ?? null),
                      );
                    } else {
                      applyChange(
                        target.fieldIndex,
                        scope,
                        name,
                        next ? "true" : "false",
                      );
                    }
                  }}
                ></fig-switch>
              );
            }

            if (rule.type === "number") {
              const isPerspectiveDistance =
                target.controlTag === "fig-3d-rotate" && name === "perspective-distance";
              const fallback =
                isPerspectiveDistance
                  ? 500
                  : getNumberAttrDefault(target.controlTag, name) ?? rule.min ?? 0;
              const numberValue =
                target.controlTag === "fig-shimmer" && name === "duration"
                  ? toNumberValue((value ?? "").replace(/s$/i, ""), fallback)
                  : isPerspectiveDistance
                    ? toNumberValue((value ?? "").replace(/[a-z]+$/i, ""), fallback)
                    : toNumberValue(value, fallback);
              const useNumberInputControl =
                target.controlTag === "fig-input-number" &&
                (name === "min" || name === "max" || name === "step");
              if (useNumberInputControl) {
                const handleNumberInput = (e: any) => {
                  const host = e.currentTarget as HTMLElement & { value?: string };
                  const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                  if (nextValue === undefined || nextValue === null) return;
                  applyChange(target.fieldIndex, scope, name, String(nextValue));
                };
                return (
                  <fig-input-number
                    value={String(numberValue)}
                    step={name === "step" ? "0.1" : "1"}
                    steppers="true"
                    full
                    onInput={handleNumberInput}
                    onChange={handleNumberInput}
                  ></fig-input-number>
                );
              }
              return (
                <fig-slider
                  value={String(numberValue)}
                  min={String(rule.min ?? 0)}
                  max={String(rule.max ?? 100)}
                  step={String(rule.step ?? 1)}
                  units={undefined}
                  variant="neue"
                  text="true"
                  full
                  onInput={(e: any) => {
                    const host = e.currentTarget as HTMLElement & { value?: string };
                    const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                    if (nextValue === undefined || nextValue === null) return;
                    if (target.controlTag === "fig-shimmer" && name === "duration") {
                      applyChange(
                        target.fieldIndex,
                        scope,
                        name,
                        `${String(nextValue)}s`,
                      );
                      return;
                    }
                    if (isPerspectiveDistance) {
                      applyChange(
                        target.fieldIndex,
                        scope,
                        "perspective",
                        `${String(nextValue)}px`,
                      );
                      return;
                    }
                    applyChange(target.fieldIndex, scope, name, String(nextValue));
                  }}
                ></fig-slider>
              );
            }

            if (rule.type === "enum") {
              const hasImageSource = Boolean(
                target.controlTag === "fig-image" &&
                  target.controlAttributes.src?.trim(),
              );
              const options =
                name === "aspect-ratio" && target.controlTag === "fig-image"
                  ? hasImageSource
                    ? ["", ...rule.options, "auto"]
                    : ["", ...rule.options.filter((option) => option !== "auto")]
                  : rule.options;
              const isCheckRadioLabel =
                name === "label" &&
                (target.controlTag === "fig-checkbox" ||
                  target.controlTag === "fig-radio");
              const current = isCheckRadioLabel
                ? (value !== undefined && value !== null ? "label" : "none")
                : value ??
                  (name === "variant" && target.controlTag === "fig-slider"
                    ? "default"
                    : options[0] ?? "");
              const useSegmentedControl =
                (name === "direction" &&
                  options.includes("horizontal") &&
                  options.includes("vertical")) ||
                (scope === "field" &&
                  name === "columns" &&
                  options.includes("thirds") &&
                  options.includes("half")) ||
                isCheckRadioLabel;
              if (useSegmentedControl) {
                return (
                  <fig-segmented-control full>
                    {options.map((option) => (
                      <fig-segment
                        key={option}
                        value={option}
                        selected={option === current ? "true" : undefined}
                        onClick={() => {
                          if (isCheckRadioLabel) {
                            applyChange(
                              target.fieldIndex,
                              scope,
                              name,
                              option === "none" ? null : "Label",
                            );
                            return;
                          }
                          applyChange(target.fieldIndex, scope, name, option);
                        }}
                      >
                        {toSentenceCaseLabel(option)}
                      </fig-segment>
                    ))}
                  </fig-segmented-control>
                );
              }

              return (
                <fig-dropdown
                  full
                  experimental="modern"
                  value={current}
                  onChange={(e: any) => {
                    const host = e.currentTarget as HTMLElement & { value?: string };
                    const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                    if (typeof nextValue !== "string") return;
                    const resolvedValue = resolveEnumOption(options, nextValue);
                    if (
                      target.controlTag === "fig-button" &&
                      name === "type"
                    ) {
                      onMarkupChange(
                        applyButtonTypeMutation(markup, target.fieldIndex, resolvedValue),
                      );
                      return;
                    }
                    if (
                      target.controlTag === "fig-dialog" &&
                      name === "position" &&
                      resolvedValue === ""
                    ) {
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }
                    if (
                      target.controlTag === "fig-button" &&
                      name === "variant" &&
                      resolvedValue === ""
                    ) {
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }
                    if (
                      target.controlTag === "fig-button" &&
                      name === "size" &&
                      resolvedValue === ""
                    ) {
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }
                    if (
                      target.controlTag === "fig-shimmer" &&
                      name === "direction" &&
                      resolvedValue === ""
                    ) {
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }
                    if (
                      target.controlTag === "fig-image" &&
                      name === "aspect-ratio" &&
                      resolvedValue === ""
                    ) {
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }
                    if (
                      target.controlTag === "fig-image" &&
                      name === "fit" &&
                      resolvedValue === "auto"
                    ) {
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }
                    if (
                      target.controlTag === "fig-3d-rotate" &&
                      name === "fields" &&
                      resolvedValue === ""
                    ) {
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }
                    if (
                      target.controlTag === "fig-chooser" &&
                      name === "layout"
                    ) {
                      const nextIsHorizontal = resolvedValue === "horizontal";
                      const nextProp = nextIsHorizontal ? "max-width" : "max-height";
                      const nextDefault = nextIsHorizontal ? "100%" : "240px";
                      let updated = applyAttributeMutation(markup, {
                        fieldIndex: target.fieldIndex,
                        target: "control",
                        name: "layout",
                        value: resolvedValue,
                      });
                      updated = applyChooserMaxSizeMutation(updated, target.fieldIndex, `${nextProp}: ${nextDefault}`);
                      onMarkupChange(updated);
                      return;
                    }
                    applyChange(target.fieldIndex, scope, name, resolvedValue);
                  }}
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option === ""
                        ? target.controlTag === "fig-shimmer" && name === "direction"
                          ? "Default"
                          : target.controlTag === "fig-button" && name === "variant"
                            ? "Default (primary)"
                            : target.controlTag === "fig-button" && name === "size"
                              ? "Default"
                              : target.controlTag === "fig-avatar" && name === "size"
                                ? "Default"
                                : target.controlTag === "fig-dialog" && name === "position"
                                  ? "Default"
                            : "None"
                        : name === "units"
                        ? option
                        : name === "fields"
                        ? toFieldsLabel(option)
                        : toSentenceCaseLabel(option)}
                    </option>
                  ))}
                </fig-dropdown>
              );
            }

            if (
              target.controlTag === "fig-popup" &&
              scope === "control" &&
              name === "offset"
            ) {
              const rawOffset = (value ?? "0 0").trim();
              const offsetParts = rawOffset.split(/\s+/).filter(Boolean);
              const currentX = offsetParts[0] ?? "0";
              const currentY = offsetParts[1] ?? offsetParts[0] ?? "0";

              const applyOffsetPart = (axis: "x" | "y", nextPart: string) => {
                const nextX = axis === "x" ? nextPart : currentX;
                const nextY = axis === "y" ? nextPart : currentY;
                applyChange(target.fieldIndex, scope, name, `${nextX} ${nextY}`);
              };

              const handleOffsetInput = (axis: "x" | "y") => (e: any) => {
                const host = e.currentTarget as HTMLElement & { value?: string };
                const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                if (typeof nextValue === "number") {
                  applyOffsetPart(axis, String(nextValue));
                  return;
                }
                if (typeof nextValue === "string") {
                  applyOffsetPart(axis, nextValue.trim() || "0");
                }
              };

              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "var(--spacer-2)",
                    width: "100%",
                  }}
                >
                  <fig-input-number
                    value={currentX}
                    step="1"
                    steppers
                    full
                    onInput={handleOffsetInput("x")}
                    onChange={handleOffsetInput("x")}
                  >
                    <span slot="prepend">X</span>
                  </fig-input-number>
                  <fig-input-number
                    value={currentY}
                    step="1"
                    steppers
                    full
                    onInput={handleOffsetInput("y")}
                    onChange={handleOffsetInput("y")}
                  >
                    <span slot="prepend">Y</span>
                  </fig-input-number>
                </div>
              );
            }

            if (
              target.controlTag === "fig-popup" &&
              scope === "control" &&
              name === "viewport-margin"
            ) {
              const currentMargin = (value ?? "8").trim() || "8";
              const handleMarginInput = (e: any) => {
                const host = e.currentTarget as HTMLElement & { value?: string };
                const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                if (typeof nextValue === "number") {
                  applyChange(target.fieldIndex, scope, name, String(nextValue));
                  return;
                }
                if (typeof nextValue === "string") {
                  applyChange(target.fieldIndex, scope, name, nextValue.trim() || "0");
                }
              };
              return (
                <fig-input-number
                  value={currentMargin}
                  step="1"
                  full
                  onInput={handleMarginInput}
                  onChange={handleMarginInput}
                ></fig-input-number>
              );
            }

            const handleTextInput = (e: any) => {
              const host = e.currentTarget as HTMLElement & { value?: string };
              const nextValue = host.value ?? (e as CustomEvent).detail?.value;
              if (typeof nextValue !== "string") return;
              applyChange(target.fieldIndex, scope, name, nextValue);
            };
            return (
              <fig-input-text
                value={value ?? ""}
                full
                onInput={handleTextInput}
                onChange={handleTextInput}
              ></fig-input-text>
            );
          };

        return (
          <div key={target.fieldIndex}>
            {showFieldControls && (
              <div className="propkit-attributes-view">
                <fig-header borderless>
                  <h3>Field</h3>
                </fig-header>
                <section className="propkit-attributes-content">
                  <div className="propkit-attributes-group">
                    <fig-field direction="horizontal" columns="thirds" key={`field-label-${target.fieldIndex}`}>
                      <label>Label</label>
                      <fig-switch
                        checked={target.hasLabel ? "true" : undefined}
                        onInput={(e: any) => {
                          const customEvent = e as CustomEvent<{ checked?: boolean }>;
                          const host = e.currentTarget as HTMLElement & {
                            checked?: boolean;
                          };
                          const next =
                            typeof customEvent.detail?.checked === "boolean"
                              ? customEvent.detail.checked
                              : Boolean(host.checked ?? host.hasAttribute("checked"));
                          if (!next) {
                            applyLabelChange(target.fieldIndex, false);
                            return;
                          }

                          const rememberedLabel =
                            labelMemoryRef.current[target.fieldIndex] ??
                            target.label.trim() ??
                            "";
                          applyLabelChange(
                            target.fieldIndex,
                            true,
                            rememberedLabel || "Label",
                          );
                        }}
                      ></fig-switch>
                    </fig-field>
                    {fieldEntries.map((entry) => (
                      <fig-field direction="horizontal" columns="thirds" key={`field-${entry.name}`}>
                        <label>{sentenceCase(entry.rule.label)}</label>
                          {renderControl(entry, "field")}
                        </fig-field>
                    ))}
                    {showFieldInputSelector && (
                      <fig-field direction="horizontal" columns="thirds" key={`field-input-${target.fieldIndex}`}>
                        <label>Input</label>
                        <fig-dropdown
                          key={`field-input-select-${target.fieldIndex}-${currentFieldInputTag}`}
                          full
                          experimental="modern"
                          value={currentFieldInputTag}
                          onChange={(e: any) => {
                            const host = e.currentTarget as HTMLElement & { value?: string };
                            const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                            if (typeof nextValue !== "string") return;
                            const nextTag = resolveFieldInputTag(nextValue);
                            if (!nextTag) return;
                            applyFieldInputChange(target.fieldIndex, nextTag);
                          }}
                        >
                          {FIELD_INPUT_OPTIONS.map((option) => (
                            <option key={option.tag} value={option.tag}>
                              {option.label}
                            </option>
                          ))}
                        </fig-dropdown>
                      </fig-field>
                    )}
                  </div>
                </section>
              </div>
            )}

            {visibleControlEntries.length > 0 && (
              <div className="propkit-attributes-view">
                <fig-header borderless>
                  <h3>{getInputPanelTitle(target.controlTag)}</h3>
                </fig-header>
                <section className="propkit-attributes-content">
                  <div className="propkit-attributes-group">
                    {target.controlTag === "fig-chooser" && (() => {
                      const contentMode = getChooserContentMode(markup, target.fieldIndex);
                      const contentOptions: { value: ChooserContentMode; label: string }[] = [
                        { value: "text", label: "Text" },
                        { value: "image", label: "Image" },
                        { value: "image-label", label: "Image + label" },
                        { value: "colors", label: "Colors" },
                      ];
                      return (
                        <fig-field direction="horizontal" columns="thirds" key={`control-chooser-content-${target.fieldIndex}`}>
                          <label>{sentenceCase("Content")}</label>
                          <fig-dropdown
                            full
                            value={contentMode}
                            onInput={(e: any) => {
                              const next = (e.target?.value ?? e.detail) as ChooserContentMode;
                              if (next && next !== contentMode) {
                                onMarkupChange(
                                  applyChooserContentMutation(markup, target.fieldIndex, next),
                                );
                              }
                            }}
                          >
                            {contentOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {sentenceCase(opt.label)}
                              </option>
                            ))}
                          </fig-dropdown>
                        </fig-field>
                      );
                    })()}
                    {target.controlTag === "fig-header" && (() => {
                      const iconEnabled = getHeaderIconEnabled(markup, target.fieldIndex);
                      return (
                        <fig-field direction="horizontal" columns="thirds" key={`control-header-icon-${target.fieldIndex}`}>
                          <label>Icon</label>
                          <fig-switch
                            checked={iconEnabled ? "true" : undefined}
                            onChange={() =>
                              onMarkupChange(
                                applyHeaderIconMutation(markup, target.fieldIndex, !iconEnabled),
                              )
                            }
                          />
                        </fig-field>
                      );
                    })()}
                    {visibleControlEntries.flatMap((entry, entryIndex) => {
                      const field = (
                        <fig-field direction="horizontal" columns="thirds" key={`control-${entry.name}`}>
                          <label>{sentenceCase(entry.rule.label)}</label>
                          {renderControl(entry, "control")}
                        </fig-field>
                      );

                      const maxSizeAfterLayout =
                        target.controlTag === "fig-chooser" && entry.name === "layout";
                      if (maxSizeAfterLayout) {
                        const currentLayout = target.controlAttributes.layout ?? "vertical";
                        const isHorizontal = currentLayout === "horizontal";

                        const currentOverflow = target.controlAttributes.overflow ?? "buttons";
                        const overflowOptions = ["buttons", "scrollbar"];
                        const overflowField = (
                          <fig-field direction="horizontal" columns="thirds" key={`control-chooser-overflow-${target.fieldIndex}`}>
                            <label>{sentenceCase("Overflow")}</label>
                            <fig-segmented-control
                              full
                              value={currentOverflow}
                              onInput={(e: any) => {
                                const val = e.detail ?? e.target?.value;
                                if (!val) return;
                                applyChange(target.fieldIndex, "control", "overflow", val === "buttons" ? null : val);
                              }}
                            >
                              {overflowOptions.map((opt) => (
                                <fig-segment
                                  key={opt}
                                  value={opt}
                                  selected={opt === currentOverflow ? "true" : undefined}
                                >
                                  {sentenceCase(opt)}
                                </fig-segment>
                              ))}
                            </fig-segmented-control>
                          </fig-field>
                        );

                        const maxSizeUnits = isHorizontal ? "%" : "px";
                        const maxSizeDefault = isHorizontal ? 100 : 240;
                        const styleProp = isHorizontal ? "max-width" : "max-height";
                        const styleStr = target.controlAttributes.style ?? "";
                        const match = styleStr.match(/max-(?:width|height):\s*([\d.]+)/);
                        const maxSizeNum = match ? parseFloat(match[1]) : maxSizeDefault;
                        const maxSizeField = (
                          <fig-field direction="horizontal" columns="thirds" key={`control-chooser-maxsize-${target.fieldIndex}-${currentLayout}`}>
                            <label>{sentenceCase("Max size")}</label>
                            <fig-slider
                              full
                              variant="neue"
                              text="true"
                              value={maxSizeNum}
                              min={isHorizontal ? 10 : 60}
                              max={isHorizontal ? 100 : 600}
                              step={isHorizontal ? 5 : 10}
                              units={maxSizeUnits}
                              onInput={(e: any) => {
                                const val = parseFloat(e.target?.value ?? e.detail);
                                if (isNaN(val)) return;
                                onMarkupChange(
                                  applyChooserMaxSizeMutation(markup, target.fieldIndex, `${styleProp}: ${val}${maxSizeUnits}`),
                                );
                              }}
                            />
                          </fig-field>
                        );
                        return [field, overflowField, maxSizeField];
                      }

                      const prependBefore =
                        target.controlTag === "fig-input-number" && entryIndex === 0;
                      const prependAfter =
                        target.controlTag === "fig-input-text" && entry.name === "type";
                      const showPrepend =
                        (prependBefore || prependAfter) &&
                        !hiddenControlAttrs.has("prepend");
                      if (!showPrepend) return [field];
                      const prependMode = getPrependSlotMode(markup, target.fieldIndex);
                      const prependOptions: { value: PrependSlotMode; label: string }[] = [
                        { value: "none", label: "None" },
                        { value: "label", label: "Label" },
                        { value: "icon", label: "Icon" },
                      ];
                      const prependField = (
                        <fig-field direction="horizontal" columns="thirds" key={`control-prepend-${target.fieldIndex}`}>
                          <label>Prepend</label>
                          <fig-segmented-control full>
                            {prependOptions.map((opt) => (
                              <fig-segment
                                key={opt.value}
                                value={opt.value}
                                selected={opt.value === prependMode ? "true" : undefined}
                                onClick={() =>
                                  onMarkupChange(
                                    applyPrependSlotMutation(markup, target.fieldIndex, opt.value),
                                  )
                                }
                              >
                                {opt.label}
                              </fig-segment>
                            ))}
                          </fig-segmented-control>
                        </fig-field>
                      );
                      return prependBefore
                        ? [prependField, field]
                        : [field, prependField];
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
