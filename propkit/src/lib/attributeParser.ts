import { getExampleSourceMarkup } from "./exampleMarkup";

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
  return element.tagName.toLowerCase().startsWith("fig-");
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
        controlTag: control.tagName.toLowerCase(),
        fieldAttributes: attrsToRecord(field),
        controlAttributes: attrsToRecord(control),
      };
    })
    .filter((target): target is ParsedAttributeTarget => Boolean(target));
}

export function applyAttributeMutation(
  markup: string,
  mutation: AttributeMutation,
): string {
  const root = parseSourceRoot(markup);
  const field = root.querySelectorAll("fig-field")[mutation.fieldIndex];
  if (!field) return markup;

  const element =
    mutation.target === "field" ? field : getFieldControl(field);
  if (!element) return markup;

  if (mutation.value === null) {
    element.removeAttribute(mutation.name);
  } else {
    element.setAttribute(mutation.name, mutation.value);
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
