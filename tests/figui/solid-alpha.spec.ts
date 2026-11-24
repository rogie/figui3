import { expect, test, type Locator } from "@playwright/test";
import { bootFigFixture } from "./helpers";

test.beforeEach(async ({ page }) => {
  await bootFigFixture(page);
});

async function expectColor(
  control: Locator,
  color: string,
  alpha: number,
  opacity: number,
) {
  await expect(control.locator("fig-input-text input")).toHaveValue(
    color.slice(1).toUpperCase(),
  );
  await expect(control.locator("fig-input-number input")).toHaveValue(
    `${opacity}%`,
  );
  const swatch = control.locator("fig-swatch");
  await expect(swatch).toHaveAttribute("background", new RegExp(`^${color}$`, "i"));
  await expect(swatch).toHaveAttribute("alpha", String(alpha));
}

test("solid fill parses embedded alpha and explicit opacity on value updates", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = `<fig-input-fill value='{"type":"solid","color":"#00000000"}'></fig-input-fill>`;
  });
  const fill = page.locator("fig-input-fill");
  await expectColor(fill, "#000000", 0, 0);

  const cases = [
    { value: "#33669980", alpha: 128 / 255, opacity: 50 },
    { value: { type: "solid", color: "#33669980" }, alpha: 128 / 255, opacity: 50 },
    { value: { type: "solid", color: "#33669980", alpha: 0.1234 }, alpha: 0.1234, opacity: 12 },
    { value: { type: "solid", color: "#33669980", opacity: 1 }, alpha: 0.01, opacity: 1 },
    { value: { type: "solid", color: "#33669980", alpha: 0, opacity: 100 }, alpha: 0, opacity: 0 },
    { value: { type: "solid", color: "#336699" }, alpha: 1, opacity: 100 },
  ];
  for (const { value, alpha, opacity } of cases) {
    const result = await fill.evaluate((el, value) => {
      const host = el as HTMLElementTagNameMap["fig-input-fill"];
      host.value = value;
      return host.value;
    }, value);
    expect(result).toMatchObject({ color: "#336699", alpha, opacity });
    await expectColor(fill, "#336699", alpha, opacity);
  }
});

for (const withEditor of [false, true]) {
  test(`solid fill accepts pasted alpha and applies opacity once ${withEditor ? "with Editor" : "in Core"}`, async ({ page }) => {
    if (withEditor) await page.evaluate(() => import("/fig-editor.js"));
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `<fig-input-fill value='{"type":"solid","color":"#33669980"}'></fig-input-fill>`;
    });
    const fill = page.locator("fig-input-fill");
    await expectColor(fill, "#336699", 128 / 255, 50);
    const hex = fill.locator("fig-input-text input");
    await hex.selectText();
    await page.keyboard.insertText("#00000000");
    await hex.blur();
    await expectColor(fill, "#000000", 0, 0);

    const swatch = fill.locator("fig-swatch");
    const readMask = () => swatch.evaluate((el) => getComputedStyle(el, "::before").maskImage);
    expect(await readMask()).toContain("rgba(0, 0, 0, 0)");
    await fill.evaluate((el) => {
      const events: unknown[] = [];
      const changes: unknown[] = [];
      const alphaWrites: MutationRecord[] = [];
      const observer = new MutationObserver((records) => alphaWrites.push(...records));
      observer.observe(el.querySelector("fig-swatch")!, {
        attributes: true,
        attributeFilter: ["alpha"],
      });
      el.addEventListener("input", (event) => events.push((event as CustomEvent).detail));
      el.addEventListener("change", (event) => changes.push((event as CustomEvent).detail));
      Object.assign(el, { events, changes, alphaWrites });
    });
    const opacity = fill.locator("fig-input-number input");
    await opacity.fill("40");
    await opacity.blur();

    await expectColor(fill, "#000000", 0.4, 40);
    expect(await readMask()).toContain("rgba(0, 0, 0, 0.4)");
    const result = await fill.evaluate((host) => {
      const picker = host.querySelector("fig-fill-picker")!;
      return {
        pickerValue: JSON.parse(picker.getAttribute("value")!),
        actualPickerValue: "value" in picker ? picker.value : null,
        events: Reflect.get(host, "events"),
        changes: Reflect.get(host, "changes"),
        alphaWriteCount: Reflect.get(host, "alphaWrites").length,
      };
    });
    const expected = { type: "solid", color: "#000000", alpha: 0.4, opacity: 40 };
    expect(result.pickerValue).toMatchObject(expected);
    if (withEditor) expect(result.actualPickerValue).toMatchObject({ alpha: 0.4 });
    expect(result.events).toEqual([expect.objectContaining(expected)]);
    expect(result.changes).toEqual([expect.objectContaining(expected)]);
    expect(result.alphaWriteCount).toBe(1);
  });
}

test("color input updates its swatch on hex paste and keeps edited alpha precision", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = '<fig-input-color value="#33669980"></fig-input-color>';
  });
  const color = page.locator("fig-input-color");
  await expectColor(color, "#336699", 128 / 255, 50);
  await color.evaluate((el) => el.setAttribute("value", "#00000000"));
  await expectColor(color, "#000000", 0, 0);

  const hex = color.locator("fig-input-text input");
  await hex.selectText();
  await page.keyboard.insertText("33669980");
  await expectColor(color, "#336699", 128 / 255, 50);

  const event = await color.evaluate((el) => {
    const input = el.querySelector<HTMLInputElement>("fig-input-number input")!;
    const events: unknown[] = [];
    el.addEventListener("input", (event) => events.push((event as CustomEvent).detail));
    input.value = "50";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return events;
  });
  expect(event).toEqual([expect.objectContaining({
    color: "#336699",
    value: "#33669980",
    alpha: 0.5,
    opacity: 50,
  })]);
  await expect(color.locator("fig-swatch")).toHaveAttribute("alpha", "0.5");
});
