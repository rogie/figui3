import { expect, test } from "@playwright/test";
import { componentContracts } from "../../playground/src/testing/componentManifest";
import {
  bootFigFixture,
  collectPageErrors,
  getContractElementCount,
  mountContract,
  runAttributeContract,
  runEventContract,
  runPropertyContract,
  waitForComponentDefinitions,
} from "./helpers";

test.describe("fig.js component contracts", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await waitForComponentDefinitions(page, componentContracts);
  });

  test("registers every component in the manifest", async ({ page }) => {
    const missing = await page.evaluate((tags) => {
      return tags.filter((tag) => !customElements.get(tag));
    }, componentContracts.map((contract) => contract.tag));

    expect(missing).toEqual([]);
  });

  for (const contract of componentContracts) {
    test(`${contract.tag}: mounts without runtime errors`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await mountContract(page, contract);

      await expect
        .poll(async () => getContractElementCount(page, contract), {
          message: `${contract.tag} fixture should create its target element`,
        })
        .toBeGreaterThan(0);

      expect(errors.pageErrors, `${contract.tag} page errors`).toEqual([]);
      expect(errors.consoleErrors, `${contract.tag} console errors`).toEqual([]);
    });

    for (const attribute of contract.attributes ?? []) {
      test(`${contract.tag}: ${attribute.name} attribute`, async ({ page }) => {
        await mountContract(page, contract);
        const actual = await runAttributeContract(
          page,
          contract,
          attribute.attribute,
          attribute.value,
        );

        expect(actual).toBe(attribute.expected ?? attribute.value);
      });
    }

    for (const property of contract.properties ?? []) {
      test(`${contract.tag}: ${property.name}`, async ({ page }) => {
        await mountContract(page, contract);
        const actual = await runPropertyContract(
          page,
          contract,
          property.property,
          property.value,
        );

        if (typeof property.expected === "boolean") {
          expect(Boolean(actual)).toBe(property.expected);
        } else {
          expect(String(actual)).toBe(String(property.expected));
        }
      });
    }

    for (const eventContract of contract.events ?? []) {
      test(`${contract.tag}: ${eventContract.name}`, async ({ page }) => {
        await mountContract(page, contract);
        const events = await runEventContract(page, contract, eventContract);

        expect(events.length).toBeGreaterThan(0);
        const last = events[events.length - 1];
        expect(last.type).toBe(eventContract.event);
        if ("expectedDetail" in eventContract) {
          expect(last.detail).toEqual(eventContract.expectedDetail);
        }
      });
    }
  }
});

test.describe("joystick axis labels", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-joystick");
    });
  });

  test("accepts space and comma-delimited axis-labels", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-joystick id="space-labels" axis-labels="X Y"></fig-joystick>
        <fig-joystick id="comma-labels" axis-labels="X,Y"></fig-joystick>
        <fig-joystick id="comma-four-labels" axis-labels="Left, Right, Top, Bottom"></fig-joystick>
      `;
    });

    const labelsFor = (selector: string) =>
      page.locator(selector).evaluate((host) => {
        const labelText = (position: string) =>
          host
            .querySelector(`.fig-joystick-axis-label.${position}`)
            ?.textContent?.trim() ?? "";

        return {
          left: labelText("left"),
          right: labelText("right"),
          top: labelText("top"),
          bottom: labelText("bottom"),
          leftNoRotate:
            host
              .querySelector(".fig-joystick-axis-label.left")
              ?.classList.contains("no-rotate") ?? false,
        };
      });

    await expect.poll(() => labelsFor("#space-labels")).toEqual({
      left: "X",
      right: "",
      top: "",
      bottom: "Y",
      leftNoRotate: true,
    });
    await expect.poll(() => labelsFor("#comma-labels")).toEqual({
      left: "X",
      right: "",
      top: "",
      bottom: "Y",
      leftNoRotate: true,
    });
    await expect.poll(() => labelsFor("#comma-four-labels")).toEqual({
      left: "Left",
      right: "Right",
      top: "Top",
      bottom: "Bottom",
      leftNoRotate: false,
    });
  });
});

test.describe("button accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-button");
    });
  });

  test("toggle buttons sync aria-pressed and ignore disabled clicks", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="toggle" type="toggle">Toggle</fig-button>
        <fig-button id="disabled-toggle" type="toggle" disabled>Disabled</fig-button>
      `;
    });
    await page.waitForTimeout(50);

    const getState = (selector: string) =>
      page.locator(selector).evaluate((host) => {
        const button = host.shadowRoot?.querySelector("button");
        return {
          hostPressed: host.getAttribute("aria-pressed"),
          buttonPressed: button?.getAttribute("aria-pressed"),
          selected: host.getAttribute("selected"),
        };
      });

    await expect.poll(() => getState("#toggle")).toEqual({
      hostPressed: "false",
      buttonPressed: "false",
      selected: null,
    });

    await page.locator("#toggle").evaluate((host) => {
      host.shadowRoot?.querySelector("button")?.click();
    });
    await expect.poll(() => getState("#toggle")).toEqual({
      hostPressed: "true",
      buttonPressed: "true",
      selected: "",
    });

    await expect.poll(() => getState("#disabled-toggle")).toEqual({
      hostPressed: "false",
      buttonPressed: "false",
      selected: null,
    });
    await page.locator("#disabled-toggle").evaluate((host) => {
      host.shadowRoot?.querySelector("button")?.click();
    });
    await expect.poll(() => getState("#disabled-toggle")).toEqual({
      hostPressed: "false",
      buttonPressed: "false",
      selected: null,
    });
  });
});

test.describe("selection control accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-checkbox"),
        customElements.whenDefined("fig-radio"),
        customElements.whenDefined("fig-switch"),
      ]);
    });
  });

  test("checkbox, radio, and switch sync aria-checked on initial and dynamic state", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-checkbox id="checked" checked label="Checked"></fig-checkbox>
        <fig-checkbox id="mixed" indeterminate label="Mixed"></fig-checkbox>
        <fig-radio id="radio" checked label="Radio"></fig-radio>
        <fig-switch id="switch" checked label="Switch"></fig-switch>
        <fig-checkbox id="disabled-toggle" label="Disabled"></fig-checkbox>
      `;
    });
    await page.waitForTimeout(50);

    const inputState = (selector: string) =>
      page.locator(selector).evaluate((host) => {
        const input = host.querySelector("input");
        return {
          ariaChecked: input?.getAttribute("aria-checked"),
          disabled: input?.disabled,
          indeterminate: (input as HTMLInputElement | null)?.indeterminate,
          role: input?.getAttribute("role"),
        };
      });

    await expect.poll(() => inputState("#checked")).toEqual({
      ariaChecked: "true",
      disabled: false,
      indeterminate: false,
      role: null,
    });
    await expect.poll(() => inputState("#mixed")).toEqual({
      ariaChecked: "mixed",
      disabled: false,
      indeterminate: true,
      role: null,
    });
    await expect.poll(() => inputState("#radio")).toEqual({
      ariaChecked: "true",
      disabled: false,
      indeterminate: false,
      role: null,
    });
    await expect.poll(() => inputState("#switch")).toEqual({
      ariaChecked: "true",
      disabled: false,
      indeterminate: false,
      role: "switch",
    });

    await page.locator("#mixed").evaluate((host) => host.setAttribute("checked", ""));
    await expect.poll(() => inputState("#mixed")).toEqual({
      ariaChecked: "true",
      disabled: false,
      indeterminate: false,
      role: null,
    });

    await page
      .locator("#disabled-toggle")
      .evaluate((host) => host.setAttribute("disabled", ""));
    await expect.poll(() => inputState("#disabled-toggle")).toEqual({
      ariaChecked: "false",
      disabled: true,
      indeterminate: false,
      role: null,
    });
  });
});

test.describe("text input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-text");
    });
  });

  test("fig-input-text forwards ARIA names and state to native controls", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="hint">Helpful hint</p>
        <span id="message-label">Message</span>
        <fig-input-text
          id="named-input"
          aria-label="Project name"
          aria-describedby="hint"
          aria-invalid="true"
        ></fig-input-text>
        <fig-input-text
          id="named-textarea"
          multiline
          aria-labelledby="message-label"
        ></fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    const nativeAttrs = (selector: string) =>
      page.locator(selector).evaluate((host) => {
        const input = host.querySelector("input,textarea");
        return {
          ariaLabel: input?.getAttribute("aria-label"),
          ariaLabelledBy: input?.getAttribute("aria-labelledby"),
          ariaDescribedBy: input?.getAttribute("aria-describedby"),
          ariaInvalid: input?.getAttribute("aria-invalid"),
        };
      });

    await expect.poll(() => nativeAttrs("#named-input")).toEqual({
      ariaLabel: "Project name",
      ariaLabelledBy: null,
      ariaDescribedBy: "hint",
      ariaInvalid: "true",
    });
    await expect.poll(() => nativeAttrs("#named-textarea")).toEqual({
      ariaLabel: null,
      ariaLabelledBy: "message-label",
      ariaDescribedBy: null,
      ariaInvalid: null,
    });

    await page.locator("#named-input").evaluate((host) => {
      host.setAttribute("aria-label", "Renamed project");
      host.removeAttribute("aria-invalid");
    });
    await expect.poll(() => nativeAttrs("#named-input")).toEqual({
      ariaLabel: "Renamed project",
      ariaLabelledBy: null,
      ariaDescribedBy: "hint",
      ariaInvalid: null,
    });
  });
});

test.describe("number input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-number");
    });
  });

  test("fig-input-number exposes spinbutton semantics and forwarded names", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="number-hint">Use arrow keys to adjust.</p>
        <fig-input-number
          id="number"
          value="50"
          min="0"
          max="100"
          units="%"
          aria-label="Opacity"
          aria-describedby="number-hint"
          aria-required="true"
        ></fig-input-number>
      `;
    });
    await page.waitForTimeout(50);

    const nativeAttrs = () =>
      page.locator("#number").evaluate((host) => {
        const input = host.querySelector("input");
        return {
          role: input?.getAttribute("role"),
          ariaLabel: input?.getAttribute("aria-label"),
          ariaDescribedBy: input?.getAttribute("aria-describedby"),
          ariaRequired: input?.getAttribute("aria-required"),
          ariaValueMin: input?.getAttribute("aria-valuemin"),
          ariaValueMax: input?.getAttribute("aria-valuemax"),
          ariaValueNow: input?.getAttribute("aria-valuenow"),
          ariaValueText: input?.getAttribute("aria-valuetext"),
        };
      });

    await expect.poll(nativeAttrs).toEqual({
      role: "spinbutton",
      ariaLabel: "Opacity",
      ariaDescribedBy: "number-hint",
      ariaRequired: "true",
      ariaValueMin: "0",
      ariaValueMax: "100",
      ariaValueNow: "50",
      ariaValueText: "50%",
    });

    await page.locator("#number").evaluate((host) => {
      host.setAttribute("value", "75");
      host.setAttribute("aria-label", "Layer opacity");
      host.removeAttribute("max");
    });
    await expect.poll(nativeAttrs).toEqual({
      role: "spinbutton",
      ariaLabel: "Layer opacity",
      ariaDescribedBy: "number-hint",
      ariaRequired: "true",
      ariaValueMin: "0",
      ariaValueMax: null,
      ariaValueNow: "75",
      ariaValueText: "75%",
    });
  });
});

test.describe("field accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-field"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-image"),
      ]);
    });
  });

  test("fig-field associates labels with inner native controls or composite hosts", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-field id="text-field">
          <label>Name</label>
          <fig-input-text></fig-input-text>
        </fig-field>
        <fig-field id="image-field">
          <label>Preview</label>
          <fig-image alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="></fig-image>
        </fig-field>
      `;
    });
    await page.waitForTimeout(100);

    const textAssociation = await page.locator("#text-field").evaluate((field) => {
      const label = field.querySelector("label");
      const input = field.querySelector("fig-input-text input");
      return {
        labelId: label?.id || null,
        labelFor: label?.getAttribute("for"),
        inputId: input?.id || null,
        inputLabelledBy: input?.getAttribute("aria-labelledby"),
      };
    });

    expect(textAssociation.labelId).toBeTruthy();
    expect(textAssociation.inputId).toBeTruthy();
    expect(textAssociation.labelFor).toBe(textAssociation.inputId);
    expect(textAssociation.inputLabelledBy).toBe(textAssociation.labelId);

    const imageAssociation = await page.locator("#image-field").evaluate((field) => {
      const label = field.querySelector("label");
      const input = field.querySelector("fig-image");
      return {
        labelId: label?.id || null,
        labelFor: label?.getAttribute("for"),
        hostLabelledBy: input?.getAttribute("aria-labelledby"),
      };
    });

    expect(imageAssociation.labelId).toBeTruthy();
    expect(imageAssociation.labelFor).toBeNull();
    expect(imageAssociation.hostLabelledBy).toBe(imageAssociation.labelId);
  });
});

test.describe("slider accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-slider"),
        customElements.whenDefined("fig-input-number"),
      ]);
    });
  });

  test("fig-slider labels the keyboard-operable control", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider id="text-slider" value="50" min="0" max="100" units="%" aria-label="Opacity"></fig-slider>
        <fig-slider id="range-slider" text="false" value="12" min="0" max="24" aria-label="Frames"></fig-slider>
      `;
    });
    await page.waitForTimeout(100);

    const textSliderState = await page.locator("#text-slider").evaluate((host) => {
      const range = host.querySelector('input[type="range"]');
      const number = host.querySelector("fig-input-number input");
      return {
        rangeHidden: range?.getAttribute("aria-hidden"),
        rangeLabel: range?.getAttribute("aria-label"),
        numberLabel: number?.getAttribute("aria-label"),
        numberRole: number?.getAttribute("role"),
        numberValueText: number?.getAttribute("aria-valuetext"),
      };
    });

    expect(textSliderState).toEqual({
      rangeHidden: "true",
      rangeLabel: null,
      numberLabel: "Opacity",
      numberRole: "spinbutton",
      numberValueText: "50%",
    });

    await page.locator("#text-slider").evaluate((host) => {
      host.focus();
    });
    await expect
      .poll(() =>
        page.locator("#text-slider").evaluate((host) => {
          return host.querySelector("fig-input-number input") === document.activeElement;
        }),
      )
      .toBe(true);

    const rangeSliderState = await page.locator("#range-slider").evaluate((host) => {
      const range = host.querySelector('input[type="range"]');
      return {
        rangeHidden: range?.getAttribute("aria-hidden"),
        rangeLabel: range?.getAttribute("aria-label"),
        rangeValueNow: range?.getAttribute("aria-valuenow"),
      };
    });

    expect(rangeSliderState).toEqual({
      rangeHidden: null,
      rangeLabel: "Frames",
      rangeValueNow: "12",
    });
  });
});

test.describe("color input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-input-color"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-input-number"),
      ]);
    });
  });

  test("fig-input-color labels generated hex and opacity controls", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="color-hint">Use hex and opacity values.</p>
        <fig-input-color
          id="color"
          value="#0D99FF"
          aria-label="Fill"
          aria-describedby="color-hint"
          aria-required="true"
        ></fig-input-color>
      `;
    });
    await page.waitForTimeout(150);

    const state = () =>
      page.locator("#color").evaluate((host) => {
        const hex = host.querySelector("fig-input-text input");
        const alpha = host.querySelector("fig-input-number input");
        return {
          role: host.getAttribute("role"),
          hostDisabled: host.getAttribute("aria-disabled"),
          hexLabel: hex?.getAttribute("aria-label"),
          hexDescribedBy: hex?.getAttribute("aria-describedby"),
          hexRequired: hex?.getAttribute("aria-required"),
          alphaLabel: alpha?.getAttribute("aria-label"),
          alphaDescribedBy: alpha?.getAttribute("aria-describedby"),
          alphaRequired: alpha?.getAttribute("aria-required"),
          alphaValueText: alpha?.getAttribute("aria-valuetext"),
          hexDisabled: (hex as HTMLInputElement | null)?.disabled,
          alphaDisabled: (alpha as HTMLInputElement | null)?.disabled,
        };
      });

    await expect.poll(state).toEqual({
      role: "group",
      hostDisabled: null,
      hexLabel: "Fill hex color",
      hexDescribedBy: "color-hint",
      hexRequired: "true",
      alphaLabel: "Fill opacity",
      alphaDescribedBy: "color-hint",
      alphaRequired: "true",
      alphaValueText: "100%",
      hexDisabled: false,
      alphaDisabled: false,
    });

    await page.locator("#color").evaluate((host) => {
      host.setAttribute("aria-label", "Stroke");
      host.setAttribute("disabled", "");
    });

    await expect.poll(state).toEqual({
      role: "group",
      hostDisabled: "true",
      hexLabel: "Stroke hex color",
      hexDescribedBy: "color-hint",
      hexRequired: "true",
      alphaLabel: "Stroke opacity",
      alphaDescribedBy: "color-hint",
      alphaRequired: "true",
      alphaValueText: "100%",
      hexDisabled: true,
      alphaDisabled: true,
    });
  });
});

test.describe("remaining accessibility contracts", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-tabs"),
        customElements.whenDefined("fig-segmented-control"),
        customElements.whenDefined("fig-menu"),
        customElements.whenDefined("fig-input-fill"),
        customElements.whenDefined("fig-spinner"),
        customElements.whenDefined("fig-shimmer"),
        customElements.whenDefined("fig-handle"),
        customElements.whenDefined("fig-color-tip"),
        customElements.whenDefined("fig-layer"),
        customElements.whenDefined("fig-toast"),
      ]);
    });
  });

  test("tabs and segmented controls expose roving selection semantics", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tabs value="one">
          <fig-tab value="one" content="#panel-one" selected>One</fig-tab>
          <fig-tab value="two" content="#panel-two">Two</fig-tab>
        </fig-tabs>
        <section id="panel-one">One panel</section>
        <section id="panel-two">Two panel</section>
        <fig-segmented-control value="left">
          <fig-segment value="left">Left</fig-segment>
          <fig-segment value="right">Right</fig-segment>
        </fig-segmented-control>
      `;
    });
    await page.waitForTimeout(100);

    await expect(page.locator('fig-tab[value="one"]')).toHaveAttribute("tabindex", "0");
    await expect(page.locator('fig-tab[value="two"]')).toHaveAttribute("tabindex", "-1");
    await expect(page.locator("#panel-one")).toHaveAttribute("role", "tabpanel");
    await expect(page.locator('fig-segment[value="left"]')).toHaveAttribute("role", "radio");
    await expect(page.locator('fig-segment[value="left"]')).toHaveAttribute("aria-checked", "true");

    await page.locator('fig-segment[value="left"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('fig-segment[value="right"]')).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('fig-segment[value="right"]')).toBeFocused();
  });

  test("menu trigger and items support keyboard menu semantics", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-menu id="menu">
          <fig-button fig-menu-trigger>Actions</fig-button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
          <fig-menu-item value="paste">Paste</fig-menu-item>
        </fig-menu>
      `;
    });
    await page.waitForTimeout(50);

    const trigger = page.locator("fig-button[fig-menu-trigger]");
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('fig-menu-item[value="copy"]')).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('fig-menu-item[value="paste"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("fill, loading, handle, color-tip, and toast expose accessible state", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="fill-help">Use fill controls.</p>
        <fig-input-fill aria-label="Layer fill" aria-describedby="fill-help" value="#0D99FF"></fig-input-fill>
        <fig-spinner></fig-spinner>
        <fig-shimmer aria-label="Loading rows"><p>Placeholder</p></fig-shimmer>
        <fig-handle type="color" color="#0D99FF"></fig-handle>
        <fig-color-tip control="add"></fig-color-tip>
        <fig-layer open="false" visible="false">
          <div class="fig-layer-row"><label>Layer</label></div>
        </fig-layer>
        <dialog is="fig-toast">Saved</dialog>
      `;
    });
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => {
      const fill = document.querySelector("fig-input-fill");
      const fillPicker = fill?.querySelector("fig-fill-picker");
      const hex = fill?.querySelector("fig-input-text input");
      const opacity = fill?.querySelector("fig-input-number input");
      const handle = document.querySelector("fig-handle");
      const colorTipButton = document.querySelector("fig-color-tip fig-button");
      const layer = document.querySelector("fig-layer");
      const layerChevron = layer?.querySelector(".fig-layer-chevron");
      const toast = document.querySelector('dialog[is="fig-toast"]');
      return {
        fillRole: fill?.getAttribute("role"),
        fillPickerLabel: fillPicker?.getAttribute("aria-label"),
        hexLabel: hex?.getAttribute("aria-label"),
        opacityLabel: opacity?.getAttribute("aria-label"),
        spinnerRole: document.querySelector("fig-spinner")?.getAttribute("role"),
        spinnerLabel: document.querySelector("fig-spinner")?.getAttribute("aria-label"),
        shimmerRole: document.querySelector("fig-shimmer")?.getAttribute("role"),
        shimmerBusy: document.querySelector("fig-shimmer")?.getAttribute("aria-busy"),
        handleRole: handle?.getAttribute("role"),
        handleLabel: handle?.getAttribute("aria-label"),
        colorTipLabel: colorTipButton?.getAttribute("aria-label"),
        layerRole: layer?.getAttribute("role"),
        layerExpanded: layer?.getAttribute("aria-expanded"),
        layerHidden: layer?.getAttribute("aria-hidden"),
        layerChevronRole: layerChevron?.getAttribute("role"),
        layerChevronLabel: layerChevron?.getAttribute("aria-label"),
        toastRole: toast?.getAttribute("role"),
        toastLive: toast?.getAttribute("aria-live"),
      };
    });

    expect(state).toEqual({
      fillRole: "group",
      fillPickerLabel: "Layer fill picker",
      hexLabel: "Layer fill hex color",
      opacityLabel: "Layer fill opacity",
      spinnerRole: "status",
      spinnerLabel: "Loading",
      shimmerRole: "status",
      shimmerBusy: "true",
      handleRole: "button",
      handleLabel: "Color handle",
      colorTipLabel: "Add color stop",
      layerRole: "treeitem",
      layerExpanded: "false",
      layerHidden: "true",
      layerChevronRole: "button",
      layerChevronLabel: "Expand layer",
      toastRole: "status",
      toastLive: "polite",
    });
  });
});

test.describe("media accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-button"),
        customElements.whenDefined("fig-image"),
        customElements.whenDefined("fig-media"),
        customElements.whenDefined("fig-media-controls"),
        customElements.whenDefined("fig-slider"),
        customElements.whenDefined("fig-input-file"),
      ]);
    });
  });

  test("fig-image forwards host alt to generated and slotted images", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image id="generated-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Generated preview"></fig-image>
        <fig-image id="slotted-image" alt="Slotted preview">
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="">
        </fig-image>
      `;
    });
    await page.waitForTimeout(50);

    await expect(page.locator("#generated-image img")).toHaveAttribute(
      "alt",
      "Generated preview",
    );
    await expect(page.locator("#slotted-image img")).toHaveAttribute(
      "alt",
      "Slotted preview",
    );

    await page.locator("#slotted-image").evaluate((element) => {
      element.setAttribute("alt", "Updated slotted preview");
    });
    await expect(page.locator("#slotted-image img")).toHaveAttribute(
      "alt",
      "Updated slotted preview",
    );
  });

  test("fig-media forwards video labels and creates named controls", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-media
          type="video"
          src="data:video/mp4;base64,"
          aria-label="Clip preview"
          title="Clip title"
          controls
        ></fig-media>
      `;
    });
    await expect(page.locator("fig-media video")).toHaveAttribute(
      "aria-label",
      "Clip preview",
    );
    await expect(page.locator("fig-media video")).toHaveAttribute("title", "Clip title");
    await expect(page.locator("fig-media > fig-preview > video")).toHaveCount(1);
    await expect(page.locator("fig-media > fig-media-controls")).toHaveCount(1);
    await expect(page.locator("fig-media > fig-media-controls")).not.toHaveAttribute(
      "overlay",
      "",
    );
    await expect(page.locator("fig-media-controls")).toHaveAttribute("role", "group");
    await expect(page.locator("fig-media-controls")).toHaveAttribute(
      "aria-label",
      "Media controls",
    );
  });

  test("fig-media-controls names the seek slider with formatted value text", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-media-controls duration="90" time="12.3"></fig-media-controls>`;
    });
    await page.waitForTimeout(50);

    const state = await page.locator("fig-media-controls").evaluate((host) => {
      const slider = host.querySelector("fig-slider");
      const input = slider?.querySelector('input[type="range"]');
      const time = host.querySelector(".fig-media-controls-time");
      return {
        hostRole: host.getAttribute("role"),
        hostLabel: host.getAttribute("aria-label"),
        sliderLabel: input?.getAttribute("aria-label"),
        sliderValueText: input?.getAttribute("aria-valuetext"),
        timeTag: time?.tagName,
        timeText: time?.textContent,
      };
    });

    expect(state).toEqual({
      hostRole: "group",
      hostLabel: "Media controls",
      sliderLabel: "Seek",
      sliderValueText: "00:12 of 01:30",
      timeTag: "SPAN",
      timeText: "00:12",
    });

    await page.locator("fig-media-controls").evaluate((host) => {
      host.setAttribute("duration", "120");
      host.setAttribute("time", "30");
    });
    await expect
      .poll(() =>
        page.locator("fig-media-controls fig-slider input").evaluate((input) =>
          input.getAttribute("aria-valuetext"),
        ),
      )
      .toBe("00:30 of 02:00");
  });

  test("fig-button and file clear controls expose icon-only button names", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="icon-button" icon aria-label="Rotate">
          <fig-icon name="rotate"></fig-icon>
        </fig-button>
        <fig-input-file variant="overlay" filename="asset.png"></fig-input-file>
      `;
    });
    await page.waitForTimeout(50);

    const labels = await page.evaluate(() => {
      const iconButton = document.querySelector("#icon-button");
      const nativeIconButton = iconButton?.shadowRoot?.querySelector("button");
      const clearButton = document.querySelector("fig-input-file .fig-input-file-clear");
      const nativeClearButton = clearButton?.shadowRoot?.querySelector("button");
      return {
        icon: nativeIconButton?.getAttribute("aria-label"),
        clear: nativeClearButton?.getAttribute("aria-label"),
      };
    });

    expect(labels).toEqual({ icon: "Rotate", clear: "Remove" });
  });

  test("loaded media upload overlay remains visible on keyboard focus", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image
          upload
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          alt="Uploaded image preview"
        ></fig-image>
      `;
    });
    await page.waitForTimeout(50);

    const opacityBeforeFocus = await page
      .locator("fig-image > fig-preview > fig-input-file[data-generated]")
      .evaluate((element) => getComputedStyle(element).opacity);
    expect(opacityBeforeFocus).toBe("0");

    await page.locator("fig-image fig-input-file input[type=file]").focus();
    await expect
      .poll(() =>
        page
          .locator("fig-image > fig-preview > fig-input-file[data-generated]")
          .evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("1");
  });
});
