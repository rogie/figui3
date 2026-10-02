# FigUI3 lab API reference

React recipes: [components.md](components.md).

## `fig-input-audio`

Single-audio upload with a responsive, preview-only waveform.

- Attrs: `url`, `filename`, `label` (default `Upload audio`), `accepts` (default `audio/*`), `variant`, `disabled`, `full`
- Props: `files`, `value`
- Method: `clear()`
- Events: `input` and `change`, bubbling and composed, with `{ files }` and optional `cleared`
- Clicking the waveform replaces the file; the minus action removes it
- URL decoding requires CORS; fetch and decode failures fall back quietly
- CSS: `--fig-input-audio-waveform-stroke-width` controls bar thickness (default `2px`)
- Not supported: multiple files, playback, or seeking

```html
<fig-input-audio></fig-input-audio>
<fig-input-audio url="https://example.com/audio.wav" filename="audio.wav" full></fig-input-audio>
```

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

## `fig-reorder`

Observed: `axis`, `handle`, `items`, `disabled`.

`items`: CSS selector for which direct children are reorderable (default: all). Non-matching children stay in place and get `role="none"` unless they have a role. Class/attribute changes on children re-sync automatically; call `refresh()` to force it.

With fewer than two matching items, matching children retain `role="listitem"` but remain non-draggable and receive no generated focus or move label.

Event `reorder`: `{ oldIndex, newIndex, item }`. Indices count matching items, not DOM positions.

Nested drag is ignored for sliders, handles, and canvas controls so inner gestures still work. If a row is still stolen, set `handle` to a drag-affordance selector.

## AI shells

`fig-ai-prompt`, `fig-ai-context`, `fig-chat-message` are empty custom elements (presentation CSS only).

`fig-attachment` observed: `src`, `name`, `value`, `removable`, `disabled`.
`fig-chat-message`: `from="agent|user"`.
