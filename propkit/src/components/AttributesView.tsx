import { useMemo, useCallback, useEffect, useRef } from "react";
import {
  applyAttributeMutation,
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
}

interface RuleEntry {
  name: string;
  value: string | undefined;
  rule: AttributeRule;
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

function getInputPanelTitle(controlTag: string): string {
  const titles: Record<string, string> = {
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
  };
  return titles[controlTag] ?? toTitle(controlTag.replace(/^fig-/, ""));
}

function getNumberAttrDefault(
  controlTag: string,
  attrName: string,
): number | undefined {
  if (controlTag === "fig-input-number") {
    if (attrName === "min") return 0;
    if (attrName === "max") return 100;
    if (attrName === "step") return 0.5;
  }
  return undefined;
}

export default function AttributesView({ markup, onMarkupChange }: Props) {
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

          const fieldEntries: RuleEntry[] = Object.entries(fieldRules).map(
            ([name, rule]) => ({
              name,
              value: target.fieldAttributes[name],
              rule,
            }),
          );

          const controlEntries: RuleEntry[] = Object.entries(controlRules).map(
            ([name, rule]) => ({
              name,
              value: target.controlAttributes[name],
              rule,
            }),
          );
          const sliderTextEnabled =
            target.controlTag === "fig-slider" &&
            (target.controlAttributes.text ?? "").toLowerCase() === "true";
          const visibleControlEntries = controlEntries.filter(
            (entry) =>
              !(
                entry.name === "units" &&
                target.controlTag === "fig-slider" &&
                !sliderTextEnabled
              ),
          );

          const renderControl = (
            entry: RuleEntry,
            scope: "field" | "control",
          ) => {
            const { name, rule, value } = entry;

            if (rule.type === "boolean") {
              const mode = rule.boolMode ?? "presence";
              const checked = readBooleanValue(
                value,
                mode,
                rule.defaultChecked ?? false,
              );
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
              const fallback =
                getNumberAttrDefault(target.controlTag, name) ?? rule.min ?? 0;
              const numberValue = toNumberValue(value, fallback);
              const useNumberInputControl =
                target.controlTag === "fig-input-number" &&
                (name === "min" || name === "max" || name === "step");
              if (useNumberInputControl) {
                return (
                  <fig-input-number
                    value={String(numberValue)}
                    step={name === "step" ? "0.1" : "1"}
                    full
                    onInput={(e: any) => {
                      const host = e.currentTarget as HTMLElement & { value?: string };
                      const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                      if (nextValue === undefined || nextValue === null) return;
                      applyChange(target.fieldIndex, scope, name, String(nextValue));
                    }}
                  ></fig-input-number>
                );
              }
              return (
                <fig-slider
                  value={String(numberValue)}
                  min={String(rule.min ?? 0)}
                  max={String(rule.max ?? 100)}
                  step={String(rule.step ?? 1)}
                  text="true"
                  full
                  onInput={(e: any) => {
                    const host = e.currentTarget as HTMLElement & { value?: string };
                    const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                    if (nextValue === undefined || nextValue === null) return;
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
              if (
                name === "direction" &&
                options.includes("horizontal") &&
                options.includes("vertical")
              ) {
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
                    if (
                      target.controlTag === "fig-image" &&
                      name === "fit" &&
                      nextValue === "auto"
                    ) {
                      applyChange(target.fieldIndex, scope, name, null);
                      return;
                    }
                    applyChange(target.fieldIndex, scope, name, nextValue);
                  }}
                >
                  {options.map((option) => (
                    <option
                      key={option}
                      value={option}
                      selected={option === current}
                    >
                      {option === ""
                        ? "None"
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

            return (
              <fig-input-text
                value={value ?? ""}
                full
                onInput={(e: any) => {
                  const host = e.currentTarget as HTMLElement & { value?: string };
                  const nextValue = host.value ?? (e as CustomEvent).detail?.value;
                  if (typeof nextValue !== "string") return;
                  applyChange(target.fieldIndex, scope, name, nextValue);
                }}
              ></fig-input-text>
            );
          };

        return (
          <div key={target.fieldIndex}>
            <div className="propkit-attributes-view">
              <fig-header>
                <h3>Field</h3>
              </fig-header>
              <section className="propkit-attributes-content">
                <div className="propkit-attributes-group">
                  {fieldEntries.map((entry) => (
                    <fig-field direction="horizontal" key={`field-${entry.name}`}>
                      <label>{entry.rule.label}</label>
                      {renderControl(entry, "field")}
                    </fig-field>
                  ))}
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
                          rememberedLabel ||
                            toTitle(target.controlTag.replace(/^fig-/, "")),
                        );
                      }}
                    ></fig-switch>
                  </fig-field>
                </div>
              </section>
            </div>

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
