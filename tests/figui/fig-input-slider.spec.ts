import { expect, test, type Page } from "@playwright/test";
import {
  bootFigFixture,
  collectPageErrors,
  type PageErrors,
} from "./helpers";

const sliderTags = [
  "fig-input-slider",
  "fig-input-slider-hue",
  "fig-input-slider-opacity",
  "fig-input-slider-delta",
  "fig-input-slider-stepper",
  "fig-input-slider-wheel",
];

async function loadSlider(page: Page, query = "") {
  await page.addStyleTag({ url: "/fig-input-slider.css" });
  await page.addScriptTag({
    type: "module",
    url: `/fig-input-slider.js${query}`,
  });
  await page.evaluate(async (tags) => {
    await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
  }, sliderTags);
}

test.describe("fig-input-slider", () => {
  let errors: PageErrors;

  test.beforeEach(async ({ page }) => {
    errors = collectPageErrors(page);
    await bootFigFixture(page);
    expect(
      await page.evaluate(() =>
        Boolean(customElements.get("fig-input-slider")),
      ),
    ).toBe(false);
  });

  test.afterEach(() => {
    expect(errors).toEqual({ consoleErrors: [], pageErrors: [] });
  });

  test("registers all standalone tags and stays stable when Lab loads", async ({
    page,
  }) => {
    await loadSlider(page, "?standalone-registration=1");

    const result = await page.evaluate(async (tags) => {
      const before = Object.fromEntries(
        tags.map((tag) => [tag, customElements.get(tag)]),
      );

      await import("/fig-lab.js?slider-registration=1");

      return Object.fromEntries(
        tags.map((tag) => [
          tag,
          Boolean(before[tag]) && before[tag] === customElements.get(tag),
        ]),
      );
    }, sliderTags);

    expect(result).toEqual(
      Object.fromEntries(sliderTags.map((tag) => [tag, true])),
    );
  });

  test("renders default and variant state, ARIA, and geometry", async ({
    page,
  }) => {
    await loadSlider(page);

    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-slider id="base" value="25"></fig-input-slider>
        <fig-input-slider-hue id="hue" value="180"></fig-input-slider-hue>
        <fig-input-slider-opacity id="opacity" value="75"></fig-input-slider-opacity>
        <fig-input-slider-delta id="delta" value="-50" default="0"></fig-input-slider-delta>
        <fig-input-slider-stepper id="stepper" value="40"></fig-input-slider-stepper>
        <fig-input-slider-wheel id="wheel" value="5"></fig-input-slider-wheel>
      `;

      const read = (id: string) => {
        const host = root.querySelector(`#${id}`)!;
        const handle = host.querySelector(
          ".fig-input-slider-handle",
        ) as HTMLElement | null;
        const tray = host.querySelector(
          ".fig-input-slider-tray",
        ) as HTMLElement | null;
        const handleBox = handle?.getBoundingClientRect();
        const trayBox = tray?.getBoundingClientRect();
        return {
          role: host.getAttribute("role"),
          orientation: host.getAttribute("aria-orientation"),
          min: host.getAttribute("aria-valuemin"),
          max: host.getAttribute("aria-valuemax"),
          now: host.getAttribute("aria-valuenow"),
          valueText: host.getAttribute("aria-valuetext"),
          tabIndex: (host as HTMLElement).tabIndex,
          handleX: handle?.style.getPropertyValue(
            "--fig-input-slider-handle-x",
          ),
          handleY: handle?.style.getPropertyValue(
            "--fig-input-slider-handle-y",
          ),
          handleInsideTray:
            Boolean(handleBox && trayBox) &&
            handleBox!.left >= trayBox!.left &&
            handleBox!.right <= trayBox!.right,
        };
      };

      const opacityFill = root.querySelector(
        "#opacity .fig-input-slider-fill",
      ) as HTMLElement;
      const deltaFill = root.querySelector(
        "#delta .fig-input-slider-fill",
      ) as HTMLElement;
      const stepperTicks = [
        ...root.querySelectorAll("#stepper .fig-input-slider-tick"),
      ];

      return {
        base: read("base"),
        hue: {
          ...read("hue"),
          fills: root.querySelectorAll("#hue .fig-input-slider-fill").length,
        },
        opacity: {
          ...read("opacity"),
          fill: [
            opacityFill.style.getPropertyValue(
              "--fig-input-slider-fill-start",
            ),
            opacityFill.style.getPropertyValue(
              "--fig-input-slider-fill-end",
            ),
          ],
        },
        delta: {
          ...read("delta"),
          tickProgress: (
            root.querySelector("#delta .fig-input-slider-tick") as HTMLElement
          ).style.getPropertyValue("--fig-input-slider-tick-progress"),
          fill: [
            deltaFill.style.getPropertyValue(
              "--fig-input-slider-fill-start",
            ),
            deltaFill.style.getPropertyValue(
              "--fig-input-slider-fill-end",
            ),
          ],
          insetTowardEnd: root
            .querySelector("#delta .fig-input-slider-handle")
            ?.hasAttribute("data-inset-toward-end"),
        },
        stepper: {
          ...read("stepper"),
          ticks: stepperTicks.length,
          activeTicks: stepperTicks.filter((tick) =>
            tick.hasAttribute("data-active"),
          ).length,
        },
        wheel: {
          ...read("wheel"),
          ticks: root.querySelectorAll(
            "#wheel .fig-input-slider-wheel-tick",
          ).length,
        },
      };
    });

    expect(state.base).toEqual({
      role: "slider",
      orientation: "horizontal",
      min: "0",
      max: "100",
      now: "25",
      valueText: "25",
      tabIndex: 0,
      handleX: "0.25",
      handleY: "0.5",
      handleInsideTray: true,
    });
    expect(state.hue).toMatchObject({
      role: "slider",
      min: "0",
      max: "360",
      now: "180",
      handleX: "0.5",
      fills: 0,
    });
    expect(state.opacity).toMatchObject({
      role: "slider",
      now: "75",
      handleX: "0.75",
      fill: ["0", "1"],
    });
    expect(state.delta).toMatchObject({
      role: "slider",
      min: "-100",
      max: "100",
      now: "-50",
      handleX: "0.25",
      tickProgress: "0.5",
      fill: ["0.25", "0.5"],
      insetTowardEnd: true,
    });
    expect(state.stepper).toMatchObject({
      role: "slider",
      now: "40",
      handleX: "0.4",
      ticks: 11,
      activeTicks: 5,
    });
    expect(state.wheel).toMatchObject({
      role: "spinbutton",
      orientation: null,
      min: null,
      max: null,
      now: "5",
      handleX: "0.5",
      handleY: "0.5",
      handleInsideTray: true,
    });
    expect(state.wheel.ticks).toBeGreaterThan(0);
  });

  test("uses the brand fill while focused or dragging", async ({ page }) => {
    await loadSlider(page);
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-slider id="active-fill" value="50"></fig-input-slider>
      `;
      const slider = root.querySelector<HTMLElement>("#active-fill");
      const fill = slider?.querySelector<HTMLElement>(
        ".fig-input-slider-fill",
      );
      if (!slider || !fill) throw new Error("Missing slider fill");
      const probe = document.createElement("span");
      probe.style.background = "var(--figma-color-bg-brand)";
      root.append(probe);
      const brand = getComputedStyle(probe).backgroundColor;
      const rest = getComputedStyle(fill).backgroundColor;
      slider.focus();
      const focused = getComputedStyle(fill).backgroundColor;
      slider.blur();
      slider.setAttribute("data-dragging", "");
      const dragging = getComputedStyle(fill).backgroundColor;
      return { brand, dragging, focused, rest };
    });

    expect(result.focused).toBe(result.brand);
    expect(result.dragging).toBe(result.brand);
    expect(result.rest).not.toBe(result.brand);
  });

  test("reflects name and values and resets to its default contract", async ({
    page,
  }) => {
    await loadSlider(page);

    const result = await page.evaluate(() => {
      type Slider = HTMLElement & {
        name: string;
        value: number;
        defaultValue: number;
        isDefault: boolean;
        resetToDefault(): void;
      };

      const slider = document.createElement("fig-input-slider") as Slider;
      slider.name = "Gain";
      slider.setAttribute("value", "25");
      slider.setAttribute("default", "10");
      document.body.append(slider);

      const before = {
        name: slider.name,
        nameAttribute: slider.getAttribute("name"),
        value: slider.value,
        defaultValue: slider.defaultValue,
        isDefault: slider.isDefault,
      };
      slider.value = 30;
      const reflectedValue = slider.getAttribute("value");

      const events: Array<{ type: string; detail: unknown }> = [];
      slider.addEventListener("input", (event) => {
        events.push({ type: event.type, detail: (event as CustomEvent).detail });
      });
      slider.addEventListener("change", (event) => {
        events.push({ type: event.type, detail: (event as CustomEvent).detail });
      });
      slider.resetToDefault();

      return {
        before,
        reflectedValue,
        reset: {
          value: slider.value,
          valueAttribute: slider.getAttribute("value"),
          isDefault: slider.isDefault,
        },
        events,
      };
    });

    expect(result.before).toEqual({
      name: "Gain",
      nameAttribute: "Gain",
      value: 25,
      defaultValue: 10,
      isDefault: false,
    });
    expect(result.reflectedValue).toBe("30");
    expect(result.reset).toEqual({
      value: 10,
      valueAttribute: "10",
      isDefault: true,
    });
    expect(result.events).toEqual([
      {
        type: "input",
        detail: {
          control: "fig-input-slider",
          name: "Gain",
          value: 10,
          handleIndex: 0,
        },
      },
      {
        type: "change",
        detail: {
          control: "fig-input-slider",
          name: "Gain",
          value: 10,
          handleIndex: 0,
        },
      },
    ]);
  });

  test("supports JSON values with stable multiple-handle geometry", async ({
    page,
  }) => {
    await loadSlider(page);

    const result = await page.evaluate(() => {
      type Slider = HTMLElement & {
        value: number[];
        defaultValue: number[];
        isDefault: boolean;
      };
      const slider = document.createElement("fig-input-slider") as Slider;
      slider.setAttribute("value", "[20,80]");
      slider.setAttribute("default", "[10,90]");
      document.body.append(slider);

      const read = () => {
        const handles = [
          ...slider.querySelectorAll<HTMLElement>(
            ".fig-input-slider-handle",
          ),
        ];
        const fill = slider.querySelector<HTMLElement>(
          ".fig-input-slider-fill",
        )!;
        return {
          value: slider.value,
          handles: handles.map((handle) =>
            handle.style.getPropertyValue("--fig-input-slider-handle-x"),
          ),
          fill: [
            fill.style.getPropertyValue("--fig-input-slider-fill-start"),
            fill.style.getPropertyValue("--fig-input-slider-fill-end"),
          ],
        };
      };

      const initial = read();
      const returnedValue = slider.value;
      returnedValue[0] = 99;
      const isolatedValue = slider.value;
      slider.value = [25, 75];

      return {
        initial,
        defaultValue: slider.defaultValue,
        isDefault: slider.isDefault,
        isolatedValue,
        reflected: slider.getAttribute("value"),
        updated: read(),
      };
    });

    expect(result).toEqual({
      initial: {
        value: [20, 80],
        handles: ["0.2", "0.8"],
        fill: ["0.2", "0.8"],
      },
      defaultValue: [10, 90],
      isDefault: false,
      isolatedValue: [20, 80],
      reflected: "[25,75]",
      updated: {
        value: [25, 75],
        handles: ["0.25", "0.75"],
        fill: ["0.25", "0.75"],
      },
    });
  });

  test("preserves and bidirectionally syncs an authored number input", async ({
    page,
  }) => {
    await loadSlider(page);

    const result = await page.evaluate(() => {
      type Slider = HTMLElement & {
        value: number;
        requestRender(): void;
      };
      type NumberInput = HTMLElement & { value: number };
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-slider id="composed" name="Amount" value="25" min="0" max="100">
          <fig-input-number value="12" min="-10" max="200" step="5" units="%"></fig-input-number>
        </fig-input-slider>
      `;
      const slider = root.querySelector<Slider>("#composed")!;
      const number = slider.querySelector<NumberInput>("fig-input-number")!;
      const events: Array<{ type: string; detail: unknown }> = [];
      slider.addEventListener("input", (event) => {
        events.push({ type: event.type, detail: (event as CustomEvent).detail });
      });
      slider.addEventListener("change", (event) => {
        events.push({ type: event.type, detail: (event as CustomEvent).detail });
      });

      slider.requestRender();
      const preservedAfterRender = slider.contains(number);
      slider.value = 40;
      const childAfterSliderUpdate = number.getAttribute("value");

      number.value = 55;
      number.dispatchEvent(new CustomEvent("input", { bubbles: true }));
      const sliderAfterChildInput = slider.value;

      number.value = 60;
      number.dispatchEvent(new CustomEvent("change", { bubbles: true }));

      return {
        directChildren: [...slider.children].map((child) => child.localName),
        preservedAfterRender,
        childAfterSliderUpdate,
        sliderAfterChildInput,
        finalValue: slider.value,
        childAttributes: {
          min: number.getAttribute("min"),
          max: number.getAttribute("max"),
          step: number.getAttribute("step"),
          units: number.getAttribute("units"),
        },
        events,
      };
    });

    expect(result).toEqual({
      directChildren: ["div", "fig-input-number"],
      preservedAfterRender: true,
      childAfterSliderUpdate: "40",
      sliderAfterChildInput: 55,
      finalValue: 60,
      childAttributes: {
        min: "-10",
        max: "200",
        step: "5",
        units: "%",
      },
      events: [
        {
          type: "input",
          detail: {
            control: "fig-input-slider",
            name: "Amount",
            value: 55,
            handleIndex: 0,
          },
        },
        {
          type: "input",
          detail: {
            control: "fig-input-slider",
            name: "Amount",
            value: 60,
            handleIndex: 0,
          },
        },
        {
          type: "change",
          detail: {
            control: "fig-input-slider",
            name: "Amount",
            value: 60,
            handleIndex: 0,
          },
        },
      ],
    });
  });

  test("handles dynamic number inputs, multiple values, disabled state, and overlay geometry", async ({
    page,
  }) => {
    await loadSlider(page);
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-slider id="dynamic" value="30"></fig-input-slider>
      `;
      const number = document.createElement("fig-input-number");
      number.setAttribute("value", "10");
      number.setAttribute("units", "%");
      root.querySelector("#dynamic")!.append(number);
    });

    const slider = page.locator("#dynamic");
    const number = slider.locator(":scope > fig-input-number");
    await expect(number).toHaveAttribute("value", "30");

    const geometry = await slider.evaluate((element) => {
      const child = element.querySelector<HTMLElement>(
        ":scope > fig-input-number",
      )!;
      const hostBox = element.getBoundingClientRect();
      const childBox = child.getBoundingClientRect();
      return {
        rightDelta: Math.abs(hostBox.right - childBox.right),
        centerDelta: Math.abs(
          hostBox.top +
            hostBox.height / 2 -
            (childBox.top + childBox.height / 2),
        ),
        childWidth: childBox.width,
        hostWidth: hostBox.width,
      };
    });
    expect(geometry.rightDelta).toBeLessThanOrEqual(1);
    expect(geometry.centerDelta).toBeLessThanOrEqual(1);
    expect(geometry.childWidth).toBeLessThanOrEqual(geometry.hostWidth / 2);

    await slider.evaluate((element) => {
      (element as HTMLElement & { value: number[] }).value = [20, 80];
    });
    await expect(slider).toHaveAttribute("data-multiple-values", "");
    await expect(number).toBeHidden();

    await slider.evaluate((element) => {
      (element as HTMLElement & { value: number }).value = 45;
    });
    await expect(slider).not.toHaveAttribute("data-multiple-values", "");
    await expect(number).toBeVisible();
    await expect(number).toHaveAttribute("value", "45");

    await slider.evaluate((element) => element.setAttribute("disabled", ""));
    await number.evaluate((element) => {
      (element as HTMLElement & { value: number }).value = 80;
      element.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    });
    await expect(slider).toHaveAttribute("value", "45");
    await expect(number).toHaveAttribute("value", "45");

    await slider.evaluate((element) => {
      const child = element.querySelector(":scope > fig-input-number");
      (element as HTMLElement & { detachedNumber?: Element }).detachedNumber =
        child || undefined;
      child?.remove();
    });
    await expect(slider.locator(":scope > fig-input-number")).toHaveCount(0);
    await expect(slider.locator(":scope > .fig-input-slider-tray")).toHaveCount(
      1,
    );
    const valueAfterDetachedInput = await slider.evaluate((element) => {
      type NumberInput = Element & { value: number };
      const typedSlider = element as HTMLElement & {
        detachedNumber?: NumberInput;
        value: number;
      };
      element.removeAttribute("disabled");
      if (!typedSlider.detachedNumber) throw new Error("Missing detached input");
      typedSlider.detachedNumber.value = 90;
      typedSlider.detachedNumber.dispatchEvent(
        new CustomEvent("input", { bubbles: true }),
      );
      return typedSlider.value;
    });
    expect(valueAfterDetachedInput).toBe(45);
  });

  test("progressively fades the handle as it approaches a composed number input", async ({
    page,
  }) => {
    await loadSlider(page);
    const result = await page.evaluate(() => {
      type Slider = HTMLElement & { value: number };
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-slider id="overlap" value="0">
          <fig-input-number value="0" units="%"></fig-input-number>
        </fig-input-slider>
      `;
      const slider = root.querySelector<Slider>("#overlap")!;
      const handle = slider.querySelector<HTMLElement>(
        ".fig-input-slider-handle",
      )!;
      slider.style.setProperty(
        "--fig-input-slider-handle-transition",
        "none",
      );
      const rest = {
        overlaps: handle.hasAttribute("data-overlaps-occlusion-target"),
        opacity: getComputedStyle(handle).opacity,
      };
      const defaultThreshold = getComputedStyle(slider)
        .getPropertyValue(
          "--fig-input-slider-handle-occlusion-target-overlap-fade-threshold",
        )
        .trim();

      slider.style.setProperty(
        "--fig-input-slider-handle-occlusion-target-overlap-opacity",
        "0.25",
      );
      slider.style.setProperty(
        "--fig-input-slider-handle-occlusion-target-overlap-fade-threshold",
        "40px",
      );
      let approaching = null;
      for (let value = 1; value < 100; value++) {
        slider.value = value;
        const opacity = Number(getComputedStyle(handle).opacity);
        if (
          !handle.hasAttribute("data-overlaps-occlusion-target") &&
          opacity > 0.25 &&
          opacity < 1
        ) {
          approaching = { value, opacity };
          break;
        }
      }

      slider.value = 100;
      const overlap = {
        overlaps: handle.hasAttribute("data-overlaps-occlusion-target"),
        opacity: getComputedStyle(handle).opacity,
      };

      slider.value = 0;
      const restored = {
        overlaps: handle.hasAttribute("data-overlaps-occlusion-target"),
        opacity: getComputedStyle(handle).opacity,
      };
      return { rest, defaultThreshold, approaching, overlap, restored };
    });

    expect(result.rest).toEqual({ overlaps: false, opacity: "1" });
    expect(result.defaultThreshold).toBe("0.5rem");
    expect(result.approaching).not.toBeNull();
    expect(result.approaching!.opacity).toBeGreaterThan(0.25);
    expect(result.approaching!.opacity).toBeLessThan(1);
    expect(result.overlap).toEqual({ overlaps: true, opacity: "0.25" });
    expect(result.restored).toEqual({ overlaps: false, opacity: "1" });
  });

  test("combines selector and programmatic occlusion targets", async ({
    page,
  }) => {
    await loadSlider(page);
    const result = await page.evaluate(() => {
      type Slider = HTMLElement & {
        value: number;
        occlusionTargets: Element[];
      };
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div class="occlusion-scope" style="position: relative; width: 240px">
          <span class="left-target" style="position: absolute; inset: 0 auto 0 0; width: 40px"></span>
          <fig-input-slider
            id="target-slider"
            value="50"
            occlusion-targets=".right-target"
          ></fig-input-slider>
          <span class="right-target" style="position: absolute; inset: 0 0 0 auto; width: 40px"></span>
        </div>
      `;
      const scope = root.querySelector(".occlusion-scope")!;
      const left = root.querySelector(".left-target")!;
      const slider = root.querySelector<Slider>("#target-slider")!;
      const handle = slider.querySelector<HTMLElement>(
        ".fig-input-slider-handle",
      )!;
      slider.style.setProperty(
        "--fig-input-slider-handle-transition",
        "none",
      );
      slider.style.setProperty(
        "--fig-input-slider-handle-occlusion-target-overlap-opacity",
        "0.2",
      );

      slider.occlusionTargets = [left];
      const returnedTargets = slider.occlusionTargets;
      returnedTargets.length = 0;
      const defensiveGetterLength = slider.occlusionTargets.length;

      slider.value = 0;
      const programmaticLeftOpacity = getComputedStyle(handle).opacity;
      slider.value = 100;
      const attributeRightOpacity = getComputedStyle(handle).opacity;

      slider.occlusionTargets = [];
      slider.value = 0;
      const clearedProgrammaticOpacity = getComputedStyle(handle).opacity;

      slider.setAttribute("occlusion-targets", ".occlusion-scope");
      slider.value = 50;
      const parentTargetOpacity = getComputedStyle(handle).opacity;

      slider.setAttribute("occlusion-targets", ":not(");
      slider.value = 51;
      const invalidSelectorOpacity = getComputedStyle(handle).opacity;

      return {
        scopeMatchesParent: slider.parentElement === scope,
        defensiveGetterLength,
        programmaticLeftOpacity,
        attributeRightOpacity,
        clearedProgrammaticOpacity,
        parentTargetOpacity,
        invalidSelectorOpacity,
      };
    });

    expect(result).toEqual({
      scopeMatchesParent: true,
      defensiveGetterLength: 1,
      programmaticLeftOpacity: "0.2",
      attributeRightOpacity: "0.2",
      clearedProgrammaticOpacity: "1",
      parentTargetOpacity: "0.2",
      invalidSelectorOpacity: "1",
    });
  });

  test("updates occlusion when a target resizes", async ({ page }) => {
    await loadSlider(page);
    await page.evaluate(() => {
      type Slider = HTMLElement & { occlusionTargets: Element[] };
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="position: relative; width: 240px">
          <span id="resizing-target" style="position: absolute; inset: 0 auto 0 0; width: 20px"></span>
          <fig-input-slider id="resize-slider" value="25"></fig-input-slider>
        </div>
      `;
      const target = root.querySelector("#resizing-target")!;
      const slider = root.querySelector<Slider>("#resize-slider")!;
      slider.style.setProperty(
        "--fig-input-slider-handle-transition",
        "none",
      );
      slider.occlusionTargets = [target];
    });

    const handle = page.locator(
      "#resize-slider .fig-input-slider-handle",
    );
    await expect(handle).toHaveCSS("opacity", "1");
    await page.locator("#resizing-target").evaluate((element) => {
      (element as HTMLElement).style.width = "80px";
    });
    await expect(handle).toHaveCSS("opacity", "0");
  });

  test("emits keyboard input and change events and blocks disabled input", async ({
    page,
  }) => {
    await loadSlider(page);
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-slider id="keyboard" name="Size" value="10" step="2"></fig-input-slider>
      `;
      const slider = root.querySelector("#keyboard")!;
      const events: Array<{ type: string; detail: unknown }> = [];
      (slider as HTMLElement & { testEvents?: typeof events }).testEvents =
        events;
      for (const type of ["input", "change"]) {
        slider.addEventListener(type, (event) => {
          events.push({
            type: event.type,
            detail: (event as CustomEvent).detail,
          });
        });
      }
    });

    const slider = page.locator("#keyboard");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("value", "12");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(slider).toHaveAttribute("value", "40");

    await slider.evaluate((element) => {
      element.setAttribute("disabled", "");
      element.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
        }),
      );
    });

    const result = await slider.evaluate((element) => ({
      value: (element as HTMLElement & { value: number }).value,
      tabIndex: (element as HTMLElement).tabIndex,
      ariaDisabled: element.getAttribute("aria-disabled"),
      events: (
        element as HTMLElement & {
          testEvents?: Array<{ type: string; detail: unknown }>;
        }
      ).testEvents,
    }));

    expect(result.value).toBe(40);
    expect(result.tabIndex).toBe(-1);
    expect(result.ariaDisabled).toBe("true");
    expect(result.events).toEqual([
      {
        type: "input",
        detail: {
          control: "fig-input-slider",
          name: "Size",
          value: 12,
          handleIndex: 0,
        },
      },
      {
        type: "change",
        detail: {
          control: "fig-input-slider",
          name: "Size",
          value: 12,
          handleIndex: 0,
        },
      },
      {
        type: "input",
        detail: {
          control: "fig-input-slider",
          name: "Size",
          value: 40,
          handleIndex: 0,
        },
      },
      {
        type: "change",
        detail: {
          control: "fig-input-slider",
          name: "Size",
          value: 40,
          handleIndex: 0,
        },
      },
    ]);
  });

  test("tracks a real pointer drag and commits once", async ({ page }) => {
    await loadSlider(page);
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "200px";
      root.innerHTML = `
        <fig-input-slider id="pointer" value="0"></fig-input-slider>
      `;
      const slider = root.querySelector("#pointer")!;
      const events: string[] = [];
      (slider as HTMLElement & { testEvents?: string[] }).testEvents = events;
      slider.addEventListener("input", () => events.push("input"));
      slider.addEventListener("change", () => events.push("change"));
    });

    const tray = page.locator("#pointer .fig-input-slider-tray");
    const box = await tray.boundingBox();
    if (!box) throw new Error("Missing slider tray bounds");
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.25, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, y);
    await page.mouse.up();

    const result = await page.locator("#pointer").evaluate((element) => ({
      value: (element as HTMLElement & { value: number }).value,
      dragging: element.hasAttribute("data-dragging"),
      events: (element as HTMLElement & { testEvents?: string[] }).testEvents,
    }));
    expect(result).toEqual({
      value: 75,
      dragging: false,
      events: ["input", "input", "change"],
    });
  });

  test("starts slider dragging from a composed number input", async ({
    page,
  }) => {
    await loadSlider(page);
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-slider id="number-drag" value="100">
          <fig-input-number value="100"></fig-input-number>
        </fig-input-slider>
      `;
      const slider = root.querySelector("#number-drag")!;
      const events: string[] = [];
      (slider as HTMLElement & { testEvents?: string[] }).testEvents = events;
      slider.addEventListener("input", () => events.push("input"));
      slider.addEventListener("change", () => events.push("change"));
    });

    const slider = page.locator("#number-drag");
    const tray = slider.locator(".fig-input-slider-tray");
    const numberInput = slider.locator(":scope > fig-input-number > input");
    await numberInput.click();
    await expect(numberInput).toBeFocused();

    const trayBox = await tray.boundingBox();
    const inputBox = await numberInput.boundingBox();
    if (!trayBox || !inputBox) throw new Error("Missing composed slider bounds");
    await page.mouse.move(
      inputBox.x + inputBox.width / 2,
      inputBox.y + inputBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      trayBox.x + trayBox.width * 0.25,
      trayBox.y + trayBox.height / 2,
      { steps: 3 },
    );
    await page.mouse.up();

    const result = await slider.evaluate((element) => ({
      value: (element as HTMLElement & { value: number }).value,
      dragging: element.hasAttribute("data-dragging"),
      events: (element as HTMLElement & { testEvents?: string[] }).testEvents,
    }));
    expect(result.value).toBe(25);
    expect(result.dragging).toBe(false);
    expect(result.events?.at(-1)).toBe("change");
    expect(result.events?.filter((type) => type === "input").length).toBeGreaterThan(
      0,
    );
  });

  test("resolves hue and opacity colors through slider CSS", async ({
    page,
  }) => {
    await loadSlider(page);

    const colors = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-slider-hue id="hue-color" color="#336699" value="120"></fig-input-slider-hue>
        <fig-input-slider-opacity id="opacity-color" color="#ff0000" value="50"></fig-input-slider-opacity>
      `;
      const hue = root.querySelector("#hue-color") as HTMLElement;
      const opacity = root.querySelector("#opacity-color") as HTMLElement;
      const hueHandle = hue.querySelector(".fig-input-slider-handle")!;
      const hueTrack = hue.querySelector(".fig-input-slider-track")!;
      const opacityFill = opacity.querySelector(".fig-input-slider-fill")!;
      return {
        hueColor: getComputedStyle(hue)
          .getPropertyValue("--fig-input-slider-color")
          .trim(),
        hueHandle: getComputedStyle(hueHandle).backgroundColor,
        hueGradient: getComputedStyle(hueTrack, "::after").backgroundImage,
        opacityColor: getComputedStyle(opacity)
          .getPropertyValue("--fig-input-slider-color")
          .trim(),
        opacityBackground: getComputedStyle(opacityFill).backgroundImage,
      };
    });

    expect(colors.hueColor).toBe("rgb(51, 153, 51)");
    expect(colors.hueHandle).toBe("rgb(51, 153, 51)");
    expect(colors.hueGradient).toContain("linear-gradient");
    expect(colors.opacityColor).toBe("#ff0000");
    expect(colors.opacityBackground).toContain("linear-gradient");
    expect(colors.opacityBackground).toContain("repeating-conic-gradient");
  });

  test("exposes the wheel role and public spin and scrub methods", async ({
    page,
  }) => {
    await loadSlider(page);

    const result = await page.evaluate(() => {
      type Wheel = HTMLElement & {
        value: number;
        beginScrub(options?: {
          clientX?: number;
          startValue?: number;
        }): unknown;
        updateScrub(clientX: number): boolean;
        endScrub(commit?: boolean): boolean;
        spinTo(value: number, options?: { animateHandle?: boolean }): number;
      };

      const wheel = document.createElement(
        "fig-input-slider-wheel",
      ) as Wheel;
      wheel.style.width = "240px";
      wheel.setAttribute("value", "0");
      wheel.setAttribute("step", "1");
      document.body.append(wheel);

      const methods = ["beginScrub", "updateScrub", "endScrub", "spinTo"];
      const publicMethods = Object.fromEntries(
        methods.map((name) => [
          name,
          typeof (wheel as unknown as Record<string, unknown>)[name],
        ]),
      );
      const spun = wheel.spinTo(5, { animateHandle: false });
      const events: Array<{ type: string; value: number }> = [];
      wheel.addEventListener("input", (event) => {
        events.push({
          type: event.type,
          value: (event as CustomEvent).detail.value,
        });
      });
      wheel.addEventListener("change", (event) => {
        events.push({
          type: event.type,
          value: (event as CustomEvent).detail.value,
        });
      });

      const scrub = wheel.beginScrub({ clientX: 100, startValue: 5 });
      const activeDuringScrub = wheel.hasAttribute("data-wheel-active");
      const changed = wheel.updateScrub(122);
      const committed = wheel.endScrub(true);

      return {
        role: wheel.getAttribute("role"),
        orientation: wheel.getAttribute("aria-orientation"),
        min: wheel.getAttribute("aria-valuemin"),
        max: wheel.getAttribute("aria-valuemax"),
        publicMethods,
        spun,
        scrubStarted: Boolean(scrub),
        activeDuringScrub,
        changed,
        committed,
        activeAfterScrub: wheel.hasAttribute("data-wheel-active"),
        value: wheel.value,
        events,
      };
    });

    expect(result).toEqual({
      role: "spinbutton",
      orientation: null,
      min: null,
      max: null,
      publicMethods: {
        beginScrub: "function",
        updateScrub: "function",
        endScrub: "function",
        spinTo: "function",
      },
      spun: 5,
      scrubStarted: true,
      activeDuringScrub: true,
      changed: true,
      committed: true,
      activeAfterScrub: false,
      value: 6,
      events: [
        { type: "input", value: 6 },
        { type: "change", value: 6 },
      ],
    });
  });
});
