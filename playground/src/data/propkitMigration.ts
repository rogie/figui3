import {
  legacyPropsKitSections,
  type Example,
  type Section,
} from "./sections";

export interface PropsKitMigrationEntry {
  sectionId: string;
  exampleId: string;
  duplicate?: boolean;
}

const SECTION_TARGETS: Record<string, string> = {
  "atom-tabs": "tabs",
  group: "group",
  content: "content",
  header: "header",
  footer: "footer",
  "3d-rotate": "3d-rotate",
  angle: "angle",
  chooser: "chooser",
  button: "button",
  color: "color",
  dropdown: "dropdown",
  easing: "easing",
  fill: "fill-input",
  gradient: "gradient",
  image: "image",
  video: "video",
  media: "media",
  preview: "preview",
  joystick: "joystick",
  number: "number-input",
  "origin-grid": "origin-grid",
  palette: "palette",
  segment: "segmented-control",
  options: "options",
  skeleton: "skeleton",
  slider: "slider",
  switch: "switch",
  text: "text-input",
  file: "file-input",
  "atom-position": "field",
  "atom-grouped-inputs": "field",
  "atom-segmented-control": "segmented-control",
  "atom-dropdown": "dropdown",
  "atom-menu": "menu",
  "atom-helper-text": "field",
  "atom-more-info": "field",
  "atom-footer": "footer",
  "atom-preview": "preview",
  "atom-search": "text-input",
};

for (const section of legacyPropsKitSections) {
  if (section.id.startsWith("dialog-")) {
    SECTION_TARGETS[section.id] = section.id;
  }
}

const DUPLICATE_SECTIONS = new Set([
  "chooser",
  "color",
  "gradient",
  "palette",
]);

const PRIMARY_NEW_SECTION_SOURCES = new Set([
  "group",
  "content",
  "header",
  "footer",
  "3d-rotate",
  "angle",
  "easing",
  "preview",
  "joystick",
  "origin-grid",
  "options",
  "skeleton",
  ...legacyPropsKitSections
    .filter((section) => section.id.startsWith("dialog-"))
    .map((section) => section.id),
]);

const NEW_SECTION_GROUPS: Record<string, string> = {
  group: "Navigation & Containers",
  content: "Navigation & Containers",
  header: "Navigation & Containers",
  footer: "Navigation & Containers",
  "3d-rotate": "Inputs",
  angle: "Inputs",
  easing: "Inputs",
  preview: "Media",
  joystick: "Inputs",
  "origin-grid": "Inputs",
  options: "Inputs",
  skeleton: "Load indicators",
};

function targetExampleId(
  sourceSectionId: string,
  sourceExampleId: string,
): string {
  if (DUPLICATE_SECTIONS.has(sourceSectionId)) return sourceExampleId;
  if (PRIMARY_NEW_SECTION_SOURCES.has(sourceSectionId)) return sourceExampleId;

  const targetSectionId = SECTION_TARGETS[sourceSectionId];
  const suffix =
    sourceSectionId === targetSectionId ? "propskit" : sourceSectionId;
  return `${sourceExampleId}-${suffix}`;
}

export const propkitMigration: Record<string, PropsKitMigrationEntry> =
  Object.fromEntries(
    legacyPropsKitSections.flatMap((section) => {
      const sectionId = SECTION_TARGETS[section.id];
      if (!sectionId) {
        throw new Error(`Missing PropsKit section migration for "${section.id}"`);
      }
      return section.examples.map((example) => [
        `${section.id}/${example.id}`,
        {
          sectionId,
          exampleId: targetExampleId(section.id, example.id),
          ...(DUPLICATE_SECTIONS.has(section.id)
            ? { duplicate: true }
            : {}),
        },
      ]);
    }),
  );

export function getPropsKitMigration(
  sectionId: string,
  exampleId: string,
): PropsKitMigrationEntry | undefined {
  return propkitMigration[`${sectionId}/${exampleId}`];
}

function migratedName(
  example: Example,
  sourceSection: Section,
  targetSection: Section,
): string {
  if (!targetSection.examples.some((target) => target.name === example.name)) {
    return example.name;
  }
  if (
    example.id === "default" &&
    sourceSection.name !== targetSection.name
  ) {
    return sourceSection.name;
  }
  if (
    example.name === "Default" &&
    sourceSection.group === "Field controls"
  ) {
    return "Label + input";
  }

  const qualifier =
    sourceSection.group === "Field controls"
      ? "field"
      : sourceSection.group === "Containers & navigation"
        ? "property panel"
        : "pattern";
  return `${example.name} (${qualifier})`;
}

function targetGroup(sourceSection: Section): string | undefined {
  if (sourceSection.id.startsWith("dialog-")) return "Dialog examples";
  return NEW_SECTION_GROUPS[sourceSection.id] ?? sourceSection.group;
}

export function mergePropsKitSections(baseSections: Section[]): Section[] {
  const merged = baseSections.map((section) => ({
    ...section,
    examples: [...section.examples],
  }));

  for (const sourceSection of legacyPropsKitSections) {
    const firstExample = sourceSection.examples[0];
    const firstMigration = firstExample
      ? getPropsKitMigration(sourceSection.id, firstExample.id)
      : undefined;
    if (!firstMigration) continue;
    if (firstMigration.duplicate) continue;

    let targetSection = merged.find(
      (section) => section.id === firstMigration.sectionId,
    );

    if (!targetSection) {
      targetSection = {
        ...sourceSection,
        id: firstMigration.sectionId,
        group: targetGroup(sourceSection),
        examples: [],
      };
      merged.push(targetSection);
    }

    for (const example of sourceSection.examples) {
      const migration = getPropsKitMigration(sourceSection.id, example.id);
      if (!migration || migration.duplicate) continue;
      targetSection.examples.push({
        ...example,
        id: migration.exampleId,
        name: migratedName(example, sourceSection, targetSection),
      });
    }
  }

  return merged;
}
