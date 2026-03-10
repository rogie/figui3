import { useMemo, useCallback, useEffect, useRef } from "react";
import {
  applyAttributeMutation,
  applyButtonIconMutation,
  applyButtonTypeMutation,
  applyDialogCloseButtonMutation,
  applyDialogFooterMutation,
  applyFieldControlMutation,
  applyFieldLabelMutation,
  parseAttributeTargets,
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

function getInputPanelTitle(controlTag: string): string {
  const titles: Record<string, string> = {
    "fig-button": "Button",
    "fig-avatar": "Avatar",
    "fig-tooltip": "Tooltip",
    "fig-dialog": "Dialog",
    "fig-popup": "Popup",
    "fig-fill-picker": "Fill Picker",
    "fig-chit": "Chit",
    "fig-radio": "Radio",
    "fig-field": "Field",
    "fig-combo-input": "Combo Input",
    "fig-image": "Image",
    "fig-input-color": "Color",
    "fig-input-fill": "Fill",
    "fig-slider": "Slider",
    "fig-input-number": "Number",
    "fig-switch": "Switch",
    "fig-dropdown": "Dropdown",
    "fig-segmented-control": "Segmented control",
    "fig-easing-curve": "Easing Curve",
    "fig-3d-rotate": "3D Rotate",
    "fig-input-angle": "Angle",
    "fig-input-joystick": "Input Joystick",
    "fig-toast": "Toast",
    "fig-spinner": "Spinner",
    "fig-shimmer": "Shimmer",
    "fig-layer": "Layer",
    "fig-header": "Header",
  };
  return titles[controlTag] ?? toTitle(controlTag.replace(/^fig-/, ""));
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
            "fig-input-angle",
            "fig-combo-input",
            "fig-input-joystick",
            "fig-radio",
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
          const visibleControlEntries = controlEntries.filter(
            (entry) =>
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
                    ? [...rule.options, "auto"]
                    : rule.options.filter((option) => option !== "auto")
                  : rule.options;
              const current =
                value ??
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
                  options.includes("half"));
              if (useSegmentedControl) {
                return (
                  <fig-segmented-control full>
                    {options.map((option) => (
                      <fig-segment
                        key={option}
                        value={option}
                        selected={option === current ? "true" : "false"}
                        onClick={() =>
                          applyChange(target.fieldIndex, scope, name, option)
                        }
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
                    applyChange(target.fieldIndex, scope, name, resolvedValue);
                  }}
                >
                  {options.map((option) => (
                    <option
                      key={option}
                      value={option}
                      selected={option === current}
                    >
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
                <fig-header>
                  <h3>Field</h3>
                </fig-header>
                <section className="propkit-attributes-content">
                  <div className="propkit-attributes-group">
                    <fig-field direction="horizontal" key={`field-label-${target.fieldIndex}`}>
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
                      <fig-field direction="horizontal" key={`field-${entry.name}`}>
                        <label>{entry.rule.label}</label>
                        {renderControl(entry, "field")}
                      </fig-field>
                    ))}
                    {showFieldInputSelector && (
                      <fig-field direction="horizontal" key={`field-input-${target.fieldIndex}`}>
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
                            <option
                              key={option.tag}
                              value={option.tag}
                              selected={option.tag === currentFieldInputTag ? true : undefined}
                            >
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
                <fig-header>
                  <h3>{getInputPanelTitle(target.controlTag)}</h3>
                </fig-header>
                <section className="propkit-attributes-content">
                  <div className="propkit-attributes-group">
                    {visibleControlEntries.map((entry) => (
                      <fig-field direction="horizontal" key={`control-${entry.name}`}>
                        <label>{entry.rule.label}</label>
                        {renderControl(entry, "control")}
                      </fig-field>
                    ))}
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
