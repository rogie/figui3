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
      <fig-field><label>Opacity</label><fig-slider type="opacity" value="100" min="0" max="100" units="%" text="true" full></fig-slider></fig-field>
    </fig-group>
    <fig-group name="Stroke" collapsible open="false">
      <fig-field><label>Width</label><fig-slider value="2" min="0" max="24" units="px" text="true" full></fig-slider></fig-field>
    </fig-group>
    <fig-group name="Effects" collapsible open="false">
      <fig-field><label>Blur</label><fig-slider value="4" min="0" max="64" units="px" text="true" full></fig-slider></fig-field>
    </fig-group>
  </fig-reorder>
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
        id: "action-needed",
        name: "Action needed",
        markup: `<div class="prop-panel">
  <fig-ai-context aria-label="Prompt context">
    <hstack>
      <span>Connect provider</span>
      <fig-button variant="secondary">Add API keys</fig-button>
    </hstack>
  </fig-ai-context>
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
];

const isAiSection = (section: Section) => section.id.startsWith("ai-");

export const labSections: Section[] = ungroupedLabSections.map((section) => ({
  ...section,
  group: isAiSection(section) ? "AI" : "Misc",
}));
