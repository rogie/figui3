---
name: fig-editor
description: >-
  Guides FigUI3 editor bundle (`fig-editor.js` / `fig-editor.css`): fig-select,
  fig-select-options, fig-select-option, fig-fill-picker, and fig-interpolation-swatch.
  Use when building custom selects, grouped option lists, sticky separators, ghost
  selects, fill picker dialogs, or interpolation swatches. Playground: /figui3#select
  and /figui3#fill-picker with the Full editor toggle. Requires fig.js.
user-invocable: false
---

# FigUI3 editor (`fig-editor.js`)

Custom select and full fill-picker. Not in core `fig.js`.

Canonical examples: `/figui3#select`, `/figui3#fill-picker` (enable **Full editor** in the playground theme menu). Markup: `playground/src/data/figui3Sections.ts`. Attrs: `playground/src/lib/attributeRules.ts`.

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

## `fig-select`

Use this instead of `fig-dropdown` for Figma-style menus (rich options, groups, overflow).

### Markup

Author options in `fig-select-options`, or pass `options` (comma / newline / JSON — same as `fig-options`).

```html
<fig-select value="center" label="Align">
  <fig-select-options>
    <fig-select-option value="left">Left</fig-select-option>
    <fig-select-option value="center">Center</fig-select-option>
    <fig-select-option value="right">Right</fig-select-option>
  </fig-select-options>
</fig-select>

<fig-select label="Align" value="Center" options="Left,Center,Right"></fig-select>
```

Rich options: put extra content inside `fig-select-option` and set `label` for the closed trigger text. Use `slot="panel"` on `fig-select-options` when the panel is slotted (playground “verbose” / AI models examples).

```html
<fig-select value="uuid" label="Version" full>
  <fig-select-options slot="panel">
    <fig-select-option value="uuid" label="Current (Version 6)">
      <strong>Current</strong>
      <span>Version 6</span>
    </fig-select-option>
  </fig-select-options>
</fig-select>
```

### Attributes

| Attr | Notes |
|---|---|
| `value` | Selected option value |
| `label` | Closed-state / aria label |
| `options` | Generated options if no authored `fig-select-option` |
| `variant` | `ghost` — no border, hover `--figma-color-bg-secondary` |
| `full` | Stretch width |
| `disabled` | Presence |
| `position` | `bottom left` (default), `bottom right`, `top left`, `top right`, `bottom center`, `top center` |
| `offset`, `closedby`, `open` | Forwarded to internal `fig-popup` |

Same `variant="ghost"` exists on core `fig-dropdown`.

### Groups and sticky separators

```html
<fig-select-options>
  <fig-separator label="Darken" sticky></fig-separator>
  <fig-select-option value="multiply">Multiply</fig-select-option>
  <fig-separator label="Lighten" sticky></fig-separator>
  <fig-select-option value="screen">Screen</fig-select-option>
</fig-select-options>
```

- First separator in a panel is auto-`borderless`.
- `sticky` on `fig-separator` pins the label while scrolling.
- Overflow adds `.overflow-start` / `.overflow-end` on `fig-select-options`. Sticky `top` sits below the overflow chevron (`--fig-vertical-overflow-size`).

Playground: `#select` examples `grouped`, `many-options`; AI models list in `figui3Sections.ts` (`aiModelSelectMarkup()`). Sticky toggle is a playground inspector concern (`?_sticky=1`), not a select host attr.

### Behavior

- Internal popup uses `popover="manual"` (top layer) so the list positions correctly inside `fig-popup variant="popover"` (CSS `filter` containing block).
- List `min-width` matches the trigger; `max-width` is `min(20rem, calc(100vw - 1rem))`.
- Overflow: top/bottom chevron buttons, not a native scrollbar.
- Keyboard: open, arrow, typeahead, Escape.
- `optionhover` fires on pointer-over with the option value in `event.detail` without changing selection.
- `input` / `change` on value commit. Do not `stopPropagation` on option click (React light-DOM handlers must run).

### `fig-select` vs `fig-dropdown` vs `propskit-select`

- `fig-dropdown` (core): native `<select>`.
- `fig-select` (this skill): custom listbox.
- `propskit-select` (lab): labeled `fig-field` wrapping `fig-select` (falls back if select is not registered).

## `fig-fill-picker`

Full fill editor. Core `fig-input-color` / `fig-input-fill` auto-open it when registered. Standalone:

```html
<fig-fill-picker value='{"type":"solid","color":"#FF5733"}'>
  <fig-swatch></fig-swatch>
</fig-fill-picker>
```

Playground: `#fill-picker` — `all-modes`, `solid`, `gradient`, `image`, `video`, `webcam`, `shader` (custom `slot="mode-shader"`).

| Attr | Notes |
|---|---|
| `value` | JSON fill object or string |
| `alpha` | `"true"` default; hide alpha with `"false"` |
| `mode` | Lock modes: `solid`, `gradient`, `image`, `video`, `webcam`, comma-separated, plus custom names |
| `disabled` | Presence |
| `webcam-mode` | `live` (default) or `snapshot`. Webcam tab starts the camera. Capture writes a still and switches to Image |
| `default-video` | Sample clip URL when Video has no file |

Events: `input` / `change` with fill payload in `detail`. `webcamstream` with `{ stream, deviceId }`. Live camera is `webcamStream` / `releaseWebcam()`, never JSON.

Value shapes:

```txt
solid   { type, colorSpace, color, alpha, hsv }
gradient { type, colorSpace, gradient, css }
image   { type, colorSpace, image: { url, scaleMode, scale } }          // scaleMode includes tile
video   { type, colorSpace, video: { url, poster, scaleMode, scale, opacity } }  // fill | fit | crop
webcam  { type, colorSpace, webcam: { live, snapshot, deviceId, scaleMode, scale, opacity } }
custom  { type: <modeName>, ...payload }
```

Legacy `{ type: "webcam", image: { url } }` still parses as `webcam.snapshot` for one release. `fig-input-fill` uses the same `webcam` / `video.poster` shapes.

`fig-input-color` expects solid data (`detail.color`, optional `detail.alpha`). Keep legacy `value` / `hex` / `rgba` on color input events.

Do not use `picker` or `picker-anchor` on `fig-input-color`. Forward picker chrome with `picker-*` (e.g. `picker-dialog-position`).

### Custom modes (vanilla)

```html
<fig-input-fill mode="solid,tokens" value='{"type":"tokens"}'>
  <div slot="mode-tokens" label="Tokens">Token UI</div>
</fig-input-fill>
```

Child `slot="mode-<name>"` plus `<name>` in `mode`. `fig-input-fill` forwards those slots to the inner picker and uses image-style chrome (type label + opacity). Custom content must dispatch `input` / `change` with `detail` so the picker stores mode data.

### Custom modes (React)

1. Include the mode name in `mode`.
2. Listen for `modeready`; mount into `e.detail.container`.
3. Do not reparent React-owned DOM after render.
4. One React root per container; `unmount()` on host unmount; remove `modeready` listeners.

## `fig-interpolation-swatch`

Preview for gradient interpolation (linear or polar hue arc). Playground attrs: `size="small|large"`. Can be used standalone with a gradient `value`. The fill picker interpolation row is hidden for now and locks to `srgb`.

## Maintainer notes

- Implementation: `fig-editor.js`, styles: `fig-editor.css`
- Do not move fill-picker or select into `fig.js`
- Nested overlay positioning: keep `popover="manual"` on the select popup
- Tests: `tests/figui/component-contracts.spec.ts` (ghost variant, sticky separator vs overflow-start)
