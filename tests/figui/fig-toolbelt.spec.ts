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
    await expect(tools).toHaveAttribute("role", "toolbar");
    await expect(viewport).toHaveClass(/fig-overflow-fade/);
    await expect(viewport).toHaveClass(/fig-overflow-fade-horizontal/);
    await expect(tools.locator("[data-fig-toolbelt-nav]")).toHaveCount(0);
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
          style="height: 72px;"
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
          <fig-toolbelt id="tools" value="one" overflow="buttons" aria-label="Overflow tools">
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
