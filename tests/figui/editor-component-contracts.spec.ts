import { expect, test } from "@playwright/test";
import { editorComponentContracts } from "../../playground/src/testing/componentManifest";
import {
  bootFigFixture,
  collectPageErrors,
  getContractElementCount,
  mountContract,
  runAttributeContract,
  runEventContract,
  runPropertyContract,
  waitForComponentDefinitions,
} from "./helpers";

test.describe("editor component manifest contracts", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(() => import("/fig-editor.js"));
    await waitForComponentDefinitions(page, editorComponentContracts);
  });

  test("registers every editor component in the manifest", async ({ page }) => {
    const missing = await page.evaluate(
      (tags) => tags.filter((tag) => !customElements.get(tag)),
      editorComponentContracts.map((contract) => contract.tag),
    );
    expect(missing).toEqual([]);
  });

  for (const contract of editorComponentContracts) {
    test(`${contract.tag}: mounts without runtime errors`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await mountContract(page, contract);
      await expect
        .poll(() => getContractElementCount(page, contract))
        .toBeGreaterThan(0);
      expect(errors.pageErrors).toEqual([]);
      expect(errors.consoleErrors).toEqual([]);
    });

    for (const attribute of contract.attributes ?? []) {
      test(`${contract.tag}: ${attribute.name} attribute`, async ({ page }) => {
        await mountContract(page, contract);
        const actual = await runAttributeContract(
          page,
          contract,
          attribute.attribute,
          attribute.value,
        );
        expect(actual).toBe(attribute.expected ?? attribute.value);
      });
    }

    for (const property of contract.properties ?? []) {
      test(`${contract.tag}: ${property.name}`, async ({ page }) => {
        await mountContract(page, contract);
        const actual = await runPropertyContract(
          page,
          contract,
          property.property,
          property.value,
        );
        expect(String(actual)).toBe(String(property.expected));
      });
    }

    for (const eventContract of contract.events ?? []) {
      test(`${contract.tag}: ${eventContract.name}`, async ({ page }) => {
        await mountContract(page, contract);
        const events = await runEventContract(page, contract, eventContract);
        expect(events.length).toBeGreaterThan(0);
        expect(events.at(-1)).toMatchObject({
          type: eventContract.event,
          ...("expectedDetail" in eventContract
            ? { detail: eventContract.expectedDetail }
            : {}),
        });
      });
    }
  }
});
