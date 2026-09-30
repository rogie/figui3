import { expect, test } from "@playwright/test";
import { figui3Sections } from "../../playground/src/data/figui3Sections";
import {
  propkitMigration,
  type PropsKitMigrationEntry,
} from "../../playground/src/data/propkitMigration";
import { legacyPropsKitSections } from "../../playground/src/data/sections";
import { sortSectionsWithinGroups } from "../../playground/src/lib/sectionOrder";

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
    expect(oldKeys).toHaveLength(125);
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
      "dropdown",
      "segmented-control",
      "slider",
      "file-input",
      "color",
      "fill-input",
      "combo-input",
      "input-combo",
      "options",
      "chooser",
      "property-button",
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
