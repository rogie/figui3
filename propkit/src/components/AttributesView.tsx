import { useMemo, useCallback } from "react";
import {
  applyAttributeMutation,
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

function readBooleanValue(value: string | undefined, mode: BoolMode): boolean {
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

export default function AttributesView({ markup, onMarkupChange }: Props) {
  const targets = useMemo(() => parseAttributeTargets(markup), [markup]);

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

  if (!targets.length) return null;

  return (
    <div className="propkit-attributes-view">
      <fig-header>
        <h3>Attributes</h3>
      </fig-header>
      <section className="propkit-attributes-content">
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

          const renderControl = (
            entry: RuleEntry,
            scope: "field" | "control",
          ) => {
            const { name, rule, value } = entry;

            if (rule.type === "boolean") {
              const mode = rule.boolMode ?? "presence";
              const checked = readBooleanValue(value, mode);
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
              const fallback = rule.min ?? 0;
              const numberValue = toNumberValue(value, fallback);
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
              const current = value ?? rule.options[0] ?? "";
              if (
                name === "direction" &&
                rule.options.includes("horizontal") &&
                rule.options.includes("vertical")
              ) {
                return (
                  <fig-segmented-control full>
                    {rule.options.map((option) => (
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
                    applyChange(target.fieldIndex, scope, name, nextValue);
                  }}
                >
                  {rule.options.map((option) => (
                    <option
                      key={option}
                      value={option}
                      selected={option === current}
                    >
                      {option === ""
                        ? "None"
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
            <div className="propkit-attributes-group" key={target.fieldIndex}>
              {fieldEntries.map((entry) => (
                <fig-field direction="horizontal" key={`field-${entry.name}`}>
                  <label>{entry.rule.label}</label>
                  {renderControl(entry, "field")}
                </fig-field>
              ))}
              {controlEntries.map((entry) => (
                <fig-field direction="horizontal" key={`control-${entry.name}`}>
                  <label>{entry.rule.label}</label>
                  {renderControl(entry, "control")}
                </fig-field>
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}
