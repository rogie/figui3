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
    <fig-canvas-control type="color" color="#FF00BF" name="Position" value='{"x":50,"y":50}' snapping="modifier" data-playground-hide-field></fig-canvas-control>
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
  <fig-field direction="horizontal">
    <label>Rotation</label>
    <fig-input-angle value="45" text="true" full></fig-input-angle>
  </fig-field>
</div>`,
      },
    ],
  },
];
