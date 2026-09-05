---
name: fig-lab
description: >-
  Guides FigUI3 lab bundle (`fig-lab.js` / `fig-lab.css`): experimental propskit-*
  property controls, fig-canvas-control, fig-input-angle, fig-input-wheel, fig-reorder,
  and AI composer components (fig-ai-prompt, fig-ai-context, fig-chat-message,
  fig-attachment), including React JSX usage. Use when building labeled property
  panels, canvas handles, oscillators, scrubbers, reorder lists, or AI chat UIs.
  APIs are unstable.
user-invocable: false
---

# FigUI3 lab (`fig-lab.js`)

Experimental components. May change or be removed without notice.

React: [../figui3/react.md](../figui3/react.md). Per-tag JSX: [components.md](components.md). Attrs: [reference.md](reference.md).

Raw `fig-field` rows are the `propkit` skill, not this one.

## Install

```js
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
import "@rogieking/figui3/fig-lab.css";
import "@rogieking/figui3/fig-lab.js";
```

`propskit-select` prefers `fig-select` (import `fig-editor.js` + `fig-editor.css`). Without editor, it falls back.

`fig-editor.js` already imports `fig-lab.js`; lab **CSS** is still required for lab visuals.

## Shared propskit

- `label`, `direction` (`horizontal` default), `size` (`""` | `small`; `large` remains an alias for the default), `disabled`
- `variant="minimal"` — removes vertical row padding and reveals the field background on hover
- `default` — reset target (may differ from initial `value`)
- Right-click **Reset** menu; `resetToDefault()` on a ref
- `propskit-slider` also double-click resets
- Forward remaining attrs to the inner control except where a component note says otherwise
- Rows are large by default; `propskit-group size="small"` applies compact sizing to children without an authored size

## Control choice

| Intent | Use |
|---|---|
| Labeled boolean | `propskit-switch` |
| Labeled continuous number | `propskit-slider` |
| Standalone scrubbable number | `fig-input-wheel` |
| Labeled scrubbable number or time | `propskit-wheel` |
| Labeled exact number | `propskit-number` |
| Labeled text | `propskit-text` |
| Labeled discrete list | `propskit-select` (not `fig-dropdown`) |
| Labeled color / fill / gradient | `propskit-color` / `propskit-fill` / `propskit-gradient` |
| X/Y | `propskit-position` |
| Spatial on a canvas | `fig-canvas-control` |
| Angle | `fig-input-angle` |
| Section of props | `propskit-group` or core `fig-group` |
| Reorder rows | `fig-reorder` |

Raw `fig-field` + core control is still valid (see `propkit` skill).

## Maintainer notes

- Implementation: `fig-lab.js`, styles: `fig-lab.css`
- Keep lab out of `fig.js`
