import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("popup consumer lifecycle synchronization", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() =>
      Promise.all([
        customElements.whenDefined("fig-select"),
        customElements.whenDefined("fig-input-point"),
        customElements.whenDefined("fig-input-rotate"),
        customElements.whenDefined("fig-input-palette"),
        customElements.whenDefined("fig-input-gradient"),
        customElements.whenDefined("fig-fill-picker"),
      ]),
    );
  });

  test("rapid select requests and outside close keep host and ARIA synchronized", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-select id="select" value="one" options="one,two"></fig-select>
        <button id="outside">Outside</button>
      `;
      const select = root.querySelector("#select") as HTMLElement & {
        open: boolean;
      };
      select.open = true;
      select.open = false;
      select.open = true;
    });

    const select = page.locator("#select");
    const trigger = select.locator("fig-button.fig-select-trigger");
    await expect
      .poll(() =>
        select.evaluate((host: any) => {
          const popup = host.shadowRoot?.querySelector(
            'dialog[is="fig-popup"]',
          );
          return popup?.lifecycleState;
        }),
      )
      .toBe("open");
    await expect(select).toHaveAttribute("open", "");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.locator("#outside").dispatchEvent("pointerdown");
    await expect(select).not.toHaveAttribute("open");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect
      .poll(() =>
        select.evaluate(
          (host: any) =>
            host.shadowRoot?.querySelector('dialog[is="fig-popup"]')
              ?.lifecycleState,
        ),
      )
      .toBe("closed");
  });

  test("point, rotate, and palette follow native popup closes", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-input-point id="point" x="10" y="20"></fig-input-point>
        <fig-input-rotate id="rotate" x="10" y="20" z="30"></fig-input-rotate>
        <fig-input-palette
          id="palette"
          edit="picker"
          value='["#112233","#445566"]'>
        </fig-input-palette>
      `;
    });

    for (const fixture of [
      {
        host: "#point",
        trigger: "#point > fig-button",
        popup: "dialog.fig-input-point-popup",
      },
      {
        host: "#rotate",
        trigger: "#rotate > fig-button",
        popup: "dialog.fig-input-rotate-popup",
      },
      {
        host: "#palette",
        trigger: "#palette .palette-colors-inline",
        popup: 'dialog[is="fig-popup-palette"]',
      },
    ]) {
      await page.locator(fixture.trigger).click();
      const popup = page.locator(fixture.popup);
      await expect
        .poll(() =>
          popup.evaluate((element: any) => element.lifecycleState),
        )
        .toBe("open");
      await expect(page.locator(fixture.host)).toHaveAttribute("open");
      await expect(page.locator(fixture.trigger)).toHaveAttribute(
        "aria-expanded",
        "true",
      );

      await popup.evaluate((element: any) => {
        if (element.matches(":popover-open")) element.hidePopover();
        try {
          element.close();
        } catch {}
      });
      await expect
        .poll(() =>
          popup.evaluate((element: any) => element.lifecycleState),
        )
        .toBe("closed");
      await expect(page.locator(fixture.host)).not.toHaveAttribute("open");
      await expect(page.locator(fixture.trigger)).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  test("picker consumers clear visual and ARIA state after native close", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-input-gradient
          id="gradient"
          edit="picker"
          value='{"type":"linear","stops":[{"position":0,"color":"#112233"},{"position":100,"color":"#445566"}]}'>
        </fig-input-gradient>
        <fig-fill-picker id="fill">
          <fig-swatch id="fill-trigger"></fig-swatch>
        </fig-fill-picker>
      `;
    });

    const gradient = page.locator("#gradient");
    await gradient.click();
    const gradientPopup = page.locator('dialog[is="fig-popup-gradient"]');
    await expect(gradient).toHaveClass(/has-popup-open/);
    await gradientPopup.evaluate((element: any) => element.close());
    await expect(gradient).not.toHaveClass(/has-popup-open/);

    const fill = page.locator("#fill");
    const fillTrigger = page.locator("#fill-trigger");
    await fillTrigger.click();
    const fillPopup = page.locator("dialog.fig-fill-picker-dialog");
    await expect(fillTrigger).toHaveAttribute("aria-expanded", "true");
    await fillPopup.evaluate((element: any) => element.close());
    await expect(fillTrigger).toHaveAttribute("aria-expanded", "false");

    await fill.evaluate((element: any) => {
      element.open();
      element.close();
      element.open();
    });
    await expect
      .poll(() =>
        fillPopup.evaluate((element: any) => element.lifecycleState),
      )
      .toBe("open");
    await expect(fillTrigger).toHaveAttribute("aria-expanded", "true");
  });
});
