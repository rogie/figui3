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

  test("minimal propskit controls remove row padding and reveal backgrounds on hover", async ({
    page,
  }) => {
    const controlIds = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div id="minimal-background-reference" style="background-color:var(--figma-color-bg-secondary)"></div>
        <div id="minimal-stack">
          <propskit-switch id="minimal-switch" variant="minimal" label="Switch" checked></propskit-switch>
          <propskit-color id="minimal-color" variant="minimal" label="Color" value="#0D99FF"></propskit-color>
          <propskit-fill id="minimal-fill" variant="minimal" label="Fill" value='{"type":"solid","color":"#0D99FF","alpha":1}'></propskit-fill>
          <propskit-gradient id="minimal-gradient" variant="minimal" label="Gradient" value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}'></propskit-gradient>
          <propskit-select id="minimal-select" variant="minimal" label="Select" value="One" options="One,Two"></propskit-select>
          <propskit-text id="minimal-text" variant="minimal" label="Text" value="Value"></propskit-text>
          <propskit-number id="minimal-number" variant="minimal" label="Number" value="10"></propskit-number>
          <propskit-slider id="minimal-slider" variant="minimal" label="Slider" value="50" min="0" max="100"></propskit-slider>
          <propskit-wheel id="minimal-wheel" variant="minimal" label="Time" value="240" units="ms"></propskit-wheel>
          <propskit-position id="minimal-position" variant="minimal" label="Position" x="50" y="50"></propskit-position>
        </div>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return [
        "minimal-switch",
        "minimal-color",
        "minimal-fill",
        "minimal-gradient",
        "minimal-select",
        "minimal-text",
        "minimal-number",
        "minimal-slider",
        "minimal-wheel",
        "minimal-position",
      ];
    });

    const initial = await page.evaluate((ids) => {
      return {
        expectedHover: getComputedStyle(
          document.querySelector("#minimal-background-reference")!,
        ).backgroundColor,
        controls: ids.map((id) => {
          const host = document.querySelector(`#${id}`)!;
          const field = host.querySelector(
            ":scope > fig-field, :scope > .propskit-wheel-surface",
          )!;
          const sliderSurface = host.querySelector(".fig-slider-input-container");
          const gradientInput = host.querySelector("fig-input-gradient");
          const swatch = host.querySelector("fig-swatch");
          const hostStyle = getComputedStyle(host);
          return {
            id,
            paddingTop: hostStyle.paddingTop,
            paddingBottom: hostStyle.paddingBottom,
            fieldBackground: getComputedStyle(field).backgroundColor,
            sliderBackground: sliderSurface
              ? getComputedStyle(sliderSurface).backgroundColor
              : null,
            gradientInputBackground: gradientInput
              ? getComputedStyle(gradientInput).backgroundColor
              : null,
            swatchBackground: swatch
              ? getComputedStyle(swatch).backgroundColor
              : null,
            forwardedVariant: host.querySelector("[variant]")?.getAttribute("variant") ?? null,
          };
        }),
      };
    }, controlIds);

    for (const control of initial.controls) {
      expect(control).toMatchObject({
        paddingTop: "0px",
        paddingBottom: "0px",
        fieldBackground: "rgba(0, 0, 0, 0)",
        forwardedVariant: null,
      });
      if (control.id === "minimal-slider") {
        expect(control.sliderBackground).toBe("rgba(0, 0, 0, 0)");
      }
      if (
        control.id === "minimal-color" ||
        control.id === "minimal-fill" ||
        control.id === "minimal-gradient"
      ) {
        expect(control.swatchBackground).toBe("rgba(0, 0, 0, 0)");
      }
      if (control.id === "minimal-gradient") {
        expect(control.gradientInputBackground).toBe("rgba(0, 0, 0, 0)");
      }
    }

    for (const id of controlIds) {
      const host = page.locator(`#minimal-stack > #${id}`);
      await host.hover();
      await expect
        .poll(() =>
          host.evaluate((element) => {
            const field = element.querySelector(
              ":scope > fig-field, :scope > .propskit-wheel-surface",
            )!;
            const sliderSurface = element.querySelector(
              ".fig-slider-input-container",
            );
            return {
              background: getComputedStyle(field).backgroundColor,
              borderShadow: getComputedStyle(field, "::after").boxShadow,
              sliderBorderShadow: sliderSurface
                ? getComputedStyle(sliderSurface, "::after").boxShadow
                : "none",
            };
          }),
        )
        .toEqual({
          background: initial.expectedHover,
          borderShadow: "none",
          sliderBorderShadow: "none",
        });
    }
  });

  test("propskit group small size applies to unsized child controls", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <propskit-group id="sized-group" name="Minimal controls" size="small" open>
          <propskit-text id="group-sized-text" variant="minimal" label="Text" value="Value"></propskit-text>
          <propskit-number id="authored-sized-number" variant="minimal" size="large" label="Number" value="10"></propskit-number>
        </propskit-group>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const group = root.querySelector("#sized-group")!;
      const text = root.querySelector("#group-sized-text")!;
      const number = root.querySelector("#authored-sized-number")!;
      const initial = {
        textSize: text.getAttribute("size"),
        textGenerated: text.hasAttribute("data-propskit-group-size"),
        numberSize: number.getAttribute("size"),
        numberGenerated: number.hasAttribute("data-propskit-group-size"),
      };

      const added = document.createElement("propskit-switch");
      added.id = "dynamic-group-sized-switch";
      added.setAttribute("variant", "minimal");
      added.setAttribute("label", "Switch");
      group.append(added);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const dynamic = {
        size: added.getAttribute("size"),
        generated: added.hasAttribute("data-propskit-group-size"),
      };

      group.removeAttribute("size");
      await new Promise(requestAnimationFrame);
      return {
        initial,
        dynamic,
        restored: {
          textSize: text.getAttribute("size"),
          textGenerated: text.hasAttribute("data-propskit-group-size"),
          numberSize: number.getAttribute("size"),
          numberGenerated: number.hasAttribute("data-propskit-group-size"),
          dynamicSize: added.getAttribute("size"),
          dynamicGenerated: added.hasAttribute("data-propskit-group-size"),
        },
      };
    });

    expect(state).toEqual({
      initial: {
        textSize: "small",
        textGenerated: true,
        numberSize: "large",
        numberGenerated: false,
      },
      dynamic: {
        size: "small",
        generated: true,
      },
      restored: {
        textSize: null,
        textGenerated: false,
        numberSize: "large",
        numberGenerated: false,
        dynamicSize: null,
        dynamicGenerated: false,
      },
    });
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

  test("canvas color controls preserve handle opacity in wrapper events", async ({
    page,
  }) => {
    const details = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div style="position:relative;width:200px;height:100px">
          <fig-canvas-control type="color" color="#0D99FF"></fig-canvas-control>
        </div>`;
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("fig-canvas-control")!;
      const handle = host.querySelector("fig-handle")!;
      const events: Record<string, unknown>[] = [];
      host.addEventListener("input", (event) => {
        events.push((event as CustomEvent).detail);
      });
      host.addEventListener("change", (event) => {
        events.push((event as CustomEvent).detail);
      });

      handle.setAttribute("color", "rgba(255, 0, 191, 0.35)");
      handle.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: { color: "#FF00BF", alpha: 0.35 },
        }),
      );
      handle.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: { color: "#FF00BF", opacity: 35 },
        }),
      );
      return {
        events,
        wrapperColor: host.getAttribute("color"),
      };
    });

    expect(details).toEqual({
      events: [
        { x: 50, y: 50, color: "#FF00BF", alpha: 0.35, opacity: 35 },
        { x: 50, y: 50, color: "#FF00BF", alpha: 0.35, opacity: 35 },
      ],
      wrapperColor: "rgba(255, 0, 191, 0.35)",
    });
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

  test("propskit opacity fill stays solid while its alpha follows the value", async ({
    page,
  }) => {
    const styles = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <propskit-slider data-zero type="opacity" color="#0D99FF"
          value="0" min="0" max="100"></propskit-slider>
        <propskit-slider type="opacity" color="#0D99FF"
          value="10" min="0" max="100"></propskit-slider>
        <propskit-slider data-default-color type="opacity"
          value="100" min="0" max="100"></propskit-slider>
        <propskit-slider data-dark-color type="opacity" color="#111111"
          value="50" min="0" max="100"></propskit-slider>
        <propskit-slider data-light-color type="opacity" color="#F5F5F5"
          value="50" min="0" max="100"></propskit-slider>
        <propskit-slider data-dark-surface type="opacity" color="#0D99FF"
          value="61.3" min="0" max="100" style="color-scheme:dark"></propskit-slider>
        <propskit-slider data-dark-surface-light-color type="opacity" color="#FFFFFF"
          value="38.2" min="0" max="100" style="color-scheme:dark"></propskit-slider>
        <propskit-slider data-red-light type="opacity" color="#FF0000"
          value="100" min="0" max="100" style="color-scheme:light"></propskit-slider>
        <propskit-slider data-red-dark type="opacity" color="#FF0000"
          value="100" min="0" max="100" style="color-scheme:dark"></propskit-slider>
        <propskit-slider data-black-dark type="opacity" color="#000000"
          value="100" min="0" max="100" style="color-scheme:dark"></propskit-slider>
        <propskit-slider data-white-light type="opacity" color="#FFFFFF"
          value="100" min="0" max="100" style="color-scheme:light"></propskit-slider>
        <propskit-slider data-non-opacity type="range" color="#111111"
          value="50" min="0" max="100"></propskit-slider>`;
      await new Promise(requestAnimationFrame);
      const slider = root.querySelector(
        "propskit-slider:not([data-zero])",
      ) as HTMLElement & {
        value: string;
      };
      const track = slider.querySelector(".fig-slider-input-container")!;
      const read = () => {
        const style = getComputedStyle(track, "::before");
        const borderStyle = getComputedStyle(track, "::after");
        const labelStyle = getComputedStyle(slider.querySelector("label")!);
        return {
          opacity: style.opacity,
          backgroundImage: style.backgroundImage,
          backgroundColor: style.backgroundColor,
          trackBackgroundImage: getComputedStyle(track).backgroundImage,
          width: Number.parseFloat(style.width),
          trackWidth: track.getBoundingClientRect().width,
          clipPath: style.clipPath,
          borderRadius: style.borderRadius,
          borderWidth: borderStyle.borderWidth,
          borderStyle: borderStyle.borderStyle,
          borderColor: borderStyle.borderColor,
          borderBlendMode: borderStyle.mixBlendMode,
          borderOpacity: borderStyle.opacity,
          afterBackground: borderStyle.backgroundImage,
          labelBackgroundImage: labelStyle.backgroundImage,
          labelTextFillColor: labelStyle.webkitTextFillColor,
        };
      };
      const low = read();
      slider.value = "90";
      await new Promise(requestAnimationFrame);
      const defaultSlider = root.querySelector(
        "propskit-slider[data-default-color] fig-slider",
      )!;
      const defaultTrack = defaultSlider.querySelector(
        ".fig-slider-input-container",
      )!;
      const darkSlider = root.querySelector(
        "propskit-slider[data-dark-color]",
      )!;
      const numberTheme = (host: Element) =>
        host.querySelector("fig-input-number")?.getAttribute("theme");
      const numberStyle = (host: Element) => {
        const style = getComputedStyle(
          host.querySelector("fig-input-number input")!,
        );
        return {
          backgroundImage: style.backgroundImage,
          textFillColor: style.webkitTextFillColor,
        };
      };
      const lightSlider = root.querySelector(
        "propskit-slider[data-light-color]",
      )!;
      const initialThemes = {
        dark: numberTheme(darkSlider),
        light: numberTheme(lightSlider),
        darkSurface: numberTheme(
          root.querySelector("propskit-slider[data-dark-surface]")!,
        ),
        darkSurfaceLightColor: numberTheme(
          root.querySelector(
            "propskit-slider[data-dark-surface-light-color]",
          )!,
        ),
        noColor: numberTheme(
          root.querySelector("propskit-slider[data-default-color]")!,
        ),
        nonOpacity: numberTheme(
          root.querySelector("propskit-slider[data-non-opacity]")!,
        ),
      };
      const initialTextStyles = {
        dark: numberStyle(darkSlider),
        light: numberStyle(lightSlider),
      };
      const labelStyle = (host: Element) => {
        const style = getComputedStyle(host.querySelector("label")!);
        return {
          backgroundImage: style.backgroundImage,
          textFillColor: style.webkitTextFillColor,
        };
      };
      const initialLabelStyles = {
        dark: labelStyle(darkSlider),
        light: labelStyle(lightSlider),
        darkSurface: labelStyle(
          root.querySelector("propskit-slider[data-dark-surface]")!,
        ),
        darkSurfaceLightColor: labelStyle(
          root.querySelector(
            "propskit-slider[data-dark-surface-light-color]",
          )!,
        ),
      };
      const darkSurfaceBorderColor = getComputedStyle(
        root.querySelector(
          "propskit-slider[data-dark-surface] .fig-slider-input-container",
        )!,
        "::after",
      ).borderColor;
      const redBorderColor = (scheme: "light" | "dark") =>
        getComputedStyle(
          root.querySelector(
            `propskit-slider[data-red-${scheme}] .fig-slider-input-container`,
          )!,
          "::after",
        ).borderColor;
      const extremeBorderColor = (color: "black" | "white", scheme: "dark" | "light") =>
        getComputedStyle(
          root.querySelector(
            `propskit-slider[data-${color}-${scheme}] .fig-slider-input-container`,
          )!,
          "::after",
        ).borderColor;
      const zeroBorderOpacity = getComputedStyle(
        root.querySelector(
          "propskit-slider[data-zero] .fig-slider-input-container",
        )!,
        "::after",
      ).opacity;
      const resolveTextColor = (
        token: "--figma-color-text" | "--figma-color-text-oninverse",
        colorScheme: "light" | "dark",
      ) => {
        const probe = document.createElement("span");
        probe.style.colorScheme = colorScheme;
        probe.style.color = `var(${token})`;
        root.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      const expectedTextColors = {
        lightDefault: resolveTextColor("--figma-color-text", "light"),
        lightInverse: resolveTextColor(
          "--figma-color-text-oninverse",
          "light",
        ),
        darkDefault: resolveTextColor("--figma-color-text", "dark"),
        darkInverse: resolveTextColor(
          "--figma-color-text-oninverse",
          "dark",
        ),
      };
      darkSlider.setAttribute("color", "#FFFFFF");
      await new Promise(requestAnimationFrame);
      const changedTheme = numberTheme(darkSlider);
      darkSlider.removeAttribute("color");
      await new Promise(requestAnimationFrame);
      return {
        low,
        high: read(),
        defaultBackground: getComputedStyle(
          defaultTrack,
          "::before",
        ).backgroundImage,
        initialThemes,
        initialTextStyles,
        initialLabelStyles,
        darkSurfaceBorderColor,
        redLightBorderColor: redBorderColor("light"),
        redDarkBorderColor: redBorderColor("dark"),
        blackDarkBorderColor: extremeBorderColor("black", "dark"),
        whiteLightBorderColor: extremeBorderColor("white", "light"),
        zeroBorderOpacity,
        expectedTextColors,
        changedTheme,
        removedTheme: numberTheme(darkSlider),
      };
    });

    expect(styles.low.opacity).toBe("1");
    expect(styles.high.opacity).toBe("1");
    expect(styles.high.backgroundImage).not.toBe(styles.low.backgroundImage);
    expect(styles.low.backgroundImage).toContain("linear-gradient");
    expect(styles.high.backgroundColor).toBe(styles.low.backgroundColor);
    expect(styles.low.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(styles.low.trackBackgroundImage).toBe("none");
    expect(styles.high.trackBackgroundImage).toBe(
      styles.low.trackBackgroundImage,
    );
    expect(styles.low.width).toBeCloseTo(styles.low.trackWidth * 0.1, 0);
    expect(styles.high.width).toBeCloseTo(styles.high.trackWidth * 0.9, 0);
    expect(styles.low.clipPath).toBe("none");
    expect(styles.high.clipPath).toBe("none");
    expect(styles.low.borderRadius).not.toBe("0px");
    expect(styles.low.borderWidth).toBe("1px");
    expect(styles.low.borderStyle).toBe("solid");
    expect(styles.low.borderColor).not.toBe("rgb(0, 0, 0)");
    expect(styles.low.borderColor).not.toBe("rgb(255, 255, 255)");
    expect(styles.high.borderColor).not.toBe(styles.low.borderColor);
    expect(styles.darkSurfaceBorderColor).not.toBe("rgb(255, 255, 255)");
    expect(styles.redLightBorderColor).not.toBe(styles.redDarkBorderColor);
    expect(styles.redLightBorderColor).not.toBe("rgb(255, 0, 0)");
    expect(styles.redDarkBorderColor).not.toBe("rgb(255, 0, 0)");
    expect(styles.blackDarkBorderColor).not.toBe("rgb(0, 0, 0)");
    expect(styles.whiteLightBorderColor).not.toBe("rgb(255, 255, 255)");
    expect(styles.zeroBorderOpacity).toBe("0");
    expect(styles.low.borderBlendMode).toBe("normal");
    expect(styles.high.borderBlendMode).toBe("normal");
    expect(styles.low.borderOpacity).toBe("1");
    expect(styles.high.borderOpacity).toBe("1");
    expect(styles.low.afterBackground).toBe("none");
    expect(styles.high.afterBackground).toBe("none");
    expect(styles.low.labelBackgroundImage).not.toBe(
      styles.high.labelBackgroundImage,
    );
    expect(styles.low.labelTextFillColor).toBe("rgba(0, 0, 0, 0)");
    expect(styles.defaultBackground).toContain("linear-gradient");
    expect(styles.initialThemes).toEqual({
      dark: "light",
      light: "dark",
      darkSurface: "light",
      darkSurfaceLightColor: "dark",
      noColor: null,
      nonOpacity: null,
    });
    expect(styles.initialTextStyles.dark.backgroundImage).toContain(
      styles.expectedTextColors.lightInverse,
    );
    expect(styles.initialTextStyles.light.backgroundImage).toContain(
      styles.expectedTextColors.lightDefault,
    );
    expect(styles.initialLabelStyles.dark.backgroundImage).toContain(
      styles.expectedTextColors.lightInverse,
    );
    expect(styles.initialLabelStyles.light.backgroundImage).toContain(
      styles.expectedTextColors.lightDefault,
    );
    expect(styles.initialLabelStyles.darkSurface.backgroundImage).toContain(
      styles.expectedTextColors.darkDefault,
    );
    expect(
      styles.initialLabelStyles.darkSurfaceLightColor.backgroundImage,
    ).toContain(styles.expectedTextColors.darkInverse);
    expect(styles.initialLabelStyles.dark.textFillColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(styles.initialTextStyles.dark.textFillColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(styles.changedTheme).toBe("dark");
    expect(styles.removedTheme).toBeNull();
  });

  test("propskit opacity number input remains directly editable", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <propskit-slider type="opacity" color="#111111"
          value="50" min="0" max="100"></propskit-slider>`;
    });
    const input = page.locator("propskit-slider fig-input-number input");
    await input.click();
    await input.fill("42");

    await expect(input).toBeFocused();
    await expect(input).toHaveValue("42");
    await expect(input).not.toHaveAttribute("tabindex", "-1");
    await expect(input).not.toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("propskit-slider")).toHaveAttribute("value", "42");
  });

  test("propskit hue uses a selected-color surface with a bottom hue strip", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <propskit-slider id="hue-surface" type="hue" label="Hue"
          value="0" min="0" max="360" units="°"></propskit-slider>`;
      await new Promise(requestAnimationFrame);

      const host = root.querySelector("#hue-surface") as HTMLElement & {
        value: string;
      };
      const track = host.querySelector(".fig-slider-input-container")!;
      const label = host.querySelector("label")!;
      const number = host.querySelector("fig-input-number")!;
      const input = number.querySelector("input")!;
      const read = () => {
        const trackStyle = getComputedStyle(track);
        const stripStyle = getComputedStyle(track, "::after");
        return {
          surface: trackStyle.backgroundColor,
          stripHeight: stripStyle.height,
          stripBottom: stripStyle.bottom,
          stripLeft: stripStyle.left,
          stripRight: stripStyle.right,
          stripBackground: stripStyle.backgroundImage,
          stripBorderRadius: stripStyle.borderRadius,
          stripBorderTopWidth: stripStyle.borderTopWidth,
          stripBorderBottomWidth: stripStyle.borderBottomWidth,
          labelColor: getComputedStyle(label).color,
          labelTextShadow: getComputedStyle(label).textShadow,
          inputColor: getComputedStyle(input).color,
          inputTextShadow: getComputedStyle(input).textShadow,
          numberTheme: number.getAttribute("theme"),
        };
      };

      const red = read();
      host.value = "60";
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      return { red, yellow: read() };
    });

    expect(state.red.stripHeight).toBe("3px");
    expect(state.red.stripBottom).toBe("0px");
    expect(state.red.stripLeft).toBe("0px");
    expect(state.red.stripRight).toBe("0px");
    expect(state.red.stripBackground).not.toBe("none");
    expect(state.red.stripBorderRadius).toBe("0px");
    expect(state.red.stripBorderTopWidth).toBe("0px");
    expect(state.red.stripBorderBottomWidth).toBe("0px");
    expect(state.red.surface).not.toBe(state.yellow.surface);
    expect(state.red.labelColor).toBe(state.red.inputColor);
    expect(state.yellow.labelColor).toBe(state.yellow.inputColor);
    expect(state.red.labelTextShadow).toBe("none");
    expect(state.red.inputTextShadow).toBe("none");
    expect(state.red.labelColor).not.toBe(state.yellow.labelColor);
    expect(state.red.numberTheme).toBe("light");
    expect(state.yellow.numberTheme).toBe("dark");
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

  test("oscillator matches easing curve stroke and handles", async ({ page }) => {
    const styles = await page.evaluate(async () => {
      const oscillator = document.createElement("propskit-oscillator");
      const easing = document.createElement("fig-easing-curve");
      document.body.append(oscillator, easing);
      await new Promise(requestAnimationFrame);

      return {
        oscillatorStroke: getComputedStyle(
          oscillator.querySelector(".propskit-oscillator-path")!,
        ).strokeWidth,
        easingStroke: getComputedStyle(
          easing.querySelector(".fig-easing-curve-path")!,
        ).strokeWidth,
        oscillatorHandles: [
          ...oscillator.querySelectorAll(".propskit-oscillator-handle fig-handle"),
        ].map((handle) => ({
          type: handle.getAttribute("type"),
          size: handle.getAttribute("size"),
        })),
        easingHandle: {
          type: easing
            .querySelector(".fig-easing-curve-handle fig-handle")
            ?.getAttribute("type"),
          size: easing
            .querySelector(".fig-easing-curve-handle fig-handle")
            ?.getAttribute("size"),
        },
      };
    });

    expect(styles.oscillatorStroke).toBe(styles.easingStroke);
    expect(styles.oscillatorStroke).toBe("2px");
    expect(styles.oscillatorHandles).toEqual([
      styles.easingHandle,
      styles.easingHandle,
    ]);
    expect(styles.easingHandle).toEqual({ type: "minimal", size: "small" });
  });

  test("oscillator uses its wave type as the only group header", async ({
    page,
  }) => {
    const headers = await page.evaluate(async () => {
      const oscillator = document.createElement("propskit-oscillator");
      oscillator.setAttribute(
        "value",
        JSON.stringify({ waves: [{ type: "square", frequency: 1 }] }),
      );
      document.body.append(oscillator);
      await new Promise(requestAnimationFrame);

      return [
        ...oscillator.querySelectorAll(
          "fig-group.propskit-oscillator-wave > fig-header",
        ),
      ].map((header) => ({
        label: header.querySelector("h3")?.textContent,
        generated: header.hasAttribute("data-generated"),
      }));
    });

    expect(headers).toEqual([{ label: "Square", generated: false }]);
  });

  test("oscillator amplitude and offset use zero-centered delta sliders", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const oscillator = document.createElement("propskit-oscillator");
      document.body.append(oscillator);
      await new Promise(requestAnimationFrame);

      return ["amplitude", "offset"].map((name) => {
        const field = oscillator.querySelector(
          `propskit-slider[name="${name}"]`,
        )!;
        const slider = field.querySelector("fig-slider") as HTMLElement & {
          defaultValue: number;
        };
        return {
          name,
          hostType: field.getAttribute("type"),
          hostDefault: field.getAttribute("default"),
          sliderType: slider.getAttribute("type"),
          sliderDefault: slider.getAttribute("default"),
          sliderResolvedDefault: slider.defaultValue,
        };
      });
    });

    expect(state).toEqual(
      ["amplitude", "offset"].map((name) => ({
        name,
        hostType: "delta",
        hostDefault: "0",
        sliderType: "delta",
        sliderDefault: "0",
        sliderResolvedDefault: 0,
      })),
    );
  });

  test("oscillator add-form menu uses a plus trigger and inserts waves", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const oscillator = document.createElement("propskit-oscillator") as HTMLElement & {
        data: { waves: Array<{ type: string }> };
      };
      document.body.append(oscillator);
      await new Promise(requestAnimationFrame);

      const menu = oscillator.querySelector(
        ".propskit-oscillator-add-type",
      ) as HTMLElement;
      const items = [...menu.querySelectorAll("fig-menu-item")];
      const trigger = menu.querySelector("[fig-menu-trigger]") as HTMLElement;
      (menu.querySelector('fig-menu-item[value="triangle"]') as HTMLElement).click();
      await new Promise(requestAnimationFrame);

      return {
        tag: menu.tagName,
        itemCount: items.length,
        icons: items.filter((item) => item.querySelector("svg")).length,
        triggerIcon: trigger.querySelector("fig-icon")?.getAttribute("name"),
        waveTypes: oscillator.data.waves.map((wave) => wave.type),
      };
    });

    expect(state).toEqual({
      tag: "FIG-MENU",
      itemCount: 4,
      icons: 4,
      triggerIcon: "plus",
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

  test("slider reset reconnects and group matches fig-group header structure", async ({
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

      const implicitSlider = document.createElement(
        "propskit-slider",
      ) as HTMLElement & { value: string };
      implicitSlider.setAttribute("value", "70");
      document.body.append(implicitSlider);
      await new Promise(requestAnimationFrame);
      implicitSlider.value = "90";
      implicitSlider.querySelector("fig-menu")?.dispatchEvent(
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
      const heading = header.querySelector(":scope > h3")!;
      const reset = header.querySelector(":scope > .propskit-group-reset-tooltip");
      const headerRect = header.getBoundingClientRect();
      const resetRect = reset
        ?.querySelector("fig-button")
        ?.getBoundingClientRect();
      return {
        resetValue: slider.value,
        implicitResetValue: implicitSlider.value,
        resetMenuText:
          implicitSlider.querySelector('fig-menu-item[value="reset-default"]')
            ?.textContent,
        headerRole: header.getAttribute("role"),
        headingTag: heading.tagName,
        headingIsDirectChild: heading.parentElement === header,
        disclosureButton: heading.querySelector(
          ".propskit-group-disclosure",
        ),
        disclosureExpanded: header.getAttribute("aria-expanded"),
        resetOnRight:
          Boolean(resetRect) &&
          (resetRect?.right ?? 0) > headerRect.left + headerRect.width * 0.75,
        resetIsSibling: Boolean(reset && !heading.contains(reset)),
        nestedReset: heading.querySelector(".propskit-group-reset"),
      };
    });

    expect(state).toEqual({
      resetValue: "25",
      implicitResetValue: "70",
      resetMenuText: "Reset",
      headerRole: "button",
      headingTag: "H3",
      headingIsDirectChild: true,
      disclosureButton: null,
      disclosureExpanded: "false",
      resetOnRight: true,
      resetIsSibling: true,
      nestedReset: null,
    });
  });

  test("propskit controls expose default values and shared reset menus", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <propskit-switch value="visible" checked default="false"></propskit-switch>
        <propskit-color value="#FF0000" default="#112233"></propskit-color>
        <propskit-select value="A" default="B" options="A,B,C"></propskit-select>
        <propskit-text value="Initial" default="Default text"></propskit-text>
        <propskit-number value="4" default="8" min="0" max="10"></propskit-number>
      `;
      const oscillator = document.createElement(
        "propskit-oscillator",
      ) as HTMLElement & {
        value: string;
        data: { waves: Array<{ frequency: number }> };
      };
      const oscillatorDefault = JSON.stringify({
        waves: [
          {
            type: "sine",
            frequency: 2,
            amplitude: 1,
            phase: 0,
            offset: 0,
          },
        ],
      });
      oscillator.setAttribute("value", oscillatorDefault);
      oscillator.setAttribute("default", oscillatorDefault);
      root.append(oscillator);
      const group = document.createElement("propskit-group");
      root.append(group);
      await new Promise(requestAnimationFrame);

      const controls = [
        ...root.querySelectorAll(
          "propskit-switch, propskit-color, propskit-select, propskit-text, propskit-number",
        ),
      ] as Array<HTMLElement & {
        checked?: boolean;
        value: string;
      }>;
      const events = new Map<Element, string[]>();
      for (const control of controls) {
        events.set(control, []);
        control.addEventListener("input", () => events.get(control)?.push("input"));
        control.addEventListener("change", () =>
          events.get(control)?.push("change"),
        );
      }

      controls[0].checked = true;
      controls[1].value = "#445566";
      controls[2].value = "C";
      controls[3].value = "Changed";
      controls[4].value = "9";
      oscillator.value = JSON.stringify({
        waves: [
          {
            type: "square",
            frequency: 7,
            amplitude: 0.5,
            phase: 90,
            offset: 1,
          },
        ],
      });
      const oscillatorEvents: string[] = [];
      oscillator.addEventListener("input", () => oscillatorEvents.push("input"));
      oscillator.addEventListener("change", () =>
        oscillatorEvents.push("change"),
      );

      const numberMenu = controls[4].querySelector("fig-menu") as HTMLElement & {
        open: boolean;
      };
      const contextPrevented = !controls[4].dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 20,
          clientY: 20,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      const contextMenuOpened = numberMenu.open;

      for (const control of controls) {
        control.querySelector("fig-menu")?.dispatchEvent(
          new CustomEvent("change", {
            bubbles: true,
            detail: { value: "reset-default" },
          }),
        );
      }
      oscillator.querySelector(":scope > fig-menu")?.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: { value: "reset-default" },
        }),
      );

      return {
        values: [
          controls[0].checked,
          controls[1].value,
          controls[2].value,
          controls[3].value,
          String(controls[4].value),
        ],
        menuCounts: controls.map(
          (control) => control.querySelectorAll(":scope > fig-menu").length,
        ),
        menuLabels: controls.map(
          (control) =>
            control.querySelector('fig-menu-item[value="reset-default"]')
              ?.textContent,
        ),
        events: controls.map((control) => events.get(control)),
        contextPrevented,
        contextMenuOpened,
        oscillatorFrequency: oscillator.data.waves[0]?.frequency,
        oscillatorEvents,
        oscillatorMenuLabel: oscillator.querySelector(
          ':scope > fig-menu fig-menu-item[value="reset-default"]',
        )?.textContent,
        groupMenuCount: group.querySelectorAll(":scope > fig-menu").length,
      };
    });

    expect(state).toEqual({
      values: [false, "#112233", "B", "Default text", "8"],
      menuCounts: [1, 1, 1, 1, 1],
      menuLabels: ["Reset", "Reset", "Reset", "Reset", "Reset"],
      events: [
        ["input", "change"],
        ["input", "change"],
        ["input", "change"],
        ["input", "change"],
        ["input", "change"],
      ],
      contextPrevented: true,
      contextMenuOpened: true,
      oscillatorFrequency: 2,
      oscillatorEvents: ["input", "change"],
      oscillatorMenuLabel: "Reset",
      groupMenuCount: 0,
    });
  });

  test("propskit group uses control defaults for dirty state and reset", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const group = document.createElement("propskit-group") as HTMLElement & {
        dirty: boolean;
        resetProperties(): void;
      };
      group.innerHTML = `
        <propskit-switch checked default="false"></propskit-switch>
        <propskit-color value="#111111" default="#222222"></propskit-color>
        <propskit-select value="A" default="B" options="A,B,C"></propskit-select>
        <propskit-text value="A" default="B"></propskit-text>
        <propskit-number value="1" default="2"></propskit-number>
        <propskit-slider value="10" default="20" min="0" max="100"></propskit-slider>
        <propskit-wheel value="10" default="20"></propskit-wheel>
      `;
      const oscillator = document.createElement("propskit-oscillator");
      const oscillatorDefault = JSON.stringify({
        type: "sine",
        frequency: 2,
        amplitude: 1,
        phase: 0,
        offset: 0,
      });
      oscillator.setAttribute("value", JSON.stringify({ type: "square", frequency: 3 }));
      oscillator.setAttribute("default", oscillatorDefault);
      group.append(oscillator);
      document.body.append(group);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const controls = [
        ...group.querySelectorAll(
          ":scope > propskit-switch, :scope > propskit-color, :scope > propskit-select, :scope > propskit-text, :scope > propskit-number, :scope > propskit-slider, :scope > propskit-wheel, :scope > propskit-oscillator",
        ),
      ] as Array<
        HTMLElement & {
          checked?: boolean;
          value: string;
          defaultValue: unknown;
          isDefault: boolean;
          resetToDefault(): void;
        }
      >;
      const dirtyInitially = group.dirty;
      const initialDefaults = controls.map((control) => control.defaultValue);
      const initialDefaultStates = controls.map((control) => control.isDefault);
      const resetCalls = controls.map(() => 0);
      controls.forEach((control, index) => {
        const reset = control.resetToDefault.bind(control);
        control.resetToDefault = () => {
          resetCalls[index] += 1;
          reset();
        };
      });

      controls[0].checked = false;
      controls[1].value = "#222222";
      controls[2].value = "B";
      controls[3].value = "B";
      controls[4].value = "2";
      controls[5].value = "20";
      controls[6].value = "20";
      controls[7].value = oscillatorDefault;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const dirtyAtDefaults = group.dirty;

      controls[0].checked = true;
      controls[1].value = "#333333";
      controls[2].value = "C";
      controls[3].value = "C";
      controls[4].value = "3";
      controls[5].value = "30";
      controls[6].value = "30";
      controls[7].value = JSON.stringify({ type: "triangle", frequency: 4 });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const dirtyAfterChanges = group.dirty;

      group.resetProperties();
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      return {
        dirtyInitially,
        initialDefaults,
        initialDefaultStates,
        dirtyAtDefaults,
        dirtyAfterChanges,
        dirtyAfterReset: group.dirty,
        resetCalls,
        defaultStatesAfterReset: controls.map((control) => control.isDefault),
      };
    });

    expect(state).toEqual({
      dirtyInitially: true,
      initialDefaults: [
        false,
        "#222222",
        "B",
        "B",
        "2",
        "20",
        "20",
        expect.any(String),
      ],
      initialDefaultStates: [false, false, false, false, false, false, false, false],
      dirtyAtDefaults: false,
      dirtyAfterChanges: true,
      dirtyAfterReset: false,
      resetCalls: [1, 1, 1, 1, 1, 1, 1, 1],
      defaultStatesAfterReset: [true, true, true, true, true, true, true, true],
    });
  });

  test("propskit gradient reset menu participates in group dirty state", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const defaultValue = JSON.stringify({
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 90,
          stops: [
            { position: 0, color: "#0D99FF", opacity: 100 },
            { position: 100, color: "#9747FF", opacity: 100 },
          ],
        },
      });
      const changedValue = JSON.stringify({
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 45,
          stops: [
            { position: 0, color: "#FF0000", opacity: 100 },
            { position: 100, color: "#0000FF", opacity: 100 },
          ],
        },
      });
      const group = document.createElement("propskit-group") as HTMLElement & {
        dirty: boolean;
        resetProperties(): void;
      };
      const gradient = document.createElement(
        "propskit-gradient",
      ) as HTMLElement & {
        value: string;
        isDefault: boolean;
      };
      gradient.setAttribute("value", changedValue);
      gradient.setAttribute("default", defaultValue);
      group.append(gradient);
      document.querySelector("#fixture-root")?.append(group);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const dirtyInitially = group.dirty;
      const resetLabel = gradient.querySelector(
        'fig-menu-item[value="reset-default"]',
      )?.textContent;
      gradient.querySelector("fig-menu")?.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: { value: "reset-default" },
        }),
      );
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const dirtyAfterMenuReset = group.dirty;
      gradient.value = changedValue;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const dirtyAfterChange = group.dirty;
      group.resetProperties();
      await new Promise(requestAnimationFrame);
      return {
        dirtyInitially,
        dirtyAfterMenuReset,
        dirtyAfterChange,
        dirtyAfterGroupReset: group.dirty,
        isDefault: gradient.isDefault,
        value: gradient.value,
        defaultValue,
        resetLabel,
      };
    });

    expect(state.dirtyInitially).toBe(true);
    expect(state.dirtyAfterMenuReset).toBe(false);
    expect(state.dirtyAfterChange).toBe(true);
    expect(state.dirtyAfterGroupReset).toBe(false);
    expect(state.isDefault).toBe(true);
    expect(state.value).toBe(state.defaultValue);
    expect(state.resetLabel).toBe("Reset");
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
