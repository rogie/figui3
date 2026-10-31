# FigUI3 editor API reference

React recipes: [components.md](components.md).

## `fig-select-option`

Observed: `value`, `disabled`, `selected`, `label`.

- `value` falls back to trimmed `textContent` if the attr is omitted
- `label` is the closed-trigger string when option content is rich
- `subtle` uses the secondary hover/focus fill
- `role="option"`, `aria-selected`, `aria-disabled`

## `fig-select-options`

- Auto `slot="panel"` if missing
- Unwraps a legacy nested `fig-chooser`
- A leading labeled `fig-separator` omits its rule
- Overflow nav buttons: `data-fig-select-nav`, classes `overflow-start` / `overflow-end`
- Methods: `syncOverflow()`, `scrollToOption(option, behavior)`

## `fig-select` observed

`value`, `disabled`, `label`, `options`, `menu-anchor`, `position`, `offset`, `closedby`, `open`, `variant`, `size`

- `icon` renders a square chevron-only trigger; provide `aria-label`
- `variant="primary"` uses brand button colors for emphasis
- `variant="input"` matches input-style fill, hover, press, and focus states
- `subtle` applies the secondary hover/focus fill to every option
- `size="large"` sets a 32px trigger
- `menu-anchor` accepts an alternate anchor selector; the `menuAnchor` property accepts an `Element`, selector string, or `null`

Position: omit to overlay the selected option on the trigger. Set to place the menu like a popup:

- `bottom left`, `bottom right`, `top left`, `top right`, `bottom center`, `top center`

Events: `input`, `change`, `optionhover`, `optionfocus`.

Methods: `focus(options)` focuses the trigger. `activate(options)` focuses the
trigger and opens the menu unless the select is disabled.

## Input rotate

`fig-input-rotate` observes `x`, `y`, `z`, `units`, and `open`.

- Missing or invalid axis values resolve to `0`.
- Units default to `deg`; `deg` and `°` display as `°`.
- Other unit strings display literally.
- `value` returns numeric `{ x, y, z }`.
- Clicking opens an anchored popup containing `fig-3d-rotate` with all three rotation fields.
- `focus(options)` focuses the trigger; `activate(options)` focuses and clicks it.
- Popup edits update the axis attributes and emit `input` and `change` with `{ x, y, z }`.
- `full` makes the host fill its parent.

## Input point

`fig-input-point` observes `x`, `y`, and `units`.

- Missing or invalid coordinates resolve to `0`.
- The generated X/Y `fig-input-number` controls stay synchronized with the host attributes.
- `units` is forwarded to both generated number inputs and removed from both when omitted.
- `input` and `change` events provide numeric `{ x, y }` in `detail`.
- `full` makes the host fill its parent.

## Property

`fig-property` observes `label`, `leading`, `trailing`, `show-leading`, and `show-trailing`.

- Direct slots: `input`, `label`, `leading`, `trailing`
- Authored `slot="label"` markup takes precedence over the `label` attribute.
- `leading`: `drag` or `chevron`
- `trailing`: `remove`, `add`, or `bind`
- `show-leading` / `show-trailing`: omitted or `hover` reveals on hover, `false` hides, and an empty attribute always shows
- `selected`: present or `true` uses `--figma-color-bg-selected`; `false` leaves the row unselected
- `activation="row"` activates the slotted control from the label or unused row surface; input and accessory clicks remain native, while focus moves the outline to the row and applies `--figma-color-bg-selected`. A slotted `fig-select` anchors its menu to the property row.
- Row activation overrides `full` sizing; color, gradient, palette, and point inputs use the standard compact width.
- Authored accessory slots override generated shortcuts.
- `input` returns the direct `slot="input"` element.
- `focus(options)` delegates focus to the slotted control and falls back to its first native focus target.
- `activate(options)` delegates to the slotted control's `activate()` method and falls back to `focus()`.
- Generated labels associate to the input with `aria-labelledby` unless it already has an accessible name.
- Generated trailing events bubble across shadow roots with `detail: { input }`.
- Child control events are not normalized or re-emitted.

## Easing popup

`dialog[is="fig-popup-easing"]` extends `fig-popup` and owns a
`fig-easing-curve` with `aspect-ratio="4/3"`.

- Observes and forwards `value`, `mode`, `precision`, `edit`, `presets`, and `text`.
- Forwards bubbling `input` / `change` events and reflects the current easing value.
- Defaults: `position="bottom left"`, `offset="0 8"`, `viewport-margin="8"`, and `popover="manual"`.

## Reorder

`fig-reorder` observes `axis`, `handle`, `items`, `indicator`, and `disabled`.

- `items`: selector for reorderable direct children; non-matching children remain in place.
- `indicator`: `default` or `ring`.
- `refresh()`: force child/selector synchronization.
- Event `reorder`: `{ oldIndex, newIndex, item }`; indices count matching items.
- Nested drag controls are ignored unless an explicit `handle` is configured.

## Palette editor

`fig-palette-editor` observes `value`, `min`, `max`, `fixed`, `disabled`, `overflow`, and `show-rows`. An omitted `max` allows unlimited colors.

- `value`: JSON array of hex strings or `{ color, alpha }` objects, or comma-separated hex
- `value` property and `input` / `change` event `detail`: normalized ordered `{ color, alpha }[]`
- `overflow="fade|visible"`: defaults to a bounded list with vertical fades; `visible` shows every row.
- `show-rows`: defaults to `6.5` and maps to `--fig-palette-editor-overflow-show-rows`.
- Rows are direct `fig-reorder` items and support pointer or keyboard reordering.

## Gradient editor

`fig-gradient-editor` observes `value`, `color-space`, `disabled`, `overflow`, and `show-rows`.

- `value` accepts a gradient config or `{ type: "gradient", gradient }` and returns a normalized gradient config.
- `cssValue` returns the current CSS gradient.
- `pickerAnchor` anchors nested stop color pickers.
- `overflow="fade|visible"`: stop rows default to a bounded list with vertical fades; `visible` shows every stop.
- `show-rows`: defaults to `6.5` and maps to `--fig-gradient-editor-overflow-show-rows`.
- Bubbling `input` / `change` detail is `{ type: "gradient", gradient, css }`.
- Interpolation remains locked to sRGB to match the fill picker’s current behavior.

## Gradient popup

`dialog[is="fig-popup-gradient"]` extends `fig-popup`, owns a
`fig-gradient-editor`, and observes `value`, `color-space`, `disabled`,
`overflow`, and `show-rows`.

- Defaults: `position="bottom left"`, `offset="0 8"`, `viewport-margin="8"`, and `popover="manual"`.
- Bubbling `input` / `change` detail is `{ type: "gradient", gradient, css }`.

## Palette popup

`dialog[is="fig-popup-palette"]` extends `fig-popup`, owns a
`fig-palette-editor`, and observes `value`, `min`, `max`, `fixed`, and
`disabled`, `overflow`, and `show-rows` in addition to inherited popup attributes.

- `value` property and bubbling `input` / `change` detail are normalized `{ color, alpha }[]`.
- Defaults: `position="bottom left"`, `offset="0 8"`, `viewport-margin="8"`, and `popover="manual"`.
- Import through `fig-editor.js`; create it with `document.createElement("dialog", { is: "fig-popup-palette" })` or matching HTML.

## Fill picker modes

Built-in: `solid`, `gradient`, `image`, `video`, `webcam`.

Gradient spaces: `srgb`, `srgb-linear`, `display-p3`, `oklab`, `oklch`, `hsl`.
Hue interpolations (oklch/hsl): `shorter`, `longer`, `increasing`, `decreasing`.

`fig-interpolation-swatch` observed: `value` (gradient payload). Size via attr/CSS.

## Color input + picker

When picker is registered, `fig-input-color` / `fig-input-fill` open it on interaction.

- Do not emit `input` from programmatic `value` writes (React loop avoidance)
- Custom mode JSON: `type` = mode name, remaining keys in payload
