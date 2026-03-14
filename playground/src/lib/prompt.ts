const NOISE_ATTRS = new Set([
  "id", "class", "style", "slot", "name", "role",
  "aria-selected", "aria-disabled", "tabindex",
]);

function formatElementAttrs(el: Element): string {
  return Array.from(el.attributes)
    .filter((a) => !NOISE_ATTRS.has(a.name) && !a.name.startsWith("data-"))
    .map((a) => (a.value === "" ? a.name : `${a.name}=${a.value}`))
    .join(", ");
}

function describeImage(el: Element): string {
  const parts: string[] = [];
  if (el.getAttribute("full") === "true" || el.hasAttribute("full"))
    parts.push("full fig-image");
  else parts.push("fig-image");
  if (el.getAttribute("upload") === "true") parts.push("upload");
  if (el.getAttribute("size") === "auto") parts.push("auto size");
  if (el.hasAttribute("fit")) parts.push(`fit ${el.getAttribute("fit")}`);
  if (el.hasAttribute("aspect-ratio"))
    parts.push(`aspect ratio ${el.getAttribute("aspect-ratio")}`);
  return parts.join(", ");
}

function describeFill(el: Element): string {
  try {
    const val = JSON.parse(el.getAttribute("value") || "{}");
    const parts: string[] = ["fig-input-fill"];
    if (val.type === "solid") {
      parts.push(`solid fill, color=${val.color}`);
    } else if (val.type === "gradient" && val.gradient) {
      parts.push(`${val.gradient.type} gradient`);
      if (val.gradient.angle !== undefined)
        parts.push(`angle=${val.gradient.angle}`);
      const colors = (val.gradient.stops || [])
        .map((s: { color: string }) => s.color)
        .join(" → ");
      if (colors) parts.push(`stops=${colors}`);
    } else if (val.type === "image") {
      parts.push("image fill");
      if (val.image?.scaleMode) parts.push(`scaleMode=${val.image.scaleMode}`);
      if (val.image?.opacity !== undefined && val.image.opacity < 1)
        parts.push(`opacity=${val.image.opacity}`);
    }
    if (el.getAttribute("alpha") === "false") parts.push("alpha=false");
    return parts.join(", ");
  } catch {
    return "fig-input-fill";
  }
}

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "fig-image") return describeImage(el);
  if (tag === "fig-input-fill") return describeFill(el);
  const attrs = formatElementAttrs(el);
  return attrs ? `${tag}, ${attrs}` : tag;
}

function buildFieldPrompt(field: Element): string {
  const label = field.querySelector("label")?.textContent?.trim() || "[Label name]";
  const control = Array.from(field.children).find(
    (c) => c.tagName !== "LABEL",
  );
  if (!control) return `Use a horizontal fig-field. With a label of ${label}.`;
  const desc = describeElement(control);
  return `Use a horizontal fig-field, with a ${desc}. With a label of ${label}.`;
}

function buildStandalonePrompt(el: Element): string {
  const desc = describeElement(el);
  const textContent = el.textContent?.trim();
  if (textContent) return `Use a ${desc}. With text content "${textContent}".`;
  return `Use a ${desc}.`;
}

export function buildPrompt(codeMarkup: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${codeMarkup}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return codeMarkup;

  const fields = root.querySelectorAll("fig-field");
  if (fields.length) return buildFieldPrompt(fields[0]);

  const topLevel = Array.from(root.children).filter((c) =>
    c.tagName.toLowerCase().startsWith("fig-"),
  );
  if (topLevel.length === 1) return buildStandalonePrompt(topLevel[0]);
  if (topLevel.length > 1) {
    const first = topLevel[0];
    return `Use ${topLevel.length} ${first.tagName.toLowerCase()} elements. ${buildStandalonePrompt(first)}`;
  }

  return codeMarkup;
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
