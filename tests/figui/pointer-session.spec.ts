import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("internal pointer session", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("tracks threshold, pointer identity, and one commit", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { figCreatePointerSession } = await import(
        "/src/shared/pointer-session.js"
      );
      const states: string[] = [];
      let moves = 0;
      let commits = 0;
      let cancels = 0;
      const session = figCreatePointerSession({
        threshold: 5,
        listenerTarget: window,
        onActivate: ({ state }: { state: string }) => states.push(state),
        onMove: () => moves++,
        onCommit: ({ state }: { state: string }) => {
          states.push(state);
          commits++;
        },
        onCancel: () => cancels++,
      });
      const pointer = (
        type: string,
        pointerId: number,
        clientX: number,
        clientY: number,
      ) =>
        new PointerEvent(type, {
          pointerId,
          clientX,
          clientY,
          bubbles: true,
        });

      session.start(pointer("pointerdown", 7, 10, 10));
      const pending = session.state;
      window.dispatchEvent(pointer("pointermove", 8, 30, 30));
      window.dispatchEvent(pointer("pointermove", 7, 12, 13));
      const belowThreshold = { state: session.state, moves };
      window.dispatchEvent(pointer("pointermove", 7, 16, 10));
      window.dispatchEvent(pointer("pointerup", 8, 16, 10));
      window.dispatchEvent(pointer("pointerup", 7, 16, 10));
      window.dispatchEvent(pointer("pointerup", 7, 16, 10));

      return {
        pending,
        belowThreshold,
        finalState: session.state,
        states,
        moves,
        commits,
        cancels,
      };
    });

    expect(result).toEqual({
      pending: "pending",
      belowThreshold: { state: "pending", moves: 0 },
      finalState: "idle",
      states: ["active", "committing"],
      moves: 1,
      commits: 1,
      cancels: 0,
    });
  });

  test("abort owns listeners and cancellation never commits", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { figCreatePointerSession } = await import(
        "/src/shared/pointer-session.js"
      );
      const active = new Set<EventListenerOrEventListenerObject>();
      const add = window.addEventListener;
      const remove = window.removeEventListener;
      window.addEventListener = function (type, listener, options) {
        if (type === "pointermove") active.add(listener!);
        return add.call(this, type, listener, options);
      };
      window.removeEventListener = function (type, listener, options) {
        if (type === "pointermove") active.delete(listener!);
        return remove.call(this, type, listener, options);
      };

      try {
        const terminal: string[] = [];
        const session = figCreatePointerSession({
          listenerTarget: window,
          onCommit: () => terminal.push("commit"),
          onCancel: ({ state }: { state: string }) => terminal.push(state),
        });
        session.start(new PointerEvent("pointerdown", { pointerId: 11 }));
        const during = active.size;
        session.abort("disconnect");
        window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 11 }));
        return {
          during,
          after: active.size,
          state: session.state,
          terminal,
        };
      } finally {
        window.addEventListener = add;
        window.removeEventListener = remove;
      }
    });

    expect(result.during).toBeGreaterThan(0);
    expect(result).toMatchObject({
      after: 0,
      state: "idle",
      terminal: ["cancelled"],
    });
  });
});
