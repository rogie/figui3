import type { Section } from "./sections";

const ungroupedLabSections: Section[] = [
  {
    id: "property",
    name: "Property",
    description:
      "Experimental whole-row activation for composable property controls.",
    examples: [
      {
        id: "default",
        name: "Number",
        markup: `<div class="prop-panel">
  <fig-property label="Number" activation="row">
    <fig-input-number slot="input" value="16" units="px" steppers="true" full></fig-input-number>
  </fig-property>
</div>`,
      },
      {
        id: "angle",
        name: "Angle",
        markup: `<div class="prop-panel">
  <fig-property label="Angle" activation="row">
    <fig-input-number slot="input" value="0" units="°" full>
      <fig-icon name="angle" slot="prepend"></fig-icon>
    </fig-input-number>
  </fig-property>
</div>`,
      },
      {
        id: "slider",
        name: "Slider",
        markup: `<div class="prop-panel">
  <fig-property label="Slider" activation="row">
    <fig-input-slider slot="input" value="50" default="50" min="0" max="100">
      <fig-input-number value="50" units="%"></fig-input-number>
    </fig-input-slider>
  </fig-property>
</div>`,
      },
      {
        id: "string",
        name: "String",
        markup: `<div class="prop-panel">
  <fig-property label="String" activation="row">
    <fig-input-text slot="input" value="Hello" full></fig-input-text>
  </fig-property>
</div>`,
      },
      {
        id: "boolean",
        name: "Boolean",
        markup: `<div class="prop-panel">
  <fig-property label="Boolean" activation="row">
    <fig-switch slot="input" checked></fig-switch>
  </fig-property>
</div>`,
      },
      {
        id: "color",
        name: "Color",
        markup: `<div class="prop-panel">
  <fig-property label="Color" activation="row">
    <fig-input-color slot="input" value="#0D99FF" text="true" full></fig-input-color>
  </fig-property>
</div>`,
      },
      {
        id: "select",
        name: "Select",
        markup: `<div class="prop-panel">
  <fig-property label="Select" activation="row">
    <fig-select slot="input" value="Medium" options="Small,Medium,Large" full></fig-select>
  </fig-property>
</div>`,
      },
      {
        id: "point",
        name: "Point",
        markup: `<div class="prop-panel">
  <fig-property label="Point" activation="row">
    <fig-input-point slot="input" x="24" y="16" units="%" full></fig-input-point>
  </fig-property>
</div>`,
      },
      {
        id: "easing",
        name: "Easing",
        markup: `<div class="prop-panel">
  <fig-property label="Easing" activation="row">
    <fig-easing-curve slot="input" value="0.42, 0, 0.58, 1" edit="false"></fig-easing-curve>
  </fig-property>
</div>`,
      },
      {
        id: "gradient",
        name: "Gradient",
        markup: `<div class="prop-panel">
  <fig-property label="Gradient" activation="row">
    <fig-input-gradient slot="input" edit="picker" value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}' full></fig-input-gradient>
  </fig-property>
</div>`,
      },
      {
        id: "palette",
        name: "Palette",
        markup: `<div class="prop-panel">
  <fig-property label="Palette" activation="row">
    <fig-input-palette slot="input" edit="picker" value='["#0D99FF","#14AE5C","#FFCD29","#FF7262","#9747FF"]' full></fig-input-palette>
  </fig-property>
</div>`,
      },
      {
        id: "rotate",
        name: "3D Rotate",
        markup: `<div class="prop-panel">
  <fig-property label="3D Rotate" activation="row">
    <fig-input-rotate slot="input"></fig-input-rotate>
  </fig-property>
</div>`,
      },
      {
        id: "file",
        name: "File",
        markup: `<div class="prop-panel">
  <fig-property label="File" activation="row">
    <fig-input-file slot="input" label="Choose file" preview full></fig-input-file>
  </fig-property>
</div>`,
      },
      {
        id: "audio",
        name: "Audio",
        markup: `<div class="prop-panel">
  <fig-property label="Audio" activation="row">
    <fig-input-file slot="input" accepts="audio/*" label="Choose audio" preview url="/audio/skrillex-ft-elliphant.mp3" filename="skrillex-ft-elliphant.mp3" full></fig-input-file>
  </fig-property>
</div>`,
      },
      {
        id: "all-properties-row",
        name: "All properties",
        markup: `<div class="prop-panel">
  <fig-group name="Values" compact>
    <fig-property label="Number" activation="row">
      <fig-input-number slot="input" value="16" units="px" steppers="true" full></fig-input-number>
    </fig-property>
    <fig-property label="Slider" activation="row">
      <fig-input-slider slot="input" value="50" default="50" min="0" max="100">
        <fig-input-number value="50" units="%"></fig-input-number>
      </fig-input-slider>
    </fig-property>
    <fig-property label="String" activation="row">
      <fig-input-text slot="input" value="Hello" full></fig-input-text>
    </fig-property>
    <fig-property label="Boolean" activation="row">
      <fig-switch slot="input" checked></fig-switch>
    </fig-property>
  </fig-group>
  <fig-group name="Pickers" compact>
    <fig-property label="Color" activation="row">
      <fig-input-color slot="input" value="#0D99FF" text="true" full></fig-input-color>
    </fig-property>
    <fig-property label="Select" activation="row">
      <fig-select slot="input" value="Medium" options="Small,Medium,Large" full></fig-select>
    </fig-property>
    <fig-property label="Point" activation="row">
      <fig-input-point slot="input" x="24" y="16" units="%" full></fig-input-point>
    </fig-property>
    <fig-property label="Easing" activation="row">
      <fig-easing-curve slot="input" value="0.42, 0, 0.58, 1" edit="false"></fig-easing-curve>
    </fig-property>
  </fig-group>
  <fig-group name="Advanced" compact>
    <fig-property label="Gradient" activation="row">
      <fig-input-gradient slot="input" edit="picker" value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}' full></fig-input-gradient>
    </fig-property>
    <fig-property label="Palette" activation="row">
      <fig-input-palette slot="input" edit="picker" value='["#0D99FF","#14AE5C","#FFCD29","#FF7262","#9747FF"]' full></fig-input-palette>
    </fig-property>
    <fig-property label="Transform" activation="row">
      <fig-input-rotate slot="input"></fig-input-rotate>
    </fig-property>
    <fig-property label="File" activation="row">
      <fig-input-file slot="input" label="Choose file" full></fig-input-file>
    </fig-property>
    <fig-property label="Audio" activation="row">
      <fig-input-file slot="input" accepts="audio/*" label="Choose audio" preview url="/audio/skrillex-ft-elliphant.mp3" filename="skrillex-ft-elliphant.mp3" full></fig-input-file>
    </fig-property>
  </fig-group>
</div>`,
      },
    ],
  },
  {
    id: "ai-attachments",
    name: "Attachments",
    description:
      "Image attachments with filename tooltips, hover removal controls, and a wrapping container for prompt composition.",
    examples: [
      {
        id: "default",
        name: "Attachment",
        markup: `<div class="prop-panel">
  <fig-attachment value="reference" name="reference.png" src="/images/attachments/gradient-01.webp"></fig-attachment>
</div>`,
      },
      {
        id: "multiple",
        name: "Multiple",
        markup: `<div class="prop-panel">
  <fig-attachments aria-label="Prompt attachments">
    <fig-attachment value="layout" name="layout.png" src="/images/attachments/gradient-02.webp"></fig-attachment>
    <fig-attachment value="texture" name="texture.jpg" src="/images/attachments/gradient-03.webp"></fig-attachment>
    <fig-attachment value="notes" name="notes.pdf"></fig-attachment>
  </fig-attachments>
</div>`,
      },
      {
        id: "fallback",
        name: "Fallback",
        markup: `<div class="prop-panel">
  <fig-attachment value="brief" name="project-brief.pdf"></fig-attachment>
</div>`,
      },
    ],
  },
  {
    id: "ai-prompt",
    name: "AI composer",
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
      <fig-stack>
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
      </fig-stack>
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
      <fig-stack>
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
      </fig-stack>
    </fig-footer>
  </fig-ai-prompt>
</div>`,
      },
      {
        id: "attachments",
        name: "Attachments",
        markup: `<div class="prop-panel">
  <fig-ai-context aria-label="Prompt context">
    <fig-attachments aria-label="Prompt attachments">
      <fig-attachment value="reference" name="reference.png" src="/images/attachments/gradient-04.webp"></fig-attachment>
      <fig-attachment value="brief" name="brief.pdf"></fig-attachment>
    </fig-attachments>
  </fig-ai-context>
  <fig-ai-prompt>
    <fig-input-text multiline placeholder="Describe your idea" aria-label="Describe your idea"></fig-input-text>
    <fig-footer>
      <fig-button variant="ghost" icon aria-label="Add attachment">
        <fig-icon name="add"></fig-icon>
      </fig-button>
      <fig-stack>
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
      </fig-stack>
    </fig-footer>
  </fig-ai-prompt>
</div>`,
      },
      {
        id: "status",
        name: "Status",
        markup: `<div class="prop-panel">
  <fig-ai-context aria-label="Prompt context">
    <fig-shimmer><span>Reviewing your selection&hellip;</span></fig-shimmer>
  </fig-ai-context>
  <fig-ai-prompt>
    <fig-input-text multiline placeholder="Describe your idea" aria-label="Describe your idea"></fig-input-text>
    <fig-footer>
      <fig-button variant="ghost" icon aria-label="Add attachment">
        <fig-icon name="add"></fig-icon>
      </fig-button>
      <fig-stack>
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
      </fig-stack>
    </fig-footer>
  </fig-ai-prompt>
</div>`,
      },
      {
        id: "action-needed",
        name: "Action needed",
        markup: `<div class="prop-panel">
  <fig-ai-context aria-label="Prompt context">
    <fig-stack>
      <span>Connect provider</span>
      <fig-button variant="secondary">Add API keys</fig-button>
    </fig-stack>
  </fig-ai-context>
  <fig-ai-prompt>
    <fig-input-text multiline placeholder="Describe your idea" aria-label="Describe your idea"></fig-input-text>
    <fig-footer>
      <fig-button variant="ghost" icon aria-label="Add attachment">
        <fig-icon name="add"></fig-icon>
      </fig-button>
      <fig-stack>
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
      </fig-stack>
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
  <fig-chat-message from="user">Create a settings panel for my plugin.<fig-attachments aria-label="Message attachments"><fig-attachment value="settings" name="settings.png" src="/images/attachments/gradient-05.webp" removable="false"></fig-attachment><fig-attachment value="reference" name="reference.png" src="/images/attachments/gradient-06.webp" removable="false"></fig-attachment></fig-attachments><fig-avatar src="https://i.pravatar.cc/128?img=12" name="Rogie King"></fig-avatar></fig-chat-message>
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
    id: "input-slider",
    name: "Input Slider",
    description:
      "Experimental extensible slider primitives with range, color, delta, stepper, and wheel presentations.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-input-slider name="amount" value="50" default="50" min="0" max="100"></fig-input-slider>
</div>`,
      },
      {
        id: "with-number",
        name: "With number",
        markup: `<div class="prop-panel">
  <fig-input-slider name="amount" value="50" default="50" min="0" max="100">
    <fig-input-number value="50" units="%"></fig-input-number>
  </fig-input-slider>
</div>`,
      },
      {
        id: "hue",
        name: "Hue",
        markup: `<div class="prop-panel">
  <fig-input-slider-hue name="hue" value="180" default="180"></fig-input-slider-hue>
</div>`,
      },
      {
        id: "opacity",
        name: "Opacity",
        markup: `<div class="prop-panel">
  <fig-input-slider-opacity name="opacity" color="#0D99FF" value="75" default="75"></fig-input-slider-opacity>
</div>`,
      },
      {
        id: "delta",
        name: "Delta",
        markup: `<div class="prop-panel">
  <fig-input-slider-delta name="offset" value="0" default="0"></fig-input-slider-delta>
</div>`,
      },
      {
        id: "stepper",
        name: "Stepper",
        markup: `<div class="prop-panel">
  <fig-input-slider-stepper name="step" value="50" default="50"></fig-input-slider-stepper>
</div>`,
      },
      {
        id: "wheel",
        name: "Wheel",
        markup: `<div class="prop-panel">
  <fig-input-slider-wheel name="rotation" value="0" default="0" step="1"></fig-input-slider-wheel>
</div>`,
      },
    ],
  },
  {
    id: "input-wheel",
    name: "Wheel",
    description:
      "A tick-and-handle scrubber for numeric values. Drag to scrub; optional min/max clamp the range and spin animates value changes.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Value</label>
    <fig-input-wheel value="0"></fig-input-wheel>
  </fig-field>
</div>`,
      },
      {
        id: "range",
        name: "Range",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Amount</label>
    <fig-input-wheel value="50" min="0" max="100"></fig-input-wheel>
  </fig-field>
</div>`,
      },
      {
        id: "step",
        name: "Step",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Scale</label>
    <fig-input-wheel value="1.5" step="0.25"></fig-input-wheel>
  </fig-field>
</div>`,
      },
      {
        id: "disabled",
        name: "Disabled",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Value</label>
    <fig-input-wheel value="25" disabled></fig-input-wheel>
  </fig-field>
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
];

const isAiSection = (section: Section) => section.id.startsWith("ai-");
const isInputSection = (section: Section) =>
  section.id === "input-slider" || section.id === "input-wheel";

export const labSections: Section[] = ungroupedLabSections.map((section) => ({
  ...section,
  group: isInputSection(section) ? "Inputs" : isAiSection(section) ? "AI" : "Misc",
}));
