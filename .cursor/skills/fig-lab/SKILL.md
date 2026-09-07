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

`propskit-select` and `propskit-palette` render `fig-select`; import `fig-editor.js` + `fig-editor.css` to register and style them.

`fig-editor.js` already imports `fig-lab.js`; lab **CSS** is still required for lab visuals.

## Shared propskit

- Plain labeled component surfaces; joystick, origin, easing, spring, and image
  use a vertical label-above-control layout. Editable select is intentionally
  label-free with separate edit and add actions.
- `label` (omitted renders `"Label"`; `label=""` hides it), `disabled`
- Optional `name` reflects to the host and appears in event details only when non-empty
- `default` — reset target (may differ from initial `value`)
- Right-click **Reset** menu; `resetToDefault()` on a ref
- `propskit-slider` also double-click resets
- Forward remaining attrs to the inner control except where a component note says otherwise
- `input` / `change`: `{ control, value, name? }`, dispatched from the outer host; `event.target.value === event.detail.value`. Select `optionhover` uses the same envelope
- Switch values are boolean; numeric number/slider/wheel values are finite numbers or `null`; structured and serialized values exactly match the host `.value`
- Shared style variables use `--propskit-{padding-block,padding-inline,background,border,color,hover-background,hover-border,hover-color,label-inline-size,input-inline-size}`; use a tag prefix such as `--propskit-select-background` for one control

## Control choice

| Intent | Use |
|---|---|
| Labeled boolean | `propskit-switch` (`fig-switch` by default; `variant="segmented-control"` for Off/On choices) |
| Labeled continuous number | `propskit-slider` |
| Standalone scrubbable number | `fig-input-wheel` |
| Labeled scrubbable number or time | `propskit-wheel` |
| Labeled exact number | `propskit-number` |
| Labeled text | `propskit-text` |
| Labeled discrete list | `propskit-select` (not `fig-dropdown`) |
| Editable / removable discrete list | `propskit-editable-select` |
| Labeled palette choice | `propskit-palette` |
| Labeled image choice/upload | `propskit-image` |
| Labeled color / fill / gradient | `propskit-color` / `propskit-fill` / `propskit-gradient` |
| X/Y | `propskit-position` |
| Interactive X/Y plane | `propskit-joystick` |
| Transform origin | `propskit-origin` |
| Cubic-bezier easing | `propskit-easing` |
| Spring motion | `propskit-spring` |
| Spatial on a canvas | `fig-canvas-control` |
| Angle | `fig-input-angle` |
| Section of props | `propskit-group` or core `fig-group` |
| Reorder rows | `fig-reorder` |

Raw `fig-field` + core control is still valid (see `propkit` skill).

## Maintainer notes

- Implementation: `fig-lab.js`, styles: `fig-lab.css`
- Keep lab out of `fig.js`
