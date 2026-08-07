import type { Section } from "./sections";

const ungroupedLabSections: Section[] = [
  {
    id: "reorder",
    name: "Reorder",
    description:
      "A display:contents wrapper that drag-reorders direct children. Omit handle to drag whole rows; use handle when rows contain nested controls.",
    examples: [
      {
        id: "default",
        name: "Rows",
        markup: `<div class="prop-panel">
  <fig-reorder>
    <fig-field>
      <label>Number</label>
      <fig-input-number value="16" min="0" max="100" units="px"></fig-input-number>
    </fig-field>
    <fig-field>
      <label>Text</label>
      <fig-input-text value="Rows" full></fig-input-text>
    </fig-field>
    <fig-field>
      <label>Color</label>
      <fig-input-color value="#0D99FF"></fig-input-color>
    </fig-field>
  </fig-reorder>
</div>`,
      },
      {
        id: "groups",
        name: "Groups",
        markup: `<div class="prop-panel">
  <fig-reorder>
    <fig-group name="Fill" collapsible open="true">
      <propskit-slider label="Opacity" direction="horizontal" type="opacity" value="100" min="0" max="100" units="%"></propskit-slider>
    </fig-group>
    <fig-group name="Stroke" collapsible open="false">
      <propskit-slider label="Width" direction="horizontal" value="2" min="0" max="24" units="px"></propskit-slider>
    </fig-group>
    <fig-group name="Effects" collapsible open="false">
      <propskit-slider label="Blur" direction="horizontal" value="4" min="0" max="64" units="px"></propskit-slider>
    </fig-group>
  </fig-reorder>
</div>`,
      },
    ],
  },
  {
    id: "propskit-color",
    name: "Propskit Color",
    description:
      "A full-surface color field that composes fig-field and fig-input-color into a single property control.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <propskit-color label="Fill" value="#0D99FF" alpha="true"></propskit-color>
</div>`,
      },
    ],
  },
  {
    id: "propskit-text",
    name: "Propskit Text",
    description:
      "A full-surface text field that composes fig-field and fig-input-text into a single property control.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <propskit-text label="Name" value="Layer 1" placeholder="Enter a name"></propskit-text>
</div>`,
      },
    ],
  },
  {
    id: "propskit-select",
    name: "Propskit Select",
    description:
      "A full-surface select field that composes fig-field and fig-select. Pass choices via the options attribute (comma-separated or JSON array).",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <propskit-select label="Alignment" value="Center" options="Left,Center,Right"></propskit-select>
</div>`,
      },
      {
        id: "options-attr",
        name: "Options attribute",
        markup: `<div class="prop-panel">
  <propskit-select label="Align" value="Center" options="Left,Center,Right"></propskit-select>
  <propskit-select label="Size" value="Medium" options='["Small","Medium","Large"]'></propskit-select>
  <propskit-select
    label="Blend"
    value="multiply"
    options='[{"value":"normal","label":"Normal"},{"value":"multiply","label":"Multiply"},{"value":"screen","label":"Screen"}]'
  ></propskit-select>
</div>`,
      },
    ],
  },
  {
    id: "propskit-group",
    name: "Propskit Group",
    description:
      "A collapsible property group (always collapsible). Reset appears only while child propskit fields differ from their defaults (`show-reset` defaults to true).",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <propskit-group name="Appearance" open>
    <propskit-color label="Fill" value="#0D99FF" alpha="true"></propskit-color>
    <propskit-text label="Name" value="Layer 1" placeholder="Enter a name"></propskit-text>
    <propskit-select label="Blend" value="Normal" options="Normal,Multiply,Screen,Overlay"></propskit-select>
    <propskit-slider label="Opacity" direction="horizontal" type="opacity" value="100" min="0" max="100" units="%"></propskit-slider>
    <propskit-number label="Corner" value="8" min="0" max="100" units="px"></propskit-number>
  </propskit-group>
  <propskit-group name="Advanced" open>
    <propskit-color label="Stroke" value="#000000" alpha="true"></propskit-color>
    <propskit-number label="Width" value="1" min="0" max="24" units="px"></propskit-number>
    <propskit-select label="Position" value="Inside" options="Inside,Center,Outside"></propskit-select>
    <propskit-switch label="Noise" checked></propskit-switch>
    <propskit-switch label="Clip alpha" checked></propskit-switch>
  </propskit-group>
  <propskit-group name="Misc">
    <propskit-text label="Notes" value="" placeholder="Optional notes"></propskit-text>
    <propskit-slider label="Blur" direction="horizontal" value="4" min="0" max="64" units="px"></propskit-slider>
    <propskit-switch label="Visible"></propskit-switch>
  </propskit-group>
</div>`,
      },
      {
        id: "compact",
        name: "Compact",
        markup: `<div class="prop-panel">
  <propskit-group name="Fill" open compact>
    <propskit-color label="Color" value="#14AE5C" alpha="true"></propskit-color>
    <propskit-slider label="Opacity" direction="horizontal" type="opacity" value="80" min="0" max="100" units="%"></propskit-slider>
    <propskit-select label="Type" value="Solid" options="Solid,Gradient,Image"></propskit-select>
  </propskit-group>
  <propskit-group name="Stroke" open compact>
    <propskit-color label="Color" value="#FF7262"></propskit-color>
    <propskit-number label="Width" value="2" min="0" max="24" units="px"></propskit-number>
    <propskit-text label="Dash" value="4, 2"></propskit-text>
  </propskit-group>
</div>`,
      },
      {
        id: "no-reset",
        name: "No reset",
        markup: `<div class="prop-panel">
  <propskit-group name="Appearance" open show-reset="false">
    <propskit-color label="Fill" value="#9747FF" alpha="true"></propskit-color>
    <propskit-number label="Corner" value="12" min="0" max="100" units="px"></propskit-number>
  </propskit-group>
</div>`,
      },
    ],
  },
  {
    id: "propskit-switch",
    name: "Propskit Switch",
    description:
      "A full-surface boolean field that composes fig-field and an Off/On segmented control.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <propskit-switch label="Visible" checked></propskit-switch>
</div>`,
      },
    ],
  },
  {
    id: "propskit-number",
    name: "Propskit Number",
    description:
      "A full-surface number field that composes fig-field and fig-input-number into a single property control.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <propskit-number label="Width" value="24" min="0" max="100" units="px"></propskit-number>
</div>`,
      },
      {
        id: "steppers",
        name: "Steppers",
        markup: `<div class="prop-panel">
  <propskit-number label="Count" value="3" min="0" max="10" step="1" steppers="true"></propskit-number>
</div>`,
      },
    ],
  },
  {
    id: "propskit-slider",
    name: "Propskit Slider",
    description: "A modern, full surface slider that composes fig-field and fig-slider into a single &lt;propskit-slider&gt; element.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <propskit-slider label="Amount" direction="horizontal" value="50" min="0" max="100"></propskit-slider>
</div>`,
      },
      {
        id: "iconographic",
        name: "Iconographic",
        markup: `<div class="prop-panel">
  <propskit-slider direction="horizontal" value="50" min="0" max="100">
    <label><fig-tooltip text="Font size"><fig-icon><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.75 10C15.9624 10.0001 16.1515 10.1345 16.2217 10.335L17.9717 15.335C18.0628 15.5955 17.9255 15.8804 17.665 15.9717C17.4044 16.0628 17.1195 15.9256 17.0283 15.665L16.6211 14.5H14.3789L13.9717 15.665C13.8805 15.9256 13.5955 16.0627 13.3349 15.9717C13.0744 15.8804 12.9372 15.5955 13.0283 15.335L14.7783 10.335L14.8096 10.2627C14.8957 10.1027 15.0642 10 15.25 10H15.75ZM9.24998 8C9.46694 8.0001 9.65901 8.1402 9.72557 8.34668L11.9756 15.3467C12.06 15.6093 11.9158 15.8908 11.6533 15.9756C11.3906 16.06 11.1091 15.9159 11.0244 15.6533L10.4931 14H7.50682L6.97557 15.6533C6.89093 15.9159 6.60936 16.0599 6.34666 15.9756C6.08403 15.8909 5.93994 15.6094 6.0244 15.3467L8.2744 8.34668L8.30467 8.27246C8.38904 8.10728 8.56006 8 8.74998 8H9.24998ZM14.7295 13.5H16.2705L15.5 11.2979L14.7295 13.5ZM7.82811 13H10.1719L8.99998 9.35449L7.82811 13Z" fill="currentColor"/></svg></fig-icon></fig-tooltip></label>
  </propskit-slider>
</div>`,
      },
      {
        id: "hue",
        name: "Hue",
        markup: `<div class="prop-panel">
  <propskit-slider label="Hue" direction="horizontal" type="hue" value="180" min="0" max="360" units="°"></propskit-slider>
</div>`,
      },
      {
        id: "opacity",
        name: "Opacity",
        markup: `<div class="prop-panel">
  <propskit-slider label="Opacity" direction="horizontal" type="opacity" value="100" min="0" max="100" units="%"></propskit-slider>
</div>`,
      },
      {
        id: "delta",
        name: "Delta",
        markup: `<div class="prop-panel">
  <propskit-slider label="Offset" direction="horizontal" type="delta" value="50" min="0" max="100" default="50"></propskit-slider>
</div>`,
      },
      {
        id: "stepper",
        name: "Stepper",
        markup: `<div class="prop-panel">
  <propskit-slider label="Step" direction="horizontal" type="stepper" value="50" min="0" max="100" step="10" default="50"></propskit-slider>
</div>`,
      },
    ],
  },
  {
    id: "ai-prompt",
    name: "AI Prompt",
    description:
      "A presentation-only prompt surface composed from existing FigUI3 input, button, and icon components.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-ai-prompt>
    <fig-input-text multiline placeholder="Describe your idea" aria-label="Describe your idea"></fig-input-text>
    <fig-footer>
      <fig-button variant="ghost" icon aria-label="Add attachment">
        <fig-icon name="add"></fig-icon>
      </fig-button>
      <hstack>
        <fig-select value="auto" aria-label="Model">
          <fig-select-options>
            <fig-select-option value="auto">Auto</fig-select-option>
            <fig-select-option value="fast">Fast</fig-select-option>
            <fig-select-option value="smart">Smart</fig-select-option>
          </fig-select-options>
        </fig-select>
        <fig-button icon aria-label="Send prompt">
          <fig-icon name="send"></fig-icon>
        </fig-button>
      </hstack>
    </fig-footer>
  </fig-ai-prompt>
</div>`,
      },
      {
        id: "sending",
        name: "Sending",
        markup: `<div class="prop-panel">
  <fig-ai-prompt>
    <fig-input-text multiline disabled placeholder="Describe your idea" aria-label="Describe your idea"></fig-input-text>
    <fig-footer>
      <fig-button variant="ghost" icon disabled aria-label="Add attachment">
        <fig-icon name="add"></fig-icon>
      </fig-button>
      <hstack>
        <fig-select value="auto" disabled aria-label="Model">
          <fig-select-options>
            <fig-select-option value="auto">Auto</fig-select-option>
            <fig-select-option value="fast">Fast</fig-select-option>
            <fig-select-option value="smart">Smart</fig-select-option>
          </fig-select-options>
        </fig-select>
        <fig-button variant="ghost" icon disabled aria-label="Sending prompt">
          <fig-spinner></fig-spinner>
        </fig-button>
      </hstack>
    </fig-footer>
  </fig-ai-prompt>
</div>`,
      },
    ],
  },
  {
    id: "ai-chat-message",
    name: "Chat Message",
    description:
      "A presentation-only chat message with agent and user styling.",
    examples: [
      {
        id: "conversation",
        name: "Conversation",
        markup: `<div class="prop-panel">
  <fig-chat-message from="user">Create a settings panel for my plugin.<fig-avatar src="https://i.pravatar.cc/128?img=12" name="Rogie King"></fig-avatar></fig-chat-message>
  <fig-chat-message from="agent">I’ll create a compact settings panel using FigUI3 fields and controls.</fig-chat-message>
  <fig-chat-message from="agent"><fig-shimmer><span>Thinking&hellip;</span></fig-shimmer></fig-chat-message>
</div>`,
      },
      {
        id: "user",
        name: "User",
        markup: `<div class="prop-panel">
  <fig-chat-message from="user">Make the interface more compact.</fig-chat-message>
</div>`,
      },
      {
        id: "user-avatar",
        name: "User with avatar",
        markup: `<div class="prop-panel">
  <fig-chat-message from="user">Make the interface more compact.<fig-avatar name="Rogie King"></fig-avatar></fig-chat-message>
</div>`,
      },
      {
        id: "agent",
        name: "Agent",
        markup: `<div class="prop-panel">
  <fig-chat-message from="agent">I reduced the spacing and grouped related controls.</fig-chat-message>
</div>`,
      },
    ],
  },
  {
    id: "canvas-control",
    name: "Canvas Control",
    description:
      "A handle control with optional radius circle, angle handle, or second point for spatial interactions on a canvas.",
    examples: [
      {
        id: "default",
        name: "Point",
        markup: `<div class="prop-panel">
  <div data-playground-unwrap="true" style="aspect-ratio: 1/1; width: 100%; position: relative; border-radius: var(--radius-medium); background: var(--figma-color-bg-secondary);">
    <fig-canvas-control name="Position" value='{"x":50,"y":50}' snapping="modifier" data-playground-hide-field></fig-canvas-control>
  </div>
</div>`,
      },
      {
        id: "color",
        name: "Color",
        markup: `<div class="prop-panel">
  <div data-playground-unwrap="true" style="aspect-ratio: 1/1; width: 100%; position: relative; border-radius: var(--radius-medium); background: var(--figma-color-bg-secondary);">
    <fig-canvas-control type="color" color="#FF00BF" name="Click to edit color" value='{"x":50,"y":50}' snapping="modifier" data-playground-hide-field></fig-canvas-control>
  </div>
</div>`,
      },
      {
        id: "point-radius",
        name: "Point + Radius",
        markup: `<div class="prop-panel">
  <div data-playground-unwrap="true" style="aspect-ratio: 1/1; width: 100%; position: relative; border-radius: var(--radius-medium); background: var(--figma-color-bg-secondary);">
    <fig-canvas-control type="point-radius" name="Position" value='{"x":50,"y":50,"radius":60}' snapping="modifier" data-playground-hide-field></fig-canvas-control>
  </div>
</div>`,
      },
      {
        id: "point-radius-angle",
        name: "Point + Radius + Angle",
        markup: `<div class="prop-panel">
  <div data-playground-unwrap="true" style="aspect-ratio: 1/1; width: 100%; position: relative; border-radius: var(--radius-medium); background: var(--figma-color-bg-secondary);">
    <fig-canvas-control type="point-radius-angle" name="Position" value='{"x":50,"y":50,"radius":60,"angle":45}' snapping="modifier" data-playground-hide-field></fig-canvas-control>
  </div>
</div>`,
      },
      {
        id: "point-point",
        name: "Point + Point",
        markup: `<div class="prop-panel">
  <div data-playground-unwrap="true" style="aspect-ratio: 1/1; width: 100%; position: relative; border-radius: var(--radius-medium); background: var(--figma-color-bg-secondary);">
    <fig-canvas-control type="point-point" name="Start, End" value='{"x":25,"y":25,"x2":75,"y2":75}' snapping="modifier" data-playground-hide-field></fig-canvas-control>
  </div>
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
  <fig-field>
    <label>Rotation</label>
    <fig-input-angle value="45" text="true" full></fig-input-angle>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "oscillator",
    name: "Oscillator",
    description:
      "A waveform oscillator input with a live SVG preview and direct parameter controls.",
    examples: [
      {
        id: "sine",
        name: "Wave",
        markup: `<div class="prop-panel">
  <propskit-oscillator value='{"waves":[{"type":"sine","frequency":1,"amplitude":1,"phase":0,"offset":0}]}'></propskit-oscillator>
</div>`,
      },
      {
        id: "composite",
        name: "Composite",
        markup: `<div class="prop-panel">
  <propskit-oscillator value='{"waves":[{"type":"sine","frequency":1,"amplitude":1,"phase":0,"offset":0},{"type":"triangle","frequency":2,"amplitude":0.5,"phase":90,"offset":0}]}'></propskit-oscillator>
</div>`,
      },
      {
        id: "square",
        name: "Square",
        markup: `<div class="prop-panel">
  <propskit-oscillator value='{"waves":[{"type":"square","frequency":2,"amplitude":1,"phase":0,"offset":0}]}'></propskit-oscillator>
</div>`,
      },
      {
        id: "triangle",
        name: "Triangle",
        markup: `<div class="prop-panel">
  <propskit-oscillator value='{"waves":[{"type":"triangle","frequency":1.5,"amplitude":0.75,"phase":45,"offset":0}]}'></propskit-oscillator>
</div>`,
      },
      {
        id: "compact",
        name: "Preview Only",
        markup: `<div class="prop-panel">
  <propskit-oscillator edit="false" value='{"waves":[{"type":"sawtooth","frequency":1,"amplitude":1,"phase":0,"offset":0}]}'></propskit-oscillator>
</div>`,
      },
    ],
  },
];

const isPropskitSection = (section: Section) =>
  section.id.startsWith("propskit-") || section.id === "oscillator";
const isAiSection = (section: Section) => section.id.startsWith("ai-");

export const labSections: Section[] = [
  ...ungroupedLabSections
    .filter(isPropskitSection)
    .map((section) => ({ ...section, group: "Propskit" })),
  ...ungroupedLabSections
    .filter(isAiSection)
    .map((section) => ({ ...section, group: "AI" })),
  ...ungroupedLabSections
    .filter(
      (section) => !isPropskitSection(section) && !isAiSection(section),
    )
    .map((section) => ({ ...section, group: "Misc" })),
];
