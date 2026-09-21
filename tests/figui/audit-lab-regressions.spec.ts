import { expect, test } from "@playwright/test";
import { collectPageErrors } from "./helpers";

async function bootLab(page: import("@playwright/test").Page) {
  await page.goto("/tests/figui/fixture-lab.html");
  await page.waitForFunction(() => customElements.get("fig-canvas-control"));
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

  test("reorder leaves nested input-wheel scrubbing to the control", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <fig-reorder>
          <div id="first"><fig-input-wheel value="0" style="width:200px"></fig-input-wheel></div>
          <div id="second">Second</div>
        </fig-reorder>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const reorder = root.querySelector("fig-reorder")!;
      const wheel = root.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const rect = wheel.getBoundingClientRect();
      wheel.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          buttons: 1,
          pointerId: 1,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          buttons: 1,
          pointerId: 1,
          clientX: rect.left + rect.width / 2 + 24,
          clientY: rect.top + rect.height / 2,
        }),
      );
      const during = {
        value: Number(wheel.value),
        wheelDragging: wheel.hasAttribute("data-fig-input-wheel-active"),
        reorderDragging: document.body.classList.contains(
          "fig-reorder-dragging",
        ),
      };
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          clientX: rect.left + rect.width / 2 + 24,
          clientY: rect.top + rect.height / 2,
        }),
      );
      return {
        during,
        order: [...reorder.children].map((child) => child.id),
      };
    });

    expect(state.during.value).toBeGreaterThan(0);
    expect(state.during.wheelDragging).toBe(true);
    expect(state.during.reorderDragging).toBe(false);
    expect(state.order).toEqual(["first", "second"]);
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

  test("canvas gestures stop after disable", async ({ page }) => {
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

      return canvas.getAttribute("value") === canvasValue;
    });

    expect(state).toBe(true);
  });
});
