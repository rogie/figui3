/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/

export const stringAttribute = (label) => ({ label, type: "string" });
export const numberAttribute = (label, constraints = {}) => ({
  label,
  type: "number",
  ...constraints,
});
export const booleanAttribute = (
  label,
  boolMode = "presence",
  defaultChecked,
) => ({
  label,
  type: "boolean",
  boolMode,
  ...(defaultChecked === undefined ? {} : { defaultChecked }),
});
export const enumAttribute = (label, options) => ({
  label,
  type: "enum",
  options,
});
export const nameAttribute = stringAttribute("Name");

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
