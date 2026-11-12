/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

import { isRecord } from "./config.js";
import { PropsKitStore } from "./store.js";

const warnedRequirements = new Set();

function warnMissingRequirement(node) {
  if (node.definition.edit !== "picker") return;
  const required = {
    gradient: "fig-popup-gradient",
    palette: "fig-popup-palette",
    easing: "fig-popup-easing",
  }[node.controlType];
  if (!required || customElements.get(required) || warnedRequirements.has(required)) {
    return;
  }
  warnedRequirements.add(required);
  console.warn(
    `[propskit] "${node.path}" uses edit="picker" and requires fig-editor.js (${required}).`,
  );
}

function attributeName(name) {
  return name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function setAttributeValue(element, name, value) {
  const attribute = attributeName(name);
  if (value === undefined || value === null || value === false) {
    element.removeAttribute(attribute);
    return;
  }
  if (value === true) {
    element.setAttribute(attribute, "");
    return;
  }
  const serialized =
    Array.isArray(value)
      ? value
          .map((entry) =>
            isRecord(entry) ? entry.label ?? entry.value ?? "" : entry,
          )
          .join(",")
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  element.setAttribute(attribute, serialized);
}

function applyAttributes(element, attributes, omitted = []) {
  const skipped = new Set(omitted);
  for (const [name, value] of Object.entries(attributes)) {
    if (!skipped.has(name)) setAttributeValue(element, name, value);
  }
}

function mediaTag(type) {
  return type === "video" ? "fig-video" : "fig-image";
}

function mediaAccepts(type, authored) {
  return authored || `${type}/*`;
}

function mediaSources(value) {
  if (Array.isArray(value)) return value.map(String);
  return value ? [String(value)] : [];
}

function mediaOptionLabel(value) {
  if (!value) return "Media";
  if (value.startsWith("blob:") || value.startsWith("data:")) {
    return "Uploaded media";
  }
  const name = value.split(/[?#]/)[0].split("/").filter(Boolean).pop();
  try {
    return name ? decodeURIComponent(name) : "Media";
  } catch {
    return name || "Media";
  }
}

function applyMediaAttributes(media, node, selectable = false) {
  const definition = node.definition;
  media.setAttribute(
    "accepts",
    mediaAccepts(node.controlType, definition.accepts),
  );
  for (const attribute of [
    "aspectRatio",
    "poster",
    "autoplay",
    "loop",
    "muted",
  ]) {
    setAttributeValue(media, attribute, definition[attribute]);
  }
  setAttributeValue(media, "fit", definition.fit ?? "cover");
  media.setAttribute("checkerboard", "");
  if (!selectable) {
    setAttributeValue(media, "controls", definition.controls);
  }
}

function renderAudioFileControl(host, node, sources, maxItems) {
  const definition = node.definition;
  const appendInput = (src, index, label) => {
    const input = document.createElement("fig-input-file");
    input.dataset.propskitMediaAdd = node.path;
    if (Number.isInteger(index)) {
      input.dataset.propskitMediaIndex = String(index);
    }
    input.setAttribute("accepts", mediaAccepts("audio", definition.accepts));
    input.setAttribute("full", "");
    input.setAttribute("preview", "true");
    if (label) input.setAttribute("label", label);
    if (src) {
      input.setAttribute("url", src);
      input.setAttribute("filename", mediaOptionLabel(src));
    }
    host.append(input);
  };

  sources.forEach((src, index) => {
    appendInput(src, index, node.multiple ? "Replace audio" : undefined);
  });

  if (node.multiple && sources.length < maxItems) {
    appendInput("", undefined, "Add audio");
  } else if (!node.multiple && sources.length === 0) {
    appendInput("", undefined, "Upload audio");
  }
}

function renderMediaControl(host, node, value, uploadedOptions = []) {
  const multiple = node.multiple;
  const sources = mediaSources(value);
  const maxItems = node.maxItems ?? Infinity;
  host.replaceChildren();
  host.className = "propskit-media-control";
  host.dataset.multiple = String(multiple);

  if (node.controlType === "audio") {
    renderAudioFileControl(host, node, sources, maxItems);
    return;
  }

  const selected = typeof value === "string" ? value : "";
  const options = [];
  const optionValues = new Set();
  for (const option of [...uploadedOptions, ...node.mediaOptions]) {
    if (optionValues.has(option.value)) continue;
    optionValues.add(option.value);
    options.push(option);
  }
  if (selected && !optionValues.has(selected)) {
    options.push({ value: selected, label: mediaOptionLabel(selected) });
  }

  const tag = mediaTag(node.controlType);
  const chooser = document.createElement("fig-chooser");
  chooser.className = "propskit-media-chooser";
  chooser.dataset.propskitMediaChoice = node.path;
  chooser.setAttribute(
    "choice-element",
    `${tag}:not([data-propskit-media-upload])`,
  );
  chooser.setAttribute("layout", "grid");
  chooser.setAttribute("columns", options.length === 0 ? "1" : "2");
  chooser.setAttribute("overflow", "scrollbar");
  chooser.setAttribute("full", "");
  chooser.setAttribute("value", selected);

  options.forEach((option) => {
    const media = document.createElement(mediaTag(node.controlType));
    media.dataset.propskitMediaOption = node.path;
    media.dataset.propskitMediaValue = option.value;
    media.setAttribute("value", option.value);
    media.setAttribute("aria-label", option.label);
    media.setAttribute("src", option.value);
    media.setAttribute("upload", "icon");
    media.setAttribute("full", "");
    if (option.value === selected) media.setAttribute("selected", "");
    applyMediaAttributes(media, node, true);
    chooser.append(media);
  });

  const upload = document.createElement(tag);
  upload.dataset.propskitMediaAdd = node.path;
  upload.dataset.propskitMediaUpload = "";
  upload.setAttribute("upload", "icon");
  upload.setAttribute("multiple", "");
  upload.setAttribute("label", `Upload ${node.controlType}`);
  upload.setAttribute("aria-label", `Upload ${node.controlType}`);
  upload.setAttribute("full", "");
  applyMediaAttributes(upload, node, true);
  chooser.prepend(upload);
  host.append(chooser);
}

function createControl(node, value, uploadedOptions) {
  const definition = node.definition;
  let element;
  switch (node.controlType) {
    case "number": {
      const control = definition.control ?? "slider";
      element = document.createElement(
        control === "number" ? "fig-input-number" : "fig-slider",
      );
      if (control === "slider") {
        element.setAttribute(
          "type",
          definition.stepper === true
            ? "stepper"
            : definition.variant ?? "range",
        );
        element.setAttribute("text", String(definition.text ?? true));
      } else if (definition.stepper === false) {
        element.setAttribute("steppers", "false");
      }
      applyAttributes(element, node.attributes, ["variant", "stepper"]);
      element.setAttribute("full", "");
      break;
    }
    case "text":
      element = document.createElement("fig-input-text");
      applyAttributes(element, node.attributes);
      element.setAttribute("full", "");
      break;
    case "switch":
      element = document.createElement("fig-switch");
      applyAttributes(element, node.attributes);
      break;
    case "color":
      element = document.createElement("fig-input-color");
      applyAttributes(element, node.attributes, ["text"]);
      element.setAttribute("full", "");
      break;
    case "gradient":
      element = document.createElement("fig-input-gradient");
      applyAttributes(element, node.attributes);
      element.setAttribute("full", "");
      break;
    case "palette":
      element = document.createElement("fig-input-palette");
      applyAttributes(element, node.attributes);
      element.setAttribute("full", "");
      break;
    case "options":
      element = document.createElement("fig-options");
      applyAttributes(element, node.attributes, ["options"]);
      element.options = definition.options;
      element.setAttribute("full", "");
      break;
    case "easing":
      element = document.createElement("fig-easing-curve");
      applyAttributes(element, node.attributes);
      break;
    case "rotate":
      element = document.createElement("fig-3d-rotate");
      applyAttributes(element, node.attributes);
      break;
    case "point":
      element = document.createElement("fig-origin-grid");
      applyAttributes(element, node.attributes);
      break;
    case "joystick":
      element = document.createElement("fig-joystick");
      applyAttributes(element, node.attributes);
      break;
    case "file":
      element = document.createElement("fig-input-file");
      applyAttributes(element, node.attributes, ["variant"]);
      if (definition.variant && definition.variant !== "file") {
        element.setAttribute("accepts", `${definition.variant}/*`);
        element.setAttribute("preview", "");
      }
      element.setAttribute("full", "");
      break;
    case "image":
    case "video":
    case "audio":
      element = document.createElement("div");
      renderMediaControl(element, node, value, uploadedOptions);
      break;
    case "action":
      element = document.createElement("fig-button");
      applyAttributes(element, node.attributes);
      element.textContent = definition.label ?? node.label;
      element.dataset.propskitAction = node.path;
      break;
    default:
      throw new Error(
        `[propskit] No renderer for control type "${node.controlType}".`,
      );
  }
  warnMissingRequirement(node);
  element.dataset.propskitPath = node.path;
  element.setAttribute("slot", "input");
  return element;
}

function syncControl(element, node, value, uploadedOptions) {
  if (node.controlType === "action") return;
  if (["image", "video", "audio"].includes(node.controlType)) {
    renderMediaControl(element, node, value, uploadedOptions);
    return;
  }
  if (node.controlType === "switch") {
    element.toggleAttribute("checked", Boolean(value));
    element.setAttribute("default-checked", String(Boolean(node.defaultValue)));
    return;
  }
  if (node.controlType === "joystick") {
    if (isRecord(value)) {
      const scale = node.joystickUnitScale;
      element.setAttribute(
        "value",
        `${(Number(value.x) / scale) * 100}% ${(Number(value.y) / scale) * 100}%`,
      );
    } else {
      setAttributeValue(element, "value", value);
    }
    return;
  }
  if (node.controlType === "point") {
    if (isRecord(value)) {
      element.setAttribute("value", `${value.x}% ${value.y}%`);
    } else {
      setAttributeValue(element, "value", value);
    }
    return;
  }
  if (node.controlType === "file") {
    const fileValue = isRecord(value) ? value : {};
    setAttributeValue(element, "url", fileValue.url);
    setAttributeValue(element, "filename", fileValue.filename);
    const defaultValue = isRecord(node.defaultValue) ? node.defaultValue : {};
    setAttributeValue(element, "defaultUrl", defaultValue.url);
    setAttributeValue(element, "defaultFilename", defaultValue.filename);
    return;
  }
  setAttributeValue(element, "value", value);
  setAttributeValue(element, "default", node.defaultValue);
}

function valueFromEvent(event, node) {
  const host = event.target;
  const detail = event instanceof CustomEvent ? event.detail : undefined;
  if (node.controlType === "switch") {
    return Boolean(
      isRecord(detail) && "checked" in detail ? detail.checked : host.checked,
    );
  }
  if (node.controlType === "joystick") {
    if (isRecord(detail) && "x" in detail && "y" in detail) {
      return {
        x: Number(detail.x) * node.joystickUnitScale,
        y: Number(detail.y) * node.joystickUnitScale,
      };
    }
  }
  if (node.controlType === "point") {
    if (isRecord(detail) && "x" in detail && "y" in detail) {
      return {
        x: Number(detail.x),
        y: Number(detail.y),
      };
    }
  }
  if (node.controlType === "file") {
    const files = isRecord(detail) && detail.files
      ? Array.from(detail.files)
      : [];
    return {
      files,
      url: host.getAttribute("url") || "",
      filename: host.getAttribute("filename") || files[0]?.name || "",
    };
  }
  if (node.controlType === "number") {
    const value =
      isRecord(detail) && "value" in detail
        ? detail.value
        : detail !== undefined && !isRecord(detail)
          ? detail
          : host.value;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value !== "string" || value.trim() === "") return undefined;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }
  if (isRecord(detail) && "value" in detail) return detail.value;
  if (detail !== undefined && !isRecord(detail)) return detail;
  return host.value;
}

export function mountPropsKitPanel(panel, target) {
  const panelElement = panel.name
    ? document.createElement("fig-group")
    : null;
  if (panelElement) {
    panelElement.className = "propskit-panel";
    panelElement.setAttribute("name", panel.name);
    panelElement.setAttribute("open", "true");
    panelElement.setAttribute("compact", "");
  }
  const mountTarget = panelElement ?? document.createDocumentFragment();
  const eventTarget = panelElement ?? target;
  const controls = new Map();
  const nodesByPath = new Map();
  const syncing = new WeakSet();
  const objectUrls = new Set();
  const uploadedMediaOptions = new Map();

  const buildNodes = (nodes, parent) => {
    for (const node of nodes) {
      if (node.kind === "group") {
        const group = document.createElement("fig-group");
        group.setAttribute("name", node.label);
        if (node.collapsible) {
          group.setAttribute("collapsible", "");
          group.setAttribute("open", String(!node.collapsed));
        }
        if (node.compact) group.setAttribute("compact", "");
        buildNodes(node.children, group);
        parent.append(group);
        continue;
      }
      const property = document.createElement("fig-property");
      property.setAttribute("label", node.label);
      property.dataset.propskitPath = node.path;
      const value = panel.values[node.path] ?? node.defaultValue;
      const uploadedOptions = uploadedMediaOptions.get(node.path) ?? [];
      const control = createControl(node, value, uploadedOptions);
      controls.set(node.path, control);
      nodesByPath.set(node.path, node);
      syncing.add(control);
      try {
        syncControl(control, node, value, uploadedOptions);
      } finally {
        syncing.delete(control);
      }
      property.append(control);
      parent.append(property);
    }
  };
  buildNodes(panel.compiled.nodes, mountTarget);
  const elements = panelElement
    ? [panelElement]
    : Array.from(mountTarget.children);

  const eventBelongsToPanel = (event) => {
    if (panelElement) return true;
    if (!(event.target instanceof Node)) return false;
    return elements.some(
      (element) =>
        element === event.target || element.contains(event.target),
    );
  };

  const commitMediaSource = (event, node, path, index, src) => {
    const current = panel.values[path] ?? node.defaultValue;
    if (!node.multiple) {
      PropsKitStore.updateValue(panel.id, path, src, "change", event);
      return;
    }
    const next = Array.isArray(current) ? [...current] : [];
    if (src) {
      next[index] = src;
    } else if (index >= 0 && index < next.length) {
      next.splice(index, 1);
    }
    PropsKitStore.updateValue(panel.id, path, next, "change", event);
  };

  const handleMediaLoaded = (event, media, node, path) => {
    const index = Number(media.dataset.propskitMediaIndex);
    const file = event.detail?.file;
    const src = file instanceof Blob
      ? URL.createObjectURL(file)
      : event.detail?.src;
    if (!src) return;
    if (file instanceof Blob) objectUrls.add(src);
    commitMediaSource(event, node, path, index, src);
  };

  const handleMediaChange = (event, media, node, path) => {
    const index = Number(media.dataset.propskitMediaIndex);
    const detail = event instanceof CustomEvent ? event.detail : undefined;
    const src =
      (typeof detail?.src === "string" && detail.src) ||
      (typeof detail?.value === "string" && detail.value) ||
      media.getAttribute("src") ||
      "";
    commitMediaSource(event, node, path, index, src);
  };

  const handleMediaAdd = (event, input, path) => {
    const node = nodesByPath.get(path);
    if (!node) return;
    const replaceIndex = Number(input.dataset.propskitMediaIndex);
    if (event.detail?.cleared) {
      if (!node.multiple) {
        PropsKitStore.updateValue(panel.id, path, "", "change", event);
        return;
      }
      const current = panel.values[path];
      const next = Array.isArray(current) ? [...current] : [];
      if (Number.isInteger(replaceIndex) && replaceIndex >= 0) {
        next.splice(replaceIndex, 1);
      }
      PropsKitStore.updateValue(panel.id, path, next, "change", event);
      return;
    }
    const files = event.detail?.files?.length
      ? Array.from(event.detail.files)
      : event.detail?.file
        ? [event.detail.file]
        : [];
    if (!files?.length) return;
    const urls = files.map((file) => URL.createObjectURL(file));
    urls.forEach((url) => objectUrls.add(url));
    if (node.controlType === "image" || node.controlType === "video") {
      const uploaded = uploadedMediaOptions.get(path) ?? [];
      const knownValues = new Set(uploaded.map((option) => option.value));
      const added = [];
      urls.forEach((url, index) => {
        if (knownValues.has(url)) return;
        added.push({
          value: url,
          label: files[index]?.name || mediaOptionLabel(url),
        });
      });
      uploaded.unshift(...added);
      uploadedMediaOptions.set(path, uploaded);
      PropsKitStore.updateValue(panel.id, path, urls[0], "change", event);
      return;
    }
    if (!node.multiple) {
      PropsKitStore.updateValue(panel.id, path, urls[0], "change", event);
      return;
    }
    const current = panel.values[path];
    const next = Array.isArray(current) ? [...current] : [];
    if (
      input.dataset.propskitMediaIndex !== undefined &&
      Number.isInteger(replaceIndex) &&
      replaceIndex >= 0
    ) {
      next.splice(replaceIndex, 1, urls[0]);
    } else {
      next.push(...urls);
    }
    PropsKitStore.updateValue(panel.id, path, next, "change", event);
  };

  const handleMediaOptionChange = (event, media, path) => {
    if (event.type !== "change" || media.hasAttribute("src")) return;
    const node = nodesByPath.get(path);
    const value = media.dataset.propskitMediaValue;
    if (!node || !value) return;

    node.mediaOptions = node.mediaOptions.filter(
      (option) => option.value !== value,
    );
    const uploaded = uploadedMediaOptions.get(path);
    if (uploaded) {
      uploadedMediaOptions.set(
        path,
        uploaded.filter((option) => option.value !== value),
      );
    }

    const current = panel.values[path] ?? node.defaultValue;
    if (current === value) {
      PropsKitStore.updateValue(panel.id, path, "", "change", event);
    } else {
      media.remove();
    }
    if (objectUrls.delete(value)) URL.revokeObjectURL(value);
  };

  const handleInteractionEvent = (event) => {
    if (!eventBelongsToPanel(event)) return;
    const host = event.target;
    if (!(host instanceof HTMLElement) || syncing.has(host)) return;
    const mediaOptionPath = host.dataset.propskitMediaOption;
    if (mediaOptionPath) {
      handleMediaOptionChange(event, host, mediaOptionPath);
      return;
    }
    const mediaAddPath = host.dataset.propskitMediaAdd;
    if (mediaAddPath) {
      if (event.type === "change" || event.type === "loaded") {
        handleMediaAdd(event, host, mediaAddPath);
      }
      return;
    }
    const mediaChoicePath = host.dataset.propskitMediaChoice;
    if (mediaChoicePath) {
      if (event.type === "change") {
        const value =
          event instanceof CustomEvent ? event.detail : host.value;
        if (typeof value === "string") {
          PropsKitStore.updateValue(
            panel.id,
            mediaChoicePath,
            value,
            "change",
            event,
          );
        }
      }
      return;
    }
    const mediaPath = host.dataset.propskitMediaPath;
    if (mediaPath) {
      const mediaNode = nodesByPath.get(mediaPath);
      if (!mediaNode) return;
      if (event.type === "loaded") {
        handleMediaLoaded(event, host, mediaNode, mediaPath);
      } else if (event.type === "change") {
        handleMediaChange(event, host, mediaNode, mediaPath);
      }
      return;
    }
    if (event.type === "loaded") return;
    const path = host.dataset.propskitPath;
    const node = path ? nodesByPath.get(path) : undefined;
    if (!node) return;
    const value = valueFromEvent(event, node);
    if (value === undefined) return;
    PropsKitStore.updateValue(
      panel.id,
      path,
      value,
      event.type === "change" ? "change" : "input",
      event,
    );
  };

  const handleClick = (event) => {
    if (!eventBelongsToPanel(event)) return;
    const targetElement = event.target instanceof Element
      ? event.target.closest("[data-propskit-action]")
      : null;
    if (!(targetElement instanceof HTMLElement)) return;
    const actionPath = targetElement.dataset.propskitAction;
    if (!actionPath) return;
    const node = nodesByPath.get(actionPath);
    node?.definition.onClick?.({
      path: actionPath,
      values: panel.controller?.getValues(),
      controller: panel.controller,
      event,
    });
  };

  eventTarget.addEventListener("input", handleInteractionEvent);
  eventTarget.addEventListener("change", handleInteractionEvent);
  eventTarget.addEventListener("loaded", handleInteractionEvent);
  eventTarget.addEventListener("click", handleClick);
  target.append(...elements);

  const unsubscribe = PropsKitStore.subscribe(panel.id, (update) => {
    for (const record of update.records ?? []) {
      const nextUrls = new Set(mediaSources(record.value));
      for (const previous of mediaSources(record.previousValue)) {
        const retainedByChooser = (
          uploadedMediaOptions.get(record.path) ?? []
        ).some((option) => option.value === previous);
        if (
          objectUrls.has(previous) &&
          !nextUrls.has(previous) &&
          !retainedByChooser
        ) {
          URL.revokeObjectURL(previous);
          objectUrls.delete(previous);
        }
      }
    }
    for (const path of update.paths ?? []) {
      const control = controls.get(path);
      const node = nodesByPath.get(path);
      if (!control || !node) continue;
      const sourceTarget = update.sourceEvent?.target;
      if (
        sourceTarget instanceof HTMLElement &&
        sourceTarget.dataset.propskitMediaChoice === path &&
        control.contains(sourceTarget)
      ) {
        continue;
      }
      syncing.add(control);
      try {
        syncControl(
          control,
          node,
          panel.values[path] ?? node.defaultValue,
          uploadedMediaOptions.get(path) ?? [],
        );
      } finally {
        syncing.delete(control);
      }
    }
  });

  return {
    elements,
    destroy() {
      unsubscribe();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
      eventTarget.removeEventListener("input", handleInteractionEvent);
      eventTarget.removeEventListener("change", handleInteractionEvent);
      eventTarget.removeEventListener("loaded", handleInteractionEvent);
      eventTarget.removeEventListener("click", handleClick);
      elements.forEach((element) => element.remove());
    },
  };
}
