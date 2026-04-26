const PROP_PANEL_CLASS = "propkit-example";
const INTERNAL_FIELD_ONLY_CONTROLS_ATTR = "data-playground-field-only-controls";

function normalizeMarkup(markup: string): string {
  return markup.trim();
}

function singleQuoteAttrs(html: string): string {
  return html.replace(/(\s[a-z][a-z0-9-]*)="([^"]*&quot;[^"]*)"/gi, (_m, name, val) =>
    `${name}='${val.replace(/&quot;/g, '"')}'`,
  );
}

function dedentMarkup(markup: string): string {
  const lines = markup
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (!nonEmptyLines.length) return "";

  const firstContentLine = nonEmptyLines[0];
  const firstIndentMatch = firstContentLine.match(/^[\t ]*/);
  const firstIndent = firstIndentMatch ? firstIndentMatch[0].length : 0;
  if (firstIndent > 0) {
    return lines
      .map((line) => (line.trim() ? line.slice(firstIndent) : ""))
      .join("\n");
  }

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^[\t ]*/);
      return match ? match[0].length : 0;
    }),
  );

  if (minIndent <= 0) return lines.join("\n");
  return lines
    .map((line) => (line.trim() ? line.slice(minIndent) : ""))
    .join("\n");
}

function unwrapPropPanel(markup: string): string | null {
  const trimmed = normalizeMarkup(markup);
  const wrapperMatch = trimmed.match(
    /^<div\s+class=["'](?:propkit-example|prop-panel)["']\s*>([\s\S]*)<\/div>$/i,
  );
  if (!wrapperMatch) return null;
  return wrapperMatch[1].trim();
}

function stripPreviewOnlyElements(markup: string): string {
  if (!markup.includes("data-playground-ignore-controls")) return markup;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${markup}</div>`, "text/html");
  doc
    .querySelectorAll('[data-playground-ignore-controls="true"]')
    .forEach((el) => el.remove());
  return singleQuoteAttrs(doc.body.firstElementChild?.innerHTML?.trim() ?? markup);
}

function stripInternalFieldAttributes(markup: string): string {
  if (!markup.includes(INTERNAL_FIELD_ONLY_CONTROLS_ATTR)) return markup;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${markup}</div>`, "text/html");
  doc
    .querySelectorAll(`[${INTERNAL_FIELD_ONLY_CONTROLS_ATTR}]`)
    .forEach((el) => el.removeAttribute(INTERNAL_FIELD_ONLY_CONTROLS_ATTR));
  return singleQuoteAttrs(doc.body.firstElementChild?.innerHTML?.trim() ?? markup);
}

function unwrapPreviewWrappers(markup: string): string {
  if (!markup.includes("data-playground-unwrap")) return markup;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${markup}</div>`, "text/html");
  doc.querySelectorAll('[data-playground-unwrap="true"]').forEach((el) => {
    el.replaceWith(...Array.from(el.childNodes));
  });
  return singleQuoteAttrs(doc.body.firstElementChild?.innerHTML?.trim() ?? markup);
}

function stripPlaygroundAttributes(markup: string): string {
  if (!markup.includes("data-playground-")) return markup;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${markup}</div>`, "text/html");
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("data-playground-")) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return singleQuoteAttrs(doc.body.firstElementChild?.innerHTML?.trim() ?? markup);
}

export function getExampleSourceMarkup(markup: string): string {
  return dedentMarkup(unwrapPropPanel(markup) ?? normalizeMarkup(markup));
}

function cleanPresenceAttributes(markup: string): string {
  return markup.replace(/ ([a-z][a-z0-9-]*)=""/gi, " $1");
}

export function getCodeSourceMarkup(markup: string): string {
  return cleanPresenceAttributes(
    dedentMarkup(
      stripPlaygroundAttributes(
        unwrapPreviewWrappers(
          stripInternalFieldAttributes(
            stripPreviewOnlyElements(unwrapPropPanel(markup) ?? normalizeMarkup(markup)),
          ),
        ),
      ),
    ),
  );
}

function mergeInternalFieldAttributes(
  originalRoot: HTMLElement,
  editedRoot: HTMLElement,
) {
  const originalFields = Array.from(originalRoot.querySelectorAll("fig-field"));
  const editedFields = Array.from(editedRoot.querySelectorAll("fig-field"));
  const total = Math.min(originalFields.length, editedFields.length);
  for (let idx = 0; idx < total; idx += 1) {
    const sourceValue = originalFields[idx].getAttribute(
      INTERNAL_FIELD_ONLY_CONTROLS_ATTR,
    );
    if (sourceValue === null) {
      editedFields[idx].removeAttribute(INTERNAL_FIELD_ONLY_CONTROLS_ATTR);
      continue;
    }
    editedFields[idx].setAttribute(INTERNAL_FIELD_ONLY_CONTROLS_ATTR, sourceValue);
  }
}

export function mergePreviewOnlyElements(
  originalMarkup: string,
  editedMarkup: string,
): string {
  const hasPreviewOnlyElements = originalMarkup.includes(
    "data-playground-ignore-controls",
  );
  const hasInternalFieldAttributes = originalMarkup.includes(
    INTERNAL_FIELD_ONLY_CONTROLS_ATTR,
  );
  const hasUnwrapWrappers = originalMarkup.includes("data-playground-unwrap");
  if (!hasPreviewOnlyElements && !hasInternalFieldAttributes && !hasUnwrapWrappers) return editedMarkup;

  const parser = new DOMParser();
  const originalDoc = parser.parseFromString(`<div>${originalMarkup}</div>`, "text/html");
  const editedDoc = parser.parseFromString(`<div>${editedMarkup}</div>`, "text/html");
  const originalRoot = originalDoc.body.firstElementChild as HTMLElement | null;
  const editedRoot = editedDoc.body.firstElementChild as HTMLElement | null;
  if (!originalRoot || !editedRoot) return editedMarkup;

  if (hasPreviewOnlyElements) {
    const previewOnlyTopLevel = Array.from(originalRoot.children).filter(
      (el) => el.getAttribute("data-playground-ignore-controls") === "true",
    );
    previewOnlyTopLevel.reverse().forEach((el) => {
      editedRoot.prepend(el.cloneNode(true));
    });
  }

  if (hasInternalFieldAttributes) {
    mergeInternalFieldAttributes(originalRoot, editedRoot);
  }

  if (hasUnwrapWrappers) {
    const wrappers = Array.from(
      originalRoot.querySelectorAll('[data-playground-unwrap="true"]'),
    );
    for (const wrapper of wrappers) {
      const clone = wrapper.cloneNode(false) as HTMLElement;
      clone.innerHTML = "";
      while (editedRoot.firstChild) {
        clone.appendChild(editedRoot.firstChild);
      }
      editedRoot.appendChild(clone);
    }
  }

  if (originalMarkup.includes("data-playground-")) {
    const originalEls = Array.from(originalRoot.querySelectorAll("*"));
    const editedEls = Array.from(editedRoot.querySelectorAll("*"));
    for (const origEl of originalEls) {
      for (const attr of Array.from(origEl.attributes)) {
        if (!attr.name.startsWith("data-playground-")) continue;
        if (attr.name === "data-playground-unwrap") continue;
        if (attr.name === "data-playground-ignore-controls") continue;
        if (attr.name === INTERNAL_FIELD_ONLY_CONTROLS_ATTR) continue;
        const tag = origEl.tagName.toLowerCase();
        const match = editedEls.find((el) => el.tagName.toLowerCase() === tag);
        if (match) match.setAttribute(attr.name, attr.value);
      }
    }
  }

  return dedentMarkup(singleQuoteAttrs(editedRoot.innerHTML));
}

export function getInjectedExampleMarkup(markup: string): string {
  const trimmed = normalizeMarkup(markup);
  const content = unwrapPropPanel(trimmed) ?? trimmed;
  return `<div class="${PROP_PANEL_CLASS}">\n${content}\n</div>`;
}
