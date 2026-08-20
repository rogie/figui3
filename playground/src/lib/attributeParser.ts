import { getExampleSourceMarkup } from "./exampleMarkup";
import sunSvgRaw from "../icons/sun.svg?raw";
import { landscapeUrl } from "./images";

export interface ParsedAttributeTarget {
  fieldIndex: number;
  label: string;
  hasLabel: boolean;
  hasField: boolean;
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

function createButtonIcon(doc: Document): HTMLElement {
  const icon = doc.createElement("fig-icon");
  icon.setAttribute("name", "visible");
  return icon;
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
  if (mutation.target === "control") {
    const skeletonControls = getPrimarySkeletonControls(root);
    if (skeletonControls.length) {
      return skeletonControls[mutation.fieldIndex] ?? null;
    }
  }

  const primaryControls = getPrimaryControls(root);
  const groupControls = primaryControls.filter(
    (el) => getControlTag(el) === "fig-group",
  );
  if (groupControls.length) {
    return groupControls[mutation.fieldIndex] ?? null;
  }

  const reorderControls = primaryControls.filter(
    (el) => getControlTag(el) === "fig-reorder",
  );
  if (reorderControls.length) {
    return reorderControls[mutation.fieldIndex] ?? null;
  }

  const fields = getTopLevelFields(root);
  if (fields.length) {
    const field = fields[mutation.fieldIndex];
    if (!field) return null;
    return mutation.target === "field" ? field : getFieldControl(field);
  }

  if (mutation.target === "control") {
    return primaryControls[mutation.fieldIndex] ?? null;
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
  const tag = element.tagName.toLowerCase();
  if (tag.startsWith("fig-") || tag.startsWith("propskit-")) return true;
  if (element.tagName.toLowerCase() !== "dialog") return false;
  const isName = element.getAttribute("is")?.toLowerCase() ?? "";
  return isName.startsWith("fig-");
}

function isSupportedControl(element: Element): boolean {
  return isFigTag(element) || element.tagName.toLowerCase() === "progress";
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
  return search.find((child) => isSupportedControl(child)) ?? null;
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

const DIALOG_SCOPE = 'dialog[is="fig-dialog"], dialog[is="fig-popup"]';

function getTopLevelFields(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll("fig-field")).filter(
    (field) => !field.closest(DIALOG_SCOPE) && !field.closest("[data-playground-hide-field]") && !field.closest("[data-playground-ignore-controls]"),
  );
}

function getPrimaryControls(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll("*")).filter(
    (el) => isSupportedControl(el) && !hasFigAncestor(el) && !shouldIgnoreControl(el),
  );
}

function getPrimarySkeletonControls(root: HTMLElement): Element[] {
  return getPrimaryControls(root).filter(
    (control) => getControlTag(control) === "fig-skeleton",
  );
}

function formatAttributes(element: Element): string {
  const attrs = Array.from(element.attributes);
  if (!attrs.length) return "";
  return attrs
    .map((attr) => {
      if (attr.value === "") return attr.name;
      if (attr.value.includes('"') && !attr.value.includes("'"))
        return `${attr.name}='${attr.value}'`;
      return `${attr.name}="${attr.value.replace(/"/g, "&quot;")}"`;
    })
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
  const primaryControls = getPrimaryControls(root);
  const skeletonControls = getPrimarySkeletonControls(root);

  // Keep skeleton examples focused on top-level skeleton controls,
  // even when the markup contains nested fig-field/fig-input content.
  if (skeletonControls.length) {
    return skeletonControls.map((control, fieldIndex) => ({
      fieldIndex,
      label: "",
      hasLabel: false,
      hasField: false,
      controlTag: getControlTag(control),
      fieldAttributes: {},
      controlAttributes: attrsToRecord(control),
    }));
  }

  // When top-level controls are fig-group, show only the groups (not nested fields)
  const groupControls = primaryControls.filter(
    (el) => getControlTag(el) === "fig-group",
  );
  if (groupControls.length) {
    return groupControls.map((control, fieldIndex) => ({
      fieldIndex,
      label: "",
      hasLabel: false,
      hasField: false,
      controlTag: getControlTag(control),
      fieldAttributes: {},
      controlAttributes: attrsToRecord(control),
    }));
  }

  const reorderControls = primaryControls.filter(
    (el) => getControlTag(el) === "fig-reorder",
  );
  if (reorderControls.length) {
    return reorderControls.map((control, fieldIndex) => ({
      fieldIndex,
      label: "",
      hasLabel: false,
      hasField: false,
      controlTag: getControlTag(control),
      fieldAttributes: {},
      controlAttributes: attrsToRecord(control),
    }));
  }

  const fields = getTopLevelFields(root);

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
          hasField: true,
          controlTag: getControlTag(control),
          fieldAttributes: attrsToRecord(field),
          controlAttributes: attrsToRecord(control),
        };
      })
      .filter((target): target is ParsedAttributeTarget => Boolean(target));
  }

  return primaryControls.map((control, fieldIndex) => ({
    fieldIndex,
    label: "",
    hasLabel: false,
    hasField: false,
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

export function applyTooltipActionMutation(
  markup: string,
  fieldIndex: number,
  action: string,
): string {
  const root = parseSourceRoot(markup);
  const tooltip = getTargetElement(root, { fieldIndex, target: "control" });
  if (!tooltip || getControlTag(tooltip) !== "fig-tooltip") return markup;

  tooltip.setAttribute("action", action);

  const btn = tooltip.querySelector("fig-button");
  if (btn) {
    const textMap: Record<string, string> = {
      hover: "Hover me",
      click: "Click me",
      manual: "Manual",
    };
    const textNode = Array.from(btn.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
    );
    if (textNode) {
      textNode.textContent = textMap[action] ?? "Hover me";
    }
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

export function applyButtonVariantMutation(
  markup: string,
  fieldIndex: number,
  nextVariant: string,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element || getControlTag(element) !== "fig-button") return markup;

  if (nextVariant) element.setAttribute("variant", nextVariant);
  else element.removeAttribute("variant");

  const spacedVariant = nextVariant.replace(/([a-z])([A-Z])/g, "$1 $2");
  const label = spacedVariant
    ? `${spacedVariant.charAt(0).toUpperCase()}${spacedVariant.slice(1)}`
    : "Primary";
  const textNode = Array.from(element.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
  );
  if (textNode) textNode.textContent = label;

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
        ["svg", "fig-icon"].includes((node as Element).tagName.toLowerCase())
      ) {
        node.remove();
      }
    });
    element.prepend(createButtonIcon(root.ownerDocument));
  } else {
    element.removeAttribute("icon");
    Array.from(element.children).forEach((child) => {
      if (["svg", "fig-icon"].includes(child.tagName.toLowerCase())) child.remove();
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
      const icon = root.ownerDocument.createElement("fig-icon");
      icon.setAttribute("name", "close");
      button.append(icon);
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
  const field = getTopLevelFields(root)[mutation.fieldIndex];
  if (!field) return markup;

  const existingLabel = field.querySelector(":scope > label");

  if (mutation.enabled) {
    const labelText = mutation.text ?? "Label";
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
    const icon = root.ownerDocument.createElement("fig-icon");
    icon.setAttribute("name", "close");
    btn.appendChild(icon);
    element.appendChild(btn);
  }

  return getExampleSourceMarkup(serializeSourceMarkup(root));
}

export function getSelectSeparatorStickyEnabled(
  markup: string,
  fieldIndex: number,
): boolean {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return false;
  const separators = element.querySelectorAll(
    "fig-separator, fig-menu-separator",
  );
  if (!separators.length) return false;
  return Array.from(separators).every(
    (separator) =>
      separator.hasAttribute("sticky") &&
      separator.getAttribute("sticky") !== "false",
  );
}

export function applySelectSeparatorStickyMutation(
  markup: string,
  fieldIndex: number,
  enabled: boolean,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return markup;

  const separators = element.querySelectorAll(
    "fig-separator, fig-menu-separator",
  );
  separators.forEach((separator) => {
    if (enabled) separator.setAttribute("sticky", "");
    else separator.removeAttribute("sticky");
  });

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
  if (firstChoice.querySelector("fig-swatch")) return "colors";
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
    '<fig-choice value="red" selected><fig-swatch background="#FF0000" size="large" disabled></fig-swatch></fig-choice>',
    '<fig-choice value="blue"><fig-swatch background="#0D99FF" size="large" disabled></fig-swatch></fig-choice>',
    '<fig-choice value="green"><fig-swatch background="#14AE5C" size="large" disabled></fig-swatch></fig-choice>',
    '<fig-choice value="orange"><fig-swatch background="#FF8C00" size="large" disabled></fig-swatch></fig-choice>',
    '<fig-choice value="purple"><fig-swatch background="#9747FF" size="large" disabled></fig-swatch></fig-choice>',
    '<fig-choice value="pink"><fig-swatch background="#E84BA5" size="large" disabled></fig-swatch></fig-choice>',
    '<fig-choice value="teal"><fig-swatch background="#24B5A8" size="large" disabled></fig-swatch></fig-choice>',
    '<fig-choice value="yellow"><fig-swatch background="#FFCD29" size="large" disabled></fig-swatch></fig-choice>',
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

export function getChooserPaletteLabelsEnabled(
  markup: string,
  fieldIndex: number,
): boolean {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return false;
  const firstChoice = element.querySelector("fig-choice");
  if (!firstChoice) return false;
  return firstChoice.querySelector("label") !== null;
}

export function applyChooserPaletteLabelsMutation(
  markup: string,
  fieldIndex: number,
  enabled: boolean,
): string {
  const root = parseSourceRoot(markup);
  const element = getTargetElement(root, { fieldIndex, target: "control" });
  if (!element) return markup;

  const choices = element.querySelectorAll("fig-choice");
  choices.forEach((choice) => {
    const existing = choice.querySelector("label");
    if (existing) existing.remove();
    if (enabled) {
      const val = choice.getAttribute("value") || "";
      const label = root.ownerDocument.createElement("label");
      label.textContent = val.charAt(0).toUpperCase() + val.slice(1);
      choice.appendChild(label);
    }
  });

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
  const field = getTopLevelFields(root)[mutation.fieldIndex];
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

export function getHandleHitAreaDebug(markup: string, fieldIndex: number): number {
  const root = parseSourceRoot(markup);
  const controls = getPrimaryControls(root);
  const handle = controls[fieldIndex];
  if (!handle) return 0;
  const style = handle.getAttribute("style") || "";
  const match = style.match(/--fig-handle-hit-area-opacity:\s*([0-9.]+)/);
  return match ? parseFloat(match[1]) * 100 : 0;
}

export function applyHandleHitAreaDebugMutation(
  markup: string,
  fieldIndex: number,
  percent: number,
): string {
  const root = parseSourceRoot(markup);
  const controls = getPrimaryControls(root);
  const handle = controls[fieldIndex];
  if (!handle) return markup;
  const existing = handle.getAttribute("style") || "";
  const cleaned = existing.replace(/--fig-handle-hit-area-opacity:\s*[0-9.]+;?\s*/g, "").trim();
  if (percent > 0) {
    const val = (percent / 100).toFixed(2);
    const next = cleaned ? `${cleaned}; --fig-handle-hit-area-opacity: ${val}` : `--fig-handle-hit-area-opacity: ${val}`;
    handle.setAttribute("style", next);
  } else {
    if (cleaned) handle.setAttribute("style", cleaned);
    else handle.removeAttribute("style");
  }
  return serializeSourceMarkup(root);
}

export function getHandleHitArea(markup: string, fieldIndex: number): { size: number; circle: boolean } {
  const root = parseSourceRoot(markup);
  const controls = getPrimaryControls(root);
  const handle = controls[fieldIndex];
  if (!handle) return { size: 0, circle: false };
  const raw = handle.getAttribute("hit-area") || "";
  const tokens = raw.trim().split(/\s+/);
  let size = 0;
  let circle = false;
  for (const t of tokens) {
    if (t === "circle") { circle = true; continue; }
    const n = parseFloat(t);
    if (Number.isFinite(n)) size = n;
  }
  return { size, circle };
}

export function applyHandleHitAreaMutation(
  markup: string,
  fieldIndex: number,
  size: number,
  circle: boolean,
): string {
  const root = parseSourceRoot(markup);
  const controls = getPrimaryControls(root);
  const handle = controls[fieldIndex];
  if (!handle) return markup;
  if (size <= 0) {
    handle.removeAttribute("hit-area");
  } else {
    const val = circle ? `${size} circle` : `${size}`;
    handle.setAttribute("hit-area", val);
  }
  return serializeSourceMarkup(root);
}

export const FIG_ICON_SET_24 = [
  "add",
  "send",
  "chevron",
  "adjust",
  "minus",
  "close",
  "back",
  "forward",
  "rotate",
  "swap",
  "play",
  "pause",
  "search",
  "download",
  "upload",
  "sun",
  "moon",
  "visible",
  "hidden",
  "edit",
  "settings",
  "more",
  "steppers",
  "eyedropper",
  "reset",
  "globe",
  "warning",
  "copy",
] as const;

export const FIG_ICON_SET_16 = [
  "send",
  "chevron",
  "checkmark",
  "reset",
  "arrow-left",
  "adjust",
  "close",
  "visible",
  "hidden",
  "edit",
  "settings",
  "more",
  "globe",
  "warning",
  "copy",
] as const;

export type FigIconPlaygroundSet = "16" | "24";

export function buildFigIconExampleMarkup(
  set: FigIconPlaygroundSet,
  name = set === "16" ? "chevron" : "add",
): string {
  const sizeAttr = set === "16" ? ' size="small"' : "";
  return `<div class="prop-panel">
  <fig-icon name="${name}"${sizeAttr} data-playground-hide-field data-playground-hide-attrs="name,size,color" data-playground-icon-set="${set}"></fig-icon>
</div>`;
}

export function getFigIconPlaygroundNames(set: FigIconPlaygroundSet): string[] {
  const names = set === "16" ? [...FIG_ICON_SET_16] : [...FIG_ICON_SET_24];
  return names.sort((a, b) => a.localeCompare(b));
}

export const FIG_ICON_COLOR_OPTIONS = [
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
  { label: "Tertiary", value: "tertiary" },
  { label: "Disabled", value: "disabled" },
  { label: "Brand", value: "brand" },
  { label: "Component", value: "component" },
  { label: "Danger", value: "danger" },
  { label: "Success", value: "success" },
  { label: "Warning", value: "warning" },
  { label: "Selected", value: "selected" },
  { label: "Hover", value: "hover" },
  { label: "Pressed", value: "pressed" },
  { label: "On brand", value: "onbrand" },
  { label: "On component", value: "oncomponent" },
  { label: "On danger", value: "ondanger" },
  { label: "On disabled", value: "ondisabled" },
  { label: "On inverse", value: "oninverse" },
  { label: "On selected", value: "onselected" },
  { label: "On success", value: "onsuccess" },
  { label: "On warning", value: "onwarning" },
] as const;

const FIG_ICON_COLOR_ALIASES: Record<string, string> = {
  "var(--figma-color-icon)": "primary",
  "var(--figma-color-icon-secondary)": "secondary",
  "var(--figma-color-icon-tertiary)": "tertiary",
  "var(--figma-color-icon-disabled)": "disabled",
  "var(--figma-color-icon-brand)": "brand",
  "var(--figma-color-icon-component)": "component",
  "var(--figma-color-icon-danger)": "danger",
  "var(--figma-color-icon-success)": "success",
  "var(--figma-color-icon-warning)": "warning",
  "var(--figma-color-icon-selected)": "selected",
  "var(--figma-color-icon-hover)": "hover",
  "var(--figma-color-icon-pressed)": "pressed",
  "var(--figma-color-icon-onbrand)": "onbrand",
  "var(--figma-color-icon-oncomponent)": "oncomponent",
  "var(--figma-color-icon-ondanger)": "ondanger",
  "var(--figma-color-icon-ondisabled)": "ondisabled",
  "var(--figma-color-icon-oninverse)": "oninverse",
  "var(--figma-color-icon-onselected)": "onselected",
  "var(--figma-color-icon-onsuccess)": "onsuccess",
  "var(--figma-color-icon-onwarning)": "onwarning",
};

export function getFigIconColorOptionLabel(colorAttr: string | undefined): string {
  if (!colorAttr) return FIG_ICON_COLOR_OPTIONS[0].label;
  const normalized =
    FIG_ICON_COLOR_ALIASES[colorAttr] ?? colorAttr.toLowerCase();
  return (
    FIG_ICON_COLOR_OPTIONS.find((option) => option.value === normalized)?.label ??
    FIG_ICON_COLOR_OPTIONS[0].label
  );
}

