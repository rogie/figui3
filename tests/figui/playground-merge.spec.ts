import { expect, test } from "@playwright/test";
import { figui3Sections } from "../../playground/src/data/figui3Sections";
import {
  propkitMigration,
  type PropsKitMigrationEntry,
} from "../../playground/src/data/propkitMigration";
import { legacyPropsKitSections } from "../../playground/src/data/sections";
import { sortSectionsWithinGroups } from "../../playground/src/lib/sectionOrder";
import {
  controlAttributeRules,
  getSplitInputTypePreset,
} from "../../playground/src/lib/attributeRules";
import { labSections } from "../../playground/src/data/labSections";

function sourceKeys(): string[] {
  return legacyPropsKitSections.flatMap((section) =>
    section.examples.map((example) => `${section.id}/${example.id}`),
  );
}

function targetKey(migration: PropsKitMigrationEntry): string {
  return `${migration.sectionId}/${migration.exampleId}`;
}

test.describe("PropsKit playground migration", () => {
  test("maps every old example to an existing FigUI3 example", () => {
    const oldKeys = sourceKeys();
    const targetKeys = new Set(
      figui3Sections.flatMap((section) =>
        section.examples.map((example) => `${section.id}/${example.id}`),
      ),
    );

    expect(legacyPropsKitSections).toHaveLength(54);
    expect(oldKeys).toHaveLength(126);
    expect(Object.keys(propkitMigration).sort()).toEqual(oldKeys.sort());
    for (const oldKey of oldKeys) {
      expect(
        targetKeys.has(targetKey(propkitMigration[oldKey])),
        `${oldKey} should map to an existing FigUI3 example`,
      ).toBe(true);
    }
  });

  test("does not collapse distinct old examples without marking duplicates", () => {
    const oldKeysByTarget = new Map<
      string,
      Array<{ oldKey: string; duplicate: boolean }>
    >();

    for (const [oldKey, migration] of Object.entries(propkitMigration)) {
      const key = targetKey(migration);
      const entries = oldKeysByTarget.get(key) ?? [];
      entries.push({ oldKey, duplicate: migration.duplicate === true });
      oldKeysByTarget.set(key, entries);
    }

    for (const [target, entries] of oldKeysByTarget) {
      if (entries.length < 2) continue;
      expect(
        entries.every((entry) => entry.duplicate),
        `${entries.map((entry) => entry.oldKey).join(", ")} all map to ${target}`,
      ).toBe(true);
    }
  });

  test("keeps section and example ids unique", () => {
    const sectionIds = figui3Sections.map((section) => section.id);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);

    for (const section of figui3Sections) {
      const exampleIds = section.examples.map((example) => example.id);
      expect(
        new Set(exampleIds).size,
        `${section.id} has duplicate example ids`,
      ).toBe(exampleIds.length);
    }
  });

  test("orders common inputs before specialized controls", () => {
    const inputIds = sortSectionsWithinGroups(figui3Sections)
      .filter((section) => section.group === "Inputs")
      .map((section) => section.id);

    expect(inputIds).toEqual([
      "text-input",
      "number-input",
      "checkbox",
      "radio",
      "switch",
      "button",
      "button-combo",
      "dropdown",
      "segmented-control",
      "slider",
      "file-input",
      "color",
      "fill-input",
      "split-input",
      "input-combo",
      "options",
      "chooser",
      "palette",
      "gradient",
      "angle",
      "origin-grid",
      "joystick",
      "3d-rotate",
      "easing",
    ]);
  });

  test("groups navigation and container components together", () => {
    const navigationIds = figui3Sections
      .filter((section) => section.group === "Navigation & Containers")
      .map((section) => section.id)
      .sort();

    expect(navigationIds).toEqual([
      "content",
      "footer",
      "group",
      "header",
      "tabs",
      "toolbelt",
    ]);
  });

  test("groups dialogs, menus, and popups together", () => {
    const overlayIds = figui3Sections
      .filter((section) => section.group === "Dialogs, Menus & Popups")
      .map((section) => section.id)
      .sort();

    expect(overlayIds).toEqual(["dialog", "menu", "popup", "tooltip"]);
  });

  test("groups load indicators together", () => {
    const loadingIds = figui3Sections
      .filter((section) => section.group === "Load indicators")
      .map((section) => section.id)
      .sort();

    expect(loadingIds).toEqual(["shimmer", "skeleton", "spinner"]);
  });

  test('names default field compositions "Label + input"', () => {
    const labelInputExamples = figui3Sections.flatMap((section) =>
      section.examples
        .filter((example) => example.name === "Label + input")
        .map((example) => `${section.id}/${example.id}`),
    );
    const oldDefaultFieldNames = figui3Sections.flatMap((section) =>
      section.examples.filter((example) => example.name === "Default (field)"),
    );

    expect(labelInputExamples).toHaveLength(6);
    expect(oldDefaultFieldNames).toHaveLength(0);
  });
});

test("split input type control uses matching example presets", () => {
  const numberPreset = getSplitInputTypePreset("number");
  expect(numberPreset).toMatchObject({
    options: "2,4,8,16,32",
    placeholder: "Padding",
  });
  expect(numberPreset.values).toEqual(new Set(["2", "4", "8", "16", "32"]));

  const textPreset = getSplitInputTypePreset("text");
  expect(textPreset).toMatchObject({
    options: "House, Apartment, Condo, Townhouse, Other",
    placeholder: "Type of residence",
  });
  expect(textPreset.values).toEqual(
    new Set(["House", "Apartment", "Condo", "Townhouse", "Other"]),
  );
});

test("disabled components expose an Attributes view toggle", () => {
  const auditedControls = [
    "fig-input-number",
    "fig-segmented-control",
    "fig-angle",
    "fig-layer",
    "fig-chooser",
    "fig-menu-item",
  ];

  for (const tag of auditedControls) {
    expect(controlAttributeRules[tag]?.disabled).toMatchObject({
      label: "Disabled",
      type: "boolean",
      boolMode: "presence",
    });
  }

  expect(Object.keys(controlAttributeRules["fig-input-number"]).at(-1)).toBe(
    "disabled",
  );
});

test("property exposes selected without experimental activation controls", () => {
  expect(controlAttributeRules["fig-property"]?.activation).toBeUndefined();
  expect(controlAttributeRules["fig-property"]?.selected).toEqual({
    label: "Selected",
    type: "boolean",
    boolMode: "presence",
  });
});

test("property all-properties example covers every supported control", () => {
  const section = figui3Sections.find((entry) => entry.id === "property");
  const example = section?.examples.find(
    (entry) => entry.id === "all-properties",
  );
  const rowSection = labSections.find((entry) => entry.id === "property");
  const labDefault = rowSection?.examples.find(
    (entry) => entry.id === "default",
  );
  const rowExample = rowSection?.examples.find(
    (entry) => entry.id === "all-properties-row",
  );
  const controlTags = [
    "fig-input-number",
    "fig-slider",
    "fig-input-text",
    "fig-switch",
    "fig-input-color",
    "fig-select",
    "fig-input-point",
    "fig-easing-curve",
    "fig-input-gradient",
    "fig-input-palette",
    "fig-input-rotate",
    "fig-input-file",
  ];

  expect(example).toMatchObject({ name: "All properties" });
  expect(rowExample).toMatchObject({
    name: "All properties",
  });
  for (const tag of controlTags) {
    expect(example?.markup).toContain(`<${tag}`);
    expect(rowExample?.markup).toContain(
      `<${tag === "fig-slider" ? "fig-input-slider" : tag}`,
    );
  }
  const rowProperties =
    rowExample?.markup.match(/<fig-property\b[^>]*>/g) ?? [];
  expect(rowProperties).toHaveLength(controlTags.length + 1);
  expect(
    rowProperties.every((property) =>
      property.includes('activation="row"'),
    ),
  ).toBe(true);
  expect(rowExample?.markup).toContain(
    '<fig-property label="Audio" activation="row">',
  );
  expect(rowExample?.markup).toContain(
    'accepts="audio/*" label="Choose audio" preview url="/audio/skrillex-ft-elliphant.mp3"',
  );
  expect(section?.examples.map((entry) => entry.id)).toEqual([
    "default",
    "all-properties",
    "custom-accessory",
  ]);
  expect(rowSection).toMatchObject({
    name: "Property",
    group: "Misc",
  });
  expect(labDefault?.markup).toContain(
    '<fig-property label="Number" activation="row">',
  );
  expect(rowSection?.examples.map((entry) => entry.id)).toEqual([
    "default",
    "angle",
    "slider",
    "string",
    "boolean",
    "color",
    "select",
    "point",
    "easing",
    "gradient",
    "palette",
    "rotate",
    "file",
    "audio",
    "all-properties-row",
  ]);
  const individualControls = [
    ["default", "Number", "fig-input-number"],
    ["angle", "Angle", "fig-input-number"],
    ["slider", "Slider", "fig-input-slider"],
    ["string", "String", "fig-input-text"],
    ["boolean", "Boolean", "fig-switch"],
    ["color", "Color", "fig-input-color"],
    ["select", "Select", "fig-select"],
    ["point", "Point", "fig-input-point"],
    ["easing", "Easing", "fig-easing-curve"],
    ["gradient", "Gradient", "fig-input-gradient"],
    ["palette", "Palette", "fig-input-palette"],
    ["rotate", "3D Rotate", "fig-input-rotate"],
    ["file", "File", "fig-input-file"],
    ["audio", "Audio", "fig-input-file"],
  ] as const;
  for (const [id, name, tag] of individualControls) {
    const controlExample = rowSection?.examples.find(
      (entry) => entry.id === id,
    );
    expect(controlExample).toMatchObject({ name });
    expect(controlExample?.markup).toContain(
      `<fig-property label="${name}" activation="row">`,
    );
    expect(controlExample?.markup).toContain(`<${tag} slot="input"`);
  }
  const sliderExample = rowSection?.examples.find(
    (entry) => entry.id === "slider",
  );
  expect(sliderExample?.markup).toContain("<fig-input-number");
  expect(sliderExample?.markup).not.toContain("occlusion-targets");
});

test("input slider variants live in the Lab Inputs group", () => {
  const section = labSections.find((entry) => entry.id === "input-slider");
  const tags = [
    "fig-input-slider",
    "fig-input-slider-hue",
    "fig-input-slider-opacity",
    "fig-input-slider-delta",
    "fig-input-slider-stepper",
    "fig-input-slider-wheel",
  ];

  expect(section).toMatchObject({
    name: "Input Slider",
    group: "Inputs",
  });
  expect(section?.examples.map((example) => example.id)).toEqual([
    "default",
    "with-number",
    "hue",
    "opacity",
    "delta",
    "stepper",
    "wheel",
  ]);
  expect(
    section?.examples.find((example) => example.id === "with-number")?.markup,
  ).toContain("<fig-input-number");
  for (const tag of tags) {
    expect(
      section?.examples.some((example) =>
        example.markup.includes(`<${tag}`),
      ),
    ).toBe(true);
    expect(controlAttributeRules[tag]).toBeDefined();
    expect(
      figui3Sections.some((stableSection) =>
        stableSection.examples.some((example) =>
          example.markup.includes(`<${tag}`),
        ),
      ),
    ).toBe(false);
  }
  expect(
    controlAttributeRules["fig-input-slider"]["occlusion-targets"],
  ).toMatchObject({
    label: "Occlusion targets",
    type: "string",
  });
});

test("palette editor exposes maximum and overflow controls", () => {
  const section = figui3Sections.find(
    (entry) => entry.id === "palette-editor",
  );
  expect(section?.examples.some((example) => example.id === "default")).toBe(
    true,
  );
  expect(controlAttributeRules["fig-palette-editor"]?.max).toMatchObject({
    label: "Max",
    type: "number",
    min: 2,
    step: 1,
  });
  expect(controlAttributeRules["fig-palette-editor"]?.overflow).toEqual({
    label: "Overflow",
    type: "enum",
    options: ["fade", "visible"],
  });
  expect(controlAttributeRules["fig-palette-editor"]?.["show-rows"]).toEqual({
    label: "Show rows",
    type: "number",
    min: 0.5,
    step: 0.5,
  });
});

test("gradient editor exposes stop overflow controls", () => {
  expect(controlAttributeRules["fig-gradient-editor"]?.overflow).toEqual({
    label: "Overflow",
    type: "enum",
    options: ["fade", "visible"],
  });
  expect(controlAttributeRules["fig-gradient-editor"]?.["show-rows"]).toEqual({
    label: "Show rows",
    type: "number",
    min: 0.5,
    step: 0.5,
  });
});

test("slider exposes an optional default control", () => {
  expect(controlAttributeRules["fig-slider"]?.default).toEqual({
    label: "Default",
    type: "number",
  });
});

test("reorder examples live with editor components, not lab", () => {
  expect(
    figui3Sections.find((section) => section.id === "reorder"),
  ).toMatchObject({
    group: "Editor components",
    examples: [
      { id: "default", name: "Rows" },
      { id: "groups", name: "Groups" },
    ],
  });
  expect(labSections.some((section) => section.id === "reorder")).toBe(false);
});

test("gradient editor follows palette editor in navigation", () => {
  const editorIds = sortSectionsWithinGroups(figui3Sections)
    .filter((section) => section.group === "Editor components")
    .map((section) => section.id);
  const paletteIndex = editorIds.indexOf("palette-editor");
  expect(paletteIndex).toBeGreaterThanOrEqual(0);
  expect(editorIds[paletteIndex + 1]).toBe("gradient-editor");
});
