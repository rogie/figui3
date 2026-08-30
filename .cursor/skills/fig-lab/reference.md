# FigUI3 lab API reference

Playground: `/propskit/lab#{id}`. Rules: `playground/src/lib/attributeRules.ts`.

## Propskit reset

- `default` attr stores the reset value
- `resetToDefault()` on the host
- Context menu item `reset-default`
- Slider: double-click also resets
- Equality helpers treat booleans and JSON objects

## Propskit variants

`variant="minimal"` is available on switch, color, fill, gradient, select, text, number, slider, position, and wheel controls. It removes vertical host padding, keeps the inner field transparent at rest, and restores the secondary field background on hover.

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

## `propskit-wheel`

Observed: `label`, `units` (optional arbitrary string; `seconds`, `s`, `milliseconds`, and `ms` time aliases), `value`, `default`, `step`, `precision`, `min`, `max`, `elastic` (default true), `size`, `disabled`, `variant`.

No `fig-field` / `fig-slider`. Host + `.propskit-wheel-surface` + SVG tick wheel + `fig-input-number`. Omitted `label` → `"Value"`; authored `label` (including blank) is used as-is. Value defaults to `0`; units are omitted by default and arbitrary values such as `px` pass through unchanged. Generic/no-unit defaults are `step="1"` and `precision="0"`. Full time unit names normalize to `s` / `ms`; seconds default to `step="0.1"` and `precision="2"`, while milliseconds default to `step="100"` and `precision="0"`. `precision` only controls the inner number's displayed decimals; scrubbing moves by `step` on every `input`, or `10× step` while Shift is held. Omitted `min`/`max` are unbounded. Wheel is a `spinbutton`; arrows step, Shift+arrow is 10×. Home/End jump to min/max when set. During horizontal scrubbing, the center handle follows the pointer with resisted movement (8px maximum by default), while the whole control stretches when the pointer passes an edge; both spring back on release unless `elastic="false"`. An unfocused number field also starts scrubbing after 4px of pointer travel; clicking without dragging focuses it for text editing.

```html
<propskit-wheel label="Duration" value="1.5" units="seconds"></propskit-wheel>
<propskit-wheel label="Delay" value="240" units="ms"></propskit-wheel>
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
