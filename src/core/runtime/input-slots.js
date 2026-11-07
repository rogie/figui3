/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import { FigTooltip } from "../components/fig-tooltip.js";

function figNormalizeTextOnlyInputSlots(host) {
  host
    .querySelectorAll(':scope > [slot="prepend"], :scope > [slot="append"]')
    .forEach((node) => {
      if (node.children.length > 0) {
        figClearInputSlotTooltip(node);
        return;
      }
      const text = node.textContent.trim();
      if (!text) {
        figClearInputSlotTooltip(node);
        return;
      }
      const previousFullText = node.dataset.figInputSlotFullText || "";
      const previousShortText = previousFullText
        ? Array.from(previousFullText)[0]?.toUpperCase()
        : "";
      const fullText = text === previousShortText ? previousFullText : text;
      const first = Array.from(text)[0];
      const normalized = first.toUpperCase();
      if (node.textContent !== normalized) node.textContent = normalized;
      if (fullText && fullText !== normalized) {
        node.dataset.figInputSlotFullText = fullText;
        node.setAttribute("aria-label", fullText);
        figBindInputSlotTooltip(node);
      } else {
        figClearInputSlotTooltip(node);
      }
    });
}

function figBindInputSlotTooltip(node) {
  if (node.dataset.figInputSlotTooltipBound === "true") return;
  node.dataset.figInputSlotTooltipBound = "true";
  node.addEventListener("pointerenter", figShowInputSlotTooltip);
  node.addEventListener("pointerleave", figHideInputSlotTooltip);
  node.addEventListener("focus", figShowInputSlotTooltip);
  node.addEventListener("blur", figHideInputSlotTooltip);
}

function figClearInputSlotTooltip(node) {
  figHideInputSlotTooltip({ currentTarget: node });
  delete node.dataset.figInputSlotFullText;
  node.removeAttribute("aria-label");
}

function figShowInputSlotTooltip(event) {
  const node = event.currentTarget;
  const text = node?.dataset?.figInputSlotFullText;
  if (!node || !text) return;
  FigTooltip.show(node, text);
}

function figHideInputSlotTooltip(event) {
  const node = event.currentTarget;
  if (!node) return;
  FigTooltip.hide(node);
}

export { figNormalizeTextOnlyInputSlots };
