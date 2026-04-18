/* eslint-disable @typescript-eslint/no-explicit-any */
import "react";

type FigAttrs = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  [key: string]: any;
};

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "fig-field": FigAttrs;
      "fig-slider": FigAttrs;
      "fig-switch": FigAttrs;
      "fig-input-text": FigAttrs;
      "fig-input-color": FigAttrs;
      "fig-input-number": FigAttrs;
      "fig-dropdown": FigAttrs;
      "fig-content": FigAttrs;
      "fig-header": FigAttrs;
      "fig-button": FigAttrs;
      "fig-segmented-control": FigAttrs;
      "fig-segment": FigAttrs;
    }
  }
}
