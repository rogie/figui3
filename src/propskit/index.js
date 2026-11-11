/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

import {
  flattenPropsKitUpdates,
  resolvePropsKitValues,
} from "./config.js";
import { mountPropsKitPanel } from "./renderer.js";
import { PropsKitStore } from "./store.js";

let nextPropsKitId = 0;
const warnedUpdates = new Set();

function warnInvalidUpdate(path, reason) {
  const key = `${path}:${reason}`;
  if (warnedUpdates.has(key)) return;
  warnedUpdates.add(key);
  console.warn(`[propskit] Ignored update at "${path}": ${reason}.`);
}

export function figCreateProps(name, config, options = {}) {
  const panelName = String(name ?? "").trim();
  const id = options.id ?? `propskit-${++nextPropsKitId}`;
  const panel = PropsKitStore.register(id, panelName, config);
  let destroyed = false;
  const subscriptions = new Set();

  const getValues = () =>
    resolvePropsKitValues(panel.config, PropsKitStore.getValues(id));

  const stopInteractions = PropsKitStore.subscribe(id, (update) => {
    if (!update.phase || !update.records?.length) return;
    const callback =
      update.phase === "input" ? options.onInput : options.onChange;
    if (!callback) return;
    for (const record of update.records) {
      callback(record.path, record.value, {
        ...record,
        panelId: id,
        sourceEvent: update.sourceEvent,
      });
    }
  });

  const controller = {
    id,
    get values() {
      return getValues();
    },
    getValues,
    setValue(path, value) {
      if (!destroyed) PropsKitStore.updateValue(id, path, value);
    },
    setValues(values) {
      if (destroyed) return;
      PropsKitStore.updateValues(
        id,
        flattenPropsKitUpdates(
          panel.compiled,
          values,
          warnInvalidUpdate,
        ),
      );
    },
    resetValues() {
      if (!destroyed) PropsKitStore.reset(id);
    },
    subscribe(listener, immediateOrOptions = true) {
      if (destroyed) return () => {};
      const changesOnly =
        typeof immediateOrOptions === "object" &&
        immediateOrOptions.mode === "changes";
      const immediate =
        typeof immediateOrOptions === "boolean"
          ? immediateOrOptions
          : (immediateOrOptions.immediate ?? false);
      const stop = PropsKitStore.subscribe(id, (update) => {
        if (changesOnly) {
          if (update.records?.length) listener(update.records);
        } else {
          listener(getValues());
        }
      });
      const unsubscribe = () => {
        stop();
        subscriptions.delete(unsubscribe);
      };
      subscriptions.add(unsubscribe);
      if (immediate) {
        if (changesOnly) {
          const records = Object.entries(PropsKitStore.getValues(id)).map(
            ([path, value]) => ({
              path,
              value,
              previousValue: undefined,
            }),
          );
          if (records.length) listener(records);
        } else {
          listener(getValues());
        }
      }
      return unsubscribe;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      subscriptions.forEach((unsubscribe) => unsubscribe());
      stopInteractions();
      PropsKitStore.unregister(id);
    },
  };
  panel.controller = controller;
  return controller;
}

export function figCreatePropsRoot(options = {}) {
  if (typeof document === "undefined") {
    throw new Error("figCreatePropsRoot() requires a browser document.");
  }
  const target =
    typeof options.target === "string"
      ? document.querySelector(options.target)
      : options.target ?? document.body;
  if (!(target instanceof HTMLElement)) {
    throw new Error("figCreatePropsRoot() requires a valid target.");
  }
  const root = document.createElement("div");
  root.className = "propskit-root";
  if (options.id) root.id = options.id;
  target.append(root);

  const views = new Map();
  let destroyed = false;
  const includesPanel = (panelId) =>
    !options.panelIds || options.panelIds.includes(panelId);
  const mountPanel = (panel) => {
    if (destroyed || !includesPanel(panel.id) || views.has(panel.id)) return;
    views.set(panel.id, mountPropsKitPanel(panel, root));
  };
  const unmountPanel = (panelId) => {
    const view = views.get(panelId);
    if (!view) return;
    view.destroy();
    views.delete(panelId);
  };
  const unsubscribe = PropsKitStore.subscribeGlobal((update) => {
    if (destroyed) return;
    if (update.kind === "registered") {
      mountPanel(update.panel);
    } else if (update.kind === "unregistered") {
      unmountPanel(update.panel.id);
    }
  });
  const panels = PropsKitStore.getPanels();
  panels.forEach(mountPanel);
  if (options.panelIds) {
    const registeredIds = new Set(panels.map((panel) => panel.id));
    for (const panelId of options.panelIds) {
      if (!registeredIds.has(panelId)) {
        warnInvalidUpdate(panelId, "is not a registered panel id");
      }
    }
  }

  return {
    element: root,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      views.forEach((view) => view.destroy());
      views.clear();
      root.remove();
    },
  };
}

export { PROPSKIT_CONTROL_TYPES } from "./config.js";
