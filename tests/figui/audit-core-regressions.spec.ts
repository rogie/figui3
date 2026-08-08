import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig.js audit core regressions", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("fig-button synchronizes disabled to select and upload controls", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <fig-button id="select-button" type="select">
          <select><option>One</option></select>
        </fig-button>
        <fig-button id="upload-button" type="upload">
          <input type="file" disabled>
        </fig-button>
      `;
      await new Promise(requestAnimationFrame);
      const selectButton = root.querySelector("#select-button")!;
      const uploadButton = root.querySelector("#upload-button")!;
      const select = selectButton.querySelector("select") as HTMLSelectElement;
      const upload = uploadButton.querySelector("input") as HTMLInputElement;
      selectButton.setAttribute("disabled", "");
      uploadButton.setAttribute("disabled", "");
      const whileDisabled = [select.disabled, upload.disabled];
      selectButton.removeAttribute("disabled");
      uploadButton.removeAttribute("disabled");
      return {
        whileDisabled,
        afterEnabled: [select.disabled, upload.disabled],
      };
    });

    expect(state).toEqual({
      whileDisabled: [true, true],
      afterEnabled: [false, true],
    });
  });

  test("hover tooltip opens on focus and preserves authored descriptions", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <p id="authored-description">Authored help</p>
        <fig-tooltip text="Tooltip help" delay="0">
          <button id="tooltip-trigger" aria-describedby="authored-description">Focus me</button>
        </fig-tooltip>
        <button id="next-focus">Next</button>
        <dialog id="focus-overlay" is="fig-dialog" aria-label="Overlay"></dialog>
      `;
    });

    await page.locator("#tooltip-trigger").focus();
    const popup = page.locator('dialog[is="fig-popup"][role="tooltip"]');
    await expect(popup).toHaveCount(1);
    const tooltipId = await popup.getAttribute("id");
    await expect(page.locator("#tooltip-trigger")).toHaveAttribute(
      "aria-describedby",
      `authored-description ${tooltipId}`,
    );
    await page.locator("#next-focus").focus();
    await expect(popup).toHaveCount(0);
    await expect(page.locator("#tooltip-trigger")).toHaveAttribute(
      "aria-describedby",
      "authored-description",
    );
    await page.locator("#tooltip-trigger").focus();
    await expect(popup).toHaveCount(1);
    await page.locator("#focus-overlay").evaluate((dialog) => {
      (dialog as HTMLDialogElement).show();
    });
    await expect(popup).toHaveCount(0);
    await page.locator("#focus-overlay").evaluate((dialog) => {
      (dialog as HTMLDialogElement).close();
    });
    await page.locator("#next-focus").focus();
    await page.locator("#tooltip-trigger").focus();
    await expect(popup).toHaveCount(1);
  });

  test("lazy color picker listeners stay single across reconnects", async ({
    page,
  }) => {
    const counts = await page.evaluate(async () => {
      await import("/fig-editor.js");
      await customElements.whenDefined("fig-fill-picker");
      const color = document.createElement("fig-input-color");
      color.setAttribute("value", "#336699");
      color.setAttribute("text", "false");
      document.body.append(color);
      await new Promise(requestAnimationFrame);
      const swatchInput = color.querySelector(
        'fig-swatch input[type="color"]',
      ) as HTMLInputElement;
      swatchInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      await new Promise(requestAnimationFrame);
      const picker = color.querySelector("fig-fill-picker")!;
      let inputs = 0;
      let changes = 0;
      color.addEventListener("input", () => inputs++);
      color.addEventListener("change", () => changes++);
      const dispatch = () => {
        picker.dispatchEvent(
          new CustomEvent("input", {
            bubbles: true,
            detail: { color: "#112233", alpha: 0.5 },
          }),
        );
        picker.dispatchEvent(new CustomEvent("change", { bubbles: true }));
      };
      dispatch();
      color.remove();
      document.body.append(color);
      await new Promise(requestAnimationFrame);
      dispatch();
      return { inputs, changes };
    });

    expect(counts).toEqual({ inputs: 2, changes: 2 });
  });

  test("fig-input-color adds canonical aliases without changing legacy events", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      await import("/fig-editor.js");
      await customElements.whenDefined("fig-fill-picker");
      const color = document.createElement("fig-input-color") as HTMLElement & {
        value: string;
      };
      color.setAttribute("value", "#33669980");
      document.body.append(color);
      await new Promise(requestAnimationFrame);

      type ColorDetail = {
        value: string;
        hex?: string;
        rgba: { r: number; g: number; b: number; a: number };
        color: string;
        alpha: number;
        opacity: number;
      };
      const events: Array<{
        type: string;
        detail: ColorDetail;
        keys: string[];
        bubbles: boolean;
        cancelable: boolean;
        defaultPrevented: boolean;
        targetIsHost: boolean;
      }> = [];
      const capture = (event: Event) => {
        const customEvent = event as CustomEvent<ColorDetail>;
        if (events.length === 0) event.preventDefault();
        events.push({
          type: event.type,
          detail: customEvent.detail,
          keys: Object.keys(customEvent.detail).sort(),
          bubbles: event.bubbles,
          cancelable: event.cancelable,
          defaultPrevented: event.defaultPrevented,
          targetIsHost: event.target === color,
        });
      };
      color.addEventListener("input", capture);
      color.addEventListener("change", capture);

      color.setAttribute("value", "#ABCDEF00");
      const afterProgrammaticWrite = {
        eventCount: events.length,
        value: color.value,
        attribute: color.getAttribute("value"),
      };

      const text = color.querySelector("fig-input-text") as HTMLElement & {
        value: string;
      };
      text.value = "112233";
      text.dispatchEvent(new Event("input", { bubbles: true }));
      text.dispatchEvent(new Event("change", { bubbles: true }));

      const alpha = color.querySelector("fig-input-number") as HTMLElement & {
        value: string;
      };
      alpha.value = "0";
      alpha.dispatchEvent(new Event("input", { bubbles: true }));
      alpha.dispatchEvent(new Event("change", { bubbles: true }));

      const swatchInput = color.querySelector(
        'fig-swatch input[type="color"]',
      ) as HTMLInputElement;
      swatchInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      await new Promise(requestAnimationFrame);
      const picker = color.querySelector("fig-fill-picker")!;
      picker.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: { color: "#445566", alpha: 0.5 },
        }),
      );
      picker.dispatchEvent(new CustomEvent("change", { bubbles: true }));

      return {
        afterProgrammaticWrite,
        finalAttribute: color.getAttribute("value"),
        events,
      };
    });

    expect(state.afterProgrammaticWrite).toEqual({
      eventCount: 0,
      value: "#ABCDEF00",
      attribute: "#ABCDEF00",
    });
    expect(state.finalAttribute).toBe("#ABCDEF00");
    expect(state.events.map(({ type }) => type)).toEqual([
      "input",
      "change",
      "input",
      "change",
      "input",
      "change",
    ]);
    for (const event of state.events) {
      expect(event.keys).toEqual([
        "alpha",
        "color",
        "hex",
        "opacity",
        "rgba",
        "value",
      ]);
      expect(event).toMatchObject({
        bubbles: true,
        cancelable: true,
        targetIsHost: true,
      });
    }
    expect(state.events.map(({ defaultPrevented }) => defaultPrevented)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(state.events[0].detail).toEqual({
      value: "#112233",
      rgba: { r: 17, g: 34, b: 51, a: 1 },
      color: "#112233",
      alpha: 1,
      opacity: 100,
    });
    expect(state.events[1].detail).toEqual(state.events[0].detail);
    expect(state.events[2].detail).toEqual({
      value: "#11223300",
      rgba: { r: 17, g: 34, b: 51, a: 0 },
      color: "#112233",
      alpha: 0,
      opacity: 0,
    });
    expect(state.events[3].detail).toEqual(state.events[2].detail);
    expect(state.events[4].detail).toEqual({
      value: "#44556680",
      rgba: { r: 68, g: 85, b: 102, a: 128 / 255 },
      color: "#445566",
      alpha: 128 / 255,
      opacity: 50,
    });
    expect(state.events[5].detail).toEqual(state.events[4].detail);
  });

  test("disabled menus close and reject every opening path", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const menu = document.createElement("fig-menu") as HTMLElement & {
        open: boolean;
        showAt(x: number, y: number): void;
      };
      menu.innerHTML = `
        <button fig-menu-trigger>Actions</button>
        <fig-menu-item value="copy">Copy</fig-menu-item>
      `;
      document.body.append(menu);
      await new Promise(requestAnimationFrame);
      menu.open = true;
      await new Promise(requestAnimationFrame);
      menu.setAttribute("disabled", "");
      await new Promise(requestAnimationFrame);
      const trigger = menu.querySelector(
        "[fig-menu-trigger]",
      ) as HTMLButtonElement;
      const closedOnDisable = !menu.open && trigger.getAttribute("aria-expanded") === "false";
      trigger.click();
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      menu.showAt(20, 20);
      menu.setAttribute("open", "");
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const popup = menu.querySelector('dialog[is="fig-popup"]') as HTMLDialogElement;
      return {
        closedOnDisable,
        open: menu.open,
        popupOpen: popup.open,
      };
    });

    expect(state).toEqual({
      closedOnDisable: true,
      open: false,
      popupOpen: false,
    });
  });

  test("disabled generated text adornments do not mutate or emit", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <fig-input-text id="search" type="search" value="query" disabled></fig-input-text>
        <fig-input-text id="password" type="password" value="secret" disabled></fig-input-text>
      `;
      await new Promise(requestAnimationFrame);
      const search = root.querySelector("#search") as HTMLElement & { value: string };
      const password = root.querySelector("#password") as HTMLElement & {
        value: string;
        input: HTMLInputElement;
      };
      const events = { input: 0, change: 0 };
      search.addEventListener("input", () => events.input++);
      search.addEventListener("change", () => events.change++);
      search.querySelector<HTMLElement>(
        '[data-generated="search-clear"] fig-button',
      )?.click();
      password.querySelector<HTMLElement>(
        '[data-generated="password-toggle"] fig-button',
      )?.click();
      return {
        searchValue: search.value,
        passwordType: password.input.type,
        events,
        buttonsDisabled: [...root.querySelectorAll(
          '[data-generated] fig-button',
        )].every((button) => button.hasAttribute("disabled")),
      };
    });

    expect(state).toEqual({
      searchValue: "query",
      passwordType: "password",
      events: { input: 0, change: 0 },
      buttonsDisabled: true,
    });
  });

  test("chooser initializes parent disabled state and preserves disabled choices", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const chooser = document.createElement("fig-chooser");
      chooser.setAttribute("disabled", "");
      chooser.innerHTML = `
        <fig-choice value="one">One</fig-choice>
        <fig-choice value="two" disabled>Two</fig-choice>
      `;
      document.body.append(chooser);
      await new Promise(requestAnimationFrame);
      const choices = chooser.querySelectorAll("fig-choice");
      const initial = [...choices].map((choice) => ({
        ariaDisabled: choice.getAttribute("aria-disabled"),
        tabindex: choice.getAttribute("tabindex"),
      }));
      chooser.removeAttribute("disabled");
      return {
        initial,
        enabled: [...choices].map((choice) => ({
          disabled: choice.hasAttribute("disabled"),
          ariaDisabled: choice.getAttribute("aria-disabled"),
          tabindex: choice.getAttribute("tabindex"),
        })),
      };
    });

    expect(state).toEqual({
      initial: [
        { ariaDisabled: "true", tabindex: "-1" },
        { ariaDisabled: "true", tabindex: "-1" },
      ],
      enabled: [
        { disabled: false, ariaDisabled: null, tabindex: "0" },
        { disabled: true, ariaDisabled: "true", tabindex: "-1" },
      ],
    });
  });

  test("palette semantics and focus live on one disabled-aware trigger", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const palette = document.createElement("fig-input-palette") as HTMLElement & {
        focus(): void;
      };
      palette.setAttribute("value", '["#112233","#445566"]');
      document.body.append(palette);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const trigger = palette.querySelector(
        ".palette-colors-inline",
      ) as HTMLElement;
      const enabled = {
        hostTabindex: palette.getAttribute("tabindex"),
        role: trigger.getAttribute("role"),
        tabindex: trigger.getAttribute("tabindex"),
        ariaDisabled: trigger.getAttribute("aria-disabled"),
      };
      palette.focus();
      const focusedTrigger = document.activeElement === trigger;
      const triggerStyle = getComputedStyle(trigger);
      const focusOutline = {
        style: triggerStyle.outlineStyle,
        width: triggerStyle.outlineWidth,
        offset: triggerStyle.outlineOffset,
      };
      palette.setAttribute("disabled", "");
      trigger.blur();
      palette.focus();
      return {
        enabled,
        focusedTrigger,
        focusOutline,
        disabledTabindex: trigger.getAttribute("tabindex"),
        disabledAria: trigger.getAttribute("aria-disabled"),
        focusedWhileDisabled: document.activeElement === trigger,
      };
    });

    expect(state).toEqual({
      enabled: {
        hostTabindex: "-1",
        role: "button",
        tabindex: "+0",
        ariaDisabled: "false",
      },
      focusedTrigger: true,
      focusOutline: { style: "solid", width: "1px", offset: "-1px" },
      disabledTabindex: "-1",
      disabledAria: "true",
      focusedWhileDisabled: false,
    });
  });

  test("text value property, attribute, and live input synchronize without caret resets", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const text = document.createElement("fig-input-text") as HTMLElement & {
        value: string;
        input: HTMLInputElement;
      };
      text.setAttribute("value", "start");
      document.body.append(text);
      await new Promise(requestAnimationFrame);
      let inputs = 0;
      text.addEventListener("input", () => inputs++);
      text.input.focus();
      text.input.value = "starter";
      text.input.setSelectionRange(3, 3);
      text.input.dispatchEvent(new Event("input", { bubbles: true }));
      const live = {
        property: text.value,
        attribute: text.getAttribute("value"),
        rendered: text.input.value,
        caret: text.input.selectionStart,
      };
      text.value = "programmatic";
      const programmatic = {
        property: text.value,
        attribute: text.getAttribute("value"),
        rendered: text.input.value,
        inputs,
      };
      return { live, programmatic };
    });

    expect(state).toEqual({
      live: {
        property: "starter",
        attribute: "starter",
        rendered: "starter",
        caret: 3,
      },
      programmatic: {
        property: "programmatic",
        attribute: "programmatic",
        rendered: "programmatic",
        inputs: 1,
      },
    });
  });

  test("malformed color values fall back without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const state = await page.evaluate(async () => {
      const color = document.createElement("fig-input-color") as HTMLElement & {
        value: string;
        hexOpaque: string;
      };
      color.setAttribute("value", "definitely-not-a-color");
      document.body.append(color);
      await new Promise(requestAnimationFrame);
      color.setAttribute("value", "#zzzzzz");
      return {
        value: color.value,
        opaque: color.hexOpaque,
        swatch: color.querySelector("fig-swatch")?.getAttribute("background"),
      };
    });

    expect(errors).toEqual([]);
    expect(state).toEqual({
      value: "#D9D9D9",
      opaque: "#D9D9D9",
      swatch: "#D9D9D9",
    });
  });

  test("disconnect removes active handle window drag listeners", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const active = {
        pointermove: new Set<EventListenerOrEventListenerObject>(),
        pointerup: new Set<EventListenerOrEventListenerObject>(),
      };
      const add = window.addEventListener;
      const remove = window.removeEventListener;
      window.addEventListener = function (type, listener, options) {
        if (type === "pointermove" || type === "pointerup") {
          active[type].add(listener!);
        }
        return add.call(this, type, listener, options);
      };
      window.removeEventListener = function (type, listener, options) {
        if (type === "pointermove" || type === "pointerup") {
          active[type].delete(listener!);
        }
        return remove.call(this, type, listener, options);
      };
      try {
        const surface = document.createElement("div");
        surface.style.cssText =
          "position:relative;width:100px;height:100px";
        const handle = document.createElement("fig-handle");
        handle.setAttribute("drag", "true");
        surface.append(handle);
        document.body.append(surface);
        handle.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            clientX: 10,
            clientY: 10,
          }),
        );
        const during = {
          move: active.pointermove.size,
          up: active.pointerup.size,
        };
        handle.remove();
        return {
          during,
          after: {
            move: active.pointermove.size,
            up: active.pointerup.size,
          },
        };
      } finally {
        window.addEventListener = add;
        window.removeEventListener = remove;
      }
    });

    expect(state.during.move).toBeGreaterThan(0);
    expect(state.during.up).toBeGreaterThan(0);
    expect(state.after).toEqual({ move: 0, up: 0 });
  });
});
