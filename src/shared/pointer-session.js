/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

/**
 * Own one pointer gesture and all listeners created for it.
 *
 * State flow:
 * idle -> pending -> active -> committing -> idle
 *                         \-> cancelled -> idle
 *             \-------------> cancelled -> idle
 */
function figCreatePointerSession({
  threshold = 0,
  listenerTarget = globalThis,
  capture = false,
  cancelOnBlur = true,
  onActivate = () => {},
  onMove = () => {},
  onCommit = () => {},
  onCancel = () => {},
  onFinish = () => {},
} = {}) {
  let state = "idle";
  let pointerId = null;
  let startEvent = null;
  let controller = null;
  let captureTarget = null;
  let data = null;
  let didActivate = false;
  const ownedListeners = [];

  const context = (event, reason) => ({
    event,
    reason,
    state,
    pointerId,
    startEvent,
    data,
    signal: controller?.signal ?? null,
    active: didActivate,
    session,
  });

  const owns = (event) =>
    pointerId !== null &&
    (event?.pointerId === undefined || event.pointerId === pointerId);

  const releaseCapture = () => {
    if (
      captureTarget &&
      pointerId !== null &&
      captureTarget.hasPointerCapture?.(pointerId)
    ) {
      try {
        captureTarget.releasePointerCapture(pointerId);
      } catch {}
    }
  };

  const clearListeners = () => {
    controller?.abort();
    for (const owned of ownedListeners.splice(0)) {
      owned.target.removeEventListener(
        owned.type,
        owned.listener,
        owned.options,
      );
    }
  };

  const reset = () => {
    clearListeners();
    releaseCapture();
    controller = null;
    captureTarget = null;
    pointerId = null;
    startEvent = null;
    data = null;
    didActivate = false;
    state = "idle";
  };

  const finish = (terminalState, event, reason) => {
    if (
      (state !== "pending" && state !== "active") ||
      !owns(event)
    ) {
      return false;
    }
    state = terminalState;
    const details = context(event, reason);
    clearListeners();
    try {
      if (terminalState === "committing") onCommit(details);
      else onCancel(details);
    } finally {
      try {
        onFinish(details);
      } finally {
        reset();
      }
    }
    return true;
  };

  const activate = (event) => {
    if (state !== "pending") return;
    state = "active";
    didActivate = true;
    if (capture && captureTarget?.setPointerCapture && pointerId !== null) {
      try {
        captureTarget.setPointerCapture(pointerId);
      } catch {}
    }
    onActivate(context(event));
  };

  const move = (event) => {
    if (!owns(event) || (state !== "pending" && state !== "active")) {
      return false;
    }
    if (state === "pending") {
      const dx = (event.clientX ?? 0) - (startEvent?.clientX ?? 0);
      const dy = (event.clientY ?? 0) - (startEvent?.clientY ?? 0);
      if (Math.hypot(dx, dy) < Math.max(0, Number(threshold) || 0)) {
        return false;
      }
      activate(event);
    }
    onMove(context(event));
    return true;
  };

  const commit = (event, reason = "pointerup") =>
    finish("committing", event, reason);
  const cancel = (reason = "cancelled", event) =>
    finish("cancelled", event, reason);

  const listen = (target, type, listener, options = {}) => {
    if (!controller || state === "idle") return false;
    target.addEventListener(type, listener, {
      ...options,
      signal: controller.signal,
    });
    ownedListeners.push({ target, type, listener, options });
    return true;
  };

  const start = (
    event,
    {
      target = listenerTarget,
      captureTarget: nextCaptureTarget = event?.currentTarget,
      data: nextData = null,
      listenerOptions = {},
    } = {},
  ) => {
    if (state !== "idle") cancel("replaced");
    if (event?.pointerId === undefined || event?.pointerId === null) {
      return false;
    }

    state = "pending";
    pointerId = event.pointerId;
    startEvent = event;
    data = nextData;
    captureTarget = nextCaptureTarget;
    controller = new AbortController();

    listen(target, "pointermove", move, listenerOptions);
    listen(target, "pointerup", (nextEvent) => commit(nextEvent), listenerOptions);
    listen(
      target,
      "pointercancel",
      (nextEvent) => cancel("pointercancel", nextEvent),
      listenerOptions,
    );
    if (cancelOnBlur) {
      listen(globalThis, "blur", (nextEvent) => cancel("blur", nextEvent));
    }
    if (captureTarget) {
      listen(
        captureTarget,
        "lostpointercapture",
        (nextEvent) => cancel("lostpointercapture", nextEvent),
      );
    }
    if ((Number(threshold) || 0) <= 0) activate(event);
    return true;
  };

  const session = {
    get state() {
      return state;
    },
    get pointerId() {
      return pointerId;
    },
    get active() {
      return didActivate;
    },
    get signal() {
      return controller?.signal ?? null;
    },
    start,
    move,
    commit,
    cancel,
    abort(reason = "abort") {
      return cancel(reason);
    },
    listen,
  };

  return session;
}

export { figCreatePointerSession };
