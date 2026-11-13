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

  test("applies reflected label-to-input ratios with stable fallbacks and overrides", async ({
    page,
  }) => {
    await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="default-ratio" label="Default" style="width: 300px">
          <fig-input-text slot="input" value="Default" full></fig-input-text>
        </fig-property>
        <fig-property id="equal-ratio" label="Equal" ratio="1:1" style="width: 300px">
          <fig-input-text slot="input" value="Equal" full></fig-input-text>
        </fig-property>
        <fig-property id="common-ratio" label="Common" ratio="2:3" style="width: 300px">
          <fig-input-text slot="input" value="Common" full></fig-input-text>
        </fig-property>
        <fig-property id="decimal-ratio" label="Decimal" ratio="2.5:3" style="width: 300px">
          <fig-input-text slot="input" value="Decimal" full></fig-input-text>
        </fig-property>
        <fig-property id="invalid-ratio" label="Invalid" ratio="0:nope" style="width: 300px">
          <fig-input-text slot="input" value="Invalid" full></fig-input-text>
        </fig-property>
        <fig-property
          id="css-ratio"
          label="CSS override"
          ratio="1:1"
          style="width: 300px; --fig-property-label-ratio: 1fr; --fig-property-input-ratio: 3fr"
        >
          <fig-input-text slot="input" value="CSS" full></fig-input-text>
        </fig-property>
        <fig-property
          id="row-ratio"
          label="Row ignores ratio"
          ratio="3:1"
          activation="row"
          style="width: 300px"
        >
          <fig-input-number slot="input" value="16"></fig-input-number>
        </fig-property>
        <fig-property
          id="trailing-ratio"
          label="Trailing"
          ratio="1:1"
          trailing="remove"
          style="width: 300px"
        >
          <fig-input-number slot="input" value="16" full></fig-input-number>
        </fig-property>
      `;
      await Promise.resolve();
    });

    const readRatio = (selector: string) =>
      page.locator(selector).evaluate((element: any) => {
        const tracks = [
          ...getComputedStyle(element).gridTemplateColumns.matchAll(
            /-?\d+(?:\.\d+)?px/g,
          ),
        ].map((match) => Number.parseFloat(match[0]));
        return {
          attribute: element.getAttribute("ratio"),
          property: element.ratio,
          trackRatio: tracks[1] / tracks[2],
          labelTrack: tracks[1],
          inlineRatioProperties: [
            "--fig-property-attribute-label-ratio",
            "--fig-property-attribute-input-ratio",
            "--fig-property-attribute-label-track",
          ].map((property) => element.style.getPropertyValue(property)),
        };
      });

    const defaultRatio = await readRatio("#default-ratio");
    expect(defaultRatio.trackRatio).toBeCloseTo(0.5, 2);
    expect(defaultRatio.inlineRatioProperties).toEqual(["", "", ""]);
    const equalRatio = await readRatio("#equal-ratio");
    expect(equalRatio.trackRatio).toBeCloseTo(1, 2);
    expect(equalRatio.inlineRatioProperties).toEqual(["", "", ""]);
    const commonRatio = await readRatio("#common-ratio");
    expect(commonRatio.trackRatio).toBeCloseTo(2 / 3, 2);
    expect(commonRatio.inlineRatioProperties).toEqual(["", "", ""]);
    const decimalRatio = await readRatio("#decimal-ratio");
    expect(decimalRatio.trackRatio).toBeCloseTo(2.5 / 3, 2);
    expect(decimalRatio.inlineRatioProperties.every(Boolean)).toBe(true);
    const invalid = await readRatio("#invalid-ratio");
    expect(invalid.property).toBe("1:2");
    expect(invalid.trackRatio).toBeCloseTo(0.5, 2);
    expect((await readRatio("#css-ratio")).trackRatio).toBeCloseTo(1 / 3, 2);
    expect((await readRatio("#row-ratio")).trackRatio).toBeCloseTo(1, 2);

    const trailingBefore = await readRatio("#trailing-ratio");
    await page.locator("#trailing-ratio").hover();
    const trailingAfter = await readRatio("#trailing-ratio");
    expect(trailingBefore.trackRatio).toBeCloseTo(1, 2);
    expect(trailingAfter.labelTrack).toBeCloseTo(
      trailingBefore.labelTrack,
      1,
    );

    const reflected = await page.locator("#equal-ratio").evaluate(
      async (element: any) => {
        element.ratio = "3:1";
        await Promise.resolve();
        const assigned = {
          attribute: element.getAttribute("ratio"),
          property: element.ratio,
        };
        element.ratio = null;
        await Promise.resolve();
        return {
          assigned,
          removed: {
            attribute: element.getAttribute("ratio"),
            property: element.ratio,
          },
        };
      },
    );
    expect(reflected).toEqual({
      assigned: { attribute: "3:1", property: "3:1" },
      removed: { attribute: null, property: "1:2" },
    });
    expect((await readRatio("#equal-ratio")).trackRatio).toBeCloseTo(0.5, 2);
  });

  test("focus and activate delegate to the slotted input contract", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="contract-property" label="Contract">
          <button id="contract-input" slot="input">Input</button>
        </fig-property>
      `;

      const property = root.querySelector<any>("#contract-property");
      const input = root.querySelector<any>("#contract-input");
      const focusCalls: Array<FocusOptions | null> = [];
      const nativeFocus = input.focus.bind(input);
      input.focus = (options?: FocusOptions) => {
        focusCalls.push(options ?? null);
        nativeFocus(options);
      };
      input.activate = (options: unknown) => {
        input.dataset.activation = JSON.stringify(options);
        return "activated";
      };

      property.focus({ preventScroll: true });
      const focused = document.activeElement === input;
      const activationResult = property.activate({ source: "row" });
      const activation = input.dataset.activation;

      input.blur();
      delete input.activate;
      const fallbackResult = property.activate({ source: "fallback" });

      return {
        activation,
        activationResult,
        fallbackFocused: document.activeElement === input,
        fallbackResult: fallbackResult ?? null,
        focusCalls,
        focused,
      };
    });

    expect(result).toEqual({
      activation: '{"source":"row"}',
      activationResult: "activated",
      fallbackFocused: true,
      fallbackResult: null,
      focusCalls: [{ preventScroll: true }, null],
      focused: true,
    });
  });

  test("opens a context menu and delegates resetToDefault to the slotted input", async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-input-slider.css" });
    await page.addScriptTag({ type: "module", url: "/fig-input-slider.js" });
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-slider");
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="reset-property" label="Amount">
          <fig-input-slider
            id="reset-slider"
            slot="input"
            value="75"
            default="50"
          ></fig-input-slider>
        </fig-property>
      `;
      const slider = root.querySelector("#reset-slider");
      slider.addEventListener("input", () => {
        slider.dataset.inputEvents = String(
          Number(slider.dataset.inputEvents || 0) + 1,
        );
      });
      slider.addEventListener("change", () => {
        slider.dataset.changeEvents = String(
          Number(slider.dataset.changeEvents || 0) + 1,
        );
      });
    });

    const property = page.locator("#reset-property");
    const menu = property.locator(
      ':scope > fig-menu[data-fig-property-reset-menu]',
    );
    const item = menu.locator(
      ':scope > fig-menu-item[value="reset-to-default"]',
    );
    await property.dispatchEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: 80,
    });
    await expect(menu).toHaveAttribute("open", "");
    await expect(property).toHaveAttribute("selected", "");
    await expect(item).not.toHaveAttribute("disabled", "");

    await item.click();

    await expect(page.locator("#reset-slider")).toHaveAttribute("value", "50");
    await expect(page.locator("#reset-slider")).toHaveAttribute(
      "data-input-events",
      "1",
    );
    await expect(page.locator("#reset-slider")).toHaveAttribute(
      "data-change-events",
      "1",
    );
    await expect(item).toHaveAttribute("disabled", "");
    await expect(menu).not.toHaveAttribute("open", "");
    await expect(property).not.toHaveAttribute("selected");
  });

  test('leaves contextmenu handling to the app with context-menu="none"', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <div id="context-menu-owner">
          <fig-property
            id="custom-context-property"
            label="Amount"
            context-menu="none"
          >
            <fig-input-number
              slot="input"
              value="10"
              default="0"
            ></fig-input-number>
          </fig-property>
        </div>
      `;

      let bubbled = 0;
      root.querySelector("#context-menu-owner")?.addEventListener(
        "contextmenu",
        () => {
          bubbled += 1;
        },
      );
      const property = root.querySelector("#custom-context-property");
      if (!property) throw new Error("Missing property");
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 80,
        clientY: 80,
      });
      const dispatchResult = property.dispatchEvent(event);
      return {
        bubbled,
        defaultPrevented: event.defaultPrevented,
        dispatchResult,
      };
    });

    expect(result).toEqual({
      bubbled: 1,
      defaultPrevented: false,
      dispatchResult: true,
    });
    const property = page.locator("#custom-context-property");
    await expect(
      property.locator(":scope > fig-menu[data-fig-property-reset-menu]"),
    ).toHaveCount(0);
    await expect(property).not.toHaveAttribute("selected");
  });

  test("selects the row while the context menu is open and restores authored selected", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="menu-selected" label="Amount">
          <fig-input-number slot="input" value="10" default="0"></fig-input-number>
        </fig-property>
        <fig-property id="menu-authored" label="Amount" selected>
          <fig-input-number slot="input" value="10" default="0"></fig-input-number>
        </fig-property>
        <fig-property id="menu-false" label="Amount" selected="false">
          <fig-input-number slot="input" value="10" default="0"></fig-input-number>
        </fig-property>
      `;
    });

    const openMenu = async (id: string) => {
      const property = page.locator(`#${id}`);
      await property.dispatchEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 80,
        clientY: 80,
      });
      await expect(
        property.locator(":scope > fig-menu[data-fig-property-reset-menu]"),
      ).toHaveAttribute("open", "");
      return property;
    };

    const plain = await openMenu("menu-selected");
    await expect(plain).toHaveAttribute("selected", "");
    await page.keyboard.press("Escape");
    await expect(plain).not.toHaveAttribute("selected");
    await expect(
      plain.locator(":scope > fig-menu[data-fig-property-reset-menu]"),
    ).not.toHaveAttribute("open");

    const authored = await openMenu("menu-authored");
    await expect(authored).toHaveAttribute("selected", "");
    await page.keyboard.press("Escape");
    await expect(authored).toHaveAttribute("selected", "");

    const explicitOff = await openMenu("menu-false");
    await expect(explicitOff).toHaveAttribute("selected", "");
    await page.keyboard.press("Escape");
    await expect(explicitOff).toHaveAttribute("selected", "false");
  });

  test("resets every reset-capable slotted input", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="multi-reset-property" label="Position">
          <div slot="input">
            <fig-input-number
              id="multi-reset-x"
              value="24"
              default="4">
            </fig-input-number>
            <fig-input-number
              id="multi-reset-y"
              value="16"
              default="8">
            </fig-input-number>
          </div>
        </fig-property>
      `;
    });

    const property = page.locator("#multi-reset-property");
    await property.dispatchEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: 80,
    });
    const item = property.locator(
      ':scope > fig-menu > fig-menu-item[value="reset-to-default"]',
    );
    await expect(item).not.toHaveAttribute("disabled", "");

    const values = await property.evaluate((element: any) => {
      element.resetToDefault();
      return Array.from(element.querySelectorAll("fig-input-number")).map(
        (input: any) => ({
          reset: typeof input.resetToDefault,
          value: input.value,
        }),
      );
    });

    expect(values).toEqual([
      { reset: "function", value: 4 },
      { reset: "function", value: 8 },
    ]);
    await expect(item).toHaveAttribute("disabled", "");
  });

  test("disables Reset to default when the input cannot reset", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="unsupported-reset-property" label="Name">
          <fig-button slot="input">Action</fig-button>
        </fig-property>
      `;
    });

    const property = page.locator("#unsupported-reset-property");
    await property.dispatchEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: 80,
    });
    await expect(
      property.locator(
        ':scope > fig-menu > fig-menu-item[value="reset-to-default"]',
      ),
    ).toHaveAttribute("disabled", "");
  });

  test("keeps the reset menu state live across events, attributes, and replacement", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="live-reset-property" label="Amount">
          <fig-input-number
            id="live-reset-input"
            slot="input"
            value="10"
            default="0">
          </fig-input-number>
        </fig-property>
      `;
    });

    const property = page.locator("#live-reset-property");
    await property.dispatchEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: 80,
    });
    const item = property.locator(
      ':scope > fig-menu > fig-menu-item[value="reset-to-default"]',
    );
    await expect(item).not.toHaveAttribute("disabled", "");

    await page.locator("#live-reset-input").evaluate((input) => {
      input.setAttribute("value", "0");
      input.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    });
    await expect(item).toHaveAttribute("disabled", "");

    await page.locator("#live-reset-input").evaluate((input) => {
      input.setAttribute("value", "5");
      input.dispatchEvent(new CustomEvent("change", { bubbles: true }));
    });
    await expect(item).not.toHaveAttribute("disabled", "");

    await page.locator("#live-reset-input").evaluate((input) =>
      input.setAttribute("disabled", ""),
    );
    await expect(item).toHaveAttribute("disabled", "");

    await page.locator("#live-reset-input").evaluate((input) =>
      input.removeAttribute("disabled"),
    );
    await expect(item).not.toHaveAttribute("disabled", "");

    await property.evaluate((element) => {
      const replacement = document.createElement("fig-button");
      replacement.setAttribute("slot", "input");
      replacement.textContent = "Action";
      element.querySelector(':scope > [slot="input"]')?.replaceWith(replacement);
    });
    await expect(item).toHaveAttribute("disabled", "");
  });

  test("select and point implement normalized default resets", async ({
    page,
  }) => {
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    const state = await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-select"),
        customElements.whenDefined("fig-input-point"),
      ]);
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-select id="select" value="Large" default="Medium" options="Small,Medium,Large"></fig-select>
        <fig-input-point
          id="point"
          x="24"
          y="16"
          default-x="4"
          default-y="8">
        </fig-input-point>
      `;
      const results: Record<string, unknown> = {};
      for (const id of ["select", "point"]) {
        const control = root.querySelector(`#${id}`) as HTMLElement & {
          value: unknown;
          default: unknown;
          defaultValue: unknown;
          isDefault: boolean;
          resetToDefault(): void;
        };
        const events: Array<{ type: string; detail: unknown }> = [];
        control.addEventListener("input", (event) =>
          events.push({
            type: event.type,
            detail: (event as CustomEvent).detail,
          }),
        );
        control.addEventListener("change", (event) =>
          events.push({
            type: event.type,
            detail: (event as CustomEvent).detail,
          }),
        );
        const before = {
          value: control.value,
          default: control.default,
          defaultValue: control.defaultValue,
          isDefault: control.isDefault,
        };
        control.resetToDefault();
        results[id] = {
          before,
          value: control.value,
          isDefault: control.isDefault,
          events,
        };
      }
      return results;
    });

    expect(state.select).toEqual({
      before: {
        value: "Large",
        default: "Medium",
        defaultValue: "Medium",
        isDefault: false,
      },
      value: "Medium",
      isDefault: true,
      events: [
        { type: "input", detail: "Medium" },
        { type: "change", detail: "Medium" },
      ],
    });
    expect(state.point).toEqual({
      before: {
        value: { x: 24, y: 16 },
        default: { x: 4, y: 8 },
        defaultValue: { x: 4, y: 8 },
        isDefault: false,
      },
      value: { x: 4, y: 8 },
      isDefault: true,
      events: [
        { type: "input", detail: { x: 4, y: 8 } },
        { type: "change", detail: { x: 4, y: 8 } },
      ],
    });
  });

  test('activation="row" activates only from the label or row surface', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="row-property"
          label="Row"
          activation="row"
          show-leading
          show-trailing
        >
          <button id="row-leading" slot="leading">Leading</button>
          <button id="row-input" slot="input">Input</button>
          <button id="row-trailing" slot="trailing">Trailing</button>
        </fig-property>
      `;

      const property = root.querySelector<any>("#row-property");
      const label = property.querySelector(":scope > label");
      const input = root.querySelector<any>("#row-input");
      const leading = root.querySelector<any>("#row-leading");
      const trailing = root.querySelector<any>("#row-trailing");
      let activations = 0;
      let inputClicks = 0;
      let leadingClicks = 0;
      let trailingClicks = 0;
      input.activate = () => {
        activations += 1;
      };
      input.addEventListener("click", () => {
        inputClicks += 1;
      });
      leading.addEventListener("click", () => {
        leadingClicks += 1;
      });
      trailing.addEventListener("click", () => {
        trailingClicks += 1;
      });

      label.click();
      const surfaceDispatchResult = property.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
      input.click();
      leading.click();
      trailing.click();
      const rowActivations = activations;

      property.removeAttribute("activation");
      input.blur();
      label.click();
      const defaultFocused = document.activeElement === input;

      property.setAttribute("activation", "other");
      input.blur();
      label.click();
      const unknownFocused = document.activeElement === input;

      property.setAttribute("activation", "row");
      input.blur();
      label.click();

      return {
        activations,
        defaultFocused,
        inputClicks,
        leadingClicks,
        rowActivations,
        surfaceDispatchResult,
        trailingClicks,
        unknownFocused,
      };
    });

    expect(result).toEqual({
      activations: 3,
      defaultFocused: true,
      inputClicks: 1,
      leadingClicks: 1,
      rowActivations: 2,
      surfaceDispatchResult: false,
      trailingClicks: 1,
      unknownFocused: true,
    });
  });

  test('activation="row" shows the shared focus outline', async ({ page }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="focus-row" label="Focusable" activation="row">
          <button slot="input">Input</button>
        </fig-property>
      `;

      const property = root.querySelector<HTMLElement>("#focus-row");
      const label = property?.querySelector(":scope > label");
      const input = property?.querySelector<HTMLElement>('[slot="input"]');
      if (!property || !label || !input) {
        throw new Error("Missing focus row parts");
      }
      label.click();

      const selectedBackground = document.createElement("div");
      selectedBackground.style.backgroundColor =
        "var(--figma-color-bg-selected)";
      root.append(selectedBackground);
      const style = getComputedStyle(property, "::before");
      const inputStyle = getComputedStyle(input);
      return {
        backgroundColor: style.backgroundColor,
        expectedBackgroundColor:
          getComputedStyle(selectedBackground).backgroundColor,
        focusWithin: property.matches(":focus-within"),
        inputOutlineStyle: inputStyle.outlineStyle,
        outlineOffset: style.outlineOffset,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });

    expect(result.backgroundColor).toBe(result.expectedBackgroundColor);
    expect(result.focusWithin).toBe(true);
    expect(result.inputOutlineStyle).toBe("none");
    expect(result.outlineStyle).toBe("solid");
    expect(result.outlineWidth).not.toBe("0px");
    expect(result.outlineOffset).not.toBe("0px");
  });

  test('activation="row" toggles a slotted fig-switch', async ({ page }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="switch-row" label="Enabled" activation="row">
          <fig-switch id="row-switch" slot="input"></fig-switch>
        </fig-property>
      `;

      const property = root.querySelector("#switch-row");
      const label = property?.querySelector(":scope > label");
      const input = root.querySelector<any>("#row-switch");
      if (!label || !input) throw new Error("Missing switch property parts");
      let inputEvents = 0;
      let changeEvents = 0;
      input.addEventListener("input", () => {
        inputEvents += 1;
      });
      input.addEventListener("change", () => {
        changeEvents += 1;
      });

      label.click();
      const afterFirstClick = {
        ariaChecked: input.input.getAttribute("aria-checked"),
        checked: input.checked,
        reflected: input.hasAttribute("checked"),
      };

      label.click();
      const afterSecondClick = {
        ariaChecked: input.input.getAttribute("aria-checked"),
        checked: input.checked,
        reflected: input.hasAttribute("checked"),
      };

      input.setAttribute("disabled", "");
      label.click();

      return {
        afterFirstClick,
        afterSecondClick,
        changeEvents,
        disabledClickStayedOff: input.checked === false,
        inputEvents,
      };
    });

    expect(result).toEqual({
      afterFirstClick: {
        ariaChecked: "true",
        checked: true,
        reflected: true,
      },
      afterSecondClick: {
        ariaChecked: "false",
        checked: false,
        reflected: false,
      },
      changeEvents: 2,
      disabledClickStayedOff: true,
      inputEvents: 2,
    });
  });

  test('activation="row" opens a slotted fig-select', async ({ page }) => {
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    const result = await page.evaluate(async () => {
      await customElements.whenDefined("fig-select");
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property label="Mode" activation="row">
          <fig-select
            id="row-select"
            slot="input"
            value="one"
            options="One,Two"
          ></fig-select>
        </fig-property>
      `;

      const property = root.querySelector("fig-property");
      const label = property?.querySelector(":scope > label");
      const select = root.querySelector<any>("#row-select");
      if (!label || !select) throw new Error("Missing select property parts");

      label.click();
      const trigger = select.shadowRoot?.querySelector(".fig-select-trigger");
      const afterRowActivation = {
        expanded: trigger?.getAttribute("aria-expanded"),
        focused: document.activeElement === select,
        menuAnchorIsProperty: select.menuAnchor === property,
        open: select.open,
      };

      select.activate();
      const stayedOpen = select.open;

      select.open = false;
      select.setAttribute("disabled", "");
      label.click();

      property?.removeAttribute("activation");
      await Promise.resolve();

      return {
        afterRowActivation,
        disabledStayedClosed: !select.open,
        menuAnchorRestored: select.menuAnchor === null,
        stayedOpen,
      };
    });

    expect(result).toEqual({
      afterRowActivation: {
        expanded: "true",
        focused: true,
        menuAnchorIsProperty: true,
        open: true,
      },
      disabledStayedClosed: true,
      menuAnchorRestored: true,
      stayedOpen: true,
    });
  });

  test('activation="row" activates popup and file controls', async ({ page }) => {
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-input-rotate"),
        customElements.whenDefined("fig-input-point"),
        customElements.whenDefined("fig-input-file"),
        customElements.whenDefined("fig-input-gradient"),
        customElements.whenDefined("fig-input-palette"),
        customElements.whenDefined("fig-easing-curve"),
        customElements.whenDefined("fig-popup-gradient"),
        customElements.whenDefined("fig-popup-palette"),
        customElements.whenDefined("fig-popup-easing"),
      ]);
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      const gradient =
        '{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}';
      root.innerHTML = `
        <fig-property id="activate-rotate-property" label="Rotate" activation="row" style="width:240px">
          <fig-input-rotate id="activate-rotate" slot="input"></fig-input-rotate>
        </fig-property>
        <fig-property id="activate-point-property" label="Point" activation="row" style="width:240px">
          <fig-input-point id="activate-point" slot="input" x="24" y="16" units="%"></fig-input-point>
        </fig-property>
        <fig-property id="activate-file-property" label="File" activation="row">
          <fig-input-file id="activate-file" slot="input"></fig-input-file>
        </fig-property>
        <fig-property id="activate-gradient-property" label="Gradient" activation="row" style="width:240px">
          <fig-input-gradient
            id="activate-gradient"
            slot="input"
            edit="picker"
            value='${gradient}'
          ></fig-input-gradient>
        </fig-property>
        <fig-property id="activate-palette-property" label="Palette" activation="row" style="width:240px">
          <fig-input-palette
            id="activate-palette"
            slot="input"
            edit="picker"
            value='["#0D99FF","#14AE5C","#FFCD29"]'
          ></fig-input-palette>
        </fig-property>
        <fig-property id="activate-easing-property" label="Easing" activation="row" style="width:240px">
          <fig-easing-curve
            id="activate-easing"
            slot="input"
            edit="false"
          ></fig-easing-curve>
        </fig-property>
      `;

      const nativeFileInput = root.querySelector<HTMLInputElement>(
        "#activate-file input[type=file]",
      );
      if (!nativeFileInput) throw new Error("Missing native file input");
      nativeFileInput.click = () => {
        nativeFileInput.dataset.clicks = String(
          Number(nativeFileInput.dataset.clicks || 0) + 1,
        );
      };
    });

    await page.locator("#activate-rotate-property > label").click();
    await expect(page.locator("#activate-rotate")).toHaveAttribute("open", "");
    await expect(page.locator("dialog.fig-input-rotate-popup")).toHaveAttribute(
      "open",
      /^(|true)$/,
    );
    const rotatePopupGeometry = await page
      .locator("dialog.fig-input-rotate-popup")
      .evaluate((popup: any) => {
        const property = document.querySelector("#activate-rotate-property")!;
        return {
          anchorIsProperty: popup.anchor === property,
          offset: popup.getAttribute("offset"),
          popupWidth: popup.getBoundingClientRect().width,
          propertyWidth: property.getBoundingClientRect().width,
        };
      });
    expect(rotatePopupGeometry.anchorIsProperty).toBe(true);
    expect(rotatePopupGeometry.offset).toBe("0 0");
    expect(rotatePopupGeometry.popupWidth).toBe(
      rotatePopupGeometry.propertyWidth,
    );
    await page.locator("#activate-rotate").evaluate((element: any) => {
      element.open = false;
    });

    await page.locator("#activate-point-property > label").click();
    await expect(page.locator("#activate-point")).toHaveAttribute("open", "");
    const pointPopupGeometry = await page
      .locator("dialog.fig-input-point-popup")
      .evaluate((popup: any) => {
        const property = document.querySelector("#activate-point-property")!;
        const editor = popup.querySelector("fig-origin-grid");
        return {
          anchorIsProperty: popup.anchor === property,
          offset: popup.getAttribute("offset"),
          popupWidth: popup.getBoundingClientRect().width,
          propertyWidth: property.getBoundingClientRect().width,
          editorValue: editor?.getAttribute("value"),
          editorFields: editor?.hasAttribute("fields"),
          editorAspectRatio: editor?.getAttribute("aspect-ratio"),
        };
      });
    expect(pointPopupGeometry).toEqual({
      anchorIsProperty: true,
      offset: "0 0",
      popupWidth: pointPopupGeometry.propertyWidth,
      propertyWidth: 240,
      editorValue: "24.0% 16.0%",
      editorFields: true,
      editorAspectRatio: "4/3",
    });
    await page.locator("#activate-point").evaluate((element: any) => {
      element.open = false;
    });

    await page.locator("#activate-file-property > label").click();
    await expect(
      page.locator("#activate-file input[type=file]"),
    ).toHaveAttribute("data-clicks", "1");

    await page.locator("#activate-gradient-property > label").click();
    await expect(page.locator("#activate-gradient")).toHaveClass(
      /has-popup-open/,
    );
    await expect(
      page.locator('dialog[is="fig-popup-gradient"]'),
    ).toHaveAttribute("open", /^(|true)$/);
    const gradientPopupGeometry = await page
      .locator('dialog[is="fig-popup-gradient"]')
      .evaluate((popup: any) => {
        const property = document.querySelector("#activate-gradient-property")!;
        return {
          anchorIsProperty: popup.anchor === property,
          offset: popup.getAttribute("offset"),
          popupWidth: popup.getBoundingClientRect().width,
          propertyWidth: property.getBoundingClientRect().width,
        };
      });
    expect(gradientPopupGeometry).toEqual({
      anchorIsProperty: true,
      offset: "0 0",
      popupWidth: gradientPopupGeometry.propertyWidth,
      propertyWidth: 240,
    });
    await page
      .locator('dialog[is="fig-popup-gradient"]')
      .evaluate((popup: any) => {
        popup.open = false;
      });

    await page.locator("#activate-palette-property > label").click();
    await expect(page.locator("#activate-palette")).toHaveAttribute("open", "");
    await expect(
      page.locator('dialog[is="fig-popup-palette"]'),
    ).toHaveAttribute("open", /^(|true)$/);
    const palettePopupGeometry = await page
      .locator('dialog[is="fig-popup-palette"]')
      .evaluate((popup: any) => {
        const property = document.querySelector("#activate-palette-property")!;
        return {
          anchorIsProperty: popup.anchor === property,
          offset: popup.getAttribute("offset"),
          popupWidth: popup.getBoundingClientRect().width,
          propertyWidth: property.getBoundingClientRect().width,
        };
      });
    expect(palettePopupGeometry).toEqual({
      anchorIsProperty: true,
      offset: "0 0",
      popupWidth: palettePopupGeometry.propertyWidth,
      propertyWidth: 240,
    });
    await page.locator("#activate-palette").evaluate((element: any) => {
      element.open = false;
    });

    await page.locator("#activate-easing-property > label").click();
    await expect(
      page.locator('dialog[is="fig-popup-easing"]'),
    ).toHaveAttribute("open", /^(|true)$/);
    const easingPopupGeometry = await page
      .locator('dialog[is="fig-popup-easing"]')
      .evaluate((popup: any) => {
        const property = document.querySelector("#activate-easing-property")!;
        return {
          anchorIsProperty: popup.anchor === property,
          offset: popup.getAttribute("offset"),
          popupWidth: popup.getBoundingClientRect().width,
          propertyWidth: property.getBoundingClientRect().width,
        };
      });
    expect(easingPopupGeometry).toEqual({
      anchorIsProperty: true,
      offset: "0 0",
      popupWidth: easingPopupGeometry.propertyWidth,
      propertyWidth: 240,
    });
  });

  test('activation="row" keeps the slotted input at its natural width', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="natural-property"
          label="Rotation"
          activation="row"
          style="width: 360px"
        >
          <fig-input-number
            id="natural-input"
            slot="input"
            value="45"
            units="°"
            steppers="true"
            full
          ></fig-input-number>
        </fig-property>
      `;
    });

    const result = await page.locator("#natural-property").evaluate((property) => {
      const input = property.querySelector("#natural-input");
      const label = property.querySelector(":scope > label");
      if (!input || !label) throw new Error("Missing natural-width property parts");
      const nativeInput = input.querySelector("input");
      if (!nativeInput) throw new Error("Missing native number input");
      const propertyRect = property.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const nativeInputRect = nativeInput.getBoundingClientRect();
      return {
        inputIsContentSized: inputRect.width < 100,
        inputIsInsetFromRight: inputRect.right < propertyRect.right,
        justifySelf: getComputedStyle(input).justifySelf,
        labelIsContentSized:
          labelRect.width < propertyRect.width - inputRect.width,
        nativeInputIsContentSized: nativeInputRect.width < 80,
      };
    });

    expect(result).toEqual({
      inputIsContentSized: true,
      inputIsInsetFromRight: true,
      justifySelf: "end",
      labelIsContentSized: true,
      nativeInputIsContentSized: true,
    });
  });

  test('activation="row" content-sizes labels until they reach the input', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="short-label-property"
          label="X"
          activation="row"
          style="width: 240px"
        >
          <fig-input-number slot="input" value="45" units="°"></fig-input-number>
        </fig-property>
        <fig-property
          id="long-label-property"
          label="A very long property label that must stop before the input"
          activation="row"
          style="width: 240px"
        >
          <fig-input-number slot="input" value="45" units="°"></fig-input-number>
        </fig-property>
      `;
    });

    const result = await page.evaluate(() => {
      const read = (id: string) => {
        const property = document.querySelector(id)!;
        const label = property.querySelector(":scope > label")!;
        const input = property.querySelector(':scope > [slot="input"]')!;
        const labelRect = label.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        return {
          labelWidth: labelRect.width,
          stopsBeforeInput: labelRect.right <= inputRect.left,
          truncated: label.scrollWidth > label.clientWidth,
        };
      };
      return {
        short: read("#short-label-property"),
        long: read("#long-label-property"),
      };
    });

    expect(result.short.labelWidth).toBeLessThan(20);
    expect(result.short.truncated).toBe(false);
    expect(result.long.labelWidth).toBeGreaterThan(result.short.labelWidth);
    expect(result.long.stopsBeforeInput).toBe(true);
    expect(result.long.truncated).toBe(true);
  });

  test('activation="row" content-sizes fig-input-text', async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="text-property"
          label="Name"
          activation="row"
          style="width: 360px"
        >
          <fig-input-text
            id="text-input"
            slot="input"
            value="Hello"
            full
          ></fig-input-text>
        </fig-property>
      `;
    });

    const result = await page.locator("#text-property").evaluate((property) => {
      const input = property.querySelector("#text-input");
      const nativeInput = input?.querySelector("input");
      if (!input || !nativeInput) throw new Error("Missing text input");
      return {
        hostIsContentSized: input.getBoundingClientRect().width < 100,
        nativeInputIsContentSized:
          nativeInput.getBoundingClientRect().width < 100,
        justifySelf: getComputedStyle(input).justifySelf,
      };
    });

    expect(result).toEqual({
      hostIsContentSized: true,
      nativeInputIsContentSized: true,
      justifySelf: "end",
    });
  });

  test('activation="row" pins fig-input-slider to the row surface inset', async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-input-slider.css" });
    await page.addScriptTag({ type: "module", url: "/fig-input-slider.js" });
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-slider");
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="slider-property"
          label="Amount"
          activation="row"
          style="width: 240px"
        >
          <fig-input-slider
            id="row-input-slider"
            slot="input"
            value="50"
          ></fig-input-slider>
        </fig-property>
      `;
    });

    const geometry = await page.locator("#slider-property").evaluate((property) => {
      const slider = property.querySelector("#row-input-slider");
      const label = property.querySelector(":scope > label");
      if (!slider || !label) throw new Error("Missing slider property parts");
      const propertyRect = property.getBoundingClientRect();
      const sliderRect = slider.getBoundingClientRect();
      const rowSurfaceStyle = getComputedStyle(property, "::before");
      return {
        actualInsets: {
          top: sliderRect.top - propertyRect.top,
          right: propertyRect.right - sliderRect.right,
          bottom: propertyRect.bottom - sliderRect.bottom,
          left: sliderRect.left - propertyRect.left,
        },
        rowSurfaceInsets: {
          top: Number.parseFloat(rowSurfaceStyle.top),
          right: Number.parseFloat(rowSurfaceStyle.right),
          bottom: Number.parseFloat(rowSurfaceStyle.bottom),
          left: Number.parseFloat(rowSurfaceStyle.left),
        },
        labelZIndex: getComputedStyle(label).zIndex,
        sliderZIndex: getComputedStyle(slider).zIndex,
      };
    });

    for (const edge of ["top", "right", "bottom", "left"] as const) {
      expect(
        Math.abs(
          geometry.actualInsets[edge] - geometry.rowSurfaceInsets[edge],
        ),
      ).toBeLessThanOrEqual(0.5);
    }
    expect(Number(geometry.labelZIndex)).toBeGreaterThan(
      Number(geometry.sliderZIndex),
    );
  });

  test('activation="row" pins every fig-input-slider variant to the row surface', async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-input-slider.css" });
    await page.addScriptTag({ type: "module", url: "/fig-input-slider.js" });
    const sliderTags = [
      "fig-input-slider-hue",
      "fig-input-slider-opacity",
      "fig-input-slider-delta",
      "fig-input-slider-stepper",
      "fig-input-slider-wheel",
    ];
    await page.evaluate(async (tags) => {
      await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = tags
        .map(
          (tag, index) => `
            <fig-property label="${tag}" activation="row" style="width: 240px">
              <${tag} id="slider-variant-${index}" slot="input" value="50"></${tag}>
            </fig-property>
          `,
        )
        .join("");
    }, sliderTags);

    const geometry = await page
      .locator("#fixture-root > fig-property")
      .evaluateAll((properties) =>
        properties.map((property) => {
          const slider = property.querySelector('[slot="input"]');
          if (!slider) throw new Error("Missing slider variant");
          return {
            position: getComputedStyle(slider).position,
            propertyWidth: property.getBoundingClientRect().width,
            sliderWidth: slider.getBoundingClientRect().width,
          };
        }),
      );

    expect(geometry).toHaveLength(sliderTags.length);
    for (const variant of geometry) {
      expect(variant.position).toBe("absolute");
      expect(variant.sliderWidth).toBeGreaterThan(
        variant.propertyWidth / 2,
      );
    }
  });

  test('activation="row" manages its label as a slider occlusion target', async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-input-slider.css" });
    await page.addScriptTag({ type: "module", url: "/fig-input-slider.js" });
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-slider");
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="occlusion-slider-property"
          label="Amount"
          activation="row"
          style="width: 240px"
        >
          <fig-input-slider
            id="occlusion-row-input-slider"
            slot="input"
            value="0"
          >
            <fig-input-number value="0"></fig-input-number>
          </fig-input-slider>
        </fig-property>
      `;
    });

    const result = await page
      .locator("#occlusion-slider-property")
      .evaluate(async (property) => {
        type Slider = HTMLElement & {
          value: number;
          occlusionTargets: Element[];
        };
        const slider = property.querySelector<Slider>(
          "#occlusion-row-input-slider",
        )!;
        const handle = slider.querySelector<HTMLElement>(
          ".fig-input-slider-handle",
        )!;
        slider.style.setProperty(
          "--fig-input-slider-handle-transition",
          "none",
        );

        slider.occlusionTargets = [];
        slider.value = 0;
        const labelOpacity = getComputedStyle(handle).opacity;
        slider.value = 100;
        const numberOpacity = getComputedStyle(handle).opacity;

        property.removeAttribute("activation");
        await Promise.resolve();
        slider.value = 0;
        const cleanedUpOpacity = getComputedStyle(handle).opacity;

        return { labelOpacity, numberOpacity, cleanedUpOpacity };
      });

    expect(result).toEqual({
      labelOpacity: "0",
      numberOpacity: "0",
      cleanedUpOpacity: "0",
    });
  });

  test("adds the row label when fig-input-slider upgrades late", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="late-slider-property"
          label="Amount"
          activation="row"
          style="width: 240px"
        >
          <fig-input-slider
            id="late-row-input-slider"
            slot="input"
            value="0"
          ></fig-input-slider>
        </fig-property>
      `;
    });
    await page.addStyleTag({ url: "/fig-input-slider.css" });
    await page.addScriptTag({
      type: "module",
      url: "/fig-input-slider.js?late-property-upgrade=1",
    });
    await page.evaluate(() => customElements.whenDefined("fig-input-slider"));

    const slider = page.locator("#late-row-input-slider");
    await slider.evaluate((element) => {
      element.style.setProperty(
        "--fig-input-slider-handle-transition",
        "none",
      );
    });
    await expect(
      slider.locator(".fig-input-slider-handle"),
    ).toHaveCSS("opacity", "0");
  });

  test('activation="row" suppresses the fig-input-slider focus outline', async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-input-slider.css" });
    await page.addScriptTag({ type: "module", url: "/fig-input-slider.js" });
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-slider");
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="focus-slider-property" label="Amount" activation="row">
          <fig-input-slider
            id="focus-row-input-slider"
            slot="input"
            value="50"
          ></fig-input-slider>
        </fig-property>
      `;
    });

    await page.locator("#focus-row-input-slider").focus();
    await page.waitForTimeout(100);
    const outlines = await page
      .locator("#focus-slider-property")
      .evaluate((property) => {
        const tray = property.querySelector(".fig-input-slider-tray");
        if (!tray) throw new Error("Missing slider tray");
        return {
          propertyBackground: getComputedStyle(
            property,
            "::before",
          ).backgroundColor,
          property: getComputedStyle(property, "::before").outlineStyle,
          sliderBackground: getComputedStyle(tray).backgroundColor,
          slider: getComputedStyle(tray).outlineStyle,
        };
      });

    expect(outlines.property).toBe("solid");
    expect(outlines.slider).toBe("none");
    expect(outlines.sliderBackground).toBe(outlines.propertyBackground);
  });

  test('activation="row" reveals the fig-input-slider tray only while interactive', async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-input-slider.css" });
    await page.addScriptTag({ type: "module", url: "/fig-input-slider.js" });
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-slider");
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property
          id="visible-slider-property"
          label="Amount"
          activation="row"
        >
          <fig-input-slider
            id="visible-row-input-slider"
            slot="input"
            value="50"
          ></fig-input-slider>
        </fig-property>
      `;
    });

    const property = page.locator("#visible-slider-property");
    const slider = page.locator("#visible-row-input-slider");
    const tray = slider.locator(".fig-input-slider-tray");
    await expect(tray).toHaveCSS("visibility", "hidden");

    await property.hover();
    await expect(tray).toHaveCSS("visibility", "visible");

    await page.mouse.move(500, 500);
    await expect(tray).toHaveCSS("visibility", "hidden");

    await slider.focus();
    await expect(tray).toHaveCSS("visibility", "visible");

    await slider.evaluate((element) => {
      element.blur();
      element.setAttribute("data-dragging", "");
    });
    await expect(tray).toHaveCSS("visibility", "visible");
  });

  test('activation="row" gives composite inputs a visible contained width', async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-input-color"),
        customElements.whenDefined("fig-input-gradient"),
        customElements.whenDefined("fig-input-palette"),
        customElements.whenDefined("fig-input-point"),
      ]);
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <div style="width: 238px">
          <fig-property label="Color" activation="row">
            <fig-input-color
              id="row-color"
              slot="input"
              value="#0D99FF"
              text="true"
              full
            ></fig-input-color>
          </fig-property>
          <fig-property label="Gradient" activation="row">
            <fig-input-gradient
              id="row-gradient"
              slot="input"
              edit="picker"
              value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}'
              full
            ></fig-input-gradient>
          </fig-property>
          <fig-property label="Palette" activation="row">
            <fig-input-palette
              id="row-palette"
              slot="input"
              edit="picker"
              value='["#0D99FF","#14AE5C","#FFCD29"]'
              full
            ></fig-input-palette>
          </fig-property>
          <fig-property label="Point" activation="row">
            <fig-input-point
              id="row-point"
              slot="input"
              x="24"
              y="16"
              units="%"
              full
            ></fig-input-point>
          </fig-property>
        </div>
      `;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });

    const result = await page.evaluate(() => {
      const visibleContent = {
        color: "#row-color > .input-combo",
        gradient: "#row-gradient :is(fig-swatch, fig-chit)",
        palette: "#row-palette > .palette-colors-inline",
        point: "#row-point > fig-button .fig-input-point-value",
      };
      return Object.fromEntries(
        Object.entries(visibleContent).map(([name, selector]) => {
          const content = document.querySelector<HTMLElement>(selector);
          const input = content?.closest<HTMLElement>('[slot="input"]');
          const property = input?.closest<HTMLElement>("fig-property");
          if (!content || !input || !property) {
            throw new Error(`Missing ${name} layout parts`);
          }
          const contentRect = content.getBoundingClientRect();
          const inputRect = input.getBoundingClientRect();
          const propertyRect = property.getBoundingClientRect();
          return [
            name,
            {
              contained:
                inputRect.left >= propertyRect.left &&
                inputRect.right <= propertyRect.right,
              contentVisible: contentRect.width > 0,
              contentWithinInput:
                contentRect.left >= inputRect.left - 1 &&
                contentRect.right <= inputRect.right + 1,
              width: Math.round(inputRect.width),
            },
          ];
        }),
      );
    });

    for (const layout of Object.values(result)) {
      expect(layout).toMatchObject({
        contained: true,
        contentVisible: true,
        contentWithinInput: true,
      });
      expect(layout.width).toBeGreaterThan(0);
      expect(layout.width).toBeLessThanOrEqual(128);
    }
  });

  test('activation="row" keeps audio file hover stable and reveals its waveform', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <div style="width:238px">
          <fig-property label="Audio" activation="row">
            <fig-input-file
              id="row-audio-file"
              slot="input"
              accepts="audio/*"
              preview
              url="/audio/skrillex-ft-elliphant.mp3"
              filename="skrillex-ft-elliphant.mp3"
              full>
            </fig-input-file>
          </fig-property>
        </div>
      `;
    });

    const property = page.locator('fig-property[label="Audio"]');
    const file = page.locator("#row-audio-file");
    const waveform = file.locator(".fig-input-file-audio-waveform");
    const beforeWidth = await file.evaluate(
      (element) => element.getBoundingClientRect().width,
    );
    await property.hover();
    await expect(waveform).toBeVisible();
    await expect
      .poll(() =>
        waveform.evaluate((element) => element.getBoundingClientRect().width),
      )
      .toBeGreaterThan(0);
    await page.waitForTimeout(250);
    await expect(waveform).toBeVisible();
    expect(
      await file.evaluate((element) => element.getBoundingClientRect().width),
    ).toBe(beforeWidth);
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

  test("keeps the drag handle aligned to the label height", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-property id="tall-property" label="Description" leading="drag" show-leading>
          <div slot="input" style="height: 80px"></div>
        </fig-property>
      `;
    });

    const dimensions = await page.locator("#tall-property").evaluate((property) => {
      const handle = property.querySelector<HTMLElement>('[slot="leading"]');
      const label = property.querySelector<HTMLElement>("label");
      if (!handle || !label) throw new Error("Missing property label");
      const handleRect = handle.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      return {
        handleHeight: handleRect.height,
        handleTop: handleRect.top,
        labelHeight: labelRect.height,
        labelTop: labelRect.top,
      };
    });

    expect(dimensions.handleHeight).toBe(dimensions.labelHeight);
    expect(dimensions.handleTop).toBe(dimensions.labelTop);
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

test("is registered by Core and reused by the editor bundle", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  const coreConstructor = await page.evaluate(
    () => customElements.get("fig-property")?.name,
  );
  expect(coreConstructor).toBe("FigProperty");
  expect(
    await page.evaluate(async () => {
      const standalone = await import(
        "/fig-property.js?core-registration-assertion"
      );
      return standalone.FigProperty === customElements.get("fig-property");
    }),
  ).toBe(true);
  await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
  await page.evaluate(() => customElements.whenDefined("fig-property"));
  expect(
    await page.evaluate(() => customElements.get("fig-property")?.name),
  ).toBe(coreConstructor);
});
