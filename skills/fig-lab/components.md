# FigUI3 lab components (`fig-lab.js`)

Experimental. APIs may change. React contract: [../figui3/react.md](../figui3/react.md). Attrs: [reference.md](reference.md).

Install `fig-lab.css` + `fig-lab.js`. `propskit-select` and `propskit-palette` use `fig-select`, so also import `fig-editor.js` + `fig-editor.css`. `fig-editor.js` already imports `fig-lab.js`; lab **CSS** is still required.

Handlers below assume `onInput` / `onChange` from the React contract.

## Shared propskit

Plain labeled component surfaces. Most are horizontal; spatial, curve, and
image controls are vertical. Prefer these over hand-rolled label+control rows.

Shared attrs: `label` (omitted renders `"Label"`; `label=""` hides it), optional `name`, `disabled`, `default` (reset target, may differ from initial `value`).

Right-click **Reset**; `resetToDefault()` on a ref. `propskit-slider` also double-click resets. Remaining attrs forward to the inner control.

`input` and `change` dispatch from the outer host with `{ control, value, name? }`; `event.target.value` matches `detail.value`. `optionhover` uses the same envelope. Numeric number/slider/wheel values are finite numbers or `null`.

Shared CSS variables: `--propskit-padding-block`, `--propskit-padding-inline`, `--propskit-background`, `--propskit-border`, `--propskit-color`, `--propskit-hover-background`, `--propskit-hover-border`, `--propskit-hover-color`, `--propskit-label-inline-size`, and `--propskit-input-inline-size`. Prefix the control name for one row, for example `--propskit-select-background`.

```tsx
const rowRef = useRef<HTMLElement>(null);
rowRef.current?.resetToDefault();
```

## Propskit

### `propskit-switch`

```tsx
<propskit-switch
  label="Visible"
  variant="switch"
  checked={on ? "true" : undefined}
  default="true"
  onInput={onInput}
/>
```

- Inner: `fig-switch` by default. `variant="segmented-control"` renders the Off/On `fig-segmented-control`. The full surface toggles either control. `checked`, `default`, `.value`, and event values are boolean.

### `propskit-color`

```tsx
<propskit-color
  label="Fill"
  value="#0D99FF"
  alpha="true"
  onInput={onInput}
  onChange={onChange}
/>
```

- Inner: `fig-fill-picker` + `fig-swatch`. Clicking the surface opens the picker anchored to the host. Focus ring on the surface, not the swatch.

### `propskit-fill`

```tsx
<propskit-fill
  label="Fill"
  value='{"type":"solid","color":"#0D99FF"}'
  onInput={onInput}
  onChange={onChange}
>
  <div slot="mode-shader" label="Shader">
    Shader UI
  </div>
</propskit-fill>
```

- Same chrome as color. Value may be fill JSON or a bare video URL. Forwards `mode-*` slots.

### `propskit-gradient`

```tsx
<propskit-gradient
  label="Gradient"
  value={gradientJson}
  edit="picker"
  onInput={onInput}
/>
```

- Inner: `fig-input-gradient`. Default `edit="picker"`. `mode="handle|tip"` for inline edit. Clicking the surface opens the picker anchored to the host.

### `propskit-palette`

```tsx
<propskit-palette
  label="Palette"
  options='[["#0D99FF","#14AE5C"],[{"color":"#FFCD29","alpha":0.5},"#F24822"]]'
  onInput={onInput}
  onChange={onChange}
/>
```

- Inner: `fig-select` with fixed, disabled `fig-input-palette` previews. Requires the editor bundle.
- `options` is an array of palette arrays. Public and event values are typed `{ color, alpha }[]`; omission of `value` selects the first palette.
- Supports `optionhover`, typed `defaultValue`, `isDefault`, and `resetToDefault()`.

### `propskit-image`

```tsx
<propskit-image
  label="Image"
  options='["/images/one.webp","/images/two.webp"]'
  default="/images/one.webp"
  onInput={onInput}
  onChange={onChange}
/>
```

- Inner: a permanent ghost icon upload button plus a conditional
  `fig-chooser layout="grid" columns="2"`.
- Every `fig-choice` contains a square, cover-fit `fig-image` with an
  attachment-style remove control. Delete and Backspace remove a focused choice.
- `options` and `.options` are URL arrays; `.value`, `defaultValue`, and event
  values are the selected URL. Omitted or unmatched values select the first.
- File selection appends local object URLs and selects the first new image.
  Removing a choice updates `options` and revokes its object URL when needed;
  removing the selection falls back to the first remaining image.

### `propskit-select`

```tsx
<propskit-select
  label="Blend"
  value="multiply"
  options="Normal,Multiply,Screen"
  onChange={onChange}
/>
```

Rich options (requires editor):

```tsx
<propskit-select label="Space" value="oklab" onChange={onChange}>
  <fig-select-options slot="panel">
    <fig-select-option value="srgb" label="Classic">
      Classic
    </fig-select-option>
  </fig-select-options>
</propskit-select>
```

- Inner: always `fig-select`; editor registration is required. Authored `fig-select-options slot="panel"` wins. Options stay in light DOM.

### `propskit-editable-select`

```tsx
<propskit-editable-select
  aria-label="Layer style"
  name="style"
  value="primary"
  options='[{"value":"primary","label":"Primary"},{"value":"secondary","label":"Secondary"}]'
  onInput={onInput}
  onChange={onChange}
/>
```

- Label-free, always-subtle, content-width `fig-select` on the left in one
  full-row PropsKit surface with default-size secondary edit and add buttons on
  the right.
- The entire host opens the select except for the edit and add actions.
- The options menu aligns to and spans the full PropsKit row.
- Add creates and selects an `item-{index}` value using its zero-based array
  index with the label `"New item"`, then enters rename mode.
- Edit swaps in a default-size, full-width `fig-input-text`; checkmark, Enter,
  or moving focus outside the input saves, while Escape cancels.
- Each option has an appended ghost trash action. Delete or Backspace removes
  the focused option from the keyboard.
- Edit/save, add, and trash icon buttons include descriptive tooltips.
- The select and trash action disable at one remaining item; edit and add stay
  available.
- `.options` is normalized `{ value, label }[]`. Renaming changes the label
  while preserving its stable value.
- `input`, `change`, and `optionhover` detail includes both the stable `value`
  and current `label`.
- Every add, rename, or delete emits `optionschange` with
  `{ control, name?, value, label, action, option, index, options }`. Deleting
  an unselected option does not emit `input` or `change`.

### `propskit-text`

```tsx
<propskit-text
  label="Name"
  value={name}
  onInput={onInput}
  onChange={onChange}
/>
```

- Inner: `fig-input-text` with `multiline` and `autoresize` enabled by default.
  It starts at one line and grows through four lines. Use `"false"` to disable
  either default. The inner control is always `type="text"`; the host `type`
  attribute is not forwarded. `readonly` is forwarded.

### `propskit-number`

```tsx
<propskit-number
  label="Size"
  value="16"
  min="0"
  max="100"
  step="1"
  units="px"
  steppers="true"
  onInput={onInput}
/>
```

- Inner: `fig-input-number`.

### `propskit-slider`

```tsx
<propskit-slider
  label="Opacity"
  type="opacity"
  value="100"
  default="100"
  min="0"
  max="100"
  units="%"
  onInput={onInput}
  onChange={onChange}
/>
```

- Inner: `fig-slider`. `type` range/hue/delta/stepper/opacity; `elastic` default true. Forward `min` / `max` / `step` / `value`.

### `propskit-wheel`

```tsx
<propskit-wheel
  label="Duration"
  value="1.5"
  units="seconds"
  onInput={onInput}
/>
```

- Inner: `fig-input-wheel` + optional `fig-input-number`. Attrs: `label`, `text`, `spin`, `elastic` (row stretch, default true), `precision`, `units`, `default`. Units stay on the wrapper; effective step is applied to the wheel. `spin="false"` updates value without moving ticks.

### `propskit-position`

```tsx
<propskit-position label="Position" x="50" y="50" units="percent" onInput={onInput} />
```

- Two numbers. Attrs: `x`, `y`, `units`.

### `propskit-joystick`

```tsx
<propskit-joystick
  label="Position"
  value='{"x":35,"y":65}'
  default='{"x":50,"y":50}'
  axis-labels="X Y"
  onInput={onInput}
  onChange={onChange}
/>
```

- Inner: `fig-joystick` with forced `fields="true"` and `aspect-ratio="1 / 1"`.
- `.value`, `defaultValue`, and event values are typed `{ x, y }` percentage objects.

### `propskit-origin`

```tsx
<propskit-origin
  label="Transform origin"
  value='{"x":50,"y":50}'
  default='{"x":50,"y":50}'
  onInput={onInput}
/>
```

- Inner: `fig-origin-grid` with forced `fields="true"` and `aspect-ratio="1 / 1"`.
- `.value`, `defaultValue`, and event values are typed `{ x, y }` percentage objects.

### `propskit-easing`

```tsx
<propskit-easing
  label="Easing"
  value='{"x1":0.42,"y1":0,"x2":0.58,"y2":1}'
  onChange={onChange}
/>
```

- Inner: `fig-easing-curve` constrained to bezier mode.
- Typed value: `{ x1, y1, x2, y2 }`.

### `propskit-spring`

```tsx
<propskit-spring
  label="Spring"
  value='{"stiffness":200,"damping":15,"mass":1}'
  onChange={onChange}
/>
```

- Inner: `fig-easing-curve` constrained to spring mode.
- Typed value: `{ stiffness, damping, mass }`.

### `propskit-color-point`

```tsx
<propskit-color-point
  label="Stop"
  value={json}
  collapsible
  open
  onInput={onInput}
/>
```

- Color + position JSON. `collapsible` / `open` default true (string booleans).

### `propskit-point-radius`

```tsx
<propskit-point-radius label="Spot" value='{"x":50,"y":50,"radius":60}' onInput={onInput} />
```

### `propskit-point-radius-angle`

```tsx
<propskit-point-radius-angle
  label="Light"
  value='{"x":50,"y":50,"radius":60,"angle":45}'
  onInput={onInput}
/>
```

### `propskit-point-point`

```tsx
<propskit-point-point
  label="Line"
  value='{"x":10,"y":10,"x2":90,"y2":90}'
  onInput={onInput}
/>
```

### `propskit-group`

```tsx
<propskit-group name="Appearance" open show-reset>
  <propskit-slider label="Opacity" value="100" min="0" max="100" />
</propskit-group>
```

- Attrs: `name`, `open`, `show-reset`. Children are React nodes.

### `propskit-oscillator`

```tsx
<propskit-oscillator
  label="Wave"
  value={wavesJson}
  edit
  onInput={onInput}
/>
```

- JSON `waves`. Attrs: `edit`, `precision`, `aspect-ratio`, `disabled`.

## Spatial

### `fig-canvas-control`

```tsx
<div style={{ position: "relative", aspectRatio: "1", width: "100%" }}>
  <fig-canvas-control
    type="point-radius-angle"
    name="Position"
    value='{"x":50,"y":50,"radius":60,"angle":45}'
    snapping="modifier"
    onInput={onInput}
    onChange={onChange}
  />
</div>
```

- Parent must be positioned. Types: `point`, `color`, `point-radius`, `point-radius-angle`, `point-point`.
- Attrs: `type`, `value` (JSON string), `color`, `name`, `tooltips`, `disabled`, `drag-surface`, `snapping` (`false` | `modifier` | `true`), `precision` (positions, radius, angle, and internal handles; default `2`)
- React: JSON `value` as a string attr; do not remount during drag.

### `fig-input-angle`

```tsx
<fig-input-angle
  value={String(deg)}
  text="true"
  units="°"
  onInput={onInput}
/>
```

- Attrs: `value`, `precision`, `text`, `min`, `max`, `units`, `dial` (default true), `rotations`, `disabled`

### `fig-input-wheel`

```tsx
<fig-input-wheel value="50" min="0" max="100" step="1" onInput={onInput} />
```

- Standalone SVG tick + handle. Attrs: `value` (default `0`), `step` (default `1`), `min`, `max`, `spin` (default true), `disabled`. No `units` / `text` / `label` / reset — use `propskit-wheel` for those.
- Methods: `focus()`, `spinTo(value)`, `beginScrub()`, `updateScrub()`, `endScrub()`.

### `fig-reorder`

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

- `display: contents`. Reorders **direct children**. `axis` `vertical` | `horizontal`. Omit `handle` to drag whole rows; set it when rows contain sliders/handles.
- Event `reorder`: `{ oldIndex, newIndex, item }`. Nested drag is ignored for sliders, handles, canvas, and most propskit spatial controls.

## AI composer

Layout shells. Wire behavior yourself. Children are React nodes.

### `fig-ai-prompt`

```tsx
<fig-ai-prompt>
  <fig-input-text multiline placeholder="Describe a change" />
  <fig-footer>
    <fig-button>Send</fig-button>
  </fig-footer>
</fig-ai-prompt>
```

### `fig-ai-context`

```tsx
<fig-ai-context>
  <fig-attachments>{attachments}</fig-attachments>
</fig-ai-context>
```

Open area above the prompt for attachments/status.

### `fig-chat-message`

```tsx
<fig-chat-message from="user">
  Create a settings panel.
  <fig-attachments aria-label="Message attachments">
    <fig-attachment
      value="settings"
      name="settings.png"
      src={src}
      removable="false"
    />
  </fig-attachments>
  <fig-avatar name="Rogie King" />
</fig-chat-message>
<fig-chat-message from="agent">
  <fig-shimmer>
    <span>Thinking…</span>
  </fig-shimmer>
</fig-chat-message>
```

- Attrs: `from` (`user` | `agent`)

### `fig-attachments` / `fig-attachment`

```tsx
<fig-attachments>
  <fig-attachment src={src} name="file.png" value="file" />
</fig-attachments>
```

- Attachment attrs: `src`, `name`, `value`, `removable` (default true), `disabled`
- Events: `remove` — listen natively if React does not map it.
