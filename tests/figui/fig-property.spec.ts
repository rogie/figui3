import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-property", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-property.css" });
    await page.addScriptTag({ type: "module", url: "/fig-property.js" });
    await page.evaluate(() => customElements.whenDefined("fig-property"));
  });

  test("composes slots, associates the label, and truncates long labels", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="property"
          label="A very long property label that must truncate"
          leading="drag"
          trailing="remove"
          style="width: 240px"
        >
          <fig-input-number slot="input" value="16"></fig-input-number>
        </fig-property>
      `;
    });
    await page.waitForTimeout(50);

    const property = page.locator("#property");
    await expect(
      property.locator(
        ':scope > fig-icon[slot="leading"][name="drag-handle"]',
      ),
    ).toHaveCount(1);
    await expect(
      property.locator(
        ':scope > fig-button[slot="trailing"][data-fig-property-action="remove"]',
      ),
    ).toHaveCount(1);

    const result = await property.evaluate((element: any) => {
      const label = element.querySelector(":scope > label");
      const input = element.querySelector(':scope > [slot="input"]');
      const labelStyle = getComputedStyle(label);
      return {
        inputMatches: element.input === input,
        labelledBy: input?.getAttribute("aria-labelledby"),
        labelId: label?.id,
        overflow: labelStyle.overflow,
        textOverflow: labelStyle.textOverflow,
        whiteSpace: labelStyle.whiteSpace,
        truncated: label.scrollWidth > label.clientWidth,
        inputArea: getComputedStyle(input).gridArea,
      };
    });

    expect(result).toEqual({
      inputMatches: true,
      labelledBy: result.labelId,
      labelId: result.labelId,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      truncated: true,
      inputArea: "input",
    });
    expect(result.labelId).toBeTruthy();
  });

  test("label clicks delegate focus to composite editor controls", async ({
    page,
  }) => {
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() =>
      Promise.all([
        customElements.whenDefined("fig-input-rotate"),
        customElements.whenDefined("fig-select"),
      ]),
    );
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      const gradient =
        '{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}';
      root.innerHTML = `
        <fig-property id="rotate-property" label="Rotate">
          <fig-input-rotate id="rotate" slot="input"></fig-input-rotate>
        </fig-property>
        <fig-property id="easing-property" label="Easing">
          <fig-easing-curve id="easing" slot="input" edit="false"></fig-easing-curve>
        </fig-property>
        <fig-property id="gradient-property" label="Gradient">
          <fig-input-gradient id="gradient" slot="input" value='${gradient}'></fig-input-gradient>
        </fig-property>
        <fig-property id="gradient-picker-property" label="Gradient picker">
          <fig-input-gradient id="gradient-picker" slot="input" edit="picker" value='${gradient}'></fig-input-gradient>
        </fig-property>
        <fig-property id="slider-property" label="Slider">
          <fig-slider id="slider" slot="input" value="50" text="true"></fig-slider>
        </fig-property>
        <fig-property id="switch-property" label="Switch">
          <fig-switch id="switch" slot="input"></fig-switch>
        </fig-property>
      `;
    });
    await page.waitForTimeout(50);

    await page.locator("#rotate-property > label").click();
    await expect(page.locator("#rotate > fig-button")).toBeFocused();

    await page.locator("#easing-property > label").click();
    await expect(page.locator("#easing fig-select")).toBeFocused();

    await page.locator("#gradient-property > label").click();
    await expect(
      page
        .locator("#gradient fig-handle:not(.fig-input-gradient-ghost)")
        .first(),
    ).toBeFocused();

    await page.locator("#gradient-picker-property > label").click();
    await expect(page.locator("#gradient-picker")).toBeFocused();
    await expect(page.locator("#gradient-picker")).toHaveCSS(
      "outline-style",
      "solid",
    );

    await page.locator("#slider-property > label").click();
    await expect(page.locator("#slider fig-input-number input")).toBeFocused();

    await page.locator("#switch-property > label").click();
    await expect(page.locator("#switch input.switch")).toBeFocused();
    await expect(page.locator("#switch input.switch")).toHaveCSS(
      "outline-style",
      "solid",
    );
  });

  test("tooltips truncated labels and cleans up when labels are replaced", async ({
    page,
  }) => {
    const originalText = "A very long property label that must show in full";
    const replacementText =
      "A replacement property label that must also show in full";
    await page.evaluate(
      ({ originalText }) => {
        const root = document.querySelector("#fixture-root");
        if (!root) throw new Error("Missing fixture root");
        root.innerHTML = `
          <fig-property id="truncated" label="${originalText}" style="width: 180px">
            <fig-input-number slot="input" value="16"></fig-input-number>
          </fig-property>
          <fig-property id="fits" label="Name" style="width: 600px">
            <fig-input-text slot="input"></fig-input-text>
          </fig-property>
        `;
      },
      { originalText },
    );
    await page.waitForTimeout(50);

    const tooltip = page.locator(
      'dialog[is="fig-popup"][data-tooltip-managed]',
    );
    const truncatedLabel = page.locator("#truncated > label");
    await expect
      .poll(() =>
        truncatedLabel.evaluate(
          (label) => label.scrollWidth > label.clientWidth,
        ),
      )
      .toBe(true);

    await truncatedLabel.hover();
    await expect(tooltip).toHaveText(originalText);

    await page.locator("#fits > label").hover();
    await expect(tooltip).toHaveCount(0);
    await page.waitForTimeout(550);
    await expect(tooltip).toHaveCount(0);

    await truncatedLabel.hover();
    await expect(tooltip).toHaveText(originalText);
    await page.evaluate(
      () => {
        const label = document.querySelector("#truncated > label");
        if (!label) throw new Error("Missing property label");
        const replacement = document.createElement("label");
        replacement.slot = "label";
        replacement.textContent = "New";
        label.replaceWith(replacement);
      },
    );
    await expect(tooltip).toHaveCount(0);

    const replacementLabel = page.locator(
      '#truncated > label[slot="label"]',
    );
    await page.locator("#fits > label").hover();
    await replacementLabel.evaluate(
      (label, text) => {
        label.textContent = text;
      },
      replacementText,
    );
    await expect
      .poll(() =>
        replacementLabel.evaluate(
          (label) => label.scrollWidth > label.clientWidth,
        ),
      )
      .toBe(true);
    await replacementLabel.hover();
    await expect(tooltip).toHaveText(replacementText);

    await page.locator("#truncated").evaluate((property) => property.remove());
    await expect(tooltip).toHaveCount(0);
  });

  test("shows accessories on hover by default, supports always, and honors false", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="hover" leading="drag" trailing="remove">
          <fig-input-number slot="input" value="1"></fig-input-number>
        </fig-property>
        <fig-property id="always" leading="drag" trailing="remove" show-leading show-trailing>
          <fig-input-number slot="input" value="2"></fig-input-number>
        </fig-property>
        <fig-property id="never" leading="drag" trailing="remove" show-leading="false" show-trailing="false">
          <fig-input-number slot="input" value="3"></fig-input-number>
        </fig-property>
      `;
    });

    const hover = page.locator("#hover");
    const hoverLeading = hover.locator(':scope > [slot="leading"]');
    const hoverTrailing = hover.locator(':scope > [slot="trailing"]');
    await expect(hoverLeading).toHaveCSS("visibility", "hidden");
    await expect(hoverTrailing).toHaveCSS("visibility", "hidden");
    await hover.hover();
    await expect(hoverLeading).toHaveCSS("visibility", "visible");
    await expect(hoverTrailing).toHaveCSS("visibility", "visible");

    await expect(
      page.locator('#always > [slot="leading"]'),
    ).toHaveCSS("visibility", "visible");
    await expect(
      page.locator('#always > [slot="trailing"]'),
    ).toHaveCSS("visibility", "visible");

    await page.locator("#never").hover();
    await expect(page.locator('#never > [slot="leading"]')).toHaveCSS(
      "display",
      "none",
    );
    await expect(page.locator('#never > [slot="trailing"]')).toHaveCSS(
      "display",
      "none",
    );
  });

  test("remaps logical colors when selected unless selected is false", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="present" selected></fig-property>
        <fig-property id="true" selected="true"></fig-property>
        <fig-property id="false" selected="false"></fig-property>
        <fig-property id="unset"></fig-property>
      `;
    });

    const colors = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      const background = (selector: string) =>
        getComputedStyle(document.querySelector(selector)!).backgroundColor;
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--figma-color-bg-selected)";
      document.body.append(probe);
      const token = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const selected = root.querySelector("#present")!;
      const mappings = [
        ["--figma-color-bg", "--figma-color-bg-selected"],
        ["--figma-color-bg-hover", "--figma-color-bg-selected-hover"],
        ["--figma-color-bg-active", "--figma-color-bg-selected-pressed"],
        ["--figma-color-bg-pressed", "--figma-color-bg-selected-pressed"],
        ["--figma-color-bg-secondary", "--figma-color-bg-selected-secondary"],
        ["--figma-color-bg-tertiary", "--figma-color-bg-selected-tertiary"],
        ["--figma-color-border", "--figma-color-border-onselected"],
        ["--figma-color-border-strong", "--figma-color-border-onselected-strong"],
        ["--figma-color-icon", "--figma-color-icon-onselected"],
        ["--figma-color-icon-secondary", "--figma-color-icon-onselected-secondary"],
        ["--figma-color-icon-tertiary", "--figma-color-icon-onselected-tertiary"],
        ["--figma-color-text", "--figma-color-text-onselected"],
        ["--figma-color-text-secondary", "--figma-color-text-onselected-secondary"],
        ["--figma-color-text-tertiary", "--figma-color-text-onselected-tertiary"],
      ];
      const remaps = mappings.map(([logical, selectedToken]) => {
        const actual = document.createElement("span");
        const expected = document.createElement("span");
        actual.style.backgroundColor = `var(${logical})`;
        expected.style.backgroundColor = `var(${selectedToken})`;
        selected.append(actual);
        root.append(expected);
        const matches =
          getComputedStyle(actual).backgroundColor ===
          getComputedStyle(expected).backgroundColor;
        actual.remove();
        expected.remove();
        return matches;
      });
      return {
        token,
        present: background("#present"),
        true: background("#true"),
        false: background("#false"),
        unset: background("#unset"),
        remaps,
      };
    });

    expect(colors.present).toBe(colors.token);
    expect(colors.true).toBe(colors.token);
    expect(colors.false).toBe(colors.unset);
    expect(colors.false).not.toBe(colors.token);
    expect(colors.remaps).toEqual(Array(14).fill(true));
  });

  test("updates generated accessories and emits action events", async ({
    page,
  }) => {
    const property = page.locator("#fixture-root").locator("fig-property");
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property label="Opacity" trailing="remove">
          <fig-input-number slot="input" value="50"></fig-input-number>
        </fig-property>
      `;
      const element = root.querySelector("fig-property");
      for (const type of ["remove", "add", "bind"]) {
        element?.addEventListener(type, (event) => {
          element.setAttribute(
            `data-${type}-input`,
            String(
              (event as CustomEvent<{ input?: Element }>).detail?.input ===
                (element as any).input,
            ),
          );
          element.setAttribute(
            `data-${type}-composed`,
            String(event.composed),
          );
        });
      }
    });

    for (const action of ["remove", "add", "bind"]) {
      await property.evaluate((element, value) => {
        element.setAttribute("trailing", value);
      }, action);
      const button = property.locator(
        `:scope > [data-fig-property-action="${action}"]`,
      );
      await expect(button).toHaveCount(1);
      await property.hover();
      await button.click();
      await expect(property).toHaveAttribute(`data-${action}-input`, "true");
      await expect(property).toHaveAttribute(
        `data-${action}-composed`,
        "true",
      );
    }
  });

  test("preserves authored accessories and native child event bubbling", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="authored" leading="drag" trailing="remove">
          <span id="leading" slot="leading">L</span>
          <fig-input-text id="input" slot="input"></fig-input-text>
          <button id="trailing" slot="trailing">Custom</button>
        </fig-property>
      `;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const property = root.querySelector("#authored");
      const input = root.querySelector("#input");
      let received = null;
      property?.addEventListener("input", (event) => {
        received = {
          targetId: (event.target as HTMLElement).id,
          detail: (event as CustomEvent).detail,
        };
      });
      input?.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: { value: "Rogie" },
        }),
      );
      return {
        generated: property?.querySelectorAll(
          ":scope > [data-fig-property-generated]",
        ).length,
        leadingConnected: root.querySelector("#leading")?.isConnected,
        trailingConnected: root.querySelector("#trailing")?.isConnected,
        received,
      };
    });

    expect(result).toEqual({
      generated: 0,
      leadingConnected: true,
      trailingConnected: true,
      received: {
        targetId: "input",
        detail: { value: "Rogie" },
      },
    });
  });

  test("prefers authored label markup over the label attribute", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="custom-label" label="Generated label">
          <span slot="label"><strong>Custom</strong> label</span>
          <fig-input-text slot="input"></fig-input-text>
        </fig-property>
      `;
    });

    const property = page.locator("#custom-label");
    const label = property.locator(':scope > [slot="label"]');
    const input = property.locator(':scope > [slot="input"]');
    await expect(label).toHaveCount(1);
    await expect(label).toContainText("Custom label");
    await expect(label.locator("strong")).toHaveText("Custom");
    await expect(
      property.locator(":scope > label[data-fig-property-generated]"),
    ).toHaveCount(0);
    const labelId = await label.getAttribute("id");
    expect(labelId).toBeTruthy();
    await expect(input).toHaveAttribute("aria-labelledby", labelId as string);
  });

  test("reassociates a dynamically replaced input without overwriting names", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="dynamic" label="Name">
          <fig-input-text id="first" slot="input"></fig-input-text>
        </fig-property>
      `;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const property = root.querySelector("#dynamic");
      const first = root.querySelector("#first");
      const second = document.createElement("fig-input-text");
      second.id = "second";
      second.slot = "input";
      second.setAttribute("aria-label", "Authored name");
      first?.replaceWith(second);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return {
        firstAssociation: first?.getAttribute("aria-labelledby"),
        secondAriaLabel: second.getAttribute("aria-label"),
        secondAssociation: second.getAttribute("aria-labelledby"),
        currentInputId: (property as any)?.input?.id,
      };
    });

    expect(state).toEqual({
      firstAssociation: null,
      secondAriaLabel: "Authored name",
      secondAssociation: null,
      currentInputId: "second",
    });
  });
});

test("is registered by the property and editor bundles", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  expect(
    await page.evaluate(() => Boolean(customElements.get("fig-property"))),
  ).toBe(false);
  await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
  await page.evaluate(() => customElements.whenDefined("fig-property"));
  expect(
    await page.evaluate(() => Boolean(customElements.get("fig-property"))),
  ).toBe(true);
});
