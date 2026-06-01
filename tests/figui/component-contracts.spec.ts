import { expect, test } from "@playwright/test";
import { componentContracts } from "../../playground/src/testing/componentManifest";
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

test.describe("fig.js component contracts", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await waitForComponentDefinitions(page, componentContracts);
  });

  test("registers every component in the manifest", async ({ page }) => {
    const missing = await page.evaluate((tags) => {
      return tags.filter((tag) => !customElements.get(tag));
    }, componentContracts.map((contract) => contract.tag));

    expect(missing).toEqual([]);
  });

  for (const contract of componentContracts) {
    test(`${contract.tag}: mounts without runtime errors`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await mountContract(page, contract);

      await expect
        .poll(async () => getContractElementCount(page, contract), {
          message: `${contract.tag} fixture should create its target element`,
        })
        .toBeGreaterThan(0);

      expect(errors.pageErrors, `${contract.tag} page errors`).toEqual([]);
      expect(errors.consoleErrors, `${contract.tag} console errors`).toEqual([]);
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

        if (typeof property.expected === "boolean") {
          expect(Boolean(actual)).toBe(property.expected);
        } else {
          expect(String(actual)).toBe(String(property.expected));
        }
      });
    }

    for (const eventContract of contract.events ?? []) {
      test(`${contract.tag}: ${eventContract.name}`, async ({ page }) => {
        await mountContract(page, contract);
        const events = await runEventContract(page, contract, eventContract);

        expect(events.length).toBeGreaterThan(0);
        const last = events[events.length - 1];
        expect(last.type).toBe(eventContract.event);
        if ("expectedDetail" in eventContract) {
          expect(last.detail).toEqual(eventContract.expectedDetail);
        }
      });
    }
  }
});
