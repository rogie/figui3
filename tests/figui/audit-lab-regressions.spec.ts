import { expect, test } from "@playwright/test";
import { collectPageErrors } from "./helpers";

async function bootLab(page: import("@playwright/test").Page) {
  await page.goto("/tests/figui/fixture-lab.html");
  await page.waitForFunction(() => customElements.get("fig-input-angle"));
}

test.describe("fig-lab audit regressions", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootLab(page);
  });

  test("point-point hit line tracks the visible line", async ({ page }) => {
    const coordinates = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div style="position:relative;width:200px;height:100px">
          <fig-canvas-control type="point-point"
            value='{"x":10,"y":20,"x2":80,"y2":70}'></fig-canvas-control>
        </div>`;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("fig-canvas-control")!;
      const read = (selector: string) => {
        const line = host.querySelector(selector)!;
        return ["x1", "y1", "x2", "y2"].map((name) => line.getAttribute(name));
      };
      return {
        hit: read(".fig-canvas-control-angle-line-hit"),
        visible: read(".fig-canvas-control-angle-line"),
      };
    });

    expect(coordinates.hit).toEqual(coordinates.visible);
    expect(coordinates.hit).toEqual(["20", "20", "160", "70"]);
  });

  test("angle dial exposes slider semantics, clamps, reflects, and separates input/change", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const angle = document.createElement("fig-input-angle") as HTMLElement & {
        value: number;
      };
      angle.setAttribute("aria-label", "Rotation");
      angle.setAttribute("min", "10");
      angle.setAttribute("max", "20");
      angle.setAttribute("value", "15");
      document.body.append(angle);
      await new Promise(requestAnimationFrame);
      const plane = angle.querySelector(".fig-input-angle-plane") as HTMLElement;
      const events = { input: 0, change: 0 };
      angle.addEventListener("input", () => events.input++);
      angle.addEventListener("change", () => events.change++);

      plane.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      const afterEnd = {
        value: angle.value,
        attr: angle.getAttribute("value"),
        now: plane.getAttribute("aria-valuenow"),
        events: { ...events },
      };
      angle.value = 100;
      const clamped = { value: angle.value, attr: angle.getAttribute("value") };
      angle.setAttribute("disabled", "");
      const disabledPlane = angle.querySelector(
        ".fig-input-angle-plane",
      ) as HTMLElement;
      disabledPlane.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
      );
      return {
        role: disabledPlane.getAttribute("role"),
        name: disabledPlane.getAttribute("aria-label"),
        min: disabledPlane.getAttribute("aria-valuemin"),
        max: disabledPlane.getAttribute("aria-valuemax"),
        disabled: disabledPlane.getAttribute("aria-disabled"),
        tabIndex: disabledPlane.tabIndex,
        afterEnd,
        clamped,
        finalValue: angle.value,
      };
    });

    expect(state).toMatchObject({
      role: "slider",
      name: "Rotation",
      min: "10",
      max: "20",
      disabled: "true",
      tabIndex: -1,
      afterEnd: {
        value: 20,
        attr: "20",
        now: "20",
        events: { input: 1, change: 1 },
      },
      clamped: { value: 20, attr: "20" },
      finalValue: 20,
    });
  });

  test("angle text input emits live input without a live change", async ({ page }) => {
    const events = await page.evaluate(async () => {
      const angle = document.createElement("fig-input-angle");
      angle.setAttribute("text", "true");
      document.body.append(angle);
      await new Promise(requestAnimationFrame);
      const input = angle.querySelector("fig-input-number") as HTMLElement & {
        value: number;
      };
      const counts = { input: 0, change: 0 };
      angle.addEventListener("input", () => counts.input++);
      angle.addEventListener("change", () => counts.change++);
      input.value = 12;
      input.dispatchEvent(new CustomEvent("input", { bubbles: true, detail: 12 }));
      const live = { ...counts };
      input.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: 12 }));
      return { live, committed: counts };
    });

    expect(events.live).toEqual({ input: 1, change: 0 });
    expect(events.committed).toEqual({ input: 1, change: 1 });
  });

  test("reorder handles support keyboard moves and polite announcements", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const reorder = document.createElement("fig-reorder");
      reorder.setAttribute("handle", ".drag");
      reorder.innerHTML = `
        <div><button class="drag">Alpha</button></div>
        <div><button class="drag">Beta</button></div>
        <div><button class="drag">Gamma</button></div>`;
      document.body.append(reorder);
      await new Promise(requestAnimationFrame);
      const firstHandle = reorder.querySelector(".drag") as HTMLElement;
      firstHandle.focus();
      firstHandle.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      await new Promise(requestAnimationFrame);
      return {
        hostRole: reorder.getAttribute("role"),
        itemRoles: [...reorder.querySelectorAll("[data-reorder-item]")].map((item) =>
          item.getAttribute("role"),
        ),
        order: [...reorder.querySelectorAll("[data-reorder-item]")].map((item) =>
          item.textContent?.trim(),
        ),
        handleName: firstHandle.getAttribute("aria-label"),
        focused: document.activeElement === firstHandle,
        live: document.querySelector('[data-reorder-live]')?.textContent,
      };
    });

    expect(state).toEqual({
      hostRole: "list",
      itemRoles: ["listitem", "listitem", "listitem"],
      order: ["Beta", "Alpha", "Gamma"],
      handleName: "Move Alpha",
      focused: true,
      live: "Alpha, position 2 of 3",
    });
  });

  test("select reconnect and selected mutations stay synchronized", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const select = document.createElement("fig-select") as HTMLElement & {
        value: string;
        open: boolean;
      };
      select.innerHTML = `
        <fig-select-options>
          <fig-select-option value="one" selected>One</fig-select-option>
          <fig-select-option value="two">Two</fig-select-option>
        </fig-select-options>`;
      document.body.append(select);
      await new Promise(requestAnimationFrame);
      select.remove();
      document.body.append(select);
      await new Promise(requestAnimationFrame);
      const trigger = select.shadowRoot!.querySelector(".fig-select-trigger") as HTMLElement;
      trigger.click();
      await new Promise(queueMicrotask);
      const opened = select.open;
      (select.querySelector('[value="two"]') as HTMLElement).click();
      await new Promise(queueMicrotask);
      const afterClick = select.value;
      (select.querySelector('[value="one"]') as HTMLElement & {
        selected: boolean;
      }).selected = true;
      await new Promise(queueMicrotask);
      return {
        opened,
        afterClick,
        value: select.value,
        selected: [...select.querySelectorAll("fig-select-option")]
          .filter((option) => option.hasAttribute("selected"))
          .map((option) => option.getAttribute("value")),
      };
    });

    expect(state).toEqual({
      opened: true,
      afterClick: "two",
      value: "one",
      selected: ["one"],
    });
  });

  test("propskit setters and slider forwarding update host state synchronously", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const group = document.createElement("propskit-group");
      group.setAttribute("open", "true");
      group.innerHTML = `
        <propskit-switch label="Enabled"></propskit-switch>
        <propskit-text label="Name" value="old"></propskit-text>
        <propskit-number label="Count" value="1"></propskit-number>
        <propskit-slider label="Amount" value="10" min="0" max="100"></propskit-slider>`;
      document.body.append(group);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const toggle = group.querySelector("propskit-switch") as HTMLElement & {
        checked: boolean;
      };
      const text = group.querySelector("propskit-text") as HTMLElement & { value: string };
      const number = group.querySelector("propskit-number") as HTMLElement & {
        value: number;
      };
      const slider = group.querySelector("propskit-slider") as HTMLElement & {
        value: string;
      };
      toggle.checked = true;
      text.value = "new";
      number.value = 7;
      let seenHostValue = "";
      slider.addEventListener("input", () => {
        seenHostValue = slider.getAttribute("value") ?? "";
      });
      const inner = slider.querySelector("fig-slider") as HTMLElement & { value: string };
      inner.value = "75";
      inner.dispatchEvent(new CustomEvent("input", { bubbles: true, detail: "75" }));
      const sliderField = slider.querySelector("fig-field") as HTMLElement;
      sliderField.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const range = slider.querySelector('input[type="range"]') as HTMLInputElement;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return {
        checked: toggle.checked,
        text: text.value,
        number: number.value,
        slider: slider.value,
        seenHostValue,
        dirty: group.hasAttribute("data-dirty"),
        rangeFocused:
          document.activeElement === slider.querySelector('input[type="range"]'),
        rangeHidden: range.getAttribute("aria-hidden"),
        rangeLabel: range.getAttribute("aria-label"),
      };
    });

    expect(state).toEqual({
      checked: true,
      text: "new",
      number: 7,
      slider: "75",
      seenHostValue: "75",
      dirty: true,
      rangeFocused: true,
      rangeHidden: null,
      rangeLabel: "Amount",
    });
  });

  test("oscillator edit=false is noninteractive and active gestures cancel on rerender", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const oscillator = document.createElement("propskit-oscillator");
      document.body.append(oscillator);
      await new Promise(requestAnimationFrame);
      let inputs = 0;
      oscillator.addEventListener("input", () => inputs++);
      const surface = oscillator.querySelector(
        ".propskit-oscillator-svg-container",
      ) as HTMLElement;
      surface.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 9,
          clientX: 20,
          clientY: 20,
        }),
      );
      oscillator.setAttribute("edit", "false");
      document.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 9,
          clientX: 80,
          clientY: 80,
        }),
      );
      return {
        inputs,
        handles: oscillator.querySelectorAll(".propskit-oscillator-handle").length,
        controls: oscillator.querySelectorAll(".propskit-oscillator-waves").length,
      };
    });

    expect(state).toEqual({ inputs: 0, handles: 0, controls: 0 });
  });

  test("oscillator add-form selector preserves rich options and inserts waves", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const oscillator = document.createElement("propskit-oscillator") as HTMLElement & {
        data: { waves: Array<{ type: string }> };
      };
      document.body.append(oscillator);
      await new Promise(requestAnimationFrame);

      const select = oscillator.querySelector(
        ".propskit-oscillator-add-type",
      ) as HTMLElement;
      const options = [...select.querySelectorAll("fig-select-option")];
      (select.querySelector('fig-select-option[value="triangle"]') as HTMLElement).click();
      await new Promise(requestAnimationFrame);

      return {
        tag: select.tagName,
        optionCount: options.length,
        icons: options.filter((option) => option.querySelector("svg")).length,
        waveTypes: oscillator.data.waves.map((wave) => wave.type),
      };
    });

    expect(state).toEqual({
      tag: "FIG-SELECT",
      optionCount: 4,
      icons: 4,
      waveTypes: ["sine", "triangle"],
    });
  });

  test("canvas and angle gestures stop after disable or disconnect", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const surface = document.createElement("div");
      surface.style.cssText = "position:relative;width:200px;height:100px";
      surface.innerHTML = `<fig-canvas-control type="point-point"
        value='{"x":10,"y":20,"x2":80,"y2":70}'></fig-canvas-control>`;
      document.body.append(surface);
      const canvas = surface.firstElementChild as HTMLElement;
      await new Promise(requestAnimationFrame);
      const line = canvas.querySelector(
        ".fig-canvas-control-angle-line-hit",
      ) as SVGLineElement;
      line.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 3,
          clientX: 40,
          clientY: 30,
        }),
      );
      canvas.setAttribute("disabled", "");
      const canvasValue = canvas.getAttribute("value");
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerId: 3,
          clientX: 120,
          clientY: 80,
        }),
      );

      const angle = document.createElement("fig-input-angle");
      document.body.append(angle);
      await new Promise(requestAnimationFrame);
      let angleInputs = 0;
      angle.addEventListener("input", () => angleInputs++);
      const plane = angle.querySelector(".fig-input-angle-plane") as HTMLElement;
      plane.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          button: 0,
          clientX: 10,
          clientY: 10,
        }),
      );
      angle.remove();
      const beforeMove = angleInputs;
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 100, clientY: 100 }),
      );
      return {
        canvasStable: canvas.getAttribute("value") === canvasValue,
        angleStable: angleInputs === beforeMove,
      };
    });

    expect(state).toEqual({ canvasStable: true, angleStable: true });
  });

  test("slider reset reconnects and group uses sibling disclosure/reset controls", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const slider = document.createElement("propskit-slider") as HTMLElement & {
        value: string;
      };
      slider.setAttribute("value", "70");
      slider.setAttribute("default", "25");
      document.body.append(slider);
      await new Promise(requestAnimationFrame);
      slider.remove();
      document.body.append(slider);
      await new Promise(requestAnimationFrame);
      slider.querySelector("fig-menu")?.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: { value: "reset-default" },
        }),
      );

      const group = document.createElement("propskit-group");
      group.setAttribute("name", "Appearance");
      group.innerHTML = `<propskit-number value="1"></propskit-number>`;
      document.body.append(group);
      await new Promise(requestAnimationFrame);
      const header = group.querySelector(":scope > fig-header");
      if (!header) throw new Error(`Missing group header: ${group.outerHTML}`);
      const disclosure = header.querySelector(
        ":scope > .propskit-group-disclosure",
      )!;
      const reset = header.querySelector(":scope > .propskit-group-reset-tooltip");
      return {
        resetValue: slider.value,
        headerRole: header.getAttribute("role"),
        disclosureExpanded: disclosure.getAttribute("aria-expanded"),
        resetIsSibling: Boolean(reset && !disclosure.contains(reset)),
        nestedReset: disclosure.querySelector(".propskit-group-reset"),
      };
    });

    expect(state).toEqual({
      resetValue: "25",
      headerRole: null,
      disclosureExpanded: "false",
      resetIsSibling: true,
      nestedReset: null,
    });
  });

  test("slider preserves range focus across a real pointer value update", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML =
        '<propskit-slider label="Amount" value="50" min="0" max="100"></propskit-slider>';
    });
    await page.waitForTimeout(50);
    const field = page.locator("propskit-slider fig-field");
    await field.click({ position: { x: 12, y: 12 } });
    const range = page.locator('propskit-slider input[type="range"]');
    await expect(range).toBeFocused();
    await expect(range).toHaveAttribute("aria-label", "Amount");
    await expect(range).not.toHaveAttribute("aria-hidden", "true");
  });
});
