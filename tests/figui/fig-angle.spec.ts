import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-angle", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(() => customElements.whenDefined("fig-angle"));
  });

  test("registers in core and renders the instrument dial", async ({ page }) => {
    const state = await page.evaluate(() => {
      const angle = document.createElement("fig-angle");
      angle.setAttribute("value", "15");
      document.body.append(angle);
      const surface = angle.querySelector(".fig-angle-surface");
      const svg = angle.querySelector(".fig-angle-svg");
      const boundary = angle.querySelector(".fig-angle-boundary");
      const firstTick = angle.querySelector(".fig-angle-tick");
      const majorTick = angle.querySelector(".fig-angle-tick-major")!;
      const minorTick = angle.querySelector(
        ".fig-angle-tick:not(.fig-angle-tick-major)",
      )!;
      const indicator = angle.querySelector(".fig-angle-indicator")!;
      const reference = angle.querySelector(".fig-angle-reference")!;
      const reset = angle.querySelector(".fig-angle-reset")!;
      const tickLength = (tick: Element) =>
        Number(
          Math.hypot(
            Number(tick.getAttribute("x2")) - Number(tick.getAttribute("x1")),
            Number(tick.getAttribute("y2")) - Number(tick.getAttribute("y1")),
          ).toFixed(6),
        );
      const tickOuterRadius = Math.hypot(
        Number(firstTick?.getAttribute("x2")) - 50,
        Number(firstTick?.getAttribute("y2")) - 50,
      );
      return {
        registered: Boolean(customElements.get("fig-angle")),
        legacyRegistered: Boolean(customElements.get("fig-input-angle")),
        ticks: angle.querySelectorAll(".fig-angle-tick").length,
        majorTicks: angle.querySelectorAll(".fig-angle-tick-major").length,
        viewBox: svg?.getAttribute("viewBox"),
        preserveAspectRatio: svg?.getAttribute("preserveAspectRatio"),
        tickGap: Number(boundary?.getAttribute("r")) - tickOuterRadius,
        regularTickLength: tickLength(minorTick),
        majorTickLength: tickLength(majorTick),
        indicatorLength: tickLength(indicator),
        indicatorAlignsWithTicks:
          Math.hypot(
            Number(indicator.getAttribute("x2")) - 50,
            Number(indicator.getAttribute("y2")) - 50,
          ) === tickOuterRadius,
        tickColorsMatch:
          getComputedStyle(majorTick).stroke ===
          getComputedStyle(minorTick).stroke,
        tickOpacity: getComputedStyle(minorTick).opacity,
        referencePath: angle
          .querySelector(".fig-angle-reference-path")
          ?.getAttribute("d"),
        referenceBounds: ["x", "y", "width", "height", "viewBox"].map(
          (name) => reference.getAttribute(name),
        ),
        referenceStrokeMatches:
          getComputedStyle(
            angle.querySelector(".fig-angle-reference-path")!,
          ).strokeWidth === getComputedStyle(boundary!).strokeWidth,
        guideCount: angle.querySelectorAll(
          ".fig-angle-guide, .fig-angle-arc",
        ).length,
        centeredInput:
          surface?.querySelector(":scope > fig-input-number")?.className ===
          "fig-angle-input",
        centeredInputVariant: surface
          ?.querySelector(":scope > fig-input-number")
          ?.getAttribute("variant"),
        centeredInputTabular: surface
          ?.querySelector(":scope > fig-input-number")
          ?.hasAttribute("tabular"),
        centeredInputBackground: surface
          ? getComputedStyle(
              surface.querySelector(":scope > fig-input-number")!,
            ).backgroundColor
          : null,
        centeredInputFieldSizing: surface
          ? getComputedStyle(
              surface.querySelector(":scope > fig-input-number input")!,
            ).fieldSizing
          : null,
        outsideInput: Boolean(
          angle.querySelector(":scope > fig-input-number"),
        ),
        resetLabel: reset.getAttribute("aria-label"),
        resetHidden: (reset as HTMLElement).hidden,
        indicator: indicator.getAttribute("transform"),
        role: svg?.getAttribute("role"),
      };
    });

    expect(state).toEqual({
      registered: true,
      legacyRegistered: false,
      ticks: 24,
      majorTicks: 8,
      viewBox: "0 0 100 100",
      preserveAspectRatio: "xMidYMid meet",
      tickGap: 10,
      regularTickLength: 2,
      majorTickLength: 6,
      indicatorLength: 12,
      indicatorAlignsWithTicks: true,
      tickColorsMatch: true,
      tickOpacity: "1",
      referencePath: expect.stringMatching(/^M 97 50 A 47 47 /),
      referenceBounds: ["3%", "3%", "94%", "94%", "3 3 94 94"],
      referenceStrokeMatches: true,
      guideCount: 0,
      centeredInput: true,
      centeredInputVariant: "ghost",
      centeredInputTabular: true,
      centeredInputBackground: "rgba(0, 0, 0, 0)",
      centeredInputFieldSizing: "content",
      outsideInput: false,
      resetLabel: "Reset to default",
      resetHidden: false,
      indicator: "rotate(15 50 50)",
      role: "slider",
    });
  });

  test("sizes the centered number input to its value", async ({ page }) => {
    const widths = await page.evaluate(() => {
      const angle = document.createElement("fig-angle") as HTMLElement & {
        value: number;
      };
      angle.value = 1;
      document.body.append(angle);
      const host = angle.querySelector(".fig-angle-surface > .fig-angle-input") as HTMLElement;
      const measure = () => Math.round(host.getBoundingClientRect().width);
      const short = measure();
      angle.value = 1080;
      const long = measure();
      return { short, long };
    });

    expect(widths.long).toBeGreaterThan(widths.short);
  });

  test("outlines the surface for input focus and pointer interaction", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const angle = document.createElement("fig-angle");
      angle.id = "focus-angle";
      angle.style.width = "160px";
      document.body.append(angle);
    });

    const angle = page.locator("#focus-angle");
    const surface = angle.locator(".fig-angle-surface");
    const inputHost = angle.locator(".fig-angle-input");
    const input = inputHost.locator("input");
    const dial = angle.locator(".fig-angle-svg");

    await input.focus();
    await expect(input).toBeFocused();
    await expect(surface).toHaveCSS("outline-style", "solid");
    await expect(inputHost).toHaveCSS("outline-style", "none");

    const box = await dial.boundingBox();
    await dial.dispatchEvent("pointerdown", {
      pointerId: 70,
      button: 0,
      buttons: 1,
      clientX: box!.x + box!.width - 8,
      clientY: box!.y + box!.height / 2,
    });
    await expect(dial).toBeFocused();
    await expect(surface).toHaveCSS("outline-style", "solid");
    await dial.dispatchEvent("pointerup", {
      pointerId: 70,
      button: 0,
      buttons: 0,
      clientX: box!.x + box!.width - 8,
      clientY: box!.y + box!.height / 2,
    });
    await expect(surface).toHaveCSS("outline-style", "solid");
  });

  test("preserves number-input keyboard and scrub interactions", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const angle = document.createElement("fig-angle");
      angle.id = "keyboard-angle";
      angle.setAttribute("value", "0");
      angle.setAttribute("step", "0.5");
      angle.setAttribute("precision", "1");
      document.body.append(angle);
      const events: string[] = [];
      (angle as HTMLElement & { keyboardEvents?: string[] }).keyboardEvents =
        events;
      angle.addEventListener("input", () => events.push("input"));
      angle.addEventListener("change", () => events.push("change"));
    });

    const angle = page.locator("#keyboard-angle");
    const input = angle.locator(".fig-angle-input input");
    await input.focus();
    await page.keyboard.press("ArrowUp");
    await expect(angle).toHaveAttribute("value", "0.5");
    await page.keyboard.press("Shift+ArrowUp");
    await expect(angle).toHaveAttribute("value", "5.5");
    await expect(input).toBeFocused();

    await input.dispatchEvent("pointerdown", {
      altKey: true,
      button: 0,
      buttons: 1,
    });
    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          buttons: 1,
          movementX: 4,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          buttons: 0,
        }),
      );
    });
    await expect(angle).toHaveAttribute("value", "7.5");

    const events = await angle.evaluate(
      (element) =>
        (element as HTMLElement & { keyboardEvents?: string[] }).keyboardEvents,
    );
    expect(events).toEqual([
      "input",
      "change",
      "input",
      "change",
      "input",
      "change",
    ]);
  });

  test("shows an inset reset button away from default and resets the value", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const angle = document.createElement("fig-angle");
      angle.id = "reset-angle";
      angle.setAttribute("default", "30");
      angle.setAttribute("value", "45");
      angle.style.width = "160px";
      document.body.append(angle);
    });

    const angle = page.locator("#reset-angle");
    const surface = angle.locator(".fig-angle-surface");
    const reset = angle.locator(".fig-angle-reset");
    await expect(reset).toBeVisible();

    const inset = await Promise.all([
      surface.boundingBox(),
      reset.boundingBox(),
    ]).then(([surfaceBox, resetBox]) => ({
      right: surfaceBox!.x + surfaceBox!.width - (resetBox!.x + resetBox!.width),
      bottom:
        surfaceBox!.y + surfaceBox!.height - (resetBox!.y + resetBox!.height),
    }));
    expect(inset.right).toBeGreaterThan(0);
    expect(inset.bottom).toBeGreaterThan(0);

    await angle.evaluate((element) => {
      const types: string[] = [];
      (element as HTMLElement & { resetEvents?: string[] }).resetEvents = types;
      element.addEventListener("input", () => types.push("input"));
      element.addEventListener("change", () => types.push("change"));
    });
    await reset.click();

    await expect(angle).toHaveAttribute("value", "30");
    await expect(reset).toBeHidden();
    const events = await angle.evaluate(
      (element) =>
        (element as HTMLElement & { resetEvents?: string[] }).resetEvents,
    );
    expect(events).toEqual(["input", "change"]);
  });

  test("draws a centered rotation arrow that follows the angle direction", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const Angle = customElements.get("fig-angle") as CustomElementConstructor & {
        rotationIcon(angle?: number, size?: number): string;
      };
      const angle = document.createElement("fig-angle") as HTMLElement & {
        value: number;
      };
      angle.value = 45;
      document.body.append(angle);
      const reference = angle.querySelector(".fig-angle-reference")!;
      const path = reference.querySelector(".fig-angle-reference-path")!;
      const readReference = () => {
        const d = path.getAttribute("d") || "";
        const arrowStart = d.indexOf(" M ", 1);
        return {
          direction: reference.getAttribute("data-direction"),
          arc: arrowStart < 0 ? d : d.slice(0, arrowStart),
          arrow: arrowStart < 0 ? "" : d.slice(arrowStart + 1),
        };
      };
      const positive = readReference();
      angle.value = -45;
      const negative = {
        ...readReference(),
        indicator: angle
          .querySelector(".fig-angle-indicator")
          ?.getAttribute("transform"),
        value: angle.value,
      };
      angle.value = 450;
      const full450 = readReference();
      angle.value = 540;
      const full540 = readReference();
      angle.value = 0;
      const zero = {
        hidden: path.hasAttribute("hidden"),
        d: path.getAttribute("d"),
        pathCount: reference.querySelectorAll("path").length,
      };
      return {
        positive,
        negative,
        full450,
        full540,
        zero,
        clockwiseIcon: Angle.rotationIcon(90, 16),
        counterclockwiseIcon: Angle.rotationIcon(-90, 16),
        zeroIcon: Angle.rotationIcon(0, 16),
      };
    });

    expect(state.positive.direction).toBe("clockwise");
    expect(state.positive.arc).toMatch(/^M 97 50 A 47 47 0 0 1 /);
    expect(state.positive.arrow).toMatch(/^M .* L .* L /);
    const arrowNumbers =
      state.positive.arrow?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const [firstX, firstY, tipX, tipY, secondX, secondY] = arrowNumbers;
    const arcNumbers =
      state.positive.arc?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    expect([tipX, tipY]).toEqual(arcNumbers.slice(-2));
    const firstArm = { x: firstX - tipX, y: firstY - tipY };
    const secondArm = { x: secondX - tipX, y: secondY - tipY };
    expect(Math.hypot(firstArm.x, firstArm.y)).toBeCloseTo(4, 2);
    expect(Math.hypot(secondArm.x, secondArm.y)).toBeCloseTo(4, 2);
    expect(firstArm.x * secondArm.x + firstArm.y * secondArm.y).toBeCloseTo(
      0,
      2,
    );
    expect(state.negative).toMatchObject({
      direction: "counterclockwise",
      indicator: "rotate(315 50 50)",
      value: -45,
    });
    expect(state.negative.arc).toMatch(/^M 97 50 A 47 47 0 0 0 /);
    expect(state.negative.arrow).not.toBe(state.positive.arrow);
    expect(state.full450.arc.match(/A 47 47/g)).toHaveLength(2);
    expect(state.full540.arc).toBe(state.full450.arc);
    expect(state.full540.arrow).not.toBe(state.full450.arrow);
    expect(state.clockwiseIcon).toContain('width="16"');
    expect(state.clockwiseIcon).toContain('viewBox="0 0 24 24"');
    expect(state.clockwiseIcon).toContain('data-direction="clockwise"');
    expect(state.clockwiseIcon).toContain(
      'stroke-width="var(--stroke-width, 1)"',
    );
    expect(state.clockwiseIcon).toContain("M 19 12 A 7 7 0 0 1");
    expect(state.counterclockwiseIcon).toContain(
      'data-direction="counterclockwise"',
    );
    expect(state.counterclockwiseIcon).toContain("M 19 12 A 7 7 0 0 0");
    expect(state.zero).toEqual({
      hidden: true,
      d: "",
      pathCount: 1,
    });
    expect(state.zeroIcon).not.toContain("<path");
  });

  test("uses easing surface tokens and keeps the dial circular", async ({
    page,
  }) => {
    const geometry = await page.evaluate(() => {
      const easing = document.createElement("fig-easing-curve");
      const angle = document.createElement("fig-angle");
      angle.style.cssText = "width:240px;--aspect-ratio:2 / 1";
      document.body.append(easing, angle);
      const easingSurface = easing.querySelector(
        ".fig-easing-curve-svg-container",
      ) as HTMLElement;
      const angleSurface = angle.querySelector(
        ".fig-angle-surface",
      ) as HTMLElement;
      const angleDial = angle.querySelector(".fig-angle-svg") as SVGElement;
      const circle = angle.querySelector(
        ".fig-angle-boundary",
      ) as SVGCircleElement;
      const easingStyle = getComputedStyle(easingSurface);
      const angleStyle = getComputedStyle(angleSurface);
      const circleRect = circle.getBoundingClientRect();
      const idleCursor = getComputedStyle(angleDial).cursor;
      angleSurface.classList.add("dragging");
      const draggingCursor = getComputedStyle(angleDial).cursor;
      return {
        easingPadding: easingStyle.padding,
        anglePadding: angleStyle.padding,
        easingRadius: easingStyle.borderRadius,
        angleRadius: angleStyle.borderRadius,
        backgroundMatches:
          easingStyle.backgroundColor === angleStyle.backgroundColor,
        idleCursor,
        draggingCursor,
        surfaceWide: angleSurface.offsetWidth > angleSurface.offsetHeight,
        circleWidth: circleRect.width,
        circleHeight: circleRect.height,
      };
    });

    expect(parseFloat(geometry.anglePadding)).toBeGreaterThan(0);
    expect(geometry.angleRadius).toBe(geometry.easingRadius);
    expect(geometry.backgroundMatches).toBe(true);
    expect(geometry.idleCursor).toBe("grab");
    expect(geometry.draggingCursor).toBe("grabbing");
    expect(geometry.surfaceWide).toBe(true);
    expect(Math.abs(geometry.circleWidth - geometry.circleHeight)).toBeLessThan(
      0.01,
    );
  });

  test("supports CSS angle units with equivalent dial geometry", async ({
    page,
  }) => {
    const states = await page.evaluate(() => {
      const angle = document.createElement("fig-angle") as HTMLElement & {
        value: number;
        adjacent: number;
        opposite: number;
      };
      document.body.append(angle);
      const read = () => ({
        transform: angle
          .querySelector(".fig-angle-indicator")
          ?.getAttribute("transform"),
        value: angle.value,
        adjacent: angle.adjacent,
        opposite: angle.opposite,
        valueText: angle
          .querySelector(".fig-angle-svg")
          ?.getAttribute("aria-valuetext"),
        inputUnits: angle
          .querySelector(".fig-angle-input")
          ?.getAttribute("units"),
      });
      const cases = [
        ["deg", 90],
        ["°", 90],
        ["rad", Math.PI / 2],
        ["turn", 0.25],
        ["grad", 100],
      ] as const;
      return cases.map(([unit, value]) => {
        angle.setAttribute("units", unit);
        angle.value = value;
        return { unit, ...read() };
      });
    });

    for (const state of states) {
      expect(state.transform).toBe("rotate(90 50 50)");
      expect(state.adjacent).toBeCloseTo(0, 8);
      expect(state.opposite).toBeCloseTo(1, 8);
      expect(state.valueText).toContain(state.unit === "deg" ? "°" : state.unit);
      expect(state.inputUnits).toBe(state.unit === "deg" ? "°" : state.unit);
    }
  });

  test("converts the value when units change and uses turn precision", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const angle = document.createElement("fig-angle") as HTMLElement & {
        value: number;
      };
      angle.setAttribute("value", "90");
      document.body.append(angle);
      angle.setAttribute("units", "turn");
      const converted = {
        value: angle.value,
        attr: angle.getAttribute("value"),
        input: (
          angle.querySelector(".fig-angle-input input") as HTMLInputElement
        ).value,
        indicator: angle
          .querySelector(".fig-angle-indicator")
          ?.getAttribute("transform"),
      };
      angle.setAttribute("precision", "1");
      const overridden = (
        angle.querySelector(".fig-angle-input input") as HTMLInputElement
      ).value;
      let inputDetail = null;
      angle.addEventListener("input", (event) => {
        inputDetail = (event as CustomEvent).detail;
      });
      angle
        .querySelector(".fig-angle-svg")
        ?.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowRight",
            bubbles: true,
          }),
        );
      return {
        converted,
        overridden,
        storedValue: angle.value,
        inputDetail,
      };
    });

    expect(state).toEqual({
      converted: {
        value: 0.25,
        attr: "0.25",
        input: "0.250turn",
        indicator: "rotate(90 50 50)",
      },
      overridden: "0.3turn",
      storedValue: 0.251,
      inputDetail: { value: 0.3, angle: 0.3, units: "turn" },
    });
  });

  test("supports default values and unit-aware optional bounds", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      type AngleElement = HTMLElement & {
        value: number;
        defaultValue: number;
      };

      const unbounded = document.createElement("fig-angle") as AngleElement;
      document.body.append(unbounded);
      unbounded.value = -1080;
      const negative = unbounded.value;
      unbounded.value = 1080;
      const positive = unbounded.value;

      const bounded = document.createElement("fig-angle") as AngleElement;
      bounded.setAttribute("units", "turn");
      bounded.setAttribute("min", "-0.5");
      bounded.setAttribute("max", "0.5");
      bounded.setAttribute("default", "0.25");
      document.body.append(bounded);
      const initial = {
        value: bounded.value,
        defaultValue: bounded.defaultValue,
      };
      bounded.value = 1;
      const clampedHigh = bounded.value;
      bounded.value = -0.25;
      bounded.setAttribute("units", "deg");
      const converted = {
        value: bounded.value,
        defaultValue: bounded.defaultValue,
        min: bounded.getAttribute("min"),
        max: bounded.getAttribute("max"),
        default: bounded.getAttribute("default"),
      };
      bounded.defaultValue = -45;
      return {
        unbounded: { negative, positive },
        initial,
        clampedHigh,
        converted,
        assignedDefault: {
          value: bounded.value,
          defaultValue: bounded.defaultValue,
          default: bounded.getAttribute("default"),
        },
      };
    });

    expect(state).toEqual({
      unbounded: { negative: -1080, positive: 1080 },
      initial: { value: 0.25, defaultValue: 0.25 },
      clampedHigh: 0.5,
      converted: {
        value: -90,
        defaultValue: 90,
        min: "-180",
        max: "180",
        default: "90",
      },
      assignedDefault: {
        value: -90,
        defaultValue: -45,
        default: "-45",
      },
    });
  });

  test("reflects values, clamps bounds, and exposes slider semantics", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const angle = document.createElement("fig-angle") as HTMLElement & {
        value: number;
      };
      angle.setAttribute("aria-label", "Rotation");
      angle.setAttribute("min", "10");
      angle.setAttribute("max", "20");
      angle.setAttribute("value", "15");
      document.body.append(angle);
      const dial = angle.querySelector(".fig-angle-svg") as HTMLElement;
      const events = { input: 0, change: 0 };
      angle.addEventListener("input", () => events.input++);
      angle.addEventListener("change", () => events.change++);
      dial.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true }),
      );
      const afterEnd = {
        value: angle.value,
        attr: angle.getAttribute("value"),
        now: dial.getAttribute("aria-valuenow"),
        events: { ...events },
      };
      angle.value = 100;
      const clamped = { value: angle.value, attr: angle.getAttribute("value") };
      angle.setAttribute("disabled", "");
      const disabledDial = angle.querySelector(
        ".fig-angle-svg",
      ) as HTMLElement;
      disabledDial.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
      );
      return {
        role: disabledDial.getAttribute("role"),
        name: disabledDial.getAttribute("aria-label"),
        min: disabledDial.getAttribute("aria-valuemin"),
        max: disabledDial.getAttribute("aria-valuemax"),
        disabled: disabledDial.getAttribute("aria-disabled"),
        tabIndex: disabledDial.tabIndex,
        afterEnd,
        clamped,
        finalValue: angle.value,
      };
    });

    expect(state).toEqual({
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

  test("uses 15-degree Shift steps and preserves winding across zero", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const angle = document.createElement("fig-angle") as HTMLElement & {
        value: number;
      };
      angle.style.width = "200px";
      angle.setAttribute("value", "0");
      document.body.append(angle);
      const surface = angle.querySelector(".fig-angle-surface") as HTMLElement;
      const dial = angle.querySelector(".fig-angle-svg") as SVGElement;
      dial.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
        }),
      );
      const defaultStepValue = angle.value;
      angle.value = 0;
      dial.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          shiftKey: true,
          bubbles: true,
        }),
      );
      const keyboardValue = angle.value;

      angle.value = 350;
      const rect = surface.getBoundingClientRect();
      const point = (degrees: number, radius = 70) => {
        const radians = (degrees * Math.PI) / 180;
        return {
          clientX: rect.left + rect.width / 2 + Math.cos(radians) * radius,
          clientY: rect.top + rect.height / 2 + Math.sin(radians) * radius,
        };
      };
      dial.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...point(350),
          pointerId: 41,
          button: 0,
          buttons: 1,
          bubbles: true,
        }),
      );
      dial.dispatchEvent(
        new PointerEvent("pointermove", {
          ...point(10),
          pointerId: 41,
          buttons: 1,
          bubbles: true,
        }),
      );
      dial.dispatchEvent(
        new PointerEvent("pointerup", {
          ...point(10),
          pointerId: 41,
          button: 0,
          bubbles: true,
        }),
      );
      const woundValue = angle.value;

      angle.value = 0;
      dial.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...point(22),
          pointerId: 42,
          button: 0,
          buttons: 1,
          shiftKey: true,
          bubbles: true,
        }),
      );
      dial.dispatchEvent(
        new PointerEvent("pointerup", {
          ...point(22),
          pointerId: 42,
          button: 0,
          shiftKey: true,
          bubbles: true,
        }),
      );
      return {
        defaultStepValue,
        keyboardValue,
        woundValue,
        snappedValue: angle.value,
      };
    });

    expect(state.defaultStepValue).toBe(1);
    expect(state.keyboardValue).toBe(15);
    expect(state.woundValue).toBeCloseTo(370, 5);
    expect(state.snappedValue).toBe(15);
  });

  test("keeps the number input and dial linked in both directions", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const angle = document.createElement("fig-angle") as HTMLElement & {
        value: number;
      };
      angle.setAttribute("rotations", "");
      angle.setAttribute("value", "720");
      document.body.append(angle);
      const input = angle.querySelector("fig-input-number") as HTMLElement & {
        value: number;
      };
      const nativeInput = input.querySelector("input") as HTMLInputElement;
      const counts = { input: 0, change: 0 };
      const details: Record<string, unknown> = {};
      angle.addEventListener("input", (event) => {
        counts.input++;
        details.input = (event as CustomEvent).detail;
      });
      angle.addEventListener("change", (event) => {
        counts.change++;
        details.change = (event as CustomEvent).detail;
      });
      const rotations = angle.querySelector(".fig-angle-rotations")?.textContent;
      const ariaMax = angle
        .querySelector(".fig-angle-svg")
        ?.getAttribute("aria-valuemax");
      nativeInput.value = "42deg";
      nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
      const live = {
        counts: { ...counts },
        value: angle.value,
        indicator: angle
          .querySelector(".fig-angle-indicator")
          ?.getAttribute("transform"),
      };
      nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
      const committed = { ...counts };
      angle.value = 90;
      const defaultPrecisionValue = (
        angle.querySelector(".fig-angle-input input") as HTMLInputElement
      ).value;
      angle.setAttribute("precision", "2");
      const overriddenPrecisionValue = (
        angle.querySelector(".fig-angle-input input") as HTMLInputElement
      ).value;
      angle.setAttribute("disabled", "");
      const beforeDisabledKey = angle.value;
      angle
        .querySelector(".fig-angle-svg")
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
        );
      return {
        live,
        committed,
        rotations,
        ariaMax,
        details,
        defaultPrecisionValue,
        overriddenPrecisionValue,
        stableWhenDisabled: angle.value === beforeDisabledKey,
      };
    });

    expect(state).toEqual({
      live: {
        counts: { input: 1, change: 0 },
        value: 42,
        indicator: "rotate(42 50 50)",
      },
      committed: { input: 1, change: 1 },
      rotations: "×2",
      ariaMax: "720",
      details: {
        input: { value: 42, angle: 42, units: "deg" },
        change: { value: 42, angle: 42, units: "deg" },
      },
      defaultPrecisionValue: "90°",
      overriddenPrecisionValue: "90.00°",
      stableWhenDisabled: true,
    });
  });
});
