export const EDITOR_SECTION_IDS = new Set([
  "input-point",
  "property",
  "palette-editor",
  "reorder",
  "select",
  "fill-picker",
  "layer",
  "toast",
]);

const EDITOR_GATED_SECTION_IDS = new Set(["fill-input"]);

export function requiresEditorControls(sectionId: string): boolean {
  return (
    EDITOR_SECTION_IDS.has(sectionId) ||
    EDITOR_GATED_SECTION_IDS.has(sectionId)
  );
}

export function hashRequiresEditorControls(hash: string): boolean {
  const sectionId = hash.replace(/^#/, "").split("/")[0];
  return Boolean(sectionId && requiresEditorControls(sectionId));
}
