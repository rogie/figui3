# FigUI3 lab API reference

React recipes: [components.md](components.md).

## Propskit reset

- `default` attr stores the reset value
- `resetToDefault()` on the host
- Context menu item `reset-default`
- Slider: double-click also resets
- Equality helpers treat booleans and JSON objects

## Propskit switch variants

`propskit-switch` accepts `variant="switch|segmented-control"`.
`switch` is the default and renders `fig-switch`; `segmented-control` renders
explicit Off/On choices. The full surface toggles either variant. Its `.value`
and `input` / `change` event values are boolean.

## Propskit surfaces and events

Surface controls do not compose `fig-field`. Most are horizontal; spatial,
curve, and image controls use vertical layouts. Omitted `label` renders
`"Label"` and `label=""` hides the visible label. Optional non-empty `name`
reflects on the host.

`input` and `change` dispatch from the outer host with
`{ control, value, name? }`; `event.target.value` equals `detail.value`.
`propskit-select` and `propskit-palette` use the same envelope for
`optionhover`. Switch values are boolean. Number, slider, and wheel values are
finite numbers or `null`. Structured and serialized values are exactly the
host's public `.value`.

Shared style variables use the suffixes `padding-block`, `padding-inline`,
`background`, `border`, `color`, `hover-background`, `hover-border`,
`hover-color`, `label-inline-size`, and `input-inline-size` under the
`--propskit-*` prefix. A per-control prefix, such as
`--propskit-select-background`, overrides the shared value.

## `propskit-palette`

Observed: `label`, `aria-label`, `options`, `value`, `disabled`.

Always renders `fig-select` with fixed, disabled `fig-input-palette` previews.
Import `fig-editor.js` and `fig-editor.css`.

- `options`: JSON array of palette arrays
- Palette entries: color strings or `{ "color": string, "alpha": number }`
- `.value`, `defaultValue`, and event `detail.value`: typed `{ color, alpha }[]`
- First option is the fallback when `value` is omitted or does not match
- `input`, `change`, and `optionhover` extend the shared PropsKit envelope with
  `label`; `value` remains the stable option value
- `isDefault` uses structural equality; `resetToDefault()` restores `default`

## `propskit-image`

Observed: `options`, `value`, `default`, `label`, `aria-label`, `disabled`.

Renders a label and permanent ghost upload button above a conditional
`fig-chooser`. The chooser always uses `layout="grid"` and `columns="2"`;
each `fig-choice` contains a square, cover-fit `fig-image` and an
attachment-style remove control.

- `options`: optional JSON string array of image URLs
- `.options`: normalized, de-duplicated URL array
- `.value`, `defaultValue`, and event `detail.value`: selected URL string
- First option is the fallback when `value` is omitted or does not match
- Selecting one or more image files appends object URLs and selects the first
  new image; applications own durable upload and URL replacement
- Removing a choice reflects the reduced `options` array and revokes an object
  URL when needed; removing the selected choice falls back to the first option
  and emits `input` and `change`
- Delete and Backspace remove the focused choice
- `input` and `change` use the shared PropsKit envelope
- Supports `variant="minimal"`, `isDefault`, `resetToDefault()`, and focus
  delegation

## `propskit-select`

Observed: `label`, `aria-label`, `options`, `value`.

Always renders `fig-select`. Import `fig-editor.js` and `fig-editor.css`; delayed registration upgrades the authored element.

Options attr: JSON array, comma, or newline. Authored `fig-select-options slot="panel"` wins for rich menus.

## `propskit-editable-select`

Observed: `options`, `value`, `default`, `aria-label`, `disabled`.

Renders a label-free, always-subtle, content-width `fig-select` on the left,
with default-size secondary edit and add buttons on the right inside one
full-row PropsKit surface. The row uses the standard PropsKit padding,
background, border, color, hover, and focus variables.

- `options` accepts comma, newline, or JSON values supported by `fig-select`
- `.options` returns normalized `{ value, label }[]` entries
- Clicking the host opens the select except when edit or add is clicked
- The options menu is positioned and sized to the full PropsKit row
- Add creates an `item-{index}` value using its zero-based array index with the
  label `"New item"`, selects it, and opens rename mode
- Edit replaces the select with a default-size, full-width `fig-input-text`;
  checkmark, Enter, or moving focus outside the input commits, while Escape
  cancels
- Each menu option has an appended ghost trash action; Delete or Backspace
  removes the focused option
- Edit/save, add, and trash icon buttons include descriptive tooltips
- At one remaining item, the select and trash action are disabled; add and edit
  remain available
- Renaming updates the reflected options JSON while preserving the option value
- `input`, `change`, and `optionhover` use the shared PropsKit envelope
- Supports `defaultValue`, `isDefault`, `editing`, `resetToDefault()`, disabled
  state propagation, and focus delegation

## `propskit-text`

Composes `fig-input-text` with `multiline` and `autoresize` enabled by default.
The textarea starts at one line, grows with its content, and scrolls after four
lines. Set `multiline="false"` or `autoresize="false"` to disable either
default. The inner control is always `type="text"`; a host `type` attribute is
ignored rather than forwarded.

## `propskit-slider`

Attrs: `type` (`range`, `hue`, `delta`, `stepper`, `opacity`), `color`, `label`, `default`, `units`, `elastic` (default true), `steppers`, `disabled`.

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

Composes `fig-input-wheel` with an optional `fig-input-number`. It retains `label`, `text`, `spin`, `precision`, `units`, and `default`/reset. `elastic` defaults to true and controls stretching of the composed row; the child wheel's handle pull remains active when row stretching is disabled. Set `spin="false"` to update the value and number field while leaving wheel ticks stationary. Units and time aliases are wrapper/number-field behavior: normalized `s` defaults to step `0.1` and precision `2`, normalized `ms` defaults to step `100` and precision `0`, and other units default to step `1` and precision `0`. The wrapper applies the effective step and unit-aware `aria-valuetext` to the child wheel, but never sets child `units`.

```html
<propskit-wheel label="Duration" value="1.5" units="seconds"></propskit-wheel>
<propskit-wheel label="Frames" value="12" text="false"></propskit-wheel>
```

## `propskit-joystick`

Composes a PropsKit label above `fig-joystick`. The plane always uses
`aspect-ratio="1 / 1"` and the X/Y fields are always enabled.

- Observed: `value`, `default`, `label`, `aria-label`, `axis-labels`,
  `coordinates`, `precision`, `disabled`
- `value` and `default`: serialized `{ "x": number, "y": number }` percentages
- `.value`, `defaultValue`, and event `detail.value`: typed `{ x, y }`
- `input` and `change` use the shared PropsKit envelope
- `isDefault` compares both axes; `resetToDefault()` restores `default`

```html
<propskit-joystick
  label="Position"
  value='{"x":35,"y":65}'
  default='{"x":50,"y":50}'
  axis-labels="X Y"
></propskit-joystick>
```

## `propskit-origin`

Composes a PropsKit label above `fig-origin-grid`. The grid always uses
`aspect-ratio="1 / 1"` and its X/Y fields are always enabled.

- Observed: `value`, `default`, `label`, `aria-label`, `precision`, `drag`,
  `disabled`
- `value` and `default`: serialized `{ "x": number, "y": number }` percentages
- `.value`, `defaultValue`, and event `detail.value`: typed `{ x, y }`
- `input` and `change` use the shared PropsKit envelope

## `propskit-easing`

Composes a PropsKit label above `fig-easing-curve`, constrained to bezier mode.

- Observed: `value`, `default`, `label`, `aria-label`, `precision`, `edit`,
  `disabled`
- `value` and `default`: serialized `{ "x1", "y1", "x2", "y2" }` objects
- `.value`, `defaultValue`, and event `detail.value`: typed
  `{ x1, y1, x2, y2 }`
- X coordinates are clamped to `0–1`; Y coordinates may overshoot

## `propskit-spring`

Composes a PropsKit label above `fig-easing-curve`, constrained to spring mode.

- Observed: `value`, `default`, `label`, `aria-label`, `precision`, `edit`,
  `disabled`
- `value` and `default`: serialized `{ "stiffness", "damping", "mass" }`
  objects
- `.value`, `defaultValue`, and event `detail.value`: typed
  `{ stiffness, damping, mass }`
- Spring values must be positive

All three controls force a square primitive, support `variant="minimal"`,
participate in PropsKit group reset, and delegate focus to their first
interactive descendant.

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

Parent must be `position: relative` (or similar) so the control can fill it. Wrap in an aspect-ratio box.

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
