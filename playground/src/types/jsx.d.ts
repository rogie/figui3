/* The playground has its own React installation; reuse the package tag map
   while augmenting that local React module. */
import "react";
import type { FigTagNameMap } from "../../../types/index";

type PlaygroundFigProps<T extends HTMLElement> = Omit<
  React.DetailedHTMLProps<React.HTMLAttributes<T>, T>,
  "ref"
> & {
  ref?: React.Ref<T> | React.Ref<HTMLElement>;
  [attribute: string]: unknown;
};

type PlaygroundFigElements = {
  [K in keyof FigTagNameMap]: PlaygroundFigProps<FigTagNameMap[K]>;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends PlaygroundFigElements {}
  }

  interface HTMLAttributes<T> {
    is?: string;
  }

  interface DialogHTMLAttributes<T> {
    position?: string;
    offset?: string;
    duration?: string | number;
    theme?: string;
  }
}
