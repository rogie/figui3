---
name: a11y
description: Guides accessibility review and implementation for FigUI3 web components and playground examples. Use when the user mentions accessibility, a11y, ARIA, screen readers, keyboard navigation, focus rings, labels, roles, disabled states, contrast, dialogs, menus, or form control semantics.
---

# Accessibility

Use this skill when adding, reviewing, or debugging accessibility behavior in FigUI3.

## Core Principles

1. Preserve native semantics first. Use native controls, form labels, `button`, `input`, `dialog`, and real focus behavior where possible.
2. Add ARIA only to complete semantics, not to replace correct markup.
3. Keyboard support is required for every interactive component.
4. Disabled and readonly states must affect behavior, focusability, ARIA, visuals, and emitted events consistently.
5. Focus indicators must be visible, token-based, and match existing FigUI3 patterns.
6. Custom elements must keep semantics stable across light/dark themes and React usage.

## Implementation Checklist

- Confirm the component role and accessible name.
- Confirm keyboard entry, movement, activation, escape/cancel, and tab order.
- Confirm focus rings on the visible interactive surface.
- Confirm `disabled` syncs to `aria-disabled` where the element is not natively disableable.
- Confirm disabled elements do not emit normal interaction changes.
- Confirm `aria-*`, `role`, and `tabindex` are updated when attributes change dynamically.
- Confirm customized built-ins like `<dialog is="fig-dialog">` and `<dialog is="fig-popup">` preserve native dialog behavior.
- Confirm playground examples demonstrate accessible usage.

## FigUI3 Patterns

### Disabled custom elements

For non-native interactive custom elements:

```js
const disabled =
  this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";

if (disabled) {
  this.setAttribute("aria-disabled", "true");
  this.setAttribute("tabindex", "-1");
} else {
  this.removeAttribute("aria-disabled");
  this.setAttribute("tabindex", "0");
}
```

If a component uses roving tabindex, keep inactive and disabled items at `tabindex="-1"`.

### Focus rings

Prefer existing token patterns:

```css
&:focus-visible,
&[data-focus-visible] {
  outline: 0;
  box-shadow: inset 0 0 0 1px var(--figma-color-border-selected);
}
```

If focus lands on a hidden native input, apply the ring to the visible host surface:

```css
fig-button:has(> input:focus-visible) {
  outline: 0;
  box-shadow: inset 0 0 0 1px var(--figma-color-border-selected);
}
```

### Menus

- Menu popups use `role="menu"`.
- Items use `role="menuitem"`.
- Disabled menu items should have `aria-disabled="true"` and should not be included in roving keyboard focus.
- Arrow keys should skip disabled items.

### Dialogs and popups

- Use `<dialog is="fig-dialog">` for dialog workflows.
- Use `<dialog is="fig-popup">` for anchored popup surfaces.
- Verify close buttons have accessible names, usually `aria-label="Close dialog"`.
- Preserve native `close`/`cancel` behavior unless intentionally overridden.

## Review Output

When reviewing a11y work, lead with concrete issues:

- Missing or incorrect role/name/state.
- Keyboard trap or unreachable interaction.
- Focus ring missing on visible surface.
- Disabled state mismatch between behavior and semantics.
- Screen reader announcement likely misleading.

Include the component and file path for each finding.
