import {
  parseAttributeTargets,
  applyAttributeMutation,
  applyChooserContentMutation,
  applyChooserMaxSizeMutation,
  applyFieldLabelMutation,
  applyPrependSlotMutation,
  getChooserContentMode,
  getPrependSlotMode,
  type ChooserContentMode,
  type PrependSlotMode,
} from "./attributeParser";

const FIELD_PREFIX = "f.";
const SPECIAL_PREFIX = "_";
const REMOVE_SENTINEL = "!";
const URL_EXCLUDED_ATTRS = new Set(["src"]);

export function diffFromDefault(
  currentMarkup: string,
  defaultMarkup: string,
): Record<string, string> {
  const currentTargets = parseAttributeTargets(currentMarkup);
  const defaultTargets = parseAttributeTargets(defaultMarkup);
  const params: Record<string, string> = {};

  for (let i = 0; i < currentTargets.length; i++) {
    const cur = currentTargets[i];
    const def = defaultTargets[i];
    if (!cur || !def) continue;

    const idx = currentTargets.length > 1 ? `${i}.` : "";

    for (const [key, val] of Object.entries(cur.controlAttributes)) {
      if (!URL_EXCLUDED_ATTRS.has(key) && def.controlAttributes[key] !== val) {
        params[`${idx}${key}`] = val;
      }
    }
    for (const key of Object.keys(def.controlAttributes)) {
      if (!URL_EXCLUDED_ATTRS.has(key) && !(key in cur.controlAttributes)) {
        params[`${idx}${key}`] = REMOVE_SENTINEL;
      }
    }

    for (const [key, val] of Object.entries(cur.fieldAttributes)) {
      if (def.fieldAttributes[key] !== val) {
        params[`${idx}${FIELD_PREFIX}${key}`] = val;
      }
    }
    for (const key of Object.keys(def.fieldAttributes)) {
      if (!(key in cur.fieldAttributes)) {
        params[`${idx}${FIELD_PREFIX}${key}`] = REMOVE_SENTINEL;
      }
    }

    if (cur.controlTag === "fig-chooser") {
      const curContent = getChooserContentMode(currentMarkup, i);
      const defContent = getChooserContentMode(defaultMarkup, i);
      if (curContent !== defContent) {
        params[`${idx}${SPECIAL_PREFIX}content`] = curContent;
      }
    }

    if (
      cur.controlTag === "fig-input-text" ||
      cur.controlTag === "fig-input-number"
    ) {
      const curPrepend = getPrependSlotMode(currentMarkup, i);
      const defPrepend = getPrependSlotMode(defaultMarkup, i);
      if (curPrepend !== defPrepend) {
        params[`${idx}${SPECIAL_PREFIX}prepend`] = curPrepend;
      }
    }

    if (cur.hasLabel !== def.hasLabel) {
      params[`${idx}${SPECIAL_PREFIX}label`] = cur.hasLabel ? "1" : "0";
    }
  }

  return params;
}

export function serializeToURL(params: Record<string, string>): void {
  const search = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    search.set(key, val);
  }
  const searchStr = search.toString();
  const hashPart = location.hash;
  const path = location.pathname;
  const next = searchStr
    ? `${path}?${searchStr}${hashPart}`
    : `${path}${hashPart}`;
  history.replaceState(null, "", next);
}

export function readFromURL(): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(location.search).forEach((val, key) => {
    params[key] = val;
  });
  return params;
}

export function clearURLParams(): void {
  const next = `${location.pathname}${location.hash}`;
  history.replaceState(null, "", next);
}

export function hasURLParams(): boolean {
  return location.search.length > 1;
}

export function applyParamsToMarkup(
  defaultMarkup: string,
  params: Record<string, string>,
): string {
  let markup = defaultMarkup;
  const defaultTargets = parseAttributeTargets(defaultMarkup);
  const singleTarget = defaultTargets.length <= 1;

  const specialEntries: { idx: number; key: string; val: string }[] = [];
  const fieldEntries: { idx: number; attr: string; val: string }[] = [];
  const controlEntries: { idx: number; attr: string; val: string }[] = [];

  for (const [key, val] of Object.entries(params)) {
    let idxStr = "";
    let rest = key;

    if (!singleTarget && /^\d+\./.test(key)) {
      const dotPos = key.indexOf(".");
      idxStr = key.slice(0, dotPos);
      rest = key.slice(dotPos + 1);
    }

    const fieldIndex = idxStr ? parseInt(idxStr) : 0;

    if (rest.startsWith(SPECIAL_PREFIX)) {
      specialEntries.push({ idx: fieldIndex, key: rest, val });
    } else if (rest.startsWith(FIELD_PREFIX)) {
      fieldEntries.push({ idx: fieldIndex, attr: rest.slice(FIELD_PREFIX.length), val });
    } else {
      controlEntries.push({ idx: fieldIndex, attr: rest, val });
    }
  }

  for (const { idx, key, val } of specialEntries) {
    if (key === "_content" && val) {
      markup = applyChooserContentMutation(markup, idx, val as ChooserContentMode);
    } else if (key === "_prepend" && val) {
      markup = applyPrependSlotMutation(markup, idx, val as PrependSlotMode);
    } else if (key === "_label") {
      markup = applyFieldLabelMutation(markup, {
        fieldIndex: idx,
        enabled: val !== "0",
        text: "Label",
      });
    }
  }

  for (const { idx, attr, val } of controlEntries) {
    if (attr === "style") {
      markup = applyChooserMaxSizeMutation(markup, idx, val);
    } else {
      markup = applyAttributeMutation(markup, {
        fieldIndex: idx,
        target: "control",
        name: attr,
        value: val === REMOVE_SENTINEL ? null : val,
      });
    }
  }

  for (const { idx, attr, val } of fieldEntries) {
    markup = applyAttributeMutation(markup, {
      fieldIndex: idx,
      target: "field",
      name: attr,
      value: val === REMOVE_SENTINEL ? null : val,
    });
  }

  return markup;
}
