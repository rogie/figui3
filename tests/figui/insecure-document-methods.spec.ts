import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { bootFigFixture, collectPageErrors } from "./helpers";

test("shipped source contains no HTML parsing sinks", async () => {
  const files = ["fig.js", "fig-editor.js", "fig-layer.js", "fig-lab.js"];
  const forbidden = [
    /\binnerHTML\b/,
    /\bouterHTML\b/,
    /\binsertAdjacentHTML\b/,
    /\bdocument\s*\.\s*write(?:ln)?\b/,
    /\bDOMParser\b/,
    /\bcreateContextualFragment\b/,
    /\bsetHTMLUnsafe\b/,
  ];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const pattern of forbidden) {
      expect(source, `${file} contains ${pattern}`).not.toMatch(pattern);
    }
  }
});

test.describe("insecure document method regressions", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.addScriptTag({ type: "module", url: "/fig-lab.js" });
  });

  test("joystick axis labels remain literal text", async ({ page }) => {
    const payload = '<img/src=x/onerror="window.__figuiInjected=1">';
    const state = await page.evaluate(async (axisLabels) => {
      const target = window as Window & { __figuiInjected?: number };
      target.__figuiInjected = 0;

      const joystick = document.createElement("fig-joystick");
      joystick.setAttribute("axis-labels", axisLabels);
      document.body.append(joystick);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const label = joystick.querySelector(".fig-joystick-axis-label.top");
      return {
        text: label?.textContent,
        injectedElements: joystick.querySelectorAll("img, script").length,
        handlerAttributes: joystick.querySelectorAll(
          "[onerror], [onload], [onpointerenter]",
        ).length,
        executed: target.__figuiInjected,
      };
    }, payload);

    expect(state).toEqual({
      text: payload,
      injectedElements: 0,
      handlerAttributes: 0,
      executed: 0,
    });
  });

  test("gradient swatch attributes cannot break out into markup", async ({
    page,
  }) => {
    const payload =
      '" onpointerenter="window.__figuiInjected=1" data-fig-injected="';
    const state = await page.evaluate(async (size) => {
      const target = window as Window & { __figuiInjected?: number };
      target.__figuiInjected = 0;

      const gradient = document.createElement("fig-input-gradient");
      gradient.setAttribute("edit", "picker");
      gradient.setAttribute("size", size);
      document.body.append(gradient);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const swatch = gradient.querySelector("fig-swatch");
      swatch?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
      return {
        size: swatch?.getAttribute("size"),
        injectedAttribute: swatch?.getAttribute("data-fig-injected") ?? null,
        handler: swatch?.getAttribute("onpointerenter") ?? null,
        executed: target.__figuiInjected,
      };
    }, payload);

    expect(state).toEqual({
      size: payload,
      injectedAttribute: null,
      handler: null,
      executed: 0,
    });
  });

  test("static gradients do not render placeholder text", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const gradient = document.createElement("fig-input-gradient");
      gradient.setAttribute("edit", "false");
      document.body.append(gradient);
      await new Promise(requestAnimationFrame);
      return {
        text: gradient.textContent,
        swatches: gradient.querySelectorAll(":scope > fig-swatch").length,
        tracks: gradient.querySelectorAll(
          ":scope > .fig-input-gradient-track",
        ).length,
      };
    });

    expect(state).toEqual({ text: "", swatches: 1, tracks: 0 });
  });

  test("picker forwarding preserves value precedence and rejects handlers", async ({
    page,
  }) => {
    const forwardedValue = JSON.stringify({
      type: "solid",
      color: "#112233",
      alpha: 0.5,
    });
    const state = await page.evaluate(async (pickerValue) => {
      const target = window as Window & { __figuiInjected?: number };
      target.__figuiInjected = 0;

      const fill = document.createElement("fig-input-fill");
      fill.setAttribute(
        "value",
        JSON.stringify({ type: "solid", color: "#445566", alpha: 1 }),
      );
      fill.setAttribute("picker-value", pickerValue);
      fill.setAttribute(
        "picker-onpointerenter",
        "window.__figuiInjected=1",
      );
      document.body.append(fill);
      await new Promise(requestAnimationFrame);

      const picker = fill.querySelector("fig-fill-picker");
      picker?.dispatchEvent(
        new PointerEvent("pointerenter", { bubbles: true }),
      );
      return {
        value: picker?.getAttribute("value"),
        handler: picker?.getAttribute("onpointerenter") ?? null,
        executed: target.__figuiInjected,
      };
    }, forwardedValue);

    expect(state).toEqual({
      value: forwardedValue,
      handler: null,
      executed: 0,
    });
  });
});
