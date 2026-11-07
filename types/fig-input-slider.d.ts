import type {
  FigInputSliderElement,
  FigInputSliderState,
} from "./index.js";

export interface FigInputSliderAttributeSchema {
  readonly label: string;
  readonly type: "string" | "number" | "boolean" | "enum";
  readonly options?: readonly string[];
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly boolMode?: string;
  readonly defaultChecked?: boolean;
}

export type FigInputSliderSchema = Readonly<
  Record<string, FigInputSliderAttributeSchema>
>;

export declare const figInputSliderSchema: FigInputSliderSchema;
export declare const figInputSliderHueSchema: FigInputSliderSchema;
export declare const figInputSliderOpacitySchema: FigInputSliderSchema;
export declare const figInputSliderDeltaSchema: FigInputSliderSchema;
export declare const figInputSliderStepperSchema: FigInputSliderSchema;
export declare const figInputSliderWheelSchema: FigInputSliderSchema;

export declare class FigInputSlider
  extends HTMLElement
  implements FigInputSliderElement
{
  value: string;
  default: string;
  defaultValue: string;
  readonly isDefault: boolean;
  disabled: boolean;
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

export declare class FigInputSliderHue extends FigInputSlider {}
export declare class FigInputSliderOpacity extends FigInputSlider {}
export declare class FigInputSliderDelta extends FigInputSlider {}
export declare class FigInputSliderStepper extends FigInputSlider {}
export declare class FigInputSliderWheel extends FigInputSlider {}
