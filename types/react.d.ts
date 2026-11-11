import type * as React from "react";
import type {
  FigCheckedDetail,
  FigCheckedElement,
  FigColorDetail,
  FigCustomEvent,
  FigEventDetailMap,
  FigInputSliderElement,
  FigInputWheelElement,
  FigSliderDetail,
  FigSliderElement,
  FigTagNameMap,
  FigTextInputElement,
} from "./index.js";

type FigBooleanAttribute = boolean | "true" | "false" | "";
type FigAttributeValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Element
  | Element[];

export type FigReactEvent<
  TElement extends HTMLElement,
  TEvent extends Event,
> = React.SyntheticEvent<TElement, TEvent>;

type FigInputDetail<TElement extends HTMLElement> =
  TElement extends
    | FigSliderElement
    | FigInputSliderElement
    | FigInputWheelElement
    ? FigSliderDetail<string>
    : TElement extends FigCheckedElement
      ? FigCheckedDetail
      : TElement extends FigTextInputElement
        ? string
        : TElement extends FigTagNameMap["fig-input-color"]
          ? FigColorDetail
          : FigEventDetailMap["input"];

export type FigReactProps<TElement extends HTMLElement> = Omit<
  React.HTMLAttributes<TElement>,
  "default" | "onChange" | "onInput"
> & {
  ref?: React.Ref<TElement>;
  value?: FigAttributeValue;
  default?: FigAttributeValue;
  checked?: FigBooleanAttribute;
  disabled?: FigBooleanAttribute;
  open?: FigBooleanAttribute;
  full?: FigBooleanAttribute;
  compact?: FigBooleanAttribute;
  icon?: FigBooleanAttribute | "compact";
  pill?: FigBooleanAttribute;
  selected?: FigBooleanAttribute;
  playing?: FigBooleanAttribute;
  duration?: string | number;
  progress?: string | number;
  variant?: string;
  size?: string;
  name?: string;
  type?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  units?: string;
  precision?: string | number;
  onInput?: (
    event: FigReactEvent<
      TElement,
      CustomEvent<FigInputDetail<TElement>>
    >,
  ) => void;
  onChange?: (
    event: FigReactEvent<
      TElement,
      CustomEvent<FigInputDetail<TElement>>
    >,
  ) => void;
  [attribute: string]: unknown;
};

export type FigReactIntrinsicElements = {
  [K in keyof FigTagNameMap]: FigReactProps<FigTagNameMap[K]>;
};

export type FigNativeEventHandler<
  K extends keyof FigEventDetailMap,
  TElement extends HTMLElement = HTMLElement,
> = (this: TElement, event: FigCustomEvent<K>) => unknown;

declare module "react" {
  interface HTMLAttributes<T> {
    is?: string;
  }

  interface DialogHTMLAttributes<T> {
    position?: string;
    offset?: string;
    duration?: string | number;
    theme?: string;
  }

  namespace JSX {
    interface IntrinsicElements extends FigReactIntrinsicElements {}
  }
}
