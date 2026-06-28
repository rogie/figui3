import type { Section } from "./sections";

export const labSections: Section[] = [
  {
    id: "field-slider",
    name: "Field Slider",
    description: "A modern, full surface slider that composes fig-field and fig-slider into a single element.",
    examples: [
      {
        id: "default",
        name: "Default",
        markup: `<div class="prop-panel">
  <fig-field-slider label="Amount" direction="horizontal" value="50" min="0" max="100"></fig-field-slider>
</div>`,
      },
      {
        id: "iconographic",
        name: "Iconographic",
        markup: `<div class="prop-panel">
  <fig-field-slider direction="horizontal" value="50" min="0" max="100">
    <label><fig-tooltip text="Font size"><fig-icon><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.75 10C15.9624 10.0001 16.1515 10.1345 16.2217 10.335L17.9717 15.335C18.0628 15.5955 17.9255 15.8804 17.665 15.9717C17.4044 16.0628 17.1195 15.9256 17.0283 15.665L16.6211 14.5H14.3789L13.9717 15.665C13.8805 15.9256 13.5955 16.0627 13.3349 15.9717C13.0744 15.8804 12.9372 15.5955 13.0283 15.335L14.7783 10.335L14.8096 10.2627C14.8957 10.1027 15.0642 10 15.25 10H15.75ZM9.24998 8C9.46694 8.0001 9.65901 8.1402 9.72557 8.34668L11.9756 15.3467C12.06 15.6093 11.9158 15.8908 11.6533 15.9756C11.3906 16.06 11.1091 15.9159 11.0244 15.6533L10.4931 14H7.50682L6.97557 15.6533C6.89093 15.9159 6.60936 16.0599 6.34666 15.9756C6.08403 15.8909 5.93994 15.6094 6.0244 15.3467L8.2744 8.34668L8.30467 8.27246C8.38904 8.10728 8.56006 8 8.74998 8H9.24998ZM14.7295 13.5H16.2705L15.5 11.2979L14.7295 13.5ZM7.82811 13H10.1719L8.99998 9.35449L7.82811 13Z" fill="currentColor"/></svg></fig-icon></fig-tooltip></label>
  </fig-field-slider>
</div>`,
      },
      {
        id: "hue",
        name: "Hue",
        markup: `<div class="prop-panel">
  <fig-field-slider label="Hue" direction="horizontal" type="hue" value="180" min="0" max="360" units="°"></fig-field-slider>
</div>`,
      },
      {
        id: "opacity",
        name: "Opacity",
        markup: `<div class="prop-panel">
  <fig-field-slider label="Opacity" direction="horizontal" type="opacity" value="100" min="0" max="100" units="%"></fig-field-slider>
</div>`,
      },
      {
        id: "delta",
        name: "Delta",
        markup: `<div class="prop-panel">
  <fig-field-slider label="Offset" direction="horizontal" type="delta" value="50" min="0" max="100" default="50"></fig-field-slider>
</div>`,
      },
      {
        id: "stepper",
        name: "Stepper",
        markup: `<div class="prop-panel">
  <fig-field-slider label="Step" direction="horizontal" type="stepper" value="50" min="0" max="100" step="10" default="50"></fig-field-slider>
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
