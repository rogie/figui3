# FigUI3 lab API reference

React recipes: [components.md](components.md).

## `fig-input-slider` variants

Standalone extensible slider primitives imported by the Lab bundle:

- `fig-input-slider`: range slider; supports one value or JSON arrays for multiple handles
- `fig-input-slider-hue`: 0–360 hue track; adds `color`
- `fig-input-slider-opacity`: opacity track over a checkerboard; adds `color`
- `fig-input-slider-delta`: defaults to −100…100 with a centered default tick and fill
- `fig-input-slider-stepper`: renders step ticks; default step is `10`
- `fig-input-slider-wheel`: unbounded single-value wheel with `role="spinbutton"`

Shared attrs: `name`, `value`, `default`, `occlusion-targets` (CSS selector list resolved against the parent scope), `min`, `max`, `step` (`any` disables snapping), `precision`, `ghost`, `disabled`. Hue and opacity also observe `color`.

Props: `name`, `value`, `defaultValue`, `isDefault`, `occlusionTargets` (`Element[]`, defensive getter). Attribute and programmatic occlusion targets are additive. Methods: `focus()`, `getSliderState()`, `setInteractionValue()`, `commitInteractionChange()`, `requestRender()`, `resetToDefault()`. Wheel also provides `spinTo()`, `beginScrub()`, `updateScrub()`, and `endScrub()`.

The base slider preserves an authored direct-child `fig-input-number` and synchronizes scalar values in both directions. The child owns its configuration; no slider attributes are forwarded. Array values hide the child.

Direct number children and labels from `fig-property[activation="row"]` are automatic occlusion targets. Configure fading with `--fig-input-slider-handle-occlusion-target-overlap-opacity` (default `0`) and `--fig-input-slider-handle-occlusion-target-overlap-fade-threshold` (default `var(--spacer-2)`).

`input` and `change` bubble and are composed. Detail is `{ control, name?, value, handleIndex }`. Double-click resets to `default`; Shift applies a 10× keyboard or pointer step.

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

## AI shells

`fig-ai-prompt`, `fig-ai-context`, `fig-chat-message` are empty custom elements (presentation CSS only).

`fig-attachment` observed: `src`, `name`, `value`, `removable`, `disabled`.
`fig-chat-message`: `from="agent|user"`.
