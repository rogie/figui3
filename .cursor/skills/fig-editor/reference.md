# FigUI3 editor API reference

Playground: `/figui3#select`, `/figui3#fill-picker` (Full editor on).
Rules: `playground/src/lib/attributeRules.ts`.

## `fig-select-option`

Observed: `value`, `disabled`, `selected`, `label`.

- `value` falls back to trimmed `textContent` if the attr is omitted
- `label` is the closed-trigger string when option content is rich
- `role="option"`, `aria-selected`, `aria-disabled`

## `fig-select-options`

- Auto `slot="panel"` if missing
- Unwraps a legacy nested `fig-chooser`
- First `fig-separator` child gets `borderless`
- Overflow nav buttons: `data-fig-select-nav`, classes `overflow-start` / `overflow-end`
- Methods: `syncOverflow()`, `scrollToOption(option, behavior)`

## `fig-select` observed

`value`, `disabled`, `label`, `options`, `position`, `offset`, `closedby`, `open`, `variant`

Position enum (playground):

- `bottom left`, `bottom right`, `top left`, `top right`, `bottom center`, `top center`

Events: `input`, `change`, `optionhover`.

## Fill picker modes

Built-in: `solid`, `gradient`, `image`, `video`, `webcam`.

Gradient spaces: `srgb`, `srgb-linear`, `display-p3`, `oklab`, `oklch`, `hsl`.
Hue interpolations (oklch/hsl): `shorter`, `longer`, `increasing`, `decreasing`.

`fig-interpolation-swatch` observed: `value` (gradient payload). Size via attr/CSS.

## Color input + picker

When picker is registered, `fig-input-color` / `fig-input-fill` open it on interaction.

- Do not emit `input` from programmatic `value` writes (React loop avoidance)
- Custom mode JSON: `type` = mode name, remaining keys in payload
