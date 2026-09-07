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
      "fig-select": FigAttrs;
      "fig-select-options": FigAttrs;
      "fig-select-option": FigAttrs;
      "fig-dropdown": FigAttrs;
      "fig-options": FigAttrs;
      "fig-segmented-control": FigAttrs;
      "fig-segment": FigAttrs;
      "fig-group": FigAttrs;
      "fig-content": FigAttrs;
      "fig-media": FigAttrs;
      "fig-image": FigAttrs;
      "fig-card": FigAttrs;
      "fig-video": FigAttrs;
      "fig-input-color": FigAttrs;
      "fig-input-palette": FigAttrs;
      "fig-input-gradient": FigAttrs;
      "fig-input-fill": FigAttrs;
      "fig-input-angle": FigAttrs;
      "fig-input-wheel": FigAttrs;
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
      "fig-ai-prompt": FigAttrs;
      "fig-ai-context": FigAttrs;
      "fig-attachment": FigAttrs;
      "fig-attachments": FigAttrs;
      "fig-chat-message": FigAttrs;
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
