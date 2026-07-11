import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("audit regressions: core components", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("dropdown emits one host input and change event per native event", async ({
    page,
  }) => {
    const counts = await page.evaluate(async () => {
      await customElements.whenDefined("fig-dropdown");
      const dropdown = document.createElement("fig-dropdown");
      dropdown.innerHTML = `
        <option value="one">One</option>
        <option value="two">Two</option>
      `;
      document.body.append(dropdown);
      await new Promise(requestAnimationFrame);

      const result = { input: 0, change: 0 };
      dropdown.addEventListener("input", () => result.input++);
      dropdown.addEventListener("change", () => result.change++);
      const select = dropdown.querySelector("select");
      if (!(select instanceof HTMLSelectElement)) throw new Error("Missing select");
      select.value = "two";
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return result;
    });

    expect(counts).toEqual({ input: 1, change: 1 });
  });

  test("dropdown keeps its authored default selection without a host value", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-dropdown");
      const dropdown = document.createElement("fig-dropdown");
      dropdown.innerHTML = `
        <option value="default" selected>Default</option>
        <option value="minimal">Minimal</option>
      `;
      document.body.append(dropdown);
      await new Promise(requestAnimationFrame);
      const select = dropdown.querySelector("select") as HTMLSelectElement;
      return {
        value: select.value,
        selectedText: select.selectedOptions[0]?.textContent,
      };
    });

    expect(state).toEqual({ value: "default", selectedText: "Default" });
  });

  test("field labels activate native checkboxes exactly once", async ({ page }) => {
    const checked = await page.evaluate(async () => {
      await customElements.whenDefined("fig-field");
      const field = document.createElement("fig-field");
      field.innerHTML = `<label>Accept</label><fig-checkbox></fig-checkbox>`;
      document.body.append(field);
      await new Promise(requestAnimationFrame);
      field.querySelector("label")?.click();
      return (field.querySelector("fig-checkbox input") as HTMLInputElement)
        .checked;
    });

    expect(checked).toBe(true);
  });

  test("menu items survive a disconnect and reconnect", async ({ page }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-menu");
      const menu = document.createElement("fig-menu");
      menu.innerHTML = `
        <fig-button fig-menu-trigger>Actions</fig-button>
        <fig-menu-item value="copy">Copy</fig-menu-item>
        <fig-menu-item value="paste">Paste</fig-menu-item>
      `;
      document.body.append(menu);
      await new Promise(requestAnimationFrame);
      menu.remove();
      document.body.append(menu);
      await new Promise(requestAnimationFrame);
      return {
        items: menu.querySelectorAll("fig-menu-item").length,
        labels: [...menu.querySelectorAll("fig-menu-item")].map(
          (item) => item.textContent?.trim(),
        ),
      };
    });

    expect(state).toEqual({ items: 2, labels: ["Copy", "Paste"] });
  });

  test("slider rejects non-positive steps and bounds generated ticks", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-slider");
      const slider = document.createElement("fig-slider");
      slider.setAttribute("type", "stepper");
      slider.setAttribute("min", "0");
      slider.setAttribute("max", "1000000");
      slider.setAttribute("step", "0");
      slider.setAttribute("disabled", "false");
      document.body.append(slider);
      await new Promise(requestAnimationFrame);
      return {
        step: (slider.querySelector('input[type="range"]') as HTMLInputElement)
          ?.step,
        disabled: (slider.querySelector('input[type="range"]') as HTMLInputElement)
          ?.disabled,
        ticks: slider.querySelectorAll("datalist option").length,
      };
    });

    expect(state.step).toBe("25");
    expect(state.disabled).toBe(false);
    expect(state.ticks).toBeLessThanOrEqual(1001);
  });

  test("parent disabled state does not erase disabled tabs", async ({ page }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-tabs");
      const tabs = document.createElement("fig-tabs");
      tabs.innerHTML = `
        <fig-tab value="one" selected>One</fig-tab>
        <fig-tab value="two" disabled>Two</fig-tab>
      `;
      document.body.append(tabs);
      await new Promise(requestAnimationFrame);
      tabs.setAttribute("disabled", "");
      tabs.removeAttribute("disabled");
      const children = tabs.querySelectorAll("fig-tab");
      return {
        firstDisabled: children[0].hasAttribute("disabled"),
        secondDisabled: children[1].hasAttribute("disabled"),
      };
    });

    expect(state).toEqual({ firstDisabled: false, secondDisabled: true });
  });

  test("custom submit buttons use form validation without native double submit", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-button");
      const form = document.createElement("form");
      form.innerHTML = `
        <input required>
        <fig-button type="submit">Save</fig-button>
      `;
      document.body.append(form);
      await new Promise(requestAnimationFrame);
      let submits = 0;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submits++;
      });
      const button = form.querySelector("fig-button")!;
      const nativeButton = button.shadowRoot?.querySelector(
        "button",
      ) as HTMLButtonElement;
      nativeButton.click();
      const invalidSubmits = submits;
      (form.querySelector("input") as HTMLInputElement).value = "ready";
      nativeButton.click();
      return {
        invalidSubmits,
        submits,
        nativeType: nativeButton.type,
      };
    });

    expect(state).toEqual({ invalidSubmits: 0, submits: 1, nativeType: "button" });
  });

  test("click tooltips retain outside-click dismissal after rendering", async ({
    page,
  }) => {
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-tooltip");
      const tooltip = document.createElement("fig-tooltip");
      tooltip.setAttribute("action", "click");
      tooltip.setAttribute("delay", "0");
      tooltip.setAttribute("text", "Helpful");
      tooltip.innerHTML = `<fig-button id="audit-tooltip-trigger">Help</fig-button>`;
      document.body.append(tooltip);
      await new Promise(requestAnimationFrame);
    });

    await page.locator("#audit-tooltip-trigger").click();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
    await page.locator("body").click({ position: { x: 2, y: 2 } });
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(0);
  });

  test("avatar source values cannot inject markup", async ({ page }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-avatar");
      const avatar = document.createElement("fig-avatar");
      avatar.setAttribute("name", "Ada");
      avatar.setAttribute("src", 'invalid.png" onerror="window.__avatarInjected=1');
      document.body.append(avatar);
      await new Promise(requestAnimationFrame);
      const image = avatar.querySelector("img");
      return {
        children: avatar.children.length,
        onerror: image?.getAttribute("onerror") ?? null,
        injected: Boolean((window as Window & { __avatarInjected?: number }).__avatarInjected),
      };
    });

    expect(state).toEqual({ children: 1, onerror: null, injected: false });
  });

  test("checkboxes do not join an implicit radio-style group and emit once", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-checkbox");
      const checkbox = document.createElement("fig-checkbox");
      checkbox.textContent = "Accept";
      document.body.append(checkbox);
      await new Promise(requestAnimationFrame);
      const counts = { input: 0, change: 0 };
      checkbox.addEventListener("input", () => counts.input++);
      checkbox.addEventListener("change", () => counts.change++);
      const input = checkbox.querySelector("input") as HTMLInputElement;
      input.click();
      return {
        ...counts,
        name: input.getAttribute("name"),
        label: input.getAttribute("aria-label"),
      };
    });

    expect(state).toEqual({ input: 1, change: 1, name: null, label: "Accept" });
  });

  test("gradient input preserves radial geometry", async ({ page }) => {
    const gradient = await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-gradient");
      const input = document.createElement("fig-input-gradient");
      input.setAttribute(
        "value",
        JSON.stringify({
          type: "gradient",
          gradient: {
            type: "radial",
            angle: 37,
            centerX: 0,
            centerY: 82,
            stops: [
              { position: 0, color: "#000000", opacity: 100 },
              { position: 100, color: "#ffffff", opacity: 100 },
            ],
          },
        }),
      );
      document.body.append(input);
      await new Promise(requestAnimationFrame);
      return input.value.gradient;
    });

    expect(gradient).toMatchObject({
      type: "radial",
      angle: 37,
      centerX: 0,
      centerY: 82,
    });
  });

  test("toast show and hide events fire once per transition", async ({ page }) => {
    const counts = await page.evaluate(async () => {
      await customElements.whenDefined("fig-toast");
      const toast = document.createElement("dialog", { is: "fig-toast" });
      toast.setAttribute("is", "fig-toast");
      toast.setAttribute("duration", "0");
      document.body.append(toast);
      const result = { show: 0, hide: 0 };
      toast.addEventListener("toast-show", () => result.show++);
      toast.addEventListener("toast-hide", () => result.hide++);
      toast.setAttribute("open", "");
      await new Promise(requestAnimationFrame);
      toast.removeAttribute("open");
      await new Promise(requestAnimationFrame);
      return result;
    });

    expect(counts).toEqual({ show: 1, hide: 1 });
  });

  test("native dropdown keeps the control theme while popup rows stay legible", async ({
    page,
  }) => {
    const styles = await page.evaluate(async () => {
      await customElements.whenDefined("fig-dropdown");
      const dropdown = document.createElement("fig-dropdown");
      dropdown.innerHTML = `<option>One</option>`;
      document.body.append(dropdown);
      await new Promise(requestAnimationFrame);
      const select = dropdown.querySelector("select")!;
      return {
        scheme: getComputedStyle(select).colorScheme,
        hostScheme: getComputedStyle(dropdown).colorScheme,
        controlColor: getComputedStyle(select).color,
        inheritedColor: getComputedStyle(dropdown).color,
        optionColor: getComputedStyle(select.options[0]).color,
        optionBackground: getComputedStyle(select.options[0]).backgroundColor,
      };
    });

    expect(styles).toEqual({
      scheme: styles.hostScheme,
      hostScheme: styles.hostScheme,
      controlColor: styles.inheritedColor,
      inheritedColor: styles.inheritedColor,
      optionColor: "rgb(30, 30, 30)",
      optionBackground: "rgb(255, 255, 255)",
    });
  });
});

test.describe("audit regressions: editor and lab", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await Promise.all([
      page.evaluate(() => customElements.whenDefined("fig-fill-picker")),
      page.evaluate(() => customElements.whenDefined("fig-reorder")),
    ]);
  });

  test("fill picker open is silent and close is emitted once", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker");
      picker.setAttribute("mode", "solid");
      picker.innerHTML = `<fig-swatch></fig-swatch>`;
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const counts = { input: 0, change: 0, close: 0 };
      picker.addEventListener("input", () => counts.input++);
      picker.addEventListener("change", () => counts.change++);
      picker.addEventListener("close", () => counts.close++);
      picker.open();
      await new Promise(requestAnimationFrame);
      picker.close();
      await new Promise((resolve) => setTimeout(resolve, 20));
      return counts;
    });

    expect(result).toEqual({ input: 0, change: 0, close: 1 });
  });

  test("fill picker restores custom mode content on reconnect", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker");
      picker.setAttribute("mode", "custom");
      picker.innerHTML = `
        <fig-swatch></fig-swatch>
        <section slot="mode-custom" label="Custom"><input id="custom-control"></section>
      `;
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise(requestAnimationFrame);
      picker.remove();
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return {
        controls: picker.querySelectorAll("#custom-control").length,
        inSlot: Boolean(
          picker.querySelector('[slot="mode-custom"] > #custom-control'),
        ),
      };
    });

    expect(state).toEqual({ controls: 1, inSlot: true });
  });

  test("pointer cancellation reverts a reorder drag", async ({ page }) => {
    const order = await page.evaluate(async () => {
      const reorder = document.createElement("fig-reorder");
      reorder.innerHTML = `
        <div data-id="one" style="height:30px">One</div>
        <div data-id="two" style="height:30px">Two</div>
        <div data-id="three" style="height:30px">Three</div>
      `;
      document.body.append(reorder);
      await new Promise(requestAnimationFrame);
      const first = reorder.children[0] as HTMLElement;
      const last = reorder.children[2] as HTMLElement;
      const start = first.getBoundingClientRect();
      const end = last.getBoundingClientRect();
      first.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId: 42,
          clientX: start.left + 2,
          clientY: start.top + 2,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          pointerId: 42,
          clientX: end.left + 2,
          clientY: end.bottom + 20,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointercancel", {
          bubbles: true,
          cancelable: true,
          pointerId: 42,
        }),
      );
      return [...reorder.children].map((item) => item.getAttribute("data-id"));
    });

    expect(order).toEqual(["one", "two", "three"]);
  });
});
