import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
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
import {
  INSTALL_COMMAND,
  INSTALL_PROMPT,
} from "../../playground/src/lib/installPrompt";
import { labSections } from "../../playground/src/data/labSections";
import { propskitSections } from "../../playground/src/data/propskitSections";

function markupTags(value: unknown, tags = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((entry) => markupTags(entry, tags));
    return tags;
  }
  if (!value || typeof value !== "object") return tags;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "markup" && typeof entry === "string") {
      for (const match of entry.matchAll(/<((?:fig)-[a-z0-9-]+)/g)) {
        tags.add(match[1]);
      }
    } else {
      markupTags(entry, tags);
    }
  }
  return tags;
}

test("installation prompt points agents to packaged Cursor skills", () => {
  expect(INSTALL_COMMAND).toBe("npm i @rogieking/figui3");
  expect(INSTALL_PROMPT).toContain(
    "node_modules/@rogieking/figui3/.cursor/skills/",
  );
  for (const skill of ["figui3", "fig-editor", "fig-lab", "propskit"]) {
    expect(INSTALL_PROMPT).toContain(`${skill}/SKILL.md`);
  }
  expect(INSTALL_PROMPT).toContain(
    "does not automatically discover skills inside node_modules",
  );
  expect(INSTALL_PROMPT).not.toContain("playground");
  expect(INSTALL_PROMPT).not.toContain("propkit/SKILL.md");
});

test("playground control tags have attribute rules or an explicit exclusion", () => {
  const intentionalWithoutControls = new Set([
    "fig-ai-context",
    "fig-ai-prompt",
    "fig-attachments",
    "fig-button-combo",
    "fig-content",
    "fig-footer",
    "fig-header",
    "fig-icon",
    "fig-input-combo",
    "fig-menu-separator",
    "fig-segment",
    "fig-select-option",
    "fig-select-options",
    "fig-separator",
    "fig-spinner",
    "fig-tab-content",
    "fig-toolbelt-group",
  ]);
  const tags = markupTags([figui3Sections, labSections]);
  const missing = [...tags]
    .filter(
      (tag) =>
        !(tag in controlAttributeRules) &&
        !intentionalWithoutControls.has(tag),
    )
    .sort();
  expect(missing).toEqual([]);
});

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a playground test port"));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

async function waitForServer(
  url: string,
  process: ChildProcess,
  getOutput: () => string,
) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`Playground server exited early:\n${getOutput()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out starting playground server:\n${getOutput()}`);
}

async function mountExampleView(page: Page, markup: string) {
  await page.goto(`${playgroundUrl}/propskit/lab`);
  await page.evaluate(async (initialMarkup) => {
    await customElements.whenDefined("fig-input-slider");
    const [
      { default: ExampleView },
      ReactModule,
      ReactDOMClientModule,
      ReactDOMModule,
    ] =
      await Promise.all([
        import("/src/components/ExampleView.tsx"),
        import("/@id/react"),
        import("/@id/react-dom/client"),
        import("/@id/react-dom"),
      ]);
    const React = ReactModule.default ?? ReactModule;
    const ReactDOMClient =
      ReactDOMClientModule.default ?? ReactDOMClientModule;
    const ReactDOM = ReactDOMModule.default ?? ReactDOMModule;
    const host = document.createElement("div");
    host.dataset.exampleHarness = "true";
    document.body.append(host);
    const root = ReactDOMClient.createRoot(host);
    const dialogStates: boolean[] = [];
    let currentMarkup = initialMarkup;
    let syncDialogMarkup = false;

    const render = (nextMarkup = currentMarkup) => {
      currentMarkup = nextMarkup;
      ReactDOM.flushSync(() => {
        root.render(
          React.createElement(ExampleView, {
            example: {
              id: "state-machine-regression",
              name: "State machine regression",
              markup: currentMarkup,
            },
            markup: currentMarkup,
            onPersistDialogOpenState: (
              _fieldIndex: number,
              isOpen: boolean,
            ) => {
              dialogStates.push(isOpen);
              if (!syncDialogMarkup) return;
              const template = document.createElement("template");
              template.innerHTML = currentMarkup;
              const dialog = template.content.querySelector(
                'dialog[is="fig-dialog"]',
              );
              if (!dialog) return;
              dialog.toggleAttribute("open", isOpen);
              render(template.innerHTML);
            },
          }),
        );
      });
    };

    render();
    (window as any).__exampleViewHarness = {
      dialogStates,
      getMarkup: () => currentMarkup,
      render,
      setDialogSync: (enabled: boolean) => {
        syncDialogMarkup = enabled;
      },
    };
  }, markup);
  await expect(
    page.locator('[data-example-harness="true"] .propkit-example'),
  ).toHaveCount(1);
}

let playgroundUrl = "";

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

    expect(loadingIds).toEqual([
      "button-play",
      "shimmer",
      "skeleton",
      "spinner",
    ]);

    const orderedLoadingIds = sortSectionsWithinGroups(figui3Sections)
      .filter((section) => section.group === "Load indicators")
      .map((section) => section.id);
    expect(orderedLoadingIds.at(-1)).toBe("button-play");
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

test("audio waveform exposes bar and ribbon variants", () => {
  expect(controlAttributeRules["fig-audio"]?.variant).toEqual({
    label: "Waveform",
    type: "enum",
    options: ["bars", "ribbon"],
  });
  expect(controlAttributeRules["fig-audio-waveform"]?.variant).toEqual({
    label: "Variant",
    type: "enum",
    options: ["bars", "ribbon"],
  });
  const section = figui3Sections.find(
    (entry) => entry.id === "audio-waveform",
  );
  expect(section?.examples.map((example) => example.id)).toEqual([
    "default",
    "ribbon",
  ]);
  expect(
    section?.examples.find((example) => example.id === "ribbon")?.markup,
  ).toContain('variant="ribbon"');
});

test("PropsKit media splits image, video, and audio examples", () => {
  const section = propskitSections.find(
    (entry) => entry.id === "propskit-media",
  );
  expect(section?.examples.map((example) => example.name)).toEqual([
    "Image (empty)",
    "Image",
    "Images",
    "Video (empty)",
    "Video",
    "Videos",
    "Audio (empty)",
    "Audio (with URL)",
  ]);
  const sortedSection = sortSectionsWithinGroups(propskitSections).find(
    (entry) => entry.id === "propskit-media",
  );
  expect(sortedSection?.examples.map((example) => example.name)).toEqual([
    "Audio (empty)",
    "Audio (with URL)",
    "Image (empty)",
    "Image",
    "Images",
    "Video (empty)",
    "Video",
    "Videos",
  ]);
  expect(
    section?.examples.find((example) => example.id === "images")?.markup,
  ).toContain('type: "image"');
  expect(
    section?.examples.find((example) => example.id === "videos")?.markup,
  ).toContain('type: "video"');
  expect(
    section?.examples.find((example) => example.id === "audio-empty")
      ?.createConfig(),
  ).toEqual({
    audio: { type: "audio" },
  });
  expect(
    section?.examples.find((example) => example.id === "audio-url")?.markup,
  ).toContain('/audio/skrillex-ft-elliphant.mp3');
});

test("Carousel is the final section in the Media group", () => {
  const mediaSections = sortSectionsWithinGroups(figui3Sections).filter(
    (section) => section.group === "Media",
  );
  expect(mediaSections.at(-1)?.id).toBe("carousel");
  expect(controlAttributeRules["fig-carousel"]).toMatchObject({
    index: { type: "number" },
    autoplay: { type: "boolean", defaultChecked: true },
    duration: { type: "number", units: "s" },
    loop: { type: "boolean" },
    navigation: { type: "enum", options: ["buttons", "dots"] },
    progress: { type: "boolean", defaultChecked: true },
  });
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

test("property controls expose authored default attributes", () => {
  expect(controlAttributeRules["fig-input-number"]?.default).toMatchObject({
    label: "Default",
    type: "number",
  });
  expect(controlAttributeRules["fig-switch"]?.["default-checked"]).toMatchObject({
    label: "Default checked",
    type: "boolean",
  });
  expect(controlAttributeRules["fig-input-point"]?.["default-x"]).toMatchObject({
    label: "Default X",
    type: "number",
  });
  expect(controlAttributeRules["fig-input-rotate"]?.["default-z"]).toMatchObject({
    label: "Default Z",
    type: "number",
  });
  expect(controlAttributeRules["fig-input-file"]?.["default-url"]).toMatchObject({
    label: "Default URL",
    type: "string",
  });
  expect(controlAttributeRules["fig-input-rotate"]?.variant).toMatchObject({
    label: "Variant",
    type: "enum",
    options: ["default", "simple"],
  });
  const rotateSection = figui3Sections.find(
    (section) => section.id === "input-rotate",
  );
  expect(
    rotateSection?.examples.find((example) => example.id === "simple")?.markup,
  ).toContain('<fig-input-rotate variant="simple"');
});

test("property exposes ratio controls and examples", () => {
  expect(controlAttributeRules["fig-property"]?.ratio).toEqual({
    label: "Ratio",
    type: "string",
    options: ["1:3", "1:2", "2:3", "1:1"],
    placeholder: "1:2",
    defaultValue: "1:2",
  });
  const section = figui3Sections.find((entry) => entry.id === "property");
  const example = section?.examples.find((entry) => entry.id === "ratio");
  expect(example).toMatchObject({ name: "Ratio" });
  expect(example?.markup).toContain('ratio="1:2"');
  expect(example?.markup).toContain('ratio="1:1"');
  expect(example?.markup).toContain('ratio="2:3"');
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
  const sliderVariantTags = [
    "fig-input-slider-hue",
    "fig-input-slider-opacity",
    "fig-input-slider-delta",
    "fig-input-slider-stepper",
    "fig-input-slider-wheel",
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
  for (const tag of sliderVariantTags) {
    expect(rowExample?.markup).toContain(`<${tag}`);
  }
  for (const tag of ["fig-input-slider", ...sliderVariantTags]) {
    expect(rowExample?.markup).toMatch(
      new RegExp(
        `<${tag}\\b[^>]*\\bdefault=["'][^"']*["'][^>]*>[\\s\\S]*?<fig-input-number\\b[^>]*\\bdefault=["'][^"']*["'][^>]*>[\\s\\S]*?</${tag}>`,
      ),
    );
  }
  expect(rowExample?.markup).toContain(
    '<fig-property label="Time" activation="row">',
  );
  expect(rowExample?.markup).toContain(
    '<fig-input-number value="0" default="0" step="1" units="s"></fig-input-number>',
  );
  expect(rowExample?.markup).toContain(
    '<fig-input-file slot="input" label="Choose file" default-url="" default-filename="" full>',
  );
  for (const matchingDefault of [
    'value="16" default="16"',
    'value="Hello" default="Hello"',
    "checked default-checked",
    'value="#0D99FF" default="#0D99FF"',
    'value="Medium" default="Medium"',
    'x="24" y="16" default-x="24" default-y="16"',
    'default=\'["#0D99FF","#14AE5C","#FFCD29","#FF7262","#9747FF"]\'',
  ]) {
    expect(rowExample?.markup).toContain(matchingDefault);
  }
  const rowGradient =
    rowExample?.markup.match(/<fig-input-gradient\b[^>]*>/)?.[0] ?? "";
  expect(rowGradient.match(/\bvalue='([^']*)'/)?.[1]).toBe(
    rowGradient.match(/\bdefault='([^']*)'/)?.[1],
  );
  const rowProperties =
    rowExample?.markup.match(/<fig-property\b[^>]*>/g) ?? [];
  expect(rowProperties).toHaveLength(
    controlTags.length + sliderVariantTags.length + 1,
  );
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
    "ratio",
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
  expect(
    rowSection?.examples.find((entry) => entry.id === "rotate")?.markup,
  ).toContain('<fig-input-rotate slot="input" variant="default"');
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
  expect(
    controlAttributeRules["fig-input-slider-hue"].color,
  ).toMatchObject({
    label: "Color",
    type: "color",
  });
  expect(
    controlAttributeRules["fig-input-slider-hue"]["color-space"],
  ).toEqual({
    label: "Color space",
    type: "enum",
    options: [
      "srgb",
      "srgb-linear",
      "display-p3",
      "oklab",
      "oklch",
      "hsl",
    ],
  });
  expect(
    controlAttributeRules["fig-input-slider-opacity"].color,
  ).toMatchObject({
    label: "Color",
    type: "color",
    defaultValue: "#808080",
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

test("PropsKit examples form the Getting started navigation group", () => {
  expect(propskitSections.map((section) => section.id)).toEqual([
    "quick-start",
    "numbers",
    "colors",
    "toggles",
    "text",
    "groups",
    "propskit-media",
  ]);
  for (const section of propskitSections) {
    expect(section.group).toBe("Getting started");
    expect(section.examples.length).toBeGreaterThan(0);
    for (const example of section.examples) {
      expect(example.markup).toContain("figCreateProps");
      expect(example.markup).toContain("figCreatePropsRoot");
      expect(example.markup).toContain("panelIds: [kit.id]");
      expect(example.createConfig()).toBeTruthy();
    }
  }
  expect(propskitSections.find((section) => section.id === "groups")?.examples[0])
    .toMatchObject({
      title: "Nested groups",
      panelName: "Transform",
    });
  const numberExample = propskitSections.find(
    (section) => section.id === "numbers",
  )?.examples[0];
  expect(numberExample).toMatchObject({
    title: "Number variants",
    panelName: null,
  });
  expect(numberExample?.createConfig()).toMatchObject({
    sliders: {
      stepper: { control: "slider", stepper: true },
    },
    numbers: {
      withStepper: { control: "number" },
      withoutStepper: { control: "number", stepper: false },
    },
  });
  expect(numberExample?.createConfig()).not.toHaveProperty("sliders._label");
  expect(numberExample?.createConfig()).not.toHaveProperty("numbers._label");
  const colorSection = propskitSections.find(
    (section) => section.id === "colors",
  );
  expect(colorSection?.examples.map((example) => example.name)).toEqual([
    "Color",
    "Color (alpha)",
  ]);
  expect(colorSection?.examples.map((example) => example.createConfig())).toEqual([
    {
      color: {
        type: "color",
        default: "#0D99FF",
        alpha: false,
      },
    },
    {
      color: {
        type: "color",
        default: "#00000080",
        alpha: true,
      },
    },
  ]);
  const toggleSection = propskitSections.find(
    (section) => section.id === "toggles",
  );
  expect(toggleSection?.examples.map((example) => example.name)).toEqual([
    "On",
    "Off",
  ]);
  expect(toggleSection?.examples.map((example) => example.createConfig())).toEqual([
    { enabled: true },
    { enabled: false },
  ]);
  const textSection = propskitSections.find((section) => section.id === "text");
  expect(textSection?.examples.map((example) => example.name)).toEqual([
    "Single line (Text)",
    "Multiline",
  ]);
  expect(textSection?.examples.map((example) => example.createConfig())).toEqual([
    { text: "Hello" },
    {
      description: {
        type: "text",
        default: "Write a longer description here.",
        multiline: true,
        autoresize: true,
      },
    },
  ]);
  const mergedSections = sortSectionsWithinGroups([
    ...propskitSections,
    ...figui3Sections,
  ]);
  expect(mergedSections.slice(0, 7).map((section) => section.id)).toEqual([
    "quick-start",
    "numbers",
    "colors",
    "toggles",
    "text",
    "groups",
    "propskit-media",
  ]);
  expect(mergedSections[7].group).toBe("Inputs");
});

test("field-driven dialog examples use figCreateProps", () => {
  const convertedIds = [
    "dialog-rename",
    "dialog-shadow",
    "dialog-blur",
    "dialog-photo-stack",
    "dialog-export",
    "dialog-token-editor",
  ];

  for (const id of convertedIds) {
    const example = figui3Sections.find((section) => section.id === id)
      ?.examples[0];
    expect(example?.markup).toContain("figCreateProps");
    expect(example?.markup).toContain('<dialog\n  id="props-dialog"');
    expect(example?.markup).toContain(
      '<fig-content id="props-dialog-content"></fig-content>',
    );
    expect(example?.markup).toContain('<script type="module">');
    expect(example && "lang" in example && example.lang).toBe("html");
    expect(example && "createConfig" in example).toBe(true);
    expect(example && "dialog" in example).toBe(true);
  }

  const structuralExample = figui3Sections.find(
    (section) => section.id === "dialog-prepress",
  )?.examples[0];
  expect(structuralExample?.markup).toContain("<fig-tabs>");
  expect(structuralExample && "createConfig" in structuralExample).toBe(false);
});

test.describe.serial("ExampleView DOM synchronization", () => {
  let playgroundServer: ChildProcess;
  let serverOutput = "";

  test.beforeAll(async () => {
    const port = await getAvailablePort();
    playgroundUrl = `http://127.0.0.1:${port}`;
    playgroundServer = spawn(
      process.execPath,
      [
        path.resolve("playground/node_modules/vite/bin/vite.js"),
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      {
        cwd: path.resolve("playground"),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    playgroundServer.stdout?.on("data", (chunk) => {
      serverOutput += chunk.toString();
    });
    playgroundServer.stderr?.on("data", (chunk) => {
      serverOutput += chunk.toString();
    });
    await waitForServer(playgroundUrl, playgroundServer, () => serverOutput);
  });

  test.afterAll(async () => {
    if (!playgroundServer || playgroundServer.exitCode !== null) return;
    playgroundServer.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => playgroundServer.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
    if (playgroundServer.exitCode === null) playgroundServer.kill("SIGKILL");
  });

  test("button icon control keeps the preview icon-only across type changes", async ({
    page,
  }) => {
    await page.goto(`${playgroundUrl}/propskit`);
    const state = await page.evaluate(async () => {
      const {
        applyButtonIconMutation,
        applyButtonTypeMutation,
      } = await import("/src/lib/attributeParser.ts");
      let markup = `<div class="prop-panel">
        <fig-field>
          <label>Action</label>
          <fig-button><span>Apply Changes</span></fig-button>
        </fig-field>
      </div>`;
      markup = applyButtonIconMutation(markup, 0, true);
      markup = applyButtonTypeMutation(markup, 0, "toggle");

      const template = document.createElement("template");
      template.innerHTML = markup;
      const button = template.content.querySelector("fig-button")!;
      return {
        label: button.getAttribute("aria-label"),
        text: button.textContent?.trim() ?? "",
        children: Array.from(button.children).map((child) =>
          child.tagName.toLowerCase(),
        ),
      };
    });

    expect(state).toEqual({
      label: "Apply Changes",
      text: "",
      children: ["fig-icon"],
    });
  });

  test("PropsKit source is editable and rebuilds the preview", async ({
    page,
  }) => {
    await page.goto(`${playgroundUrl}/propskit#numbers/variants`);
    const editor = page.locator(".propkit-code-view .cm-content");
    await expect(editor).toHaveAttribute("contenteditable", "true");
    await expect(
      page.getByRole("button", { name: "Run", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Copy JavaScript", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copy prompt", exact: true }),
    ).toHaveCount(0);
    await editor.fill(`const kit = figCreateProps("Edited", { updated: 42 })
figCreatePropsRoot({ target: "#properties", panelIds: [kit.id] })`);

    await expect(
      page.locator('.propskit-example-preview fig-property[label="Updated"]'),
    ).toBeVisible();
    await expect(page.locator(".propkit-run-error")).toHaveCount(0);
  });

  for (const scenario of [
    { name: "slider", tag: "fig-input-slider" },
    { name: "joystick", tag: "fig-joystick" },
  ]) {
    test(`focused ${scenario.name} value and local state survive a patchable markup refresh`, async ({
      page,
    }) => {
      await mountExampleView(
        page,
        `<section data-revision="one"><${scenario.tag} tabindex="0" value="12"></${scenario.tag}></section>`,
      );
      const control = page.locator(
        `[data-example-harness="true"] ${scenario.tag}`,
      );
      await control.evaluate((element) => {
        (element as any).__localState = { retained: true };
        element.setAttribute("value", "73");
        element.dispatchEvent(new Event("input", { bubbles: true }));
        (element as HTMLElement).focus();
        (document.activeElement as any).__focusRetained = true;
      });

      await page.evaluate(
        ({ tag }) => {
          (window as any).__exampleViewHarness.render(
            `<section data-revision="two"><${tag} tabindex="0" value="24"></${tag}></section>`,
          );
        },
        { tag: scenario.tag },
      );

      await expect(control).toHaveAttribute("value", "73");
      expect(
        await control.evaluate(
          (element) =>
            (document.activeElement as any)?.__focusRetained === true &&
            (element as any).__localState?.retained === true,
        ),
      ).toBe(true);
    });
  }

  test("incompatible structure replacement restores the cached live value", async ({
    page,
  }) => {
    await mountExampleView(
      page,
      '<div><fig-input-slider value="10"></fig-input-slider></div>',
    );
    const control = page.locator(
      '[data-example-harness="true"] fig-input-slider',
    );
    await control.evaluate((element) => {
      (element as any).__oldInstance = true;
      element.setAttribute("value", "64");
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await page.evaluate(() => {
      (window as any).__exampleViewHarness.render(
        '<section><div><fig-input-slider value="20"></fig-input-slider></div></section>',
      );
    });

    await expect(control).toHaveAttribute("value", "64");
    expect(
      await control.evaluate((element) => (element as any).__oldInstance),
    ).toBeUndefined();
  });

  test("dialog open state remains synchronized with persisted markup", async ({
    page,
  }) => {
    await mountExampleView(
      page,
      '<div><dialog is="fig-dialog">Dialog content</dialog></div>',
    );
    const dialog = page.locator(
      '[data-example-harness="true"] dialog[is="fig-dialog"]',
    );
    await page.evaluate(() => {
      (window as any).__exampleViewHarness.setDialogSync(true);
    });

    await dialog.evaluate((element: HTMLDialogElement) => element.show());
    await expect(dialog).toHaveAttribute("open", "");
    await expect
      .poll(() =>
        page.evaluate(() => ({
          markup: (window as any).__exampleViewHarness.getMarkup(),
          states: (window as any).__exampleViewHarness.dialogStates,
        })),
      )
      .toMatchObject({
        markup: expect.stringContaining("open"),
        states: expect.arrayContaining([true]),
      });

    await dialog.evaluate((element: HTMLDialogElement) => element.close());
    await expect(dialog).not.toHaveAttribute("open");
    await expect
      .poll(() =>
        page.evaluate(() => ({
          markup: (window as any).__exampleViewHarness.getMarkup(),
          states: (window as any).__exampleViewHarness.dialogStates,
        })),
      )
      .toMatchObject({
        markup: expect.not.stringContaining(" open"),
        states: expect.arrayContaining([true, false]),
      });
  });

  test("replaced dialogs cannot publish queued stale state", async ({
    page,
  }) => {
    await mountExampleView(
      page,
      '<div><dialog is="fig-dialog">Old dialog</dialog></div>',
    );

    const states = await page.evaluate(async () => {
      const oldDialog = document.querySelector<HTMLDialogElement>(
        '[data-example-harness="true"] dialog[is="fig-dialog"]',
      );
      if (!oldDialog) throw new Error("Missing old dialog");

      oldDialog.setAttribute("open", "");
      (window as any).__exampleViewHarness.render(
        '<section><dialog is="fig-dialog">New dialog</dialog></section>',
      );
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      return (window as any).__exampleViewHarness.dialogStates;
    });

    expect(states).toEqual([]);
    await expect(
      page.locator(
        '[data-example-harness="true"] dialog[is="fig-dialog"]',
      ),
    ).toContainText("New dialog");
  });
});
