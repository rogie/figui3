import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("internal state machine controller", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("serializes reentrant events and runs one effect per transition", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateStateMachine } = await import(
        "/src/shared/state-machine.js"
      );
      const transitions: string[] = [];
      const machine = figCreateStateMachine({
        initialState: "closed",
        transition(state: string, event: { type: string }) {
          if (state === "closed" && event.type === "OPEN") return "opening";
          if (state === "opening" && event.type === "OPENED") return "open";
          return state;
        },
        effect({
          from,
          to,
          machine: current,
        }: {
          from: string;
          to: string;
          machine: { dispatch(event: { type: string }): void };
        }) {
          transitions.push(`${from}->${to}`);
          if (to === "opening") current.dispatch({ type: "OPENED" });
        },
      });

      machine.dispatch({ type: "OPEN" });
      return { state: machine.state, transitions, generation: machine.generation };
    });

    expect(result).toEqual({
      state: "open",
      transitions: ["closed->opening", "opening->open"],
      generation: 2,
    });
  });

  test("invalid events are no-ops", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { figCreateStateMachine } = await import(
        "/src/shared/state-machine.js"
      );
      let effects = 0;
      const machine = figCreateStateMachine({
        initialState: "idle",
        transition: (state: string, event: { type: string }) =>
          event.type === "START" ? "active" : state,
        effect: () => effects++,
      });
      machine.dispatch({ type: "UNKNOWN" });
      return { state: machine.state, effects, generation: machine.generation };
    });

    expect(result).toEqual({ state: "idle", effects: 0, generation: 0 });
  });

  test("generation tokens reject stale delayed work", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { figCreateStateMachine } = await import(
        "/src/shared/state-machine.js"
      );
      const machine = figCreateStateMachine({
        initialState: "closed",
        transition(state: string, event: { type: string }) {
          if (event.type === "OPEN") return "open";
          if (event.type === "CLOSE") return "closed";
          return state;
        },
      });
      machine.dispatch({ type: "OPEN" });
      const token = machine.capture();
      machine.dispatch({ type: "CLOSE" });
      return {
        stale: machine.isCurrent(token),
        current: machine.isCurrent(machine.capture()),
      };
    });

    expect(result).toEqual({ stale: false, current: true });
  });

  test("dispose accepts one terminal transition and blocks future events", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateStateMachine } = await import(
        "/src/shared/state-machine.js"
      );
      const transitions: string[] = [];
      const machine = figCreateStateMachine({
        initialState: "open",
        transition(state: string, event: { type: string }) {
          if (event.type === "DISPOSE") return "closed";
          if (event.type === "OPEN") return "open";
          return state;
        },
        effect: ({ from, to }: { from: string; to: string }) =>
          transitions.push(`${from}->${to}`),
      });
      machine.dispose();
      const generation = machine.generation;
      machine.dispatch({ type: "OPEN" });
      machine.dispose();
      return {
        state: machine.state,
        disposed: machine.disposed,
        transitions,
        generation,
        finalGeneration: machine.generation,
      };
    });

    expect(result).toEqual({
      state: "closed",
      disposed: true,
      transitions: ["open->closed"],
      generation: 2,
      finalGeneration: 2,
    });
  });
});
