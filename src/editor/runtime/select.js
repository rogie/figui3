/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
import { figEditorCreateIcon } from "./helpers.js";

function figSelectOptionEnsureCheckmark(option) {
  let icon = option.querySelector(
    ":scope > fig-icon[data-fig-select-checkmark]",
  );
  if (icon) return icon;
  icon = figEditorCreateIcon("checkmark", {
    size: "small",
    className: "fig-select-option-checkmark",
  });
  icon.setAttribute("slot", "prepend");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("data-fig-select-checkmark", "");
  option.append(icon);
  return icon;
}

export { figSelectOptionEnsureCheckmark };
