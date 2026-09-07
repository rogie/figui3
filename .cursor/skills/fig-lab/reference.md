# FigUI3 lab API reference

React recipes: [components.md](components.md).

## `fig-input-wheel`

Standalone interactive SVG tick + handle scrubber in the lab bundle.

- Attrs: `value` (default `0`), `step` (default `1`), optional `min`/`max`, `spin` (default true), `disabled`
- Props: `value`, `min`, `max`, `step`
- Methods: `focus()`, `spinTo(value)`, `beginScrub()`, `updateScrub()`, `endScrub()`
- Events: numeric `input` and `change`, bubbling and composed
- ARIA value text is numeric
- Not supported: `units`, `text`, `precision`, `label`, `size`, `variant`, `default`/reset, or a number field

```html
<fig-input-wheel value="50" min="0" max="100"></fig-input-wheel>
<fig-input-wheel value="1.5" step="0.25"></fig-input-wheel>
```

## Point JSON shapes

```json
{"x":50,"y":50}
{"x":50,"y":50,"radius":60}
{"x":50,"y":50,"radius":60,"angle":45}
{"x":10,"y":10,"x2":90,"y2":90}
```

## `fig-canvas-control`

Observed: `type`, `value`, `color`, `name`, `tooltips`, `disabled`, `drag-surface`, `snapping`.

Parent must be `position: relative` (or similar) so the control can fill it. Wrap in an aspect-ratio box.

Types: `point`, `color`, `point-radius`, `point-radius-angle`, `point-point`.

## `fig-input-angle`

Observed include `value`, `precision`, `text`, `min`, `max`, `units`, `dial`, plus `rotations`.

`dial` defaults true. `text="true"` shows the numeric field.

## `fig-reorder`

Observed: `axis`, `handle`, `disabled`.

Event `reorder`: `{ oldIndex, newIndex, item }`.

Nested drag is ignored for sliders, handles, and canvas controls so inner gestures still work. If a row is still stolen, set `handle` to a drag-affordance selector.

## AI shells

`fig-ai-prompt`, `fig-ai-context`, `fig-chat-message` are empty custom elements (presentation CSS only).

`fig-attachment` observed: `src`, `name`, `value`, `removable`, `disabled`.
`fig-chat-message`: `from="agent|user"`.
