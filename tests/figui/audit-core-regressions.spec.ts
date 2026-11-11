import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig.js audit core regressions", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("fig-button pill attribute applies the full radius token", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <fig-button id="default-button">Default</fig-button>
        <fig-button id="pill-button" pill>Pill</fig-button>
        <fig-button id="false-button" pill="false">False</fig-button>
      `;
      await new Promise(requestAnimationFrame);
      const radius = (selector: string) =>
        getComputedStyle(root.querySelector(selector)!).borderRadius;
      return {
        defaultRadius: radius("#default-button"),
        pillRadius: radius("#pill-button"),
        falseRadius: radius("#false-button"),
        fullRadiusToken: getComputedStyle(document.documentElement)
          .getPropertyValue("--radius-full")
          .trim(),
      };
    });

    expect(state.pillRadius).toBe(state.fullRadiusToken);
    expect(state.falseRadius).toBe(state.defaultRadius);
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

  test("fig-button select type generates an appended chevron", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `<fig-button id="select-button" type="select">Select</fig-button>`;
      await new Promise(requestAnimationFrame);
      const button = root.querySelector("#select-button")!;
      const read = () => {
        const icons = button.querySelectorAll(
          ':scope > fig-icon[slot="append"][data-generated="select-chevron"]',
        );
        return {
          count: icons.length,
          name: icons[0]?.getAttribute("name") ?? null,
          size: icons[0]?.getAttribute("size") ?? null,
        };
      };
      const initial = read();
      button.setAttribute("type", "button");
      const afterButton = read();
      button.setAttribute("type", "select");
      const afterSelect = read();
      const authored = document.createElement("span");
      authored.setAttribute("slot", "append");
      authored.textContent = "Custom";
      button.append(authored);
      await new Promise(requestAnimationFrame);
      const withAuthoredAppend = read();
      authored.remove();
      await new Promise(requestAnimationFrame);
      const afterAuthoredRemoved = read();
      button
        .querySelector('[data-generated="select-chevron"]')
        ?.remove();
      await new Promise(requestAnimationFrame);
      const afterChevronRemoved = read();
      const extra = document.createElement("fig-icon");
      extra.setAttribute("slot", "append");
      extra.setAttribute("data-generated", "select-chevron");
      extra.setAttribute("name", "chevron");
      button.append(extra);
      await new Promise(requestAnimationFrame);
      const afterDuplicate = read();
      return {
        initial,
        afterButton,
        afterSelect,
        withAuthoredAppend,
        afterAuthoredRemoved,
        afterChevronRemoved,
        afterDuplicate,
        shadowRoot: button.shadowRoot,
      };
    });

    expect(state).toEqual({
      initial: { count: 1, name: "chevron", size: "small" },
      afterButton: { count: 0, name: null, size: null },
      afterSelect: { count: 1, name: "chevron", size: "small" },
      withAuthoredAppend: { count: 0, name: null, size: null },
      afterAuthoredRemoved: { count: 1, name: "chevron", size: "small" },
      afterChevronRemoved: { count: 1, name: "chevron", size: "small" },
      afterDuplicate: { count: 1, name: "chevron", size: "small" },
      shadowRoot: null,
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
      const popup = menu.shadowRoot?.querySelector(
        'dialog[is="fig-popup"]',
      ) as HTMLDialogElement;
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

  test("menus close and cancel scheduled showAt work when disconnected", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const keydownListeners = new Set<EventListenerOrEventListenerObject>();
      const originalAdd = document.addEventListener.bind(document);
      const originalRemove = document.removeEventListener.bind(document);
      (document as any).addEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: AddEventListenerOptions | boolean,
      ) => {
        if (type === "keydown") keydownListeners.add(listener);
        return originalAdd(type as any, listener as any, options as any);
      };
      (document as any).removeEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: EventListenerOptions | boolean,
      ) => {
        if (type === "keydown") keydownListeners.delete(listener);
        return originalRemove(type as any, listener as any, options as any);
      };

      try {
        const openMenu = document.createElement("fig-menu") as HTMLElement & {
          open: boolean;
        };
        openMenu.innerHTML = `
          <button fig-menu-trigger>Actions</button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
        `;
        document.body.append(openMenu);
        openMenu.open = true;
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const openPopup = openMenu.shadowRoot?.querySelector(
          'dialog[is="fig-popup"]',
        ) as HTMLDialogElement;
        const opened = openPopup.open && keydownListeners.size > 0;
        openMenu.remove();

        const scheduledMenu = document.createElement("fig-menu") as HTMLElement & {
          showAt(x: number, y: number): void;
        };
        scheduledMenu.innerHTML =
          '<fig-menu-item value="copy">Copy</fig-menu-item>';
        document.body.append(scheduledMenu);
        const scheduledPopup = scheduledMenu.shadowRoot?.querySelector(
          'dialog[is="fig-popup"]',
        ) as HTMLDialogElement;
        scheduledMenu.showAt(20, 20);
        scheduledMenu.remove();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);

        return {
          opened,
          openPopupAfterDisconnect: openPopup.open,
          scheduledHostOpen: scheduledMenu.hasAttribute("open"),
          scheduledPopupOpen: scheduledPopup.open,
          documentKeydownListeners: keydownListeners.size,
        };
      } finally {
        (document as any).addEventListener = originalAdd;
        (document as any).removeEventListener = originalRemove;
      }
    });

    expect(state).toEqual({
      opened: true,
      openPopupAfterDisconnect: false,
      scheduledHostOpen: false,
      scheduledPopupOpen: false,
      documentKeydownListeners: 0,
    });
  });

  test("context menus cancel pointer-release waits when disconnected", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const keydownListeners = new Set<EventListenerOrEventListenerObject>();
      const originalAdd = document.addEventListener.bind(document);
      const originalRemove = document.removeEventListener.bind(document);
      (document as any).addEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: AddEventListenerOptions | boolean,
      ) => {
        if (type === "keydown") keydownListeners.add(listener);
        return originalAdd(type as any, listener as any, options as any);
      };
      (document as any).removeEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: EventListenerOptions | boolean,
      ) => {
        if (type === "keydown") keydownListeners.delete(listener);
        return originalRemove(type as any, listener as any, options as any);
      };

      try {
        const menu = document.createElement("fig-menu");
        menu.setAttribute("trigger", "contextmenu");
        menu.innerHTML = `
          <button fig-menu-trigger>Actions</button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
        `;
        document.body.append(menu);
        const trigger = menu.querySelector("[fig-menu-trigger]") as HTMLElement;
        const popup = menu.shadowRoot?.querySelector(
          'dialog[is="fig-popup"]',
        ) as HTMLDialogElement;
        trigger.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: 30,
            clientY: 40,
          }),
        );
        menu.remove();
        window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 220));
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);

        return {
          hostOpen: menu.hasAttribute("open"),
          popupOpen: popup.open,
          documentKeydownListeners: keydownListeners.size,
        };
      } finally {
        (document as any).addEventListener = originalAdd;
        (document as any).removeEventListener = originalRemove;
      }
    });

    expect(state).toEqual({
      hostOpen: false,
      popupOpen: false,
      documentKeydownListeners: 0,
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
      focusOutline: { style: "solid", width: "1px", offset: "1px" },
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

  test("fig-truncate re-renders on text changes and syncs tooltip attribute", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div style="width:40px">
          <fig-truncate id="trunc" position="middle" tail=".png">
            original-name.png
          </fig-truncate>
        </div>
      `;
      const frame = () => new Promise(requestAnimationFrame);
      const tick = () => new Promise((r) => setTimeout(r, 0));
      await frame();
      await frame();
      const el = root.querySelector("#trunc") as HTMLElement;
      const parts = () => ({
        start: el.querySelector(".start")?.textContent ?? null,
        end: el.querySelector(".end")?.textContent ?? null,
      });

      const Tooltip = customElements.get("fig-tooltip") as any;
      const shown: string[] = [];
      const show = Tooltip.show;
      Tooltip.show = (_anchor: Element, text: string) => shown.push(text);
      const hover = () => {
        el.dispatchEvent(new PointerEvent("pointerenter"));
        el.dispatchEvent(new PointerEvent("pointerleave"));
      };

      try {
        el.textContent = "replaced-file.png";
        await tick();
        const afterTextContent = parts();

        el.firstChild!.firstChild!.nodeValue = "edited-";
        await tick();
        const afterCharacterData = parts();

        el.setAttribute("tail", "-");
        const afterTail = parts();

        hover();
        el.setAttribute("tooltip", "");
        hover();
        el.setAttribute("tooltip", "false");
        hover();

        el.setAttribute("tooltip", "");
        (el.parentElement as HTMLElement).style.width = "400px";
        hover();

        return { afterTextContent, afterCharacterData, afterTail, shown };
      } finally {
        Tooltip.show = show;
      }
    });

    expect(state.afterTextContent).toEqual({
      start: "replaced-file",
      end: ".png",
    });
    expect(state.afterCharacterData).toEqual({
      start: "edited-",
      end: ".png",
    });
    expect(state.afterTail).toEqual({ start: "edited", end: "-.png" });
    expect(state.shown).toEqual(["edited-.png"]);
  });

  test("fig-truncate maps fade overflow to its truncation edge", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <fig-truncate id="trunc" overflow="fade">
          a-very-long-file-name.png
        </fig-truncate>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const el = root.querySelector("#trunc") as HTMLElement;
      const classes = (target: Element) => [...target.classList].sort();
      const leftFade = (target: Element) => {
        const style = getComputedStyle(target);
        return {
          size: style.getPropertyValue("--fig-overflow-fade-left").trim(),
          opacity: style
            .getPropertyValue("--fig-overflow-fade-left-opacity")
            .trim(),
        };
      };

      const right = classes(el);
      el.setAttribute("position", "left");
      const left = classes(el);
      const leftFadeState = leftFade(el);
      el.setAttribute("position", "middle");
      const middle = {
        host: classes(el),
        start: classes(el.querySelector(".start")!),
        end: classes(el.querySelector(".end")!),
        endFade: leftFade(el.querySelector(".end")!),
      };
      el.setAttribute("overflow", "ellipsis");
      const ellipsis = {
        host: classes(el),
        start: classes(el.querySelector(".start")!),
        end: classes(el.querySelector(".end")!),
      };

      return { right, left, leftFadeState, middle, ellipsis };
    });

    expect(state.right).toEqual([
      "fig-overflow-fade",
      "fig-overflow-fade-right",
    ]);
    expect(state.left).toEqual([
      "fig-overflow-fade",
      "fig-overflow-fade-left",
    ]);
    expect(state.leftFadeState).toEqual({ size: "32px", opacity: "0" });
    expect(state.middle).toEqual({
      host: [],
      start: ["fig-overflow-fade", "fig-overflow-fade-right", "start"],
      end: ["end", "fig-overflow-fade", "fig-overflow-fade-left"],
      endFade: { size: "32px", opacity: "0" },
    });
    expect(state.ellipsis).toEqual({
      host: [],
      start: ["start"],
      end: ["end"],
    });
  });

  test("tooltip wraps long unbroken text without truncating it", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `<button id="anchor">Anchor</button>`;
      const anchor = root.querySelector("#anchor") as HTMLElement;
      const Tooltip = customElements.get("fig-tooltip") as any;
      Tooltip.show(anchor, "a".repeat(200), { delay: 0 });
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise(requestAnimationFrame);

      const content = document.querySelector(
        'dialog[variant="tooltip"][data-tooltip-managed] > span',
      ) as HTMLElement;
      const style = getComputedStyle(content);
      const result = {
        whiteSpace: style.whiteSpace,
        overflowWrap: style.overflowWrap,
        lineClamp: style.webkitLineClamp,
        maxHeight: style.maxHeight,
        fitsWidth: content.scrollWidth <= content.clientWidth,
        fitsHeight: content.scrollHeight <= content.clientHeight,
      };
      Tooltip.hide(anchor);
      return result;
    });

    expect(state).toEqual({
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      lineClamp: "none",
      maxHeight: "none",
      fitsWidth: true,
      fitsHeight: true,
    });
  });

  test("fig-easing-curve cleans up canceled and disconnected drags", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <fig-easing-curve
          id="curve"
          value="0.25, 0.25, 0.75, 0.75"
        ></fig-easing-curve>
      `;
      await new Promise(requestAnimationFrame);

      const curve = root.querySelector("#curve") as HTMLElement;
      const handle = curve.querySelector(
        '[data-handle="1"] fig-handle',
      ) as HTMLElement;
      const rect = handle.getBoundingClientRect();
      const point = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      let inputs = 0;
      let changes = 0;
      curve.addEventListener("input", () => inputs++);
      curve.addEventListener("change", () => changes++);

      const dispatch = (
        target: EventTarget,
        type: string,
        x = point.x,
        y = point.y,
      ) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 42,
            clientX: x,
            clientY: y,
          }),
        );

      dispatch(handle, "pointerdown");
      dispatch(document, "pointermove", point.x + 20, point.y + 10);
      const inputsBeforeCancel = inputs;
      dispatch(document, "pointercancel");
      dispatch(document, "pointermove", point.x + 40, point.y + 20);
      const afterCancel = {
        inputs,
        changes,
        armActive: curve
          .querySelector('[data-arm="1"]')
          ?.classList.contains("is-active"),
        tooltipOpen: curve
          .querySelector('[data-handle="1"] fig-tooltip')
          ?.hasAttribute("show"),
      };

      dispatch(handle, "pointerdown");
      dispatch(document, "pointerup");
      const afterComplete = { inputs, changes };

      dispatch(handle, "pointerdown");
      window.dispatchEvent(new Event("blur"));
      dispatch(document, "pointermove", point.x + 60, point.y + 30);
      const afterBlur = { inputs, changes };

      dispatch(handle, "pointerdown");
      curve.remove();
      dispatch(document, "pointermove", point.x + 80, point.y + 40);

      return {
        inputsBeforeCancel,
        afterCancel,
        afterComplete,
        afterBlur,
        afterDisconnect: { inputs, changes },
      };
    });

    expect(state).toEqual({
      inputsBeforeCancel: 1,
      afterCancel: {
        inputs: 1,
        changes: 0,
        armActive: false,
        tooltipOpen: false,
      },
      afterComplete: { inputs: 1, changes: 1 },
      afterBlur: { inputs: 1, changes: 1 },
      afterDisconnect: { inputs: 1, changes: 1 },
    });
  });

  test("public events cross ancestor shadow roots with stable event flags", async ({
    page,
  }) => {
    const events = await page.evaluate(async () => {
      await import("/fig-editor.js");
      await Promise.all([
        customElements.whenDefined("fig-input-color"),
        customElements.whenDefined("fig-palette-editor"),
        customElements.whenDefined("fig-input-rotate"),
      ]);

      const boundary = document.createElement("div");
      const shadow = boundary.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <fig-input-color
          id="color"
          value="#000000"
          default="#FFFFFF"
        ></fig-input-color>
        <fig-palette-editor
          id="palette"
          value='["#111111"]'
        ></fig-palette-editor>
        <fig-input-rotate id="rotate"></fig-input-rotate>
      `;
      document.body.append(boundary);
      await new Promise(requestAnimationFrame);

      const captured: Array<{
        source: string;
        type: string;
        bubbles: boolean;
        composed: boolean;
        cancelable: boolean;
      }> = [];
      const capture = (event: Event) => {
        const source = event
          .composedPath()
          .find((node) => node instanceof HTMLElement && node.id);
        captured.push({
          source: source instanceof HTMLElement ? source.id : "",
          type: event.type,
          bubbles: event.bubbles,
          composed: event.composed,
          cancelable: event.cancelable,
        });
      };
      document.addEventListener("input", capture);
      document.addEventListener("change", capture);
      document.addEventListener("openchange", capture);

      try {
        const color = shadow.querySelector("#color") as HTMLElement & {
          resetToDefault(): void;
        };
        const palette = shadow.querySelector("#palette") as HTMLElement;
        const rotate = shadow.querySelector("#rotate") as HTMLElement & {
          open: boolean;
        };
        color.resetToDefault();
        (
          palette.querySelector(".fig-palette-editor-add") as HTMLElement
        ).click();
        rotate.open = true;
        return captured;
      } finally {
        document.removeEventListener("input", capture);
        document.removeEventListener("change", capture);
        document.removeEventListener("openchange", capture);
        boundary.remove();
      }
    });

    expect(events).toEqual([
      {
        source: "color",
        type: "input",
        bubbles: true,
        composed: true,
        cancelable: true,
      },
      {
        source: "color",
        type: "change",
        bubbles: true,
        composed: true,
        cancelable: true,
      },
      {
        source: "palette",
        type: "input",
        bubbles: true,
        composed: true,
        cancelable: false,
      },
      {
        source: "palette",
        type: "change",
        bubbles: true,
        composed: true,
        cancelable: false,
      },
      {
        source: "rotate",
        type: "openchange",
        bubbles: true,
        composed: true,
        cancelable: false,
      },
    ]);
  });

  test("fig-layer reconnects its chevron and emits each state change once", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <fig-layer id="layer" open="false">
          <div class="fig-layer-row">Layer</div>
        </fig-layer>
      `;
      const frame = () => new Promise(requestAnimationFrame);
      await frame();

      const layer = root.querySelector("#layer") as HTMLElement & {
        open: boolean;
        visible: boolean;
      };
      const openEvents: boolean[] = [];
      const visibilityEvents: boolean[] = [];
      layer.addEventListener("openchange", (event) => {
        openEvents.push((event as CustomEvent<{ open: boolean }>).detail.open);
      });
      layer.addEventListener("visibilitychange", (event) => {
        visibilityEvents.push(
          (event as CustomEvent<{ visible: boolean }>).detail.visible,
        );
      });

      layer.open = true;
      layer.open = true;
      layer.setAttribute("open", "false");
      layer.visible = false;
      layer.visible = false;

      for (let index = 0; index < 2; index++) {
        layer.remove();
        root.append(layer);
        await frame();
      }

      const chevron = layer.querySelector(
        ".fig-layer-chevron",
      ) as HTMLElement;
      chevron.click();

      return {
        open: layer.open,
        visible: layer.visible,
        openEvents,
        visibilityEvents,
        chevrons: layer.querySelectorAll(".fig-layer-chevron").length,
        chevronExpanded: chevron.getAttribute("aria-expanded"),
      };
    });

    expect(state).toEqual({
      open: true,
      visible: false,
      openEvents: [true, false, true],
      visibilityEvents: [false],
      chevrons: 1,
      chevronExpanded: "true",
    });
  });

  test("native form reset restores host state and authored control baselines", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <form id="form">
          <fig-input-text id="text" name="text" value="Authored"></fig-input-text>
          <fig-input-number id="number" name="amount" value="12" transform="2" units="%"></fig-input-number>
          <fig-checkbox id="checkbox" name="check" value="yes" checked></fig-checkbox>
          <fig-radio id="radio-a" name="choice" value="a" checked></fig-radio>
          <fig-radio id="radio-b" name="choice" value="b"></fig-radio>
          <fig-switch id="switch" name="toggle" value="on"></fig-switch>
        </form>
      `;
      await new Promise(requestAnimationFrame);

      const form = root.querySelector("#form") as HTMLFormElement;
      const text = root.querySelector("#text") as HTMLElement & {
        value: string;
        input: HTMLInputElement;
      };
      const number = root.querySelector("#number") as HTMLElement & {
        value: number | string;
        input: HTMLInputElement;
      };
      const checkbox = root.querySelector("#checkbox") as HTMLElement & {
        checked: boolean;
        input: HTMLInputElement;
      };
      const radioA = root.querySelector("#radio-a") as HTMLElement & {
        checked: boolean;
        input: HTMLInputElement;
      };
      const radioB = root.querySelector("#radio-b") as HTMLElement & {
        checked: boolean;
        input: HTMLInputElement;
      };
      const toggle = root.querySelector("#switch") as HTMLElement & {
        checked: boolean;
        input: HTMLInputElement;
      };

      let inputs = 0;
      let changes = 0;
      form.addEventListener("input", () => inputs++);
      form.addEventListener("change", () => changes++);

      text.input.value = "Edited";
      text.input.dispatchEvent(new Event("input", { bubbles: true }));
      number.input.value = "40%";
      number.input.dispatchEvent(new Event("input", { bubbles: true }));
      checkbox.input.click();
      radioB.input.click();
      toggle.input.click();

      const beforeFirstReset = { inputs, changes };
      form.reset();
      await Promise.resolve();
      const afterFirstResetEvents = { inputs, changes };

      const read = () => ({
        text: {
          property: text.value,
          attribute: text.getAttribute("value"),
          native: text.input.value,
          nativeDefault: text.input.defaultValue,
        },
        number: {
          property: number.value,
          attribute: number.getAttribute("value"),
          native: number.input.value,
          nativeDefault: number.input.defaultValue,
        },
        checkbox: {
          property: checkbox.checked,
          attribute: checkbox.hasAttribute("checked"),
          native: checkbox.input.checked,
          nativeDefault: checkbox.input.defaultChecked,
        },
        radios: [
          {
            property: radioA.checked,
            attribute: radioA.hasAttribute("checked"),
            native: radioA.input.checked,
          },
          {
            property: radioB.checked,
            attribute: radioB.hasAttribute("checked"),
            native: radioB.input.checked,
          },
        ],
        toggle: {
          property: toggle.checked,
          attribute: toggle.hasAttribute("checked"),
          native: toggle.input.checked,
          nativeDefault: toggle.input.defaultChecked,
        },
        formData: Object.fromEntries(new FormData(form)),
      });

      const initialReset = read();

      text.setAttribute("value", "Revised");
      number.setAttribute("value", "7");
      checkbox.removeAttribute("checked");
      toggle.setAttribute("checked", "");

      text.value = "Temporary";
      number.input.value = "18%";
      number.input.dispatchEvent(new Event("input", { bubbles: true }));
      checkbox.checked = true;
      toggle.checked = false;

      const beforeSecondReset = { inputs, changes };
      form.reset();
      await Promise.resolve();

      return {
        beforeFirstReset,
        afterFirstResetEvents,
        initialReset,
        beforeSecondReset,
        afterSecondResetEvents: { inputs, changes },
        updatedReset: read(),
      };
    });

    expect(state.afterFirstResetEvents).toEqual(state.beforeFirstReset);
    expect(state.initialReset).toEqual({
      text: {
        property: "Authored",
        attribute: "Authored",
        native: "Authored",
        nativeDefault: "Authored",
      },
      number: {
        property: 12,
        attribute: "12",
        native: "24%",
        nativeDefault: "24%",
      },
      checkbox: {
        property: true,
        attribute: true,
        native: true,
        nativeDefault: true,
      },
      radios: [
        { property: true, attribute: true, native: true },
        { property: false, attribute: false, native: false },
      ],
      toggle: {
        property: false,
        attribute: false,
        native: false,
        nativeDefault: false,
      },
      formData: {
        text: "Authored",
        amount: "24%",
        check: "yes",
        choice: "a",
      },
    });
    expect(state.afterSecondResetEvents).toEqual(state.beforeSecondReset);
    expect(state.updatedReset.text).toEqual({
      property: "Revised",
      attribute: "Revised",
      native: "Revised",
      nativeDefault: "Revised",
    });
    expect(state.updatedReset.number).toEqual({
      property: 7,
      attribute: "7",
      native: "14%",
      nativeDefault: "14%",
    });
    expect(state.updatedReset.checkbox).toEqual({
      property: false,
      attribute: false,
      native: false,
      nativeDefault: false,
    });
    expect(state.updatedReset.toggle).toEqual({
      property: true,
      attribute: true,
      native: true,
      nativeDefault: true,
    });
  });

  test("popup transitions keep the latest open state and synchronize native closes", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <button id="rapid-anchor">Rapid anchor</button>
        <dialog id="rapid-popup" is="fig-popup" anchor="#rapid-anchor">
          <button id="rapid-inside">Inside</button>
        </dialog>
        <button id="native-anchor">Native anchor</button>
        <dialog id="native-popup" is="fig-popup" anchor="#native-anchor">
          <button id="native-inside">Inside</button>
        </dialog>
      `;
      const frame = () => new Promise(requestAnimationFrame);
      const task = () => new Promise((resolve) => setTimeout(resolve, 0));

      const rapidAnchor = root.querySelector("#rapid-anchor") as HTMLElement;
      const rapidPopup = root.querySelector("#rapid-popup") as HTMLDialogElement & {
        open: boolean;
      };
      const rapidInside = root.querySelector("#rapid-inside") as HTMLElement;
      rapidAnchor.focus();
      rapidPopup.open = true;
      rapidInside.focus();
      rapidPopup.open = false;
      rapidPopup.open = true;
      rapidInside.focus();
      await task();
      await frame();
      await frame();
      const rapid = {
        attributeOpen: rapidPopup.getAttribute("open"),
        nativeOpen: rapidPopup.matches(":open"),
        focusInside: rapidPopup.contains(document.activeElement),
      };

      const nativeAnchor = root.querySelector("#native-anchor") as HTMLElement;
      const nativePopup = root.querySelector("#native-popup") as HTMLDialogElement & {
        open: boolean;
        requestClose?: () => void;
      };
      const nativeInside = root.querySelector("#native-inside") as HTMLElement;
      let closes = 0;
      let cancels = 0;
      nativePopup.addEventListener("close", () => closes++);
      nativePopup.addEventListener("cancel", () => cancels++);

      nativeAnchor.focus();
      nativePopup.open = true;
      nativeInside.focus();
      nativePopup.close();
      await task();
      await frame();
      const afterClose = {
        attributeOpen: nativePopup.hasAttribute("open"),
        nativeOpen: nativePopup.matches(":open"),
        focusRestored: document.activeElement === nativeAnchor,
        closes,
      };

      nativeAnchor.focus();
      nativePopup.open = true;
      nativeInside.focus();
      const supportsRequestClose =
        typeof nativePopup.requestClose === "function";
      nativePopup.requestClose?.();
      await task();
      await frame();
      return {
        rapid,
        afterClose,
        afterRequestClose: {
          supportsRequestClose,
          attributeOpen: nativePopup.hasAttribute("open"),
          nativeOpen: nativePopup.matches(":open"),
          focusRestored: document.activeElement === nativeAnchor,
          closes,
          cancels,
        },
      };
    });

    expect(state).toEqual({
      rapid: {
        attributeOpen: "true",
        nativeOpen: true,
        focusInside: true,
      },
      afterClose: {
        attributeOpen: false,
        nativeOpen: false,
        focusRestored: true,
        closes: 1,
      },
      afterRequestClose: {
        supportsRequestClose: true,
        attributeOpen: false,
        nativeOpen: false,
        focusRestored: true,
        closes: 2,
        cancels: 1,
      },
    });
  });

  test("menu transition races honor the latest close or disabled state", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const createMenu = (id: string) => {
        const menu = document.createElement("fig-menu") as HTMLElement & {
          open: boolean;
          showAt(x: number, y: number): void;
        };
        menu.id = id;
        menu.innerHTML = `
          <button fig-menu-trigger>Actions</button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
        `;
        document.body.append(menu);
        return menu;
      };
      const settle = async () => {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      };
      const read = (menu: HTMLElement & { open: boolean }) => {
        const popup = menu.shadowRoot?.querySelector(
          'dialog[is="fig-popup"]',
        ) as HTMLDialogElement;
        const trigger = menu.querySelector(
          "[fig-menu-trigger]",
        ) as HTMLElement;
        return {
          hostOpen: menu.open,
          popupOpen: popup.matches(":open"),
          expanded: trigger.getAttribute("aria-expanded"),
        };
      };

      const closed = createMenu("scheduled-close");
      closed.showAt(20, 20);
      closed.open = false;
      await settle();

      const disabled = createMenu("scheduled-disabled");
      disabled.showAt(30, 30);
      disabled.setAttribute("disabled", "");
      await settle();

      const rapid = createMenu("rapid-menu");
      rapid.open = true;
      rapid.open = false;
      rapid.open = true;
      await settle();

      return {
        closed: read(closed),
        disabled: read(disabled),
        rapid: read(rapid),
      };
    });

    expect(state).toEqual({
      closed: { hostOpen: false, popupOpen: false, expanded: "false" },
      disabled: { hostOpen: false, popupOpen: false, expanded: "false" },
      rapid: { hostOpen: true, popupOpen: true, expanded: "true" },
    });
  });

  test("handle pointer cancellation aborts and a completed drag commits once", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const surface = document.createElement("div");
      surface.style.cssText =
        "position:relative;width:200px;height:120px;margin:20px";
      const handle = document.createElement("fig-handle");
      handle.setAttribute("drag", "true");
      handle.setAttribute("value", "25% 25%");
      surface.append(handle);
      document.body.append(surface);
      await new Promise(requestAnimationFrame);

      let inputs = 0;
      let changes = 0;
      handle.addEventListener("input", () => inputs++);
      handle.addEventListener("change", () => changes++);
      const rect = handle.getBoundingClientRect();
      const dispatch = (
        target: EventTarget,
        type: string,
        pointerId: number,
        x: number,
        y: number,
      ) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
            pointerId,
            clientX: x,
            clientY: y,
          }),
        );

      dispatch(handle, "pointerdown", 41, rect.left, rect.top);
      dispatch(window, "pointermove", 41, rect.left + 30, rect.top + 20);
      const beforeCancel = { inputs, changes };
      dispatch(window, "pointercancel", 41, rect.left + 30, rect.top + 20);
      dispatch(window, "pointermove", 41, rect.left + 60, rect.top + 40);
      dispatch(window, "pointerup", 41, rect.left + 60, rect.top + 40);
      const afterCancel = {
        inputs,
        changes,
        dragging: handle.classList.contains("dragging"),
      };

      inputs = 0;
      changes = 0;
      const next = handle.getBoundingClientRect();
      dispatch(handle, "pointerdown", 42, next.left, next.top);
      dispatch(window, "pointermove", 42, next.left + 25, next.top + 15);
      dispatch(window, "pointerup", 42, next.left + 25, next.top + 15);
      dispatch(window, "pointerup", 42, next.left + 25, next.top + 15);

      return {
        beforeCancel,
        afterCancel,
        completed: { inputs, changes },
      };
    });

    expect(state.beforeCancel.inputs).toBeGreaterThan(0);
    expect(state.beforeCancel.changes).toBe(0);
    expect.soft(state.afterCancel).toEqual({
      ...state.beforeCancel,
      dragging: false,
    });
    expect(state.completed.inputs).toBeGreaterThan(0);
    expect(state.completed.changes).toBe(1);
  });

  test("disabling or disconnecting a handle aborts its active gesture", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const run = async (transition: "disable" | "disconnect") => {
        const surface = document.createElement("div");
        surface.style.cssText =
          "position:relative;width:200px;height:120px;margin:20px";
        const handle = document.createElement("fig-handle");
        handle.setAttribute("drag", "true");
        handle.setAttribute("value", "25% 25%");
        surface.append(handle);
        document.body.append(surface);
        await new Promise(requestAnimationFrame);

        let inputs = 0;
        let changes = 0;
        handle.addEventListener("input", () => inputs++);
        handle.addEventListener("change", () => changes++);
        const rect = handle.getBoundingClientRect();
        const event = (type: string, x: number, y: number) =>
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            pointerId: transition === "disable" ? 51 : 52,
            clientX: x,
            clientY: y,
          });
        handle.dispatchEvent(event("pointerdown", rect.left, rect.top));
        window.dispatchEvent(
          event("pointermove", rect.left + 25, rect.top + 15),
        );
        const beforeTransition = { inputs, changes };

        if (transition === "disable") handle.setAttribute("disabled", "");
        else handle.remove();

        window.dispatchEvent(
          event("pointermove", rect.left + 50, rect.top + 30),
        );
        window.dispatchEvent(
          event("pointerup", rect.left + 50, rect.top + 30),
        );
        return {
          beforeTransition,
          afterTransition: {
            inputs,
            changes,
            dragging: handle.classList.contains("dragging"),
          },
        };
      };

      return {
        disabled: await run("disable"),
        disconnected: await run("disconnect"),
      };
    });

    for (const result of [state.disabled, state.disconnected]) {
      expect(result.beforeTransition.inputs).toBeGreaterThan(0);
      expect(result.beforeTransition.changes).toBe(0);
      expect.soft(result.afterTransition).toEqual({
        ...result.beforeTransition,
        dragging: false,
      });
    }
  });
});
