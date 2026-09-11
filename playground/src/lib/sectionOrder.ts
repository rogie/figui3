import type { Section } from "../data/sections";

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function sortExamples(section: Section): Section {
  return {
    ...section,
    examples: [...section.examples].sort((a, b) => compareNames(a.name, b.name)),
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
      .sort((a, b) => compareNames(a.name, b.name)),
  );
}
