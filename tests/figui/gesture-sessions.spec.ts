import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("gesture session component contracts", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("dialog drags own one pointer and cancellation cleans up", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const dialog = document.createElement("dialog", {
        is: "fig-dialog",
      }) as HTMLDialogElement;
      dialog.setAttribute("is", "fig-dialog");
      dialog.setAttribute("drag", "");
      dialog.style.cssText = "width:120px;height:80px";
      document.body.append(dialog);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const rect = dialog.getBoundingClientRect();
      const pointer = (
        type: string,
        pointerId: number,
        x: number,
        y: number,
      ) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId,
          button: 0,
          clientX: x,
          clientY: y,
        });

      dialog.dispatchEvent(
        pointer("pointerdown", 21, rect.left + 5, rect.top + 5),
      );
      document.dispatchEvent(
        pointer("pointermove", 22, rect.left + 45, rect.top + 35),
      );
      const foreignPointerCursor = dialog.style.cursor;
      document.dispatchEvent(
        pointer("pointermove", 21, rect.left + 45, rect.top + 35),
      );
      const activeLeft = dialog.style.left;
      document.dispatchEvent(
        pointer("pointercancel", 21, rect.left + 45, rect.top + 35),
      );
      document.dispatchEvent(
        pointer("pointermove", 21, rect.left + 75, rect.top + 55),
      );
      return {
        foreignPointerCursor,
        activeLeft,
        finalLeft: dialog.style.left,
        finalCursor: dialog.style.cursor,
      };
    });

    expect(result.foreignPointerCursor).toBe("");
    expect(result.activeLeft).not.toBe("");
    expect(result.finalLeft).toBe(result.activeLeft);
    expect(result.finalCursor).toBe("");
  });

  test("origin-grid cancellation never commits", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const origin = document.createElement("fig-origin-grid");
      origin.setAttribute("value", "50% 50%");
      document.body.append(origin);
      await new Promise(requestAnimationFrame);
      const grid = origin.querySelector(".origin-grid") as HTMLElement;
      const rect = grid.getBoundingClientRect();
      let inputs = 0;
      let changes = 0;
      origin.addEventListener("input", () => inputs++);
      origin.addEventListener("change", () => changes++);
      const pointer = (type: string, x: number, y: number) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 31,
          button: 0,
          clientX: x,
          clientY: y,
        });
      grid.dispatchEvent(
        pointer("pointerdown", rect.left + 10, rect.top + 10),
      );
      grid.dispatchEvent(
        pointer("pointermove", rect.right - 10, rect.bottom - 10),
      );
      const beforeCancel = { inputs, changes };
      grid.dispatchEvent(
        pointer("pointercancel", rect.right - 10, rect.bottom - 10),
      );
      grid.dispatchEvent(
        pointer("pointerup", rect.right - 10, rect.bottom - 10),
      );
      return {
        beforeCancel,
        afterCancel: { inputs, changes },
        dragging: grid.classList.contains("is-dragging"),
      };
    });

    expect(result.beforeCancel.inputs).toBeGreaterThan(0);
    expect(result.beforeCancel.changes).toBe(0);
    expect(result.afterCancel).toEqual(result.beforeCancel);
    expect(result.dragging).toBe(false);
  });
});
