export type PropsKitTheme = "system" | "light" | "dark";

export type PropsKitSliderTuple = [number, number, number, number?];

export type PropsKitSelectConfig = {
  type: "select";
  options: Array<string | { value: string; label?: string }>;
  default?: string;
};

export type PropsKitColorConfig = {
  type: "color";
  default: string;
};

export type PropsKitTextConfig = {
  type: "text";
  default?: string;
  placeholder?: string;
};

export type PropsKitEasingConfig = {
  type: "easing" | "spring";
  value?: number[];
  ease?: number[];
  default?: number[];
  [key: string]: unknown;
};

export type PropsKitActionConfig = {
  type: "action";
};

export type PropsKitFolderConfig = {
  _collapsed?: boolean;
  [key: string]: PropsKitConfigValue;
};

export type PropsKitConfigValue =
  | number
  | boolean
  | string
  | PropsKitSliderTuple
  | PropsKitSelectConfig
  | PropsKitColorConfig
  | PropsKitTextConfig
  | PropsKitEasingConfig
  | PropsKitActionConfig
  | PropsKitFolderConfig;

export type PropsKitConfig = Record<string, PropsKitConfigValue>;

export type PropsKitOptions = {
  theme?: PropsKitTheme;
  onChange?: (
    path: string,
    value: unknown,
    values: Record<string, unknown>,
  ) => void;
  onAction?: (name: string) => void;
  scoped?: boolean;
};

export type PropsKitInstance = {
  readonly values: Record<string, unknown>;
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  subscribe(fn: (values: Record<string, unknown>) => void): () => void;
  destroy(): void;
};

export declare const PROPSKIT_SCOPE_ROOT_CLASS: "figui-root";
export declare const PROPSKIT_OVERLAY_ROOT_ATTR: "data-figui-overlay-root";

export declare function applyFiguiTheme(
  el: Element,
  theme?: PropsKitTheme,
): void;

export declare function syncOverlayTheme(source?: Element | null): Element | null;

export declare function inferControl(
  key: string,
  value: unknown,
): Record<string, unknown>;

export declare function parseConfig(
  config: PropsKitConfig,
): Array<Record<string, unknown>>;

export declare function createPropsKit(
  target: Element | DocumentFragment,
  name: string,
  config: PropsKitConfig,
  options?: PropsKitOptions,
): PropsKitInstance;

export as namespace PropsKit;
