---
name: fig-editor
description: >-
  Guides FigUI3 editor bundle (`fig-editor.js` / `fig-editor.css`): fig-select,
  fig-select-options, fig-select-option, fig-fill-picker, and fig-interpolation-swatch,
  including React JSX usage. Use when building custom selects, grouped option lists,
  sticky separators, ghost selects, fill picker dialogs, or interpolation swatches.
  Requires fig.js.
user-invocable: false
---

# FigUI3 editor (`fig-editor.js`)

Custom select and full fill-picker. Not in core `fig.js`.

React: [../figui3/react.md](../figui3/react.md). Per-tag JSX: [components.md](components.md). Attrs: [reference.md](reference.md).

See also: `figui3` (core), `fig-lab` (`propskit-select` wraps this select).

## Install

```js
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
import "@rogieking/figui3/fig-editor.css";
import "@rogieking/figui3/fig-editor.js";
```

`fig-editor.js` imports `fig.js` and `fig-lab.js`. Still import `fig-editor.css`. Import `fig-lab.css` if lab visuals are needed.

Registered tags:

| Tag | Role |
|---|---|
| `fig-select` | Trigger + popup listbox |
| `fig-select-options` | Scrollable panel (`slot="panel"`), overflow chevrons |
| `fig-select-option` | Option (`value`, `label`, `selected`, `disabled`) |
| `fig-fill-picker` | Full fill editor dialog (solid, gradient, image, video, webcam, custom modes) |
| `fig-interpolation-swatch` | Gradient interpolation preview swatch |

## `fig-select` vs `fig-dropdown` vs `propskit-select`

- `fig-dropdown` (core): native `<select>`.
- `fig-select` (this skill): custom listbox. Use this for Figma-style menus.
- `propskit-select` (lab): labeled `fig-field` wrapping `fig-select` (falls back if select is not registered).

Author options as React children, or pass `options`. Do not `stopPropagation` on option click. `optionhover` is a native listener.

## Fill picker

Core `fig-input-color` / `fig-input-fill` auto-open the picker when registered. Custom modes: `slot="mode-<name>"` on `fig-input-fill`, or React `modeready` → mount into `e.detail.container` (do not reparent).

Do not use `picker` or `picker-anchor` on `fig-input-color`. Forward picker chrome with `picker-*`.

## Maintainer notes

- Implementation: `fig-editor.js`, styles: `fig-editor.css`
- Do not move fill-picker or select into `fig.js`
- Nested overlay positioning: keep `popover="manual"` on the select popup
- Tests: `tests/figui/component-contracts.spec.ts` (ghost variant, sticky separator vs overflow-start)
