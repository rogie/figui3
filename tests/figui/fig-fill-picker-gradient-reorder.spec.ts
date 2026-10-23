import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fill picker gradient stop reorder", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.addScriptTag({ type: "module", url: "/fig-lab.js" });
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-fill-picker"),
        customElements.whenDefined("fig-reorder"),
      ]);
    });
  });

  test("keeps edited stop color after reordering", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gradientValue = {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 90,
          stops: [
            { position: 0, color: "#0D99FF", opacity: 100 },
            { position: 50, color: "#14AE5C", opacity: 100 },
            { position: 100, color: "#737373", opacity: 100 },
          ],
        },
      };

      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-fill-picker
          id="picker"
          mode="gradient"
          value='${JSON.stringify(gradientValue)}'
        >
          <fig-swatch background="linear-gradient(90deg, #0D99FF 0%, #14AE5C 50%, #737373 100%)"></fig-swatch>
        </fig-fill-picker>
      `;

      const picker = document.querySelector("#picker");
      if (!(picker instanceof HTMLElement) || typeof picker.open !== "function") {
        throw new Error("Missing fill picker");
      }

      await customElements.whenDefined("fig-fill-picker");
      picker.open();
      await customElements.whenDefined("fig-reorder");

      const dialog = document.querySelector("dialog.fig-fill-picker-dialog");
      if (!(dialog instanceof HTMLElement)) throw new Error("Picker dialog not open");

      await new Promise((resolve) => {
        const wait = () => {
          if (dialog.querySelector(".fig-fill-picker-gradient-stop-row")) {
            resolve(undefined);
            return;
          }
          requestAnimationFrame(wait);
        };
        wait();
      });

      const firstColorInput = dialog.querySelector(
        ".fig-fill-picker-gradient-stop-row[data-index='0'] .fig-fill-picker-stop-color",
      );
      if (!(firstColorInput instanceof HTMLElement)) {
        throw new Error("Missing first stop color input");
      }

      // Mimic the real fig-fill-picker -> fig-input-color path, which updates
      // internal state (hexOpaque/value/rgba) but NOT the value attribute.
      firstColorInput.hexOpaque = "#FF0000";
      firstColorInput.value = "#FF0000";
      firstColorInput.rgba = { r: 255, g: 0, b: 0, a: 1 };
      firstColorInput.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: {
            value: "#FF0000",
            hex: "#FF0000",
            rgba: { r: 255, g: 0, b: 0, a: 1 },
          },
        }),
      );

      const afterInput = picker.value?.gradient?.stops?.[0]?.color?.toUpperCase();

      // Perform a real fig-reorder drag of row 0 down past the last row.
      const rows = () =>
        [...dialog.querySelectorAll(".fig-fill-picker-gradient-stop-row")];
      const row0 = rows()[0];
      if (!(row0 instanceof HTMLElement)) throw new Error("Missing stop row");
      const inputStack = row0.querySelector(
        ":scope > .fig-fill-picker-gradient-stop-inputs",
      );
      const rowContract = {
        tag: row0.tagName,
        leading: row0.getAttribute("leading"),
        trailing: row0.getAttribute("trailing"),
        showLeading: row0.getAttribute("show-leading"),
        showTrailing: row0.hasAttribute("show-trailing"),
        inputTag: inputStack?.tagName,
        inputSlot: inputStack?.getAttribute("slot"),
      };
      const lastRect = rows()[2].getBoundingClientRect();
      const startRect = row0.getBoundingClientRect();

      row0.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: startRect.left + 2,
          clientY: startRect.top + startRect.height / 2,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: startRect.left + 2,
          clientY: lastRect.bottom + 20,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          clientX: startRect.left + 2,
          clientY: lastRect.bottom + 20,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );

      const value = picker.value;
      const stops = value?.gradient?.stops ?? [];
      return {
        afterInput,
        rowContract,
        colors: stops.map((stop: { color: string }) => stop.color.toUpperCase()),
        lastColor: stops[stops.length - 1]?.color?.toUpperCase() ?? "",
      };
    });

    expect(result.afterInput).toBe("#FF0000");
    expect(result.rowContract).toEqual({
      tag: "FIG-PROPERTY",
      leading: "drag",
      trailing: "remove",
      showLeading: "hover",
      showTrailing: true,
      inputTag: "FIG-STACK",
      inputSlot: "input",
    });
    expect(result.lastColor).toBe("#FF0000");
    expect(result.colors).toContain("#FF0000");
  });

  test("removes a stop added from the gradient bar", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-fill-picker
          id="picker"
          mode="gradient"
          value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":50,"color":"#14AE5C","opacity":100},{"position":100,"color":"#737373","opacity":100}]}}'
        >
          <fig-swatch></fig-swatch>
        </fig-fill-picker>
      `;
      document.querySelector<HTMLElement>("#picker")?.open();
    });

    const dialog = page.locator("dialog.fig-fill-picker-dialog");
    const track = dialog.locator(
      ".fig-fill-picker-gradient-bar-input .fig-input-gradient-track",
    );
    await expect(track).toBeVisible();

    const trackBox = await track.boundingBox();
    if (!trackBox) throw new Error("Missing gradient track bounds");
    await page.mouse.click(
      trackBox.x + trackBox.width * 0.25,
      trackBox.y + trackBox.height / 2,
    );

    const rows = dialog.locator(".fig-fill-picker-gradient-stop-row");
    const handles = dialog.locator(
      ".fig-fill-picker-gradient-bar-input fig-handle:not(.fig-input-gradient-ghost)",
    );
    await expect(rows).toHaveCount(4);
    await expect(handles).toHaveCount(4);

    const addedRow = rows.filter({
      has: page.locator('.fig-fill-picker-stop-position[value="25"]'),
    });
    await addedRow.locator(".fig-fill-picker-stop-remove").click();

    await expect(rows).toHaveCount(3);
    await expect(handles).toHaveCount(3);
    await expect
      .poll(() =>
        dialog
          .locator(".fig-fill-picker-gradient-bar-input")
          .evaluate(
            (input: HTMLElement & { value?: { gradient?: { stops?: unknown[] } } }) =>
              input.value?.gradient?.stops?.length,
          ),
      )
      .toBe(3);
  });
});
