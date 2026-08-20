# FigUI3 lab API reference

Playground: `/propskit/lab#{id}`. Rules: `playground/src/lib/attributeRules.ts`.

## Propskit reset

- `default` attr stores the reset value
- `resetToDefault()` on the host
- Context menu item `reset-default`
- Slider: double-click also resets
- Equality helpers treat booleans and JSON objects

## `propskit-select`

Observed: `label`, `direction`, `aria-label`, `options`, `value`.

Uses `fig-select` when `fig-select`, `fig-select-options`, and `fig-select-option` are registered; otherwise a fallback control.

Options attr: JSON array, comma, or newline. Authored `fig-select-options slot="panel"` wins for rich menus.

## `propskit-slider`

Playground attrs: `type` (`range`, `hue`, `delta`, `stepper`, `opacity`), `color`, `label`, `default`, `units`, `elastic` (default true), `size`, `steppers`, `disabled`.

Inner `fig-slider` still needs `min` / `max` / `step` / `value` as forwarded attrs.

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
