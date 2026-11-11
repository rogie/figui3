export type PropsKitNumberRange = readonly [
  defaultValue: number,
  min: number,
  max: number,
  step?: number,
];

export type PropsKitSliderVariant =
  | "range"
  | "hue"
  | "delta"
  | "opacity";

export interface PropsKitBaseDefinition<TType extends string, TValue> {
  type: TType;
  label?: string;
  default?: TValue;
  disabled?: boolean;
}

export interface PropsKitNumberDefinition
  extends PropsKitBaseDefinition<"number", number> {
  control?: "slider" | "number";
  variant?: PropsKitSliderVariant;
  stepper?: boolean;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  units?: string;
  text?: boolean;
  color?: string;
}

export interface PropsKitTextDefinition
  extends PropsKitBaseDefinition<"text", string> {
  placeholder?: string;
  multiline?: boolean;
  autoresize?: boolean;
  readonly?: boolean;
}

export interface PropsKitSwitchDefinition
  extends PropsKitBaseDefinition<"switch", boolean> {}

export interface PropsKitColorDefinition
  extends PropsKitBaseDefinition<"color", string> {
  alpha?: boolean;
}

export interface PropsKitStringDefinition<
  TType extends "gradient" | "easing" | "rotate",
> extends PropsKitBaseDefinition<TType, string> {}

export interface PropsKitPaletteDefinition
  extends PropsKitBaseDefinition<"palette", unknown[]> {}

export interface PropsKitOptionsDefinition
  extends PropsKitBaseDefinition<"options", string> {
  options: readonly (string | { value: string; label: string })[];
  layout?: string;
}

export interface PropsKitPointValue {
  x: number;
  y: number;
}

export interface PropsKitPointDefinition
  extends PropsKitBaseDefinition<"point", PropsKitPointValue> {
  precision?: number;
  units?: string;
}

export interface PropsKitJoystickDefinition
  extends PropsKitBaseDefinition<"joystick", PropsKitPointValue> {
  precision?: number;
  units?: string;
  /**
   * Scale applied to the joystick's normalized 0…1 event coordinates.
   * Defaults to 100 for backward-compatible 0…100 values.
   */
  unitScale?: number;
}

export interface PropsKitFileValue {
  files: readonly File[];
  url: string;
  filename: string;
}

export interface PropsKitFileDefinition
  extends PropsKitBaseDefinition<"file", PropsKitFileValue> {
  variant?: "file" | "image" | "audio" | "video";
  accepts?: string;
  preview?: boolean | "large";
  multiple?: boolean;
  remove?: boolean;
}

export type PropsKitMediaOption =
  | string
  | { value: string; label: string };

export interface PropsKitSelectableMediaDefinition<
  TType extends "image" | "video",
  TValue extends string = string,
> extends PropsKitBaseDefinition<TType, TValue> {
  options?: readonly PropsKitMediaOption[];
  accepts?: string;
  aspectRatio?: string;
  fit?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
}

export interface PropsKitAudioDefinition<
  TValue extends string | readonly string[] = string | readonly string[],
> extends PropsKitBaseDefinition<"audio", TValue> {
  multiple?: boolean;
  maxItems?: number;
  accepts?: string;
  aspectRatio?: string;
  fit?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
}

export type PropsKitMediaDefinition =
  | PropsKitSelectableMediaDefinition<"image" | "video">
  | PropsKitAudioDefinition;

export interface PropsKitActionContext<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> {
  path: string;
  values: TValues;
  controller: PropsKitController<any>;
  event: Event;
}

export interface PropsKitActionDefinition {
  type: "action";
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "naked";
  disabled?: boolean;
  onClick?: (context: PropsKitActionContext) => void;
}

export type PropsKitLeafDefinition =
  | PropsKitNumberDefinition
  | PropsKitTextDefinition
  | PropsKitSwitchDefinition
  | PropsKitColorDefinition
  | PropsKitStringDefinition<"gradient" | "easing" | "rotate">
  | PropsKitPaletteDefinition
  | PropsKitOptionsDefinition
  | PropsKitPointDefinition
  | PropsKitJoystickDefinition
  | PropsKitFileDefinition
  | PropsKitMediaDefinition
  | PropsKitActionDefinition;

export type PropsKitDefinition =
  | number
  | boolean
  | string
  | PropsKitNumberRange
  | PropsKitLeafDefinition;

export interface PropsKitConfig {
  _collapsed?: boolean;
  _compact?: boolean;
  _label?: string;
  [key: string]:
    | PropsKitDefinition
    | PropsKitConfig
    | boolean
    | string
    | undefined;
}

type ResolveDefinition<T> =
  T extends PropsKitNumberRange
    ? number
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends string
          ? string
          : T extends PropsKitActionDefinition
            ? never
            : T extends PropsKitNumberDefinition
              ? number
              : T extends PropsKitSwitchDefinition
                ? boolean
                : T extends PropsKitTextDefinition | PropsKitColorDefinition
                  ? string
                  : T extends PropsKitStringDefinition<
                        "gradient" | "easing" | "rotate"
                      >
                    ? string
                    : T extends PropsKitPaletteDefinition
                      ? unknown[]
                      : T extends PropsKitOptionsDefinition
                        ? string
                      : T extends
                            | PropsKitPointDefinition
                            | PropsKitJoystickDefinition
                          ? PropsKitPointValue
                          : T extends PropsKitFileDefinition
                            ? PropsKitFileValue
                            : T extends PropsKitSelectableMediaDefinition<
                                  any,
                                  infer TValue
                                >
                              ? TValue
                              : T extends PropsKitAudioDefinition<infer TValue>
                              ? TValue
                              : T extends PropsKitConfig
                                ? ResolvedPropsKitValues<T>
                                : never;

export type ResolvedPropsKitValues<T extends PropsKitConfig> = {
  [K in keyof T as K extends `_${string}`
    ? never
    : T[K] extends PropsKitActionDefinition
      ? never
      : K]: ResolveDefinition<T[K]>;
};

export type PropsKitValueUpdates<T extends PropsKitConfig> = {
  [K in keyof ResolvedPropsKitValues<T>]?: ResolvedPropsKitValues<T>[K] extends Record<
    string,
    unknown
  >
    ? Partial<ResolvedPropsKitValues<T>[K]>
    : ResolvedPropsKitValues<T>[K];
};

export interface PropsKitChangeRecord {
  readonly path: string;
  readonly value: unknown;
  readonly previousValue: unknown;
  readonly phase?: "input" | "change";
}

export interface PropsKitInteraction extends PropsKitChangeRecord {
  readonly panelId: string;
  readonly sourceEvent?: Event;
}

export interface CreatePropsKitOptions {
  id?: string;
  /** Called only for live user input, never for programmatic setters. */
  onInput?: (
    path: string,
    value: unknown,
    interaction: PropsKitInteraction,
  ) => void;
  /** Called only for committed user changes, never for programmatic setters. */
  onChange?: (
    path: string,
    value: unknown,
    interaction: PropsKitInteraction,
  ) => void;
}

export interface PropsKitController<T extends PropsKitConfig> {
  readonly id: string;
  readonly values: ResolvedPropsKitValues<T>;
  getValues(): ResolvedPropsKitValues<T>;
  /** Updates state and subscribers without invoking onInput or onChange. */
  setValue(path: string, value: unknown): void;
  /** Updates state and subscribers without invoking onInput or onChange. */
  setValues(values: PropsKitValueUpdates<T>): void;
  /** Updates state and subscribers without invoking onInput or onChange. */
  resetValues(): void;
  subscribe(
    listener: (values: ResolvedPropsKitValues<T>) => void,
    immediate?: boolean,
  ): () => void;
  subscribe(
    listener: (records: readonly PropsKitChangeRecord[]) => void,
    options: { mode: "changes"; immediate?: boolean },
  ): () => void;
  destroy(): void;
}

export interface CreatePropsKitRootOptions {
  id?: string;
  target?: HTMLElement | string;
  panelIds?: readonly string[];
}

export interface PropsKitRootController {
  readonly element: HTMLDivElement;
  destroy(): void;
}

export function figCreateProps<const T extends PropsKitConfig>(
  name: string | null,
  config: T,
  options?: CreatePropsKitOptions,
): PropsKitController<T>;

export function figCreatePropsRoot(
  options?: CreatePropsKitRootOptions,
): PropsKitRootController;

export const PROPSKIT_CONTROL_TYPES: ReadonlySet<
  PropsKitLeafDefinition["type"]
>;
