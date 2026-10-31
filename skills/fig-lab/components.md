# FigUI3 lab components (`fig-lab.js`)

Experimental. APIs may change. React contract: [../figui3/react.md](../figui3/react.md). Attrs: [reference.md](reference.md).

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

### `fig-input-slider` variants

```tsx
<fig-input-slider value="50" default="50" min="0" max="100" />
<fig-input-slider value="50">
  <fig-input-number value="50" units="%" />
</fig-input-slider>
<fig-input-slider-hue value="180" />
<fig-input-slider-opacity color="#0D99FF" value="75" />
<fig-input-slider-delta value="0" default="0" />
<fig-input-slider-stepper value="50" />
<fig-input-slider-wheel value="0" step="1" />
```

- Shared attrs: `name`, `value`, `default`, `occlusion-targets` (parent-scoped CSS selector list), `min`, `max`, `step`, `precision`, `ghost`, `disabled`
- Base slider accepts JSON arrays such as `value="[20,80]"` for multiple handles.
- A direct-child `fig-input-number` synchronizes bidirectionally for scalar values. Configure it with its own attrs; slider attrs are not forwarded. It is hidden for array values.
- `occlusionTargets` accepts additional `Element[]` targets and returns a defensive copy. Selector, programmatic, direct-number, and row-property label targets are additive.
- Occlusion CSS: `--fig-input-slider-handle-occlusion-target-overlap-opacity` and `--fig-input-slider-handle-occlusion-target-overlap-fade-threshold`.
- Hue and opacity add `color`. Wheel is single-value and exposes `spinTo()`, `beginScrub()`, `updateScrub()`, and `endScrub()`.
- Events: bubbling, composed `input` and `change` with `{ control, name?, value, handleIndex }`.

### `fig-input-wheel`

```tsx
<fig-input-wheel value="50" min="0" max="100" step="1" onInput={onInput} />
```

- Methods: `focus()`, `spinTo(value)`, `beginScrub()`, `updateScrub()`, `endScrub()`.

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
