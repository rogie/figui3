import type { Page } from "@playwright/test";
import type { ComponentContract, EventContract } from "../../playground/src/testing/componentManifest";

export interface PageErrors {
  consoleErrors: string[];
  pageErrors: string[];
}

export function collectPageErrors(page: Page): PageErrors {
  const errors: PageErrors = { consoleErrors: [], pageErrors: [] };
  page.on("console", (message) => {
    if (message.type() === "error") errors.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    errors.pageErrors.push(error.message);
  });
  return errors;
}

export async function bootFigFixture(page: Page) {
  await page.goto("/tests/figui/fixture.html");
  await page.waitForFunction(() => customElements.get("fig-button"));
}

export async function waitForComponentDefinitions(page: Page, contracts: ComponentContract[]) {
  await page.evaluate(async (tags) => {
    await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
  }, Array.from(new Set(contracts.map((contract) => contract.tag))));
}

export async function mountContract(page: Page, contract: ComponentContract) {
  await page.evaluate((markup) => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = markup;
  }, contract.markup);
  await page.waitForTimeout(50);
}

export async function getContractElementCount(page: Page, contract: ComponentContract) {
  const selector = contract.selector ?? contract.tag;
  return page.locator(selector).count();
}

export async function runAttributeContract(
  page: Page,
  contract: ComponentContract,
  attribute: string,
  value: string,
) {
  const selector = contract.selector ?? contract.tag;
  return page.locator(selector).evaluate(
    (element, args) => {
      element.setAttribute(args.attribute, args.value);
      return element.getAttribute(args.attribute);
    },
    { attribute, value },
  );
}

export async function runPropertyContract(
  page: Page,
  contract: ComponentContract,
  property: string,
  value: string | number | boolean,
) {
  const selector = contract.selector ?? contract.tag;
  return page.locator(selector).evaluate(
    (element, args) => {
      const target = element as HTMLElement & Record<string, unknown>;
      target[args.property] = args.value;
      return target[args.property];
    },
    { property, value },
  );
}

export async function runEventContract(
  page: Page,
  contract: ComponentContract,
  eventContract: EventContract,
) {
  const selector = contract.selector ?? contract.tag;
  return page.locator(selector).evaluate(
    async (element, args) => {
      const host = element as HTMLElement;
      const events: Array<{ type: string; detail: unknown }> = [];
      host.addEventListener(args.event, (event) => {
        events.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });

      const action = args.action;
      const target = host.querySelector(action.selector) as HTMLElement | null;
      if (!target) throw new Error(`Missing event target: ${action.selector}`);

      if (action.type === "set-native-value") {
        const input = target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        input.value = action.value;
        input.dispatchEvent(new Event(action.nativeEvent, { bubbles: true }));
      } else {
        target.click();
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));
      return events;
    },
    {
      event: eventContract.event,
      action: eventContract.action,
    },
  );
}
