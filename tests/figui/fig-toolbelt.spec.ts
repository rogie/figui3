import { expect, test } from "@playwright/test";
import { collectPageErrors, type PageErrors } from "./helpers";

async function bootToolbelt(page: import("@playwright/test").Page) {
  await page.goto("/tests/figui/fixture.html");
  await page.waitForFunction(
    () =>
      customElements.get("fig-toolbelt") &&
      customElements.get("fig-toolbelt-group") &&
      customElements.get("fig-toolbelt-item"),
  );
}

test.describe("fig-toolbelt", () => {
  let errors: PageErrors;

  test.beforeEach(async ({ page }) => {
    errors = collectPageErrors(page);
    await bootToolbelt(page);
  });

  test.afterEach(() => {
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });

  test("registers selection and toolbar accessibility semantics", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <fig-toolbelt id="tools" value="frame" aria-label="Design tools">
          <fig-toolbelt-group aria-label="Transform tools">
            <fig-toolbelt-item value="move">Move</fig-toolbelt-item>
            <fig-toolbelt-item value="frame">Frame</fig-toolbelt-item>
          </fig-toolbelt-group>
          <fig-toolbelt-group aria-label="Shape tools">
            <fig-toolbelt-item value="shape">Shape</fig-toolbelt-item>
          </fig-toolbelt-group>
        </fig-toolbelt>`;
    });

    const tools = page.locator("#tools");
    const viewport = tools.locator('[part="viewport"]');
    const prepend = tools.locator('[part="prepend"]');
    const append = tools.locator('[part="append"]');
    await expect(tools).toHaveAttribute("role", "toolbar");
    await expect(viewport).toHaveClass(/fig-overflow-fade/);
    await expect(viewport).toHaveClass(/fig-overflow-fade-horizontal/);
    await expect(prepend).toHaveCSS("display", "none");
    await expect(append).toHaveCSS("display", "none");
    await expect(tools.locator("[data-fig-toolbelt-nav]")).toHaveCount(0);
    expect(
      await tools.evaluate((element) => {
        const host = element.getBoundingClientRect();
        const viewport = element.shadowRoot!
          .querySelector('[part="viewport"]')!
          .getBoundingClientRect();
        return {
          leftInset: viewport.left - host.left,
          rightInset: host.right - viewport.right,
        };
      }),
    ).toEqual({ leftInset: 0, rightInset: 0 });
    expect(
      await viewport.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          display: style.display,
          fadeSize: style.getPropertyValue("--fig-overflow-fade-size").trim(),
          overflowX: style.overflowX,
        };
      }),
    ).toEqual({
      display: "flex",
      fadeSize: "calc(2.5rem + 0.5rem)",
      overflowX: "auto",
    });
    await expect(tools).toHaveAttribute("aria-orientation", "horizontal");
    await expect(tools.locator('[value="frame"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(tools.locator('[value="frame"]')).toHaveAttribute(
      "tabindex",
      "0",
    );
    await expect(tools.locator('[value="move"]')).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(tools.locator('[value="move"]')).toHaveAttribute(
      "tabindex",
      "-1",
    );
    await expect(tools.locator("fig-toolbelt-item")).toHaveCount(3);
    await expect(tools.locator("fig-toolbelt-group")).toHaveCount(2);
    await expect(tools.locator("fig-toolbelt-group").first()).toHaveAttribute(
      "role",
      "group",
    );
    expect(
      await tools
        .locator("fig-toolbelt-group")
        .nth(1)
        .evaluate((element) => getComputedStyle(element).borderInlineStartWidth),
    ).toBe("1px");
    const groupSpacing = await tools.evaluate((element) => {
      const groups = element.querySelectorAll("fig-toolbelt-group");
      const firstGroup = groups[0].getBoundingClientRect();
      const secondGroup = groups[1].getBoundingClientRect();
      const firstItem = groups[1]
        .querySelector("fig-toolbelt-item")!
        .getBoundingClientRect();
      const border = parseFloat(
        getComputedStyle(groups[1]).borderInlineStartWidth,
      );
      return {
        before: secondGroup.left - firstGroup.right,
        after: firstItem.left - secondGroup.left - border,
      };
    });
    expect(Math.abs(groupSpacing.before - groupSpacing.after)).toBeLessThan(0.5);
    await expect(tools.locator("fig-toolbelt-item").first()).toHaveAttribute(
      "role",
      "button",
    );
  });

  test("selects by click, emits host events, and keeps property updates silent", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <fig-toolbelt id="tools" value="move">
          <fig-toolbelt-item value="move">Move</fig-toolbelt-item>
          <fig-toolbelt-item value="frame">Frame</fig-toolbelt-item>
          <fig-toolbelt-item value="shape">Shape</fig-toolbelt-item>
        </fig-toolbelt>`;
      const tools = root.querySelector("#tools")!;
      const events: Array<Record<string, unknown>> = [];
      for (const type of ["input", "change"]) {
        tools.addEventListener(type, (event) => {
          events.push({
            type,
            detail: (event as CustomEvent).detail,
            targetIsHost: event.target === tools,
          });
        });
      }
      (tools as HTMLElement & { events?: unknown[] }).events = events;
    });

    await page.locator('#tools fig-toolbelt-item[value="frame"]').click();
    await expect(page.locator("#tools")).toHaveAttribute("value", "frame");
    await expect(
      page.locator('#tools fig-toolbelt-item[value="frame"]'),
    ).toHaveAttribute("selected", "");
    expect(
      await page.locator("#tools").evaluate((tools) => {
        return (tools as HTMLElement & { events?: unknown[] }).events;
      }),
    ).toEqual([
      { type: "input", detail: "frame", targetIsHost: true },
      { type: "change", detail: "frame", targetIsHost: true },
    ]);

    await page.locator("#tools").evaluate((tools) => {
      (tools as HTMLElement & { value: string }).value = "shape";
    });
    await expect(page.locator("#tools")).toHaveAttribute("value", "shape");
    await expect(
      page.locator('#tools fig-toolbelt-item[value="shape"]'),
    ).toHaveAttribute("selected", "");
    expect(
      await page.locator("#tools").evaluate((tools) => {
        return (tools as HTMLElement & { events?: unknown[] }).events;
      }),
    ).toHaveLength(2);
  });

  test("uses roving keyboard focus and activates with Space", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <fig-toolbelt id="tools" value="move">
          <fig-toolbelt-item value="move">Move</fig-toolbelt-item>
          <fig-toolbelt-item value="frame" disabled>Frame</fig-toolbelt-item>
          <fig-toolbelt-item value="shape">Shape</fig-toolbelt-item>
        </fig-toolbelt>`;
    });

    const move = page.locator('#tools fig-toolbelt-item[value="move"]');
    const shape = page.locator('#tools fig-toolbelt-item[value="shape"]');
    await move.focus();
    await page.keyboard.press("ArrowRight");
    await expect(shape).toBeFocused();
    await expect(page.locator("#tools")).toHaveAttribute("value", "move");

    await page.keyboard.press("Space");
    await expect(page.locator("#tools")).toHaveAttribute("value", "shape");
    await expect(shape).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("Home");
    await expect(move).toBeFocused();
    await page.keyboard.press("End");
    await expect(shape).toBeFocused();
  });

  test("supports vertical layout, orientation-aware keys, and both overflow modes", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <fig-toolbelt
          id="tools"
          layout="vertical"
          overflow="buttons"
          value="one"
          style="height: 72px; --fig-toolbelt-padding-inline: 6px;"
        >
          <fig-toolbelt-group aria-label="Primary tools">
            <fig-toolbelt-item value="one">One</fig-toolbelt-item>
            <fig-toolbelt-item value="two">Two</fig-toolbelt-item>
          </fig-toolbelt-group>
          <fig-toolbelt-group aria-label="Secondary tools">
            <fig-toolbelt-item value="three">Three</fig-toolbelt-item>
            <fig-toolbelt-item value="four">Four</fig-toolbelt-item>
            <fig-toolbelt-item value="five">Five</fig-toolbelt-item>
          </fig-toolbelt-group>
        </fig-toolbelt>`;
    });

    const tools = page.locator("#tools");
    const viewport = tools.locator('[part="viewport"]');
    const one = tools.locator('[value="one"]');
    const two = tools.locator('[value="two"]');
    await expect(viewport).toHaveClass(/fig-overflow-fade/);
    await expect(viewport).not.toHaveClass(/fig-overflow-fade-horizontal/);
    await expect(tools).toHaveAttribute("aria-orientation", "vertical");
    await expect(tools).toHaveClass(/overflow-end/);
    expect(
      await tools
        .locator('[data-fig-toolbelt-nav="end"]')
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return { left: style.left, right: style.right };
        }),
    ).toEqual({ left: "6px", right: "6px" });
    const widths = await tools.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      viewportWidth:
        element.shadowRoot
          ?.querySelector('[part="viewport"]')
          ?.getBoundingClientRect().width ?? 0,
    }));
    expect(widths.width).toBeLessThan(120);
    expect(widths.viewportWidth).toBeLessThan(120);
    expect(
      await tools
        .locator("fig-toolbelt-group")
        .nth(1)
        .evaluate((element) => getComputedStyle(element).borderBlockStartWidth),
    ).toBe("1px");
    const verticalGroupSpacing = await tools.evaluate((element) => {
      const groups = element.querySelectorAll("fig-toolbelt-group");
      const firstGroup = groups[0].getBoundingClientRect();
      const secondGroup = groups[1].getBoundingClientRect();
      const firstItem = groups[1]
        .querySelector("fig-toolbelt-item")!
        .getBoundingClientRect();
      const border = parseFloat(
        getComputedStyle(groups[1]).borderBlockStartWidth,
      );
      return {
        before: secondGroup.top - firstGroup.bottom,
        after: firstItem.top - secondGroup.top - border,
      };
    });
    expect(
      Math.abs(verticalGroupSpacing.before - verticalGroupSpacing.after),
    ).toBeLessThan(0.5);

    await one.focus();
    await page.keyboard.press("ArrowRight");
    await expect(one).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(two).toBeFocused();

    await tools.locator('[data-fig-toolbelt-nav="end"]').click();
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);

    await tools.evaluate((element) =>
      element.setAttribute("overflow", "scrollbar"),
    );
    await expect(tools.locator("[data-fig-toolbelt-nav]")).toHaveCount(0);
    await expect(viewport).toHaveClass(/fig-overflow-fade/);
    await expect(viewport).not.toHaveClass(/fig-overflow-fade-horizontal/);
    expect(
      await viewport.evaluate(
        (element) => getComputedStyle(element).scrollbarWidth,
      ),
    ).toBe("none");

    await tools.evaluate((element) =>
      element.setAttribute("layout", "horizontal"),
    );
    await expect(tools).toHaveAttribute("aria-orientation", "horizontal");
    await expect(viewport).toHaveClass(/fig-overflow-fade-horizontal/);

    await one.focus();
    await page.keyboard.press("ArrowDown");
    await expect(one).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(two).toBeFocused();
  });

  test("host disabled state preserves item-authored disabled state", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <fig-toolbelt id="tools" value="move">
          <fig-toolbelt-item value="move">Move</fig-toolbelt-item>
          <fig-toolbelt-item value="frame" disabled>Frame</fig-toolbelt-item>
        </fig-toolbelt>`;
    });

    const tools = page.locator("#tools");
    const move = tools.locator('[value="move"]');
    const frame = tools.locator('[value="frame"]');
    await tools.evaluate((element) => element.setAttribute("disabled", ""));
    await expect(tools).toHaveAttribute("aria-disabled", "true");
    await expect(move).toHaveAttribute("disabled", "");
    await expect(frame).toHaveAttribute("disabled", "");

    await tools.evaluate((element) => element.removeAttribute("disabled"));
    await expect(tools).not.toHaveAttribute("aria-disabled", "");
    await expect(move).not.toHaveAttribute("disabled", "");
    await expect(frame).toHaveAttribute("disabled", "");
  });

  test("adds overflow controls, scrolls by page, and preserves direct items", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <div style="width: 140px">
          <fig-toolbelt
            id="tools"
            value="one"
            overflow="buttons"
            aria-label="Overflow tools"
            style="--fig-toolbelt-padding-block: 6px"
          >
            <fig-toolbelt-item value="one">One</fig-toolbelt-item>
            <fig-toolbelt-item value="two">Two</fig-toolbelt-item>
            <fig-toolbelt-item value="three">Three</fig-toolbelt-item>
            <fig-toolbelt-item value="four">Four</fig-toolbelt-item>
            <fig-toolbelt-item value="five">Five</fig-toolbelt-item>
          </fig-toolbelt>
        </div>`;
    });

    const tools = page.locator("#tools");
    const start = tools.locator('[data-fig-toolbelt-nav="start"]');
    const end = tools.locator('[data-fig-toolbelt-nav="end"]');
    await expect(tools).toHaveClass(/overflow-end/);
    await expect(end).toBeVisible();
    await expect(start).toHaveAttribute("slot", "start");
    await expect(end).toHaveAttribute("slot", "end");
    expect(
      await end.evaluate((element) => {
        const style = getComputedStyle(element);
        return { top: style.top, bottom: style.bottom };
      }),
    ).toEqual({ top: "6px", bottom: "6px" });
    await end.click();
    const viewport = tools.locator('[part="viewport"]');
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    await tools.evaluate((element) => {
      const item = document.createElement("fig-toolbelt-item");
      item.setAttribute("value", "six");
      item.textContent = "Six";
      element.append(item);
    });
    await expect(tools.locator("fig-toolbelt-item")).toHaveCount(6);
    expect(
      await tools.evaluate((element) =>
        [...element.children]
          .filter((child) => child.matches("fig-toolbelt-item"))
          .every((child) => child.parentElement === element),
      ),
    ).toBe(true);
    await expect(tools.locator('[data-fig-toolbelt-nav="end"]')).toHaveCount(1);
  });

  test("keeps prepend and append items fixed outside horizontal overflow", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <div style="width: 180px">
          <fig-toolbelt id="tools" value="pin" overflow="buttons" aria-label="Fixed tools">
            <fig-toolbelt-group slot="append" aria-label="Trailing tools">
              <fig-toolbelt-item value="settings">Settings</fig-toolbelt-item>
            </fig-toolbelt-group>
            <fig-toolbelt-group slot="prepend" aria-label="Leading tools">
              <fig-toolbelt-item value="pin">Pin</fig-toolbelt-item>
            </fig-toolbelt-group>
            <fig-toolbelt-group id="scrolling-group" aria-label="Scrolling tools">
              <fig-toolbelt-item value="one">One</fig-toolbelt-item>
              <fig-toolbelt-item value="two">Two</fig-toolbelt-item>
              <fig-toolbelt-item value="three">Three</fig-toolbelt-item>
              <fig-toolbelt-item value="four">Four</fig-toolbelt-item>
              <fig-toolbelt-item value="five">Five</fig-toolbelt-item>
            </fig-toolbelt-group>
          </fig-toolbelt>
        </div>`;
    });

    const tools = page.locator("#tools");
    const viewport = tools.locator('[part="viewport"]');
    const prepend = tools.locator('[part="prepend"]');
    const append = tools.locator('[part="append"]');
    const pin = tools.locator('[value="pin"]');
    const settings = tools.locator('[value="settings"]');

    await expect(prepend).not.toHaveAttribute("hidden", "");
    await expect(append).not.toHaveAttribute("hidden", "");
    await expect(tools).toHaveClass(/overflow-end/);
    expect(
      await tools.evaluate((element) => {
        const shadow = element.shadowRoot!;
        const prependSlot = shadow.querySelector(
          'slot[name="prepend"]',
        ) as HTMLSlotElement;
        const itemSlot = shadow.querySelector(
          'div[part="viewport"] > slot',
        ) as HTMLSlotElement;
        const appendSlot = shadow.querySelector(
          'slot[name="append"]',
        ) as HTMLSlotElement;
        return {
          prepend: prependSlot.assignedElements().map((item) => item.tagName),
          scrolling: itemSlot.assignedElements().map((item) => item.id),
          append: appendSlot.assignedElements().map((item) => item.tagName),
        };
      }),
    ).toEqual({
      prepend: ["FIG-TOOLBELT-GROUP"],
      scrolling: ["scrolling-group"],
      append: ["FIG-TOOLBELT-GROUP"],
    });

    const before = await tools.evaluate((element) => {
      const shadow = element.shadowRoot!;
      const viewportElement = shadow.querySelector(
        '[part="viewport"]',
      ) as HTMLElement;
      const prependElement = element.querySelector('[slot="prepend"]')!;
      const appendElement = element.querySelector('[slot="append"]')!;
      const start = element.querySelector('[data-fig-toolbelt-nav="start"]')!;
      const end = element.querySelector('[data-fig-toolbelt-nav="end"]')!;
      const rect = (target: Element) => {
        const box = target.getBoundingClientRect();
        return { left: box.left, right: box.right };
      };
      return {
        prepend: rect(prependElement),
        append: rect(appendElement),
        start: rect(start),
        end: rect(end),
        viewport: rect(viewportElement),
        clientWidth: viewportElement.clientWidth,
        scrollWidth: viewportElement.scrollWidth,
        viewportMask: getComputedStyle(viewportElement).maskImage,
        prependMask: getComputedStyle(prependElement).maskImage,
      };
    });
    expect(before.scrollWidth).toBeGreaterThan(before.clientWidth);
    expect(before.prepend.right).toBeLessThanOrEqual(before.start.left + 1);
    expect(before.end.right).toBeLessThanOrEqual(before.append.left + 1);
    expect(before.viewportMask).not.toBe("none");
    expect(before.prependMask).toBe("none");
    expect(
      await tools
        .locator('fig-toolbelt-group[slot="prepend"]')
        .evaluate((element) => getComputedStyle(element).borderInlineEndWidth),
    ).toBe("1px");
    expect(
      await tools
        .locator('fig-toolbelt-group[slot="append"]')
        .evaluate((element) => getComputedStyle(element).borderInlineStartWidth),
    ).toBe("1px");

    await viewport.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      element.dispatchEvent(new Event("scroll"));
    });
    const fixedAfterScroll = await tools.evaluate((element) => {
      const prependBox = element
        .querySelector('[slot="prepend"]')!
        .getBoundingClientRect();
      const appendBox = element
        .querySelector('[slot="append"]')!
        .getBoundingClientRect();
      return {
        prependLeft: prependBox.left,
        appendRight: appendBox.right,
      };
    });
    expect(fixedAfterScroll.prependLeft).toBeCloseTo(before.prepend.left, 1);
    expect(fixedAfterScroll.appendRight).toBeCloseTo(before.append.right, 1);

    const scrollAtEnd = await viewport.evaluate((element) => element.scrollLeft);
    await settings.click();
    await expect(tools).toHaveAttribute("value", "settings");
    expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(
      scrollAtEnd,
    );

    await pin.focus();
    await page.keyboard.press("ArrowRight");
    await expect(tools.locator('[value="one"]')).toBeFocused();
    await page.keyboard.press("End");
    await expect(settings).toBeFocused();
    expect(
      await tools
        .locator("#scrolling-group")
        .evaluate((element) => getComputedStyle(element).borderInlineStartWidth),
    ).toBe("0px");
  });

  test("keeps prepend and append items fixed outside vertical overflow", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <fig-toolbelt
          id="tools"
          layout="vertical"
          overflow="buttons"
          value="top"
          aria-label="Vertical fixed tools"
          style="height: 190px"
        >
          <fig-toolbelt-group slot="prepend" aria-label="Top tools">
            <fig-toolbelt-item value="top">Top</fig-toolbelt-item>
          </fig-toolbelt-group>
          <fig-toolbelt-group aria-label="Scrolling tools">
            <fig-toolbelt-item value="one">One</fig-toolbelt-item>
            <fig-toolbelt-item value="two">Two</fig-toolbelt-item>
            <fig-toolbelt-item value="three">Three</fig-toolbelt-item>
            <fig-toolbelt-item value="four">Four</fig-toolbelt-item>
            <fig-toolbelt-item value="five">Five</fig-toolbelt-item>
          </fig-toolbelt-group>
          <fig-toolbelt-group slot="append" aria-label="Bottom tools">
            <fig-toolbelt-item value="bottom">Bottom</fig-toolbelt-item>
          </fig-toolbelt-group>
        </fig-toolbelt>`;
    });

    const tools = page.locator("#tools");
    const viewport = tools.locator('[part="viewport"]');
    const before = await tools.evaluate((element) => {
      const viewportElement = element.shadowRoot!.querySelector(
        '[part="viewport"]',
      ) as HTMLElement;
      const prepend = element.querySelector('[slot="prepend"]')!;
      const append = element.querySelector('[slot="append"]')!;
      const start = element.querySelector('[data-fig-toolbelt-nav="start"]')!;
      const end = element.querySelector('[data-fig-toolbelt-nav="end"]')!;
      const rect = (target: Element) => {
        const box = target.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      };
      return {
        prepend: rect(prepend),
        append: rect(append),
        start: rect(start),
        end: rect(end),
        clientHeight: viewportElement.clientHeight,
        scrollHeight: viewportElement.scrollHeight,
      };
    });
    expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);
    expect(before.prepend.bottom).toBeLessThanOrEqual(before.start.top + 1);
    expect(before.end.bottom).toBeLessThanOrEqual(before.append.top + 1);
    expect(
      await tools
        .locator('fig-toolbelt-group[slot="prepend"]')
        .evaluate((element) => getComputedStyle(element).borderBlockEndWidth),
    ).toBe("1px");
    expect(
      await tools
        .locator('fig-toolbelt-group[slot="append"]')
        .evaluate((element) => getComputedStyle(element).borderBlockStartWidth),
    ).toBe("1px");

    await viewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll"));
    });
    const after = await tools.evaluate((element) => {
      const prepend = element
        .querySelector('[slot="prepend"]')!
        .getBoundingClientRect();
      const append = element
        .querySelector('[slot="append"]')!
        .getBoundingClientRect();
      return { prependTop: prepend.top, appendBottom: append.bottom };
    });
    expect(after.prependTop).toBeCloseTo(before.prepend.top, 1);
    expect(after.appendBottom).toBeCloseTo(before.append.bottom, 1);

    await tools.locator('[value="top"]').focus();
    await page.keyboard.press("ArrowDown");
    await expect(tools.locator('[value="one"]')).toBeFocused();
    await page.keyboard.press("End");
    await expect(tools.locator('[value="bottom"]')).toBeFocused();
  });

  test("updates fixed regions when slot assignments change", async ({ page }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <div style="width: 180px">
          <fig-toolbelt id="tools" value="one">
            <fig-toolbelt-item id="dynamic" value="one">One</fig-toolbelt-item>
            <fig-toolbelt-item value="two">Two</fig-toolbelt-item>
          </fig-toolbelt>
        </div>`;
    });

    const tools = page.locator("#tools");
    const prepend = tools.locator('[part="prepend"]');
    const dynamic = tools.locator("#dynamic");
    await expect(prepend).toHaveAttribute("hidden", "");

    await dynamic.evaluate((element) => element.setAttribute("slot", "prepend"));
    await expect(prepend).not.toHaveAttribute("hidden", "");
    expect(
      await prepend.evaluate((element) =>
        (element as HTMLSlotElement)
          .assignedElements()
          .map((item) => item.id),
      ),
    ).toEqual(["dynamic"]);

    await dynamic.evaluate((element) => element.removeAttribute("slot"));
    await expect(prepend).toHaveAttribute("hidden", "");
    expect(
      await tools.locator('[part="viewport"] > slot').evaluate((element) =>
        (element as HTMLSlotElement)
          .assignedElements()
          .map((item) => item.id),
      ),
    ).toContain("dynamic");
  });

  test("centers programmatically selected overflow items without moving the page", async ({
    page,
  }) => {
    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <div style="height: 1600px; padding-top: 400px">
          <div style="width: 140px">
            <fig-toolbelt id="tools" value="one">
              <fig-toolbelt-item value="one">One</fig-toolbelt-item>
              <fig-toolbelt-item value="two">Two</fig-toolbelt-item>
              <fig-toolbelt-item value="three">Three</fig-toolbelt-item>
              <fig-toolbelt-item value="four">Four</fig-toolbelt-item>
              <fig-toolbelt-item value="five">Five</fig-toolbelt-item>
            </fig-toolbelt>
          </div>
        </div>`;
      window.scrollTo(0, 200);
    });

    await page.locator("#tools").evaluate((tools) => {
      (tools as HTMLElement & { value: string }).value = "five";
    });
    const viewport = page.locator("#tools").locator('[part="viewport"]');
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(200);
  });
});
