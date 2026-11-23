import { expect, test } from "@playwright/test";
import { bootFigFixture } from "./helpers";

test.beforeEach(async ({ page }) => {
  await bootFigFixture(page);
});

test("keeps inline sizing and responds to selection state changes", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = `<p>Use <fig-chip label="Brand colors">
      <span slot="trailing">RGB</span>
    </fig-chip> as context.</p>`;
  });
  const chip = page.locator("fig-chip");
  const label = chip.locator("label");
  await expect(chip).toHaveCSS("display", "inline-block");
  await expect(label).toHaveCSS("padding-inline-start", "4px");
  await expect(label).toHaveCSS("padding-inline-end", "4px");

  await chip.evaluate((element) => {
    element.querySelector('[slot="trailing"]')?.setAttribute("slot", "leading");
    (element as HTMLElementTagNameMap["fig-chip"]).label = "<Palette>";
    (element as HTMLElementTagNameMap["fig-chip"]).selected = true;
  });
  await expect(label).toHaveText("<Palette>");
  await expect(label).toHaveCSS("padding-inline-start", "4px");
  await expect(label).toHaveCSS("padding-inline-end", "4px");
  await expect(chip).toHaveCSS("outline-style", "solid");
  await expect(chip).toHaveCSS("outline-offset", "-1px");
  await chip.evaluate((element) => element.setAttribute("selected", "false"));
  await expect(chip).toHaveCSS("outline-style", "none");
});

test("toggles selection and keeps removal separate and cancelable", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = '<fig-chip label="Landscape" removable="false"></fig-chip>';
  });
  const chip = page.locator("fig-chip");
  const selection = chip.getByRole("button", { name: "Landscape", exact: true });
  const removeButton = chip.getByRole("button", { name: "Remove Landscape" });
  await expect(removeButton).toHaveCount(0);
  await chip.evaluate((element) => {
    (element as HTMLElementTagNameMap["fig-chip"]).removable = true;
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
