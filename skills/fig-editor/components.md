# FigUI3 editor components (`fig-editor.js`)

React contract: [../figui3/react.md](../figui3/react.md). Attrs: [reference.md](reference.md).

Install `fig-editor.css` + `fig-editor.js` (pulls in `fig.js`). Still import `fig-editor.css`.

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

- Attrs: `value`, `label`, `options` (comma / newline / JSON), `menu-anchor` (alternate anchor selector), `variant` (`ghost` | `input`), `size` (`large`, 32px trigger), `icon` (square chevron-only trigger; provide `aria-label`), `subtle` (applies the secondary hover/focus fill to every option), `full`, `disabled`, `position` (omit to overlay the selected option on the trigger; set `bottom left`, `bottom right`, `top left`, `top right`, `bottom center`, or `top center` to place the menu like a popup), `offset`, `closedby`, `open`
- Property: `menuAnchor` accepts an `Element`, selector string, or `null`. The menu matches the anchor width and centers its selected row over it; if the anchor is narrower than the menu’s usable minimum, default overlay mode centers the wider menu over the anchor. Clear it to restore trigger-text alignment. Explicit `position` keeps anchor-derived sizing while applying normal popup placement and edge alignment.
- Events: `input` / `change` on commit; `optionhover` for pointer previews; `optionfocus` for open-menu keyboard previews. Both preview events provide the option value in `detail` without changing selection and require native listeners.
- Do not `stopPropagation` on option click — React light-DOM handlers must run.
- Internal popup uses `popover="manual"` so the list works inside `fig-popup variant="popover"`.
- List `min-width` matches the trigger; `max-width` is `min(20rem, calc(100vw - 1rem))`. Overflow: chevron buttons, not a native scrollbar.


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
- A leading labeled `fig-separator` omits its rule. `sticky` pins the label while scrolling.
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

- Attrs: `value` (falls back to trimmed `textContent`), `label` (closed-trigger text when content is rich), `selected`, `disabled`, `subtle` (secondary hover/focus fill)
- `role="option"`, `aria-selected`, `aria-disabled`

## `fig-input-point`

```tsx
<fig-input-point
  x={String(point.x)}
  y={String(point.y)}
  units="%"
  full
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `x`, `y`, `units` (forwarded to both number inputs), `full`
- Renders two equally sized `fig-input-number` controls in a `fig-input-combo`.
- Events: `input` while editing and `change` on commit, with `{ x, y }`.

## `fig-property`

Default playground example (`/figui3#property/default`):

```html
<fig-property label="Size">
  <fig-input-number
    slot="input"
    value="16"
    units="px"
    steppers="true"
    full
  ></fig-input-number>
</fig-property>
```

Generated accessories:

```html
<fig-property
  label="Color"
  leading="drag"
  trailing="remove"
  show-leading="hover"
  show-trailing
>
  <fig-input-color slot="input" value="#0D99FF" text="true" full></fig-input-color>
</fig-property>
```

Authored trailing accessory (`/figui3#property/custom-accessory`):

```html
<fig-property label="Opacity" show-trailing>
  <fig-slider slot="input" value="75" min="0" max="100" units="%" text="true" full></fig-slider>
  <fig-button slot="trailing" variant="ghost" icon aria-label="Reset opacity">
    <fig-icon name="reset"></fig-icon>
  </fig-button>
</fig-property>
```

- Attrs: `label`, `leading` (`drag` | `chevron`), `trailing` (`remove` | `add` | `bind`), `show-leading`, `show-trailing`
- Slots: `input` (one direct primary control), `label`, `leading`, `trailing`
- Authored label markup overrides the `label` attribute.
- Authored accessory slots override generated shortcuts.
- Omitted or `"hover"` show attributes use hover visibility; `"false"` never shows the slot; an empty/present attribute always shows it.
- Generated trailing controls emit bubbling, composed `remove`, `add`, or `bind` events with the slotted control in `detail.input`.
- Child input events bubble unchanged.

## `fig-popup-easing`

Reusable easing dialog with an internal
`<fig-easing-curve aspect-ratio="4/3">`.

```html
<fig-button id="easing-trigger">Edit easing</fig-button>
<dialog
  is="fig-popup-easing"
  anchor="#easing-trigger"
  value="0.42, 0, 0.58, 1"
  open
></dialog>
```

- Attrs: `value`, `mode`, `precision`, `edit`, `presets`, `text`, plus inherited `fig-popup` attributes.
- Events: bubbling `input` / `change` forwarded from the easing curve.
- Create it as `<dialog is="fig-popup-easing">`, not `<fig-popup-easing>`.

## `fig-palette-editor`

Reusable ordered palette editor used by `fig-input-palette edit="picker"`.

```tsx
<fig-palette-editor
  value='["#94BD00","#83AD00","#1A632A","#003905"]'
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `value`, `min`, `max`, `fixed`, `disabled`
- `max` is unbounded when omitted.
- Events: `input` / `change` with the normalized ordered color array in `detail`
- Uses `fig-reorder` for pointer and keyboard reordering.

## `fig-gradient-editor`

Reusable full gradient editor used by the Gradient tab in `fig-fill-picker`.

```tsx
<fig-gradient-editor
  value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `value`, `color-space` (`srgb` | `display-p3`), `disabled`.
- Property: `value` is the normalized gradient config; `cssValue` is the rendered CSS gradient.
- Property: `pickerAnchor` accepts an element used to anchor nested stop color pickers.
- Events: `input` / `change` with `{ type: "gradient", gradient, css }`.
- Includes type, flip/rotate, stop bar, add/remove, and pointer/keyboard reorder controls.

## `fig-popup-gradient`

Reusable popup containing one `fig-gradient-editor`. It is the picker opened by
`fig-input-gradient edit="picker"`.

```html
<fig-button id="gradient-trigger">Edit gradient</fig-button>
<dialog
  is="fig-popup-gradient"
  anchor="#gradient-trigger"
  value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
  open
></dialog>
```

- Attrs: `value`, `color-space`, `disabled`, plus inherited `fig-popup` attributes.
- Events: bubbling `input` / `change` with `{ type: "gradient", gradient, css }`.
- Create it as `<dialog is="fig-popup-gradient">`.

## `fig-popup-palette`

Reusable palette dialog used by `fig-input-palette edit="picker"`. It extends
`fig-popup` and owns its `fig-palette-editor`.

```html
<fig-button id="palette-trigger">Edit palette</fig-button>
<dialog
  is="fig-popup-palette"
  anchor="#palette-trigger"
  value='["#94BD00","#83AD00","#1A632A","#003905"]'
  open
></dialog>
```

- Attrs: `value`, `min`, `max`, `fixed`, `disabled`, plus inherited `fig-popup` attributes.
- Property: `value` returns the normalized `{ color, alpha }[]`.
- Events: bubbling `input` / `change` with the normalized color array in `detail`.
- Create it as `<dialog is="fig-popup-palette">`, not `<fig-popup-palette>`.

## `fig-reorder`

```tsx
<fig-reorder axis="vertical" handle=".drag">
  {items.map((item) => (
    <div key={item.id} className="row">
      <button className="drag" type="button" aria-label="Reorder" />
      {item.label}
    </div>
  ))}
</fig-reorder>
```

Listen for `reorder` on a ref (`onReorder` is not a React-mapped event):

```tsx
useEffect(() => {
  const el = ref.current;
  if (!el) return;
  const handler = (event: Event) => {
    const { oldIndex, newIndex, item } = (event as CustomEvent).detail;
    onReorder({ oldIndex, newIndex, item });
  };
  el.addEventListener("reorder", handler);
  return () => el.removeEventListener("reorder", handler);
}, [onReorder]);
```

- `display: contents`. Reorders direct children.
- Attrs: `axis` (`vertical` | `horizontal`), `handle`, `items`, `indicator` (`default` | `ring`), `disabled`.
- `items` limits which direct children reorder; `refresh()` forces a re-sync.
- Event `reorder`: `{ oldIndex, newIndex, item }`.
- With fewer than two matching items, list semantics remain but drag and keyboard affordances stay inactive.

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
