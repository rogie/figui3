import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-gradient-editor", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() =>
      Promise.all([
        customElements.whenDefined("fig-gradient-editor"),
        customElements.whenDefined("fig-reorder"),
      ]),
    );
  });

  test("syncs stop overflow and visible rows without replacing rows", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="overflow-editor"
          show-rows="2"
          value='{"type":"linear","angle":90,"stops":[
            {"position":0,"color":"#FF0000","opacity":100},
            {"position":14,"color":"#FF8800","opacity":100},
            {"position":28,"color":"#FFFF00","opacity":100},
            {"position":42,"color":"#00FF00","opacity":100},
            {"position":56,"color":"#00FFFF","opacity":100},
            {"position":70,"color":"#0088FF","opacity":100},
            {"position":84,"color":"#8800FF","opacity":100},
            {"position":100,"color":"#FF00FF","opacity":100}
          ]}'
        ></fig-gradient-editor>
      `;
      const editor = root.querySelector("#overflow-editor");
      (window as any).__gradientOverflowRefs = {
        reorder: editor?.querySelector(
          ".fig-fill-picker-gradient-stops-list fig-reorder",
        ),
        rows: Array.from(
          editor?.querySelectorAll(".fig-fill-picker-gradient-stop-row") ?? [],
        ),
      };
    });

    const overflowState = () =>
      page.locator("#overflow-editor").evaluate((editor) => {
        const refs = (window as any).__gradientOverflowRefs;
        const reorder = editor.querySelector(
          ".fig-fill-picker-gradient-stops-list fig-reorder",
        );
        const rows = Array.from(
          editor.querySelectorAll(".fig-fill-picker-gradient-stop-row"),
        );
        const style = getComputedStyle(reorder!);
        return {
          fade: reorder?.classList.contains("fig-overflow-fade"),
          maxHeight: style.maxHeight,
          showRows: style
            .getPropertyValue("--fig-gradient-editor-overflow-show-rows")
            .trim(),
          overflowY: style.overflowY,
          overflowing: reorder!.scrollHeight > reorder!.clientHeight,
          sameReorder: refs.reorder === reorder,
          sameRows: refs.rows.every(
            (row: Element, index: number) => row === rows[index],
          ),
        };
      });

    expect(await overflowState()).toEqual({
      fade: true,
      maxHeight: "64px",
      showRows: "2",
      overflowY: "auto",
      overflowing: true,
      sameReorder: true,
      sameRows: true,
    });

    await page.locator("#overflow-editor").evaluate((editor) => {
      editor.setAttribute("overflow", "visible");
    });
    expect(await overflowState()).toEqual({
      fade: false,
      maxHeight: "none",
      showRows: "2",
      overflowY: "visible",
      overflowing: false,
      sameReorder: true,
      sameRows: true,
    });

    await page.locator("#overflow-editor").evaluate((editor) => {
      editor.setAttribute("overflow", "fade");
      editor.setAttribute("show-rows", "3");
    });
    expect(await overflowState()).toMatchObject({
      fade: true,
      maxHeight: "96px",
      showRows: "3",
      overflowing: true,
      sameReorder: true,
      sameRows: true,
    });

    await page.locator("#overflow-editor").evaluate((editor) => {
      editor.removeAttribute("show-rows");
    });
    expect(await overflowState()).toMatchObject({
      maxHeight: "208px",
      showRows: "6.5",
      overflowing: true,
      sameReorder: true,
      sameRows: true,
    });
  });

  test("adds after the selected stop, then selects, scrolls to, and focuses it", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="focus-editor"
          show-rows="2"
          value='{"type":"linear","angle":90,"stops":[
            {"position":0,"color":"#FF0000","opacity":100},
            {"position":20,"color":"#FF8800","opacity":100},
            {"position":40,"color":"#FFFF00","opacity":100},
            {"position":60,"color":"#00FF00","opacity":100},
            {"position":80,"color":"#0088FF","opacity":100},
            {"position":100,"color":"#8800FF","opacity":100}
          ]}'
        ></fig-gradient-editor>
      `;
      const editor = root.querySelector<any>("#focus-editor");
      editor.addEventListener("input", (event: CustomEvent) => {
        editor.value = {
          ...event.detail.gradient,
          stops: event.detail.gradient.stops.map((stop: any) => ({
            ...stop,
          })),
        };
      });
    });

    const editor = page.locator("#focus-editor");
    const rows = editor.locator(".fig-fill-picker-gradient-stop-row");
    const handles = editor.locator(
      "fig-handle:not(.fig-input-gradient-ghost)",
    );
    await expect(rows.first()).toHaveAttribute("selected");
    await expect(handles.first()).toHaveAttribute("selected");
    await expect(
      editor.locator(".fig-fill-picker-gradient-stop-row[selected]"),
    ).toHaveCount(1);
    const reorder = editor.locator("fig-reorder");
    await handles.nth(4).evaluate((handle: HTMLElement) => handle.click());
    await expect(rows.nth(4)).toHaveAttribute("selected");
    await expect
      .poll(() => reorder.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await reorder.evaluate((element) => element.scrollTo(0, 0));

    await handles.nth(1).evaluate((handle: HTMLElement) => handle.click());
    await expect(rows.nth(1)).toHaveAttribute("selected");
    await expect(rows.first()).not.toHaveAttribute("selected");

    await rows.nth(2).evaluate((row: HTMLElement) => row.click());
    await expect(rows.nth(2)).toHaveAttribute("selected");
    await expect(handles.nth(2)).toHaveAttribute("selected");
    await expect(handles.nth(1)).not.toHaveAttribute("selected");
    await expect
      .poll(() => reorder.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await reorder.evaluate((element) => element.scrollTo(0, 0));

    await editor.locator(".fig-fill-picker-gradient-add").click();
    await expect(rows).toHaveCount(7);
    await expect(rows.nth(3)).toHaveAttribute("selected");
    await expect(handles.nth(3)).toHaveAttribute("selected");
    await expect
      .poll(() => editor.evaluate((element: any) => element.value.stops[3].position))
      .toBe(50);

    const addedInput = editor.locator(
      '.fig-fill-picker-gradient-stop-row[data-index="3"] .fig-fill-picker-stop-color fig-input-text input',
    );
    await expect(addedInput).toBeFocused();
    await expect
      .poll(() =>
        addedInput.evaluate((input: HTMLInputElement) => ({
          value: input.value,
          start: input.selectionStart,
          end: input.selectionEnd,
        })),
      )
      .toEqual({
        value: "888888",
        start: 0,
        end: 6,
      });
    await expect
      .poll(() =>
        reorder.evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(0);
  });

  test("renders the extracted gradient controls and emits normalized edits", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="editor"
          value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
        ></fig-gradient-editor>
      `;
      const editor = root.querySelector("#editor");
      editor?.addEventListener("input", (event) => {
        editor.setAttribute(
          "data-input-detail",
          JSON.stringify((event as CustomEvent).detail),
        );
      });
    });

    const editor = page.locator("#editor");
    await expect(editor.locator(".fig-fill-picker-gradient-type")).toHaveCount(1);
    await expect(editor.locator(".fig-fill-picker-gradient-bar-input")).toHaveCount(
      1,
    );
    await expect
      .poll(() =>
        editor
          .locator(".fig-fill-picker-gradient-preview")
          .evaluate((element) => getComputedStyle(element).overflow),
      )
      .toBe("visible");
    await expect(editor.locator(".fig-fill-picker-gradient-stop-row")).toHaveCount(
      2,
    );

    await editor.locator(".fig-fill-picker-gradient-add").click();
    await expect(editor.locator(".fig-fill-picker-gradient-stop-row")).toHaveCount(
      3,
    );

    const state = await editor.evaluate((element: any) => ({
      value: element.value,
      cssValue: element.cssValue,
      detail: JSON.parse(element.getAttribute("data-input-detail")),
      rows: Array.from(
        element.querySelectorAll(".fig-fill-picker-gradient-stop-row"),
      ).map((row: any) => ({
        tag: row.tagName,
        leading: row.getAttribute("leading"),
        trailing: row.getAttribute("trailing"),
        inputSlot: row.querySelector(":scope > fig-stack")?.slot,
      })),
    }));
    expect(state.value.stops).toHaveLength(3);
    expect(state.value.interpolationSpace).toBe("srgb");
    expect(state.cssValue).toContain("linear-gradient(90deg");
    expect(state.detail.gradient.stops).toHaveLength(3);
    expect(state.rows).toEqual(
      Array.from({ length: 3 }, () => ({
        tag: "FIG-PROPERTY",
        leading: "drag",
        trailing: "remove",
        inputSlot: "input",
      })),
    );
  });

  test("does not expose internal reorder or optionhover events", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="editor"
          value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":50,"color":"#14AE5C","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
        ></fig-gradient-editor>
      `;
      const editor = root.querySelector<any>("#editor");
      const reorder = editor.querySelector("fig-reorder");
      let inputCount = 0;
      let reorderCount = 0;
      let optionHoverCount = 0;
      editor.addEventListener("input", () => inputCount++);
      editor.addEventListener("reorder", () => reorderCount++);
      editor.addEventListener("optionhover", () => optionHoverCount++);
      reorder.dispatchEvent(
        new CustomEvent("reorder", {
          bubbles: true,
          composed: true,
          detail: { oldIndex: 0, newIndex: 1 },
        }),
      );
      editor
        .querySelector(".fig-fill-picker-gradient-type")
        .dispatchEvent(
          new CustomEvent("optionhover", { bubbles: true, composed: true }),
        );
      return {
        inputCount,
        reorderCount,
        optionHoverCount,
        positions: editor.value.stops.map((stop: any) => stop.position),
      };
    });

    expect(result).toEqual({
      inputCount: 1,
      reorderCount: 0,
      optionHoverCount: 0,
      positions: [50, 0, 100],
    });
  });

  test("supports full fill values, color space, and disabled state", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="editor"
          color-space="display-p3"
          disabled
          value='{"type":"gradient","gradient":{"type":"radial","centerX":25,"centerY":75,"stops":[{"position":0,"color":"#FF0000","opacity":50},{"position":100,"color":"#0000FF","opacity":100}]}}'
        ></fig-gradient-editor>
      `;
    });

    const editor = page.locator("#editor");
    await expect(editor.locator(".fig-fill-picker-gradient-add")).toHaveAttribute(
      "disabled",
    );
    await expect(
      editor.locator(".fig-fill-picker-stop-position").first(),
    ).toHaveAttribute("disabled");
    await expect
      .poll(() => editor.evaluate((element: any) => element.value.type))
      .toBe("radial");
    await expect
      .poll(() => editor.evaluate((element: any) => element.cssValue))
      .toContain("color(display-p3");
  });

  test("preserves an active gradient handle under controlled value feedback", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="editor"
          value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":50,"color":"#14AE5C","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
        ></fig-gradient-editor>
      `;
      const editor = root.querySelector<any>("#editor");
      const handle = editor.querySelectorAll(
        ".fig-fill-picker-gradient-bar-input fig-handle:not(.fig-input-gradient-ghost)",
      )[1];
      const state = {
        editor,
        handle,
        inputCount: 0,
        changeCount: 0,
      };
      (window as any).__gradientControlledState = state;
      editor.addEventListener("input", (event: CustomEvent) => {
        state.inputCount += 1;
        const normalized = structuredClone(event.detail.gradient);
        normalized.stops = normalized.stops.map((stop: any) => ({
          position: Number(stop.position),
          color: String(stop.color).toUpperCase(),
          opacity: Number(stop.opacity),
        }));
        editor.value = { type: "gradient", gradient: normalized };
      });
      editor.addEventListener("change", () => {
        state.changeCount += 1;
      });
    });

    const handle = page
      .locator(
        "#editor .fig-fill-picker-gradient-bar-input fig-handle:not(.fig-input-gradient-ghost)",
      )
      .nth(1);
    const box = await handle.boundingBox();
    if (!box) throw new Error("Missing gradient handle bounds");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 24, y);

    const activeState = await page.evaluate(() => {
      const state = (window as any).__gradientControlledState;
      return {
        connected: state.handle.isConnected,
        sameHandle:
          state.handle ===
          state.editor.querySelectorAll(
            ".fig-fill-picker-gradient-bar-input fig-handle:not(.fig-input-gradient-ghost)",
          )[1],
        dragging: state.handle.classList.contains("dragging"),
        selected: state.handle.hasAttribute("selected"),
        inputCount: state.inputCount,
      };
    });
    expect(activeState).toMatchObject({
      connected: true,
      sameHandle: true,
      dragging: true,
      selected: true,
    });
    expect(activeState.inputCount).toBeGreaterThan(0);

    await page.mouse.move(x + 56, y);
    await page.mouse.up();

    const committed = await page.evaluate(() => {
      const state = (window as any).__gradientControlledState;
      return {
        connected: state.handle.isConnected,
        sameHandle:
          state.handle ===
          state.editor.querySelectorAll(
            ".fig-fill-picker-gradient-bar-input fig-handle:not(.fig-input-gradient-ghost)",
          )[1],
        dragging: state.handle.classList.contains("dragging"),
        inputCount: state.inputCount,
        changeCount: state.changeCount,
        position: state.editor.value.stops[1].position,
      };
    });
    expect(committed.connected).toBe(true);
    expect(committed.sameHandle).toBe(true);
    expect(committed.dragging).toBe(false);
    expect(committed.inputCount).toBeGreaterThan(1);
    expect(committed.changeCount).toBe(1);
    expect(committed.position).toBeGreaterThan(50);
  });

  test("defers conflicting external values until a pointer interaction ends", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="editor"
          value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":50,"color":"#14AE5C","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
        ></fig-gradient-editor>
      `;
    });

    const handle = page
      .locator(
        "#editor .fig-fill-picker-gradient-bar-input fig-handle:not(.fig-input-gradient-ghost)",
      )
      .nth(1);
    const box = await handle.boundingBox();
    if (!box) throw new Error("Missing gradient handle bounds");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y);
    await page.locator("#editor").evaluate((editor: any) => {
      editor.value = {
        ...editor.value,
        angle: 270,
        hueInterpolation: "longer",
      };
    });
    await expect
      .poll(() =>
        page.locator("#editor").evaluate((editor: any) => editor.value.angle),
      )
      .toBe(90);

    await page.mouse.up();
    await expect
      .poll(() =>
        page.locator("#editor").evaluate((editor: any) => ({
          angle: editor.value.angle,
          hueInterpolation: editor.value.hueInterpolation,
        })),
      )
      .toEqual({ angle: 270, hueInterpolation: "longer" });
  });

  test("synchronizes idle updates without replacing controls or unaffected rows", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="editor"
          value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
        ></fig-gradient-editor>
      `;
      const editor = root.querySelector<any>("#editor");
      (window as any).__gradientIdleRefs = {
        type: editor.querySelector(".fig-fill-picker-gradient-type"),
        bar: editor.querySelector(".fig-fill-picker-gradient-bar-input"),
        flip: editor.querySelector(".fig-fill-picker-gradient-flip"),
        rotate: editor.querySelector(".fig-fill-picker-gradient-rotate"),
        add: editor.querySelector(".fig-fill-picker-gradient-add"),
        rows: Array.from(
          editor.querySelectorAll(".fig-fill-picker-gradient-stop-row"),
        ),
      };
      editor.value = {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: "90",
          stops: [
            { position: "0", color: "#0d99ff", opacity: "100" },
            { position: "100", color: "#9747ff", opacity: "100" },
          ],
        },
      };
    });

    const identity = async () =>
      page.locator("#editor").evaluate((editor: any) => {
        const refs = (window as any).__gradientIdleRefs;
        const rows = Array.from(
          editor.querySelectorAll(".fig-fill-picker-gradient-stop-row"),
        );
        return {
          type: refs.type === editor.querySelector(".fig-fill-picker-gradient-type"),
          bar: refs.bar === editor.querySelector(".fig-fill-picker-gradient-bar-input"),
          flip: refs.flip === editor.querySelector(".fig-fill-picker-gradient-flip"),
          rotate:
            refs.rotate === editor.querySelector(".fig-fill-picker-gradient-rotate"),
          add: refs.add === editor.querySelector(".fig-fill-picker-gradient-add"),
          firstRow: refs.rows[0] === rows[0],
          lastRow: refs.rows[1] === rows[rows.length - 1],
          rowCount: rows.length,
        };
      });

    expect(await identity()).toEqual({
      type: true,
      bar: true,
      flip: true,
      rotate: true,
      add: true,
      firstRow: true,
      lastRow: true,
      rowCount: 2,
    });

    await page.locator("#editor").evaluate((editor: any) => {
      editor.value = {
        ...editor.value,
        angle: 45,
        stops: [
          { position: 10, color: "#0D99FF", opacity: 100 },
          { position: 100, color: "#9747FF", opacity: 80 },
        ],
      };
    });
    expect(await identity()).toMatchObject({
      type: true,
      bar: true,
      firstRow: true,
      lastRow: true,
      rowCount: 2,
    });

    await page.locator("#editor").evaluate((editor: any) => {
      editor.value = {
        ...editor.value,
        stops: [
          { position: 10, color: "#0D99FF", opacity: 100 },
          { position: 50, color: "#888888", opacity: 100 },
          { position: 100, color: "#9747FF", opacity: 80 },
        ],
      };
    });
    expect(await identity()).toMatchObject({
      firstRow: true,
      lastRow: true,
      rowCount: 3,
    });

    await page.locator("#editor").evaluate((editor: any) => {
      editor.value = {
        ...editor.value,
        stops: [
          { position: 10, color: "#0D99FF", opacity: 100 },
          { position: 100, color: "#9747FF", opacity: 80 },
        ],
      };
      editor.setAttribute("disabled", "");
    });
    expect(await identity()).toMatchObject({
      firstRow: true,
      lastRow: true,
      rowCount: 2,
    });
    await expect(
      page.locator("#editor .fig-fill-picker-gradient-add"),
    ).toHaveAttribute("disabled");
    await expect(
      page.locator("#editor .fig-fill-picker-stop-color").first(),
    ).toHaveAttribute("disabled");

    await page.locator("#editor").evaluate((editor) =>
      editor.removeAttribute("disabled"),
    );
    const firstColor = page
      .locator("#editor .fig-fill-picker-stop-color")
      .first();
    await firstColor.locator("fig-swatch").click();
    const nestedPicker = page.locator("dialog.fig-fill-picker-dialog");
    await expect(nestedPicker).toHaveAttribute("open");
    await page.evaluate(() => {
      const editor = document.querySelector<any>("#editor");
      const color = editor.querySelector(".fig-fill-picker-stop-color");
      const picker = color.querySelector("fig-fill-picker");
      (window as any).__gradientNestedRefs = { color, picker };
      editor.value = { ...editor.value, angle: 135 };
    });
    const nestedState = await page.locator("#editor").evaluate((editor) => {
      const refs = (window as any).__gradientNestedRefs;
      const color = editor.querySelector(".fig-fill-picker-stop-color");
      return {
        sameColor: refs.color === color,
        samePicker: refs.picker === color.querySelector("fig-fill-picker"),
        pickerConnected: refs.picker?.isConnected,
      };
    });
    expect(nestedState).toEqual({
      sameColor: true,
      samePicker: true,
      pickerConnected: true,
    });
    await expect(nestedPicker).toHaveAttribute("open");
  });

  test("fig-popup-gradient owns an editor and forwards changes", async ({
    page,
  }) => {
    await page.evaluate(() => customElements.whenDefined("fig-popup-gradient"));
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="anchor">Gradient</fig-button>
        <dialog
          is="fig-popup-gradient"
          id="popup"
          anchor="#anchor"
          overflow="visible"
          show-rows="4.5"
          value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
          open
        ></dialog>
      `;
      const popup = root.querySelector("#popup");
      popup?.addEventListener("input", (event) => {
        popup.setAttribute(
          "data-input-detail",
          JSON.stringify((event as CustomEvent).detail),
        );
      });
    });

    const popup = page.locator("#popup");
    const editor = popup.locator("fig-gradient-editor");
    await expect(popup).toHaveAttribute("role", "dialog");
    await expect(popup).toHaveAttribute("aria-label", "Edit gradient");
    await expect(editor).toHaveCount(1);
    await expect(editor).toHaveAttribute("overflow", "visible");
    await expect(editor).toHaveAttribute("show-rows", "4.5");
    await popup.evaluate((element) => {
      element.setAttribute("overflow", "fade");
      element.setAttribute("show-rows", "3");
    });
    await expect(editor).toHaveAttribute("overflow", "fade");
    await expect(editor).toHaveAttribute("show-rows", "3");
    await editor.locator(".fig-fill-picker-gradient-add").click();
    await expect(editor.locator(".fig-fill-picker-gradient-stop-row")).toHaveCount(
      3,
    );
    await expect
      .poll(() =>
        popup.evaluate((element) =>
          JSON.parse(element.getAttribute("data-input-detail") || "{}"),
        ),
      )
      .toMatchObject({
        type: "gradient",
        gradient: { stops: [{}, {}, {}] },
      });
    await expect
      .poll(() =>
        popup.evaluate(
          (element) => JSON.parse(element.getAttribute("value") || "{}").stops,
        ),
      )
      .toHaveLength(3);
  });
});
