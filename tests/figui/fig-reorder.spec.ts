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

  test("keeps one item semantic but enables affordances only with peers", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <fig-reorder id="reorder-host">
          <div id="item-a">A</div>
        </fig-reorder>
      `;
    });

    const host = page.locator("#reorder-host");
    const itemA = page.locator("#item-a");
    await expect(host).toHaveAttribute("role", "list");
    await expect(itemA).toHaveAttribute("role", "listitem");
    await expect(itemA).not.toHaveAttribute("data-reorder-item");
    await expect(itemA).not.toHaveAttribute("tabindex");
    await expect(itemA).not.toHaveAttribute("aria-label");
    await expect(itemA).toHaveCSS("cursor", "auto");

    await host.evaluate((element) => {
      const item = document.createElement("div");
      item.id = "item-b";
      item.textContent = "B";
      element.appendChild(item);
    });
    const itemB = page.locator("#item-b");
    await expect(itemA).toHaveAttribute("data-reorder-item", "");
    await expect(itemB).toHaveAttribute("data-reorder-item", "");
    await expect(itemA).toHaveAttribute("tabindex", "0");
    await expect(itemA).toHaveAttribute("aria-label", "Move A");
    await expect(itemA).toHaveCSS("cursor", "grab");

    await itemB.evaluate((element) => element.remove());
    await expect(itemA).toHaveAttribute("role", "listitem");
    await expect(itemA).not.toHaveAttribute("data-reorder-item");
    await expect(itemA).not.toHaveAttribute("tabindex");
    await expect(itemA).not.toHaveAttribute("aria-label");
    await expect(itemA).toHaveCSS("cursor", "auto");
  });

  test("uses the secondary background while dragging", async ({ page }) => {
    const colors = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-reorder id="reorder-host">
          <div id="item-a">A</div>
          <div id="item-b">B</div>
        </fig-reorder>
        <div id="secondary-probe" style="background: var(--figma-color-bg-secondary)"></div>
        <div id="selected-probe" style="background: var(--figma-color-bg-selected)"></div>
      `;

      await customElements.whenDefined("fig-reorder");
      const item = document.querySelector("#item-a");
      if (!(item instanceof HTMLElement)) throw new Error("Missing item");
      const rect = item.getBoundingClientRect();
      item.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.bottom + 20,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );

      const secondaryProbe = document.querySelector("#secondary-probe");
      const selectedProbe = document.querySelector("#selected-probe");
      if (
        !(secondaryProbe instanceof HTMLElement) ||
        !(selectedProbe instanceof HTMLElement)
      ) {
        throw new Error("Missing color probes");
      }
      const result = {
        dragging: item.classList.contains("dragging"),
        item: getComputedStyle(item).backgroundColor,
        secondary: getComputedStyle(secondaryProbe).backgroundColor,
        selected: getComputedStyle(selectedProbe).backgroundColor,
      };

      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.bottom + 20,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );
      return result;
    });

    expect(colors.dragging).toBe(true);
    expect(colors.item).toBe(colors.secondary);
    expect(colors.item).not.toBe(colors.selected);
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

  test("indicator toggles the drop indicator ring", async ({ page }) => {
    const states = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-reorder id="reorder-host" indicator="ring">
          <div id="item-a">A</div>
          <div id="item-b">B</div>
        </fig-reorder>
      `;

      await customElements.whenDefined("fig-reorder");
      const host = document.querySelector("#reorder-host");
      const itemA = document.querySelector("#item-a");
      const itemB = document.querySelector("#item-b");
      if (
        !(host instanceof HTMLElement) ||
        !(itemA instanceof HTMLElement) ||
        !(itemB instanceof HTMLElement)
      ) {
        throw new Error("Missing reorder fixture");
      }

      const rectA = itemA.getBoundingClientRect();
      const rectB = itemB.getBoundingClientRect();
      itemA.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: rectA.left + rectA.width / 2,
          clientY: rectA.top + rectA.height / 2,
          button: 0,
          pointerId: 30,
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
          pointerId: 30,
          pointerType: "mouse",
        }),
      );

      const indicator = document.querySelector(".fig-reorder-indicator");
      if (!(indicator instanceof HTMLElement)) {
        throw new Error("Missing reorder indicator");
      }
      const hasRing = () =>
        indicator.classList.contains("fig-reorder-indicator-ring");

      const ring = hasRing();
      host.setAttribute("indicator", "default");
      const defaultStyle = hasRing();
      host.setAttribute("indicator", "ring");
      const ringAgain = hasRing();
      host.removeAttribute("indicator");
      const omitted = hasRing();

      return { ring, defaultStyle, ringAgain, omitted };
    });

    expect(states).toEqual({
      ring: true,
      defaultStyle: false,
      ringAgain: true,
      omitted: false,
    });
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

  test.describe("items selector", () => {
    const mountItems = async (
      page: import("@playwright/test").Page,
      attrs = 'items=".row"',
    ) => {
      await page.evaluate((hostAttrs) => {
        const root = document.querySelector("#fixture-root");
        if (!root) throw new Error("Missing fixture root");
        root.innerHTML = `
          <fig-reorder id="reorder-host" ${hostAttrs}>
            <div id="header">Header</div>
            <div id="row-a" class="row"><span class="grip">::</span>A</div>
            <div id="row-b" class="row"><span class="grip">::</span>B</div>
            <div id="row-c" class="row"><span class="grip">::</span>C</div>
            <div id="footer" role="note">Footer</div>
          </fig-reorder>
        `;
      }, attrs);
      await page.waitForFunction(() =>
        document.querySelector("#row-a")?.hasAttribute("data-reorder-item"),
      );
    };

    const snapshot = (page: import("@playwright/test").Page) =>
      page.evaluate(() =>
        [...document.querySelector("#reorder-host")!.children]
          .filter((child) => child.id)
          .map((child) => ({
            id: child.id,
            item: child.hasAttribute("data-reorder-item"),
            role: child.getAttribute("role"),
            tabindex: child.getAttribute("tabindex"),
          })),
      );

    test("marks only matching children as items", async ({ page }) => {
      await mountItems(page);
      expect(await snapshot(page)).toEqual([
        { id: "header", item: false, role: "none", tabindex: null },
        { id: "row-a", item: true, role: "listitem", tabindex: "0" },
        { id: "row-b", item: true, role: "listitem", tabindex: "0" },
        { id: "row-c", item: true, role: "listitem", tabindex: "0" },
        { id: "footer", item: false, role: "note", tabindex: null },
      ]);
    });

    test("keyboard moves stay within items and report item indices", async ({
      page,
    }) => {
      await mountItems(page);
      const result = await page.evaluate(() => {
        const host = document.querySelector("#reorder-host")!;
        const events: Array<{ oldIndex: number; newIndex: number }> = [];
        host.addEventListener("reorder", (event) => {
          const { oldIndex, newIndex } = (event as CustomEvent).detail;
          events.push({ oldIndex, newIndex });
        });
        const press = (id: string, key: string) =>
          document
            .querySelector(id)!
            .dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        press("#row-a", "End");
        press("#row-c", "Home");
        press("#row-c", "ArrowUp");
        return {
          events,
          order: [...host.children].filter((c) => c.id).map((c) => c.id),
        };
      });
      expect(result.events).toEqual([
        { oldIndex: 0, newIndex: 2 },
        { oldIndex: 1, newIndex: 0 },
      ]);
      expect(result.order).toEqual(["header", "row-c", "row-b", "row-a", "footer"]);
    });

    test("pointer drag to end keeps trailing non-items last", async ({ page }) => {
      await mountItems(page);
      const order = await page.evaluate(() => {
        const host = document.querySelector("#reorder-host")!;
        const rowA = document.querySelector("#row-a") as HTMLElement;
        const footer = document.querySelector("#footer") as HTMLElement;
        const rect = rowA.getBoundingClientRect();
        const y = footer.getBoundingClientRect().bottom + 200;
        const init = (clientY: number) => ({
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 4,
          clientY,
          button: 0,
          pointerId: 21,
          pointerType: "mouse",
        });
        rowA.dispatchEvent(new PointerEvent("pointerdown", init(rect.top + 4)));
        window.dispatchEvent(new PointerEvent("pointermove", init(y)));
        window.dispatchEvent(new PointerEvent("pointerup", init(y)));
        return [...host.children].filter((c) => c.id).map((c) => c.id);
      });
      expect(order).toEqual(["header", "row-b", "row-c", "row-a", "footer"]);
    });

    test("works with handle", async ({ page }) => {
      await mountItems(page, 'items=".row" handle=".grip"');
      const result = await page.evaluate(() => {
        const grips = [...document.querySelectorAll("#reorder-host .grip")];
        return {
          handles: grips.map((grip) => grip.hasAttribute("data-reorder-handle")),
          tabbable: grips.map((grip) => grip.getAttribute("tabindex")),
          headerHandle: document.querySelector("#header [data-reorder-handle]"),
        };
      });
      expect(result).toEqual({
        handles: [true, true, true],
        tabbable: ["0", "0", "0"],
        headerHandle: null,
      });
    });

    test("changing or removing items re-syncs marks", async ({ page }) => {
      await mountItems(page);
      await page.evaluate(() => {
        document.querySelector("#reorder-host")!.setAttribute("items", "#row-a, #row-b");
      });
      const narrowed = await snapshot(page);
      expect(narrowed.find((c) => c.id === "row-c")).toEqual({
        id: "row-c",
        item: false,
        role: "none",
        tabindex: null,
      });

      await page.evaluate(() => {
        document.querySelector("#reorder-host")!.removeAttribute("items");
      });
      const all = await snapshot(page);
      expect(all.map((c) => c.item)).toEqual([true, true, true, true, true]);
      expect(all.find((c) => c.id === "header")?.role).toBe("listitem");
      expect(all.find((c) => c.id === "footer")?.role).toBe("note");
    });

    test("child class changes re-sync automatically and via refresh()", async ({
      page,
    }) => {
      await mountItems(page);
      await page.evaluate(() => {
        document.querySelector("#header")!.classList.add("row");
      });
      await expect(page.locator("#header")).toHaveAttribute("data-reorder-item", "");

      await page.evaluate(() => {
        document.querySelector("#header")!.classList.remove("row");
      });
      await expect(page.locator("#header")).not.toHaveAttribute("data-reorder-item");

      const refreshed = await page.evaluate(() => {
        const host = document.querySelector("#reorder-host") as HTMLElement & {
          refresh(): void;
        };
        document.querySelector("#footer")!.classList.add("row");
        host.refresh();
        return document.querySelector("#footer")!.hasAttribute("data-reorder-item");
      });
      expect(refreshed).toBe(true);
    });

    test("dragging does not trigger re-sync loops", async ({ page }) => {
      await mountItems(page);
      const result = await page.evaluate(async () => {
        const host = document.querySelector("#reorder-host")!;
        const rowA = document.querySelector("#row-a") as HTMLElement;
        let mutations = 0;
        const observer = new MutationObserver((records) => {
          mutations += records.length;
        });
        const rect = rowA.getBoundingClientRect();
        const init = (clientY: number) => ({
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 4,
          clientY,
          button: 0,
          pointerId: 22,
          pointerType: "mouse",
        });
        rowA.dispatchEvent(new PointerEvent("pointerdown", init(rect.top + 4)));
        window.dispatchEvent(new PointerEvent("pointermove", init(rect.bottom + 20)));
        await new Promise((r) => setTimeout(r, 30));
        observer.observe(host, { subtree: true, attributes: true });
        await new Promise((r) => setTimeout(r, 60));
        const during = mutations;
        window.dispatchEvent(new PointerEvent("pointerup", init(rect.bottom + 20)));
        observer.disconnect();
        return { during, dragging: rowA.classList.contains("dragging") };
      });
      expect(result).toEqual({ during: 0, dragging: false });
    });

    test("invalid selector matches nothing without throwing", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.evaluate(() => {
        const root = document.querySelector("#fixture-root")!;
        root.innerHTML = `
          <fig-reorder id="reorder-host" items="[[">
            <div id="row-a">A</div>
            <div id="row-b">B</div>
          </fig-reorder>
        `;
      });
      const marked = await page.evaluate(() =>
        [...document.querySelectorAll("#reorder-host > div")].map((c) =>
          c.hasAttribute("data-reorder-item"),
        ),
      );
      expect(marked).toEqual([false, false]);
      expect(errors).toEqual([]);
    });
  });
});
