export function formatAttrs(el: Element): string {
  return Array.from(el.attributes)
    .filter(
      (a) =>
        !["id", "class", "src", "style", "label", "value"].includes(a.name) &&
        !a.name.startsWith("data-playground-"),
    )
    .map((a) => `${a.name}="${a.value}"`)
    .join(" ");
}

function collectComponentTargets(
  container: Element,
  maxTargets = 1,
): { component: Element; label: string }[] {
  const targets: { component: Element; label: string }[] = [];
  container.querySelectorAll("fig-field").forEach((field) => {
    const component = Array.from(field.children).find(
      (c) => c.tagName !== "LABEL",
    );
    const label =
      field.querySelector("label")?.textContent?.trim() || "";
    if (component && targets.length < maxTargets)
      targets.push({ component, label });
  });
  return targets;
}

export function buildPropkitPrompt(container: Element): string {
  const targets = collectComponentTargets(container);
  if (!targets.length)
    return "Use a horizontal fig-field. With a label of [Label name].";
  const { component: el, label } = targets[0];
  const labelText = label || "[Label name]";
  const tag = el.tagName.toLowerCase();

  if (tag === "fig-image") {
    const parts: string[] = [];
    if (el.getAttribute("full") === "true" || el.hasAttribute("full"))
      parts.push("full fig-image");
    else parts.push("fig-image");
    if (el.getAttribute("upload") === "true") parts.push("upload");
    if (el.getAttribute("size") === "auto") parts.push("auto size");
    if (el.hasAttribute("fit"))
      parts.push(`fit ${el.getAttribute("fit")}`);
    if (el.hasAttribute("aspect-ratio"))
      parts.push(`aspect ratio ${el.getAttribute("aspect-ratio")}`);
    return `Use a horizontal fig-field, with a ${parts.join(", ")}. With a label of ${labelText}.`;
  }

  if (tag === "fig-input-fill") {
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
        if (val.image?.scaleMode)
          parts.push(`scaleMode=${val.image.scaleMode}`);
        if (val.image?.opacity !== undefined && val.image.opacity < 1)
          parts.push(`opacity=${val.image.opacity}`);
      }
      if (el.getAttribute("alpha") === "false") parts.push("alpha=false");
      return `Use a horizontal fig-field, with a ${parts.join(", ")}. With a label of ${labelText}.`;
    } catch {
      /* fall through */
    }
  }

  const attrs = formatAttrs(el);
  if (!attrs)
    return `Use a horizontal fig-field, with a ${tag}. With a label of ${labelText}.`;
  return `Use a horizontal fig-field, with a ${tag}, ${attrs.replace(/"/g, "")}. With a label of ${labelText}.`;
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
