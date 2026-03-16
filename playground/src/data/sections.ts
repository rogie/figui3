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

export const propkitSections: Section[] = [
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
        name: "Solid",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"solid","color":"#667eea"}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "linear-gradient-cool",
        name: "Linear Gradient",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"position":0,"color":"#667eea","opacity":100},{"position":100,"color":"#764ba2","opacity":100}]}}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "radial-gradient-coral",
        name: "Radial Gradient",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"radial","centerX":50,"centerY":50,"stops":[{"position":0,"color":"#ff6b6b","opacity":100},{"position":100,"color":"#4ecdc4","opacity":100}]}}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "angular-gradient-rainbow",
        name: "Angular Gradient",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"angular","stops":[{"position":0,"color":"#ff0000","opacity":100},{"position":33,"color":"#00ff00","opacity":100},{"position":66,"color":"#0000ff","opacity":100},{"position":100,"color":"#ff0000","opacity":100}]}}' experimental="modern"></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "image-opaque",
        name: "Image",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Fill</label>
    <fig-input-fill value='{"type":"image","image":{"url":"${squareUrl()}","scaleMode":"fill","scale":50,"opacity":1}}' alpha="false" experimental="modern"></fig-input-fill>
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
    <fig-slider value="50" min="0" max="100" text="false" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "opacity-with-text",
        name: "Opacity",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Opacity</label>
    <fig-slider type="opacity" value="0.75" color="#ff0000" units="%" text="false" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "hue-with-text",
        name: "Hue",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Hue</label>
    <fig-slider type="hue" value="180" text="false" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "stepper-with-text",
        name: "Stepper",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Steps</label>
    <fig-slider type="stepper" value="50" step="25" text="false" full>
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
    <fig-slider type="delta" value="0" default="0" step="0.25" min="-5" max="5" text="false" full>
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
    <fig-input-number value="50" min="0" max="100" step="0.5"></fig-input-number>
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
      {
        id: "indeterminate",
        name: "Indeterminate",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Visible</label>
    <fig-switch indeterminate="true"></fig-switch>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "dropdown",
    name: "Dropdown",
    description: "A dropdown select field for choosing from a set of options.",
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
      {
        id: "groups",
        name: "Groups",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Blend Mode</label>
    <fig-dropdown full experimental="modern">
      <optgroup label="">
        <option selected>Normal</option>
        <option>Multiply</option>
        <option>Screen</option>
      </optgroup>
      <optgroup label="">
        <option>Overlay</option>
        <option>Darken</option>
        <option>Lighten</option>
      </optgroup>
    </fig-dropdown>
  </fig-field>
</div>`,
      },
      {
        id: "labelled-groups",
        name: "Labelled groups",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Blend Mode</label>
    <fig-dropdown full experimental="modern">
      <optgroup label="Basic">
        <option selected>Normal</option>
        <option>Multiply</option>
        <option>Screen</option>
      </optgroup>
      <optgroup label="Advanced">
        <option>Overlay</option>
        <option>Darken</option>
        <option>Lighten</option>
      </optgroup>
    </fig-dropdown>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "segment",
    name: "Segmented control",
    description: "A segmented control for mutually exclusive choices.",
    examples: [
      {
        id: "default",
        name: "Text",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Align</label>
    <fig-segmented-control full data-playground-hide-attrs="value,name">
      <fig-segment value="left" selected>Left</fig-segment>
      <fig-segment value="center">Center</fig-segment>
      <fig-segment value="right">Right</fig-segment>
    </fig-segmented-control>
  </fig-field>
</div>`,
      },
      {
        id: "icons",
        name: "Icons",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Theme</label>
    <fig-segmented-control full data-playground-hide-attrs="value,name">
      <fig-segment value="light" selected>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C12.2761 5 12.5 5.22386 12.5 5.5V6.5C12.5 6.77614 12.2761 7 12 7C11.7239 7 11.5 6.77614 11.5 6.5V5.5C11.5 5.22386 11.7239 5 12 5ZM16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12ZM12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15ZM7.75687 7.05026C7.56161 6.85499 7.24503 6.85499 7.04977 7.05026C6.8545 7.24552 6.8545 7.5621 7.04977 7.75736L7.75687 8.46447C7.95214 8.65973 8.26872 8.65973 8.46398 8.46447C8.65924 8.26921 8.65924 7.95262 8.46398 7.75736L7.75687 7.05026ZM19 12C19 12.2761 18.7761 12.5 18.5 12.5H17.5C17.2239 12.5 17 12.2761 17 12C17 11.7239 17.2239 11.5 17.5 11.5H18.5C18.7761 11.5 19 11.7239 19 12ZM16.9502 7.75736C17.1455 7.5621 17.1455 7.24552 16.9502 7.05026C16.755 6.85499 16.4384 6.85499 16.2431 7.05026L15.536 7.75736C15.3408 7.95262 15.3408 8.26921 15.536 8.46447C15.7313 8.65973 16.0479 8.65973 16.2431 8.46447L16.9502 7.75736ZM12 17C12.2761 17 12.5 17.2239 12.5 17.5V18.5C12.5 18.7761 12.2761 19 12 19C11.7239 19 11.5 18.7761 11.5 18.5V17.5C11.5 17.2239 11.7239 17 12 17ZM16.2422 15.5356C16.047 15.3403 15.7304 15.3403 15.5351 15.5356C15.3399 15.7309 15.3399 16.0475 15.5351 16.2427L16.2422 16.9498C16.4375 17.1451 16.7541 17.1451 16.9493 16.9498C17.1446 16.7546 17.1446 16.438 16.9493 16.2427L16.2422 15.5356ZM7 12C7 12.2761 6.77614 12.5 6.5 12.5H5.5C5.22386 12.5 5 12.2761 5 12C5 11.7239 5.22386 11.5 5.5 11.5H6.5C6.77614 11.5 7 11.7239 7 12ZM8.46488 16.2427C8.66014 16.0475 8.66014 15.7309 8.46488 15.5356C8.26962 15.3403 7.95304 15.3403 7.75777 15.5356L7.05067 16.2427C6.85541 16.438 6.85541 16.7546 7.05067 16.9498C7.24593 17.1451 7.56251 17.1451 7.75777 16.9498L8.46488 16.2427Z" fill="currentColor"/>
        </svg>
      </fig-segment>
      <fig-segment value="dark">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M15 14.9999C15.3647 14.9999 15.7224 14.9672 16.0703 14.9045C15.1624 16.1743 13.677 16.9997 12 16.9997C9.23858 16.9997 7 14.7611 7 11.9997C7 10.3226 7.82546 8.8371 9.09542 7.92923C9.03267 8.27722 9 8.63509 9 8.99986C9 12.3136 11.6863 14.9999 15 14.9999ZM17.3039 14.8075C17.6193 14.2129 16.8933 13.678 16.2412 13.8446C15.8443 13.946 15.4285 13.9999 15 13.9999C12.2386 13.9999 10 11.7613 10 8.99986C10 8.57132 10.0539 8.15537 10.1553 7.75842C10.3219 7.10631 9.78711 6.38032 9.19252 6.6957C7.29348 7.70298 6 9.70029 6 11.9997C6 15.3134 8.68629 17.9997 12 17.9997C14.2993 17.9997 16.2965 16.7064 17.3039 14.8075ZM16 7.49993C16 7.22379 15.7761 6.99993 15.5 6.99993C15.2239 6.99993 15 7.22379 15 7.49993V7.99993H14.5C14.2239 7.99993 14 8.22379 14 8.49993C14 8.77607 14.2239 8.99993 14.5 8.99993H15V9.49993C15 9.77607 15.2239 9.99993 15.5 9.99993C15.7761 9.99993 16 9.77607 16 9.49993V8.99993H16.5C16.7761 8.99993 17 8.77607 17 8.49993C17 8.22379 16.7761 7.99993 16.5 7.99993H16V7.49993Z" fill="currentColor"/>
        </svg>
      </fig-segment>
    </fig-segmented-control>
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
    ],
  },
  {
    id: "origin-grid",
    name: "Origin Grid",
    description:
      "A 3x3 transform-origin selector with draggable point selection and XY values.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Origin</label>
    <fig-origin-grid value="50% 50%" drag="true" fields="true"></fig-origin-grid>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "joystick",
    name: "Joystick",
    description: "A 2D position control with optional coordinate modes.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal">
    <label>Position</label>
    <fig-joystick value="50% 50%" axis-labels="X Y"></fig-joystick>
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
  {
    id: "chooser",
    name: "Chooser",
    description:
      "A selection list for picking from a set of rich choice options.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="vertical">
    <label>Style</label>
    <fig-chooser layout="horizontal" value="img-a" full drag style="max-width: 100%">
      <fig-choice value="img-a" selected><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-b"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-c"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-d"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-e"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-f"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>
    </fig-chooser>
  </fig-field>
</div>`,
      },
    ],
  },
];

export const sections = propkitSections;
