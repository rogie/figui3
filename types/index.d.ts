export type FigPrimitiveValue = string | number | boolean | null;
declare const figDetailType: unique symbol;

export interface FigValueDetail<T = unknown> {
  value: T;
  name?: string;
}

export interface FigCheckedDetail extends FigValueDetail<boolean> {
  checked: boolean;
}

export interface FigColorDetail extends FigValueDetail<string> {
  color: string;
  alpha: number;
  opacity: number;
  hex?: string;
  rgba?: { r: number; g: number; b: number; a: number };
}

export interface FigSliderDetail<T = string> extends FigValueDetail<T> {
  control?: string;
  handleIndex?: number;
  values?: number[];
}

export interface FigReorderDetail {
  from: number;
  to: number;
  item?: Element;
}

export interface FigRemoveDetail {
  item?: Element;
  value?: unknown;
}

export interface FigEventDetailMap {
  input:
    | FigPrimitiveValue
    | FigValueDetail
    | FigCheckedDetail
    | FigColorDetail
    | FigSliderDetail;
  change:
    | FigPrimitiveValue
    | FigValueDetail
    | FigCheckedDetail
    | FigColorDetail
    | FigSliderDetail;
  loaded: { src?: string; media?: HTMLMediaElement; originalEvent?: Event };
  optionhover: { value?: string; option?: Element };
  optionschange: { value?: string; options?: Element[] };
  reorder: FigReorderDetail;
  remove: FigRemoveDetail;
  modeready: { mode?: string };
  webcamstream: { stream: MediaStream };
  openchange: { open: boolean };
  visibilitychange: { visible: boolean };
}

export type FigCustomEvent<
  K extends keyof FigEventDetailMap,
> = CustomEvent<FigEventDetailMap[K]>;

export interface FigHTMLElement extends HTMLElement {
  addEventListener<K extends keyof FigEventDetailMap>(
    type: K,
    listener: (this: this, event: FigCustomEvent<K>) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLElement, event: HTMLElementEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof FigEventDetailMap>(
    type: K,
    listener: (this: this, event: FigCustomEvent<K>) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLElement, event: HTMLElementEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
}

export interface FigValueElement<
  TValue = string,
  TDetail = FigValueDetail<TValue>,
> extends FigHTMLElement {
  readonly [figDetailType]?: TDetail;
  value: TValue;
  default?: TValue;
  defaultValue?: TValue;
  readonly isDefault?: boolean;
  disabled?: boolean;
  resetToDefault?(): void;
}

export interface FigCheckedElement extends FigValueElement<
  boolean,
  FigCheckedDetail
> {
  checked: boolean;
  defaultChecked?: boolean;
}

export interface FigTextInputElement extends FigValueElement<
  string,
  string
> {
  input: HTMLInputElement;
  placeholder?: string;
  focus(options?: FocusOptions): void;
}

export interface FigNumberInputElement extends FigValueElement<
  string,
  string
> {
  input: HTMLInputElement;
  min?: number;
  max?: number;
  step?: number;
  precision?: number | null;
  units?: string;
  focus(options?: FocusOptions): void;
}

export interface FigSliderElement extends FigValueElement<
  string,
  FigSliderDetail<string>
> {
  input: HTMLInputElement;
  min: number;
  max: number;
  step: number;
  type: string;
  variant: string;
  focus(options?: FocusOptions): void;
}

export interface FigInputSliderState {
  values: number[];
  min: number;
  max: number;
  step: number;
  activeHandleIndex?: number;
}

export interface FigInputSliderElement extends FigValueElement<
  string,
  FigSliderDetail<string>
> {
  defaultValue: string;
  isDefault: boolean;
  occlusionTargets: Element[];
  getSliderState(): FigInputSliderState;
  setInteractionValue(
    value: number,
    options?: Record<string, unknown>,
  ): boolean;
  commitInteractionChange(handleIndex?: number): void;
  requestRender(): void;
  resetToDefault(): void;
}

export interface FigInputWheelElement extends FigValueElement<
  string,
  FigSliderDetail<string>
> {
  spinTo(value: number): void;
  beginScrub(event?: PointerEvent): void;
  updateScrub(value: number, event?: PointerEvent): void;
  endScrub(commit?: boolean): void;
  resetToDefault(): void;
}

export interface FigMenuElement extends FigValueElement<
  string,
  FigValueDetail<string>
> {
  open: boolean;
  showAt(x: number, y: number): void;
}

export interface FigLayerElement extends FigHTMLElement {
  open: boolean;
  visible: boolean;
  disabled: boolean;
}

export interface FigTooltipElement extends FigHTMLElement {
  text: string;
  anchor?: Element | string | null;
  showPopup(): void;
  hidePopup(): void;
}

export interface FigAudioWaveformElement extends FigHTMLElement {
  url: string;
  progress: number;
  variant: "bars" | "ribbon";
}

export interface FigMediaElement extends FigHTMLElement {
  src: string;
  currentTime: number;
  duration: number;
  muted: boolean;
  loop: boolean;
  play(): Promise<void> | void;
  pause(): void;
}

export interface FigDialogElement extends HTMLDialogElement {
  anchor?: Element | string | { getBoundingClientRect(): DOMRect } | null;
  position?: string;
  offset?: string;
  open: boolean;
  showPopup(): void;
  hidePopup(): void;
}

export interface FigToastElement extends FigDialogElement {
  duration?: number;
  showToast(): void;
}

export interface FigSelectElement extends FigValueElement<
  string,
  FigValueDetail<string>
> {
  open?: boolean;
  menuAnchor?: Element | null;
}

export interface FigFillPickerElement extends FigValueElement {
  anchorElement?: Element | null;
  activate?(options?: Record<string, unknown>): void;
}

export interface FigTagNameMap {
  "fig-3d-rotate": FigValueElement;
  "fig-ai-context": FigHTMLElement;
  "fig-ai-prompt": FigHTMLElement;
  "fig-angle": FigValueElement;
  "fig-attachment": FigHTMLElement;
  "fig-attachments": FigHTMLElement;
  "fig-audio": FigMediaElement;
  "fig-audio-waveform": FigAudioWaveformElement;
  "fig-avatar": FigHTMLElement;
  "fig-button": FigHTMLElement;
  "fig-button-combo": FigHTMLElement;
  "fig-canvas-control": FigValueElement;
  "fig-card": FigHTMLElement;
  "fig-chat-message": FigHTMLElement;
  "fig-checkbox": FigCheckedElement;
  "fig-chit": FigHTMLElement;
  "fig-choice": FigValueElement;
  "fig-chooser": FigValueElement;
  "fig-color-tip": FigValueElement<unknown, FigColorDetail>;
  "fig-combo-input": FigValueElement;
  "fig-content": FigHTMLElement;
  "fig-dropdown": FigValueElement;
  "fig-easing-curve": FigValueElement;
  "fig-field": FigHTMLElement;
  "fig-fill-picker": FigFillPickerElement;
  "fig-footer": FigHTMLElement;
  "fig-gradient-editor": FigValueElement;
  "fig-group": FigHTMLElement;
  "fig-handle": FigValueElement;
  "fig-header": FigHTMLElement;
  "fig-icon": FigHTMLElement;
  "fig-image": FigMediaElement;
  "fig-input-color": FigValueElement<string, FigColorDetail>;
  "fig-input-combo": FigHTMLElement;
  "fig-input-file": FigValueElement;
  "fig-input-fill": FigValueElement;
  "fig-input-gradient": FigValueElement;
  "fig-input-number": FigNumberInputElement;
  "fig-input-palette": FigValueElement;
  "fig-input-point": FigValueElement;
  "fig-input-rotate": FigValueElement;
  "fig-input-slider": FigInputSliderElement;
  "fig-input-slider-delta": FigInputSliderElement;
  "fig-input-slider-hue": FigInputSliderElement;
  "fig-input-slider-opacity": FigInputSliderElement;
  "fig-input-slider-stepper": FigInputSliderElement;
  "fig-input-slider-wheel": FigInputSliderElement;
  "fig-input-text": FigTextInputElement;
  "fig-input-wheel": FigInputWheelElement;
  "fig-interpolation-swatch": FigValueElement;
  "fig-joystick": FigValueElement;
  "fig-layer": FigLayerElement;
  "fig-media": FigMediaElement;
  "fig-media-controls": FigHTMLElement;
  "fig-menu": FigMenuElement;
  "fig-menu-item": FigValueElement;
  "fig-menu-separator": FigHTMLElement;
  "fig-options": FigValueElement;
  "fig-origin-grid": FigValueElement;
  "fig-palette-editor": FigValueElement;
  "fig-preview": FigHTMLElement;
  "fig-property": FigHTMLElement;
  "fig-radio": FigCheckedElement;
  "fig-reorder": FigValueElement;
  "fig-segment": FigValueElement;
  "fig-segmented-control": FigValueElement;
  "fig-select": FigSelectElement;
  "fig-select-option": FigValueElement;
  "fig-select-options": FigHTMLElement;
  "fig-separator": FigHTMLElement;
  "fig-shimmer": FigHTMLElement;
  "fig-skeleton": FigHTMLElement;
  "fig-slider": FigSliderElement;
  "fig-split-input": FigValueElement;
  "fig-spinner": FigHTMLElement;
  "fig-stack": FigHTMLElement;
  "fig-swatch": FigValueElement;
  "fig-switch": FigCheckedElement;
  "fig-tab": FigValueElement;
  "fig-tab-content": FigHTMLElement;
  "fig-tabs": FigValueElement;
  "fig-toolbelt": FigValueElement;
  "fig-toolbelt-group": FigHTMLElement;
  "fig-toolbelt-item": FigValueElement;
  "fig-tooltip": FigTooltipElement;
  "fig-truncate": FigHTMLElement;
  "fig-video": FigMediaElement;
}

declare global {
  interface HTMLElementTagNameMap extends FigTagNameMap {}
}
