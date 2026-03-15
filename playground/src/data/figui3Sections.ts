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
        name: "Default",
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
  <fig-slider value="50" min="0" max="100" text="false" full></fig-slider>
</div>`,
      },
      {
        id: "opacity-with-text",
        name: "Opacity",
        markup: `<div class="prop-panel">
  <fig-slider type="opacity" value="0.75" color="#ff0000" units="%" text="false" full></fig-slider>
</div>`,
      },
      {
        id: "hue-with-text",
        name: "Hue",
        markup: `<div class="prop-panel">
  <fig-slider type="hue" value="180" text="false" full></fig-slider>
</div>`,
      },
      {
        id: "stepper-with-text",
        name: "Stepper",
        markup: `<div class="prop-panel">
  <fig-slider type="stepper" value="50" step="25" text="false" full>
    <datalist>
      <option value="0"></option>
      <option value="25"></option>
      <option value="50"></option>
      <option value="75"></option>
      <option value="100"></option>
    </datalist>
  </fig-slider>
</div>`,
      },
      {
        id: "delta-with-text",
        name: "Delta",
        markup: `<div class="prop-panel">
  <fig-slider type="delta" value="0" default="0" step="0.25" min="-5" max="5" text="false" full>
    <datalist>
      <option value="0"></option>
    </datalist>
  </fig-slider>
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
    description: "Single-line and multiline text inputs for direct entry.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-input-text value="Text here" placeholder="Placeholder text"></fig-input-text>
</div>`,
      },
      {
        id: "multiline",
        name: "Multiline",
        markup: `<div class="prop-panel">
  <fig-input-text multiline value="Multiline text here" placeholder="Type here..." data-playground-hide-attrs="prepend"></fig-input-text>
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
    id: "angle-input",
    name: "Angle Input",
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
  <fig-radio name="size" value="medium" checked></fig-radio>
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
        name: "Text",
        markup: `<div class="prop-panel">
  <fig-segmented-control data-playground-hide-attrs="value,name">
    <fig-segment value="left" selected>Left</fig-segment>
    <fig-segment value="center">Center</fig-segment>
    <fig-segment value="right">Right</fig-segment>
  </fig-segmented-control>
</div>`,
      },
      {
        id: "icons",
        name: "Icons",
        markup: `<div class="prop-panel">
  <fig-segmented-control data-playground-hide-attrs="value,name">
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
    description:
      "Anchored popup surface for contextual floating content. Try clicking then dragging the anchor.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button id="anchor-btn" data-playground-ignore-controls="true" style="position: relative; cursor: grab;" onpointerdown="if(event.button!==0)return; this.style.cursor='grabbing'; this.dataset.moved='0'; this.dataset.startX=String(event.clientX); this.dataset.startY=String(event.clientY); const t=this; const onMove=(e)=>{const dx=e.clientX-Number(t.dataset.startX||e.clientX); const dy=e.clientY-Number(t.dataset.startY||e.clientY); if(Math.abs(dx)+Math.abs(dy)<2)return; t.dataset.moved='1'; const tx=Number(t.dataset.tx||0)+dx; const ty=Number(t.dataset.ty||0)+dy; t.dataset.tx=String(tx); t.dataset.ty=String(ty); t.style.transform='translate('+tx+'px, '+ty+'px)'; t.dataset.startX=String(e.clientX); t.dataset.startY=String(e.clientY);}; const onEnd=()=>{t.style.cursor='grab'; window.removeEventListener('pointermove',onMove); window.removeEventListener('pointerup',onEnd); window.removeEventListener('pointercancel',onEnd);}; window.addEventListener('pointermove',onMove); window.addEventListener('pointerup',onEnd); window.addEventListener('pointercancel',onEnd);" onclick="if(this.dataset.moved==='1'){this.dataset.moved='0'; return;} const p=this.nextElementSibling; p && (p.hasAttribute('open') ? p.removeAttribute('open') : p.setAttribute('open','')); ">Anchor</fig-button>
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
  <dialog id="demo-toast" is="fig-toast" theme="auto" duration="3000" offset="16">Saved</dialog>
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
