---
name: fig-editor
description: >-
  Guides FigUI3 editor bundle (`fig-editor.js` / `fig-editor.css`): fig-select,
  fig-select-options, fig-select-option, fig-property, fig-input-point,
  fig-fill-picker, fig-palette-editor, fig-reorder, and fig-interpolation-swatch,
  including React JSX usage. Use when building custom selects, grouped option lists,
  sticky separators, ghost selects, composable property rows, fill picker dialogs,
  reorderable lists, or interpolation swatches.
  Requires fig.js.
user-invocable: false
---

# FigUI3 editor (`fig-editor.js`)

Custom selects, property rows, point inputs, and full fill editing. Not in core `fig.js`.

React: [../figui3/react.md](../figui3/react.md). Per-tag JSX: [components.md](components.md). Attrs: [reference.md](reference.md).


## Install

```js
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
import "@rogieking/figui3/fig-editor.css";
import "@rogieking/figui3/fig-editor.js";
```

`fig-editor.js` imports `fig.js`. Still import `fig-editor.css`.

Registered tags:

| Tag | Role |
|---|---|
| `fig-select` | Trigger + popup listbox (`subtle` applies to all options) |
| `fig-select-options` | Scrollable panel (`slot="panel"`), overflow chevrons |
| `fig-select-option` | Option (`value`, `label`, `selected`, `disabled`, `subtle`) |
| `fig-fill-picker` | Full fill editor dialog (solid, gradient, image, video, webcam, custom modes) |
| `fig-property` | Composable property row with leading, input, and trailing slots |
| `fig-input-point` | Paired X/Y numeric point input |
| `fig-palette-editor` | Ordered palette editor |
| `fig-reorder` | Pointer- and keyboard-reorderable direct-child list |
| `fig-interpolation-swatch` | Gradient interpolation preview swatch |


- `fig-dropdown` (core): native `<select>`.
- `fig-select` (this skill): custom listbox. Use this for Figma-style menus.

Author options as React children, or pass `options`. Set `menu-anchor` to a selector or assign an element to `menuAnchor` when the menu should align against another element. Do not `stopPropagation` on option click. `optionhover` and `optionfocus` are native preview listeners.

## Fill picker

Core `fig-input-color` / `fig-input-fill` auto-open the picker when registered. Custom modes: `slot="mode-<name>"` on `fig-input-fill`, or React `modeready` → mount into `e.detail.container` (do not reparent).

Do not use `picker` or `picker-anchor` on `fig-input-color`. Forward picker chrome with `picker-*`.

## Maintainer notes

- Implementation: `fig-editor.js` / `fig-editor.css`; property row: `fig-property.js` / `fig-property.css` (imported by the editor bundle)
- Do not move fill-picker or select into `fig.js`
- Nested overlay positioning: keep `popover="manual"` on the select popup
- Tests: `tests/figui/component-contracts.spec.ts` (ghost variant, sticky separator vs overflow-start)
