/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

import {
  clonePropsKitValue,
  compilePropsKitConfig,
  deepFreezePropsKitValue,
  normalizePropsKitValue,
  propsKitValuesEqual,
} from "./config.js";

const panels = new Map();
const globalListeners = new Set();
const warned = new Set();

function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[propskit] ${message}`);
}

function normalizeWrite(panel, path, value) {
  const node = panel.compiled.nodesByPath.get(path);
  if (!node || node.controlType === "action") {
    warnOnce(
      `unknown:${panel.id}:${path}`,
      `Ignored unknown control path "${path}" in panel "${panel.id}".`,
    );
    return null;
  }
  const normalized = normalizePropsKitValue(node, value);
  if (!normalized.valid) {
    warnOnce(
      `invalid:${panel.id}:${path}:${normalized.reason}`,
      `Ignored "${path}" update: ${normalized.reason}.`,
    );
    return null;
  }
  if (normalized.warning) {
    warnOnce(
      `normalized:${panel.id}:${path}:${normalized.warning}`,
      `Normalized "${path}": ${normalized.warning}.`,
    );
  }
  return clonePropsKitValue(normalized.value);
}

function notifyGlobal(update) {
  globalListeners.forEach((listener) => listener(update));
}

function notifyPanel(panel, update) {
  panel.listeners.forEach((listener) => listener(update));
}

export const PropsKitStore = {
  register(id, name, config) {
    if (panels.has(id)) {
      throw new Error(`[propskit] Duplicate kit id "${id}".`);
    }
    const immutableConfig = deepFreezePropsKitValue(
      clonePropsKitValue(config),
    );
    const compiled = compilePropsKitConfig(immutableConfig);
    const panel = {
      id,
      name,
      config: immutableConfig,
      compiled,
      values: clonePropsKitValue(compiled.defaults),
      listeners: new Set(),
    };
    panels.set(id, panel);
    notifyGlobal({ kind: "registered", panel });
    return panel;
  },

  unregister(id) {
    const panel = panels.get(id);
    if (!panel || !panels.delete(id)) return;
    notifyGlobal({ kind: "unregistered", panel });
  },

  getPanel(id) {
    return panels.get(id);
  },

  getPanels() {
    return [...panels.values()];
  },

  getValues(id) {
    return panels.get(id)?.values ?? {};
  },

  updateValue(id, path, value, phase, sourceEvent) {
    const panel = panels.get(id);
    if (!panel) return false;
    const nextValue = normalizeWrite(panel, path, value);
    if (nextValue === null) return false;
    const previousValue = panel.values[path];
    if (propsKitValuesEqual(previousValue, nextValue)) return true;
    panel.values = { ...panel.values, [path]: nextValue };
    notifyPanel(panel, {
      kind: "values",
      paths: [path],
      phase,
      sourceEvent,
      records: [
        {
          path,
          value: clonePropsKitValue(nextValue),
          previousValue: clonePropsKitValue(previousValue),
          ...(phase ? { phase } : {}),
        },
      ],
    });
    return true;
  },

  updateValues(id, updates) {
    const panel = panels.get(id);
    if (!panel) return;
    const records = [];
    let nextValues = panel.values;
    for (const [path, value] of Object.entries(updates)) {
      const nextValue = normalizeWrite(panel, path, value);
      if (nextValue === null) continue;
      const previousValue = panel.values[path];
      if (propsKitValuesEqual(previousValue, nextValue)) continue;
      if (nextValues === panel.values) nextValues = { ...panel.values };
      nextValues[path] = nextValue;
      records.push({
        path,
        value: clonePropsKitValue(nextValue),
        previousValue: clonePropsKitValue(previousValue),
      });
    }
    if (!records.length) return;
    panel.values = nextValues;
    notifyPanel(panel, {
      kind: "values",
      paths: records.map((record) => record.path),
      records,
    });
  },

  reset(id) {
    const panel = panels.get(id);
    if (!panel) return;
    this.updateValues(id, clonePropsKitValue(panel.compiled.defaults));
  },

  subscribe(id, listener) {
    const panel = panels.get(id);
    if (!panel) return () => {};
    panel.listeners.add(listener);
    return () => panel.listeners.delete(listener);
  },

  subscribeGlobal(listener) {
    globalListeners.add(listener);
    return () => globalListeners.delete(listener);
  },
};
