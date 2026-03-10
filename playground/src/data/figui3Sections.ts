import type { Section } from "./sections";

const randomAvatarId = Math.floor(Math.random() * 70) + 1;

function avatarServiceUrl(size: number): string {
  return `https://i.pravatar.cc/${size}?img=${randomAvatarId}`;
}

export const figui3Sections: Section[] = [
  {
    id: "button",
    name: "Button",
    description:
      "Buttons with variants and advanced behaviors like select menus.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button variant="primary">Primary</fig-button>
</div>`,
      },
    ],
  },
  {
    id: "avatar",
    name: "Avatar",
    description: "Profile avatar with image source and initials fallback.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-avatar src="${avatarServiceUrl(128)}" name="John Doe"></fig-avatar>
</div>`,
      },
    ],
  },
  {
    id: "tooltip",
    name: "Tooltip",
    description: "Contextual tooltip with hover or click trigger behavior.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-tooltip text="This is helpful info" action="hover">
    <fig-button>Hover me</fig-button>
  </fig-tooltip>
</div>`,
      },
    ],
  },
  {
    id: "dialog",
    name: "Dialog",
    description: "Modal dialog surface with optional drag and positioning.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Dialog</fig-button>
  <dialog is="fig-dialog" handle="fig-header" position="center center">
    <fig-header>
      <h3>Dialog Title</h3>
      <fig-tooltip text="Close">
        <fig-button variant="ghost" icon="true" close-dialog>
          <span class="fig-mask-icon" style="--icon: var(--icon-close)"></span>
        </fig-button>
      </fig-tooltip>
    </fig-header>
    <fig-content>
      <p>Dialog content</p>
    </fig-content>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dropdown",
    name: "Dropdown",
    description: "Select controls with native and modern dropdown behavior.",
    examples: [
      {
        id: "flat-options",
        name: "Flat options",
        markup: `<div class="prop-panel">
  <fig-dropdown>
    <option value="default" selected>Default</option>
    <option value="minimal">Minimal</option>
    <option value="neue">Neue</option>
  </fig-dropdown>
</div>`,
      },
      {
        id: "groups",
        name: "Groups",
        markup: `<div class="prop-panel">
  <fig-dropdown>
    <optgroup>
      <option value="draft" selected>Draft</option>
      <option value="review">In review</option>
    </optgroup>
    <optgroup>
      <option value="approved">Approved</option>
      <option value="archived">Archived</option>
    </optgroup>
  </fig-dropdown>
</div>`,
      },
      {
        id: "labelled-groups",
        name: "Labelled groups",
        markup: `<div class="prop-panel">
  <fig-dropdown>
    <optgroup label="Recent files">
      <option value="landing" selected>Landing page</option>
      <option value="onboarding">Onboarding</option>
    </optgroup>
    <optgroup label="Archived files">
      <option value="v1">Marketing site v1</option>
      <option value="legacy">Legacy checkout</option>
    </optgroup>
  </fig-dropdown>
</div>`,
      },
      {
        id: "modern",
        name: "Modern",
        markup: `<div class="prop-panel">
  <fig-dropdown experimental="modern">
    <option value="frame" selected>Frame</option>
    <option value="group">Group</option>
    <option value="component">Component</option>
  </fig-dropdown>
</div>`,
      },
    ],
  },
  {
    id: "fill-picker",
    name: "Fill Picker",
    description:
      "Comprehensive fill editor for solid, gradient, and image fills.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-fill-picker value='{"type":"solid","color":"#0D99FF"}'>
    <fig-chit background="#0D99FF"></fig-chit>
  </fig-fill-picker>
</div>`,
      },
    ],
  },
  {
    id: "chit",
    name: "Chit",
    description: "Color and gradient swatch display for fill previews.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-chit background="linear-gradient(135deg, #667eea, #764ba2)" alpha="0.8"></fig-chit>
</div>`,
      },
    ],
  },
  {
    id: "slider",
    name: "Slider",
    description:
      "Range controls with PropKit-style examples across slider types.",
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
    id: "combo-input",
    name: "Combo Input",
    description: "Input with suggestion dropdown from a fixed options list.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-combo-input options="House, Apartment, Condo, Townhouse, Other" placeholder="Type of residence"></fig-combo-input>
</div>`,
      },
    ],
  },
  {
    id: "text-input",
    name: "Text Input",
    description: "Single-line and numeric text inputs for direct entry.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-input-text value="Text here" placeholder="Placeholder text"></fig-input-text>
</div>`,
      },
    ],
  },
  {
    id: "number-input",
    name: "Number Input",
    description: "Precise numeric inputs with steppers, units, and bounds.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-input-number value="16" min="0" max="512" step="1" units="px"></fig-input-number>
</div>`,
      },
    ],
  },
  {
    id: "color-input",
    name: "Color Input",
    description: "Color fields with text, alpha, and picker integration.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-input-color value="#0D99FF" text="true" alpha="true"></fig-input-color>
</div>`,
      },
    ],
  },
  {
    id: "fill-input",
    name: "Fill Input",
    description: "Fill controls for solid, gradient, and image fills.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-input-fill value='{"type":"solid","color":"#667eea"}'></fig-input-fill>
</div>`,
      },
    ],
  },
  {
    id: "switch",
    name: "Switch",
    description: "Boolean toggle controls for on/off states.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-switch></fig-switch>
</div>`,
      },
    ],
  },
  {
    id: "checkbox",
    name: "Checkbox",
    description: "Checkbox controls with checked and indeterminate states.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-checkbox checked="true"></fig-checkbox>
</div>`,
      },
    ],
  },
  {
    id: "radio",
    name: "Radio",
    description: "Radio input for mutually exclusive option selection.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-radio name="size" value="medium" checked>Medium</fig-radio>
</div>`,
      },
    ],
  },
  {
    id: "field",
    name: "Field",
    description: "Field wrapper for label + control layout and accessibility.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field direction="horizontal" data-playground-field-only-controls="true">
    <label>Label</label>
    <fig-slider></fig-slider>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "segmented-control",
    name: "Segmented Control",
    description: "Segmented options for mutually exclusive selections.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-segmented-control>
    <fig-segment value="left" selected>Left</fig-segment>
    <fig-segment value="center">Center</fig-segment>
    <fig-segment value="right">Right</fig-segment>
  </fig-segmented-control>
</div>`,
      },
    ],
  },
  {
    id: "tabs",
    name: "Tabs",
    description: "Tab interfaces for organizing grouped content panes.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-tabs value="general">
    <fig-tab value="general" label="General">General content</fig-tab>
    <fig-tab value="advanced" label="Advanced">Advanced content</fig-tab>
  </fig-tabs>
</div>`,
      },
    ],
  },
  {
    id: "image",
    name: "Image",
    description: "Image previews with upload and download overlays.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-image upload="true" size="auto"></fig-image>
</div>`,
      },
    ],
  },
  {
    id: "input-angle",
    name: "Input Angle",
    description: "Angle editor with dial interaction and optional text value.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-input-angle value="45" text="true"></fig-input-angle>
</div>`,
      },
    ],
  },
  {
    id: "layer",
    name: "Layer",
    description: "Layer row examples with and without leading layer icons.",
    examples: [
      {
        id: "with-icon",
        name: "With icon",
        markup: `<div class="prop-panel">
  <fig-layer open selected>
    <div class="fig-layer-row">
      <svg class="fig-layer-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.25"></rect>
      </svg>
      <label>Rectangle</label>
    </div>
    <fig-layer selected>
      <div class="fig-layer-row">
        <label>Nested rectangle</label>
      </div>
    </fig-layer>
  </fig-layer>
</div>`,
      },
      {
        id: "without-icon",
        name: "Without icon",
        markup: `<div class="prop-panel">
  <fig-layer>
    <div class="fig-layer-row">
      <label>Layer with no icon</label>
    </div>
    <fig-layer selected>
      <div class="fig-layer-row">
        <label>Nested layer with no icon</label>
      </div>
    </fig-layer>
  </fig-layer>
</div>`,
      },
    ],
  },
  {
    id: "header",
    name: "Header",
    description: "Section header with title and optional actions.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-header>
    <h3>Section title</h3>
    <fig-button variant="ghost" icon="true">
      <span class="fig-mask-icon" style="--icon: var(--icon-close)"></span>
    </fig-button>
  </fig-header>
</div>`,
      },
    ],
  },
  {
    id: "popup",
    name: "Popup",
    description: "Anchored popup surface for contextual floating content.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button id="anchor-btn" data-playground-ignore-controls="true" onclick="const p=this.nextElementSibling; p && (p.hasAttribute('open') ? p.removeAttribute('open') : p.setAttribute('open','')); ">Anchor button</fig-button>
  <dialog is="fig-popup" open closedby="none" anchor="#anchor-btn" position="center right" offset="8 8" viewport-margin="8" theme="light">
    <fig-header>
      <h3>Popup</h3>
    </fig-header>
    <p>Popup content</p>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "toast",
    name: "Toast",
    description: "Toast notifications for temporary feedback messages.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="document.getElementById('demo-toast').showToast()">Show Toast</fig-button>
  <dialog id="demo-toast" is="fig-toast" theme="dark" duration="3000" offset="16">Saved</dialog>
</div>`,
      },
    ],
  },
  {
    id: "spinner",
    name: "Spinner",
    description: "Loading spinner indicator for async operations.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-spinner></fig-spinner>
</div>`,
      },
    ],
  },
  {
    id: "shimmer",
    name: "Shimmer",
    description: "Animated loading placeholder skeleton.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-shimmer duration="1.5s"><span>Testing...</span></fig-shimmer>
</div>`,
      },
    ],
  },
];
