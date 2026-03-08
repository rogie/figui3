import { portraitUrl, landscapeUrl, squareUrl } from "../lib/images";

export interface Example {
  id: string;
  name: string;
  markup: string;
}

export interface Section {
  id: string;
  name: string;
  description: string;
  examples: Example[];
}

export const sections: Section[] = [
  {
    id: "image",
    name: "Image",
    description:
      "An image upload field for selecting or previewing image assets.",
    examples: [
      {
        id: "upload-empty",
        name: "Upload (Empty)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Image</label>
    <fig-image full="true" upload="true" label="Upload" size="auto"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "upload-with-image",
        name: "Upload (With Image)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Image</label>
    <fig-image full="true" upload="true" src="${portraitUrl()}" size="auto"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "auto-aspect-ratio",
        name: "Auto Aspect Ratio",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Image</label>
    <fig-image full="true" src="${portraitUrl()}" aspect-ratio="auto"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "cover-portrait",
        name: "Cover (Portrait)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Portrait</label>
    <fig-image full="true" src="${portraitUrl()}" fit="cover" size="auto" aspect-ratio="4/3"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "cover-landscape",
        name: "Cover (Landscape)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Landscape</label>
    <fig-image full="true" src="${landscapeUrl()}" fit="cover" size="auto" aspect-ratio="4/3"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "contain-portrait",
        name: "Contain (Portrait)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Portrait</label>
    <fig-image full="true" src="${portraitUrl()}" fit="contain" size="auto" aspect-ratio="4/3"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "contain-landscape",
        name: "Contain (Landscape)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Landscape</label>
    <fig-image full="true" src="${landscapeUrl()}" fit="contain" size="auto" aspect-ratio="4/3"></fig-image>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "color",
    name: "Color",
    description:
      "A solid color picker field with hex input and optional alpha.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Color</label>
    <fig-input-color value="#0D99FF" text="true" picker="figma" picker-anchor="self" full></fig-input-color>
  </fig-field>
</div>`,
      },
      {
        id: "with-alpha",
        name: "With Alpha",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Color</label>
    <fig-input-color value="#0D99FF80" text="true" alpha="true" picker="figma" picker-anchor="self" full></fig-input-color>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "fill",
    name: "Fill",
    description:
      "A multi-mode fill field supporting solid, gradient, and image fills.",
    examples: [
      {
        id: "solid-alpha",
        name: "Solid (Alpha)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"solid","color":"#667eea"}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "solid-no-alpha",
        name: "Solid (No Alpha)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"solid","color":"#667eea"}' alpha="false" experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "linear-gradient-cool",
        name: "Linear Gradient (Cool)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"position":0,"color":"#667eea","opacity":100},{"position":100,"color":"#764ba2","opacity":100}]}}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "radial-gradient-coral",
        name: "Radial Gradient (Coral)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"radial","centerX":50,"centerY":50,"stops":[{"position":0,"color":"#ff6b6b","opacity":100},{"position":100,"color":"#4ecdc4","opacity":100}]}}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "angular-gradient-rainbow",
        name: "Angular Gradient (Rainbow)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"angular","stops":[{"position":0,"color":"#ff0000","opacity":100},{"position":33,"color":"#00ff00","opacity":100},{"position":66,"color":"#0000ff","opacity":100},{"position":100,"color":"#ff0000","opacity":100}]}}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "image-opaque",
        name: "Image (Opaque)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"image","image":{"url":"${squareUrl()}","scaleMode":"fill","scale":50,"opacity":1}}' alpha="false" experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "image-semi-transparent",
        name: "Image (50% Opacity)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"image","image":{"url":"${squareUrl()}","scaleMode":"fill","scale":50,"opacity":0.5}}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "slider",
    name: "Slider",
    description:
      "A range slider with optional text input for precise numeric values.",
    examples: [
      {
        id: "range",
        name: "Range",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Amount</label>
    <fig-slider value="50" min="0" max="100" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "default-with-text",
        name: "Range (Number Input)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Amount</label>
    <fig-slider value="50" min="0" max="100" text="true" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "units-with-text",
        name: "Units",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Opacity</label>
    <fig-slider value="75" min="0" max="100" text="true" units="%" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "opacity-with-text",
        name: "Opacity",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Opacity</label>
    <fig-slider type="opacity" value="0.75" color="#ff0000" units="%" text="true" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "hue-with-text",
        name: "Hue",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Hue</label>
    <fig-slider type="hue" value="180" text="true" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "stepper-with-text",
        name: "Stepper",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Steps</label>
    <fig-slider type="stepper" value="50" step="25" text="true" full>
      <datalist>
        <option value="0"></option>
        <option value="25"></option>
        <option value="50"></option>
        <option value="75"></option>
        <option value="100"></option>
      </datalist>
    </fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "delta-with-text",
        name: "Delta",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Offset</label>
    <fig-slider type="delta" value="0" default="0" step="0.25" min="-5" max="5" text="true" full>
      <datalist>
        <option value="0"></option>
      </datalist>
    </fig-slider>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "number",
    name: "Number",
    description:
      "A numeric input field for precise typed values with optional units and bounds.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Amount</label>
    <fig-input-number value="50"></fig-input-number>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "switch",
    name: "Switch",
    description: "A toggle switch for boolean on/off properties.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Visible</label>
    <fig-switch checked="true"></fig-switch>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "dropdown",
    name: "Dropdown",
    description:
      "A dropdown select field for choosing from a set of options.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Blend Mode</label>
    <fig-dropdown full experimental="modern">
      <option selected>Normal</option>
      <option>Multiply</option>
      <option>Screen</option>
      <option>Overlay</option>
      <option>Darken</option>
      <option>Lighten</option>
    </fig-dropdown>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "segment",
    name: "Segment",
    description: "A segmented control for mutually exclusive choices.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Align</label>
    <fig-segmented-control full>
      <fig-segment value="left" selected>Left</fig-segment>
      <fig-segment value="center">Center</fig-segment>
      <fig-segment value="right">Right</fig-segment>
    </fig-segmented-control>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "dial",
    name: "Dial",
    description:
      "A rotary dial for continuous value input. <em>Not yet built.</em>",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Amount</label>
    <div class="placeholder-field">fig-input-dial</div>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "easing",
    name: "Easing Curve",
    description:
      "A bezier curve editor for animation easing with preset dropdown.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Easing</label>
    <fig-easing-curve value="0.42, 0, 0.58, 1" dropdown="true"></fig-easing-curve>
  </fig-field>
</div>`,
      },
      {
        id: "no-dropdown",
        name: "No Dropdown",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Easing</label>
    <fig-easing-curve value="0.25, 0.1, 0.25, 1"></fig-easing-curve>
  </fig-field>
</div>`,
      },
      {
        id: "16-9-horizontal",
        name: "16:9 Horizontal",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Easing</label>
    <fig-easing-curve value="0.25, 0.1, 0.25, 1" aspect-ratio="16/9"></fig-easing-curve>
  </fig-field>
</div>`,
      },
      {
        id: "no-label",
        name: "No Label",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <fig-easing-curve value="spring(250, 8, 1)" dropdown="true"></fig-easing-curve>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "3d-rotate",
    name: "3D Rotate",
    description:
      "An interactive 3D rotation control with a draggable cube preview.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
      {
        id: "16-9-horizontal",
        name: "16:9 Horizontal",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)" aspect-ratio="16/9"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
      {
        id: "4-3",
        name: "4:3",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)" aspect-ratio="4/3"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
      {
        id: "no-label",
        name: "No Label",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)" aspect-ratio="16/9"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
      {
        id: "fields-all-axes",
        name: "Fields (All Axes)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)" fields="rotateX,rotateY,rotateZ"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
      {
        id: "fields-y-only",
        name: "Fields (Y Only)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)" fields="rotateY"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
      {
        id: "fields-x-y",
        name: "Fields (X & Y)",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)" fields="rotateX,rotateY"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
      {
        id: "fields-16-9-preset",
        name: "Fields + 16:9 + Preset",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-3d-rotate value="rotateX(25deg) rotateY(-35deg) rotateZ(10deg)" fields="rotateX,rotateY,rotateZ" aspect-ratio="16/9"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
      {
        id: "fields-no-label",
        name: "Fields, No Label",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)" fields="rotateX,rotateY,rotateZ"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "angle",
    name: "Angle",
    description: "An angle input with a visual dial and numeric text field.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-input-angle value="45" text="true" full></fig-input-angle>
  </fig-field>
</div>`,
      },
    ],
  },
];
