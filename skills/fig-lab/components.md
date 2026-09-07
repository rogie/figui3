# FigUI3 lab components (`fig-lab.js`)

Experimental. APIs may change. React contract: [../figui3/react.md](../figui3/react.md). Attrs: [reference.md](reference.md).


Handlers below assume `onInput` / `onChange` from the React contract.

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
- Event `reorder`: `{ oldIndex, newIndex, item }`. Nested drag is ignored for sliders, handles, and canvas controls.

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
