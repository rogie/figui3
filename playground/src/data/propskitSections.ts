import type { PropsKitConfig } from "../../../types/propskit";

export interface PropsKitExample {
  id: string;
  name: string;
  title: string;
  panelName: string | null;
  description: string;
  markup: string;
  createConfig: () => PropsKitConfig;
  lang?: "html" | "javascript";
  dialog?: PropsKitDialogPresentation;
}

export interface PropsKitDialogPresentation {
  title: string;
  triggerLabel: string;
  width?: number;
  footer?: Array<{
    label: string;
    variant?: "primary" | "secondary" | "ghost" | "naked";
    close?: boolean;
  }>;
}

export interface PropsKitSection {
  id: string;
  name: string;
  description: string;
  group: string;
  examples: PropsKitExample[];
}

const basicsSource = `import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps("Appearance", {
  opacity: 75,
  width: {
    type: "number",
    control: "number",
    default: 320,
    min: 0,
    units: "px"
  },
  visible: true,
  title: "Hello",
  description: {
    type: "text",
    default: "",
    placeholder: "Add description",
    multiline: true,
    autoresize: true
  },
  accent: "#0D99FF",
  alignment: {
    type: "options",
    default: "Center",
    options: ["Left", "Center", "Right"]
  }
})

figCreatePropsRoot({
  target: "#properties",
  panelIds: [kit.id]
})
kit.subscribe(values => console.log(values))`;

const numberSource = `import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps(null, {
  sliders: {
    range: 50,
    bounded: [75, 0, 100, 1],
    delta: {
      type: "number",
      control: "slider",
      variant: "delta",
      default: 0
    },
    stepper: {
      type: "number",
      control: "slider",
      stepper: true,
      default: 50,
      step: 25
    }
  },
  numbers: {
    withStepper: {
      type: "number",
      label: "Stepper",
      control: "number",
      default: 16,
      units: "px"
    },
    withoutStepper: {
      type: "number",
      label: "Without",
      control: "number",
      stepper: false,
      default: 16,
      units: "px"
    }
  }
})

figCreatePropsRoot({
  target: "#properties",
  panelIds: [kit.id]
})`;

const colorSource = `import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps("Colors", {
  color: {
    type: "color",
    default: "#0D99FF",
    alpha: false
  }
})

figCreatePropsRoot({
  target: "#properties",
  panelIds: [kit.id]
})`;

const colorAlphaSource = `import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps("Colors", {
  color: {
    type: "color",
    default: "#00000080",
    alpha: true
  }
})

figCreatePropsRoot({
  target: "#properties",
  panelIds: [kit.id]
})`;

function createToggleSource(value: boolean): string {
  return `import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps("Toggle", {
  enabled: ${value}
})

figCreatePropsRoot({
  target: "#properties",
  panelIds: [kit.id]
})`;
}

function createTextSource(config: string): string {
  return `import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps("Text", ${config})

figCreatePropsRoot({
  target: "#properties",
  panelIds: [kit.id]
})`;
}

const singleLineTextSource = createTextSource(`{
  text: "Hello"
}`);

const multilineTextSource = createTextSource(`{
  description: {
    type: "text",
    default: "Write a longer description here.",
    multiline: true,
    autoresize: true
  }
}`);

const groupsSource = `import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps("Transform", {
  position: {
    _label: "Position",
    x: { type: "number", control: "number", default: 0 },
    y: { type: "number", control: "number", default: 0 }
  },
  appearance: {
    _collapsed: true,
    opacity: [100, 0, 100, 1],
    easing: {
      type: "easing",
      default: "0.42, 0, 0.58, 1"
    }
  }
})

figCreatePropsRoot({
  target: "#properties",
  panelIds: [kit.id]
})`;

function createMediaSource(panelName: string, config: string): string {
  return `import {
  figCreateProps,
  figCreatePropsRoot
} from "@rogieking/figui3/propskit.js"

const kit = figCreateProps("${panelName}", ${config})

figCreatePropsRoot({
  target: "#properties",
  panelIds: [kit.id]
})`;
}

const imageEmptySource = createMediaSource("Image", `{
  image: {
    type: "image"
  }
}`);

const imageSource = createMediaSource("Image", `{
  image: {
    type: "image",
    default: "https://picsum.photos/id/106/640/480.webp"
  }
}`);

const imagesSource = createMediaSource("Images", `{
  images: {
    type: "image",
    options: [
      "https://picsum.photos/id/237/640/480.webp",
      {
        value: "https://picsum.photos/id/1025/640/480.webp",
        label: "Dog portrait"
      },
      "https://picsum.photos/id/106/640/480.webp",
      "https://picsum.photos/id/1084/640/480.webp",
      "https://picsum.photos/id/1035/640/480.webp"
    ]
  }
}`);

const videoEmptySource = createMediaSource("Video", `{
  video: {
    type: "video"
  }
}`);

const videoSource = createMediaSource("Video", `{
  video: {
    type: "video",
    default: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
  }
}`);

const videosSource = createMediaSource("Videos", `{
  videos: {
    type: "video",
    options: [
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
      "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
      "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
      "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4"
    ]
  }
}`);

const audioEmptySource = createMediaSource("Audio", `{
  audio: {
    type: "audio"
  }
}`);

const audioUrlSource = createMediaSource("Audio", `{
  audio: {
    type: "audio",
    default: "/audio/skrillex-ft-elliphant.mp3"
  }
}`);

export const propskitSections: PropsKitSection[] = [
  {
    id: "quick-start",
    name: "Quick start",
    description: "Infer controls from simple values and subscribe to nested state.",
    group: "Getting started",
    examples: [
      {
        id: "default",
        name: "Default",
        title: "Quick start",
        panelName: "Appearance",
        description:
          "Primitive values infer controls; explicit definitions select renderers and attributes.",
        markup: basicsSource,
        createConfig: () => ({
          opacity: 75,
          width: {
            type: "number",
            control: "number",
            default: 320,
            min: 0,
            units: "px",
          },
          visible: true,
          title: "Hello",
          description: {
            type: "text",
            default: "",
            placeholder: "Add description",
            multiline: true,
            autoresize: true,
          },
          accent: "#0D99FF",
          alignment: {
            type: "options",
            default: "Center",
            options: ["Left", "Center", "Right"],
          },
        }),
      },
    ],
  },
  {
    id: "numbers",
    name: "Numbers",
    description: "Use one number type with slider and numeric-input renderers.",
    group: "Getting started",
    examples: [
      {
        id: "variants",
        name: "Variants",
        title: "Number variants",
        panelName: null,
        description:
          "Sliders and exact number inputs use separate groups; number steppers are on unless disabled.",
        markup: numberSource,
        createConfig: () => ({
          sliders: {
            range: 50,
            bounded: [75, 0, 100, 1],
            delta: {
              type: "number",
              control: "slider",
              variant: "delta",
              default: 0,
            },
            stepper: {
              type: "number",
              control: "slider",
              stepper: true,
              default: 50,
              step: 25,
            },
          },
          numbers: {
            withStepper: {
              type: "number",
              label: "Stepper",
              control: "number",
              default: 16,
              units: "px",
            },
            withoutStepper: {
              type: "number",
              label: "Without",
              control: "number",
              stepper: false,
              default: 16,
              units: "px",
            },
          },
        }),
      },
    ],
  },
  {
    id: "colors",
    name: "Colors",
    description: "Infer color controls or enable alpha editing.",
    group: "Getting started",
    examples: [
      {
        id: "color",
        name: "Color",
        title: "Color",
        panelName: "Colors",
        description: "Set alpha to false for an opaque color input.",
        markup: colorSource,
        createConfig: () => ({
          color: {
            type: "color",
            default: "#0D99FF",
            alpha: false,
          },
        }),
      },
      {
        id: "alpha",
        name: "Color (alpha)",
        title: "Color with alpha",
        panelName: "Colors",
        description: "Enable alpha to edit color transparency.",
        markup: colorAlphaSource,
        createConfig: () => ({
          color: {
            type: "color",
            default: "#00000080",
            alpha: true,
          },
        }),
      },
    ],
  },
  {
    id: "toggles",
    name: "Toggle",
    description: "Boolean values render as toggle switches.",
    group: "Getting started",
    examples: [
      {
        id: "on",
        name: "On",
        title: "Toggle on",
        panelName: "Toggle",
        description: "A true boolean renders an enabled toggle.",
        markup: createToggleSource(true),
        createConfig: () => ({
          enabled: true,
        }),
      },
      {
        id: "off",
        name: "Off",
        title: "Toggle off",
        panelName: "Toggle",
        description: "A false boolean renders an off toggle.",
        markup: createToggleSource(false),
        createConfig: () => ({
          enabled: false,
        }),
      },
    ],
  },
  {
    id: "text",
    name: "Text",
    description: "Render single-line and multiline text inputs.",
    group: "Getting started",
    examples: [
      {
        id: "single-line",
        name: "Single line (Text)",
        title: "Single-line text",
        panelName: "Text",
        description: "A string value infers a single-line text input.",
        markup: singleLineTextSource,
        createConfig: () => ({
          text: "Hello",
        }),
      },
      {
        id: "multiline",
        name: "Multiline",
        title: "Multiline text",
        panelName: "Text",
        description:
          "An explicit text definition enables multiline, autoresizing input.",
        markup: multilineTextSource,
        createConfig: () => ({
          description: {
            type: "text",
            default: "Write a longer description here.",
            multiline: true,
            autoresize: true,
          },
        }),
      },
    ],
  },
  {
    id: "groups",
    name: "Groups",
    description:
      "Nested objects become fig-group sections; _collapsed opts into collapsing.",
    group: "Getting started",
    examples: [
      {
        id: "nested",
        name: "Nested",
        title: "Nested groups",
        panelName: "Transform",
        description:
          "Groups are static by default; add _collapsed to make one collapsible.",
        markup: groupsSource,
        createConfig: () => ({
          position: {
            _label: "Position",
            x: { type: "number", control: "number", default: 0 },
            y: { type: "number", control: "number", default: 0 },
          },
          appearance: {
            _collapsed: true,
            opacity: [100, 0, 100, 1],
            easing: {
              type: "easing",
              default: "0.42, 0, 0.58, 1",
            },
          },
        }),
      },
    ],
  },
  {
    id: "propskit-media",
    name: "Media",
    description: "Render media uploads and selectable image or video options.",
    group: "Getting started",
    examples: [
      {
        id: "image-empty",
        name: "Image (empty)",
        title: "Empty image",
        panelName: "Image",
        description: "Render an image upload without an initial source.",
        markup: imageEmptySource,
        createConfig: () => ({
          image: {
            type: "image",
          },
        }),
      },
      {
        id: "image",
        name: "Image",
        title: "Image",
        panelName: "Image",
        description: "Render an image control with an initial source.",
        markup: imageSource,
        createConfig: () => ({
          image: {
            type: "image",
            default: "https://picsum.photos/id/106/640/480.webp",
          },
        }),
      },
      {
        id: "images",
        name: "Images",
        title: "Image options",
        panelName: "Images",
        description:
          "Image options render a chooser and return the selected source.",
        markup: imagesSource,
        createConfig: () => ({
          images: {
            type: "image",
            options: [
              "https://picsum.photos/id/237/640/480.webp",
              {
                value: "https://picsum.photos/id/1025/640/480.webp",
                label: "Dog portrait",
              },
              "https://picsum.photos/id/106/640/480.webp",
              "https://picsum.photos/id/1084/640/480.webp",
              "https://picsum.photos/id/1035/640/480.webp",
            ],
          },
        }),
      },
      {
        id: "video-empty",
        name: "Video (empty)",
        title: "Empty video",
        panelName: "Video",
        description: "Render a video upload without an initial source.",
        markup: videoEmptySource,
        createConfig: () => ({
          video: {
            type: "video",
          },
        }),
      },
      {
        id: "video",
        name: "Video",
        title: "Video",
        panelName: "Video",
        description: "Render a video control with an initial source.",
        markup: videoSource,
        createConfig: () => ({
          video: {
            type: "video",
            default:
              "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          },
        }),
      },
      {
        id: "videos",
        name: "Videos",
        title: "Video options",
        panelName: "Videos",
        description:
          "Video options render a chooser and return the selected source.",
        markup: videosSource,
        createConfig: () => ({
          videos: {
            type: "video",
            options: [
              "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
              "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
              "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
              "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
              "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
            ],
          },
        }),
      },
      {
        id: "audio-empty",
        name: "Audio (empty)",
        title: "Empty audio",
        panelName: "Audio",
        description: "Render an audio upload without an initial source.",
        markup: audioEmptySource,
        createConfig: () => ({
          audio: {
            type: "audio",
          },
        }),
      },
      {
        id: "audio-url",
        name: "Audio (with URL)",
        title: "Audio with URL",
        panelName: "Audio",
        description: "Render an audio control with an initial URL.",
        markup: audioUrlSource,
        createConfig: () => ({
          audio: {
            type: "audio",
            default: "/audio/skrillex-ft-elliphant.mp3",
          },
        }),
      },
    ],
  },
];
