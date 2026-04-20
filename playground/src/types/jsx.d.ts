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
      "fig-button": FigAttrs;
      "fig-switch": FigAttrs;
      "fig-layer": FigAttrs;
      "fig-field": FigAttrs;
      "fig-slider": FigAttrs;
      "fig-dropdown": FigAttrs;
      "fig-segmented-control": FigAttrs;
      "fig-segment": FigAttrs;
      "fig-image": FigAttrs;
      "fig-input-color": FigAttrs;
      "fig-input-gradient": FigAttrs;
      "fig-input-fill": FigAttrs;
      "fig-input-angle": FigAttrs;
      "fig-input-number": FigAttrs;
      "fig-easing-curve": FigAttrs;
      "fig-3d-rotate": FigAttrs;
      "fig-origin-grid": FigAttrs;
      "fig-avatar": FigAttrs;
      "fig-shimmer": FigAttrs;
      "fig-skeleton": FigAttrs;
      "fig-input-text": FigAttrs;
      "fig-joystick": FigAttrs;
      "fig-header": FigAttrs;
      "fig-toast": FigAttrs;
      "fig-tooltip": FigAttrs;
      "fig-handle": FigAttrs;
      dialog: React.DetailedHTMLProps<
        React.DialogHTMLAttributes<HTMLDialogElement>,
        HTMLDialogElement
      > & {
        is?: string;
        duration?: string;
        theme?: string;
        [key: string]: any;
      };
      hstack: FigAttrs;
    }
  }
}
