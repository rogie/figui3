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

test.describe("dropdown keyboard behavior", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-dropdown");
    });
  });

  test("opens the native picker when Enter is pressed on the focused select", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-dropdown label="Residence type">
          <option>House</option>
          <option>Apartment</option>
        </fig-dropdown>
      `;
      const select = root.querySelector("fig-dropdown select");
      if (!select) throw new Error("Missing generated select");
      (select as HTMLSelectElement & { showPicker?: () => void }).showPicker = () => {
        select.setAttribute("data-show-picker-called", "true");
      };
    });

    await page.locator("fig-dropdown select").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("fig-dropdown select")).toHaveAttribute(
      "data-show-picker-called",
      "true",
    );
  });

  test("opens modern dropdown on Enter and lets open picker commit selection", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-dropdown experimental="modern" label="Residence type">
          <option>House</option>
          <option>Apartment</option>
        </fig-dropdown>
      `;
    });
    await page.waitForTimeout(100);

    const closedState = await page.locator("fig-dropdown select").evaluate((select) => {
      (select as HTMLSelectElement & { showPicker?: () => void }).showPicker = () => {
        select.setAttribute("data-show-picker-called", "true");
      };
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      select.dispatchEvent(event);
      return {
        prevented: event.defaultPrevented,
        showPickerCalled: select.getAttribute("data-show-picker-called"),
      };
    });

    expect(closedState).toEqual({
      prevented: true,
      showPickerCalled: "true",
    });

    const openState = await page.locator("fig-dropdown select").evaluate((select) => {
      select.addEventListener(
        "keydown",
        (event) => {
          queueMicrotask(() => {
            select.setAttribute(
              "data-open-enter-prevented",
              String(event.defaultPrevented),
            );
          });
        },
        { once: true },
      );
      const originalMatches = select.matches.bind(select);
      select.matches = (selector: string) =>
        selector === ":open" ? true : originalMatches(selector);

      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      select.dispatchEvent(event);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          resolve({
            prevented: select.getAttribute("data-open-enter-prevented") === "true",
            hasSelectedContent: !!select.querySelector("selectedcontent"),
          });
        });
      });
    });

    expect(openState).toEqual({
      prevented: false,
      hasSelectedContent: true,
    });
  });

  test("fig-dropdown keeps a single select on reconnect", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-dropdown id="dropdown-reconnect" label="Residence type" value="Apartment">
          <option>House</option>
          <option value="Apartment">Apartment</option>
        </fig-dropdown>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#dropdown-reconnect").evaluate((host) => {
        const selects = host.querySelectorAll("select");
        const select = selects[0] as HTMLSelectElement | undefined;
        return {
          selectCount: selects.length,
          value: select?.value ?? null,
          optionCount: select?.options.length ?? 0,
        };
      });

    expect(await getState()).toEqual({
      selectCount: 1,
      value: "Apartment",
      optionCount: 2,
    });

    await page.evaluate(() => {
      const host = document.querySelector("#dropdown-reconnect");
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error("Missing dropdown host");
      parent.removeChild(host);
      parent.appendChild(host);
    });
    await page.waitForTimeout(50);

    expect(await getState()).toEqual({
      selectCount: 1,
      value: "Apartment",
      optionCount: 2,
    });
  });
});

test.describe("joystick axis labels", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-joystick"),
        customElements.whenDefined("fig-handle"),
      ]);
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

  test("focuses the handle and keeps focus during keyboard movement", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-joystick id="joy" style="width: 200px;"></fig-joystick>`;
    });
    await page.waitForTimeout(100);

    const plane = page.locator("#joy .fig-input-joystick-plane-container");
    const handle = page.locator("#joy fig-handle");
    await expect(plane).not.toHaveAttribute("tabindex", "0");

    await page.locator("#joy").evaluate((host: HTMLElement) => host.focus());
    await expect(handle).toBeFocused();

    const focusStyles = await page.locator("#joy").evaluate((host) => {
      const guides = host.querySelector(".fig-input-joystick-guides");
      const handle = host.querySelector("fig-handle");
      const guideStyle = guides ? getComputedStyle(guides) : null;
      const handleStyle = handle ? getComputedStyle(handle) : null;
      return {
        guideOutlineStyle: guideStyle?.outlineStyle,
        handleOutlineStyle: handleStyle?.outlineStyle,
        handleOutlineOffset: handleStyle?.outlineOffset,
      };
    });
    expect(focusStyles).toEqual({
      guideOutlineStyle: "none",
      handleOutlineStyle: "solid",
      handleOutlineOffset: "1px",
    });

    await page.keyboard.press("ArrowRight");
    await expect(handle).toBeFocused();
    await expect(page.locator("#joy")).toHaveAttribute("value", "51% 50%");
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

  test("fig-input-text shows focus outline only on the host", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text
          id="search"
          type="search"
          value="Text here"
          placeholder="Placeholder text"
        ></fig-input-text>
        <fig-input-text
          id="multiline"
          multiline
          placeholder="Type here..."
        ></fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    const focusStyles = async (hostSelector: string, controlSelector: string) => {
      await page.locator(`${hostSelector} ${controlSelector}`).focus();
      return page.locator(hostSelector).evaluate((host, controlSelector) => {
        const input = host.querySelector(controlSelector);
        const hostStyle = getComputedStyle(host);
        const inputStyle = input ? getComputedStyle(input) : null;
        return {
          hostOutlineStyle: hostStyle.outlineStyle,
          hostOutlineWidth: hostStyle.outlineWidth,
          hostOutlineOffset: hostStyle.outlineOffset,
          inputOutlineStyle: inputStyle?.outlineStyle,
          inputOutlineWidth: inputStyle?.outlineWidth,
          inputBoxShadow: inputStyle?.boxShadow,
        };
      }, controlSelector);
    };

    const searchFocusStyles = await focusStyles("#search", "input");
    expect(searchFocusStyles).toEqual({
      hostOutlineStyle: "solid",
      hostOutlineWidth: "1px",
      hostOutlineOffset: "-1px",
      inputOutlineStyle: "none",
      inputOutlineWidth: "0px",
      inputBoxShadow: "none",
    });

    const multilineFocusStyles = await focusStyles("#multiline", "textarea");
    expect(multilineFocusStyles).toEqual({
      hostOutlineStyle: "solid",
      hostOutlineWidth: "1px",
      hostOutlineOffset: "-1px",
      inputOutlineStyle: "none",
      inputOutlineWidth: "0px",
      inputBoxShadow: "none",
    });
  });

  test("fig-input-text search clear icon survives reconnect", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text
          id="search-reconnect"
          type="search"
          value="Text here"
        ></fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    const getClearIconStyle = () =>
      page
        .locator('#search-reconnect [data-generated="search-clear"] fig-icon')
        .evaluate((icon) => ({
        name: icon.getAttribute("name"),
        iconVar: icon.style.getPropertyValue("--icon"),
      }));

    expect(await getClearIconStyle()).toEqual({
      name: "close",
      iconVar: "var(--icon-16-close)",
    });

    await page.evaluate(() => {
      const host = document.querySelector("#search-reconnect");
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error("Missing search host");
      parent.removeChild(host);
      parent.appendChild(host);
    });
    await page.waitForTimeout(50);

    expect(await getClearIconStyle()).toEqual({
      name: "close",
      iconVar: "var(--icon-16-close)",
    });
  });

  test("fig-input-text password toggle icon survives reconnect", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text
          id="password-reconnect"
          type="password"
          value="secret"
        ></fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    const getToggleIcon = () =>
      page
        .locator('#password-reconnect [data-generated="password-toggle"] fig-icon')
        .evaluate((icon) => ({
          name: icon.getAttribute("name"),
          iconVar: icon.style.getPropertyValue("--icon"),
        }));

    expect(await getToggleIcon()).toEqual({
      name: "hidden",
      iconVar: "var(--icon-16-hidden)",
    });

    await page.evaluate(() => {
      const host = document.querySelector("#password-reconnect");
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error("Missing password host");
      parent.removeChild(host);
      parent.appendChild(host);
    });
    await page.waitForTimeout(50);

    expect(await getToggleIcon()).toEqual({
      name: "hidden",
      iconVar: "var(--icon-16-hidden)",
    });
  });

  test("fig-input-text keeps prepend and append visually ordered across reactive child insertion", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text id="text-slots" value="Button" style="width: 220px">
          <span id="text-append" slot="append">append</span>
        </fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    await page.locator("#text-slots").evaluate((host) => {
      const prepend = document.createElement("span");
      prepend.id = "text-prepend";
      prepend.setAttribute("slot", "prepend");
      prepend.textContent = "prepend";
      host.append(prepend);
    });
    await page.waitForTimeout(50);

    const order = await page.locator("#text-slots").evaluate((host) => {
      const prepend = host.querySelector("#text-prepend");
      const input = host.querySelector("input");
      const append = host.querySelector("#text-append");
      if (!prepend || !input || !append) throw new Error("Missing slot test nodes");
      return {
        domOrder: Array.from(host.children).map((child) => child.id || child.tagName),
        prependText: prepend.textContent,
        appendText: append.textContent,
        prependLabel: prepend.getAttribute("aria-label"),
        appendLabel: append.getAttribute("aria-label"),
        prependLeft: prepend.getBoundingClientRect().left,
        inputLeft: input.getBoundingClientRect().left,
        appendLeft: append.getBoundingClientRect().left,
      };
    });

    expect(order.domOrder).toEqual(["INPUT", "text-append", "text-prepend"]);
    expect(order.prependText).toBe("P");
    expect(order.appendText).toBe("A");
    expect(order.prependLabel).toBe("prepend");
    expect(order.appendLabel).toBe("append");
    expect(order.prependLeft).toBeLessThan(order.inputLeft);
    expect(order.inputLeft).toBeLessThan(order.appendLeft);

    await page.locator("#text-append").hover();
    await expect(page.locator('dialog[data-tooltip-managed][role="tooltip"]')).toContainText("append");
    await page.mouse.move(0, 0);

    await page.locator("#text-append").evaluate((append) => {
      append.textContent = "suffix";
    });
    await expect
      .poll(() => page.locator("#text-append").evaluate((append) => append.textContent))
      .toBe("S");
    await expect
      .poll(() => page.locator("#text-append").evaluate((append) => append.getAttribute("aria-label")))
      .toBe("suffix");
    await page.locator("#text-append").hover();
    await expect(page.locator('dialog[data-tooltip-managed][role="tooltip"]')).toContainText("suffix");
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

  test("fig-input-number keeps slots visually around the input before steppers", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-number id="number-slots" value="12" steppers style="width: 220px">
          <span id="number-append" slot="append">pixels</span>
        </fig-input-number>
      `;
    });
    await page.waitForTimeout(50);

    await page.locator("#number-slots").evaluate((host) => {
      const prepend = document.createElement("span");
      prepend.id = "number-prepend";
      prepend.setAttribute("slot", "prepend");
      prepend.textContent = "axis";
      host.append(prepend);
    });
    await page.waitForTimeout(50);

    const order = await page.locator("#number-slots").evaluate((host) => {
      const prepend = host.querySelector("#number-prepend");
      const input = host.querySelector("input");
      const append = host.querySelector("#number-append");
      const steppers = host.querySelector(".fig-steppers");
      if (!prepend || !input || !append || !steppers) {
        throw new Error("Missing number slot test nodes");
      }
      return {
        domOrder: Array.from(host.children).map((child) => child.id || child.tagName),
        prependText: prepend.textContent,
        appendText: append.textContent,
        prependLabel: prepend.getAttribute("aria-label"),
        appendLabel: append.getAttribute("aria-label"),
        prependLeft: prepend.getBoundingClientRect().left,
        inputLeft: input.getBoundingClientRect().left,
        appendLeft: append.getBoundingClientRect().left,
        steppersLeft: steppers.getBoundingClientRect().left,
      };
    });

    expect(order.domOrder).toEqual([
      "INPUT",
      "number-append",
      "SPAN",
      "number-prepend",
    ]);
    expect(order.prependText).toBe("A");
    expect(order.appendText).toBe("P");
    expect(order.prependLabel).toBe("axis");
    expect(order.appendLabel).toBe("pixels");
    expect(order.prependLeft).toBeLessThan(order.inputLeft);
    expect(order.inputLeft).toBeLessThan(order.appendLeft);
    expect(order.appendLeft).toBeLessThan(order.steppersLeft);
  });
});

test.describe("combo input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-combo-input"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-button"),
        customElements.whenDefined("fig-dropdown"),
      ]);
    });
  });

  test("forwards accessible name and state to generated controls", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="combo-help">Choose or enter a font.</p>
        <fig-combo-input
          id="combo"
          options="Inter, Roboto"
          placeholder="Font"
          aria-label="Font family"
          aria-describedby="combo-help"
          aria-required="true"
        ></fig-combo-input>
      `;
    });
    await page.waitForTimeout(100);

    const state = await page.locator("#combo").evaluate((host) => {
      const input = host.querySelector("fig-input-text input");
      const button = host.querySelector('fig-button[type="select"]');
      const dropdown = host.querySelector("fig-dropdown select");
      return {
        inputLabel: input?.getAttribute("aria-label"),
        inputDescribedBy: input?.getAttribute("aria-describedby"),
        inputRequired: input?.getAttribute("aria-required"),
        selectButtons: host.querySelectorAll('fig-button[type="select"]').length,
        nativeButtonInSelect: button?.shadowRoot?.querySelector("button") !== null,
        dropdownLabel: dropdown?.getAttribute("aria-label"),
      };
    });

    expect(state).toEqual({
      inputLabel: "Font family",
      inputDescribedBy: "combo-help",
      inputRequired: "true",
      selectButtons: 1,
      nativeButtonInSelect: false,
      dropdownLabel: "Font family options",
    });

    await page.locator("#combo fig-dropdown select").evaluate((select) => {
      const el = select as HTMLSelectElement & { showPicker?: () => void };
      el.showPicker = () => {
        el.dataset.showPickerCalled = "true";
      };
    });
    await page.locator("#combo fig-dropdown select").focus();
    await expect
      .poll(() =>
        page.locator("#combo").evaluate((host) => {
          const dropdownSelect = host.querySelector("fig-dropdown select");
          const button = host.querySelector('fig-button[type="select"]');
          return {
            selectFocused: document.activeElement === dropdownSelect,
            buttonFocused: document.activeElement === button,
          };
        }),
      )
      .toEqual({ selectFocused: true, buttonFocused: false });
    await page.keyboard.press("Enter");
    await expect(page.locator("#combo fig-dropdown select")).toHaveAttribute(
      "data-show-picker-called",
      "true",
    );

    const focusRing = await page
      .locator('#combo fig-button[type="select"]')
      .evaluate((button) => {
        const style = getComputedStyle(button);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      });
    expect(focusRing).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
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
        customElements.whenDefined("fig-popup"),
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

  test("fig-field shows a tooltip for labels inserted after connection", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-field id="dynamic-label-field" style="width: 140px;">
          <fig-input-text></fig-input-text>
        </fig-field>
      `;
    });
    await page.waitForTimeout(50);

    await page.evaluate(() => {
      const field = document.querySelector("#dynamic-label-field");
      const input = field?.querySelector("fig-input-text");
      if (!field || !input) throw new Error("Missing dynamic field");
      const label = document.createElement("label");
      label.textContent = "A very long field label that should truncate";
      field.insertBefore(label, input);
    });

    const label = page.locator("#dynamic-label-field > label");
    await expect
      .poll(() =>
        label.evaluate((node) => node.scrollWidth > node.clientWidth),
      )
      .toBe(true);

    await label.hover();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
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
        <fig-slider id="default-range" aria-label="Default range"></fig-slider>
        <fig-slider id="custom-range" min="10" max="30" aria-label="Custom range"></fig-slider>
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

    const defaultRangeState = await page.locator("#default-range").evaluate((host) => {
      const range = host.querySelector('input[type="range"]');
      const number = host.querySelector("fig-input-number input");
      return {
        hostValue: host.getAttribute("value"),
        rangeValue: (range as HTMLInputElement | null)?.value,
        rangeValueNow: range?.getAttribute("aria-valuenow"),
        numberValue: (number as HTMLInputElement | null)?.value,
      };
    });
    expect(defaultRangeState).toEqual({
      hostValue: "50",
      rangeValue: "50",
      rangeValueNow: "50",
      numberValue: "50",
    });

    const customRangeState = await page.locator("#custom-range").evaluate((host) => {
      const range = host.querySelector('input[type="range"]');
      const number = host.querySelector("fig-input-number input");
      return {
        hostValue: host.getAttribute("value"),
        rangeValue: (range as HTMLInputElement | null)?.value,
        numberValue: (number as HTMLInputElement | null)?.value,
      };
    });
    expect(customRangeState).toEqual({
      hostValue: "20",
      rangeValue: "20",
      numberValue: "20",
    });
  });

  test("fig-slider text input updates the range value", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider id="slider" value="50" min="0" max="100" aria-label="Opacity"></fig-slider>
      `;
      const slider = root.querySelector("#slider");
      slider?.addEventListener("input", (event) => {
        slider.setAttribute(
          "data-last-input",
          String((event as CustomEvent).detail),
        );
      });
    });
    await page.waitForTimeout(100);

    await page.locator("#slider fig-input-number input").fill("75");

    await expect
      .poll(() =>
        page.locator("#slider").evaluate((host) => {
          const range = host.querySelector('input[type="range"]') as HTMLInputElement | null;
          const number = host.querySelector("fig-input-number");
          const numberInput = number?.querySelector("input") as HTMLInputElement | null;
          return {
            hostValue: host.getAttribute("value"),
            rangeValue: range?.value,
            numberValue: number?.getAttribute("value"),
            numberInputValue: numberInput?.value,
            lastInput: host.getAttribute("data-last-input"),
          };
        }),
      )
      .toEqual({
        hostValue: "75",
        rangeValue: "75",
        numberValue: "75",
        numberInputValue: "75",
        lastInput: "75",
      });
  });

  test("fig-slider range supports Shift arrow key stepping", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider id="slider" text="false" value="50" min="0" max="100" step="2" aria-label="Scale"></fig-slider>
      `;
    });
    await page.waitForTimeout(100);

    await page.locator("#slider input").focus();
    await page.keyboard.press("Shift+ArrowRight");

    const state = await page.locator("#slider").evaluate((host) => {
      const range = host.querySelector('input[type="range"]') as HTMLInputElement | null;
      return {
        hostValue: host.getAttribute("value"),
        rangeValue: range?.value,
        rangeValueNow: range?.getAttribute("aria-valuenow"),
      };
    });

    expect(state).toEqual({
      hostValue: "70",
      rangeValue: "70",
      rangeValueNow: "70",
    });
  });

  test("fig-slider survives reconnect without duplicate controls", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider
          id="slider-reconnect"
          value="50"
          min="0"
          max="100"
          units="%"
          aria-label="Opacity"
        ></fig-slider>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#slider-reconnect").evaluate((host) => {
        const range = host.querySelector('input[type="range"]') as HTMLInputElement | null;
        const number = host.querySelector("fig-input-number");
        return {
          rangeCount: host.querySelectorAll('input[type="range"]').length,
          numberCount: host.querySelectorAll("fig-input-number").length,
          hostValue: host.getAttribute("value"),
          rangeValue: range?.value ?? null,
          numberValue: number?.getAttribute("value") ?? null,
        };
      });

    expect(await getState()).toEqual({
      rangeCount: 1,
      numberCount: 1,
      hostValue: "50",
      rangeValue: "50",
      numberValue: "50",
    });

    await page.evaluate(() => {
      const host = document.querySelector("#slider-reconnect");
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error("Missing slider host");
      parent.removeChild(host);
      parent.appendChild(host);
    });
    await page.waitForTimeout(50);

    expect(await getState()).toEqual({
      rangeCount: 1,
      numberCount: 1,
      hostValue: "50",
      rangeValue: "50",
      numberValue: "50",
    });
  });
});

test.describe("reconnect resilience", () => {
  const reconnect = async (page: import("@playwright/test").Page, selector: string) => {
    await page.evaluate((sel) => {
      const host = document.querySelector(sel);
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error(`Missing ${sel}`);
      parent.removeChild(host);
      parent.appendChild(host);
    }, selector);
    await page.waitForTimeout(50);
  };

  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("fig-options keeps a single segmented control on reconnect", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-options id="options-reconnect" options="One,Two,Three" value="Two"></fig-options>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#options-reconnect").evaluate((host) => ({
        controlCount: host.querySelectorAll(
          ":scope > fig-segmented-control, :scope > fig-dropdown",
        ).length,
        value: host.getAttribute("value"),
        segmentCount: host.querySelectorAll("fig-segment").length,
      }));

    expect(await getState()).toEqual({
      controlCount: 1,
      value: "Two",
      segmentCount: 3,
    });

    await reconnect(page, "#options-reconnect");

    expect(await getState()).toEqual({
      controlCount: 1,
      value: "Two",
      segmentCount: 3,
    });
  });

  test("fig-combo-input keeps a single combo on reconnect", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-combo-input
          id="combo-reconnect"
          options="Alpha,Beta"
          value="Beta"
          placeholder="Type..."
        ></fig-combo-input>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#combo-reconnect").evaluate((host) => ({
        comboCount: host.querySelectorAll(":scope > .input-combo").length,
        textCount: host.querySelectorAll("fig-input-text").length,
        dropdownCount: host.querySelectorAll("fig-dropdown").length,
        value: host.getAttribute("value"),
        inputValue: host.querySelector("fig-input-text")?.getAttribute("value"),
      }));

    expect(await getState()).toEqual({
      comboCount: 1,
      textCount: 1,
      dropdownCount: 1,
      value: "Beta",
      inputValue: "Beta",
    });

    await reconnect(page, "#combo-reconnect");

    expect(await getState()).toEqual({
      comboCount: 1,
      textCount: 1,
      dropdownCount: 1,
      value: "Beta",
      inputValue: "Beta",
    });
  });

  test("fig-origin-grid keeps a single handle on reconnect", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-origin-grid id="origin-reconnect" value="50% 50%" fields></fig-origin-grid>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#origin-reconnect").evaluate((host) => ({
        surfaceCount: host.querySelectorAll(".fig-origin-grid-surface").length,
        handleCount: host.querySelectorAll("fig-handle").length,
        value: host.getAttribute("value"),
      }));

    expect(await getState()).toEqual({
      surfaceCount: 1,
      handleCount: 1,
      value: "50% 50%",
    });

    await reconnect(page, "#origin-reconnect");

    expect(await getState()).toEqual({
      surfaceCount: 1,
      handleCount: 1,
      value: "50% 50%",
    });
  });

  test("fig-joystick keeps a single plane on reconnect", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-joystick id="joystick-reconnect" value="50% 50%"></fig-joystick>
      `;
    });
    await page.waitForTimeout(100);

    const getState = () =>
      page.locator("#joystick-reconnect").evaluate((host) => ({
        planeCount: host.querySelectorAll(".fig-input-joystick-plane").length,
        handleCount: host.querySelectorAll("fig-handle").length,
        value: host.getAttribute("value"),
      }));

    expect(await getState()).toEqual({
      planeCount: 1,
      handleCount: 1,
      value: "50% 50%",
    });

    await reconnect(page, "#joystick-reconnect");
    await page.waitForTimeout(50);

    expect(await getState()).toEqual({
      planeCount: 1,
      handleCount: 1,
      value: "50% 50%",
    });
  });

  test("fig-input-color keeps a single combo on reconnect", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-color id="color-reconnect" value="#ff0000"></fig-input-color>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#color-reconnect").evaluate((host) => ({
        comboCount: host.querySelectorAll(":scope > .input-combo").length,
        chitCount: host.querySelectorAll("fig-chit").length,
        textCount: host.querySelectorAll("fig-input-text").length,
        value: host.getAttribute("value"),
      }));

    expect(await getState()).toEqual({
      comboCount: 1,
      chitCount: 1,
      textCount: 1,
      value: "#ff0000",
    });

    await reconnect(page, "#color-reconnect");

    expect(await getState()).toEqual({
      comboCount: 1,
      chitCount: 1,
      textCount: 1,
      value: "#ff0000",
    });
  });
});

test.describe("render timing composition", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-field"),
        customElements.whenDefined("fig-group"),
        customElements.whenDefined("fig-input-number"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-slider"),
      ]);
    });
  });

  test("preserves composed children during synchronous setup", async ({ page }) => {
    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text id="text">
          <span id="text-prepend" slot="prepend">T</span>
          <button id="text-append" slot="append" type="button">Clear</button>
        </fig-input-text>
        <fig-input-number id="number" value="12" units="px" steppers>
          <span id="number-prepend" slot="prepend">N</span>
          <span id="number-append" slot="append">px</span>
        </fig-input-number>
        <fig-slider id="slider" text="false" value="5" min="0" max="10">
          <datalist id="slider-ticks">
            <option value="0"></option>
            <option value="5"></option>
          </datalist>
        </fig-slider>
        <fig-field id="field">
          <label>Name</label>
          <fig-input-text id="field-input"></fig-input-text>
        </fig-field>
        <fig-group id="group" name="Group" collapsible>
          <p id="group-body">Body</p>
        </fig-group>
      `;

      const text = document.querySelector("#text");
      const number = document.querySelector("#number");
      const slider = document.querySelector("#slider");
      const field = document.querySelector("#field");
      const group = document.querySelector("#group");
      const fieldLabel = field?.querySelector("label");
      const fieldNativeInput = field?.querySelector("fig-input-text input");
      const sliderInput = slider?.querySelector('input[type="range"]');
      const sliderDatalist = slider?.querySelector("datalist");

      return {
        textChildren: Array.from(text?.children ?? []).map((child) => child.id || child.tagName.toLowerCase()),
        numberChildren: Array.from(number?.children ?? []).map((child) => child.id || child.tagName.toLowerCase()),
        textInputReady: !!text?.querySelector("input"),
        numberInputReady: !!number?.querySelector("input"),
        numberSteppersReady: !!number?.querySelector(".fig-steppers"),
        sliderInputReady: !!sliderInput,
        sliderList: sliderInput?.getAttribute("list"),
        sliderDatalistParent: sliderDatalist?.parentElement?.className,
        fieldLabelFor: fieldLabel?.getAttribute("for"),
        fieldInputId: fieldNativeInput?.id || null,
        fieldInputLabelledBy: fieldNativeInput?.getAttribute("aria-labelledby"),
        fieldLabelId: fieldLabel?.id || null,
        groupHeaderReady: !!group?.querySelector(":scope > fig-header h3 .fig-group-chevron"),
        groupBodyStillProjected: group?.querySelector("#group-body")?.parentElement?.id,
      };
    });

    expect(state.textChildren).toEqual(["text-prepend", "input", "text-append"]);
    expect(state.numberChildren).toEqual([
      "number-prepend",
      "input",
      "number-append",
      "span",
    ]);
    expect(state.textInputReady).toBe(true);
    expect(state.numberInputReady).toBe(true);
    expect(state.numberSteppersReady).toBe(true);
    expect(state.sliderInputReady).toBe(true);
    expect(state.sliderList).toBe("slider-ticks");
    expect(state.sliderDatalistParent).toContain("fig-slider-input-container");
    expect(state.fieldLabelFor).toBe(state.fieldInputId);
    expect(state.fieldInputLabelledBy).toBe(state.fieldLabelId);
    expect(state.groupHeaderReady).toBe(true);
    expect(state.groupBodyStillProjected).toBe("group");
  });

  test("fig-group applies tokenized focus outline to collapsible header", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-group id="group" name="Advanced" collapsible>
          <p>Body</p>
        </fig-group>
      `;
    });
    await page.waitForTimeout(100);

    const group = page.locator("#group");
    const header = page.locator("#group > fig-header");
    const headingId = await page.locator("#group > fig-header h3").getAttribute("id");
    expect(headingId).toBeTruthy();
    await expect(group).toHaveAttribute("role", "group");
    await expect(group).toHaveAttribute("aria-labelledby", headingId || "");
    await expect(page.getByRole("group", { name: "Advanced" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Advanced" })).toHaveCount(1);
    await expect(header).toHaveAttribute("role", "button");
    await expect(header).toHaveAttribute("tabindex", "0");
    await expect(header).toHaveAttribute("aria-expanded", "false");

    await header.focus();
    const focusStyle = await header.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        focusOutlineRadius: style.getPropertyValue("--figma-focus-outline-radius").trim(),
        borderRadius: style.borderRadius,
      };
    });
    expect(focusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "-1px",
      focusOutlineRadius: "0.3125rem",
      borderRadius: "5px",
    });

    await page.keyboard.press("Enter");
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(group).toHaveAttribute("open", "true");
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

    await page.locator("#color fig-input-text input").focus();
    const hexFocusStyles = await page.locator("#color").evaluate((host) => {
      const hexHost = host.querySelector("fig-input-text");
      const hostStyle = getComputedStyle(host);
      const hexStyle = hexHost ? getComputedStyle(hexHost) : null;
      return {
        hostOutlineStyle: hostStyle.outlineStyle,
        hexOutlineStyle: hexStyle?.outlineStyle,
      };
    });
    expect(hexFocusStyles).toEqual({
      hostOutlineStyle: "solid",
      hexOutlineStyle: "none",
    });

    await page.locator("#color fig-input-number input").focus();
    const opacityFocusStyles = await page.locator("#color").evaluate((host) => {
      const opacityHost = host.querySelector("fig-input-number");
      const hostStyle = getComputedStyle(host);
      const opacityStyle = opacityHost ? getComputedStyle(opacityHost) : null;
      return {
        hostOutlineStyle: hostStyle.outlineStyle,
        opacityOutlineStyle: opacityStyle?.outlineStyle,
        opacityBoxShadow: opacityStyle?.boxShadow,
      };
    });
    expect(opacityFocusStyles.hostOutlineStyle).toBe("solid");
    expect(opacityFocusStyles.opacityOutlineStyle).toBe("none");
    expect(opacityFocusStyles.opacityBoxShadow).not.toBe("none");

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

test.describe("fill picker accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-fill-picker"),
        customElements.whenDefined("fig-input-gradient"),
        customElements.whenDefined("fig-chit"),
        customElements.whenDefined("fig-button"),
        customElements.whenDefined("fig-dropdown"),
        customElements.whenDefined("fig-slider"),
        customElements.whenDefined("fig-handle"),
      ]);
    });
  });

  test("names trigger swatches and generated dialog controls", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-fill-picker
          id="picker"
          mode="solid,gradient"
          aria-label="Layer fill"
          value='{"type":"solid","color":"#0D99FF"}'
        >
          <fig-chit background="#0D99FF"></fig-chit>
        </fig-fill-picker>
      `;
    });
    await page.waitForTimeout(100);

    await expect(page.locator("#picker fig-chit")).toHaveAttribute(
      "aria-label",
      "Open Layer fill",
    );
    await page.locator("#picker fig-chit").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog.fig-fill-picker-dialog")).toHaveAttribute(
      "open",
      "true",
    );

    const state = await page.evaluate(() => {
      const dialog = document.querySelector("dialog.fig-fill-picker-dialog");
      const closeButton = dialog?.querySelector(".fig-fill-picker-close");
      const nativeClose = closeButton?.shadowRoot?.querySelector("button");
      const eyedropper = dialog?.querySelector(".fig-fill-picker-eyedropper");
      const nativeEyedropper = eyedropper?.shadowRoot?.querySelector("button");
      const fillType = dialog?.querySelector(".fig-fill-picker-type select");
      const gamut = dialog?.querySelector(".fig-fill-picker-gamut select");
      const handle = dialog?.querySelector("fig-handle");
      const hue = dialog?.querySelector('fig-slider[type="hue"] input[type="range"]');
      const opacity = dialog?.querySelector('fig-slider[type="opacity"] fig-input-number input');
      return {
        closeLabel: nativeClose?.getAttribute("aria-label"),
        eyedropperLabel: nativeEyedropper?.getAttribute("aria-label"),
        fillTypeLabel: fillType?.getAttribute("aria-label"),
        gamutLabel: gamut?.getAttribute("aria-label"),
        handleLabel: handle?.getAttribute("aria-label"),
        hueLabel: hue?.getAttribute("aria-label"),
        opacityLabel: opacity?.getAttribute("aria-label"),
      };
    });

    expect(state).toEqual({
      closeLabel: "Close fill picker",
      eyedropperLabel: "Sample color",
      fillTypeLabel: "Fill type",
      gamutLabel: "Color gamut",
      handleLabel: "Color saturation and brightness",
      hueLabel: "Hue",
      opacityLabel: "Opacity",
    });
  });

  test("fig-input-gradient picker mode opens fill picker on Enter", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-gradient
          id="gradient"
          edit="picker"
          value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}'
        ></fig-input-gradient>
      `;
    });
    await page.waitForTimeout(100);

    const gradient = page.locator("#gradient");
    await expect(gradient).toHaveAttribute("tabindex", "0");
    await gradient.evaluate((host) => host.focus());
    await expect(gradient).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("dialog.fig-fill-picker-dialog")).toHaveAttribute(
      "open",
      "true",
    );
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
        customElements.whenDefined("fig-chooser"),
        customElements.whenDefined("fig-choice"),
        customElements.whenDefined("fig-menu"),
        customElements.whenDefined("fig-easing-curve"),
        customElements.whenDefined("fig-origin-grid"),
        customElements.whenDefined("fig-input-fill"),
        customElements.whenDefined("fig-input-gradient"),
        customElements.whenDefined("fig-input-palette"),
        customElements.whenDefined("fig-spinner"),
        customElements.whenDefined("fig-shimmer"),
        customElements.whenDefined("fig-skeleton"),
        customElements.whenDefined("fig-handle"),
        customElements.whenDefined("fig-color-tip"),
        customElements.whenDefined("fig-layer"),
        customElements.whenDefined("fig-toast"),
      ]);
    });
  });

  test("fig-chooser restores light-DOM overflow buttons after choices are replaced", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 6 }, (_, index) => {
        return `<fig-choice value="choice-${index}" style="min-width: 96px; height: 24px;">Choice ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser
          id="chooser"
          layout="horizontal"
          style="width: 120px; max-width: 120px;"
        >${choices}</fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#chooser").evaluate((chooser) => {
          return {
            navButtons: chooser.querySelectorAll("[data-fig-chooser-nav]").length,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            hasStartOverflow: chooser.classList.contains("overflow-start"),
            scrollLeft: chooser.scrollLeft,
          };
        }),
      )
      .toEqual({
        navButtons: 2,
        hasEndOverflow: true,
        hasStartOverflow: false,
        scrollLeft: 0,
      });

    await page.locator("#chooser").evaluate((chooser) => {
      chooser.innerHTML = `
        <fig-choice value="new-0" style="min-width: 96px; height: 24px;">New 0</fig-choice>
        <fig-choice value="new-1" style="min-width: 96px; height: 24px;">New 1</fig-choice>
        <fig-choice value="new-2" style="min-width: 96px; height: 24px;">New 2</fig-choice>
        <fig-choice value="new-3" style="min-width: 96px; height: 24px;">New 3</fig-choice>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#chooser").evaluate((chooser) => {
          const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
          return {
            choices: chooser.querySelectorAll("fig-choice").length,
            directChoices: chooser.querySelectorAll(":scope > fig-choice").length,
            legacyScroller: chooser.querySelectorAll(":scope > [data-fig-chooser-scroll]").length,
            navButtons: chooser.querySelectorAll("[data-fig-chooser-nav]").length,
            value: chooser.getAttribute("value"),
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            navEndPosition: navEnd ? getComputedStyle(navEnd).position : null,
            navEndPointerEvents: navEnd ? getComputedStyle(navEnd).pointerEvents : null,
          };
        }),
      )
      .toEqual({
        choices: 4,
        directChoices: 4,
        legacyScroller: 0,
        navButtons: 2,
        value: "new-0",
        hasEndOverflow: true,
        navEndPosition: "sticky",
        navEndPointerEvents: "auto",
      });

    await page.locator("#chooser").evaluate((chooser) => {
      chooser.querySelector('fig-choice[value="new-2"]')?.click();
    });
    await expect(page.locator("#chooser")).toHaveAttribute("value", "new-2");

    await page.locator("#chooser").evaluate((chooser) => {
      chooser.scrollLeft = 0;
      const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
      navEnd?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId: 1,
        }),
      );
    });

    await expect
      .poll(() =>
        page.locator("#chooser").evaluate((chooser) => {
          const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
          if (chooser.scrollLeft <= 0) return null;
          if (!navEnd) return null;
          const chooserRect = chooser.getBoundingClientRect();
          const navEndRect = navEnd.getBoundingClientRect();
          return {
            scrollLeft: chooser.scrollLeft,
            navEndRightDelta: Math.round(navEndRect.right - chooserRect.right),
          };
        }),
      )
      .toMatchObject({
        scrollLeft: expect.any(Number),
        navEndRightDelta: 0,
      });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 6 }, (_, index) => {
        return `<fig-choice value="vertical-${index}" style="height: 32px;">Vertical ${index}</fig-choice>`;
      }).join("");
      root.insertAdjacentHTML("beforeend", `
        <fig-chooser
          id="vertical-chooser"
          style="height: 72px; max-height: 72px; width: 120px;"
        >${choices}</fig-chooser>
      `);
    });

    await expect
      .poll(() =>
        page.locator("#vertical-chooser").evaluate((chooser) => {
          return {
            scrollTop: chooser.scrollTop,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            hasStartOverflow: chooser.classList.contains("overflow-start"),
          };
        }),
      )
      .toEqual({
        scrollTop: 0,
        hasEndOverflow: true,
        hasStartOverflow: false,
      });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.insertAdjacentHTML("beforeend", `
        <fig-chooser
          id="text-chooser"
          layout="vertical"
          value="option-a"
          full
          drag
          style="max-height: 190px; width: 240px;"
        >
          <fig-choice value="option-a" padding selected><span style="white-space: nowrap;">Option A</span></fig-choice>
          <fig-choice value="option-b" padding><span style="white-space: nowrap;">Option B</span></fig-choice>
          <fig-choice value="option-c" padding><span style="white-space: nowrap;">Option C</span></fig-choice>
          <fig-choice value="option-d" padding><span style="white-space: nowrap;">Option D</span></fig-choice>
          <fig-choice value="option-e" padding><span style="white-space: nowrap;">Option E</span></fig-choice>
          <fig-choice value="option-f" padding><span style="white-space: nowrap;">Option F</span></fig-choice>
        </fig-chooser>
      `);
    });

    await expect
      .poll(() =>
        page.locator("#text-chooser").evaluate((chooser) => {
          const navStart = chooser.querySelector('[data-fig-chooser-nav="start"]');
          const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
          return {
            scrollTop: chooser.scrollTop,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            hasStartOverflow: chooser.classList.contains("overflow-start"),
            navStartOpacity: navStart ? getComputedStyle(navStart).opacity : null,
            navEndOpacity: navEnd ? getComputedStyle(navEnd).opacity : null,
          };
        }),
      )
      .toEqual({
        scrollTop: 0,
        hasEndOverflow: true,
        hasStartOverflow: false,
        navStartOpacity: "0",
        navEndOpacity: "1",
      });

    await expect
      .poll(() =>
        page.locator("#vertical-chooser").evaluate((chooser) => {
          const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
          if (!navEnd) return null;
          chooser.scrollTop = 40;
          const chooserRect = chooser.getBoundingClientRect();
          const navEndRect = navEnd.getBoundingClientRect();
          return {
            scrollTop: chooser.scrollTop,
            navEndBottomDelta: Math.round(navEndRect.bottom - chooserRect.bottom),
          };
        }),
      )
      .toMatchObject({
        scrollTop: expect.any(Number),
        navEndBottomDelta: 0,
      });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div id="panel" style="width: 240px;">
          <fig-chooser id="panel-chooser" layout="horizontal" value="a" full drag>
            <fig-choice value="a" padding selected>Option A</fig-choice>
            <fig-choice value="b" padding>Option B</fig-choice>
            <fig-choice value="c" padding>Option C</fig-choice>
            <fig-choice value="d" padding>Option D</fig-choice>
            <fig-choice value="e" padding>Option E</fig-choice>
            <fig-choice value="f" padding>Option F</fig-choice>
          </fig-chooser>
        </div>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#panel-chooser").evaluate((chooser) => {
          const panel = document.querySelector("#panel");
          if (!panel) return null;
          return {
            panelWidth: Math.round(panel.getBoundingClientRect().width),
            chooserWidth: Math.round(chooser.getBoundingClientRect().width),
            scrollsHorizontally: chooser.scrollWidth > chooser.clientWidth,
          };
        }),
      )
      .toEqual({
        panelWidth: 240,
        chooserWidth: 240,
        scrollsHorizontally: true,
      });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = [
        "red",
        "blue",
        "green",
        "orange",
        "purple",
        "pink",
        "teal",
        "yellow",
      ]
        .map((color) => {
          return `<fig-choice value="${color}"><fig-chit size="large" disabled></fig-chit></fig-choice>`;
        })
        .join("");
      root.innerHTML = `
        <fig-chooser id="color-chooser" layout="horizontal" value="red" full drag style="width: 240px; max-width: 240px;">
          ${choices}
        </fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#color-chooser").evaluate((chooser) => {
          const choices = Array.from(chooser.querySelectorAll(":scope > fig-choice"));
          const rects = choices.map((choice) => choice.getBoundingClientRect());
          const gaps = rects.slice(1).map((rect, index) =>
            Math.round(rect.left - rects[index].right),
          );
          return {
            scrollsHorizontally: chooser.scrollWidth > chooser.clientWidth,
            minChoiceWidth: Math.min(
              ...choices.map((choice) =>
                Math.round(choice.getBoundingClientRect().width),
              ),
            ),
            minGap: Math.min(...gaps),
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            hasStartOverflow: chooser.classList.contains("overflow-start"),
          };
        }),
      )
      .toEqual({
        scrollsHorizontally: true,
        minChoiceWidth: 32,
        minGap: 8,
        hasEndOverflow: true,
        hasStartOverflow: false,
      });
  });

  test("fig-chooser supports grid column counts with fallback", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 6 }, (_, index) => {
        return `<fig-choice value="choice-${index}">Choice ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser id="grid-default" layout="grid">${choices}</fig-chooser>
        <fig-chooser id="grid-three" layout="grid" columns="3">${choices}</fig-chooser>
        <fig-chooser id="grid-invalid" layout="grid" columns="nope">${choices}</fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const columnCount = (selector: string) => {
            const chooser = document.querySelector(selector);
            if (!chooser) return null;
            return {
              columns: getComputedStyle(chooser).gridTemplateColumns
                .split(" ")
                .filter(Boolean).length,
              columnVar: getComputedStyle(chooser)
                .getPropertyValue("--fig-chooser-grid-columns")
                .trim(),
            };
          };

          return {
            defaultGrid: columnCount("#grid-default"),
            threeGrid: columnCount("#grid-three"),
            invalidGrid: columnCount("#grid-invalid"),
          };
        }),
      )
      .toEqual({
        defaultGrid: { columns: 2, columnVar: "" },
        threeGrid: { columns: 3, columnVar: "3" },
        invalidGrid: { columns: 2, columnVar: "" },
      });
  });

  test("fig-chooser grid overflow keeps scrollTop at start with sticky nav", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 12 }, (_, index) => {
        return `<fig-choice value="grid-${index}" style="height: 48px;">Grid ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser id="grid-overflow" layout="grid" columns="2" style="height: 120px; max-height: 120px; width: 160px;">
          ${choices}
        </fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#grid-overflow").evaluate((chooser) => {
          const navStart = chooser.querySelector('[data-fig-chooser-nav="start"]');
          return {
            scrollTop: chooser.scrollTop,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            navStartOpacity: navStart ? getComputedStyle(navStart).opacity : null,
            directChoices: chooser.querySelectorAll(":scope > fig-choice").length,
            legacyScroller: chooser.querySelectorAll(":scope > [data-fig-chooser-scroll]").length,
          };
        }),
      )
      .toEqual({
        scrollTop: 0,
        hasEndOverflow: true,
        navStartOpacity: "0",
        directChoices: 12,
        legacyScroller: 0,
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
        <fig-tabs id="text-tabs">
          <fig-tab selected>General</fig-tab>
          <fig-tab>Advanced</fig-tab>
        </fig-tabs>
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

    await page.locator('fig-tab[value="one"]').focus();
    const tabFocusStyle = await page.locator('fig-tab[value="one"]').evaluate((tab) => {
      const style = getComputedStyle(tab);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });
    expect(tabFocusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "-1px",
    });

    await page.locator('fig-segment[value="left"]').focus();
    const leftFocusStyle = await page
      .locator('fig-segment[value="left"]')
      .evaluate((segment) => {
        const style = getComputedStyle(segment);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
        };
      });
    expect(leftFocusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "0px",
    });

    await page.keyboard.press("ArrowRight");
    await expect(page.locator('fig-segment[value="right"]')).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('fig-segment[value="right"]')).toBeFocused();
    await page.waitForTimeout(50);
    await expect(page.locator('fig-segment[value="right"]')).toBeFocused();
    const rightFocusStyle = await page
      .locator('fig-segment[value="right"]')
      .evaluate((segment) => {
        const style = getComputedStyle(segment);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
        };
      });
    expect(rightFocusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "0px",
    });

    await page.locator("fig-tabs").first().evaluate((tabs) => {
      (window as any).__tabEvents = [];
      const record = (event: CustomEvent) => {
        (window as any).__tabEvents.push({
          type: event.type,
          detail: event.detail,
          value: (event.target as any)?.value,
        });
      };
      tabs.addEventListener("input", record as EventListener);
      tabs.addEventListener("change", record as EventListener);
    });
    await page.locator('fig-tab[value="two"]').click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__tabEvents))
      .toEqual([
        { type: "input", detail: "two", value: "two" },
        { type: "change", detail: "two", value: "two" },
      ]);

    await page.locator('fig-tab[value="two"]').focus();
    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(() => page.evaluate(() => (window as any).__tabEvents))
      .toEqual([
        { type: "input", detail: "two", value: "two" },
        { type: "change", detail: "two", value: "two" },
        { type: "input", detail: "one", value: "one" },
        { type: "change", detail: "one", value: "one" },
      ]);

    await page.locator("#text-tabs").evaluate((tabs) => {
      (window as any).__textTabEvents = [];
      const record = (event: CustomEvent) => {
        (window as any).__textTabEvents.push({
          type: event.type,
          detail: event.detail,
          value: (event.target as any)?.value,
        });
      };
      tabs.addEventListener("input", record as EventListener);
      tabs.addEventListener("change", record as EventListener);
    });
    await page.locator("#text-tabs fig-tab").nth(1).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__textTabEvents))
      .toEqual([
        { type: "input", detail: "Advanced", value: "Advanced" },
        { type: "change", detail: "Advanced", value: "Advanced" },
      ]);
  });

  test("fig-tabs centers selected tabs in overflow without moving the page", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div id="scroll-page" style="height: 2000px; padding-top: 400px;">
          <div style="width: 120px;">
            <fig-tabs id="overflow-tabs" value="all">
              <fig-tab value="all">All</fig-tab>
              <fig-tab value="ascii">ASCII</fig-tab>
              <fig-tab value="latin">Latin</fig-tab>
              <fig-tab value="punctuation">Punctuation</fig-tab>
              <fig-tab value="math">Math</fig-tab>
              <fig-tab value="arrows">Arrows</fig-tab>
              <fig-tab value="currency">Currency</fig-tab>
              <fig-tab value="symbols">Symbols</fig-tab>
              <fig-tab value="emoji">Emoji</fig-tab>
            </fig-tabs>
          </div>
        </div>
      `;
      window.scrollTo(0, 200);
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          const navEnd = tabs.querySelector('[data-fig-tabs-nav="end"]');
          return {
            navButtons: tabs.querySelectorAll("[data-fig-tabs-nav]").length,
            hasEndOverflow: tabs.classList.contains("overflow-end"),
            navEndPointerEvents: navEnd ? getComputedStyle(navEnd).pointerEvents : null,
            navEndPosition: navEnd ? getComputedStyle(navEnd).position : null,
          };
        }),
      )
      .toEqual({
        navButtons: 2,
        hasEndOverflow: true,
        navEndPointerEvents: "auto",
        navEndPosition: "sticky",
      });

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      const navEnd = tabs.querySelector('[data-fig-tabs-nav="end"]');
      navEnd?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId: 1,
        }),
      );
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          return tabs.scrollLeft > 0 && tabs.classList.contains("overflow-start");
        }),
      )
      .toBe(true);

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      tabs.setAttribute("value", "math");
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          const selected = tabs.querySelector('fig-tab[value="math"]');
          if (!selected) return false;
          const tabsRect = tabs.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          const tabsCenter = tabsRect.left + tabsRect.width / 2;
          const selectedCenter = selectedRect.left + selectedRect.width / 2;
          return window.scrollY === 200 && Math.abs(selectedCenter - tabsCenter) <= 3;
        }),
      )
      .toBe(true);

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      tabs.querySelector('fig-tab[value="currency"]')?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          const selected = tabs.querySelector('fig-tab[value="currency"]');
          if (!selected) return false;
          const tabsRect = tabs.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          const tabsCenter = tabsRect.left + tabsRect.width / 2;
          const selectedCenter = selectedRect.left + selectedRect.width / 2;
          return window.scrollY === 200 && Math.abs(selectedCenter - tabsCenter) <= 3;
        }),
      )
      .toBe(true);

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      tabs.setAttribute("value", "all");
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          const selected = tabs.querySelector('fig-tab[value="all"]');
          if (!selected) return false;
          const tabsRect = tabs.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          return window.scrollY === 200 && selectedRect.left >= tabsRect.left - 1;
        }),
      )
      .toBe(true);

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      tabs.innerHTML = `
        <fig-tab value="first">First</fig-tab>
        <fig-tab value="second">Second</fig-tab>
        <fig-tab value="third">Third</fig-tab>
        <fig-tab value="fourth">Fourth</fig-tab>
        <fig-tab value="fifth">Fifth</fig-tab>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          return {
            tabs: tabs.querySelectorAll("fig-tab").length,
            directTabs: tabs.querySelectorAll(":scope > fig-tab").length,
            legacyScroller: tabs.querySelectorAll(":scope > [data-fig-tabs-scroll]").length,
            navButtons: tabs.querySelectorAll("[data-fig-tabs-nav]").length,
            sharedButtons: tabs.querySelectorAll(".fig-overflow").length,
          };
        }),
      )
      .toEqual({
        tabs: 5,
        directTabs: 5,
        legacyScroller: 0,
        navButtons: 2,
        sharedButtons: 2,
      });

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      const tab = document.createElement("fig-tab");
      tab.setAttribute("value", "sixth");
      tab.textContent = "Sixth";
      tabs.append(tab);
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          return {
            tabs: tabs.querySelectorAll("fig-tab").length,
            directTabs: tabs.querySelectorAll(":scope > fig-tab").length,
            legacyScroller: tabs.querySelectorAll(":scope > [data-fig-tabs-scroll]").length,
            navButtons: tabs.querySelectorAll("[data-fig-tabs-nav]").length,
            sharedButtons: tabs.querySelectorAll(".fig-overflow").length,
          };
        }),
      )
      .toEqual({
        tabs: 6,
        directTabs: 6,
        legacyScroller: 0,
        navButtons: 2,
        sharedButtons: 2,
      });
  });

  test("fig-input-palette uses tokenized focus outline on the visible swatch row", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-palette
          id="palette"
          value='["#0D99FF","#14AE5C","#FFCD29"]'
          aria-label="Palette"
        ></fig-input-palette>
      `;
    });
    await page.waitForTimeout(100);

    await page.locator("#palette").focus();

    const focusStyle = await page.locator("#palette").evaluate((host) => {
      const row = host.querySelector(".palette-colors-inline");
      if (!row) return null;
      const hostStyle = getComputedStyle(host);
      const rowStyle = getComputedStyle(row);
      return {
        hostOutlineStyle: hostStyle.outlineStyle,
        rowOutlineStyle: rowStyle.outlineStyle,
        rowOutlineWidth: rowStyle.outlineWidth,
        rowOutlineOffset: rowStyle.outlineOffset,
      };
    });

    expect(focusStyle).toEqual({
      hostOutlineStyle: "none",
      rowOutlineStyle: "solid",
      rowOutlineWidth: "1px",
      rowOutlineOffset: "-1px",
    });

    const row = page.locator("#palette .palette-colors-inline");
    await expect(row).toHaveAttribute("role", "button");
    await expect(row).not.toHaveAttribute("tabindex", "0");
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await page.locator("#palette").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#palette")).toHaveAttribute("open", "");
    await expect(row).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Tab");
    await expect(row).not.toBeFocused();

    await page.locator("#palette .palette-colors-inline fig-input-color").first().focus();
    const inlineSwatchStyle = await page
      .locator("#palette .palette-colors-inline fig-input-color")
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        const rowStyle = getComputedStyle(element.closest(".palette-colors-inline") as Element);
        return {
          outlineStyle: style.outlineStyle,
          rowOutlineStyle: rowStyle.outlineStyle,
          rowOutlineWidth: rowStyle.outlineWidth,
          rowOutlineOffset: rowStyle.outlineOffset,
        };
      });
    expect(inlineSwatchStyle).toEqual({
      outlineStyle: "none",
      rowOutlineStyle: "none",
      rowOutlineWidth: "3px",
      rowOutlineOffset: "0px",
    });
  });

  test("fig-input-gradient routes focus to handles only when editable", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const value =
        '{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}';
      root.innerHTML = `
        <button id="before">Before</button>
        <fig-input-gradient id="editable" value='${value}'></fig-input-gradient>
        <fig-input-gradient id="static" edit="false" value='${value}'></fig-input-gradient>
        <button id="after">After</button>
      `;
    });
    await page.waitForTimeout(100);

    const editable = page.locator("#editable");
    const editableFirstHandle = page
      .locator("#editable fig-handle:not(.fig-input-gradient-ghost)")
      .first();
    const staticGradient = page.locator("#static");

    await expect(editable).toHaveAttribute("tabindex", "-1");
    await editable.evaluate((host) => host.focus());
    await expect(editableFirstHandle).toBeFocused();

    const editableFocusStyle = await editable.evaluate((host) => {
      const handle = host.querySelector("fig-handle:not(.fig-input-gradient-ghost)");
      if (!handle) return null;
      const hostStyle = getComputedStyle(host);
      const handleStyle = getComputedStyle(handle);
      return {
        hostOutlineStyle: hostStyle.outlineStyle,
        handleOutlineStyle: handleStyle.outlineStyle,
        handleOutlineOffset: handleStyle.outlineOffset,
      };
    });
    expect(editableFocusStyle).toEqual({
      hostOutlineStyle: "none",
      handleOutlineStyle: "solid",
      handleOutlineOffset: "1px",
    });

    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect(editableFirstHandle).toBeFocused();

    await expect(staticGradient).toHaveAttribute("tabindex", "0");
    await staticGradient.evaluate((host) => host.focus());
    await expect(staticGradient).toBeFocused();

    const staticFocusStyle = await staticGradient.evaluate((host) => {
      const style = getComputedStyle(host);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });
    expect(staticFocusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "-1px",
    });
  });

  test("fig-origin-grid handle uses tokenized focus outline", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-origin-grid id="origin" value="50% 50%"></fig-origin-grid>`;
    });
    await page.waitForTimeout(100);

    const handle = page.locator("#origin fig-handle");
    await handle.focus();

    const focusStyle = await handle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });

    expect(focusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "1px",
    });

    await page.keyboard.press("ArrowRight");
    await expect(handle).toBeFocused();
    await expect(page.locator("#origin")).toHaveAttribute("value", "51% 50%");

    await page.keyboard.press("Shift+ArrowDown");
    await expect(handle).toBeFocused();
    await expect(page.locator("#origin")).toHaveAttribute("value", "51% 60%");
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

  test("fig-skeleton hides descendant controls from tab focus", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <button id="before">Before</button>
        <fig-skeleton>
          <input id="hidden-input" value="Hidden">
          <button id="hidden-button">Hidden button</button>
        </fig-skeleton>
        <button id="after">After</button>
      `;
    });
    await page.waitForTimeout(100);

    await expect(page.locator("fig-skeleton")).toHaveAttribute("inert", "");
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#after")).toBeFocused();
  });

  test("draggable handles move with keyboard and emit value changes", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="position: relative; width: 200px; height: 100px;">
          <fig-handle id="keyboard-handle" drag="true" value="50% 50%"></fig-handle>
        </div>
      `;
    });
    await page.waitForTimeout(100);

    const handle = page.locator("#keyboard-handle");
    await handle.focus();
    const focusStyle = await handle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });
    expect(focusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "1px",
    });

    await page.keyboard.press("ArrowRight");
    await expect(handle).toHaveAttribute("value", "51% 50%");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(handle).toHaveAttribute("value", "51% 60%");
    await page.keyboard.press("Home");
    await expect(handle).toHaveAttribute("value", "0% 0%");
  });

  test("fig-easing-curve handles are draggable and support keyboard movement", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-easing-curve
          id="curve"
          value="0.25, 0.25, 0.75, 0.75"
        ></fig-easing-curve>
      `;
    });
    await page.waitForTimeout(100);

    const handleOrder = await page.locator("#curve").evaluate((host) =>
      Array.from(host.querySelectorAll(".fig-easing-curve-handle")).map((handle) =>
        handle.getAttribute("data-handle"),
      ),
    );
    expect(handleOrder).toEqual(["2", "1"]);

    const firstHandle = page.locator('#curve [data-handle="1"] fig-handle');
    await expect(firstHandle).toHaveAttribute("drag", "");

    await firstHandle.focus();
    await page.keyboard.press("ArrowRight");

    const state = await page.locator("#curve").evaluate((host) => {
      const input = host.querySelector(".fig-easing-curve-value-input");
      return {
        value: host.value,
        inputValue: input?.getAttribute("value"),
      };
    });

    expect(state).toEqual({
      value: "0.26, 0.25, 0.75, 0.75",
      inputValue: "0.26, 0.25, 0.75, 0.75",
    });
  });

  test("tooltip Escape dismisses and returns focus to the trigger", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip id="tooltip" action="click" text="Helpful note">
          <fig-button id="tooltip-trigger">Help</fig-button>
        </fig-tooltip>
      `;
    });
    await page.waitForTimeout(100);

    const trigger = page.locator("#tooltip-trigger");
    await trigger.focus();
    await trigger.click();
    await expect(page.locator('dialog[is="fig-popup"][data-tooltip-managed]')).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator('dialog[is="fig-popup"][data-tooltip-managed]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("hover tooltips honor delay when moving between tiles", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <style>
          fig-tooltip { display: contents; }
        </style>
        <fig-chooser layout="grid" columns="2" id="delay-grid">
          <fig-choice value="a">
            <fig-tooltip text="Tile A" delay="200">
              <span class="tile">A</span>
            </fig-tooltip>
          </fig-choice>
          <fig-choice value="b">
            <fig-tooltip text="Tile B" delay="200">
              <span class="tile">B</span>
            </fig-tooltip>
          </fig-choice>
        </fig-chooser>
      `;
    });
    await page.waitForTimeout(100);

    const popup = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    const tiles = page.locator("#delay-grid .tile");

    await tiles.nth(0).hover();
    await page.waitForTimeout(80);
    await expect(popup).toHaveCount(0);
    await page.waitForTimeout(150);
    await expect(popup).toHaveCount(1);

    await tiles.nth(1).hover();
    await expect(popup).toHaveCount(1);

    await page.mouse.move(0, 0);
    await page.waitForTimeout(50);
    await tiles.nth(0).hover();
    await page.waitForTimeout(150);
    await expect(popup).toHaveCount(1);
    await tiles.nth(1).hover();
    await expect(popup).toHaveCount(1);

    await page.mouse.move(0, 0);
    await page.waitForTimeout(1100);
    await tiles.nth(1).hover();
    await page.waitForTimeout(80);
    await expect(popup).toHaveCount(0);
    await page.waitForTimeout(150);
    await expect(popup).toHaveCount(1);
  });

  test("hover tooltips dismiss when the pointer leaves an iframe", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const srcdoc = `<!DOCTYPE html><html><head><link rel="stylesheet" href="/fig.css"><script type="module" src="/fig.js"><\/script></head><body style="margin:0;padding:12px"><fig-tooltip text="Help" delay="0"><fig-button id="iframe-tooltip-trigger">Help</fig-button></fig-tooltip></body></html>`;
      root.innerHTML = `
        <dialog is="fig-dialog" open style="width:260px;padding:0;border:0">
          <iframe
            id="tooltip-iframe"
            style="width:100%;height:88px;border:0;display:block"
            srcdoc="${srcdoc.replace(/"/g, "&quot;")}"
          ></iframe>
        </dialog>
      `;
    });
    await page.waitForTimeout(300);

    const frame = page.frameLocator("#tooltip-iframe");
    const popup = frame.locator(
      'dialog[is="fig-popup"][data-tooltip-managed]',
    );
    await frame.locator("#iframe-tooltip-trigger").hover();
    await expect(popup).toHaveCount(1);

    await page.locator("#tooltip-iframe").dispatchEvent("mouseleave");
    await expect(popup).toHaveCount(0);
  });

  test("hover tooltips dismiss when the pointer leaves the document", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip text="Help" delay="0">
          <fig-button id="exit-tooltip-trigger">Help</fig-button>
        </fig-tooltip>
      `;
    });
    await page.waitForTimeout(100);

    const popup = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    await page.locator("#exit-tooltip-trigger").hover();
    await expect(popup).toHaveCount(1);

    await page.evaluate(() => {
      document.documentElement.dispatchEvent(
        new MouseEvent("mouseleave", { bubbles: false }),
      );
    });
    await expect(popup).toHaveCount(0);
  });

  test("hover tooltips on display:contents triggers hide when moving between tiles", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <style>
          fig-tooltip { display: contents; }
        </style>
        <fig-chooser layout="grid" columns="4" id="tile-grid">
          <fig-choice value="a">
            <fig-tooltip text="Click to copy" delay="0">
              <span class="tile">A</span>
            </fig-tooltip>
          </fig-choice>
          <fig-choice value="b">
            <fig-tooltip text="Click to copy" delay="0">
              <span class="tile">B</span>
            </fig-tooltip>
          </fig-choice>
          <fig-choice value="c">
            <fig-tooltip text="Click to copy" delay="0">
              <span class="tile">C</span>
            </fig-tooltip>
          </fig-choice>
        </fig-chooser>
      `;
    });
    await page.waitForTimeout(100);

    const tiles = page.locator("#tile-grid .tile");
    await tiles.nth(0).hover();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
    await tiles.nth(1).hover();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
    await tiles.nth(2).hover();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(50);
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(0);
  });

  test("tooltip keeps beak aligned when anchor is near viewport edge", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 280, height: 480 });
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="edge-anchor" icon variant="ghost" style="position:fixed;right:8px;top:48px"></fig-button>
        <dialog is="fig-popup" variant="tooltip" position="top center" offset="8 8" anchor="#edge-anchor" open>
          <span>Clear search</span>
        </dialog>
      `;
      const button = document.querySelector("#edge-anchor");
      if (button) {
        const icon = document.createElement("fig-icon");
        icon.setAttribute("name", "close");
        icon.setAttribute("size", "small");
        button.append(icon);
      }
    });
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => {
      const popup = document.querySelector(
        'dialog[is="fig-popup"][variant="tooltip"]',
      );
      const anchor = document.querySelector("#edge-anchor");
      if (!(popup instanceof HTMLDialogElement) || !(anchor instanceof HTMLElement)) {
        return null;
      }

      popup.positionPopup?.();

      const popupRect = popup.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const beakOffset = parseFloat(
        getComputedStyle(popup).getPropertyValue("--fig-popup-beak-offset"),
      );
      const beakX = popupRect.left + beakOffset;

      return {
        beakDelta: Math.abs(beakX - anchorCenterX),
        pointer: popup.getAttribute("pointer"),
        viewportMarginRight: window.innerWidth - popupRect.right,
      };
    });

    expect(state).not.toBeNull();
    expect(state?.viewportMarginRight).toBeGreaterThanOrEqual(7);
    expect(state?.viewportMarginRight).toBeLessThanOrEqual(9);
    if (state?.pointer !== "false") {
      expect(state?.beakDelta).toBeLessThan(1.5);
    }
  });

  test("fig-tooltip positions popup when using popover API", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip id="popover-tooltip" action="manual" show text="Clear search">
          <fig-button id="popover-tooltip-trigger" icon variant="ghost" aria-label="Clear search" style="position:fixed;left:50%;top:8px;transform:translateX(-50%)"></fig-button>
        </fig-tooltip>
      `;
      const button = document.querySelector("#popover-tooltip-trigger");
      if (button) {
        const icon = document.createElement("fig-icon");
        icon.setAttribute("name", "close");
        icon.setAttribute("size", "small");
        button.append(icon);
      }

      await customElements.whenDefined("fig-tooltip");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const trigger = document.querySelector("#popover-tooltip-trigger");

      const popup = document.querySelector(
        'dialog[is="fig-popup"][data-tooltip-managed]',
      );
      if (!(popup instanceof HTMLDialogElement) || !(trigger instanceof HTMLElement)) {
        return null;
      }

      popup.positionPopup?.();

      const popupRect = popup.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      return {
        left: popup.style.left,
        top: popup.style.top,
        width: popupRect.width,
        belowAnchor: popupRect.top >= triggerRect.bottom - 1,
        beakSide: popup.getAttribute("data-beak-side"),
        pointer: popup.getAttribute("pointer"),
      };
    });

    expect(state).not.toBeNull();
    expect(state?.left).not.toBe("");
    expect(state?.top).not.toBe("");
    expect(state?.width).toBeGreaterThan(0);
    expect(state?.belowAnchor || state?.beakSide === "top").toBe(true);
    expect(state?.beakSide).toBe("top");
    expect(state?.pointer).not.toBe("false");
  });

  test("tooltip flips below anchor when there is no room above", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 300, height: 400 });
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="top-anchor" icon variant="ghost" style="position:fixed;left:50%;top:8px;transform:translateX(-50%)"></fig-button>
        <dialog is="fig-popup" variant="tooltip" position="top center" offset="8 8" anchor="#top-anchor" open>
          <span>Clear search</span>
        </dialog>
      `;
      const button = document.querySelector("#top-anchor");
      if (button) {
        const icon = document.createElement("fig-icon");
        icon.setAttribute("name", "close");
        icon.setAttribute("size", "small");
        button.append(icon);
      }
    });
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => {
      const popup = document.querySelector(
        'dialog[is="fig-popup"][variant="tooltip"]',
      );
      const anchor = document.querySelector("#top-anchor");
      if (!(popup instanceof HTMLDialogElement) || !(anchor instanceof HTMLElement)) {
        return null;
      }

      popup.positionPopup?.();

      const popupRect = popup.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();

      return {
        beakSide: popup.getAttribute("data-beak-side"),
        pointer: popup.getAttribute("pointer"),
        popupTop: popupRect.top,
        anchorBottom: anchorRect.bottom,
      };
    });

    expect(state).not.toBeNull();
    expect(state?.beakSide).toBe("top");
    expect(state?.pointer).not.toBe("false");
    expect(state?.popupTop).toBeGreaterThanOrEqual((state?.anchorBottom ?? 0) + 7);
  });

  test("dialog and popup close paths restore focus", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="dialog-trigger">Open dialog</fig-button>
        <dialog id="restore-dialog" is="fig-dialog" aria-label="Example dialog">
          <fig-button close-dialog>Close dialog</fig-button>
        </dialog>
        <fig-button id="popup-trigger">Open popup</fig-button>
        <dialog id="restore-popup" is="fig-popup" anchor="#popup-trigger" aria-label="Example popup">
          <fig-button id="popup-close">Close popup</fig-button>
        </dialog>
      `;
      const dialogTrigger = document.querySelector("#dialog-trigger");
      const dialog = document.querySelector("#restore-dialog");
      dialogTrigger?.addEventListener("click", () => dialog?.show());
      const popupTrigger = document.querySelector("#popup-trigger");
      const popup = document.querySelector("#restore-popup");
      popupTrigger?.addEventListener("click", () => {
        popup.open = true;
      });
      document.querySelector("#popup-close")?.addEventListener("click", () => {
        popup.open = false;
      });
    });
    await page.waitForTimeout(100);

    const dialogTrigger = page.locator("#dialog-trigger");
    await dialogTrigger.focus();
    await dialogTrigger.click();
    await page.locator("#restore-dialog > fig-button[close-dialog]").click();
    await expect(dialogTrigger).toBeFocused();

    const popupTrigger = page.locator("#popup-trigger");
    await popupTrigger.focus();
    await popupTrigger.click();
    await expect(page.locator("#restore-popup")).toHaveAttribute("open", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator("#restore-popup")).not.toHaveAttribute("open", "true");
    await expect(popupTrigger).toBeFocused();
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

  test("fig-image with explicit aspect ratio lets preview shrink below default min height", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="width: 40px;">
          <fig-image
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
            alt=""
            aspect-ratio="1/1"
            full
          ></fig-image>
        </div>
      `;
    });

    await expect
      .poll(() =>
        page.locator("fig-image > fig-preview").evaluate((preview) => {
          const rect = preview.getBoundingClientRect();
          return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            minHeight: getComputedStyle(preview).minHeight,
          };
        }),
      )
      .toEqual({
        width: 40,
        height: 40,
        minHeight: "auto",
      });
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
        sliderStep: slider?.getAttribute("step"),
        inputStep: input?.getAttribute("step"),
        sliderLabel: input?.getAttribute("aria-label"),
        sliderValueText: input?.getAttribute("aria-valuetext"),
        timeTag: time?.tagName,
        timeText: time?.textContent,
      };
    });

    expect(state).toEqual({
      hostRole: "group",
      hostLabel: "Media controls",
      sliderStep: "1",
      inputStep: "1",
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

  test("fig-image overlays slotted custom children without reparenting them", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          alt="Image preview"
        >
          <fig-input-file slot="overlay" accepts="image/*" label="Change" variant="overlay"></fig-input-file>
        </fig-image>
      `;
    });
    await page.waitForTimeout(50);

    await expect(
      page.locator("fig-image > fig-input-file[slot='overlay']"),
    ).toHaveCount(1);
    await expect(
      page.locator("fig-image > fig-preview > fig-input-file[slot='overlay']"),
    ).toHaveCount(0);

    const overlayStyle = await page
      .locator("fig-image > fig-input-file[slot='overlay']")
      .evaluate((element) => {
        const style = getComputedStyle(element);
        const hostStyle = getComputedStyle(element.parentElement as Element);
        return {
          hostDisplay: hostStyle.display,
          opacity: style.opacity,
          gridArea: style.gridArea,
          placeSelf: style.placeSelf,
        };
      });

    expect(overlayStyle).toEqual({
      hostDisplay: "grid",
      opacity: "0",
      gridArea: "media-preview",
      placeSelf: "center",
    });

    await page.locator("fig-image > fig-input-file[slot='overlay'] input[type=file]").focus();
    await expect
      .poll(() =>
        page.locator("fig-image > fig-input-file[slot='overlay']").evaluate((element) =>
          getComputedStyle(element).opacity,
        ),
      )
      .toBe("1");
  });
});
