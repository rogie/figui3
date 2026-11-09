/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

/**
 * Create a small synchronous state controller.
 *
 * Transitions are serialized, including events dispatched by an effect.
 * Every accepted transition advances the generation so delayed work can
 * cheaply prove that it still belongs to the current state.
 */
function figCreateStateMachine({
  initialState,
  transition,
  effect = () => {},
}) {
  if (typeof transition !== "function") {
    throw new TypeError("figCreateStateMachine requires a transition function");
  }

  let state = initialState;
  let generation = 0;
  let disposed = false;
  let dispatching = false;
  const queue = [];

  const machine = {
    get state() {
      return state;
    },

    get generation() {
      return generation;
    },

    get disposed() {
      return disposed;
    },

    dispatch(event) {
      if (disposed) return state;
      queue.push(event);
      if (dispatching) return state;

      dispatching = true;
      try {
        while (queue.length && !disposed) {
          const nextEvent = queue.shift();
          const nextState = transition(state, nextEvent);
          if (
            nextState === undefined ||
            nextState === null ||
            Object.is(nextState, state)
          ) {
            continue;
          }

          const previousState = state;
          state = nextState;
          generation += 1;
          effect({
            event: nextEvent,
            from: previousState,
            to: nextState,
            generation,
            machine,
          });
        }
      } finally {
        dispatching = false;
      }
      return state;
    },

    capture() {
      return { generation, state };
    },

    isCurrent(token, expectedState = token?.state) {
      return (
        !disposed &&
        token?.generation === generation &&
        (expectedState === undefined || Object.is(state, expectedState))
      );
    },

    dispose(event = { type: "DISPOSE" }) {
      if (disposed) return;
      machine.dispatch(event);
      disposed = true;
      generation += 1;
      queue.length = 0;
    },
  };

  return machine;
}

export { figCreateStateMachine };
