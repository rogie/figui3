# FigUI3 lab components (`fig-lab.js`)

Experimental. APIs may change. React contract: [../figui3/react.md](../figui3/react.md). Attrs: [reference.md](reference.md).

Install `fig-lab.css` + `fig-lab.js`. `propskit-select` prefers `fig-select` — also import `fig-editor.js` + `fig-editor.css` for rich menus. `fig-editor.js` already imports `fig-lab.js`; lab **CSS** is still required.

Handlers below assume `onInput` / `onChange` from the React contract.

## Shared propskit

Full-surface `fig-field` wrappers. Prefer these over hand-rolled label+control rows.

Shared attrs: `label`, `direction` (`horizontal` default), `size` (`""` | `small`; `large` is an alias for default), `disabled`, `variant="minimal"` (no vertical padding; field background on hover), `default` (reset target, may differ from initial `value`).

Right-click **Reset**; `resetToDefault()` on a ref. `propskit-slider` also double-click resets. Remaining attrs forward to the inner control. Rows are large by default; `propskit-group size="small"` applies compact sizing to children without an authored size.

```tsx
const rowRef = useRef<HTMLElement>(null);
rowRef.current?.resetToDefault();
```

## Propskit

### `propskit-switch`

```tsx
<propskit-switch
  label="Visible"
  checked={on ? "true" : undefined}
  default="true"
  onInput={onInput}
/>
```

- Inner: `fig-switch`. `checked` / `default` boolean.

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

- Inner: `fig-fill-picker` + `fig-swatch`. Clicking the field opens the picker anchored to the host. Focus ring on the field, not the swatch.

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

- Inner: `fig-input-gradient`. Default `edit="picker"`. `mode="handle|tip"` for inline edit. Clicking the field opens the picker anchored to the host.

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

- Inner: `fig-select` when registered; otherwise a fallback. Authored `fig-select-options slot="panel"` wins. Options stay in light DOM.

### `propskit-text`

```tsx
<propskit-text
  label="Name"
  value={name}
  onInput={onInput}
  onChange={onChange}
/>
```

- Inner: `fig-input-text`. `type`, `readonly`.

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
  direction="horizontal"
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

- Inner: `fig-input-wheel` + optional `fig-input-number`. Attrs: `label`, `text`, `spin`, `elastic` (row stretch, default true), `precision`, `units`, `default`, `size`, `variant`. Units stay on the wrapper; effective step is applied to the wheel. `spin="false"` updates value without moving ticks.

### `propskit-position`

```tsx
<propskit-position label="Position" x="50" y="50" units="percent" onInput={onInput} />
```

- Two numbers. Attrs: `x`, `y`, `units`.

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

- Attrs: `name`, `open`, `show-reset`, `size`. Children are React nodes.

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
- Attrs: `type`, `value` (JSON string), `color`, `name`, `tooltips`, `disabled`, `drag-surface`, `snapping` (`false` | `modifier` | `true`)
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
