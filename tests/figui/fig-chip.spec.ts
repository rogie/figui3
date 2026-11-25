import { expect, test } from "@playwright/test";
import { bootFigFixture } from "./helpers";

test.beforeEach(async ({ page }) => {
  await bootFigFixture(page);
});

test("sizes text, leading content, and remove buttons with the size attribute", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = `<p>
      <fig-chip label="Text"></fig-chip>
      <fig-chip label="Icon" trailing="remove"><fig-icon slot="leading" name="image"></fig-icon></fig-chip>
      <fig-chip label="Color"><fig-swatch slot="leading" size="extra-small" padding="false" background="#0D99FF" disabled></fig-swatch></fig-chip>
    </p>`;
  });
  const chips = page.locator("fig-chip");
  const removeButton = chips.nth(1).getByRole("button", { name: "Remove Icon" });
  const assertHeight = async (height: string) => {
    for (const chip of await chips.all()) await expect(chip).toHaveCSS("height", height);
    await expect(removeButton).toHaveCSS("height", height);
    await expect(removeButton).toHaveCSS("width", height);
  };

  expect(await chips.first().evaluate((el) => (el as HTMLElementTagNameMap["fig-chip"]).size))
    .toBe("medium");
  expect(await chips.first().getAttribute("size")).toBeNull();
  await assertHeight("24px");
  await chips.evaluateAll((elements) => {
    for (const el of elements) (el as HTMLElementTagNameMap["fig-chip"]).size = "small";
  });
  await expect(chips.first()).toHaveAttribute("size", "small");
  await assertHeight("20px");
  await chips.evaluateAll((elements) => {
    for (const el of elements) el.setAttribute("size", "medium");
  });
  await assertHeight("24px");
});

test("keeps inline sizing and responds to selection state changes", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = `<p>Use <fig-chip label="Brand colors">
      <span slot="trailing">RGB</span>
    </fig-chip> as context.</p>`;
  });
  const chip = page.locator("fig-chip");
  const label = chip.locator("label");
  await expect(chip).toHaveCSS("display", "inline-flex");
  await expect(chip.locator('[part="selection"]')).toHaveCSS("align-self", "baseline");
  await expect(label).toHaveCSS("padding-inline-start", "8px");
  await expect(label).toHaveCSS("padding-inline-end", "8px");
  await chip.evaluate((element) => { (element as HTMLElement).style.maxInlineSize = "88px"; });
  await expect(label).toHaveCSS("text-overflow", "ellipsis");
  expect(await label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

  await chip.evaluate((element) => {
    element.querySelector('[slot="trailing"]')?.setAttribute("slot", "leading");
    (element as HTMLElementTagNameMap["fig-chip"]).label = "<Palette>";
    (element as HTMLElementTagNameMap["fig-chip"]).selected = true;
  });
  await expect(label).toHaveText("<Palette>");
  await expect(label).toHaveCSS("padding-inline-start", "8px");
  await expect(label).toHaveCSS("padding-inline-end", "8px");
  await expect(chip).toHaveCSS("outline-style", "solid");
  await expect(chip).toHaveCSS("outline-offset", "-1px");
  await chip.evaluate((element) => element.setAttribute("selected", "false"));
  await expect(chip).toHaveCSS("outline-style", "none");
});

test("switches between generated trailing controls alongside authored content", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = '<fig-chip label="Options" trailing="select"><span slot="trailing">RGB</span></fig-chip>';
  });
  const chip = page.locator("fig-chip");
  const chevron = chip.locator('fig-icon[slot="trailing"][data-generated="select-chevron"]');
  const label = chip.locator("label");
  const remove = chip.getByRole("button", { name: "Remove Options" });
  await expect(chevron).toBeVisible();
  await expect(label).toHaveCSS("padding-inline-end", "2px");
  await expect(chevron).toHaveAttribute("name", "chevron");
  await expect(chevron).toHaveAttribute("aria-hidden", "true");
  await expect(chevron).toHaveAttribute("size", "small");
  await expect(chevron).toHaveCSS("width", "16px");
  await expect(chevron).toHaveCSS("margin", "4px");
  await chip.evaluate((el) => el.setAttribute("size", "small"));
  await expect(chevron).toHaveCSS("width", "16px");
  await expect(chevron).toHaveCSS("margin", "0px");
  await chip.evaluate((el) => el.setAttribute("size", "medium"));
  await expect(chevron).toHaveCSS("width", "16px");
  await expect(chevron).toHaveCSS("margin", "4px");
  await expect(remove).toHaveCount(0);
  await chip.evaluate((el) => el.setAttribute("trailing", "remove"));
  await expect(chevron).toHaveCount(0);
  await expect(remove).toBeVisible();
  await expect(label).toHaveCSS("padding-inline-end", "2px");
  await expect(chip.locator('span[slot="trailing"]')).toHaveText("RGB");
  await chip.evaluate((el) => { (el as HTMLElementTagNameMap["fig-chip"]).trailing = "select"; });
  await expect(chip).toHaveAttribute("trailing", "select");
  await expect(chevron).toHaveCount(1);
  await expect(remove).toHaveCount(0);
  await chip.evaluate((el) => el.removeAttribute("trailing"));
  await expect(chevron).toHaveCount(0);
  await expect(remove).toHaveCount(0);
  await expect(label).toHaveCSS("padding-inline-end", "8px");
  await expect(chip.locator('span[slot="trailing"]')).toHaveText("RGB");
  await chip.evaluate((el) => {
    el.insertAdjacentHTML("beforeend", '<fig-button slot="trailing" variant="ghost">Edit</fig-button>');
  });
  await expect(label).toHaveCSS("padding-inline-end", "2px");
});

test("toggles selection and keeps removal separate and cancelable", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = '<fig-chip label="Landscape"></fig-chip>';
  });
  const chip = page.locator("fig-chip");
  const selection = chip.getByRole("button", { name: "Landscape", exact: true });
  const removeButton = chip.getByRole("button", { name: "Remove Landscape" });
  await expect(removeButton).toHaveCount(0);
  await chip.evaluate((element) => {
    (element as HTMLElementTagNameMap["fig-chip"]).trailing = "remove";
    element.parentElement?.addEventListener("change", (event) => {
      element.setAttribute("data-change", String((event as CustomEvent).detail.selected));
    });
    element.parentElement?.addEventListener(
      "remove",
      (event) => event.preventDefault(),
      { once: true },
    );
  });

  await selection.click();
  await expect(selection).toHaveAttribute("aria-pressed", "true");
  await expect(chip).toHaveAttribute("data-change", "true");
  await selection.press("Space");
  await expect(selection).toHaveAttribute("aria-pressed", "false");
  await expect(chip).toHaveAttribute("data-change", "false");
  await removeButton.focus();
  await removeButton.press("Enter");
  await expect(chip).toBeVisible();
  await expect(selection).toHaveAttribute("aria-pressed", "false");
  await removeButton.press("Space");
  await expect(chip).toHaveCount(0);
});
