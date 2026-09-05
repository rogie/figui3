# FigUI3 editor components (`fig-editor.js`)

React contract: [../figui3/react.md](../figui3/react.md). Attrs: [reference.md](reference.md).

Install `fig-editor.css` + `fig-editor.js` (pulls in `fig.js` and `fig-lab.js`). Still import `fig-editor.css`. Import `fig-lab.css` if lab visuals are needed.

## `fig-select`

Figma-style listbox. Prefer this over core `fig-dropdown`.

```tsx
<fig-select value={align} label="Align" full onChange={onChange}>
  <fig-select-options>
    <fig-select-option value="left">Left</fig-select-option>
    <fig-select-option value="center">Center</fig-select-option>
    <fig-select-option value="right">Right</fig-select-option>
  </fig-select-options>
</fig-select>
```

Data-driven (no authored options):

```tsx
<fig-select
  label="Align"
  value={align}
  options="Left,Center,Right"
  onChange={onChange}
/>
```

- Attrs: `value`, `label`, `options` (comma / newline / JSON), `variant` (`ghost`), `full`, `disabled`, `position` (`bottom left` default, also `bottom right`, `top left`, `top right`, `bottom center`, `top center`), `offset`, `closedby`, `open`
- Events: `input` / `change` on commit; `optionhover` with the option value in `detail` (does not change selection). Use a native listener for `optionhover`.
- Do not `stopPropagation` on option click — React light-DOM handlers must run.
- Internal popup uses `popover="manual"` so the list works inside `fig-popup variant="popover"`.
- List `min-width` matches the trigger; `max-width` is `min(20rem, calc(100vw - 1rem))`. Overflow: chevron buttons, not a native scrollbar.

`fig-dropdown` (core) is a native `<select>`. `propskit-select` (lab) wraps this select.

## `fig-select-options`

```tsx
<fig-select-options slot="panel">
  <fig-separator label="Darken" sticky />
  <fig-select-option value="multiply">Multiply</fig-select-option>
  <fig-separator label="Lighten" sticky />
  <fig-select-option value="screen">Screen</fig-select-option>
</fig-select-options>
```

- Auto `slot="panel"` if missing. Use `slot="panel"` when the panel is slotted (rich / verbose options).
- First `fig-separator` child is auto-`borderless`. `sticky` pins the label while scrolling.
- Overflow adds `.overflow-start` / `.overflow-end`. Sticky `top` sits below the overflow chevron (`--fig-vertical-overflow-size`).
- Methods: `syncOverflow()`, `scrollToOption(option, behavior)`.
- Options stay in light DOM. Author them as React children.

## `fig-select-option`

```tsx
<fig-select-option value="uuid" label="Current (Version 6)">
  <strong>Current</strong>
  <span>Version 6</span>
</fig-select-option>
```

- Attrs: `value` (falls back to trimmed `textContent`), `label` (closed-trigger text when content is rich), `selected`, `disabled`
- `role="option"`, `aria-selected`, `aria-disabled`

## `fig-fill-picker`

Full fill editor. Core `fig-input-color` / `fig-input-fill` auto-open it when this tag is registered.

```tsx
<fig-fill-picker
  value='{"type":"solid","color":"#FF5733"}'
  onInput={onInput}
  onChange={onChange}
>
  <fig-swatch />
</fig-fill-picker>
```

- Attrs: `value` (JSON fill or string), `alpha` (`"true"` default; `"false"` hides), `mode` (`solid`, `gradient`, `image`, `video`, `webcam`, comma-separated, plus custom names), `disabled`, `webcam-mode` (`live` | `snapshot`), `default-video`
- Events: `input` / `change` with fill payload in `detail`; `webcamstream` with `{ stream, deviceId }`
- Live camera is `webcamStream` / `releaseWebcam()`, never JSON.

Value shapes:

```txt
solid    { type, colorSpace, color, alpha, hsv }
gradient { type, colorSpace, gradient, css }
image    { type, colorSpace, image: { url, scaleMode, scale } }
video    { type, colorSpace, video: { url, poster, scaleMode, scale, opacity } }
webcam   { type, colorSpace, webcam: { live, snapshot, deviceId, scaleMode, scale, opacity } }
custom   { type: <modeName>, ...payload }
```

`fig-input-color` expects solid data (`detail.color`, optional `detail.alpha`). Keep legacy `value` / `hex` / `rgba` on color input events.

Do not use `picker` or `picker-anchor` on `fig-input-color`. Forward picker chrome with `picker-*` (e.g. `picker-dialog-position`).

### Custom modes

On `fig-input-fill` (forwards `mode-*` slots to the inner picker, image-style chrome):

```tsx
<fig-input-fill mode="solid,tokens" value='{"type":"tokens"}'>
  <div slot="mode-tokens" label="Tokens">
    Token UI
  </div>
</fig-input-fill>
```

Vanilla: child `slot="mode-<name>"` plus `<name>` in `mode`. Dispatch `input` / `change` with `detail` so the picker stores `{ type: "<name>", …detail }`.

React:

1. Include the mode name in `mode`.
2. Listen for `modeready`; mount into `e.detail.container`.
3. Do not reparent React-owned DOM after render.
4. One React root per container; `unmount()` on host unmount; remove `modeready` listeners.

## `fig-interpolation-swatch`

```tsx
<fig-interpolation-swatch
  size="large"
  value={gradientJson}
  onInput={onInput}
/>
```

- Attrs: `value` (gradient payload), `size` (`small` | `large`)
- Standalone preview of linear or polar hue interpolation. The fill-picker interpolation row is hidden and locks to `srgb`.
