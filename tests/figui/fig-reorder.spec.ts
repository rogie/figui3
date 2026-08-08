import { expect, test } from "@playwright/test";
import { collectPageErrors } from "./helpers";

async function bootLabFixture(page: import("@playwright/test").Page) {
  await page.goto("/tests/figui/fixture-lab.html");
  await page.waitForFunction(() => customElements.get("fig-reorder"));
}

test.describe("fig-reorder", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootLabFixture(page);
  });

  test("reorders children and dispatches reorder event", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-reorder id="reorder-host">
          <div id="item-a">A</div>
          <div id="item-b">B</div>
          <div id="item-c">C</div>
        </fig-reorder>
      `;
    });

    const result = await page.evaluate(async () => {
      const host = document.querySelector("#reorder-host");
      const itemA = document.querySelector("#item-a");
      if (!(host instanceof HTMLElement) || !(itemA instanceof HTMLElement)) {
        throw new Error("Missing reorder fixture");
      }

      await customElements.whenDefined("fig-reorder");

      let detail: { oldIndex: number; newIndex: number } | null = null;
      host.addEventListener("reorder", (event) => {
        detail = (event as CustomEvent).detail;
      });

      const rect = itemA.getBoundingClientRect();
      const down = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      });
      itemA.dispatchEvent(down);

      const move = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom + 120,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      });
      window.dispatchEvent(move);

      const up = new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom + 120,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      });
      window.dispatchEvent(up);

      const order = [...host.children].map((child) => child.id);
      return { detail, order };
    });

    expect(result.detail).toMatchObject({ oldIndex: 0, newIndex: 2 });
    expect(result.order).toEqual(["item-b", "item-c", "item-a"]);
  });

  test("drags from nested surfaces but preserves nested drag controls", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-reorder id="label-reorder">
          <div id="label-a"><label id="drag-label">Label surface</label></div>
          <div id="label-b">B</div>
        </fig-reorder>
        <fig-reorder id="button-reorder">
          <div id="button-a"><button id="drag-button">Button surface</button></div>
          <div id="button-b">B</div>
        </fig-reorder>
        <fig-reorder id="range-reorder">
          <div id="range-a"><input id="nested-range" type="range"></div>
          <div id="range-b">B</div>
        </fig-reorder>
      `;
      await customElements.whenDefined("fig-reorder");

      const dragToEnd = (
        target: Element,
        item: Element,
        pointerId: number,
      ) => {
        const rect = item.getBoundingClientRect();
        target.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + 4,
            clientY: rect.top + 4,
            button: 0,
            pointerId,
            pointerType: "mouse",
          }),
        );
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + 4,
            clientY: rect.bottom + 80,
            button: 0,
            pointerId,
            pointerType: "mouse",
          }),
        );
        window.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + 4,
            clientY: rect.bottom + 80,
            button: 0,
            pointerId,
            pointerType: "mouse",
          }),
        );
      };

      dragToEnd(
        document.querySelector("#drag-label")!,
        document.querySelector("#label-a")!,
        11,
      );
      dragToEnd(
        document.querySelector("#drag-button")!,
        document.querySelector("#button-a")!,
        12,
      );
      dragToEnd(
        document.querySelector("#nested-range")!,
        document.querySelector("#range-a")!,
        13,
      );

      return {
        labelOrder: [
          ...document.querySelector("#label-reorder")!.children,
        ].map((child) => child.id),
        buttonOrder: [
          ...document.querySelector("#button-reorder")!.children,
        ].map((child) => child.id),
        rangeOrder: [
          ...document.querySelector("#range-reorder")!.children,
        ].map((child) => child.id),
        draggingClass: document.body.classList.contains(
          "fig-reorder-dragging",
        ),
      };
    });

    expect(result).toEqual({
      labelOrder: ["label-b", "label-a"],
      buttonOrder: ["button-b", "button-a"],
      rangeOrder: ["range-a", "range-b"],
      draggingClass: false,
    });
  });

  test("shows a drop indicator while dragging", async ({ page }) => {
    const indicator = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-reorder id="reorder-host">
          <div id="item-a">A</div>
          <div id="item-b">B</div>
          <div id="item-c">C</div>
        </fig-reorder>
      `;

      const itemA = document.querySelector("#item-a");
      const itemB = document.querySelector("#item-b");
      if (!(itemA instanceof HTMLElement) || !(itemB instanceof HTMLElement)) {
        throw new Error("Missing item");
      }

      await customElements.whenDefined("fig-reorder");

      const rectA = itemA.getBoundingClientRect();
      const rectB = itemB.getBoundingClientRect();
      itemA.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: rectA.left + rectA.width / 2,
          clientY: rectA.top + rectA.height / 2,
          button: 0,
          pointerId: 3,
          pointerType: "mouse",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: rectB.left + rectB.width / 2,
          clientY: rectB.top + rectB.height / 2,
          button: 0,
          pointerId: 3,
          pointerType: "mouse",
        }),
      );

      const el = document.querySelector(".fig-reorder-indicator");
      if (!(el instanceof HTMLElement)) return null;

      const style = getComputedStyle(el);
      return {
        height: style.height,
        backgroundColor: style.backgroundColor,
        width: style.width,
      };
    });

    expect(indicator).not.toBeNull();
    expect(indicator?.height).toBe("2px");
    expect(Number.parseFloat(indicator?.width ?? "0")).toBeGreaterThan(0);
  });

  test("hides drop indicator when position is unchanged", async ({ page }) => {
    const indicator = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-reorder id="reorder-host">
          <div id="item-a">A</div>
          <div id="item-b">B</div>
          <div id="item-c">C</div>
        </fig-reorder>
      `;

      const itemC = document.querySelector("#item-c");
      if (!(itemC instanceof HTMLElement)) throw new Error("Missing item");

      await customElements.whenDefined("fig-reorder");

      const rect = itemC.getBoundingClientRect();
      itemC.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 0,
          pointerId: 4,
          pointerType: "mouse",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.bottom + 80,
          button: 0,
          pointerId: 4,
          pointerType: "mouse",
        }),
      );

      return document.querySelector(".fig-reorder-indicator");
    });

    expect(indicator).toBeNull();
  });

  test("shows drop indicator when dragging last item to the top", async ({ page }) => {
    const indicator = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-reorder id="reorder-host">
          <div id="item-a">A</div>
          <div id="item-b">B</div>
          <div id="item-c">C</div>
        </fig-reorder>
      `;

      const itemA = document.querySelector("#item-a");
      const itemC = document.querySelector("#item-c");
      if (!(itemA instanceof HTMLElement) || !(itemC instanceof HTMLElement)) {
        throw new Error("Missing item");
      }

      await customElements.whenDefined("fig-reorder");

      const rectC = itemC.getBoundingClientRect();
      const rectA = itemA.getBoundingClientRect();
      itemC.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: rectC.left + rectC.width / 2,
          clientY: rectC.top + rectC.height / 2,
          button: 0,
          pointerId: 5,
          pointerType: "mouse",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: rectA.left + rectA.width / 2,
          clientY: rectA.top + 2,
          button: 0,
          pointerId: 5,
          pointerType: "mouse",
        }),
      );

      return document.querySelector(".fig-reorder-indicator");
    });

    expect(indicator).not.toBeNull();
  });

  test("disabled prevents reorder", async ({ page }) => {
    const order = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-reorder id="reorder-host" disabled>
          <div id="item-a">A</div>
          <div id="item-b">B</div>
        </fig-reorder>
      `;

      const host = document.querySelector("#reorder-host");
      const itemA = document.querySelector("#item-a");
      if (!(host instanceof HTMLElement) || !(itemA instanceof HTMLElement)) {
        throw new Error("Missing reorder fixture");
      }

      await customElements.whenDefined("fig-reorder");

      const rect = itemA.getBoundingClientRect();
      itemA.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 4,
          clientY: rect.top + 4,
          button: 0,
          pointerId: 2,
          pointerType: "mouse",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 4,
          clientY: rect.bottom + 80,
          button: 0,
          pointerId: 2,
          pointerType: "mouse",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 4,
          clientY: rect.bottom + 80,
          button: 0,
          pointerId: 2,
          pointerType: "mouse",
        }),
      );

      return [...host.children].map((child) => child.id);
    });

    expect(order).toEqual(["item-a", "item-b"]);
  });
});
