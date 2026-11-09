import type { PropsKitConfig } from "../../../types/propskit";
import type {
  PropsKitDialogPresentation,
  PropsKitExample,
} from "./propskitSections";

interface DialogExampleOptions {
  title: string;
  triggerLabel: string;
  config: PropsKitConfig;
  width?: number;
  footer: PropsKitDialogPresentation["footer"];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createDialogExample({
  title,
  triggerLabel,
  config,
  width = 300,
  footer,
}: DialogExampleOptions): PropsKitExample {
  const serializedConfig = JSON.stringify(config, null, 2);
  const footerMarkup = footer?.length
    ? `
  <fig-footer>
${footer
  .map(
    (action) =>
      `    <fig-button${action.variant ? ` variant="${action.variant}"` : ""}${action.close ? " close-dialog" : ""}>${escapeHtml(action.label)}</fig-button>`,
  )
  .join("\n")}
  </fig-footer>`
    : "";
  return {
    id: "default",
    name: "Default",
    title,
    panelName: null,
    description: "",
    markup: `<fig-button id="open-props-dialog">${escapeHtml(triggerLabel)}</fig-button>
<dialog
  id="props-dialog"
  is="fig-dialog"
  title="${escapeHtml(title)}"
  handle="fig-header"
  position="center center"
  style="width: ${width}px"
>
  <fig-content id="props-dialog-content"></fig-content>${footerMarkup}
</dialog>

<script type="module">
import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps(null, ${serializedConfig})
figCreatePropsRoot({
  target: "#props-dialog-content",
  panelIds: [kit.id]
})

const dialog = document.querySelector("#props-dialog")
document
  .querySelector("#open-props-dialog")
  .addEventListener("click", () => dialog.show())
dialog.show()
</script>`,
    createConfig: () => config,
    lang: "html",
    dialog: {
      title,
      triggerLabel,
      width,
      footer,
    },
  };
}

export const propskitDialogExamples: Record<string, PropsKitExample> = {
  "dialog-rename": createDialogExample({
    title: "Rename Layer",
    triggerLabel: "Open Rename",
    config: {
      name: {
        type: "text",
        default: "Frame 1",
      },
    },
    footer: [
      { label: "Cancel", variant: "secondary", close: true },
      { label: "Rename" },
    ],
  }),
  "dialog-shadow": createDialogExample({
    title: "Shadow",
    triggerLabel: "Open Shadow",
    config: {
      x: {
        type: "number",
        control: "number",
        default: 0,
      },
      y: {
        type: "number",
        control: "number",
        default: 4,
      },
      color: {
        type: "color",
        default: "#000000",
        text: true,
        alpha: true,
      },
      blur: {
        type: "number",
        default: 8,
        min: 0,
        max: 64,
        units: "px",
      },
      spread: {
        type: "number",
        default: 0,
        min: -32,
        max: 32,
        units: "px",
      },
    },
    footer: [{ label: "Apply" }],
  }),
  "dialog-blur": createDialogExample({
    title: "Progressive Blur",
    triggerLabel: "Open Blur",
    config: {
      amount: {
        type: "number",
        default: 12,
        min: 0,
        max: 64,
        units: "px",
      },
      fadeStart: {
        type: "number",
        label: "Fade start",
        default: 20,
        min: 0,
        max: 100,
        units: "%",
      },
      fadeEnd: {
        type: "number",
        label: "Fade end",
        default: 80,
        min: 0,
        max: 100,
        units: "%",
      },
      direction: {
        type: "options",
        default: "Top to bottom",
        options: [
          "Top to bottom",
          "Bottom to top",
          "Left to right",
          "Right to left",
        ],
      },
    },
    footer: [
      { label: "Cancel", variant: "secondary", close: true },
      { label: "Apply" },
    ],
  }),
  "dialog-photo-stack": createDialogExample({
    title: "Photo Stack",
    triggerLabel: "Open Photo Stack",
    config: {
      title: "Japan",
      subtitle: "December 2025",
      shadowTint: {
        type: "color",
        label: "Shadow Tint",
        default: "#000000",
        text: true,
      },
      photoShape: {
        type: "options",
        label: "Photo Shape",
        default: "Portrait",
        options: ["Portrait", "Landscape", "Square"],
      },
      backPhoto: {
        _label: "Back Photo",
        offsetX: {
          type: "number",
          label: "Offset X",
          variant: "delta",
          default: 239,
          min: -500,
          max: 500,
        },
        offsetY: {
          type: "number",
          label: "Offset Y",
          variant: "delta",
          default: 0,
          min: -500,
          max: 500,
        },
        scale: {
          type: "number",
          default: 0.7,
          min: 0,
          max: 2,
          step: 0.01,
        },
        overlayOpacity: {
          type: "number",
          label: "Overlay Opacity",
          variant: "opacity",
          default: 0.6,
          min: 0,
          max: 1,
          step: 0.01,
          color: "#000000",
        },
      },
      shadow: {
        scale: {
          type: "number",
          default: 1.03,
          min: 0,
          max: 2,
          step: 0.01,
        },
        opacity: {
          type: "number",
          variant: "opacity",
          default: 0.25,
          min: 0,
          max: 1,
          step: 0.01,
          color: "#000000",
        },
        blur: {
          type: "number",
          default: 14,
          min: 0,
          max: 64,
          units: "px",
        },
        yOffset: {
          type: "number",
          label: "Y Offset",
          variant: "delta",
          default: 8,
          min: -50,
          max: 50,
        },
      },
      transitionSpring: {
        _label: "Transition Spring",
        type: {
          type: "options",
          default: "Time",
          options: ["Time", "Physics"],
        },
        duration: {
          type: "number",
          default: 0.5,
          min: 0,
          max: 2,
          step: 0.01,
          units: "s",
        },
        bounce: {
          type: "number",
          default: 0.04,
          min: 0,
          max: 1,
          step: 0.01,
        },
      },
      darkMode: {
        type: "switch",
        label: "Dark Mode",
        default: true,
      },
    },
    footer: [{ label: "Next" }],
  }),
  "dialog-export": createDialogExample({
    title: "Export Settings",
    triggerLabel: "Open Export",
    config: {
      format: {
        format: {
          type: "options",
          default: "PNG",
          options: ["PNG", "SVG", "PDF"],
        },
        quality: {
          type: "options",
          default: "Medium",
          options: ["Low", "Medium", "High", "Maximum"],
        },
        scale: {
          type: "number",
          default: 2,
          min: 1,
          max: 4,
          step: 0.5,
          units: "x",
        },
      },
      output: {
        filename: "design-export",
        metadata: true,
        flattenLayers: {
          type: "switch",
          label: "Flatten layers",
          default: false,
        },
      },
    },
    footer: [
      { label: "Cancel", variant: "secondary", close: true },
      { label: "Export" },
    ],
  }),
  "dialog-token-editor": createDialogExample({
    title: "Design Token Editor",
    triggerLabel: "Open Token Editor",
    config: {
      token: {
        name: "color-primary",
        description: "Primary brand color",
        type: {
          type: "options",
          default: "Color",
          options: ["Color", "Spacing", "Typography", "Border radius"],
        },
      },
      value: {
        color: {
          type: "color",
          default: "#0D99FF",
          text: true,
          alpha: true,
        },
        opacity: {
          type: "number",
          variant: "opacity",
          default: 1,
          min: 0,
          max: 1,
          step: 0.01,
          units: "%",
          color: "#0D99FF",
        },
        cssVariable: {
          type: "text",
          label: "CSS variable",
          default: "--color-primary",
        },
      },
      variants: {
        palette: {
          type: "palette",
          default: ["#0D99FF", "#0B7FD4", "#0966AA", "#074D80"],
        },
        mode: {
          type: "options",
          default: "Light",
          options: ["Light", "Dark"],
        },
        autoGenerate: {
          type: "switch",
          label: "Auto-generate",
          default: true,
        },
      },
      usage: {
        preview: {
          type: "image",
          default: "",
        },
        publish: false,
      },
    },
    footer: [
      { label: "Discard", variant: "secondary", close: true },
      { label: "Save Token" },
    ],
  }),
};
