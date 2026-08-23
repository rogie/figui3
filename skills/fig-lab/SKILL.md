---
name: fig-lab
description: >-
  Guides FigUI3 lab bundle (`fig-lab.js` / `fig-lab.css`): experimental propskit-*
  property controls, fig-canvas-control, fig-input-angle, fig-reorder, and AI composer
  components (fig-ai-prompt, fig-ai-context, fig-chat-message, fig-attachment). Use when
  building labeled property panels, canvas handles, oscillators, reorder lists, or AI
  chat UIs. Playground: /propskit/lab. APIs are unstable.
user-invocable: false
---

# FigUI3 lab (`fig-lab.js`)

Experimental components. May change or be removed without notice.

Canonical examples: `/propskit/lab` (`playground/src/data/labSections.ts`).
Attrs: `playground/src/lib/attributeRules.ts`.
`/propskit` (raw `fig-field` rows) is the `propkit` skill, not this one.

## Install

```js
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
import "@rogieking/figui3/fig-lab.css";
import "@rogieking/figui3/fig-lab.js";
```

`propskit-select` prefers `fig-select` (import `fig-editor.js` + `fig-editor.css`). Without editor, it falls back.

`fig-editor.js` already imports `fig-lab.js`; lab **CSS** is still required for lab visuals.

## Catalog

Playground hashes: `/propskit/lab#{id}`.

### Propskit (labeled property controls)

Full-surface `fig-field` wrappers. Prefer these over hand-rolled label+control rows when building lab/property UIs.

Shared:

- `label`, `direction` (`horizontal` default for most), `size` (`""` | `large`), `disabled`
- `default` — reset target (may differ from initial `value`)
- Right-click **Reset** menu; `resetToDefault()`
- `propskit-slider` also double-click resets
- Forward remaining attrs to the inner control

| Tag | Playground | Inner control | Notes |
|---|---|---|---|
| `propskit-switch` | `#propskit-switch` | `fig-switch` | `checked`, `default` boolean |
| `propskit-color` | `#propskit-color` | `fig-fill-picker` + `fig-swatch` | Solid swatch, same size as gradient. Clicking the field opens the picker. Focus ring on the field, not the swatch. `alpha` default true |
| `propskit-fill` | `#propskit-fill` | `fig-fill-picker` + `fig-swatch` | Same chrome as color. Clicking the field opens the picker. Focus ring on the field, not the swatch. Full fill JSON (`solid` / `gradient` / `image` / `video` / `webcam` / custom). Forwards `mode-*` slots |
| `propskit-gradient` | `#propskit-gradient` | `fig-input-gradient` | Default `edit="picker"`. Clicking the field opens the picker. Focus ring on the field, not the gradient. `mode="handle\|tip"` for inline edit |
| `propskit-select` | `#propskit-select` | `fig-select` | `options` or slotted `fig-select-options` |
| `propskit-text` | `#propskit-text` | `fig-input-text` | `type`, `readonly` |
| `propskit-number` | `#propskit-number` | `fig-input-number` | `min`, `max`, `step`, `precision`, `units`, `steppers` |
| `propskit-slider` | `#propskit-slider` | `fig-slider` | `type` range/hue/delta/stepper/opacity; `elastic` default true |
| `propskit-position` | `#propskit-position` | two numbers | `x`, `y`, `units="percent"` |
| `propskit-color-point` | `#propskit-color-point` | color + position | JSON `value`; `collapsible`, `open` |
| `propskit-point-radius` | `#propskit-point-radius` | position + radius | JSON `value` |
| `propskit-point-radius-angle` | `#propskit-point-radius-angle` | + angle | JSON `value` |
| `propskit-point-point` | `#propskit-point-point` | start/end | `{ x, y, x2, y2 }` |
| `propskit-group` | `#propskit-group` | group chrome | `name`, `open`, `show-reset` |
| `propskit-oscillator` | `#oscillator` | waveform editor | JSON `waves`; `edit`, `precision`, `aspect-ratio` |

```html
<propskit-slider
  label="Opacity"
  direction="horizontal"
  type="opacity"
  value="100"
  default="100"
  min="0"
  max="100"
  units="%"
></propskit-slider>

<propskit-select label="Blend" value="multiply" options="Normal,Multiply,Screen"></propskit-select>
```

Rich select (requires editor):

```html
<propskit-select label="Space" value="oklab">
  <fig-select-options slot="panel">
    <fig-select-option value="srgb" label="Classic">…</fig-select-option>
  </fig-select-options>
</propskit-select>
```

### Canvas and spatial

| Tag | Playground | Notes |
|---|---|---|
| `fig-canvas-control` | `#canvas-control` | Overlay on a positioned parent. `type`: `point` (default), `color`, `point-radius`, `point-radius-angle`, `point-point`. `value` JSON `{x,y,radius?,angle?,x2?,y2?}`. `snapping="modifier\|true\|false"`, `name`, `tooltips`, `color` |
| `fig-input-angle` | `#angle` | Dial + optional text. `text`, `dial` default true, `rotations`, `min`/`max`/`units` |
| `fig-reorder` | `#reorder` | `display:contents` wrapper; drag-reorders **direct children**. `axis="vertical\|horizontal"`, `handle` CSS selector when rows contain nested controls. Event: `reorder` `{ oldIndex, newIndex, item }` |

```html
<div style="position:relative; aspect-ratio:1; width:100%">
  <fig-canvas-control
    type="point-radius-angle"
    name="Position"
    value='{"x":50,"y":50,"radius":60,"angle":45}'
    snapping="modifier"
  ></fig-canvas-control>
</div>
```

Omit `handle` on `fig-reorder` to drag whole rows. Set `handle` when children contain sliders/handles so those stay interactive.

### AI composer (presentation)

These are layout shells. Wire behavior yourself.

| Tag | Playground | Notes |
|---|---|---|
| `fig-ai-prompt` | `#ai-prompt` | Composer: slot `fig-input-text`, `fig-footer`, buttons, optional `fig-select` |
| `fig-ai-context` | (with prompt) | Open area above prompt for attachments/status |
| `fig-chat-message` | `#ai-chat-message` | `from="user\|agent"`. Optional `fig-avatar`, `fig-attachments` |
| `fig-attachments` / `fig-attachment` | `#ai-attachments` | `src`, `name`, `value`, `removable` default true |

```html
<fig-chat-message from="user">
  Create a settings panel.
  <fig-attachments aria-label="Message attachments">
    <fig-attachment value="settings" name="settings.png" src="…" removable="false"></fig-attachment>
  </fig-attachments>
  <fig-avatar name="Rogie King"></fig-avatar>
</fig-chat-message>
<fig-chat-message from="agent">
  <fig-shimmer><span>Thinking…</span></fig-shimmer>
</fig-chat-message>
```

## Control choice

| Intent | Use |
|---|---|
| Labeled boolean | `propskit-switch` |
| Labeled continuous number | `propskit-slider` |
| Labeled exact number | `propskit-number` |
| Labeled text | `propskit-text` |
| Labeled discrete list | `propskit-select` (not `fig-dropdown`) |
| Labeled color / fill / gradient | `propskit-color` / `propskit-fill` / `propskit-gradient` |
| X/Y | `propskit-position` |
| Spatial on a canvas | `fig-canvas-control` |
| Angle | `fig-input-angle` |
| Section of props | `propskit-group` or core `fig-group` |
| Reorder rows | `fig-reorder` |

Raw `fig-field` + core control is still valid (see `propkit` skill / `/propskit`).

## Maintainer notes

- Implementation: `fig-lab.js`, styles: `fig-lab.css`
- Keep lab out of `fig.js`
- Playground loads lab only on `/propskit` and `/propskit/lab`
- Update `labSections.ts` + `attributeRules.ts` with API changes
