import type { Section } from "../data/sections";

const INPUT_SECTION_ORDER = [
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
] as const;

const inputSectionRank = new Map<string, number>(
  INPUT_SECTION_ORDER.map((id, index) => [id, index]),
);

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareSections(
  group: string | undefined,
  a: Section,
  b: Section,
): number {
  if (group === "Inputs") {
    const aRank = inputSectionRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = inputSectionRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
  }
  return compareNames(a.name, b.name);
}

function compareExampleNames(a: string, b: string): number {
  const aIsDefault = a.toLowerCase() === "default";
  const bIsDefault = b.toLowerCase() === "default";
  if (aIsDefault !== bIsDefault) return aIsDefault ? -1 : 1;
  return compareNames(a, b);
}

function sortExamples(section: Section): Section {
  return {
    ...section,
    examples: [...section.examples].sort((a, b) =>
      compareExampleNames(a.name, b.name),
    ),
  };
}

export function sortSectionsWithinGroups(sections: Section[]): Section[] {
  const groupOrder: Array<string | undefined> = [];
  const byGroup = new Map<string | undefined, Section[]>();

  for (const section of sections) {
    const group = section.group;
    if (!byGroup.has(group)) {
      groupOrder.push(group);
      byGroup.set(group, []);
    }
    byGroup.get(group)!.push(section);
  }

  return groupOrder.flatMap((group) =>
    byGroup
      .get(group)!
      .map(sortExamples)
      .sort((a, b) => compareSections(group, a, b)),
  );
}
