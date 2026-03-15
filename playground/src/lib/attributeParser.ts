import { getExampleSourceMarkup } from "./exampleMarkup";
import sunSvgRaw from "../icons/sun.svg?raw";
import { landscapeUrl } from "./images";

export interface ParsedAttributeTarget {
  fieldIndex: number;
  label: string;
  hasLabel: boolean;
  controlTag: string;
  fieldAttributes: Record<string, string>;
  controlAttributes: Record<string, string>;
}

export interface AttributeMutation {
  fieldIndex: number;
  target: "field" | "control";
  name: string;
  value: string | null;
}

export interface LabelMutation {
  fieldIndex: number;
  enabled: boolean;
  text?: string;
}

export interface FieldControlMutation {
  fieldIndex: number;
  controlTag:
    | "fig-checkbox"
    | "fig-dropdown"
    | "fig-image"
    | "fig-input-color"
    | "fig-input-fill"
    | "fig-input-number"
    | "fig-input-text"
    | "fig-segmented-control"
    | "fig-slider"
    | "fig-switch";
}

function getButtonDefaultText(type: string | null): string {
  switch (type) {
    case "select":
      return "Select";
    case "upload":
      return "Upload";
    case "link":
      return "Visit Figma";
    case "toggle":
      return "Toggle";
    case "submit":
      return "Submit";
    default:
      return "Primary";
  }
}

function ensureButtonText(button: Element, text: string) {
  const hasText = Array.from(button.childNodes).some(
    (node) =>
      node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
  if (!hasText) button.prepend(document.createTextNode(text));
}

function createButtonIconSvg(doc: Document): SVGElement {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill-rule", "evenodd");
  path.setAttribute("clip-rule", "evenodd");
  path.setAttribute(
    "d",
    "M12 5C12.2761 5 12.5 5.22386 12.5 5.5V6.5C12.5 6.77614 12.2761 7 12 7C11.7239 7 11.5 6.77614 11.5 6.5V5.5C11.5 5.22386 11.7239 5 12 5ZM16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12ZM12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15ZM7.75687 7.05026C7.56161 6.85499 7.24503 6.85499 7.04977 7.05026C6.8545 7.24552 6.8545 7.5621 7.04977 7.75736L7.75687 8.46447C7.95214 8.65973 8.26872 8.65973 8.46398 8.46447C8.65924 8.26921 8.65924 7.95262 8.46398 7.75736L7.75687 7.05026ZM19 12C19 12.2761 18.7761 12.5 18.5 12.5H17.5C17.2239 12.5 17 12.2761 17 12C17 11.7239 17.2239 11.5 17.5 11.5H18.5C18.7761 11.5 19 11.7239 19 12ZM16.9502 7.75736C17.1455 7.5621 17.1455 7.24552 16.9502 7.05026C16.755 6.85499 16.4384 6.85499 16.2431 7.05026L15.536 7.75736C15.3408 7.95262 15.3408 8.26921 15.536 8.46447C15.7313 8.65973 16.0479 8.65973 16.2431 8.46447L16.9502 7.75736ZM12 17C12.2761 17 12.5 17.2239 12.5 17.5V18.5C12.5 18.7761 12.2761 19 12 19C11.7239 19 11.5 18.7761 11.5 18.5V17.5C11.5 17.2239 11.7239 17 12 17ZM16.2422 15.5356C16.047 15.3403 15.7304 15.3403 15.5351 15.5356C15.3399 15.7309 15.3399 16.0475 15.5351 16.2427L16.2422 16.9498C16.4375 17.1451 16.7541 17.1451 16.9493 16.9498C17.1446 16.7546 17.1446 16.438 16.9493 16.2427L16.2422 15.5356ZM7 12C7 12.2761 6.77614 12.5 6.5 12.5H5.5C5.22386 12.5 5 12.2761 5 12C5 11.7239 5.22386 11.5 5.5 11.5H6.5C6.77614 11.5 7 11.7239 7 12ZM8.46488 16.2427C8.66014 16.0475 8.66014 15.7309 8.46488 15.5356C8.26962 15.3403 7.95304 15.3403 7.75777 15.5356L7.05067 16.2427C6.85541 16.438 6.85541 16.7546 7.05067 16.9498C7.24593 17.1451 7.56251 17.1451 7.75777 16.9498L8.46488 16.2427Z",
  );
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  return svg;
}

function createDefaultFieldControl(
  doc: Document,
  controlTag: FieldControlMutation["controlTag"],
): Element {
  const element = doc.createElement(controlTag);
  if (controlTag === "fig-dropdown") {
    ["Option 1", "Option 2", "Option 3"].forEach((label, idx) => {
      const option = doc.createElement("option");
      option.textContent = label;
      if (idx === 0) option.setAttribute("selected", "");
      element.append(option);
    });
    return element;
  }

  if (controlTag === "fig-image") {
    element.setAttribute("upload", "true");
    element.setAttribute("size", "auto");
    return element;
  }

  if (controlTag === "fig-input-color") {
    element.setAttribute("value", "#0D99FF");
    element.setAttribute("text", "true");
    return element;
  }

  if (controlTag === "fig-input-number") {
    element.setAttribute("value", "16");
    element.setAttribute("placeholder", "0");
    return element;
  }

  if (controlTag === "fig-input-text") {
    element.setAttribute("value", "Text");
    element.setAttribute("placeholder", "Type here");
    return element;
  }

  if (controlTag === "fig-segmented-control") {
    [
      { value: "left", label: "Left", selected: true },
      { value: "center", label: "Center", selected: false },
      { value: "right", label: "Right", selected: false },
    ].forEach((segmentData) => {
      const segment = doc.createElement("fig-segment");
      segment.setAttribute("value", segmentData.value);
      if (segmentData.selected) segment.setAttribute("selected", "");
      segment.textContent = segmentData.label;
      element.append(segment);
    });
    return element;
  }

  return element;
}

function getTargetElement(
  root: HTMLElement,
  mutation: Pick<AttributeMutation, "fieldIndex" | "target">,
): Element | null {
  const fields = root.querySelectorAll("fig-field");
  if (fields.length) {
    const field = fields[mutation.fieldIndex];
    if (!field) return null;
    return mutation.target === "field" ? field : getFieldControl(field);
  }

  if (mutation.target === "control") {
    return getPrimaryControls(root)[mutation.fieldIndex] ?? null;
  }

  return null;
}

function parseSourceRoot(markup: string): HTMLElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div data-source-root>${markup}</div>`,
    "text/html",
  );
  return doc.body.firstElementChild as HTMLElement;
}

function isElementNode(node: ChildNode): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isTextNode(node: ChildNode): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

function isFigTag(element: Element): boolean {
  if (element.tagName.toLowerCase().startsWith("fig-")) return true;
  if (element.tagName.toLowerCase() !== "dialog") return false;
  const isName = element.getAttribute("is")?.toLowerCase() ?? "";
  return isName.startsWith("fig-");
}

function getControlTag(element: Element): string {
  if (element.tagName.toLowerCase() === "dialog") {
    const isName = element.getAttribute("is")?.toLowerCase() ?? "";
    if (isName.startsWith("fig-")) return isName;
  }
  return element.tagName.toLowerCase();
}

function attrsToRecord(element: Element): Record<string, string> {
  const out: Record<string, string> = {};
  Array.from(element.attributes).forEach((attr) => {
    out[attr.name] = attr.value;
  });
  return out;
}

function getFieldControl(field: Element): Element | null {
  const children = Array.from(field.children);
  const labelIndex = children.findIndex(
    (child) => child.tagName.toLowerCase() === "label",
  );
  const search = labelIndex >= 0 ? children.slice(labelIndex + 1) : children;
  return search.find((child) => isFigTag(child)) ?? null;
}

function hasFigAncestor(element: Element): boolean {
  let current = element.parentElement;
  while (current) {
    if (isFigTag(current)) return true;
    current = current.parentElement;
  }
  return false;
}

function shouldIgnoreControl(element: Element): boolean {
  return element.getAttribute("data-playground-ignore-controls") === "true";
}

function getPrimaryControls(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll("*")).filter(
    (el) => isFigTag(el) && !hasFigAncestor(el) && !shouldIgnoreControl(el),
  );
}

function formatAttributes(element: Element): string {
  const attrs = Array.from(element.attributes);
  if (!attrs.length) return "";
  return attrs
    .map((attr) =>
      attr.value === ""
        ? attr.name
        : `${attr.name}="${attr.value.replace(/"/g, "&quot;")}"`,
    )
    .join(" ");
}

function formatNode(node: ChildNode, depth = 0): string {
  const indent = "  ".repeat(depth);

  if (isTextNode(node)) {
    const text = node.textContent?.trim();
    return text ? `${indent}${text}` : "";
  }

  if (!isElementNode(node)) return "";

  const tag = node.tagName.toLowerCase();
  const attrs = formatAttributes(node);
  const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;

  const children = Array.from(node.childNodes).filter((child) => {
    if (isTextNode(child)) return Boolean(child.textContent?.trim());
    return isElementNode(child);
  });

  if (!children.length) return `${indent}${open}</${tag}>`;

  const textChildren = children.filter(isTextNode);
  const elementChildren = children.filter(isElementNode);
  if (textChildren.length === 1 && elementChildren.length === 0) {
    return `${indent}${open}${textChildren[0].textContent?.trim() ?? ""}</${tag}>`;
  }

  const body = children
    .map((child) => formatNode(child, depth + 1))
    .filter(Boolean)
    .join("\n");

  return `${indent}${open}\n${body}\n${indent}</${tag}>`;
}

function serializeSourceMarkup(root: HTMLElement): string {
  return Array.from(root.childNodes)
    .map((node) => formatNode(node, 0))
    .filter(Boolean)
    .join("\n");
}

export function parseAttributeTargets(markup: string): ParsedAttributeTarget[] {
  const root = parseSourceRoot(markup);
  const fields = Array.from(root.querySelectorAll("fig-field"));

  if (fields.length) {
    return fields
      .map((field, fieldIndex) => {
        const control = getFieldControl(field);
        if (!control) return null;

        const label = field.querySelector("label")?.textContent?.trim() ?? "";
        const hasLabel = Boolean(field.querySelector(":scope > label"));
        return {
          fieldIndex,
          label,
          hasLabel,
          controlTag: getControlTag(control),
          fieldAttributes: attrsToRecord(field),
          controlAttributes: attrsToRecord(control),
        };
      })
      .filter((target): target is ParsedAttributeTarget => Boolean(target));
  }

  return getPrimaryControls(root).map((control, fieldIndex) => ({
    fieldIndex,
    label: "",
    hasLabel: false,
    controlTag: getControlTag(control),
    fieldAttributes: {},
    controlAttributes: attrsToRecord(control),
  }));
}

export function applyAttributeMutation(
  markup: string,
  mutation: AttributeMutation,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, mutation);
  if (!element) return markup;

  if (mutation.value === null) {
    element.removeAttribute(mutation.name);
  } else {
    element.setAttribute(mutation.name, mutation.value);
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function applyButtonTypeMutation(
  markup: string,
  fieldIndex: number,
  nextType: string,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element || getControlTag(element) !== "fig-button") return markup;

  element.setAttribute("type", nextType);

  // Remove type-specific nested children before applying the next template.
  Array.from(element.children).forEach((child) => {
    const tag = child.tagName.toLowerCase();
    if (
      tag === "fig-dropdown" ||
      (tag === "input" && child.getAttribute("type") === "file")
    ) {
      child.remove();
    }
  });

  const ensureText = (text: string) => {
    ensureButtonText(element, text);
  };

  if (nextType === "select") {
    ensureText("Select");
    const dropdown = document.createElement("fig-dropdown");
    ["Option One", "Option Two", "Option Three"].forEach((label, idx) => {
      const option = document.createElement("option");
      option.textContent = label;
      if (idx === 0) option.setAttribute("selected", "");
      dropdown.append(option);
    });
    element.append(dropdown);
  } else if (nextType === "upload") {
    ensureText("Upload");
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    element.append(input);
  } else if (nextType === "link") {
    ensureText("Visit Figma");
    element.setAttribute("href", "https://www.figma.com");
    element.setAttribute("target", "_blank");
  } else {
    element.removeAttribute("href");
    element.removeAttribute("target");
    if (nextType === "toggle") {
      ensureText("Toggle");
    } else if (nextType === "submit") {
      ensureText("Submit");
    } else {
      ensureText("Primary");
    }
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function applyButtonIconMutation(
  markup: string,
  fieldIndex: number,
  enabled: boolean,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element || getControlTag(element) !== "fig-button") return markup;

  if (enabled) {
    element.setAttribute("icon", "");
    Array.from(element.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
        node.remove();
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).tagName.toLowerCase() === "svg"
      ) {
        node.remove();
      }
    });
    element.prepend(createButtonIconSvg(root.ownerDocument));
  } else {
    element.removeAttribute("icon");
    Array.from(element.children).forEach((child) => {
      if (child.tagName.toLowerCase() === "svg") child.remove();
    });
    ensureButtonText(
      element,
      getButtonDefaultText(element.getAttribute("type")),
    );
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function applyDialogCloseButtonMutation(
  markup: string,
  fieldIndex: number,
  enabled: boolean,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element || getControlTag(element) !== "fig-dialog") return markup;

  const header = element.querySelector(":scope > fig-header");
  if (!header) return markup;

  const existingTooltip = header.querySelector(":scope > fig-tooltip");

  if (enabled) {
    if (!existingTooltip) {
      const tooltip = root.ownerDocument.createElement("fig-tooltip");
      tooltip.setAttribute("text", "Close");
      const button = root.ownerDocument.createElement("fig-button");
      button.setAttribute("variant", "ghost");
      button.setAttribute("icon", "true");
      button.setAttribute("close-dialog", "");
      const span = root.ownerDocument.createElement("span");
      span.setAttribute("class", "fig-mask-icon");
      span.setAttribute("style", "--icon: var(--icon-close)");
      button.append(span);
      tooltip.append(button);
      header.append(tooltip);
    }
  } else if (existingTooltip) {
    existingTooltip.remove();
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function applyDialogFooterMutation(
  markup: string,
  fieldIndex: number,
  enabled: boolean,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element || getControlTag(element) !== "fig-dialog") return markup;

  const existingFooter = element.querySelector(":scope > footer");
  if (enabled) {
    if (!existingFooter) {
      const footer = root.ownerDocument.createElement("footer");
      const cancelButton = root.ownerDocument.createElement("fig-button");
      cancelButton.setAttribute("variant", "secondary");
      cancelButton.setAttribute("close-dialog", "");
      cancelButton.textContent = "Cancel";
      const saveButton = root.ownerDocument.createElement("fig-button");
      saveButton.textContent = "Save";
      footer.append(cancelButton, saveButton);
      element.append(footer);
    }
  } else if (existingFooter) {
    existingFooter.remove();
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function applyFieldLabelMutation(
  markup: string,
  mutation: LabelMutation,
): string {
  const root = parseSourceRoot(markup);
  const field = root.querySelectorAll("fig-field")[mutation.fieldIndex];
  if (!field) return markup;

  const existingLabel = field.querySelector(":scope > label");

  if (mutation.enabled) {
    const labelText = mutation.text?.trim() || "Label";
    if (existingLabel) {
      existingLabel.textContent = labelText;
    } else {
      const label = document.createElement("label");
      label.textContent = labelText;
      const firstControl = Array.from(field.children).find((child) =>
        isFigTag(child),
      );
      if (firstControl) {
        field.insertBefore(label, firstControl);
      } else {
        field.prepend(label);
      }
    }
  } else if (existingLabel) {
    existingLabel.remove();
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export type PrependSlotMode = "none" | "label" | "icon";

export function getPrependSlotMode(
  markup: string,
  fieldIndex: number,
): PrependSlotMode {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return "none";
  const prepend = element.querySelector('[slot="prepend"]');
  if (!prepend) return "none";
  if (prepend.querySelector("svg")) return "icon";
  return "label";
}

export function applyPrependSlotMutation(
  markup: string,
  fieldIndex: number,
  mode: PrependSlotMode,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return markup;

  const existing = element.querySelector('[slot="prepend"]');
  if (existing) existing.remove();

  if (mode === "label") {
    const span = root.ownerDocument.createElement("span");
    span.setAttribute("slot", "prepend");
    span.textContent = "X";
    element.prepend(span);
  } else if (mode === "icon") {
    const span = root.ownerDocument.createElement("span");
    span.setAttribute("slot", "prepend");
    span.innerHTML = sunSvgRaw;
    element.prepend(span);
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function getHeaderIconEnabled(
  markup: string,
  fieldIndex: number,
): boolean {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return false;
  return element.querySelector("fig-button") !== null;
}

export function applyHeaderIconMutation(
  markup: string,
  fieldIndex: number,
  enabled: boolean,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return markup;

  const existing = element.querySelector("fig-button");
  if (existing) existing.remove();

  if (enabled) {
    const btn = root.ownerDocument.createElement("fig-button");
    btn.setAttribute("variant", "ghost");
    btn.setAttribute("icon", "true");
    const icon = root.ownerDocument.createElement("span");
    icon.setAttribute("class", "fig-mask-icon");
    icon.setAttribute("style", "--icon: var(--icon-close)");
    btn.appendChild(icon);
    element.appendChild(btn);
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export type ChooserContentMode = "text" | "image" | "image-label" | "colors";

export function getChooserContentMode(
  markup: string,
  fieldIndex: number,
): ChooserContentMode {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return "text";
  const firstChoice = element.querySelector("fig-choice");
  if (!firstChoice) return "text";
  if (firstChoice.querySelector("fig-chit")) return "colors";
  if (firstChoice.querySelector("fig-image")) {
    const hasLabel =
      firstChoice.querySelector("label") ||
      firstChoice.querySelector("span") ||
      Array.from(firstChoice.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
      );
    return hasLabel ? "image-label" : "image";
  }
  return "text";
}

const CHOOSER_PRESETS: Record<ChooserContentMode, string[]> = {
  text: [
    '<fig-choice value="option-a" selected>Option A</fig-choice>',
    '<fig-choice value="option-b">Option B</fig-choice>',
    '<fig-choice value="option-c">Option C</fig-choice>',
    '<fig-choice value="option-d">Option D</fig-choice>',
    '<fig-choice value="option-e">Option E</fig-choice>',
    '<fig-choice value="option-f">Option F</fig-choice>',
  ],
  image: [
    `<fig-choice value="img-a" selected><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>`,
    `<fig-choice value="img-b"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>`,
    `<fig-choice value="img-c"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>`,
    `<fig-choice value="img-d"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>`,
    `<fig-choice value="img-e"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>`,
    `<fig-choice value="img-f"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image></fig-choice>`,
  ],
  "image-label": [
    `<fig-choice value="img-a" selected><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image><label>Label A</label></fig-choice>`,
    `<fig-choice value="img-b"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image><label>Label B</label></fig-choice>`,
    `<fig-choice value="img-c"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image><label>Label C</label></fig-choice>`,
    `<fig-choice value="img-d"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image><label>Label D</label></fig-choice>`,
    `<fig-choice value="img-e"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image><label>Label E</label></fig-choice>`,
    `<fig-choice value="img-f"><fig-image src="${landscapeUrl()}" size="auto" aspect-ratio="1/1" full></fig-image><label>Label F</label></fig-choice>`,
  ],
  colors: [
    '<fig-choice value="red" selected><fig-chit background="#FF0000" size="large" disabled></fig-chit></fig-choice>',
    '<fig-choice value="blue"><fig-chit background="#0D99FF" size="large" disabled></fig-chit></fig-choice>',
    '<fig-choice value="green"><fig-chit background="#14AE5C" size="large" disabled></fig-chit></fig-choice>',
    '<fig-choice value="orange"><fig-chit background="#FF8C00" size="large" disabled></fig-chit></fig-choice>',
    '<fig-choice value="purple"><fig-chit background="#9747FF" size="large" disabled></fig-chit></fig-choice>',
    '<fig-choice value="pink"><fig-chit background="#E84BA5" size="large" disabled></fig-chit></fig-choice>',
    '<fig-choice value="teal"><fig-chit background="#24B5A8" size="large" disabled></fig-chit></fig-choice>',
    '<fig-choice value="yellow"><fig-chit background="#FFCD29" size="large" disabled></fig-chit></fig-choice>',
  ],
};

export function applyChooserContentMutation(
  markup: string,
  fieldIndex: number,
  mode: ChooserContentMode,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return markup;

  const layout = element.getAttribute("layout");
  const full = element.hasAttribute("full");
  const value = element.getAttribute("value");

  element.innerHTML = "";
  const preset = CHOOSER_PRESETS[mode];
  const parser = new DOMParser();
  for (const html of preset) {
    const frag = parser.parseFromString(html, "text/html");
    const child = frag.body.firstElementChild;
    if (child) element.appendChild(root.ownerDocument.importNode(child, true));
  }

  if (layout) element.setAttribute("layout", layout);
  if (full) element.setAttribute("full", "");
  if (value) element.setAttribute("value", value);

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function applyChooserMaxSizeMutation(
  markup: string,
  fieldIndex: number,
  styleDeclaration: string,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return markup;

  const existing = element.getAttribute("style") ?? "";
  const cleaned = existing
    .replace(/max-width:\s*[^;]+;?/g, "")
    .replace(/max-height:\s*[^;]+;?/g, "")
    .trim();
  const next = cleaned
    ? `${cleaned}; ${styleDeclaration}`
    : styleDeclaration;
  element.setAttribute("style", next);

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function applyFieldControlMutation(
  markup: string,
  mutation: FieldControlMutation,
): string {
  const root = parseSourceRoot(markup);
  const field = root.querySelectorAll("fig-field")[mutation.fieldIndex];
  if (!field) return markup;

  Array.from(field.children).forEach((child) => {
    if (isFigTag(child)) child.remove();
  });

  const nextControl = createDefaultFieldControl(
    root.ownerDocument,
    mutation.controlTag,
  );
  field.append(nextControl);

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}
