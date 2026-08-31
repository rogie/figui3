# FigUI3 lab API reference

Playground: `/propskit/lab#{id}`. Rules: `playground/src/lib/attributeRules.ts`.

## Propskit reset

- `default` attr stores the reset value
- `resetToDefault()` on the host
- Context menu item `reset-default`
- Slider: double-click also resets
- Equality helpers treat booleans and JSON objects

## Propskit sizes

PropsKit rows are large by default; explicit `size="large"` remains supported.
`propskit-group size="small"` applies `size="small"` to nested controls that do
not define their own size and removes generated sizes when the group returns to
the default size.

## `propskit-select`

Observed: `label`, `direction`, `aria-label`, `options`, `value`.

Uses `fig-select` when `fig-select`, `fig-select-options`, and `fig-select-option` are registered; otherwise a fallback control.

Options attr: JSON array, comma, or newline. Authored `fig-select-options slot="panel"` wins for rich menus.

## `propskit-slider`

Playground attrs: `type` (`range`, `hue`, `delta`, `stepper`, `opacity`), `color`, `label`, `default`, `units`, `elastic` (default true), `size`, `steppers`, `disabled`.

Inner `fig-slider` still needs `min` / `max` / `step` / `value` as forwarded attrs.

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

## `propskit-wheel`

Composes `fig-input-wheel` with an optional `fig-input-number`. It retains `label`, `text`, `spin`, `precision`, `units`, `default`/reset, `size`, and `variant`. `elastic` defaults to true and controls stretching of the composed row; the child wheel's handle pull remains active when row stretching is disabled. Set `spin="false"` to update the value and number field while leaving wheel ticks stationary. Units and time aliases are wrapper/number-field behavior: normalized `s` defaults to step `0.1` and precision `2`, normalized `ms` defaults to step `100` and precision `0`, and other units default to step `1` and precision `0`. The wrapper applies the effective step and unit-aware `aria-valuetext` to the child wheel, but never sets child `units`.

```html
<propskit-wheel label="Duration" value="1.5" units="seconds"></propskit-wheel>
<propskit-wheel label="Frames" value="12" text="false"></propskit-wheel>
```

## Point JSON shapes

```json
{"x":50,"y":50}
{"x":50,"y":50,"radius":60}
{"x":50,"y":50,"radius":60,"angle":45}
{"x":10,"y":10,"x2":90,"y2":90}
```

Color-point combines a color payload with `x`/`y`.

Collapsible point groups: `collapsible` and `open` default true (string booleans).

## `fig-canvas-control`

Observed: `type`, `value`, `color`, `name`, `tooltips`, `disabled`, `drag-surface`, `snapping`.

Parent must be `position: relative` (or similar) so the control can fill it. Playground wraps in an aspect-ratio box.

Types: `point`, `color`, `point-radius`, `point-radius-angle`, `point-point`.

## `fig-input-angle`

Observed include `value`, `precision`, `text`, `min`, `max`, `units`, `dial`, plus `rotations`.

`dial` defaults true. `text="true"` shows the numeric field.

## `fig-reorder`

Observed: `axis`, `handle`, `disabled`.

Event `reorder`: `{ oldIndex, newIndex, item }`.

Nested drag is ignored for sliders, handles, canvas controls, and most propskit spatial controls so inner gestures still work. If a row is still stolen, set `handle` to a drag-affordance selector.

## AI shells

`fig-ai-prompt`, `fig-ai-context`, `fig-chat-message` are empty custom elements (presentation CSS only).

`fig-attachment` observed: `src`, `name`, `value`, `removable`, `disabled`.
`fig-chat-message`: `from="agent|user"`.
