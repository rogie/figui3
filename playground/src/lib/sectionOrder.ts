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

const EDITOR_SECTION_ORDER = [
  "fill-picker",
  "input-point",
  "layer",
  "palette-editor",
  "gradient-editor",
  "property",
  "reorder",
  "select",
  "toast",
] as const;

const GETTING_STARTED_SECTION_ORDER = [
  "quick-start",
  "numbers",
  "colors",
  "toggles",
  "text",
  "groups",
  "propskit-media",
] as const;

const MEDIA_EXAMPLE_ORDER = [
  "audio-empty",
  "audio-url",
  "image-empty",
  "image",
  "images",
  "video-empty",
  "video",
  "videos",
] as const;

const gettingStartedSectionRank = new Map<string, number>(
  GETTING_STARTED_SECTION_ORDER.map((id, index) => [id, index]),
);
const mediaExampleRank = new Map<string, number>(
  MEDIA_EXAMPLE_ORDER.map((id, index) => [id, index]),
);
const toggleExampleRank = new Map([
  ["on", 0],
  ["off", 1],
]);
const textExampleRank = new Map([
  ["single-line", 0],
  ["multiline", 1],
]);
const colorExampleRank = new Map([
  ["color", 0],
  ["alpha", 1],
]);
const inputSectionRank = new Map<string, number>(
  INPUT_SECTION_ORDER.map((id, index) => [id, index]),
);
const editorSectionRank = new Map<string, number>(
  EDITOR_SECTION_ORDER.map((id, index) => [id, index]),
);

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareSections(
  group: string | undefined,
  a: Section,
  b: Section,
): number {
  if (group === "Getting started") {
    const aRank =
      gettingStartedSectionRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank =
      gettingStartedSectionRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
  }
  if (group === "Inputs") {
    const aRank = inputSectionRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = inputSectionRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
  }
  if (group === "Editor components") {
    const aRank = editorSectionRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = editorSectionRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
  }
  if (group === "Load indicators") {
    const aIsPlayButton = a.id === "button-play";
    const bIsPlayButton = b.id === "button-play";
    if (aIsPlayButton !== bIsPlayButton) return aIsPlayButton ? 1 : -1;
  }
  if (group === "Media") {
    const aIsCarousel = a.id === "carousel";
    const bIsCarousel = b.id === "carousel";
    if (aIsCarousel !== bIsCarousel) return aIsCarousel ? 1 : -1;
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
    examples: [...section.examples].sort((a, b) => {
      if (section.id === "colors") {
        const aRank = colorExampleRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bRank = colorExampleRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
      }
      if (section.id === "text") {
        const aRank = textExampleRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bRank = textExampleRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
      }
      if (section.id === "toggles") {
        const aRank = toggleExampleRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bRank = toggleExampleRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
      }
      if (section.id === "propskit-media") {
        const aRank = mediaExampleRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bRank = mediaExampleRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
      }
      if (section.id === "file-input") {
        const aIsCustomAccepts = a.id === "accepts";
        const bIsCustomAccepts = b.id === "accepts";
        if (aIsCustomAccepts !== bIsCustomAccepts) {
          return aIsCustomAccepts ? 1 : -1;
        }
      }
      if (section.id === "toolbelt") {
        const rank = (id: string) =>
          id === "default" ? 0 : id === "large" ? 1 : 2;
        const rankDifference = rank(a.id) - rank(b.id);
        if (rankDifference !== 0) return rankDifference;
      }
      return compareExampleNames(a.name, b.name);
    }),
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
