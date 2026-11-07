import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.beforeEach(async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
});

test("supports the published platform baseline", async ({ page }) => {
  const support = await page.evaluate(() => ({
    nesting: CSS.supports("selector(&)"),
    has: CSS.supports("selector(:has(*))"),
    lightDark: CSS.supports("color", "light-dark(white, black)"),
    resizeObserver: typeof ResizeObserver === "function",
    privateFields: (() => {
      try {
        return !!Function("return class { #value = 1 }")();
      } catch {
        return false;
      }
    })(),
  }));

  expect(support).toEqual({
    nesting: true,
    has: true,
    lightDark: true,
    resizeObserver: true,
    privateFields: true,
  });
});

test("core controls register and emit rich input details", async ({ page }) => {
  const state = await page.evaluate(async () => {
    await Promise.all([
      customElements.whenDefined("fig-button"),
      customElements.whenDefined("fig-input-text"),
    ]);
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-button id="button">Save</fig-button>
      <fig-input-text id="input" value="Before"></fig-input-text>
    `;
    const button = root.querySelector("#button") as HTMLElement;
    const input = root.querySelector("#input") as HTMLElement & {
      input: HTMLInputElement;
    };
    let clicks = 0;
    let detail: unknown;
    button.addEventListener("click", () => clicks++);
    input.addEventListener("input", (event) => {
      detail = (event as CustomEvent).detail;
    });
    button.click();
    input.input.value = "After";
    input.input.dispatchEvent(new Event("input", { bubbles: true }));
    return {
      clicks,
      value: input.getAttribute("value"),
      detail,
    };
  });

  expect(state).toEqual({
    clicks: 1,
    value: "After",
    detail: "After",
  });
});

test("customized popup menus open and clean up across engines", async ({
  page,
}) => {
  const state = await page.evaluate(async () => {
    await Promise.all([
      customElements.whenDefined("fig-popup"),
      customElements.whenDefined("fig-menu"),
    ]);
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-menu id="menu">
        <button fig-menu-trigger>Actions</button>
        <fig-menu-item value="copy">Copy</fig-menu-item>
      </fig-menu>
    `;
    const menu = root.querySelector("#menu") as HTMLElement & {
      open: boolean;
    };
    menu.open = true;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const popup = menu.shadowRoot?.querySelector(
      'dialog[is="fig-popup"]',
    ) as HTMLDialogElement;
    const opened = popup.open;
    menu.remove();
    return {
      popupDefined: !!customElements.get("fig-popup"),
      opened,
      closedAfterDisconnect: !popup.open,
    };
  });

  expect(state).toEqual({
    popupDefined: true,
    opened: true,
    closedAfterDisconnect: true,
  });
});

test("editor and lab bundles register on every supported engine", async ({
  page,
}) => {
  const state = await page.evaluate(async () => {
    await Promise.all([import("/fig-editor.js"), import("/fig-lab.js")]);
    await Promise.all([
      customElements.whenDefined("fig-select"),
      customElements.whenDefined("fig-input-wheel"),
    ]);
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-select id="select" value="left">
        <fig-select-options>
          <fig-select-option value="left">Left</fig-select-option>
          <fig-select-option value="right">Right</fig-select-option>
        </fig-select-options>
      </fig-select>
      <fig-input-wheel id="wheel" value="50"></fig-input-wheel>
    `;
    await new Promise(requestAnimationFrame);
    return {
      select: root.querySelector("#select")?.constructor.name,
      wheel: root.querySelector("#wheel")?.constructor.name,
      wheelSurface: !!root.querySelector("#wheel svg"),
    };
  });

  expect(state).toEqual({
    select: "FigSelect",
    wheel: "FigInputWheel",
    wheelSurface: true,
  });
});
