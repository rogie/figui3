import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-input-palette edit modes", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(() => customElements.whenDefined("fig-input-palette"));
  });

  test("omits editing DOM outside inline mode and opens a late-registered picker", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const value = '["#94BD00","#83AD00","#1A632A","#003905"]';
      root.innerHTML = `
        <fig-input-palette id="inline" edit="true" value='${value}'></fig-input-palette>
        <fig-input-palette id="preview" edit="false" value='${value}'></fig-input-palette>
        <fig-input-palette id="picker" edit="picker" value='${value}'></fig-input-palette>
      `;
    });
    await page.waitForTimeout(50);

    await expect(page.locator("#inline .palette-colors-expanded")).toHaveCount(1);
    await expect(page.locator("#inline .palette-add-btn")).toHaveCount(1);
    await expect(page.locator("#preview .palette-colors-expanded")).toHaveCount(0);
    await expect(page.locator("#preview .palette-add-btn")).toHaveCount(0);
    await expect(page.locator("#picker .palette-colors-expanded")).toHaveCount(0);
    await expect(page.locator("#picker .palette-add-btn")).toHaveCount(0);

    const previewTrigger = page.locator("#preview .palette-colors-inline");
    await expect(previewTrigger).toHaveAttribute("role", "img");
    await expect(previewTrigger).not.toHaveAttribute("aria-expanded");
    await previewTrigger.click();
    await expect(page.locator("#preview")).not.toHaveAttribute("open");

    const picker = page.locator("#picker");
    const pickerTrigger = picker.locator(".palette-colors-inline");
    await expect(pickerTrigger).toHaveAttribute("aria-haspopup", "dialog");
    await pickerTrigger.click();
    await expect(picker).toHaveAttribute("open", "");
    await expect(page.locator("dialog.fig-palette-editor-popup")).toHaveCount(0);

    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() =>
      Promise.all([
        customElements.whenDefined("fig-palette-editor"),
        customElements.whenDefined("fig-popup-palette"),
      ]),
    );

    const popup = page.locator('dialog[is="fig-popup-palette"]');
    await expect(popup).toHaveAttribute("open");
    await expect(popup).toHaveAttribute("position", "bottom left");
    await expect(popup).toHaveAttribute("offset", "0 8");
    await expect(popup).toHaveAttribute("aria-label", "Edit palette");
    await expect(popup.locator(":scope > fig-header")).toHaveCount(0);
    await expect(popup.locator("fig-palette-editor")).toHaveCount(1);
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(pickerTrigger).toHaveAttribute(
      "aria-controls",
      await popup.getAttribute("id"),
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const trigger = document.querySelector(
            "#picker .palette-colors-inline",
          );
          const popup = document.querySelector(
            'dialog[is="fig-popup-palette"]',
          );
          if (!trigger || !popup) return false;
          return (
            popup.getBoundingClientRect().top >=
            trigger.getBoundingClientRect().bottom
          );
        }),
      )
      .toBe(true);

    await popup.locator("fig-palette-editor").evaluate((editor) => {
      editor.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: [
            { color: "#112233", alpha: 1 },
            { color: "#445566", alpha: 0.5 },
          ],
        }),
      );
    });
    await expect(picker).toHaveAttribute(
      "value",
      '[{"color":"#112233","alpha":1},{"color":"#445566","alpha":0.5}]',
    );
    await expect(picker.locator(".palette-colors fig-input-color")).toHaveCount(2);

    await page.keyboard.press("Escape");
    await expect(picker).not.toHaveAttribute("open");
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(pickerTrigger).toBeFocused();

    await picker.locator(".palette-colors-inline").click();
    await expect(popup).toHaveAttribute("open");
    await picker.evaluate((host) => host.setAttribute("edit", "false"));
    await expect(page.locator('dialog[is="fig-popup-palette"]')).toHaveCount(0);
    await expect(picker).not.toHaveAttribute("open");
    await expect(picker.locator(".palette-colors-expanded")).toHaveCount(0);

    await picker.evaluate((host) => host.setAttribute("edit", "true"));
    await expect(picker.locator(".palette-colors-expanded")).toHaveCount(1);
    await expect(picker.locator(".palette-add-btn")).toHaveCount(1);
  });

  test("keeps preview and disabled picker modes non-interactive", async ({
    page,
  }) => {
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() =>
      customElements.whenDefined("fig-popup-palette"),
    );
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-palette id="preview" edit="false" open value='["#112233","#445566"]'></fig-input-palette>
        <fig-input-palette id="disabled-picker" edit="picker" disabled value='["#112233","#445566"]'></fig-input-palette>
      `;
    });
    await page.waitForTimeout(50);

    await expect(page.locator("#preview")).not.toHaveAttribute("open");
    await expect(
      page.locator("#disabled-picker .palette-colors-inline"),
    ).toHaveAttribute("tabindex", "-1");
    await page
      .locator("#disabled-picker .palette-colors-inline")
      .click({ force: true });
    await expect(page.locator("#disabled-picker")).not.toHaveAttribute("open");
    await expect(page.locator("dialog.fig-palette-editor-popup")).toHaveCount(0);
  });

  test("fig-field only adds a disclosure chevron for inline editing", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-field id="inline-field">
          <label>Inline</label>
          <fig-input-palette edit="true" value='["#112233","#445566"]'></fig-input-palette>
        </fig-field>
        <fig-field id="preview-field">
          <label>Preview</label>
          <fig-input-palette edit="false" value='["#112233","#445566"]'></fig-input-palette>
        </fig-field>
        <fig-field id="picker-field">
          <label>Picker</label>
          <fig-input-palette edit="picker" value='["#112233","#445566"]'></fig-input-palette>
        </fig-field>
      `;
    });
    await page.waitForTimeout(50);

    await expect(
      page.locator('#inline-field > .fig-field-chevron[slot="leading"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#preview-field > .fig-field-chevron[slot="leading"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#picker-field > .fig-field-chevron[slot="leading"]'),
    ).toHaveCount(0);

    await page
      .locator("#inline-field fig-input-palette")
      .evaluate((palette) => palette.setAttribute("edit", "false"));
    await expect(
      page.locator('#inline-field > .fig-field-chevron[slot="leading"]'),
    ).toHaveCount(0);

    await page
      .locator("#preview-field fig-input-palette")
      .evaluate((palette) => palette.setAttribute("edit", "true"));
    await expect(
      page.locator('#preview-field > .fig-field-chevron[slot="leading"]'),
    ).toHaveCount(1);
  });
});

test.describe("fig-palette-editor", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-palette-editor"),
        customElements.whenDefined("fig-reorder"),
      ]);
    });
  });

  test("defaults to a vertical fade and switches overflow modes in place", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor
          id="overflow-editor"
          show-rows="2"
          value='["#111111","#222222","#333333","#444444","#555555"]'
        ></fig-palette-editor>
      `;
      const editor = root.querySelector("#overflow-editor");
      (window as any).__paletteOverflowRefs = {
        reorder: editor?.querySelector("fig-reorder"),
        rows: Array.from(
          editor?.querySelectorAll(".fig-palette-editor-color-row") ?? [],
        ),
      };
    });

    const overflowState = () =>
      page.locator("#overflow-editor").evaluate((editor) => {
        const refs = (window as any).__paletteOverflowRefs;
        const reorder = editor.querySelector("fig-reorder");
        const rows = Array.from(
          editor.querySelectorAll(".fig-palette-editor-color-row"),
        );
        const style = getComputedStyle(reorder!);
        return {
          fade: reorder?.classList.contains("fig-overflow-fade"),
          bottom: reorder?.classList.contains("fig-overflow-fade-bottom"),
          maxHeight: style.maxHeight,
          showRows: style
            .getPropertyValue("--fig-palette-editor-overflow-show-rows")
            .trim(),
          overflowY: style.overflowY,
          overflowing: reorder!.scrollHeight > reorder!.clientHeight,
          sameReorder: refs.reorder === reorder,
          sameRows: refs.rows.every((row: Element, index: number) =>
            row === rows[index]
          ),
        };
      });

    expect(await overflowState()).toEqual({
      fade: true,
      bottom: false,
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
      bottom: false,
      maxHeight: "none",
      showRows: "2",
      overflowY: "visible",
      overflowing: false,
      sameReorder: true,
      sameRows: true,
    });

    await page.locator("#overflow-editor").evaluate((editor) => {
      editor.setAttribute("overflow", "fade");
    });
    expect(await overflowState()).toMatchObject({
      fade: true,
      bottom: false,
      maxHeight: "64px",
      showRows: "2",
      overflowY: "auto",
      sameReorder: true,
      sameRows: true,
    });

    await page.locator("#overflow-editor").evaluate((editor) => {
      editor.setAttribute("show-rows", "3");
    });
    expect(await overflowState()).toMatchObject({
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
      overflowing: false,
      sameReorder: true,
      sameRows: true,
    });
  });

  test("reorders fields and keeps DOM, value, and events aligned", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor
          id="editor"
          value='["#111111","#222222","#333333"]'
        ></fig-palette-editor>
      `;
      const editor = root.querySelector("#editor");
      editor?.addEventListener("input", (event) => {
        editor.setAttribute(
          "data-input-detail",
          JSON.stringify((event as CustomEvent).detail),
        );
      });
      editor?.addEventListener("change", (event) => {
        editor.setAttribute(
          "data-change-detail",
          JSON.stringify((event as CustomEvent).detail),
        );
      });
    });
    await page.waitForTimeout(50);

    const editor = page.locator("#editor");
    const rows = editor.locator(".fig-palette-editor-color-row");
    await expect(rows).toHaveCount(3);
    await rows.first().focus();
    await page.keyboard.press("ArrowDown");

    const state = await editor.evaluate((element: any) => ({
      value: element.value,
      domValues: Array.from(
        element.querySelectorAll(".fig-palette-editor-color"),
      ).map((input: any) => input.getAttribute("value")),
      indexes: Array.from(
        element.querySelectorAll(".fig-palette-editor-color-row"),
      ).map((row: any) => row.dataset.index),
      rowContracts: Array.from(
        element.querySelectorAll(".fig-palette-editor-color-row"),
      ).map((row: any) => ({
        tag: row.tagName,
        leading: row.getAttribute("leading"),
        trailing: row.getAttribute("trailing"),
        showTrailing: row.hasAttribute("show-trailing"),
        inputSlot:
          row.querySelector(":scope > .fig-palette-editor-color")?.slot,
      })),
      inputDetail: JSON.parse(element.getAttribute("data-input-detail")),
      changeDetail: JSON.parse(element.getAttribute("data-change-detail")),
    }));
    const expected = [
      { color: "#222222", alpha: 1 },
      { color: "#111111", alpha: 1 },
      { color: "#333333", alpha: 1 },
    ];
    expect(state).toEqual({
      value: expected,
      domValues: ["#222222", "#111111", "#333333"],
      indexes: ["0", "1", "2"],
      rowContracts: Array.from({ length: 3 }, () => ({
        tag: "FIG-PROPERTY",
        leading: "drag",
        trailing: "remove",
        showTrailing: true,
        inputSlot: "input",
      })),
      inputDetail: expected,
      changeDetail: expected,
    });
  });

  test("preserves active rows under controlled value feedback", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor
          id="controlled"
          value='[{"color":"#111111","alpha":1},{"color":"#222222","alpha":0.5},{"color":"#333333","alpha":1}]'
        ></fig-palette-editor>
      `;
      const editor = root.querySelector<any>("#controlled");
      const row = editor.querySelectorAll(".fig-palette-editor-color-row")[1];
      const input = row.querySelector(".fig-palette-editor-color");
      const state = { editor, row, input, inputCount: 0, changeCount: 0 };
      (window as any).__paletteControlledState = state;
      editor.addEventListener("input", (event: CustomEvent) => {
        state.inputCount += 1;
        editor.value = event.detail.map((entry: any) => ({
          color: String(entry.color).toLowerCase(),
          alpha: Number(entry.alpha),
        }));
      });
      editor.addEventListener("change", () => {
        state.changeCount += 1;
      });

      input.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          buttons: 1,
          pointerId: 1,
        }),
      );
      for (const color of ["#445566", "#778899"]) {
        input.hexOpaque = color;
        input.rgba = { r: 0, g: 0, b: 0, a: 128 / 255 };
        input.dispatchEvent(
          new CustomEvent("input", {
            bubbles: true,
            detail: { color, alpha: 128 / 255 },
          }),
        );
      }
      const accepted = editor.value;
      editor.value = [
        { color: "#AAAAAA", alpha: 1 },
        ...accepted.slice(1),
      ];
      editor.value = accepted;
    });

    const active = await page.evaluate(() => {
      const state = (window as any).__paletteControlledState;
      return {
        rowConnected: state.row.isConnected,
        inputConnected: state.input.isConnected,
        sameRow:
          state.row ===
          state.editor.querySelectorAll(".fig-palette-editor-color-row")[1],
        sameInput:
          state.input ===
          state.editor.querySelectorAll(".fig-palette-editor-color")[1],
        inputCount: state.inputCount,
      };
    });
    expect(active).toEqual({
      rowConnected: true,
      inputConnected: true,
      sameRow: true,
      sameInput: true,
      inputCount: 2,
    });

    await page.evaluate(() => {
      const state = (window as any).__paletteControlledState;
      state.input.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: { color: "#778899", alpha: 128 / 255 },
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          button: 0,
          pointerId: 1,
        }),
      );
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = (window as any).__paletteControlledState;
          return {
            sameRow:
              state.row ===
              state.editor.querySelectorAll(
                ".fig-palette-editor-color-row",
              )[1],
            sameInput:
              state.input ===
              state.editor.querySelectorAll(".fig-palette-editor-color")[1],
            changeCount: state.changeCount,
            color: state.editor.value[1].color,
            alpha: state.editor.value[1].alpha,
          };
        }),
      )
      .toEqual({
        sameRow: true,
        sameInput: true,
        changeCount: 1,
        color: "#778899",
        alpha: 0.5,
      });
  });

  test("synchronizes idle palette updates without replacing controls or unaffected rows", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor
          id="stable"
          value='["#111111","#333333"]'
        ></fig-palette-editor>
      `;
      const editor = root.querySelector<any>("#stable");
      (window as any).__paletteStableRefs = {
        reorder: editor.querySelector("fig-reorder"),
        add: editor.querySelector(".fig-palette-editor-add"),
        rows: Array.from(
          editor.querySelectorAll(".fig-palette-editor-color-row"),
        ),
        inputs: Array.from(
          editor.querySelectorAll(".fig-palette-editor-color"),
        ),
      };
      editor.value = [
        { color: "#111111", alpha: 1 },
        { color: "#333333", alpha: 1 },
      ];
    });

    const identity = async () =>
      page.locator("#stable").evaluate((editor: any) => {
        const refs = (window as any).__paletteStableRefs;
        const rows = Array.from(
          editor.querySelectorAll(".fig-palette-editor-color-row"),
        );
        const inputs = Array.from(
          editor.querySelectorAll(".fig-palette-editor-color"),
        );
        return {
          reorder: refs.reorder === editor.querySelector("fig-reorder"),
          add: refs.add === editor.querySelector(".fig-palette-editor-add"),
          firstRow: refs.rows[0] === rows[0],
          lastRow: refs.rows[1] === rows[rows.length - 1],
          firstInput: refs.inputs[0] === inputs[0],
          lastInput: refs.inputs[1] === inputs[inputs.length - 1],
          rowCount: rows.length,
        };
      });

    expect(await identity()).toEqual({
      reorder: true,
      add: true,
      firstRow: true,
      lastRow: true,
      firstInput: true,
      lastInput: true,
      rowCount: 2,
    });

    await page
      .locator(
        "#stable .fig-palette-editor-color-row:first-child fig-input-text input",
      )
      .evaluate((input: HTMLInputElement) => {
        input.focus();
        input.setSelectionRange(1, 3);
      });
    await page.locator("#stable").evaluate((editor: any) => {
      editor.value = [
        { color: "#AAAAAA", alpha: 0.5 },
        { color: "#333333", alpha: 1 },
      ];
    });
    expect(await identity()).toMatchObject({
      reorder: true,
      add: true,
      firstRow: true,
      lastRow: true,
      rowCount: 2,
    });
    await expect
      .poll(() =>
        page
          .locator(
            "#stable .fig-palette-editor-color-row:first-child fig-input-text input",
          )
          .evaluate((input: HTMLInputElement) => ({
            focused: input === document.activeElement,
            start: input.selectionStart,
            end: input.selectionEnd,
          })),
      )
      .toEqual({ focused: true, start: 1, end: 3 });

    await page.locator("#stable").evaluate((editor: any) => {
      editor.value = [
        { color: "#AAAAAA", alpha: 0.5 },
        { color: "#222222", alpha: 1 },
        { color: "#333333", alpha: 1 },
      ];
    });
    expect(await identity()).toMatchObject({
      firstRow: true,
      lastRow: true,
      rowCount: 3,
    });

    await page.locator("#stable").evaluate((editor: any) => {
      editor.value = [
        { color: "#AAAAAA", alpha: 0.5 },
        { color: "#333333", alpha: 1 },
      ];
      editor.setAttribute("disabled", "");
    });
    expect(await identity()).toMatchObject({
      firstRow: true,
      lastRow: true,
      rowCount: 2,
    });
    await expect(
      page.locator("#stable .fig-palette-editor-color").first(),
    ).toHaveAttribute("disabled");
    await expect(
      page.locator("#stable .fig-palette-editor-add"),
    ).toHaveAttribute("disabled");

    await page.locator("#stable").evaluate((editor) => {
      editor.removeAttribute("disabled");
      editor.setAttribute("fixed", "");
    });
    await expect(
      page.locator("#stable .fig-palette-editor-add"),
    ).toHaveCount(0);
    expect(await identity()).toMatchObject({
      firstRow: true,
      lastRow: true,
      rowCount: 2,
    });

    await page.locator("#stable").evaluate((editor) =>
      editor.removeAttribute("fixed"),
    );
    await expect(
      page.locator("#stable .fig-palette-editor-add"),
    ).toHaveCount(1);
    expect(await identity()).toMatchObject({
      add: true,
      firstRow: true,
      lastRow: true,
    });

    const firstColor = page
      .locator("#stable .fig-palette-editor-color")
      .first();
    await firstColor.locator("fig-swatch").click();
    const nestedPicker = page.locator("dialog.fig-fill-picker-dialog");
    await expect(nestedPicker).toHaveAttribute("open");
    await page.locator("#stable").evaluate((editor: any) => {
      const color = editor.querySelector(".fig-palette-editor-color");
      const picker = color.querySelector("fig-fill-picker");
      (window as any).__paletteNestedRefs = { color, picker };
      editor.value = [
        editor.value[0],
        { color: "#AAAAAA", alpha: 1 },
      ];
    });
    const nestedState = await page.locator("#stable").evaluate((editor) => {
      const refs = (window as any).__paletteNestedRefs;
      const color = editor.querySelector(".fig-palette-editor-color");
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

  test("fig-popup-palette inherits popup behavior and synchronizes its editor", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="palette-anchor">Palette</fig-button>
        <dialog
          is="fig-popup-palette"
          id="palette-popup"
          anchor="#palette-anchor"
          value='["#112233","#44556680"]'
          min="1"
          max="4"
          overflow="visible"
          show-rows="4.5"
          open
        ></dialog>
      `;
    });

    const popup = page.locator("#palette-popup");
    const editor = popup.locator("fig-palette-editor");
    await expect(popup).toHaveAttribute("role", "dialog");
    await expect(popup).toHaveAttribute("position", "bottom left");
    await expect(popup).toHaveAttribute("offset", "0 8");
    await expect(popup).toHaveAttribute("aria-label", "Edit palette");
    await expect(editor).toHaveAttribute("min", "1");
    await expect(editor).toHaveAttribute("max", "4");
    await expect(editor).toHaveAttribute("overflow", "visible");
    await expect(editor).toHaveAttribute("show-rows", "4.5");
    await expect(editor).toHaveAttribute("value", '["#112233","#44556680"]');

    await popup.evaluate((element) => element.setAttribute("overflow", "fade"));
    await expect(editor).toHaveAttribute("overflow", "fade");
    await popup.evaluate((element) => element.setAttribute("show-rows", "3"));
    await expect(editor).toHaveAttribute("show-rows", "3");

    await editor.evaluate((element) => {
      element.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: [{ color: "#AABBCC", alpha: 0.5 }],
        }),
      );
    });
    await expect(popup).toHaveAttribute(
      "value",
      '[{"color":"#AABBCC","alpha":0.5}]',
    );
    await expect
      .poll(() => popup.evaluate((element: any) => element.value))
      .toEqual([{ color: "#AABBCC", alpha: 0.5 }]);
  });

  test("adds a deterministic, harmonious, perceptually distinct color", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor
          id="harmonious"
          value='[
            {"color":"#FF0000","alpha":1},
            {"color":"#000000","alpha":0.25},
            {"color":"#FFFFFF","alpha":0.75}
          ]'
        ></fig-palette-editor>
        <fig-palette-editor
          id="harmonious-copy"
          value='[
            {"color":"#FF0000","alpha":1},
            {"color":"#000000","alpha":0.25},
            {"color":"#FFFFFF","alpha":0.75}
          ]'
        ></fig-palette-editor>
      `;
    });
    await page.locator("#harmonious-copy .fig-palette-editor-add").click();
    await page.locator("#harmonious .fig-palette-editor-add").click();

    const result = await page.evaluate(async () => {
      const color = await import("/fig-color.js");
      const editor = document.querySelector<any>("#harmonious");
      const copy = document.querySelector<any>("#harmonious-copy");
      const generated = editor.value.at(-1);
      const generatedRgb = color.figHexToRGB(generated.color);
      const generatedLab = color.figRGBToOklab(
        generatedRgb.r,
        generatedRgb.g,
        generatedRgb.b,
      );
      const minimumDistance = Math.min(
        ...editor.value.slice(0, -1).map((entry: any) => {
          const rgb = color.figHexToRGB(entry.color);
          return color.figOklabDistance(
            generatedLab,
            color.figRGBToOklab(rgb.r, rgb.g, rgb.b),
          );
        }),
      );
      return {
        value: editor.value,
        generated,
        deterministic:
          generated.color === copy.value.at(-1).color &&
          generated.alpha === copy.value.at(-1).alpha,
        minimumDistance,
      };
    });

    expect(result.value).toHaveLength(4);
    expect(result.generated.color).not.toBe("#FF0000");
    expect(result.generated.color).not.toBe("#000000");
    expect(result.generated.color).not.toBe("#FFFFFF");
    expect(result.generated.alpha).toBe(0.75);
    expect(result.deterministic).toBe(true);
    expect(result.minimumDistance).toBeGreaterThan(0.1);

    const addedInput = page.locator(
      '#harmonious .fig-palette-editor-color-row[data-index="3"] fig-input-color fig-input-text input',
    );
    await expect(addedInput).toBeFocused();
    await expect
      .poll(() =>
        addedInput.evaluate((input: HTMLInputElement) => ({
          value: input.value,
          selectionStart: input.selectionStart,
          selectionEnd: input.selectionEnd,
        })),
      )
      .toEqual({
        value: result.generated.color.slice(1),
        selectionStart: 0,
        selectionEnd: 6,
      });
  });

  test("extends neutral and sequential palettes within their color character", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor id="neutral" value='["#202020","#808080","#E0E0E0"]'></fig-palette-editor>
        <fig-palette-editor id="sequential" value='["#072B45","#0D5E91","#159FE0"]'></fig-palette-editor>
      `;
    });
    await page.locator("#neutral .fig-palette-editor-add").click();
    await page.locator("#sequential .fig-palette-editor-add").click();

    const result = await page.evaluate(async () => {
      const color = await import("/fig-color.js");
      const neutral =
        document.querySelector<any>("#neutral").value.at(-1).color;
      const sequential =
        document.querySelector<any>("#sequential").value.at(-1).color;
      const neutralRgb = color.figHexToRGB(neutral);
      const sequentialLch = color.figHexToOklch(sequential);
      const sourceLch = color.figHexToOklch("#159FE0");
      const hueDifference = Math.abs(sequentialLch.h - sourceLch.h);
      return {
        neutral,
        neutralChannelSpread:
          Math.max(neutralRgb.r, neutralRgb.g, neutralRgb.b) -
          Math.min(neutralRgb.r, neutralRgb.g, neutralRgb.b),
        sequential,
        sequentialHueDifference: Math.min(
          hueDifference,
          360 - hueDifference,
        ),
      };
    });

    expect(["#202020", "#808080", "#E0E0E0"]).not.toContain(result.neutral);
    expect(result.neutralChannelSpread).toBeLessThanOrEqual(1);
    expect(["#072B45", "#0D5E91", "#159FE0"]).not.toContain(
      result.sequential,
    );
    expect(result.sequentialHueDifference).toBeLessThan(25);
  });

  test("honors min, max, fixed, and disabled controls", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor id="limited" min="2" max="3" value='["#111111","#222222"]'></fig-palette-editor>
        <fig-palette-editor id="unbounded" value='["#111111","#222222","#333333","#444444","#555555","#666666","#777777","#888888"]'></fig-palette-editor>
        <fig-palette-editor id="fixed" fixed value='["#111111","#222222"]'></fig-palette-editor>
        <fig-palette-editor id="disabled" disabled value='["#111111","#222222"]'></fig-palette-editor>
      `;
    });
    await page.waitForTimeout(50);

    const limited = page.locator("#limited");
    await expect(limited.locator(".fig-palette-editor-remove").first()).toHaveAttribute(
      "disabled",
    );
    await limited.locator(".fig-palette-editor-add").click();
    await expect(limited.locator(".fig-palette-editor-color-row")).toHaveCount(3);
    await expect(limited.locator(".fig-palette-editor-add")).toHaveAttribute(
      "disabled",
    );

    const unbounded = page.locator("#unbounded");
    await expect(unbounded.locator(".fig-palette-editor-add")).not.toHaveAttribute(
      "disabled",
    );
    await unbounded.locator(".fig-palette-editor-add").click();
    await expect(unbounded.locator(".fig-palette-editor-color-row")).toHaveCount(9);

    await expect(page.locator("#fixed .fig-palette-editor-remove")).toHaveCount(0);
    await expect(page.locator("#fixed .fig-palette-editor-add")).toHaveCount(0);
    await expect(page.locator("#disabled fig-reorder")).toHaveAttribute(
      "disabled",
    );
    await expect(
      page.locator("#disabled .fig-palette-editor-color").first(),
    ).toHaveAttribute("disabled");
  });
});
