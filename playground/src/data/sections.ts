import {
  portraitUrl,
  landscapeUrl,
  squareUrl,
  variedAspectRatioUrl,
} from "../lib/images";

export interface Example {
  id: string;
  name: string;
  markup: string;
  title?: string;
  description?: string;
}

export interface Section {
  id: string;
  name: string;
  description: string;
  examples: Example[];
  group?: string;
}

export const propkitSections: Section[] = [
  {
    id: "group",
    name: "Group",
    group: "Containers",
    description:
      "A collapsible group container with an optional named header and sibling border separators.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-group name="Layout">
    <fig-field>
      <label>Direction</label>
      <fig-dropdown full>
        <option selected>Horizontal</option>
        <option>Vertical</option>
      </fig-dropdown>
    </fig-field>
    <fig-field>
      <label>Spacing</label>
      <fig-slider value="8" min="0" max="64" text="true" units="px"></fig-slider>
    </fig-field>
  </fig-group>
  <fig-group name="Fill">
    <fig-field>
      <label>Background</label>
      <fig-input-color value="#FFFFFF" text="true" full></fig-input-color>
    </fig-field>
  </fig-group>
</div>`,
      },
      {
        id: "no-names",
        name: "No names",
        title: "Groups without names",
        description:
          "Groups can omit the name attribute entirely. They provide visual separation between groups without a header.",
        markup: `<div class="prop-panel">
  <fig-group>
    <fig-field>
      <label>Direction</label>
      <fig-dropdown full>
        <option selected>Horizontal</option>
        <option>Vertical</option>
      </fig-dropdown>
    </fig-field>
    <fig-field>
      <label>Spacing</label>
      <fig-slider value="8" min="0" max="64" text="true"></fig-slider>
    </fig-field>
  </fig-group>
  <fig-group>
    <fig-field>
      <label>Background</label>
      <fig-input-color value="#FFFFFF"></fig-input-color>
    </fig-field>
  </fig-group>
</div>`,
      },
      {
        id: "collapsible",
        name: "Collapsible",
        markup: `<div class="prop-panel">
  <fig-group name="Appearance" collapsible open>
    <fig-field>
      <label>Color</label>
      <fig-input-color value="#0D99FF" text="true" full></fig-input-color>
    </fig-field>
    <fig-field>
      <label>Image</label>
      <fig-image full="true" upload="true" label="Upload" alt="" size="auto"></fig-image>
    </fig-field>
    <fig-field>
      <label>Blend Mode</label>
      <fig-dropdown full>
        <option selected>Normal</option>
        <option>Multiply</option>
        <option>Screen</option>
        <option>Overlay</option>
      </fig-dropdown>
    </fig-field>
    <fig-field>
      <label>Opacity</label>
      <fig-slider value="100" min="0" max="100" text="true" units="%"></fig-slider>
    </fig-field>
    <fig-field>
      <label>Palette</label>
      <fig-input-palette value='["#0D99FF","#14AE5C","#FFCD29","#FF7262","#9747FF"]' full></fig-input-palette>
    </fig-field>
  </fig-group>
  <fig-group name="Advanced" collapsible>
    <fig-field>
      <label>Noise</label>
      <fig-switch checked></fig-switch>
    </fig-field>
    <fig-field>
      <label>Clip alpha</label>
      <fig-switch checked></fig-switch>
    </fig-field>
  </fig-group>
  <fig-group name="Misc" collapsible>
    <fig-field>
      <label>Visible</label>
      <fig-switch></fig-switch>
    </fig-field>
  </fig-group>
</div>`,
      },
    ],
  },
  {
    id: "content",
    name: "Content",
    group: "Containers",
    description:
      "A scrollable content container for dialog and panel bodies.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel" style="height: 220px; display: flex; flex-direction: column;">
  <fig-header>
    <h3>Content</h3>
  </fig-header>
  <fig-content>
    <p>Use fig-content for the primary body region of a dialog or panel.</p>
    <fig-group name="Settings">
      <fig-field>
        <label>Density</label>
        <fig-slider value="60" min="0" max="100" text="true" full></fig-slider>
      </fig-field>
      <fig-field>
        <label>Preview</label>
        <fig-switch checked></fig-switch>
      </fig-field>
    </fig-group>
  </fig-content>
</div>`,
      },
    ],
  },
  {
    id: "header",
    name: "Header",
    group: "Containers",
    description:
      "A top bar container for titles, actions, and dialog drag handles.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-header>
    <h3>Layer options</h3>
    <fig-button variant="ghost" icon="true" aria-label="Close">
      <fig-icon name="close"></fig-icon>
    </fig-button>
  </fig-header>
</div>`,
      },
      {
        id: "accessory-text",
        name: "Accessory text",
        markup: `<div class="prop-panel">
  <fig-header>
    <h3>Characters</h3>
    <span>352 characters</span>
  </fig-header>
</div>`,
      },
    ],
  },
  {
    id: "footer",
    name: "Footer",
    group: "Containers",
    description:
      "A bottom action bar container for secondary and primary actions.",
    examples: [
      {
        id: "waiting",
        name: "Waiting",
        description:
          "A label-only footer for idle states. With no buttons, the message is centered.",
        markup: `<div class="prop-panel">
  <fig-footer>
    <label>Select text, or click to copy</label>
  </fig-footer>
</div>`,
      },
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-footer>
    <fig-button variant="secondary">Cancel</fig-button>
    <fig-button>Apply</fig-button>
  </fig-footer>
</div>`,
      },
      {
        id: "label-button",
        name: "Waiting for selection",
        markup: `<div class="prop-panel">
  <fig-footer>
    <label>Select a layer</label>
    <fig-button disabled>Apply</fig-button>
  </fig-footer>
</div>`,
      },
      {
        id: "long-label",
        name: "Long label",
        description:
          "A footer label with more instructional text beside a disabled action.",
        markup: `<div class="prop-panel">
  <fig-footer>
    <label>In order to run this tool, you will need to select at least one layer selected</label>
    <fig-button disabled>Apply</fig-button>
  </fig-footer>
</div>`,
      },
      {
        id: "selected-layer",
        name: "Has selection",
        markup: `<div class="prop-panel">
  <fig-footer>
    <label>3 selected</label>
    <fig-button>Apply</fig-button>
  </fig-footer>
</div>`,
      },
      {
        id: "long-label-many-actions",
        name: "Long label/many actions",
        description:
          "A long instructional label above a vertical stack of actions.",
        markup: `<div class="prop-panel">
  <fig-footer>
    <label>In order to run this tool, you will need to select at least one layer selected</label>
    <fig-tooltip text="Select at least one layer to reset">
      <span class="fig-footer-action">
        <fig-button variant="secondary" disabled full>Reset</fig-button>
      </span>
    </fig-tooltip>
    <fig-tooltip text="Close without applying changes">
      <span class="fig-footer-action">
        <fig-button variant="secondary" full>Cancel</fig-button>
      </span>
    </fig-tooltip>
    <fig-tooltip text="Select at least one layer to apply">
      <span class="fig-footer-action">
        <fig-button disabled full>Apply</fig-button>
      </span>
    </fig-tooltip>
  </fig-footer>
</div>`,
      },
      {
        id: "lots-of-things",
        name: "Lots of things",
        markup: `<div class="prop-panel">
  <fig-footer>
    <label>Make a selection</label>
    <fig-button variant="secondary" disabled>Reset</fig-button>
    <fig-button variant="secondary" disabled>Cancel</fig-button>
    <fig-button disabled>Apply</fig-button>
  </fig-footer>
</div>`,
      },
    ],
  },
  {
    id: "3d-rotate",
    name: "3D Rotate",
    group: "Field controls",
    description:
      "An interactive 3D rotation control with a draggable cube preview.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Rotation</label>
    <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)"></fig-3d-rotate>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "chooser",
    name: "Chooser",
    group: "Field controls",
    description:
      "A selection list for picking from a set of rich choice options.",
    examples: [
      {
        id: "text",
        name: "Text",
        markup: `<div class="prop-panel">
  <fig-field direction="vertical">
    <label>Style</label>
    <fig-chooser layout="vertical" value="option-a" full drag style="max-height: 240px">
      <fig-choice value="option-a" padding selected><span style="white-space: nowrap;">Option A</span></fig-choice>
      <fig-choice value="option-b" padding><span style="white-space: nowrap;">Option B</span></fig-choice>
      <fig-choice value="option-c" padding><span style="white-space: nowrap;">Option C</span></fig-choice>
      <fig-choice value="option-d" padding><span style="white-space: nowrap;">Option D</span></fig-choice>
      <fig-choice value="option-e" padding><span style="white-space: nowrap;">Option E</span></fig-choice>
      <fig-choice value="option-f" padding><span style="white-space: nowrap;">Option F</span></fig-choice>
    </fig-chooser>
  </fig-field>
</div>`,
      },
      {
        id: "grid",
        name: "Grid",
        markup: `<div class="prop-panel">
  <fig-field direction="vertical">
    <label>Alignment</label>
    <fig-chooser layout="grid" columns="3" value="top-left" full>
      <fig-choice value="top-left" padding selected>Top left</fig-choice>
      <fig-choice value="top" padding>Top</fig-choice>
      <fig-choice value="top-right" padding>Top right</fig-choice>
      <fig-choice value="left" padding>Left</fig-choice>
      <fig-choice value="center" padding>Center</fig-choice>
      <fig-choice value="right" padding>Right</fig-choice>
      <fig-choice value="bottom-left" padding>Bottom left</fig-choice>
      <fig-choice value="bottom" padding>Bottom</fig-choice>
      <fig-choice value="bottom-right" padding>Bottom right</fig-choice>
    </fig-chooser>
  </fig-field>
</div>`,
      },
      {
        id: "images",
        name: "Images",
        markup: `<div class="prop-panel">
  <fig-field direction="vertical">
    <label>Style</label>
    <fig-chooser layout="horizontal" value="img-a" full drag style="max-width: 100%">
      <fig-choice value="img-a" aria-label="Image A" selected><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-b" aria-label="Image B"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-c" aria-label="Image C"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-d" aria-label="Image D"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-e" aria-label="Image E"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-f" aria-label="Image F"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
    </fig-chooser>
  </fig-field>
</div>`,
      },
      {
        id: "images-labels",
        name: "Images + Labels",
        markup: `<div class="prop-panel">
  <fig-field direction="vertical">
    <label>Style</label>
    <fig-chooser layout="horizontal" value="img-a" full drag style="max-width: 100%">
      <fig-choice value="img-a" padding selected><fig-image src="${landscapeUrl()}" alt="" size="medium" aspect-ratio="1/1" full></fig-image><label>Label A</label></fig-choice>
      <fig-choice value="img-b" padding><fig-image src="${landscapeUrl()}" alt="" size="medium" aspect-ratio="1/1" full></fig-image><label>Label B</label></fig-choice>
      <fig-choice value="img-c" padding><fig-image src="${landscapeUrl()}" alt="" size="medium" aspect-ratio="1/1" full></fig-image><label>Label C</label></fig-choice>
      <fig-choice value="img-d" padding><fig-image src="${landscapeUrl()}" alt="" size="medium" aspect-ratio="1/1" full></fig-image><label>Label D</label></fig-choice>
      <fig-choice value="img-e" padding><fig-image src="${landscapeUrl()}" alt="" size="medium" aspect-ratio="1/1" full></fig-image><label>Label E</label></fig-choice>
      <fig-choice value="img-f" padding><fig-image src="${landscapeUrl()}" alt="" size="medium" aspect-ratio="1/1" full></fig-image><label>Label F</label></fig-choice>
    </fig-chooser>
  </fig-field>
</div>`,
      },
      {
        id: "colors",
        name: "Colors",
        markup: `<div class="prop-panel">
  <fig-field direction="vertical">
    <label>Color</label>
    <fig-chooser layout="horizontal" value="red" full drag style="max-width: 100%">
      <fig-choice value="red" selected><fig-chit background="#FF0000" size="large" disabled></fig-chit></fig-choice>
      <fig-choice value="blue"><fig-chit background="#0D99FF" size="large" disabled></fig-chit></fig-choice>
      <fig-choice value="green"><fig-chit background="#14AE5C" size="large" disabled></fig-chit></fig-choice>
      <fig-choice value="orange"><fig-chit background="#FF8C00" size="large" disabled></fig-chit></fig-choice>
      <fig-choice value="purple"><fig-chit background="#9747FF" size="large" disabled></fig-chit></fig-choice>
      <fig-choice value="pink"><fig-chit background="#E84BA5" size="large" disabled></fig-chit></fig-choice>
      <fig-choice value="teal"><fig-chit background="#24B5A8" size="large" disabled></fig-chit></fig-choice>
      <fig-choice value="yellow"><fig-chit background="#FFCD29" size="large" disabled></fig-chit></fig-choice>
    </fig-chooser>
  </fig-field>
</div>`,
      },
      {
        id: "palettes",
        name: "Palettes",
        markup: `<div class="prop-panel">
  <fig-field direction="vertical">
    <label>Palettes</label>
    <fig-chooser layout="vertical" value="sunset" full drag style="max-height: 240px">
      <fig-choice value="sunset" selected><fig-input-palette value="#FF6B6B,#FFA07A,#FFD700,#FF4500" fixed disabled full></fig-input-palette></fig-choice>
      <fig-choice value="ocean"><fig-input-palette value="#0D99FF,#00CEC9,#6C5CE7,#0984E3" fixed disabled full></fig-input-palette></fig-choice>
      <fig-choice value="forest"><fig-input-palette value="#00B894,#55E6C1,#2D6A4F,#95D5B2" fixed disabled full></fig-input-palette></fig-choice>
      <fig-choice value="berry"><fig-input-palette value="#E84393,#A855F7,#6D28D9,#FD79A8" fixed disabled full></fig-input-palette></fig-choice>
      <fig-choice value="mono"><fig-input-palette value="#000000,#3A3A3A,#CFCFCF,#FFFFFF" fixed disabled full></fig-input-palette></fig-choice>
      <fig-choice value="desert"><fig-input-palette value="#7C2D12,#C2410C,#FDBA74,#FEF3C7" fixed disabled full></fig-input-palette></fig-choice>
      <fig-choice value="candy"><fig-input-palette value="#FF2E88,#FF9F1C,#FFF275,#00F5D4" fixed disabled full></fig-input-palette></fig-choice>
      <fig-choice value="midnight"><fig-input-palette value="#020617,#1E1B4B,#312E81,#38BDF8" fixed disabled full></fig-input-palette></fig-choice>
    </fig-chooser>
  </fig-field>
</div>`,
      },
      {
        id: "gradients",
        name: "Gradients",
        markup: `<div class="prop-panel">
  <fig-field direction="vertical">
    <label>Gradients</label>
    <fig-chooser layout="vertical" value="sunset-glow" full drag style="max-height: 240px">
      <fig-choice value="sunset-glow" selected><fig-input-gradient edit="false" value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#FFB347","opacity":100},{"position":50,"color":"#FF5E78","opacity":100},{"position":100,"color":"#7A2BD9","opacity":100}]}}' disabled full></fig-input-gradient></fig-choice>
      <fig-choice value="aurora"><fig-input-gradient edit="false" value='{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"position":0,"color":"#00F5A0","opacity":100},{"position":45,"color":"#00D4FF","opacity":100},{"position":100,"color":"#4B00E0","opacity":100}]}}' disabled full></fig-input-gradient></fig-choice>
      <fig-choice value="bubblegum"><fig-input-gradient edit="false" value='{"type":"gradient","gradient":{"type":"linear","angle":45,"stops":[{"position":0,"color":"#FFC2E2","opacity":100},{"position":48,"color":"#FF4FA2","opacity":100},{"position":52,"color":"#7DF3D4","opacity":100},{"position":100,"color":"#2EB39A","opacity":100}]}}' disabled full></fig-input-gradient></fig-choice>
      <fig-choice value="holographic"><fig-input-gradient edit="false" value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#FF6EC7","opacity":100},{"position":25,"color":"#FFD86E","opacity":100},{"position":50,"color":"#6EE7FF","opacity":100},{"position":75,"color":"#A06EFF","opacity":100},{"position":100,"color":"#FF6E9A","opacity":100}]}}' disabled full></fig-input-gradient></fig-choice>
      <fig-choice value="chrome"><fig-input-gradient edit="false" value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#111827","opacity":100},{"position":18,"color":"#F8FAFC","opacity":100},{"position":34,"color":"#94A3B8","opacity":100},{"position":52,"color":"#FFFFFF","opacity":100},{"position":70,"color":"#475569","opacity":100},{"position":100,"color":"#E2E8F0","opacity":100}]}}' disabled full></fig-input-gradient></fig-choice>
      <fig-choice value="black-white"><fig-input-gradient edit="false" value='{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"position":0,"color":"#000000","opacity":100},{"position":28,"color":"#FFFFFF","opacity":100},{"position":50,"color":"#1F2937","opacity":100},{"position":72,"color":"#FFFFFF","opacity":100},{"position":100,"color":"#000000","opacity":100}]}}' disabled full></fig-input-gradient></fig-choice>
      <fig-choice value="laser-lemonade"><fig-input-gradient edit="false" value='{"type":"gradient","gradient":{"type":"linear","angle":25,"stops":[{"position":0,"color":"#FFF700","opacity":100},{"position":30,"color":"#00FF85","opacity":100},{"position":64,"color":"#00D4FF","opacity":100},{"position":100,"color":"#FF00E5","opacity":100}]}}' disabled full></fig-input-gradient></fig-choice>
      <fig-choice value="cosmic-sorbet"><fig-input-gradient edit="false" value='{"type":"gradient","gradient":{"type":"linear","angle":155,"stops":[{"position":0,"color":"#2B0B5A","opacity":100},{"position":24,"color":"#7C3AED","opacity":100},{"position":48,"color":"#F97316","opacity":100},{"position":72,"color":"#FDE68A","opacity":100},{"position":100,"color":"#22D3EE","opacity":100}]}}' disabled full></fig-input-gradient></fig-choice>
    </fig-chooser>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "button",
    name: "Button",
    group: "Field controls",
    description:
      "A property row action button for applying, resetting, or opening a related workflow.",
    examples: [
      {
        id: "primary",
        name: "Primary",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Action</label>
    <fig-button full>Apply Changes</fig-button>
  </fig-field>
</div>`,
      },
      {
        id: "secondary",
        name: "Secondary",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Reset</label>
    <fig-button variant="secondary" full>Reset Settings</fig-button>
  </fig-field>
</div>`,
      },
      {
        id: "no-label",
        name: "No label",
        markup: `<div class="prop-panel">
  <fig-field>
    <fig-button full>Generate Preview</fig-button>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "color",
    name: "Color",
    group: "Field controls",
    description:
      "A solid color picker field with hex input and optional alpha.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Color</label>
    <fig-input-color value="#0D99FF" text="true" full></fig-input-color>
  </fig-field>
</div>`,
      },
      {
        id: "with-alpha",
        name: "With Alpha",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Color</label>
    <fig-input-color value="#0D99FF80" text="true" alpha="true" full></fig-input-color>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "dropdown",
    name: "Dropdown",
    group: "Field controls",
    description: "A dropdown select field for choosing from a set of options.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Blend Mode</label>
    <fig-dropdown full>
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
  <fig-field>
    <label>Blend Mode</label>
    <fig-dropdown full>
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
  <fig-field>
    <label>Blend Mode</label>
    <fig-dropdown full>
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
    id: "easing",
    name: "Easing Curve",
    group: "Field controls",
    description:
      "A bezier curve editor for animation easing with preset dropdown.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Easing</label>
    <fig-easing-curve value="0.42, 0, 0.58, 1"></fig-easing-curve>
  </fig-field>
</div>`,
      },
      {
        id: "preset-only",
        name: "Preset only",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Easing</label>
    <fig-easing-curve value="0, 0, 0.58, 1" edit="false"></fig-easing-curve>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "fill",
    name: "Fill",
    group: "Field controls",
    description:
      "A multi-mode fill field supporting solid, gradient, and image fills.",
    examples: [
      {
        id: "solid-alpha",
        name: "Solid",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Fill</label>
    <fig-input-fill value='{"type":"solid","color":"#667eea"}'></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "linear-gradient-cool",
        name: "Linear Gradient",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"position":0,"color":"#667eea","opacity":100},{"position":100,"color":"#764ba2","opacity":100}]}}'></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "radial-gradient-coral",
        name: "Radial Gradient",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"radial","centerX":50,"centerY":50,"stops":[{"position":0,"color":"#ff6b6b","opacity":100},{"position":100,"color":"#4ecdc4","opacity":100}]}}'></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "angular-gradient-rainbow",
        name: "Angular Gradient",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Fill</label>
    <fig-input-fill value='{"type":"gradient","gradient":{"type":"angular","stops":[{"position":0,"color":"#ff0000","opacity":100},{"position":33,"color":"#00ff00","opacity":100},{"position":66,"color":"#0000ff","opacity":100},{"position":100,"color":"#ff0000","opacity":100}]}}'></fig-input-fill>
  </fig-field>
</div>`,
      },
      {
        id: "image",
        name: "Image",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Fill</label>
    <fig-input-fill value='{"type":"image","image":{"url":"${squareUrl()}","scaleMode":"fill","scale":50,"opacity":1}}'></fig-input-fill>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "gradient",
    name: "Gradient",
    group: "Field controls",
    description:
      "A gradient stop editor with draggable color handles. Click empty space to add a stop, click a handle to edit its color.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Gradient</label>
    <fig-input-gradient value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#7AEA66","opacity":100},{"position":67,"color":"#4700FF","opacity":53},{"position":100,"color":"#FF00BF","opacity":100}]}}'></fig-input-gradient>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "image",
    name: "Image",
    group: "Field controls",
    description:
      "An accessible image field that renders media inside a fig-preview and keeps upload actions keyboard reachable.",
    examples: [
      {
        id: "plain-image",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Image</label>
    <fig-image full="true" src="${portraitUrl()}" alt="Image preview" fit="cover" size="auto" checkerboard="true"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "upload-empty",
        name: "Upload (Empty)",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Image</label>
    <fig-image full="true" upload="true" label="Upload" alt="" fit="cover" size="auto" checkerboard="true"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "upload-with-image",
        name: "Upload (With Image)",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Image</label>
    <fig-image full="true" upload="true" src="${portraitUrl()}" alt="Uploaded image preview" fit="cover" size="auto" checkerboard="true"></fig-image>
  </fig-field>
</div>`,
      },
      {
        id: "custom-buttons",
        name: "Custom Buttons",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Image</label>
    <fig-image full="true" src="${portraitUrl()}" alt="Image preview" fit="cover" size="auto" checkerboard="true">
      <fig-input-file slot="overlay" accepts="image/*" label="Change" variant="overlay"></fig-input-file>
    </fig-image>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "video",
    name: "Video",
    group: "Field controls",
    description:
      "An accessible video field with a fig-preview media surface and playback controls that attach below the preview.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Video</label>
    <fig-video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" aria-label="Flower video preview" poster="https://picsum.photos/640/360?random=29" autoplay="true" controls muted fit="cover" size="auto" full checkerboard="true"></fig-video>
  </fig-field>
</div>`,
      },
      {
        id: "poster-only",
        name: "Poster",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Video</label>
    <fig-video aria-label="Poster-only video preview" poster="https://picsum.photos/640/360?random=29" muted fit="cover" size="auto" full checkerboard="true"></fig-video>
  </fig-field>
</div>`,
      },
      {
        id: "upload",
        name: "Upload",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Video</label>
    <fig-video upload="true" aria-label="Uploaded video preview" controls muted fit="cover" size="auto" full checkerboard="true"></fig-video>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "media",
    name: "Media",
    group: "Field controls",
    description:
      "A media field using the PropKit row pattern with image/video support, a fig-preview surface, keyboard-reachable upload, and bottom playback controls.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Preview</label>
    <fig-media type="video" src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" aria-label="Flower media preview" poster="https://picsum.photos/320.webp?random=29" autoplay="true" controls muted="true" upload="true" fit="contain" size="auto" full checkerboard="true"></fig-media>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "preview",
    name: "Preview",
    group: "Field controls",
    description:
      "A thin visual surface for showing arbitrary rendered content like images, canvas, SVG, or generated previews.",
    examples: [
      {
        id: "image",
        name: "Image",
        markup: `<div class="prop-panel">
  <fig-field>
    <fig-preview full checkerboard>
      <img src="${variedAspectRatioUrl()}" alt="Landscape preview">
    </fig-preview>
  </fig-field>
</div>`,
      },
      {
        id: "canvas",
        name: "Canvas",
        markup: `<div class="prop-panel">
  <fig-field>
    <fig-preview full style="height: 96px">
      <canvas width="320" height="180" aria-label="Generated shader preview" style="width: 100%; height: 100%; background: radial-gradient(circle at 20% 25%, #FFFFFFAA 0 8%, transparent 20%), radial-gradient(circle at 78% 35%, #7AEA66 0 12%, transparent 32%), radial-gradient(circle at 42% 72%, #FFCD29 0 10%, transparent 30%), conic-gradient(from 210deg at 52% 48%, #0D99FF, #9747FF, #FF00BF, #FF7262, #7AEA66, #0D99FF); filter: saturate(1.35) contrast(1.1);"></canvas>
    </fig-preview>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "joystick",
    name: "Joystick",
    group: "Field controls",
    description: "A 2D position control with optional coordinate modes.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Position</label>
    <fig-joystick value="50% 50%" axis-labels="X Y"></fig-joystick>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "number",
    name: "Number",
    group: "Field controls",
    description:
      "A numeric input field for precise typed values with optional units and bounds.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Amount</label>
    <fig-input-number value="50" min="0" max="100" step="0.5" steppers></fig-input-number>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "origin-grid",
    name: "Origin Grid",
    group: "Field controls",
    description:
      "A 3x3 transform-origin selector with draggable point selection and XY values.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Origin</label>
    <fig-origin-grid value="50% 50%" drag="true" fields="true"></fig-origin-grid>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "palette",
    name: "Palette",
    group: "Field controls",
    description:
      "A color palette field for managing a list of solid colors.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Palette</label>
    <fig-input-palette value='["#0D99FF","#14AE5C","#FFCD29","#FF7262","#9747FF"]' full></fig-input-palette>
  </fig-field>
</div>`,
      },
      {
        id: "minimal",
        name: "Minimal",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Palette</label>
    <fig-input-palette value='["#D9D9D9","#FFFFFF"]' full></fig-input-palette>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "segment",
    name: "Segmented control",
    group: "Field controls",
    description: "A segmented control for mutually exclusive choices.",
    examples: [
      {
        id: "default",
        name: "Text",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Align</label>
    <fig-segmented-control sizing="equal" full data-playground-hide-attrs="value,name">
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
  <fig-field>
    <label>Theme</label>
    <fig-segmented-control sizing="equal" full data-playground-hide-attrs="value,name">
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
    id: "options",
    name: "Options",
    group: "Field controls",
    description:
      "A responsive option picker that shows a segmented control by default, swapping to a dropdown when labels overflow.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Size</label>
    <fig-options options="Small,Large" value="Small"></fig-options>
  </fig-field>
</div>`,
      },
      {
        id: "many-options",
        name: "Many options",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Size</label>
    <fig-options options="Extra Small,Small,Medium,Large,Extra Large" value="Medium"></fig-options>
  </fig-field>
</div>`,
      },
      {
        id: "narrow",
        name: "Narrow container",
        markup: `<div class="prop-panel" style="max-width: 140px;">
  <fig-field>
    <label>Align</label>
    <fig-options options="Left,Center,Right" value="Left"></fig-options>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "skeleton",
    name: "Skeleton",
    group: "Field controls",
    description:
      "A skeleton loading placeholder that wraps property fields with a shimmer effect.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-skeleton duration="1.5s">
    <fig-field>
      <fig-preview full checkerboard style="height: 96px">
        <img src="${landscapeUrl()}" alt="Landscape preview">
      </fig-preview>
    </fig-field>
    <fig-field>
      <label>Name</label>
      <fig-input-text value="Loading..." readonly></fig-input-text>
    </fig-field>
    <fig-field>
      <label>Description</label>
      <fig-input-text multiline placeholder="Enter description…" full></fig-input-text>
    </fig-field>
    <fig-field>
      <label>Color</label>
      <fig-input-color value="#0D99FF" text="true" full></fig-input-color>
    </fig-field>
    <fig-field>
      <label>Published</label>
      <fig-switch checked="true"></fig-switch>
    </fig-field>
    <fig-field>
      <label>Visible</label>
      <fig-switch checked="true"></fig-switch>
    </fig-field>
    <fig-field>
      <label>Role</label>
      <fig-dropdown value="designer">
        <option value="designer">Designer</option>
        <option value="developer">Developer</option>
        <option value="manager">Manager</option>
      </fig-dropdown>
    </fig-field>
    <fig-field>
      <label>Align</label>
      <fig-segmented-control sizing="equal" full>
        <fig-segment value="left" selected>Left</fig-segment>
        <fig-segment value="center">Center</fig-segment>
        <fig-segment value="right">Right</fig-segment>
      </fig-segmented-control>
    </fig-field>
    <fig-field>
      <label>Opacity</label>
      <fig-slider value="75" min="0" max="100"></fig-slider>
    </fig-field>
    <fig-field>
      <label>Position</label>
      <fig-joystick value="50% 50%" axis-labels="X Y"></fig-joystick>
    </fig-field>
  </fig-skeleton>
</div>`,
      },
    ],
  },
  {
    id: "slider",
    name: "Slider",
    group: "Field controls",
    description:
      "A range slider with optional text input for precise numeric values.",
    examples: [
      {
        id: "range",
        name: "Range",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Amount</label>
    <fig-slider value="50" min="0" max="100" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "opacity-with-text",
        name: "Opacity",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Opacity</label>
    <fig-slider type="opacity" value="75" color="#ff0000" units="%" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "hue-with-text",
        name: "Hue",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Hue</label>
    <fig-slider type="hue" value="180" units="°" full></fig-slider>
  </fig-field>
</div>`,
      },
      {
        id: "stepper-with-text",
        name: "Stepper",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Steps</label>
    <fig-slider type="stepper" value="50" step="25" full>
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
  <fig-field>
    <label>Offset</label>
    <fig-slider type="delta" value="0" default="0" step="0.25" min="-5" max="5" full>
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
    id: "switch",
    name: "Switch",
    group: "Field controls",
    description: "A toggle switch for boolean on/off properties.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Visible</label>
    <fig-switch checked="true"></fig-switch>
  </fig-field>
</div>`,
      },
      {
        id: "indeterminate",
        name: "Indeterminate",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Visible</label>
    <fig-switch indeterminate="true"></fig-switch>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "text",
    name: "Text",
    group: "Field controls",
    description:
      "A text input field for entering and editing string values with optional slots.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Name</label>
    <fig-input-text value="Layer 1" placeholder="Enter name…" full></fig-input-text>
  </fig-field>
</div>`,
      },
      {
        id: "multiline",
        name: "Multiline",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Description</label>
    <fig-input-text multiline autoresize placeholder="Enter description…" full></fig-input-text>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "file",
    name: "File",
    group: "Field controls",
    description:
      "A file upload input with filename display, clear button, accepted types tooltip, and drag-and-drop support.",
    examples: [
      {
        id: "any-file",
        name: "Any",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>File</label>
    <fig-input-file label="Upload file" full></fig-input-file>
  </fig-field>
</div>`,
      },
      {
        id: "audio",
        name: "Audio",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Audio</label>
    <fig-input-file label="Upload audio" accepts=".wav,.mp3,.aac" full></fig-input-file>
  </fig-field>
</div>`,
      },
      {
        id: "image",
        name: "Image",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Image</label>
    <fig-input-file label="Upload image" accepts="image/*" full></fig-input-file>
  </fig-field>
</div>`,
      },
      {
        id: "video",
        name: "Video",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Video</label>
    <fig-input-file label="Upload video" accepts="video/*" full></fig-input-file>
  </fig-field>
</div>`,
      },
      {
        id: "spreadsheet",
        name: "Spreadsheet",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Spreadsheet</label>
    <fig-input-file label="Upload spreadsheet" accepts=".xls,.xlsx,.csv" full></fig-input-file>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "dialog-rename",
    name: "Rename Layer",
    group: "Controls in dialogs",
    description:
      "A minimal rename dialog with a single text input and confirm action.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Rename</fig-button>
  <dialog is="fig-dialog" title="Rename Layer" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
      <fig-field columns="half">
        <label>Name</label>
        <fig-input-text value="Frame 1" full></fig-input-text>
      </fig-field>
    </fig-content>
    <fig-footer>
      <fig-button variant="secondary" close-dialog>Cancel</fig-button>
      <fig-button>Rename</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-all-fields",
    name: "All Fields",
    group: "Controls in dialogs",
    description:
      "A reference dialog containing every PropKit field control using plain fig-field rows.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open All Fields</fig-button>
  <dialog is="fig-dialog" title="All Fields" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
      <fig-group name="Inputs" collapsible open>
        <fig-field>
          <label>Text</label>
          <fig-input-text value="Layer 1" placeholder="Enter name…" full></fig-input-text>
        </fig-field>
        <fig-field>
          <label>Number</label>
          <fig-input-number value="50" min="0" max="100" step="0.5" steppers full></fig-input-number>
        </fig-field>
        <fig-field>
          <label>File</label>
          <fig-input-file label="Upload file" full></fig-input-file>
        </fig-field>
        <fig-field>
          <label>Color</label>
          <fig-input-color value="#0D99FF" text="true" alpha="true" full></fig-input-color>
        </fig-field>
        <fig-field>
          <label>Fill</label>
          <fig-input-fill value='{"type":"solid","color":"#0D99FF","opacity":0.8}'></fig-input-fill>
        </fig-field>
        <fig-field>
          <label>Gradient</label>
          <fig-input-gradient value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#7AEA66","opacity":100},{"position":67,"color":"#4700FF","opacity":53},{"position":100,"color":"#FF00BF","opacity":100}]}}'></fig-input-gradient>
        </fig-field>
        <fig-field>
          <label>Palette</label>
          <fig-input-palette value='["#0D99FF","#14AE5C","#FFCD29","#FF7262","#9747FF"]' full></fig-input-palette>
        </fig-field>
      </fig-group>
      <fig-group name="Choices" collapsible open>
        <fig-field>
          <label>Dropdown</label>
          <fig-dropdown full>
            <option selected>Auto</option>
            <option>Light</option>
            <option>Dark</option>
          </fig-dropdown>
        </fig-field>
        <fig-field>
          <label>Segment</label>
          <fig-segmented-control sizing="equal" full>
            <fig-segment value="left" selected>Left</fig-segment>
            <fig-segment value="center">Center</fig-segment>
            <fig-segment value="right">Right</fig-segment>
          </fig-segmented-control>
        </fig-field>
        <fig-field>
          <label>Options</label>
          <fig-options options="Small,Medium,Large" value="Medium"></fig-options>
        </fig-field>
        <fig-field>
          <label>Switch</label>
          <fig-switch checked="true"></fig-switch>
        </fig-field>
        <fig-field>
          <label>Button</label>
          <fig-button full>Apply</fig-button>
        </fig-field>
        <fig-field>
          <label>Chooser</label>
          <fig-chooser layout="horizontal" value="img-a" full drag style="max-width: 100%">
            <fig-choice value="img-a" aria-label="Image A" selected><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
            <fig-choice value="img-b" aria-label="Image B"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
            <fig-choice value="img-c" aria-label="Image C"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
          </fig-chooser>
        </fig-field>
        <fig-field>
          <label>Grid</label>
          <fig-chooser layout="grid" columns="3" value="top-left" full>
            <fig-choice value="top-left" padding selected>Top left</fig-choice>
            <fig-choice value="top" padding>Top</fig-choice>
            <fig-choice value="top-right" padding>Top right</fig-choice>
            <fig-choice value="left" padding>Left</fig-choice>
            <fig-choice value="center" padding>Center</fig-choice>
            <fig-choice value="right" padding>Right</fig-choice>
            <fig-choice value="bottom-left" padding>Bottom left</fig-choice>
            <fig-choice value="bottom" padding>Bottom</fig-choice>
            <fig-choice value="bottom-right" padding>Bottom right</fig-choice>
          </fig-chooser>
        </fig-field>
      </fig-group>
      <fig-group name="Visuals" collapsible open>
        <fig-field>
          <label>Image</label>
          <fig-image full="true" src="${portraitUrl()}" alt="Image preview" size="auto" checkerboard="true"></fig-image>
        </fig-field>
        <fig-field>
          <label>Media</label>
          <fig-media type="video" src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" aria-label="Media preview" poster="https://picsum.photos/320.webp?random=29" autoplay="true" controls muted="true" fit="contain" size="auto" full checkerboard="true"></fig-media>
        </fig-field>
        <fig-field>
          <label>Preview</label>
          <fig-preview full checkerboard style="height: 96px">
            <img src="${landscapeUrl()}" alt="Landscape preview">
          </fig-preview>
        </fig-field>
        <fig-skeleton duration="1.5s">
          <fig-field>
            <label>Skeleton</label>
            <fig-input-text value="Loading..." readonly full></fig-input-text>
          </fig-field>
        </fig-skeleton>
      </fig-group>
      <fig-group name="Spatial" collapsible open>
        <fig-field>
          <label>Slider</label>
          <fig-slider value="50" min="0" max="100" full></fig-slider>
        </fig-field>
        <fig-field>
          <label>Easing</label>
          <fig-easing-curve value="0, 0, 0.58, 1"></fig-easing-curve>
        </fig-field>
        <fig-field>
          <label>Joystick</label>
          <fig-joystick value="50% 50%" axis-labels="X Y"></fig-joystick>
        </fig-field>
        <fig-field>
          <label>Origin</label>
          <fig-origin-grid value="50% 50%" drag="true" fields="true"></fig-origin-grid>
        </fig-field>
        <fig-field>
          <label>3D Rotate</label>
          <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)"></fig-3d-rotate>
        </fig-field>
      </fig-group>
    </fig-content>
    <fig-footer>
      <fig-button variant="secondary" close-dialog>Cancel</fig-button>
      <fig-button>Apply</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-horizontal-fields-stress-test",
    name: "Horizontal fields stress test",
    group: "Controls in dialogs",
    description:
      "A stress test dialog based on All Fields, with every PropKit field rendered as a horizontal row with realistic property labels.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Stress Test</fig-button>
  <dialog is="fig-dialog" title="Horizontal Fields" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
      <fig-group name="Inputs" collapsible open>
        <fig-field direction="horizontal">
          <label>Layer Name</label>
          <fig-input-text value="Hero Card" placeholder="Enter name…" full></fig-input-text>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Width</label>
          <fig-input-number value="240" min="0" max="1920" step="1" steppers full></fig-input-number>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Corner Radius</label>
          <fig-slider type="range" value="12" min="0" max="64" step="1" units="px" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Stroke Weight</label>
          <fig-slider type="range" value="2" min="0" max="12" step="0.5" units="px" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Glow Opacity</label>
          <fig-slider type="opacity" value="75" min="0" max="100" step="1" units="%" color="#0D99FF" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Brand Hue</label>
          <fig-slider type="hue" value="210" min="0" max="360" step="1" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>X Offset</label>
          <fig-slider type="delta" value="0" default="0" min="-100" max="100" step="1" units="px" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Letter Spacing</label>
          <fig-slider type="delta" value="0" default="0" min="-5" max="20" step="0.25" units="%" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Grid Size</label>
          <fig-slider type="stepper" value="16" min="4" max="64" step="4" units="px" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Motion Speed</label>
          <fig-slider type="stepper" value="300" min="100" max="1000" step="100" units="ms" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Blur Amount</label>
          <fig-slider type="range" value="8" min="0" max="40" step="1" units="px" variant="classic" text="true" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Source File</label>
          <fig-input-file label="Upload file" full></fig-input-file>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Accent Color</label>
          <fig-input-color value="#0D99FF" text="true" alpha="true" full></fig-input-color>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Background</label>
          <fig-input-fill value='{"type":"solid","color":"#0D99FF","opacity":0.8}'></fig-input-fill>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Brand Fade</label>
          <fig-input-gradient value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#7AEA66","opacity":100},{"position":67,"color":"#4700FF","opacity":53},{"position":100,"color":"#FF00BF","opacity":100}]}}'></fig-input-gradient>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Swatches</label>
          <fig-input-palette value='["#0D99FF","#14AE5C","#FFCD29","#FF7262","#9747FF"]' full></fig-input-palette>
        </fig-field>
      </fig-group>
      <fig-group name="Choices" collapsible open>
        <fig-field direction="horizontal">
          <label>Theme</label>
          <fig-dropdown full>
            <option selected>Auto</option>
            <option>Light</option>
            <option>Dark</option>
          </fig-dropdown>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Alignment</label>
          <fig-segmented-control sizing="equal" full>
            <fig-segment value="left" selected>Left</fig-segment>
            <fig-segment value="center">Center</fig-segment>
            <fig-segment value="right">Right</fig-segment>
          </fig-segmented-control>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Density</label>
          <fig-options options="Compact,Regular,Spacious" value="Regular"></fig-options>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Visible</label>
          <fig-switch checked="true"></fig-switch>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Quick Action</label>
          <fig-button full>Generate</fig-button>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Cover Image</label>
          <fig-chooser layout="horizontal" value="img-a" full drag style="max-width: 100%">
            <fig-choice value="img-a" aria-label="Cover image A" selected><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
            <fig-choice value="img-b" aria-label="Cover image B"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
            <fig-choice value="img-c" aria-label="Cover image C"><fig-image src="${landscapeUrl()}" alt="" size="small" aspect-ratio="1/1" full></fig-image></fig-choice>
          </fig-chooser>
        </fig-field>
      </fig-group>
      <fig-group name="Visuals" collapsible open>
        <fig-field direction="horizontal">
          <label>Avatar</label>
          <fig-image full="true" src="${portraitUrl()}" alt="Avatar preview" size="auto" checkerboard="true"></fig-image>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Demo Video</label>
          <fig-media type="video" src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" aria-label="Demo video" poster="https://picsum.photos/320.webp?random=29" autoplay="true" controls muted="true" fit="contain" size="auto" full checkerboard="true"></fig-media>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Card Preview</label>
          <fig-preview full checkerboard style="height: 96px">
            <img src="${landscapeUrl()}" alt="Card preview">
          </fig-preview>
        </fig-field>
        <fig-skeleton duration="1.5s">
          <fig-field direction="horizontal">
            <label>Loading State</label>
            <fig-input-text value="Loading..." readonly full></fig-input-text>
          </fig-field>
        </fig-skeleton>
      </fig-group>
      <fig-group name="Spatial" collapsible open>
        <fig-field direction="horizontal">
          <label>Opacity</label>
          <fig-slider value="50" min="0" max="100" units="%" full></fig-slider>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Motion</label>
          <fig-easing-curve value="0, 0, 0.58, 1"></fig-easing-curve>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Anchor Point</label>
          <fig-joystick value="50% 50%" axis-labels="X Y"></fig-joystick>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Transform Origin</label>
          <fig-origin-grid value="50% 50%" drag="true" fields="true"></fig-origin-grid>
        </fig-field>
        <fig-field direction="horizontal">
          <label>Tilt</label>
          <fig-3d-rotate value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)"></fig-3d-rotate>
        </fig-field>
      </fig-group>
    </fig-content>
    <fig-footer>
      <fig-button variant="secondary" close-dialog>Cancel</fig-button>
      <fig-button>Apply</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-shadow",
    name: "Shadow",
    group: "Controls in dialogs",
    description:
      "A drop shadow editor with color, offset, blur, and spread controls.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Shadow</fig-button>
  <dialog is="fig-dialog" title="Shadow" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
      <fig-field columns="half">
        <label>X</label>
        <fig-input-number value="0" steppers="true" full></fig-input-number>
      </fig-field>
      <fig-field columns="half">
        <label>Y</label>
        <fig-input-number value="4" steppers="true" full></fig-input-number>
      </fig-field>
      <fig-field columns="half">
        <label>Color</label>
        <fig-input-color value="#000000" text="true" alpha="true" full></fig-input-color>
      </fig-field>
      <fig-field columns="half">
        <label>Blur</label>
        <fig-slider value="8" min="0" max="64" text="true" units="px" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Spread</label>
        <fig-slider value="0" min="-32" max="32" text="true" units="px" full></fig-slider>
      </fig-field>
    </fig-content>
    <fig-footer>
      <fig-button>Apply</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-blur",
    name: "Progressive Blur",
    group: "Controls in dialogs",
    description:
      "A progressive blur settings dialog with amount, fade range, and direction controls.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Blur</fig-button>
  <dialog is="fig-dialog" title="Progressive Blur" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
      <fig-field columns="half">
        <label>Amount</label>
        <fig-slider value="12" min="0" max="64" text="true" units="px" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Fade start</label>
        <fig-slider value="20" min="0" max="100" text="true" units="%" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Fade end</label>
        <fig-slider value="80" min="0" max="100" text="true" units="%" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Direction</label>
        <fig-dropdown full>
          <option selected>Top to bottom</option>
          <option>Bottom to top</option>
          <option>Left to right</option>
          <option>Right to left</option>
        </fig-dropdown>
      </fig-field>
    </fig-content>
    <fig-footer>
      <fig-button variant="secondary" close-dialog>Cancel</fig-button>
      <fig-button>Apply</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-photo-stack",
    name: "Photo Stack",
    group: "Controls in dialogs",
    description:
      "A photo composition plugin dialog with text, color, shape, offset, transition, and dark mode controls across multiple collapsible groups.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Photo Stack</fig-button>
  <dialog is="fig-dialog" title="Photo Stack" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
      <fig-group>
      <fig-field columns="half">
        <label>Title</label>
        <fig-input-text value="Japan" full></fig-input-text>
      </fig-field>
      <fig-field columns="half">
        <label>Subtitle</label>
        <fig-input-text value="December 2025" full></fig-input-text>
      </fig-field>
      <fig-field columns="half">
        <label>Shadow Tint</label>
        <fig-input-color value="#000000" text="true" full></fig-input-color>
      </fig-field>
      <fig-field columns="half">
        <label>Photo Shape</label>
        <fig-dropdown full>
          <option selected>Portrait</option>
          <option>Landscape</option>
          <option>Square</option>
        </fig-dropdown>
      </fig-field>
    </fig-group>
    <fig-group name="Back Photo" collapsible open>
      <fig-field columns="half">
        <label>Offset X</label>
        <fig-slider type="delta" value="239" default="0" min="-500" max="500" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Offset Y</label>
        <fig-slider type="delta" value="0" default="0" min="-500" max="500" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Scale</label>
        <fig-slider value="0.70" step="0.01" min="0" max="2" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Overlay Opacity</label>
        <fig-slider type="opacity" value="0.60" color="#000000" text="true" full></fig-slider>
      </fig-field>
    </fig-group>
    <fig-group name="Shadow" collapsible open>
      <fig-field columns="half">
        <label>Scale</label>
        <fig-slider value="1.03" step="0.01" min="0" max="2" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Opacity</label>
        <fig-slider type="opacity" value="0.25" color="#000000" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Blur</label>
        <fig-slider value="14" min="0" max="64" text="true" units="px" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Y Offset</label>
        <fig-slider type="delta" value="8" default="0" min="-50" max="50" text="true" full></fig-slider>
      </fig-field>
    </fig-group>
    <fig-group name="Transition Spring" collapsible open>
      <fig-field columns="half">
        <label>Type</label>
        <fig-segmented-control full>
          <fig-segment value="time" selected>Time</fig-segment>
          <fig-segment value="physics">Physics</fig-segment>
        </fig-segmented-control>
      </fig-field>
      <fig-field columns="half">
        <label>Duration</label>
        <fig-slider value="0.50" step="0.01" min="0" max="2" text="true" units="s" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Bounce</label>
        <fig-slider value="0.04" step="0.01" min="0" max="1" text="true" full></fig-slider>
      </fig-field>
    </fig-group>
    <fig-field columns="half">
      <label>Dark Mode</label>
      <fig-switch checked></fig-switch>
    </fig-field>
    </fig-content>
    <fig-footer>
      <fig-button>Next</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-iframe",
    name: "Plugin",
    group: "Controls in dialogs",
    description:
      "A plugin dialog hosting its contents inside an iframe that broadcasts height changes to the parent.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Plugin</fig-button>
  <dialog is="fig-dialog" title="Plugin" open handle="fig-header" position="center center" autoresize data-playground-hide-field style="width: 300px;">
    <iframe src="/propkit/iframe.html"></iframe>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-iframe-alt",
    name: "Plugin (alt)",
    group: "Controls in dialogs",
    description:
      "A plugin dialog hosting a character-finder style panel inside an iframe (static UI demo).",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Plugin (alt)</fig-button>
  <dialog is="fig-dialog" title="Plugin (alt)" open handle="fig-header" position="center center" autoresize data-playground-hide-field style="width: 300px;">
    <iframe src="/propkit/plugin-alt.html"></iframe>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-export",
    name: "Export Settings",
    group: "Controls in dialogs",
    description:
      "An export dialog with format, quality, scale, filename, and metadata controls across grouped sections.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Export</fig-button>
  <dialog is="fig-dialog" title="Export Settings" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
    <fig-group name="Format">
      <fig-field columns="half">
        <label>Format</label>
        <fig-segmented-control full>
          <fig-segment value="png" selected>PNG</fig-segment>
          <fig-segment value="svg">SVG</fig-segment>
          <fig-segment value="pdf">PDF</fig-segment>
        </fig-segmented-control>
      </fig-field>
      <fig-field columns="half">
        <label>Quality</label>
        <fig-dropdown full>
          <option>Low</option>
          <option selected>Medium</option>
          <option>High</option>
          <option>Maximum</option>
        </fig-dropdown>
      </fig-field>
      <fig-field columns="half">
        <label>Scale</label>
        <fig-slider value="2" min="1" max="4" step="0.5" text="true" units="x" full></fig-slider>
      </fig-field>
    </fig-group>
    <fig-group name="Output">
      <fig-field columns="half">
        <label>Filename</label>
        <fig-input-text value="design-export" full></fig-input-text>
      </fig-field>
      <fig-field columns="half">
        <label>Metadata</label>
        <fig-switch checked></fig-switch>
      </fig-field>
      <fig-field columns="half">
        <label>Flatten layers</label>
        <fig-switch></fig-switch>
      </fig-field>
    </fig-group>
    </fig-content>
    <fig-footer>
      <fig-button variant="secondary" close-dialog>Cancel</fig-button>
      <fig-button>Export</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-token-editor",
    name: "Design Token Editor",
    group: "Controls in dialogs",
    description:
      "A complex multi-group dialog for editing design tokens with identity, value, variant, and usage sections.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Token Editor</fig-button>
  <dialog is="fig-dialog" title="Design Token Editor" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
    <fig-group name="Token">
      <fig-field>
        <label>Name</label>
        <fig-input-text value="color-primary" full></fig-input-text>
      </fig-field>
      <fig-field>
        <label>Description</label>
        <fig-input-text value="Primary brand color" full></fig-input-text>
      </fig-field>
      <fig-field>
        <label>Type</label>
        <fig-dropdown full>
          <option selected>Color</option>
          <option>Spacing</option>
          <option>Typography</option>
          <option>Border radius</option>
        </fig-dropdown>
      </fig-field>
    </fig-group>
    <fig-group name="Value">
      <fig-field>
        <label>Color</label>
        <fig-input-color value="#0D99FF" text="true" alpha="true" full></fig-input-color>
      </fig-field>
      <fig-field>
        <label>Opacity</label>
        <fig-slider type="opacity" value="1" color="#0D99FF" units="%" text="true" full></fig-slider>
      </fig-field>
      <fig-field>
        <label>CSS variable</label>
        <fig-input-text value="--color-primary" full></fig-input-text>
      </fig-field>
    </fig-group>
    <fig-group name="Variants" collapsible open>
      <fig-field>
        <label>Palette</label>
        <fig-input-palette value='["#0D99FF","#0B7FD4","#0966AA","#074D80"]' full></fig-input-palette>
      </fig-field>
      <fig-field>
        <label>Mode</label>
        <fig-segmented-control full>
          <fig-segment value="light" selected>Light</fig-segment>
          <fig-segment value="dark">Dark</fig-segment>
        </fig-segmented-control>
      </fig-field>
      <fig-field>
        <label>Auto-generate</label>
        <fig-switch checked></fig-switch>
      </fig-field>
    </fig-group>
    <fig-group name="Usage" collapsible open>
      <fig-field>
        <label>Preview</label>
        <fig-image full upload="true" alt="" size="auto"></fig-image>
      </fig-field>
      <fig-field>
        <label>Publish</label>
        <fig-switch></fig-switch>
      </fig-field>
    </fig-group>
    </fig-content>
    <fig-footer>
      <fig-button variant="secondary" close-dialog>Discard</fig-button>
      <fig-button>Save Token</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-prepress",
    name: "Prepress",
    group: "Controls in dialogs",
    description:
      "A print production tools dialog with tabbed sections for setup, guides, CMYK, preflight, and export settings.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Prepress</fig-button>
  <dialog is="fig-dialog" title="Prepress" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
    <fig-tabs>
      <fig-tab selected content="#prepress-setup">Setup</fig-tab>
      <fig-tab content="#prepress-guides">Guides</fig-tab>
      <fig-tab content="#prepress-cmyk">CMYK</fig-tab>
      <fig-tab content="#prepress-preflight">Preflight</fig-tab>
      <fig-tab content="#prepress-export">Export</fig-tab>
    </fig-tabs>
    <fig-tab-content id="prepress-setup">
      <fig-group name="Project Type">
        <fig-field columns="half">
          <fig-segmented-control full>
            <fig-segment value="editorial" selected>Editorial</fig-segment>
            <fig-segment value="packaging">Packaging</fig-segment>
            <fig-segment value="general">General</fig-segment>
          </fig-segmented-control>
        </fig-field>
      </fig-group>
      <fig-group name="Trim Size">
        <fig-field columns="half">
          <fig-dropdown full>
            <option selected>US Letter (8.5×11in)</option>
            <option>A4 (210×297mm)</option>
            <option>A5 (148×210mm)</option>
            <option>Tabloid (11×17in)</option>
            <option>Custom</option>
          </fig-dropdown>
        </fig-field>
        <fig-field columns="half">
          <label>Width</label>
          <fig-input-number value="8.5" min="0" step="0.25" suffix="in" full></fig-input-number>
        </fig-field>
        <fig-field columns="half">
          <label>Height</label>
          <fig-input-number value="11" min="0" step="0.25" suffix="in" full></fig-input-number>
        </fig-field>
      </fig-group>
      <fig-group name="Print Margins">
        <fig-field columns="half">
          <label>Bleed</label>
          <fig-input-number value="0.125" min="0" step="0.0625" suffix="in" full></fig-input-number>
        </fig-field>
        <fig-field columns="half">
          <label>Safe Area</label>
          <fig-input-number value="0.25" min="0" step="0.0625" suffix="in" full></fig-input-number>
        </fig-field>
      </fig-group>
      <fig-group name="Apply To">
        <fig-field columns="half">
          <fig-options options="Current Frame,Selection,All Frames" value="Current Frame" full></fig-options>
        </fig-field>
      </fig-group>
      <fig-footer>
        <fig-button variant="secondary">Create Frame</fig-button>
        <fig-button>Apply Setup</fig-button>
      </fig-footer>
    </fig-tab-content>
    <fig-tab-content id="prepress-guides">
      <fig-group name="Guide Style">
        <fig-field columns="half">
          <label>Color</label>
          <fig-input-color value="#FF00FF" text="true" full></fig-input-color>
        </fig-field>
        <fig-field columns="half">
          <label>Opacity</label>
          <fig-slider type="opacity" value="0.5" color="#FF00FF" units="%" text="true" full></fig-slider>
        </fig-field>
        <fig-field columns="half">
          <label>Stroke</label>
          <fig-dropdown full>
            <option selected>Dashed</option>
            <option>Solid</option>
            <option>Dotted</option>
          </fig-dropdown>
        </fig-field>
      </fig-group>
      <fig-group name="Margins">
        <fig-field columns="half">
          <label>Top</label>
          <fig-input-number value="0.5" min="0" step="0.125" suffix="in" full></fig-input-number>
        </fig-field>
        <fig-field columns="half">
          <label>Bottom</label>
          <fig-input-number value="0.5" min="0" step="0.125" suffix="in" full></fig-input-number>
        </fig-field>
        <fig-field columns="half">
          <label>Left</label>
          <fig-input-number value="0.75" min="0" step="0.125" suffix="in" full></fig-input-number>
        </fig-field>
        <fig-field columns="half">
          <label>Right</label>
          <fig-input-number value="0.75" min="0" step="0.125" suffix="in" full></fig-input-number>
        </fig-field>
      </fig-group>
      <fig-group name="Columns">
        <fig-field columns="half">
          <label>Count</label>
          <fig-input-number value="1" min="1" max="12" step="1" full></fig-input-number>
        </fig-field>
        <fig-field columns="half">
          <label>Gutter</label>
          <fig-input-number value="0.1667" min="0" step="0.0625" suffix="in" full></fig-input-number>
        </fig-field>
      </fig-group>
      <fig-footer>
        <fig-button variant="secondary">Clear Guides</fig-button>
        <fig-button>Apply Guides</fig-button>
      </fig-footer>
    </fig-tab-content>
    <fig-tab-content id="prepress-cmyk">
      <fig-group name="Color Profile">
        <fig-field columns="half">
          <label>Profile</label>
          <fig-dropdown full>
            <option selected>SWOP (Coated)</option>
            <option>GRACoL 2006</option>
            <option>Fogra39</option>
            <option>Japan Color 2001</option>
          </fig-dropdown>
        </fig-field>
        <fig-field columns="half">
          <label>Intent</label>
          <fig-dropdown full>
            <option>Perceptual</option>
            <option selected>Relative</option>
            <option>Saturation</option>
            <option>Absolute</option>
          </fig-dropdown>
        </fig-field>
      </fig-group>
      <fig-group name="Ink Limits">
        <fig-field columns="half">
          <label>Total ink</label>
          <fig-slider value="300" min="200" max="400" step="5" text="true" units="%" full></fig-slider>
        </fig-field>
        <fig-field columns="half">
          <label>Black limit</label>
          <fig-slider value="100" min="0" max="100" step="5" text="true" units="%" full></fig-slider>
        </fig-field>
      </fig-group>
      <fig-group name="Overprint">
        <fig-field columns="half">
          <label>Simulate</label>
          <fig-switch checked></fig-switch>
        </fig-field>
        <fig-field columns="half">
          <label>Black overprint</label>
          <fig-switch checked></fig-switch>
        </fig-field>
      </fig-group>
      <fig-footer>
        <fig-button variant="secondary">Reset</fig-button>
        <fig-button>Apply Profile</fig-button>
      </fig-footer>
    </fig-tab-content>
    <fig-tab-content id="prepress-preflight">
      <fig-group name="Checks">
        <fig-field columns="half">
          <label>Resolution</label>
          <fig-segmented-control full>
            <fig-segment value="150">150 dpi</fig-segment>
            <fig-segment value="300" selected>300 dpi</fig-segment>
            <fig-segment value="600">600 dpi</fig-segment>
          </fig-segmented-control>
        </fig-field>
        <fig-field columns="half">
          <label>Bleed check</label>
          <fig-switch checked></fig-switch>
        </fig-field>
        <fig-field columns="half">
          <label>Trim marks</label>
          <fig-switch></fig-switch>
        </fig-field>
        <fig-field columns="half">
          <label>Overprint preview</label>
          <fig-switch checked></fig-switch>
        </fig-field>
      </fig-group>
      <fig-group name="Text">
        <fig-field columns="half">
          <label>Min font size</label>
          <fig-input-number value="6" min="1" max="72" step="1" suffix="pt" full></fig-input-number>
        </fig-field>
        <fig-field columns="half">
          <label>Outline text</label>
          <fig-switch></fig-switch>
        </fig-field>
        <fig-field columns="half">
          <label>Embed fonts</label>
          <fig-switch checked></fig-switch>
        </fig-field>
      </fig-group>
      <fig-footer>
        <fig-button variant="secondary">Skip</fig-button>
        <fig-button>Run Preflight</fig-button>
      </fig-footer>
    </fig-tab-content>
    <fig-tab-content id="prepress-export">
      <fig-group name="Format">
        <fig-field columns="half">
          <label>Output</label>
          <fig-dropdown full>
            <option selected>PDF/X-1a</option>
            <option>PDF/X-3</option>
            <option>PDF/X-4</option>
            <option>High Quality Print</option>
          </fig-dropdown>
        </fig-field>
        <fig-field columns="half">
          <label>Compression</label>
          <fig-dropdown full>
            <option>None</option>
            <option selected>JPEG (Medium)</option>
            <option>JPEG (Maximum)</option>
            <option>ZIP</option>
          </fig-dropdown>
        </fig-field>
      </fig-group>
      <fig-group name="Marks">
        <fig-field columns="half">
          <label>Crop marks</label>
          <fig-switch checked></fig-switch>
        </fig-field>
        <fig-field columns="half">
          <label>Bleed marks</label>
          <fig-switch checked></fig-switch>
        </fig-field>
        <fig-field columns="half">
          <label>Registration</label>
          <fig-switch checked></fig-switch>
        </fig-field>
        <fig-field columns="half">
          <label>Color bars</label>
          <fig-switch></fig-switch>
        </fig-field>
      </fig-group>
      <fig-group name="Pages">
        <fig-field columns="half">
          <label>Range</label>
          <fig-segmented-control full>
            <fig-segment value="all" selected>All</fig-segment>
            <fig-segment value="current">Current</fig-segment>
            <fig-segment value="custom">Custom</fig-segment>
          </fig-segmented-control>
        </fig-field>
        <fig-field columns="half">
          <label>Spreads</label>
          <fig-switch></fig-switch>
        </fig-field>
      </fig-group>
      <fig-footer>
        <fig-button variant="secondary" close-dialog>Cancel</fig-button>
        <fig-button>Export PDF</fig-button>
      </fig-footer>
    </fig-tab-content>
    </fig-content>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "dialog-melty-gif",
    name: "Animated Melty Gif",
    group: "Controls in dialogs",
    description:
      "An animated melty gif generator dialog with image preview, animation controls, and turbulence effect parameters.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-button data-playground-ignore-controls="true" onclick="const d=this.nextElementSibling; d.hasAttribute('modal') ? d.showModal() : d.show();">Open Melty Gif</fig-button>
  <dialog is="fig-dialog" title="Animated Melty Gif" open handle="fig-header" position="center center" data-playground-hide-field style="width: 300px;">
    <fig-content>
    <fig-field columns="half">
      <fig-image full upload="true" alt="" size="auto" aspect-ratio="16/10"></fig-image>
    </fig-field>
    <fig-group>
      <fig-field columns="half">
        <label>Frames</label>
        <fig-slider value="6" min="1" max="24" step="1" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Frame rate</label>
        <fig-slider value="5" min="1" max="30" step="1" text="true" units="fps" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Loop style</label>
        <fig-dropdown full>
          <option selected>Forward</option>
          <option>Reverse</option>
          <option>Ping-pong</option>
          <option>None</option>
        </fig-dropdown>
      </fig-field>
    </fig-group>
    <fig-group>
      <fig-field columns="half">
        <label>Scale (displacement)</label>
        <fig-slider value="14" min="0" max="100" step="0.5" text="true" units="px" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Base freq. X</label>
        <fig-slider value="0.02" min="0.001" max="0.1" step="0.001" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Base freq. Y</label>
        <fig-slider value="0.02" min="0.001" max="0.1" step="0.001" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Octaves</label>
        <fig-slider value="2" min="1" max="8" step="1" text="true" full></fig-slider>
      </fig-field>
    </fig-group>
    <fig-group>
      <fig-field columns="half">
        <label>Fill holes</label>
        <fig-slider value="2" min="0" max="10" step="0.5" text="true" units="px" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Solidify edges</label>
        <fig-slider value="1" min="0" max="2" step="0.01" text="true" full></fig-slider>
      </fig-field>
      <fig-field columns="half">
        <label>Smoothing</label>
        <fig-slider value="0.5" min="0" max="5" step="0.1" text="true" units="px" full></fig-slider>
      </fig-field>
    </fig-group>
    <fig-group name="About this tool" collapsible>
      <p>Animated Melty GIF is a tiny goo machine for turning perfectly respectable artwork into wobbly little puddles. Drop in a frame from <a href="https://www.figma.com/" target="_blank" rel="noreferrer">Figma</a>, crank the wobble, and watch it drip like it just heard a really good bass line.</p>
      <p>It is best for reaction stickers, fake loading states, and sending your design system on a quick vacation to <a href="https://giphy.com/" target="_blank" rel="noreferrer">GIPHY</a>. For maximum scientific accuracy, adjust the slime until it feels like warm cheese but still respects the grid.</p>
      <p>
        <hstack>
          <fig-avatar name="Mina Melt"></fig-avatar>
          <span>Made by Mina Melt</span>
        </hstack>
      </p>
    </fig-group>
    </fig-content>
    <fig-footer>
      <label>Upload an image</label>
      <fig-button disabled>Place in Figma</fig-button>
    </fig-footer>
  </dialog>
</div>`,
      },
    ],
  },
  {
    id: "atom-position",
    name: "Position",
    group: "Atoms",
    description:
      "XY coordinate fields as paired percentage number inputs with axis prepend labels.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Position</label>
    <hstack style="width: 100%;">
      <fig-input-number value="50" min="0" max="100" step="1" units="%">
        <span slot="prepend">X</span>
      </fig-input-number>
      <fig-input-number value="50" min="0" max="100" step="1" units="%">
        <span slot="prepend">Y</span>
      </fig-input-number>
    </hstack>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "atom-grouped-inputs",
    name: "Grouped inputs",
    group: "Atoms",
    description:
      "Related fields collected in a named fig-group for visual separation and optional collapse.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-group name="Layout">
    <fig-field>
      <label>Direction</label>
      <fig-dropdown full>
        <option selected>Horizontal</option>
        <option>Vertical</option>
      </fig-dropdown>
    </fig-field>
    <fig-field>
      <label>Spacing</label>
      <fig-slider value="8" min="0" max="64" text="true" units="px" full></fig-slider>
    </fig-field>
    <fig-field>
      <label>Padding</label>
      <fig-slider value="16" min="0" max="64" text="true" units="px" full></fig-slider>
    </fig-field>
  </fig-group>
  <fig-group name="Fill">
    <fig-field>
      <label>Background</label>
      <fig-input-color value="#FFFFFF" text="true" full></fig-input-color>
    </fig-field>
    <fig-field>
      <label>Opacity</label>
      <fig-slider value="100" min="0" max="100" text="true" units="%" full></fig-slider>
    </fig-field>
  </fig-group>
</div>`,
      },
    ],
  },
  {
    id: "atom-tabs",
    name: "Tabs",
    group: "Atoms",
    description:
      "Tabs at the top of a panel for navigation and grouping related settings into separate views.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<fig-tabs>
  <fig-tab selected>General</fig-tab>
  <fig-tab>Advanced</fig-tab>
  <fig-tab>Export</fig-tab>
</fig-tabs>`,
      },
      {
        id: "tab-content",
        name: "With content",
        markup: `<fig-tabs>
  <fig-tab selected content="#atom-tabs-general">General</fig-tab>
  <fig-tab content="#atom-tabs-export">Export</fig-tab>
</fig-tabs>
<fig-tab-content id="atom-tabs-general">
  <fig-group>
    <fig-field>
      <label>Name</label>
      <fig-input-text value="Hero Card" full></fig-input-text>
    </fig-field>
    <fig-field>
      <label>Visible</label>
      <fig-switch checked></fig-switch>
    </fig-field>
  </fig-group>
</fig-tab-content>
<fig-tab-content id="atom-tabs-export">
  <fig-group>
    <fig-field>
      <label>Format</label>
      <fig-options options="PNG,SVG,PDF" value="PNG" full></fig-options>
    </fig-field>
    <fig-field>
      <label>Scale</label>
      <fig-options options="1x,2x,3x" value="2x" full></fig-options>
    </fig-field>
  </fig-group>
</fig-tab-content>`,
      },
    ],
  },
  {
    id: "atom-segmented-control",
    name: "Segmented control",
    group: "Atoms",
    description:
      "Short mutually exclusive choices with a few compact segment labels. Prefer fig-dropdown or fig-options when labels are long or numerous.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Align</label>
    <fig-segmented-control sizing="equal" full>
      <fig-segment value="left" selected>Left</fig-segment>
      <fig-segment value="right">Right</fig-segment>
    </fig-segmented-control>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "atom-dropdown",
    name: "Dropdown",
    group: "Atoms",
    description:
      "Text-only option lists with many or longer labels. Use instead of segmented controls when choices do not fit compact segments.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Font family</label>
    <fig-dropdown full>
      <option selected>Inter</option>
      <option>SF Pro Display</option>
      <option>Roboto</option>
      <option>Helvetica Neue</option>
      <option>Source Sans 3</option>
      <option>IBM Plex Sans</option>
      <option>Noto Sans</option>
      <option>Work Sans</option>
    </fig-dropdown>
  </fig-field>
</div>`,
      },
    ],
  },
  {
    id: "atom-menu",
    name: "Menu",
    group: "Atoms",
    description:
      "Text-based action menus launched from a button trigger.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-menu position="bottom left">
    <fig-button variant="secondary" fig-menu-trigger>Actions</fig-button>
    <fig-menu-item value="duplicate">Duplicate</fig-menu-item>
    <fig-menu-item value="rename">Rename</fig-menu-item>
    <fig-menu-item value="copy-link">Copy link</fig-menu-item>
    <fig-menu-separator></fig-menu-separator>
    <fig-menu-item value="delete">Delete</fig-menu-item>
  </fig-menu>
</div>`,
      },
    ],
  },
  {
    id: "atom-helper-text",
    name: "Helper text",
    group: "Atoms",
    description:
      "Supplementary guidance below fields using fig-content for readable helper copy.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field>
    <label>Characters</label>
    <fig-input-text value="!@#abc123" full></fig-input-text>
  </fig-field>
  <fig-content>Some helper text here</fig-content>
</div>`,
      },
    ],
  },
  {
    id: "atom-more-info",
    name: "More info",
    group: "Atoms",
    description:
      "Collapsible supplementary copy placed at the end of fig-content, before fig-footer.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<fig-group name="More info" collapsible open="false">
  <p>Exports use the current selection bounds. PNG keeps transparency; SVG flattens effects that Figma cannot represent as vectors.</p>
  <p>Need batch export? Run this plugin once per page or use the desktop app for <a href="https://figma.com">multi-file</a> output.</p>
</fig-group>

<fig-footer>
  <fig-button variant="secondary">Cancel</fig-button>
  <fig-button>Export</fig-button>
</fig-footer>`,
      },
    ],
  },
  {
    id: "atom-footer",
    name: "Footer",
    group: "Atoms",
    description:
      "Bottom action bar anchored at the end of a panel for labels, primary actions, and disabled states.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<fig-footer>
  <fig-button>Apply</fig-button>
</fig-footer>`,
      },
      {
        id: "two-buttons",
        name: "Two buttons",
        markup: `<fig-footer>
  <fig-button variant="secondary">Cancel</fig-button>
  <fig-button>Apply</fig-button>
</fig-footer>`,
      },
      {
        id: "waiting",
        name: "Waiting",
        description:
          "A label-only footer for idle states. With no buttons, the message is centered.",
        markup: `<fig-footer>
  <label>Select text, or click to copy</label>
</fig-footer>`,
      },
      {
        id: "label-button",
        name: "Waiting for selection",
        markup: `<fig-footer>
  <label>Select a layer</label>
  <fig-button disabled>Apply</fig-button>
</fig-footer>`,
      },
      {
        id: "long-label",
        name: "Long label",
        description:
          "A footer label with more instructional text beside a disabled action.",
        markup: `<fig-footer>
  <label>In order to run this tool, you will need to select at least one layer selected</label>
  <fig-button disabled>Apply</fig-button>
</fig-footer>`,
      },
      {
        id: "selected-layer",
        name: "Has selection",
        markup: `<fig-footer>
  <label>3 selected</label>
  <fig-button>Apply</fig-button>
</fig-footer>`,
      },
      {
        id: "working",
        name: "Working...",
        markup: `<fig-footer>
  <label><fig-spinner></fig-spinner> <strong>2 of 10 layers</strong></label>
  <fig-button disabled>Run</fig-button>
</fig-footer>`,
      },
      {
        id: "long-label-many-actions",
        name: "Long label/many actions",
        description:
          "A long instructional label above a vertical stack of actions.",
        markup: `<fig-footer>
  <label>In order to run this tool, you will need to select at least one layer selected</label>
  <fig-tooltip text="Select at least one layer to reset">
    <span class="fig-footer-action">
      <fig-button variant="secondary" disabled full>Reset</fig-button>
    </span>
  </fig-tooltip>
  <fig-tooltip text="Close without applying changes">
    <span class="fig-footer-action">
      <fig-button variant="secondary" full>Cancel</fig-button>
    </span>
  </fig-tooltip>
  <fig-tooltip text="Select at least one layer to apply">
    <span class="fig-footer-action">
      <fig-button disabled full>Apply</fig-button>
    </span>
  </fig-tooltip>
</fig-footer>`,
      },
      {
        id: "lots-of-things",
        name: "Lots of things",
        markup: `<fig-footer>
  <label>Make a selection</label>
  <fig-button variant="secondary" disabled>Reset</fig-button>
  <fig-button variant="secondary" disabled>Cancel</fig-button>
  <fig-button disabled>Apply</fig-button>
</fig-footer>`,
      },
    ],
  },
  {
    id: "atom-preview",
    name: "Preview",
    group: "Atoms",
    description:
      "Media preview surfaces for images and video inside fig-content.",
    examples: [
      {
        id: "default",
        name: "Image",
        markup: `<fig-content>
  <fig-image src="${landscapeUrl()}" alt="Landscape preview" full fit="cover" size="auto" checkerboard="true"></fig-image>
</fig-content>`,
      },
      {
        id: "video",
        name: "Video",
        markup: `<fig-content>
  <fig-video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" aria-label="Flower video preview" poster="https://picsum.photos/640/360?random=29" controls muted fit="cover" size="auto" full checkerboard="true"></fig-video>
</fig-content>`,
      },
    ],
  },
  {
    id: "atom-search",
    name: "Search",
    group: "Atoms",
    description:
      "Plugin search patterns for filtering local content or fetching remote results.",
    examples: [
      {
        id: "live-results",
        name: "Live results",
        description:
          "Search header for filtering content that is already loaded in the panel.",
        markup: `<div class="prop-panel">
  <fig-header>
    <fig-input-text type="search" placeholder="Search layers..." full></fig-input-text>
  </fig-header>
</div>`,
      },
      {
        id: "fetch-results",
        name: "Fetch results",
        description:
          "Search header with a submit action and a fetched result grid.",
        markup: `<div class="prop-panel">
  <fig-header>
    <fig-input-text type="search" placeholder="Search characters..." full></fig-input-text>
    <fig-button>Go</fig-button>
  </fig-header>
  <fig-content>
    <fig-chooser layout="grid" columns="3" value="img-1" full>
      <fig-choice value="img-1" aria-label="Image A" selected><fig-image src="https://picsum.photos/320.webp?random=41" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-2" aria-label="Image B"><fig-image src="https://picsum.photos/320.webp?random=42" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-3" aria-label="Image C"><fig-image src="https://picsum.photos/320.webp?random=43" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-4" aria-label="Image D"><fig-image src="https://picsum.photos/320.webp?random=44" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-5" aria-label="Image E"><fig-image src="https://picsum.photos/320.webp?random=45" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-6" aria-label="Image F"><fig-image src="https://picsum.photos/320.webp?random=46" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-7" aria-label="Image G"><fig-image src="https://picsum.photos/320.webp?random=47" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-8" aria-label="Image H"><fig-image src="https://picsum.photos/320.webp?random=48" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-9" aria-label="Image I"><fig-image src="https://picsum.photos/320.webp?random=49" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      <fig-choice value="img-10" aria-label="Image J"><fig-image src="https://picsum.photos/320.webp?random=50" alt aspect-ratio="1/1" full></fig-image></fig-choice>
    </fig-chooser>
  </fig-content>
</div>`,
      },
      {
        id: "fetch-results-loading",
        name: "Fetch results (loading)",
        description:
          "Search header with a submit action while fetched results shimmer in a skeleton placeholder.",
        markup: `<div class="prop-panel">
  <fig-header>
    <fig-input-text type="search" placeholder="Search characters..." full></fig-input-text>
    <fig-button>Go</fig-button>
  </fig-header>
  <fig-content>
    <fig-skeleton duration="1.5s">
      <fig-chooser layout="grid" columns="3" value="img-1" full>
        <fig-choice value="img-1" aria-label="Image A" selected><fig-image src="https://picsum.photos/320.webp?random=41" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-2" aria-label="Image B"><fig-image src="https://picsum.photos/320.webp?random=42" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-3" aria-label="Image C"><fig-image src="https://picsum.photos/320.webp?random=43" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-4" aria-label="Image D"><fig-image src="https://picsum.photos/320.webp?random=44" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-5" aria-label="Image E"><fig-image src="https://picsum.photos/320.webp?random=45" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-6" aria-label="Image F"><fig-image src="https://picsum.photos/320.webp?random=46" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-7" aria-label="Image G"><fig-image src="https://picsum.photos/320.webp?random=47" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-8" aria-label="Image H"><fig-image src="https://picsum.photos/320.webp?random=48" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-9" aria-label="Image I"><fig-image src="https://picsum.photos/320.webp?random=49" alt aspect-ratio="1/1" full></fig-image></fig-choice>
        <fig-choice value="img-10" aria-label="Image J"><fig-image src="https://picsum.photos/320.webp?random=50" alt aspect-ratio="1/1" full></fig-image></fig-choice>
      </fig-chooser>
    </fig-skeleton>
  </fig-content>
</div>`,
      },
    ],
  },
];

export const sections = propkitSections;
