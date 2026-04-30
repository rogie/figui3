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
];
