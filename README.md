# FigUI3

A lightweight, zero-dependency web components library for building Figma plugin and widget UIs with native look and feel.

[![npm version](https://img.shields.io/npm/v/@rogieking/figui3.svg)](https://www.npmjs.com/package/@rogieking/figui3)
[![License](https://img.shields.io/badge/License-split-lightgrey.svg)](LICENSE)

**[Live Playground & Demos](https://rog.ie/figui3/)**

## Features

- Figma UI3 design system
- Zero dependencies
- ~228 KB JS + ~102 KB CSS minified
- Built with Web Components
- Automatic light/dark theme support
- Accessible with ARIA attributes and keyboard navigation
- Framework agnostic (React, Vue, Svelte, or vanilla JS)

## Accessibility Coverage

FigUI3 components are built to preserve native semantics where possible and add ARIA only where custom elements need extra state or naming.

- Form primitives forward accessible names and state to their native controls, including combo inputs, dropdowns, text, number, slider, checkbox, radio, switch, color, and fill inputs.
- Selection components use standard keyboard patterns: tabs use roving focus and `aria-controls`, segmented controls expose a radio-group pattern with focus following arrow selection, choosers expose listbox/options, and menus support trigger state, item focus, Escape close, and disabled items.
- Dialog, popup, tooltip, and toast surfaces expose names, close affordances, live-region behavior, Escape dismissal, and focus return behavior appropriate to their role.
- Media components render their visual surface inside `fig-preview`; image/video semantics stay on the native media element, upload controls remain keyboard reachable, slotted image overlays stay in light DOM for framework ownership, and generated video controls render below the preview instead of as an overlay.
- Display and pointer components expose useful semantics when interactive or informative: handles, swatches, color tips, layers, spinners, shimmers, and skeletons sync names, busy states, disabled states, keyboard movement, inert states, or hidden states as appropriate.
- Focus styling uses shared `--figma-focus-outline`, `--figma-focus-outline-offset`, and `--figma-focus-outline-radius` tokens so visible focus treatment stays consistent across components.
- Component contracts include Playwright keyboard/focus coverage plus an axe smoke suite for representative form, media, overlay, selection, and loading fixtures.

## Quick Start

Install:

```bash
npm install @rogieking/figui3
```

Import:

```js
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
```

Opt into `<fig-layer>` when you need collapsible layer lists:

```js
import "@rogieking/figui3/fig-layer.css";
import "@rogieking/figui3/fig-layer.js";
```

Opt into editor components like `<fig-select>` and the full Figma-style fill picker when you need them:

```js
import "@rogieking/figui3/fig-editor.css";
import "@rogieking/figui3/fig-editor.js";
```

Opt into experimental Lab and PropsKit components after the core imports:

```js
import "@rogieking/figui3/fig-lab.css";
import "@rogieking/figui3/fig-lab.js";
```

Or use a CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@rogieking/figui3@latest/dist/fig.css" />
<script type="module" src="https://unpkg.com/@rogieking/figui3@latest/dist/fig.js"></script>
```

Agent skills ship in `.cursor/skills/` (included in the npm package):

- `figui3` — core `fig.js` components
- `fig-editor` — `fig-select` and `fig-fill-picker`
- `fig-lab` — experimental `propskit-*`, canvas, AI, angle, wheel, reorder
- `propkit` — `/propskit` property-row composition

Minimal example:

```html
<fig-field direction="horizontal">
  <label>Color</label>
  <fig-input-color value="#FF5733" text="true"></fig-input-color>
</fig-field>
<fig-button variant="primary">Save</fig-button>
```

---

## Components

| Component | Tag | Description |
|---|---|---|
| [Button](#button) | `<fig-button>` | Buttons with variants, toggle, select, upload |
| [Dropdown](#dropdown) | `<fig-dropdown>` | Native select wrapper with Figma styling |
| [Select](#select) | `<fig-select>` | Custom listbox select (requires `fig-editor.js`) |
| [Combo Input](#combo-input) | `<fig-combo-input>` | Text input with dropdown suggestions |
| [Checkbox](#checkbox) | `<fig-checkbox>` | Checkbox with indeterminate state |
| [Radio](#radio) | `<fig-radio>` | Radio button |
| [Switch](#switch) | `<fig-switch>` | Toggle switch |
| [Slider](#slider) | `<fig-slider>` | Range, hue, opacity, delta, stepper |
| [Propskit Slider](#propskit-slider) | `<propskit-slider>` | Labeled field + slider combo |
| [Input Wheel](#input-wheel) | `<fig-input-wheel>` | Standalone SVG tick-and-handle numeric scrubber |
| [Propskit Wheel](#propskit-wheel) | `<propskit-wheel>` | Labeled input wheel with optional number field |
| [Propskit Color](#propskit-color) | `<propskit-color>` | Full-surface labeled color control |
| [Propskit Fill](#propskit-fill) | `<propskit-fill>` | Full-surface labeled fill control |
| [Propskit Gradient](#propskit-gradient) | `<propskit-gradient>` | Full-surface labeled gradient control |
| [Propskit Number](#propskit-number) | `<propskit-number>` | Full-surface labeled number control |
| [Propskit Position](#propskit-position) | `<propskit-position>` | Compact X/Y control |
| [Propskit Color Point](#propskit-color-point) | `<propskit-color-point>` | Collapsible color and position group |
| [Propskit Point Point](#propskit-point-point) | `<propskit-point-point>` | Collapsible start and end position group |
| [Propskit Point Radius](#propskit-point-radius) | `<propskit-point-radius>` | Collapsible position and radius group |
| [Propskit Point Radius Angle](#propskit-point-radius-angle) | `<propskit-point-radius-angle>` | Collapsible position, radius, and angle group |
| [Propskit Select](#propskit-select) | `<propskit-select>` | Full-surface labeled select control |
| [Propskit Switch](#propskit-switch) | `<propskit-switch>` | Full-surface labeled switch control |
| [Propskit Text](#propskit-text) | `<propskit-text>` | Full-surface labeled text control |
| [Text Input](#text-input) | `<fig-input-text>` | Styled text/textarea input |
| [Number Input](#number-input) | `<fig-input-number>` | Numeric input with units |
| [Input Angle](#input-angle) | `<fig-input-angle>` | Angle/rotation dial and text input |
| [Propskit Oscillator](#propskit-oscillator) | `<propskit-oscillator>` | Waveform oscillator editor |
| [Swatch](#swatch) | `<fig-swatch>` | Color/gradient/image swatch |
| [Color Tip](#color-tip) | `<fig-color-tip>` | Compact color tip with picker |
| [Color Input](#color-input) | `<fig-input-color>` | Color picker with hex/alpha |
| [Input Palette](#input-palette) | `<fig-input-palette>` | Editable multi-color palette |
| [Gradient Input](#gradient-input) | `<fig-input-gradient>` | Gradient editor with stops |
| [Fill Input](#fill-input) | `<fig-input-fill>` | Solid, gradient, image, video fill |
| [Fill Picker](#fill-picker) | `<fig-fill-picker>` | Full fill picker dialog |
| [Tabs](#tabs) | `<fig-tabs>` / `<fig-tab>` | Tabbed navigation |
| [Segmented Control](#segmented-control) | `<fig-segmented-control>` / `<fig-segment>` | Segmented button group |
| [Chooser](#chooser) | `<fig-chooser>` / `<fig-choice>` | Selection list with drag scroll |
| [Field](#field) | `<fig-field>` | Form field wrapper with layout |
| [Joystick](#joystick) | `<fig-joystick>` | 2D position input |
| [Origin Grid](#origin-grid) | `<fig-origin-grid>` | Transform-origin grid |
| [Easing Curve](#easing-curve) | `<fig-easing-curve>` | Bezier/spring curve editor |
| [3D Rotate](#3d-rotate) | `<fig-3d-rotate>` | 3D cube rotation control |
| [Handle](#handle) | `<fig-handle>` | Draggable handle on a surface |
| [Canvas Control](#canvas-control) | `<fig-canvas-control>` | Point with optional radius, angle, or second point |
| [Dialog](#dialog) | `<fig-dialog>` | Modal/non-modal dialog |
| [Popup](#popup) | `<fig-popup>` | Anchored floating surface |
| [Toast](#toast) | `<fig-toast>` | Toast notification |
| [Tooltip](#tooltip) | `<fig-tooltip>` | Hover/click tooltip |
| [Separator](#separator) | `<fig-separator>` / `<fig-menu-separator>` | Visual divider with an optional label |
| [Menu](#menu) | `<fig-menu>` | Triggered menu with keyboard navigation |
| [Header](#header) | `<fig-header>` | Section header |
| [Layer](#layer) | `<fig-layer>` | Collapsible layer list item from `fig-layer.js` |
| [Preview](#preview) | `<fig-preview>` | Thin visual preview layer |
| [Media](#media) | `<fig-media>` | Shared media host for image/video |
| [Image](#image) | `<fig-image>` | Image display/upload |
| [Card](#card) | `<fig-card>` | Media card with label, link, and selection chrome |
| [Video](#video) | `<fig-video>` | Video display/upload with playback controls |
| [Avatar](#avatar) | `<fig-avatar>` | Profile image or initials |
| [Icon](#icon) | `<fig-icon>` | Masked icon from design tokens |
| [Spinner](#spinner) | `<fig-spinner>` | Loading spinner |
| [Shimmer](#shimmer) | `<fig-shimmer>` | Shimmer loading placeholder |
| [Skeleton](#skeleton) | `<fig-skeleton>` | Skeleton loading placeholder |

---

### Form Controls

#### Button

`<fig-button>` — [demo](https://rog.ie/figui3/#button)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `variant` | string | `"primary"` | `"primary"`, `"secondary"`, `"destructive"`, `"destructiveSecondary"`, `"destructiveGhost"`, `"destructiveLink"`, `"ghost"`, `"link"` |
| `type` | string | `"button"` | `"button"`, `"toggle"`, `"submit"`, `"select"`, `"upload"` |
| `size` | string | — | `"large"`, `"compact"` |
| `selected` | boolean | `false` | Selected state (toggle type) |
| `disabled` | boolean | `false` | Disabled state |
| `icon` | boolean | `false` | Icon-only styling |
| `href` | string | — | URL for link buttons |
| `target` | string | — | Link target (e.g. `"_blank"`) |

```html
<fig-button>Primary</fig-button>
<fig-button variant="secondary">Secondary</fig-button>
<fig-button variant="destructive">Delete</fig-button>
<fig-button variant="destructiveSecondary">Destructive secondary</fig-button>
<fig-button variant="destructiveGhost">Destructive ghost</fig-button>
<fig-button variant="destructiveLink">Destructive link</fig-button>
<fig-button type="toggle" selected="true">Toggle</fig-button>
<fig-button variant="ghost" icon>
  <svg><!-- icon --></svg>
</fig-button>
```

`type="select"` and `type="upload"` are visual wrappers for native select/file controls. They avoid nested native buttons, show the shared focus outline on the wrapper, and open the native picker from keyboard activation where supported.

---

#### Dropdown

`<fig-dropdown>` — [demo](https://rog.ie/figui3/#dropdown)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Selected value |
| `type` | string | `"select"` | `"select"` or `"dropdown"` |
| `label` | string | — | Accessible label for the generated native `<select>` |
| `variant` | string | — | `"ghost"` for a borderless control with secondary hover fill |
| `disabled` | boolean | `false` | Disabled state |

```html
<fig-dropdown value="2">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</fig-dropdown>
```

Keyboard activation follows the native select pattern. Enter opens the closed picker.

---

#### Select

`<fig-select>` — [demo](https://rog.ie/figui3/#select)

Custom listbox select with overflow chevrons, grouped options, and sticky separators. Import `fig-editor.js` and `fig-editor.css`. Prefer this over `fig-dropdown` for Figma-style menus.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Selected option value |
| `label` | string | — | Closed-state / accessible label |
| `options` | string | — | Comma, newline, or JSON options if no authored `fig-select-option` children |
| `variant` | string | — | `"ghost"` for a borderless control with secondary hover fill |
| `full` | boolean | `false` | Stretch to available width |
| `position` | string | `"bottom left"` | Popup position |
| `disabled` | boolean | `false` | Disabled state |

Author options in `<fig-select-options>`, or pass `options`. Use `label` on `<fig-select-option>` when the option content is rich. `fig-separator` with `sticky` pins group labels while scrolling.

```html
<fig-select value="center" label="Align">
  <fig-select-options>
    <fig-select-option value="left">Left</fig-select-option>
    <fig-select-option value="center">Center</fig-select-option>
    <fig-select-option value="right">Right</fig-select-option>
  </fig-select-options>
</fig-select>
```

**Events:** `input`, `change`, `optionhover` (`detail` is the hovered option value).

---

#### Combo Input

`<fig-combo-input>` — [demo](https://rog.ie/figui3/#combo-input)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `options` | string | — | Comma-separated suggestion list |
| `placeholder` | string | — | Placeholder text |
| `value` | string | — | Current value |
| `disabled` | boolean | `false` | Disabled state |

```html
<fig-combo-input options="House, Apartment, Condo" placeholder="Residence type"></fig-combo-input>
```

---

#### Checkbox

`<fig-checkbox>` — [demo](https://rog.ie/figui3/#checkbox)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `checked` | boolean | `false` | Whether checked |
| `indeterminate` | boolean | `false` | Indeterminate state |
| `disabled` | boolean | `false` | Disabled state |
| `name` | string | — | Form field name |
| `value` | string | — | Value when checked |
| `label` | string | — | Label text (alternative to slotted content) |

```html
<fig-checkbox>Accept terms</fig-checkbox>
<fig-checkbox checked>Selected</fig-checkbox>
<fig-checkbox indeterminate>Parent option</fig-checkbox>
```

---

#### Radio

`<fig-radio>` — [demo](https://rog.ie/figui3/#radio)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `checked` | boolean | `false` | Whether selected |
| `disabled` | boolean | `false` | Disabled state |
| `name` | string | — | Radio group name |
| `value` | string | — | Value when selected |

```html
<fig-radio name="size" value="small">Small</fig-radio>
<fig-radio name="size" value="medium" checked>Medium</fig-radio>
<fig-radio name="size" value="large">Large</fig-radio>
```

---

#### Switch

`<fig-switch>` — [demo](https://rog.ie/figui3/#switch)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `checked` | boolean | `false` | Whether on |
| `disabled` | boolean | `false` | Disabled state |
| `name` | string | — | Form field name |
| `value` | string | — | Value when on |

```html
<fig-switch>Enable notifications</fig-switch>
<fig-switch checked>Active feature</fig-switch>
```

---

### Inputs

#### Slider

`<fig-slider>` — [demo](https://rog.ie/figui3/#slider)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `type` | string | `"range"` | `"range"`, `"hue"`, `"opacity"`, `"delta"`, `"stepper"` |
| `value` | number | midpoint for `type="range"` | Current value |
| `min` | number | `0` | Minimum |
| `max` | number | `100` | Maximum |
| `step` | number | `1` | Step increment |
| `default` | number | — | Default/reset value (shown as marker) |
| `text` | boolean | `true` | Show text input; set `text="false"` to hide |
| `placeholder` | string | `"##"` | Text input placeholder |
| `units` | string | — | Unit label (e.g. `"%"`, `"px"`) |
| `transform` | number | — | Display value multiplier |
| `color` | string | — | Track color (opacity type) |
| `variant` | string | — | Use `"classic"` to opt into the previous slider appearance |
| `precision` | number | — | Decimal places for output |
| `disabled` | boolean | `false` | Disabled state |

**Events:** `input` (continuous), `change` (on release).

```html
<fig-slider min="0" max="100" value="50" units="%"></fig-slider>
<fig-slider type="hue" value="180" text="false"></fig-slider>
<fig-slider type="opacity" value="75" color="#FF5733" units="%"></fig-slider>
```

For `type="range"`, omitting `value` follows native range behavior and starts at the midpoint of `min` and `max`. Arrow keys move by `step`; hold Shift to move by a larger step.

Full-surface `propskit-*` controls support `variant="minimal"`. The minimal variant removes vertical row padding and keeps the field background transparent until hover. It is available on switch, color, fill, gradient, select, text, number, slider, position, and wheel controls.

---

#### Propskit Number

`<propskit-number>`

Composes a `<fig-field>` and `<fig-input-number>` into a full-surface property control. Number attributes are forwarded to the inner input.

PropsKit controls use the 40px large layout when `size` is omitted. Set
`size="small"` for the compact 32px row layout. Explicit `size="large"`
remains supported as an alias for the default layout.

All PropsKit inputs expose `defaultValue`, `isDefault`, and `resetToDefault()`. A
`propskit-group` uses this shared contract to track its `dirty` state and reset
each nested input to its own current `default`. Set `size="small"` on a
`propskit-group` to apply the compact layout to nested controls that do not
define their own size.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Label"` | Field label text; use an empty value to hide it |
| `direction` | string | `"horizontal"` | Field layout direction |
| `size` | string | default | Set to `"small"` for the compact layout |
| `default` | number/string | initial `value` | Right-click reset target |
| `disabled` | boolean | `false` | Disable interaction |
| *number attrs* | — | — | All `<fig-input-number>` attributes are forwarded |

**Events:** `input`, `change` — forwarded from the inner number input.

Right-click and choose **Reset**, or call `resetToDefault()`, to restore `default` (falling back to the initial value).

```html
<propskit-number label="Width" value="24" min="0" max="100" units="px"></propskit-number>
```

---

#### Propskit Color

`<propskit-color>`

Composes a `<fig-field>` and a solid `fig-fill-picker` swatch into a full-surface property control. Clicking the field opens the color picker. There is no hex/opacity text field.

**Attributes:** `label`, `value`, `default`, `alpha`, `disabled`, `size`

**Events:** `input`, `change` — `{ color, alpha, opacity }` from the fill picker.

Right-click and choose **Reset**, or call `resetToDefault()`, to restore `default` or the initial color.

```html
<propskit-color label="Background" value="#0D99FF" alpha="true"></propskit-color>
```

---

#### Propskit Fill

`<propskit-fill>`

Composes a `<fig-field>` and a `fig-fill-picker` swatch into a full-surface property control, same chrome as `propskit-color`. Clicking the field opens the fill picker for solid, gradient, image, video, webcam, and custom modes. There is no hex/opacity text field.

**Attributes:** `label`, `value` (fill JSON), `default`, `mode`, `alpha`, `webcam-mode`, `default-video`, `disabled`, `size`

**Events:** `input`, `change` — fill object in `event.detail` (`{ type, ... }`).

Right-click and choose **Reset**, or call `resetToDefault()`, to restore `default` or the initial fill. Slot `mode-*` children onto the host to add custom picker tabs.

```html
<propskit-fill
  label="Fill"
  value='{"type":"solid","color":"#0D99FF","alpha":1}'
></propskit-fill>
```

---

#### Propskit Gradient

`<propskit-gradient>`

Composes a `<fig-field>` and `<fig-input-gradient>` into a full-surface property control. Defaults to `edit="picker"` — click the field to open the fill picker.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Label"` | Field label text; use an empty value to hide it |
| `value` | JSON string | default gradient | Canonical `{ "type": "gradient", "gradient": { ... } }` data |
| `default` | JSON string | initial `value` | Right-click and group reset target |
| `edit` | boolean/string | `"picker"` | `true` (inline stops), `false`, or `"picker"` |
| `mode` | string | `"handle"` | `"handle"` or `"tip"` stop presentation |
| `disabled` | boolean | `false` | Disabled state |
| `size` | string | default | Set to `"small"` for the compact layout |

**Events:** `input`, `change` — bubbling, composed events with `{ type: "gradient", gradient }` in `event.detail`.

**Methods and state:** `defaultValue`, `isDefault`, and `resetToDefault()`. JSON defaults use structural equality, so object key order does not affect dirty state.

Click the field to open the fill picker. With `edit="true"`, the first stop receives focus; Arrow keys move the selected stop, Shift+Arrow moves by 5%, Tab cycles stops, and Delete/Backspace removes a stop while preserving the two-stop minimum.

```html
<propskit-gradient
  label="Fill"
  value='{"type":"gradient","gradient":{"type":"linear","angle":90,"interpolationSpace":"srgb","hueInterpolation":"shorter","stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}'
  default='{"type":"gradient","gradient":{"type":"linear","angle":90,"interpolationSpace":"srgb","hueInterpolation":"shorter","stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}'
></propskit-gradient>
```

---

#### Propskit Switch

`<propskit-switch>`

Composes a `<fig-field>` and an Off/On `<fig-segmented-control>` into a full-surface boolean property control.

**Attributes:** `label`, `checked`, `default`, `disabled`, `name`, `value`, `size`

**Events:** `input`, `change` — forwarded from the inner switch.

Right-click and choose **Reset**, or call `resetToDefault()`, to restore the default checked state.

```html
<propskit-switch label="Visible" checked></propskit-switch>
```

---

#### Propskit Select

`<propskit-select>`

Composes a `<fig-field>` and `<fig-select>` into a full-surface property control. Requires `fig-editor.js` (which registers `fig-select`). Options can come from the `options` attribute (same formats as `fig-options`: comma-separated, newline-delimited, or a JSON array), or from an authored `<fig-select-options>` child for rich option content.

**Attributes:** `label`, `value`, `default`, `options`, `disabled`, `size`

**Events:** `input`, `change`, `optionhover` — forwarded from the inner select. `optionhover` fires once when the pointer enters an enabled option, with the option value in `event.detail`, without changing the selection.

Right-click and choose **Reset**, or call `resetToDefault()`, to restore `default` or the initial selection.

```html
<propskit-select label="Alignment" value="Center" options="Left,Center,Right"></propskit-select>
```

```html
<propskit-select label="Interpolation" value="srgb">
  <fig-select-options slot="panel">
    <fig-select-option value="srgb" label="Classic — sRGB Linear">
      <div><h3>Classic</h3><span>sRGB Linear</span></div>
    </fig-select-option>
  </fig-select-options>
</propskit-select>
```

---

#### Propskit Text

`<propskit-text>`

Composes a `<fig-field>` and `<fig-input-text>` into a full-surface, single-line property control. Text input attributes and adornment slots are forwarded to the inner control.

**Attributes:** `label`, `value`, `default`, `placeholder`, `type`, `disabled`, `readonly`, `autoresize`, `size`

**Events:** `input`, `change` — forwarded from the inner text input.

Right-click and choose **Reset**, or call `resetToDefault()`, to restore `default` or the initial text.

```html
<propskit-text label="Name" value="Layer 1" placeholder="Enter a name"></propskit-text>
```

---

#### Propskit Slider

`<propskit-slider>`

Wraps a `<fig-field>` and `<fig-slider>` into a single labeled control. All slider attributes (except `label`, `direction`) are forwarded to the inner slider.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | — | Field label text |
| `direction` | string | `"column"` | Layout direction |
| `size` | string | default | Set to `"small"` for the compact layout |
| `default` | number/string | initial `value` | Double-click and right-click reset target |
| `disabled` | boolean | `false` | Disable interaction |
| *slider attrs* | — | — | All `<fig-slider>` attributes except host-only PropsKit attributes are forwarded |

**Events:** `input`, `change` — forwarded from the inner slider.

Double-click or right-click and choose **Reset** to restore `default`, falling back to the initial value.

**Methods:** `resetToDefault()` triggers the same reset behavior.

```html
<propskit-slider label="Opacity" min="0" max="100" value="75" units="%"></propskit-slider>
```

---

#### Input Wheel

`<fig-input-wheel>`

A standalone interactive SVG tick-and-handle control for scrubbing numeric values. It is experimental and requires `fig-lab.js` and `fig-lab.css`.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | number | `0` | Current numeric value |
| `step` | number | `1` | Scrub increment |
| `spin` | boolean/string | `true` | Keep ticks synchronized to `value`; set `"false"` to leave them stationary |
| `min` | number | — | Inclusive lower bound; omit for no minimum |
| `max` | number | — | Inclusive upper bound; omit for no maximum |
| `disabled` | boolean | `false` | Disable interaction |

The `value`, `min`, `max`, and `step` properties mirror their attributes. `aria-valuetext` is numeric. `spinTo(value)` animates to a new value when `spin` is enabled. `focus()`, `beginScrub()`, `updateScrub()`, and `endScrub()` expose the interaction lifecycle for imperative integrations.

**Events:** numeric `input` while scrubbing and `change` on commit. Both bubble across shadow boundaries.

```html
<fig-input-wheel></fig-input-wheel>
<fig-input-wheel value="50" min="0" max="100"></fig-input-wheel>
<fig-input-wheel value="1.5" step="0.25"></fig-input-wheel>
```

---

#### Propskit Wheel

`<propskit-wheel>`

A labeled numeric scrubber that composes `<fig-input-wheel>` with an optional `<fig-input-number>`. The host provides row chrome and reset behavior; there is no `fig-field` or `fig-slider`.

Omitted `label` renders `"Value"`. If `label` is set, including `label=""`, that exact value is used. Units are omitted by default and arbitrary values such as `px` pass through unchanged. Units remain wrapper and number-field behavior: time aliases receive time-focused defaults, and the effective step is applied to the child wheel without setting a child `units` attribute.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Value"` when omitted | Authored values (including blank) are used as-is |
| `units` | string | — | Optional arbitrary units. `seconds` / `milliseconds` normalize to `s` / `ms` |
| `value` | number | `0` | Numeric value in `units`. Unbounded unless `min`/`max` are set |
| `min` | number | — | Inclusive lower bound. Omit for no minimum |
| `max` | number | — | Inclusive upper bound. Omit for no maximum |
| `step` | number | `1`; `0.1` (`s`) / `100` (`ms`) | Drag, keyboard, and mouse wheel increment |
| `precision` | number | `0`; `2` (`s`) / `0` (`ms`) | Displayed decimal places on the optional number field |
| `elastic` | boolean/string | `true` | Stretch the composed row past the wheel edges; set `"false"` to disable row stretch. The handle still pulls |
| `spin` | boolean/string | `true` | Keep wheel ticks synchronized to `value`; set `"false"` to update only the value and number field |
| `text` | boolean/string | `true` | Include the editable `fig-input-number`; set `"false"` for only `fig-input-wheel` |
| `size` | string | default | Set to `"small"` for the compact layout |
| `default` | number/string | initial `value` | Right-click reset target |
| `disabled` | boolean | `false` | Disable wheel and number |
| `variant` | string | — | `"minimal"` removes vertical padding |

**Events:** `input` while dragging or typing; `change` on commit. Dragging moves by `step` on every `input`; hold Shift to scrub at `10× step`. `precision` only formats the displayed number. Arrow keys on the focused wheel move by `step`; Shift+arrow moves by `10× step`.

```html
<propskit-wheel label="Duration" value="1.5" default="0" units="seconds"></propskit-wheel>
<propskit-wheel label="Delay" value="240" default="0" min="0" max="1000" units="ms"></propskit-wheel>
<propskit-wheel label="Frames" value="12" text="false"></propskit-wheel>
<propskit-wheel label="Amount" value="12" spin="false"></propskit-wheel>
```

---

#### Propskit Position

`<propskit-position>`

A compact X/Y field with optional percentage units.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `x` | number | `50` | Horizontal value |
| `y` | number | `50` | Vertical value |
| `default` | JSON string | initial `{ x, y }` | Right-click and group reset target |
| `label` | string | `"Position"` | Field label; empty values use the semantic default |
| `units` | string | — | `"percent"` shows `%`; omit for no units |
| `size` | string | default | Set to `"small"` for the compact row |
| `disabled` | boolean | `false` | Disable both number inputs |

**Properties and methods:** `x`, `y`, and `value` expose the current coordinates; `defaultValue` returns the normalized reset object; `isDefault` compares both coordinates; `resetToDefault()` restores both values.

**Events:** `input` and `change` bubble across shadow boundaries with numeric `{ x, y, units }` in `event.detail`.

```html
<propskit-position
  label="Position"
  x="50"
  y="50"
  units="percent"
  default='{"x":50,"y":50}'
></propskit-position>
```

---

#### Propskit Color Point

`<propskit-color-point>`

A compact `<fig-group>` wrapper that combines `<propskit-color>` and `<propskit-position>`. The group is collapsible and open by default.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | — | Passed to the internal `fig-group` as `name` |
| `value` | JSON string | `{"x":50,"y":50,"color":"#D9D9D9"}` | Current color-point value |
| `collapsible` | boolean | `true` | Passed to the internal `fig-group` |
| `open` | boolean | `true` | Passed to the internal `fig-group` |
| `size` | string | default | Passed to both internal PropsKit controls |
| `disabled` | boolean | `false` | Disable both internal controls |

The internal group always has `compact`. `value` uses the same `{ x, y, color }` shape as `<fig-canvas-control type="color">`.

**Events:** `input` and `change` bubble with numeric coordinates and `units` in `event.detail`. `openchange` mirrors the internal group's expanded state.

```html
<propskit-color-point
  label="Light"
  value='{"x":50,"y":50,"color":"#FF00BF"}'
></propskit-color-point>
```

---

#### Propskit Point Radius

`<propskit-point-radius>`

A compact `<fig-group>` wrapper that combines `<propskit-position>` and `<propskit-number>` for point-radius values. The group is collapsible and open by default.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | — | Passed to the internal `fig-group` as `name` |
| `value` | JSON string | `{"x":50,"y":50,"radius":0}` | Current point-radius value |
| `collapsible` | boolean | `true` | Passed to the internal `fig-group` |
| `open` | boolean | `true` | Passed to the internal `fig-group` |
| `units` | string | — | `"percent"` passes percentage units to position and radius; omit for no units |
| `size` | string | default | Passed to both internal PropsKit controls |
| `disabled` | boolean | `false` | Disable both internal controls |

The internal group always has `compact`. `value` uses the same `{ x, y, radius }` shape as `<fig-canvas-control type="point-radius">`. Numeric radius values use pixels; percentage strings preserve `%`.

**Events:** `input` and `change` bubble with numeric `{ x, y, radius, units }` in `event.detail`. `openchange` mirrors the internal group's expanded state.

```html
<propskit-point-radius
  label="Blur"
  units="percent"
  value='{"x":50,"y":50,"radius":"25%"}'
></propskit-point-radius>
```

---

#### Propskit Point Radius Angle

`<propskit-point-radius-angle>`

A compact `<fig-group>` wrapper combining `<propskit-position>` with radius and angle `<propskit-number>` controls. The group is collapsible and open by default.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | — | Passed to the internal `fig-group` as `name` |
| `value` | JSON string | `{"x":50,"y":50,"radius":0,"angle":0}` | Current point-radius-angle value |
| `collapsible` | boolean | `true` | Passed to the internal `fig-group` |
| `open` | boolean | `true` | Passed to the internal `fig-group` |
| `units` | string | — | `"percent"` passes percentage units to position and radius; omit for no units |
| `size` | string | default | Passed to every internal PropsKit control |
| `disabled` | boolean | `false` | Disable every internal control |

The internal group always has `compact`. `value` uses the same `{ x, y, radius, angle }` shape as `<fig-canvas-control type="point-radius-angle">`. Numeric radius values use pixels; percentage strings preserve `%`. Angles are degrees.

**Events:** `input` and `change` bubble with numeric `{ x, y, radius, angle, units }` in `event.detail`. `openchange` mirrors the internal group's expanded state.

```html
<propskit-point-radius-angle
  label="Gradient"
  units="percent"
  value='{"x":50,"y":50,"radius":"25%","angle":45}'
></propskit-point-radius-angle>
```

---

#### Propskit Point Point

`<propskit-point-point>`

A compact `<fig-group>` wrapper combining start and end `<propskit-position>` controls. The group is collapsible and open by default.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | — | Passed to the internal `fig-group` as `name` |
| `value` | JSON string | `{"x":50,"y":50,"x2":75,"y2":75}` | Current point-point value |
| `collapsible` | boolean | `true` | Passed to the internal `fig-group` |
| `open` | boolean | `true` | Passed to the internal `fig-group` |
| `units` | string | — | `"percent"` passes percentage units to both positions; omit for no units |
| `size` | string | default | Passed to both position controls |
| `disabled` | boolean | `false` | Disable both position controls |

The internal group always has `compact`. `value` uses the same `{ x, y, x2, y2 }` shape as `<fig-canvas-control type="point-point">`.

**Events:** `input` and `change` bubble with numeric `{ x, y, x2, y2, units }` in `event.detail`. `openchange` mirrors the internal group's expanded state.

```html
<propskit-point-point
  label="Gradient"
  units="percent"
  value='{"x":25,"y":25,"x2":75,"y2":75}'
></propskit-point-point>
```

---

#### Text Input

`<fig-input-text>` — [demo](https://rog.ie/figui3/#text-input)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Input value |
| `placeholder` | string | — | Placeholder text |
| `type` | string | `"text"` | `"text"` or `"number"` |
| `disabled` | boolean | `false` | Disabled state |
| `multiline` | boolean | `false` | Use textarea |
| `min` | number | — | Min (number type) |
| `max` | number | — | Max (number type) |
| `step` | number | — | Step (number type) |
| `transform` | number | — | Display multiplier |

```html
<fig-input-text value="Hello" placeholder="Enter text..."></fig-input-text>
<fig-input-text multiline placeholder="Enter description..."></fig-input-text>
```

---

#### Number Input

`<fig-input-number>` — [demo](https://rog.ie/figui3/#number-input)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Numeric value |
| `placeholder` | string | — | Placeholder text |
| `min` | number | — | Minimum |
| `max` | number | — | Maximum |
| `step` | number | — | Step increment |
| `units` | string | — | Unit string (e.g. `"px"`, `"%"`) |
| `units-disallow` | string | `"px"` | Comma-separated unit disallow list (e.g. `"px,rem"`) |
| `unit-position` | string | `"suffix"` | `"suffix"` or `"prefix"` |
| `transform` | number | — | Display multiplier |
| `precision` | number | — | Fixed displayed decimal places; omitted values use up to two places |
| `steppers` | boolean | `false` | Show spin buttons |
| `disabled` | boolean | `false` | Disabled state |

```html
<fig-input-number value="100" units="px"></fig-input-number>
<fig-input-number value="50" units="%" min="0" max="100"></fig-input-number>
```

---

#### Input Angle

`<fig-input-angle>` — [demo](https://rog.ie/figui3/#angle-input)

Angle/rotation input with circular dial, optional text input, multi-unit support, and unbounded winding past 360deg. Accepts unit suffixes in text input (`90deg`, `3.14rad`, `0.5turn`).

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | number | `0` | Angle value |
| `precision` | number | `1` | Decimal places |
| `text` | boolean | `false` | Show text input |
| `dial` | boolean | `true` | Show circular dial |
| `min` | number | — | Minimum (omit for unbounded) |
| `max` | number | — | Maximum (omit for unbounded) |
| `units` | string | `"°"` | `"°"` / `"deg"`, `"rad"`, `"turn"` |
| `rotations` | boolean | `false` | Show rotation counter |

**Events:** `input` (continuous), `change` (on release).

```html
<fig-input-angle value="90" text="true"></fig-input-angle>
<fig-input-angle text="true" units="rad" value="3.14159"></fig-input-angle>
<fig-input-angle text="true" rotations value="1080"></fig-input-angle>
```

---

#### Propskit Oscillator

`<propskit-oscillator>`

Waveform oscillator input with composable wave functions, live SVG waveform preview, draggable parameter handles, and direct numeric controls.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | JSON string | — | `{"waves":[{"type":"sine","frequency":1,"amplitude":1,"phase":0,"offset":0}]}` |
| `default` | JSON string | initial `value` | Right-click reset target |
| `precision` | number | `2` | Decimal places |
| `aspect-ratio` | string | `"2 / 1"` | Editor aspect ratio |
| `edit` | boolean | `true` | Show editor and number fields; set to `"false"` for preview only |
| `disabled` | boolean | `false` | Disable interaction |

Supported `type` values: `"sine"`, `"square"`, `"sawtooth"`, `"triangle"`.

**Properties:** `value` returns a normalized JSON string. `data` returns `{ waves }`. Single-wave JSON values are still accepted and normalized into `waves`.

Right-click and choose **Reset**, or call `resetToDefault()`, to restore the oscillator value.

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ value, data, preset }` — while dragging or editing |
| `change` | `{ value, data, preset }` — on release or committed edit |

```html
<propskit-oscillator
  value='{"waves":[{"type":"sine","frequency":1,"amplitude":1,"phase":0,"offset":0},{"type":"triangle","frequency":2,"amplitude":0.5,"phase":0,"offset":0}]}'
></propskit-oscillator>
```

---

### Color & Fill

#### Swatch

`<fig-swatch>` — [demo](https://rog.ie/figui3/#swatch)

A color/gradient/image swatch element with checkerboard background for alpha.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `background` | string | — | CSS background value |
| `size` | string | `"small"` | `"small"` or `"large"` |
| `selected` | boolean | `false` | Selection ring |
| `disabled` | boolean | `false` | Disabled state |
| `alpha` | number | — | Opacity (0-1) |

```html
<fig-swatch background="#FF5733"></fig-swatch>
<fig-swatch background="linear-gradient(90deg, #FF0000, #0000FF)" size="large"></fig-swatch>
```

---

#### Color Tip

`<fig-color-tip>` — [demo](https://rog.ie/figui3/#color-tip)

A compact solid-color swatch. Uses `<fig-fill-picker>` when the optional picker is registered, otherwise falls back to the native color input.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Color string (hex/rgb/hsl/named) |
| `selected` | boolean | `false` | Selected state |
| `disabled` | boolean | `false` | Disabled state |
| `alpha` | boolean | `false` | Show alpha controls |
| `control` | string | — | `"add"` or `"remove"` for icon-only mode |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ color, alpha, opacity }` — while editing |
| `change` | `{ color, alpha, opacity }` — on commit |
| `add` | — (when `control="add"` is clicked) |
| `remove` | — (when `control="remove"` is clicked) |

```html
<fig-color-tip value="#FF5733"></fig-color-tip>
<fig-color-tip value="#00AAFF" alpha="true"></fig-color-tip>
```

---

#### Color Input

`<fig-input-color>` — [demo](https://rog.ie/figui3/#color-input)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Hex color (e.g. `"#FF5733"` or `"#FF573380"`) |
| `text` | boolean | `false` | Show hex text input |
| `alpha` | boolean | `true` | Show alpha slider; set `alpha="false"` to hide opacity controls |
| `mode` | string | — | Color mode (`"hex"`, `"rgb"`, `"hsl"`) |
| `picker-*` | string | — | Forwarded to `<fig-fill-picker>` when the optional picker is registered |
| `disabled` | boolean | `false` | Disabled state |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ value, hex, rgba, color, alpha, opacity }` |
| `change` | `{ value, hex, rgba, color, alpha, opacity }` |

`value`, `hex`, and `rgba` retain their legacy values. The additive aliases use opaque `#RRGGBB` for `color`, `0–1` for `alpha`, and `0–100` for `opacity`.

```html
<fig-input-color value="#FF5733" text="true"></fig-input-color>
```

When `fig-editor.js` is imported, swatch activation opens `<fig-fill-picker>`. Without it, the native color input is used.

---

#### Input Palette

`<fig-input-palette>`

An editable palette of solid colors, each rendered as a `<fig-input-color>` swatch with add/remove support.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | JSON array of hex strings or `{color, alpha}` objects |
| `disabled` | boolean | `false` | Disabled state |
| `min` | number | `2` | Minimum number of colors |
| `max` | number | `8` | Maximum (add button hidden at max) |
| `open` | boolean | `false` | Expanded rows with text inputs per color |
| `fixed` | boolean | `false` | Lock palette length — no add or remove (`fixed` or `fixed="true"`) |

**Events:**

| Event | Detail |
|---|---|
| `input` | Full color array (during editing) |
| `change` | Full color array (on commit or add) |

```html
<fig-input-palette value='["#FF0000","#00FF00","#0000FF"]'></fig-input-palette>
<fig-input-palette value='[{"color":"#FF0000","alpha":0.5},{"color":"#00FF00","alpha":1}]' open></fig-input-palette>
```

The collapsed palette is a single tab stop. Enter or Space expands it, and focus styling uses the shared focus outline tokens on the visible swatch row.

---

#### Gradient Input

`<fig-input-gradient>`

A gradient editor with draggable stops. With `edit="picker"` and the optional picker registered, it opens `<fig-fill-picker>` locked to gradient mode; otherwise it falls back to inline stop editing.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | JSON gradient fill data |
| `edit` | boolean/string | `true` | `true`, `false`, or `"picker"` |
| `mode` | string | `"handle"` | `"handle"` renders color stop handles without tips; `"tip"` renders persistent color tips |
| `disabled` | boolean | `false` | Disabled state |
| `picker-*` | string | — | Passthrough picker attributes |

Supported interpolation spaces: `srgb`, `srgb-linear`, `display-p3`, `oklab`, `oklch` (with `hueInterpolation`: `shorter`, `longer`, `increasing`, `decreasing`).

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ type, gradient }` |
| `change` | `{ type, gradient }` |

```html
<fig-input-gradient
  value='{"type":"gradient","gradient":{"type":"linear","angle":90,"interpolationSpace":"oklab","stops":[{"position":0,"color":"#FF0000","opacity":100},{"position":100,"color":"#0000FF","opacity":100}]}}'
></fig-input-gradient>
```

---

#### Fill Input

`<fig-input-fill>` — [demo](https://rog.ie/figui3/#fill-input)

A comprehensive fill input supporting solid, gradient, image, video, and webcam fills. Without the optional picker, it renders a passive preview.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | JSON fill data |
| `disabled` | boolean | `false` | Disabled state |
| `mode` | string | — | Lock to a fill mode |
| `alpha` | boolean | `true` | Show alpha controls |
| `webcam-mode` | string | `live` | Forwarded to the picker: `live` or `snapshot` |
| `default-video` | string | — | Forwarded sample clip URL when Video has no file |
| `picker-*` | string | — | Forwarded to `<fig-fill-picker>` when the optional picker is registered |

Add `aria-label` to name the generated picker, hex field, and opacity field as one fill control group.

Solid `alpha` is 0–1 (canonical). `opacity` 0–100 is also emitted for compatibility. Gradient values include `css`. Webcam JSON is `{ type, webcam }` — never a live `MediaStream`. Read `webcamStream` or listen for `webcamstream`. Video swatches use `video.poster`, not the mp4 URL.

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ type, color?, gradient?, image?, video?, webcam?, css }` |
| `change` | `{ type, color?, gradient?, image?, video?, webcam?, css }` |
| `webcamstream` | `{ stream, deviceId }` |

```html
<fig-input-fill value='{"type":"solid","color":"#FF5733","opacity":100}'></fig-input-fill>
```

---

#### Fill Picker

`<fig-fill-picker>` — [demo](https://rog.ie/figui3/#fill-picker)

Optional full fill picker dialog supporting solid, gradient, image, video, and webcam. Import `fig-editor.js` and `fig-editor.css` to register and style it.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | JSON fill value |
| `disabled` | boolean | `false` | Disabled state |
| `alpha` | boolean | `true` | Show alpha controls |
| `mode` | string | — | Lock to mode: `"solid"`, `"gradient"`, `"image"`, `"video"`, `"webcam"` |
| `webcam-mode` | string | `live` | `live` keeps the camera after close; Capture always writes an image still |
| `default-video` | string | — | Sample clip URL when Video is selected with no file |

Webcam JSON is `{ type: "webcam", webcam: { live, snapshot, deviceId, scaleMode, scale, opacity } }`. The live `MediaStream` is `webcamStream` / `webcamstream`, not `value`. Closing the dialog does not stop a live camera; call `releaseWebcam()` or disconnect the element. Capture in `live` mode only updates `webcam.snapshot`. Video JSON includes `poster`; the swatch paints that, never `url(file.mp4)`.

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ type, gradient?, color?, image?, video?, webcam?, css }` |
| `change` | `{ type, gradient?, color?, image?, video?, webcam?, css }` |
| `webcamstream` | `{ stream, deviceId }` |

```html
<fig-fill-picker value='{"type":"solid","color":"#FF5733"}'>
  <fig-swatch></fig-swatch>
</fig-fill-picker>
```

---

### Selection

#### Tabs

`<fig-tabs>` / `<fig-tab>` — [demo](https://rog.ie/figui3/#tabs)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Selected tab value |
| `name` | string | — | Tabs group identifier |
| `disabled` | boolean | `false` | Disable all tabs |

**Events:** `input`, `change` with selected tab value.

Tabs use `role="tablist"` / `role="tab"` and roving focus. Use `content="#panel-id"` on each `<fig-tab>` to associate generated tab panels. Focus-visible tabs use the shared focus outline tokens.

```html
<fig-tabs value="tab1">
  <fig-tab value="tab1">General</fig-tab>
  <fig-tab value="tab2">Advanced</fig-tab>
</fig-tabs>
```

---

#### Segmented Control

`<fig-segmented-control>` / `<fig-segment>` — [demo](https://rog.ie/figui3/#segmented-control)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `name` | string | — | Group identifier |
| `value` | string | — | Selected segment value |
| `animated` | boolean | `false` | Animate indicator transitions |
| `sizing` | string | `"equal"` | `"equal"` or `"auto"` width mode |

**Events:** `input`, `change` — detail contains the selected value.

Segmented controls expose a radio-group pattern. Arrow keys, Home, and End move selection between enabled segments and move focus to the selected segment.

```html
<fig-segmented-control>
  <fig-segment value="left" selected="true">Left</fig-segment>
  <fig-segment value="center">Center</fig-segment>
  <fig-segment value="right">Right</fig-segment>
</fig-segmented-control>
```

---

#### Chooser

`<fig-chooser>` / `<fig-choice>`

A selection list controller. `<fig-choice>` elements are selectable options within a `<fig-chooser>`.
When app code rebuilds a chooser by setting `fig-chooser.innerHTML`, the chooser restores its overflow buttons automatically. Choices remain direct light-DOM children (React-safe).

**fig-chooser attributes:**

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Selected choice value. Omit to select the first choice; `value=""` means none. |
| `choice-element` | string | `"fig-choice"` | CSS selector for child choices |
| `layout` | string | `"vertical"` | `"vertical"`, `"horizontal"`, `"grid"` |
| `columns` | number | `2` | Grid column count when `layout="grid"` |
| `disabled` | boolean | `false` | Disabled state |
| `drag` | boolean | `false` | Enable drag-to-scroll |
| `overflow` | string | — | Overflow behavior |
| `loop` | boolean | `false` | Loop keyboard navigation |
| `auto-scroll` | boolean | `true` | Automatically center the selection after selection, layout, resize, or media changes. Set to `"false"` to disable. |
| `scroll-behavior` | string | `"smooth"` | Selection and overflow-button scrolling behavior: `"smooth"` or `"auto"`. The CSS `scroll-behavior` property can also override it. |

**fig-choice attributes:**

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Choice identifier |
| `selected` | boolean | `false` | Selected state |
| `disabled` | boolean | `false` | Disabled state |

**Events (on fig-chooser):** `input`, `change` — detail is the selected value string.

Selection follows the native `<select>` pattern: set `chooser.value` with a choice value, or set `chooser.selectedChoice` with a choice element. Neither programmatic selection nor scrolling emits events.

When `auto-scroll="false"`, reveal the current selection explicitly with `chooser.scrollSelectionIntoView(options?)`. It accepts native-style `ScrollIntoViewOptions` (`behavior`, `block`, and `inline`) and centers by default.

```html
<fig-chooser value="opt1">
  <fig-choice value="opt1">Option 1</fig-choice>
  <fig-choice value="opt2">Option 2</fig-choice>
  <fig-choice value="opt3">Option 3</fig-choice>
</fig-chooser>
```

---

### Spatial Controls

#### Joystick

`<fig-joystick>`

A 2D position input control with optional X/Y fields.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | `"50% 50%"` | Position as percentages |
| `precision` | number | — | Decimal places |
| `transform` | number | — | Output scaling |
| `fields` | boolean | `false` | Show X/Y inputs |
| `coordinates` | string | `"screen"` | `"screen"` (0,0 top-left) or `"math"` (0,0 bottom-left) |
| `aspect-ratio` | string | `"1 / 1"` | Plane ratio |
| `axis-labels` | string | — | Comma- or space-delimited labels. 1 value: top. 2 values: x y. 4 values: left right top bottom |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ x, y, value }` — while dragging |
| `change` | `{ x, y, value }` — on release |

```html
<fig-joystick value="50% 50%" fields="true" precision="2"></fig-joystick>
```

Keyboard focus lands on the internal handle. Arrow keys move the handle and keep focus on it during interaction.

---

#### Origin Grid

`<fig-origin-grid>`

A transform-origin grid control with a draggable handle and optional X/Y percentage fields.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | `"50% 50%"` | CSS transform-origin pair |
| `precision` | number | `0` | Decimal places |
| `aspect-ratio` | string | — | Grid aspect ratio |
| `drag` | boolean | `true` | Enable handle dragging |
| `fields` | boolean | `false` | Show X/Y fields |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ value, x, y }` — while dragging |
| `change` | `{ value, x, y }` — on release |

```html
<fig-origin-grid value="50% 50%" drag="true" fields="true"></fig-origin-grid>
```

The internal handle uses the shared focus outline and supports Arrow, Shift+Arrow, Home, and End keyboard movement.

---

#### Easing Curve

`<fig-easing-curve>`

An interactive bezier or spring easing curve editor with a preset dropdown and manual value input.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Bezier: `"0.42, 0, 0.58, 1"` or Spring: `"spring(200, 15, 1)"` |
| `precision` | number | `2` | Decimal places |
| `aspect-ratio` | string | — | Editor aspect ratio |
| `edit` | boolean | `true` | Show the editor and custom bezier/spring options; set to `"false"` for preset-only |

**Static:** `FigEasingCurve.PRESETS` — built-in preset array. `FigEasingCurve.curveIcon(value)` — SVG icon helper.

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ mode, value, cssValue, preset }` — while dragging |
| `change` | `{ mode, value, cssValue, preset }` — on release |

```html
<fig-easing-curve value="0.42, 0, 0.58, 1"></fig-easing-curve>
<fig-easing-curve value="spring(200, 15, 1)" edit="false"></fig-easing-curve>
```

Editable bezier and spring handles are keyboard operable. Bezier handles keep tab order aligned with the visual handle order.

---

#### 3D Rotate

`<fig-3d-rotate>`

An interactive 3D cube for setting rotation values. Supports drag interaction and optional X/Y/Z number fields.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | CSS transform, e.g. `"rotateX(20deg) rotateY(-35deg) rotateZ(0deg)"` |
| `precision` | number | `1` | Decimal places |
| `aspect-ratio` | string | — | Cube container ratio |
| `fields` | boolean | `false` | Show X/Y/Z number inputs |
| `perspective` | string | — | CSS perspective value |
| `perspective-origin` | string | — | CSS perspective-origin |
| `transform-origin` | string | — | CSS transform-origin |
| `selected` | string | — | Highlighted face |
| `drag` | boolean | `true` | Enable drag rotation |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ value, rotateX, rotateY, rotateZ }` — while dragging |
| `change` | `{ value, rotateX, rotateY, rotateZ }` — on release |

```html
<fig-3d-rotate value="rotateX(20deg) rotateY(-35deg) rotateZ(0deg)" fields="true"></fig-3d-rotate>
```

---

#### Handle

`<fig-handle>`

A draggable handle element. Positioned on a `drag-surface` container with axis constraints and snapping. Used internally by gradient editors and spatial controls, but also available standalone.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Position as `"X% Y%"` |
| `color` | string | — | Handle color |
| `selected` | boolean | `false` | Selected state |
| `disabled` | boolean | `false` | Disabled state |
| `drag` | boolean | `false` | Enable dragging |
| `drag-surface` | string | — | CSS selector for drag container (defaults to parent) |
| `drag-axes` | string | `"xy"` | Constrain axes: `"x"`, `"y"`, `"xy"` |
| `drag-snapping` | string | — | Snapping behavior |
| `type` | string | — | `"color"` for a color handle with direct picker activation |
| `tip` | string | — | `"color"`, `"add"`, or `"remove"` to show a persistent `fig-color-tip` |
| `hit-area` | string | — | Expanded interaction zone (unitless px). `"8"`, `"8 12"` (v h), or `"8 circle"` |
| `hit-area-mode` | string | `"handle"` | `"handle"` proxies to handle drag/select; `"delegate"` emits `hitareadown` event |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ x, y, px, py, shiftKey }` — while dragging |
| `change` | `{ x, y, px, py }` — on release |
| `input` | `{ color, alpha, opacity }` — while editing a `type="color"` handle |
| `change` | `{ color, alpha, opacity }` — when committing a `type="color"` handle |
| `add` | — (when `tip="add"`) |
| `remove` | — (when `tip="remove"`) |
| `hitareadown` | `{ originalEvent }` — when `hit-area-mode="delegate"` and the hit area is clicked |

```html
<div style="position: relative; width: 200px; height: 200px; background: #eee;">
  <fig-handle drag="true" value="50% 50%"></fig-handle>
</div>
```

When `drag="true"`, focused handles support Arrow key movement, Home/End jumps, and a tokenized focus outline with a 1px offset.

---

#### Canvas Control

`<fig-canvas-control>` — [demo](https://rog.ie/figui3/#canvas-control)

A composite point control with optional radius circle, angle handle, or second point. Place inside a positioned container; the component uses `display: contents` and does not create its own box.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `type` | string | `"point"` | `"point"`, `"color"`, `"point-radius"`, `"point-radius-angle"`, `"point-point"` |
| `value` | JSON string | — | `{ "x": 50, "y": 50 }` — see type-specific shapes below |
| `name` | string | — | Tooltip label(s). Comma-separated for two handles: `"Start, End"` |
| `color` | string | — | Passthrough color for `type="color"` handle |
| `tooltips` | string | `"true"` | Show value tooltips on interaction |
| `disabled` | boolean | `false` | Disable all interaction |
| `drag-surface` | string | `"parent"` | Forwarded to inner `fig-handle`s |
| `snapping` | string | `"false"` | `"false"`, `"true"`, `"modifier"` — applies to all handles |

**Value shapes by type:**

| Type | Value shape |
|---|---|
| `point`, `color` | `{ x, y }` |
| `point-radius` | `{ x, y, radius }` — radius: number (px) or `"25%"` |
| `point-radius-angle` | `{ x, y, radius, angle }` — angle in degrees |
| `point-point` | `{ x, y, x2, y2 }` — angle and length inferred |

**Events:**

| Event | Detail |
|---|---|
| `input` | Value object (shape depends on type) — while dragging |
| `change` | Value object (shape depends on type) — on release |

For `type="color"`, color edits add `{ color, alpha, opacity }` to the positional value object.

For `point-point`, both handles support direct drag (with a dynamic directional resize cursor) and rotation via their hit area (dragging from the hit area rotates around the opposite handle at fixed distance, with a rotate cursor).

```html
<div style="position: relative; width: 200px; height: 200px; background: #eee;">
  <fig-canvas-control
    type="point-point"
    name="Start, End"
    value='{"x":25,"y":25,"x2":75,"y2":75}'
    snapping="modifier"
  ></fig-canvas-control>
</div>
```

---

### Layout & Feedback

#### Field

`<fig-field>` — [demo](https://rog.ie/figui3/#field)

A form field wrapper with flexible layout. Automatically links `<label>` to the first `fig-*` child for accessibility.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `direction` | string | `"column"` | `"column"`, `"row"`, `"horizontal"` |
| `columns` | string | — | Split preset: `"thirds"` or `"half"` |
| `label` | string | — | Programmatic label text |

```html
<fig-field direction="horizontal" columns="thirds">
  <label>Opacity</label>
  <fig-slider value="50" units="%"></fig-slider>
</fig-field>
```

---

#### Dialog

`<fig-dialog>` — [demo](https://rog.ie/figui3/#dialog)

A modal/non-modal dialog. Uses `is="fig-dialog"` on a native `<dialog>` element.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `open` | boolean | `false` | Visible state |
| `modal` | boolean | `false` | Modal mode |
| `drag` | boolean | `false` | Draggable |
| `handle` | string | — | CSS selector for drag handle |
| `position` | string | — | `"center center"`, `"top left"`, etc. |

```html
<dialog is="fig-dialog" id="myDialog" modal drag handle="fig-header" position="center center">
  <fig-header>Dialog Title</fig-header>
  <fig-content padding><p>Content here.</p></fig-content>
</dialog>
```

Use `padding` on `fig-content` for prose-only content. Leave it off when
rendering `fig-field` or `fig-group` children, which provide their own gutters.

Dialog close paths restore focus to the element that opened the dialog.

---

#### Popup

`<fig-popup>` — [demo](https://rog.ie/figui3/#popup)

An anchored floating surface built on `<dialog>` with collision-aware positioning.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `anchor` | string | — | CSS selector for anchor element |
| `position` | string | `"top center"` | Placement |
| `offset` | string | `"0 0"` | X/Y offset |
| `viewport-margin` | string | `"8"` | Viewport safety margin |
| `variant` | string | — | `"popover"` for beak styling |
| `theme` | string | — | `"light"`, `"dark"`, `"menu"` |
| `closedby` | string | `"any"` | `"any"`, `"closerequest"`, `"none"` |
| `open` | boolean | `false` | Open state |
| `drag` | boolean | `false` | Draggable |
| `handle` | string | — | CSS selector for drag handle |
| `autoresize` | boolean | `false` | Auto-resize to content |
| `title` | string | — | Auto-generated header (same as `fig-dialog`) |

```html
<dialog is="fig-popup" anchor="#my-button" position="center right" variant="popover">
  <fig-header><h3>Popup</h3></fig-header>
</dialog>
```

Popups restore focus on close. Escape dismissal is scoped so nested menu and overlay behavior can keep its own keyboard handling.

---

#### Toast

`<fig-toast>` — [demo](https://rog.ie/figui3/#toast)

A toast notification. Uses `is="fig-toast"` on a native `<dialog>`.
Defaults to `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`. Use `live="assertive"` or `theme="danger"` for assertive announcements.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `duration` | number | `5000` | Auto-dismiss ms (0 = no dismiss) |
| `offset` | number | `16` | Distance from bottom |
| `theme` | string | `"dark"` | `"dark"`, `"light"`, `"danger"`, `"brand"`, `"auto"` |
| `live` | string | — | `"assertive"` for urgent announcements |
| `icon` | string | — | Optional `fig-icon` name prepended when set; always rendered at full size |
| `dismiss` | boolean | `false` | Appends a ghost close button that hides the toast |

```html
<dialog is="fig-toast" id="myToast" theme="brand" icon="warning" dismiss="true" duration="3000">
  Settings saved!
</dialog>
<fig-button onclick="document.getElementById('myToast').showToast()">Show</fig-button>
```

---

#### Tooltip

`<fig-tooltip>` — [demo](https://rog.ie/figui3/#tooltip)

Contextual tooltip on hover or click. Auto-repositions when the child element moves.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `text` | string | — | Tooltip text |
| `action` | string | `"hover"` | `"hover"`, `"click"`, `"manual"` |
| `delay` | number | `500` | Show delay in ms |
| `offset` | string | — | `"left,top,right,bottom"` |
| `show` | boolean | `false` | Persistent show state |
| `open` | boolean | `false` | Programmatic show/hide |

```html
<fig-tooltip text="Helpful info">
  <fig-button>Hover me</fig-button>
</fig-tooltip>
```

Escape dismisses an open tooltip and returns focus to its trigger.

---

#### Separator

`<fig-separator>` — [demo](https://rog.ie/figui3/#separator)

A visual divider between content groups. The optional `label` attribute adds a group label and accessible name. Add `borderless` to hide the separator line. `<fig-menu-separator>` is a backwards-compatible alias.

```html
<fig-separator></fig-separator>
<fig-separator label="More"></fig-separator>
<fig-separator label="First group" borderless></fig-separator>
<fig-menu-separator></fig-menu-separator>
```

---

#### Menu

`<fig-menu>` / `<fig-menu-item>` / `<fig-separator>` / `<fig-menu-separator>` — [demo](https://rog.ie/figui3/#menu)

Triggered menu with native keyboard patterns. The trigger gets `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`; menu items use `role="menuitem"` and disabled items are skipped by keyboard navigation.

Items stay in the menu's light DOM and project into the popup through slots (same pattern as `fig-select` / `fig-select-options`). The trigger is assigned `slot="trigger"` automatically; items use the default slot. React can add or remove `fig-menu-item` children without `removeChild` errors.

`fig-menu-item` also works as a list row outside `fig-menu` — typically in `<dialog is="fig-popup">` with `<fig-content padding="none">`, sticky `<fig-separator>`s, and a nested `<fig-menu>` for row actions. Item color inherits from the parent surface.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `open` | boolean | `false` | Open state |
| `disabled` | boolean | `false` | Disable trigger/menu |
| `position` | string | `"bottom left"` | Popup placement |
| `offset` | string | — | Popup offset |
| `closedby` | string | — | Popup close behavior |
| `trigger` | string | — | Use `"contextmenu"` to open on right-click |

**Keyboard:** Arrow keys move between enabled items, Home/End jump to edges, Enter/Space selects, Escape closes and returns focus to the trigger.

**Methods:** `showAt(x, y)` opens the menu at viewport coordinates, useful for custom context menu behavior.

```html
<fig-menu position="bottom left">
  <fig-button fig-menu-trigger>Actions</fig-button>
  <fig-menu-item value="copy">Copy</fig-menu-item>
  <fig-menu-item value="paste">Paste</fig-menu-item>
  <fig-separator></fig-separator>
  <fig-menu-item value="delete" disabled>Delete</fig-menu-item>
  <fig-separator label="More"></fig-separator>
  <fig-menu-item value="settings">Settings</fig-menu-item>
</fig-menu>
```

Popup list (no wrapping `fig-menu`):

```html
<dialog is="fig-popup" title="Version history" anchor="#versions" position="bottom left">
  <fig-content padding="none">
    <fig-separator sticky label="Today"></fig-separator>
    <fig-menu-item value="v9" subtle>
      Version 9
      <fig-menu position="bottom right">
        <fig-button fig-menu-trigger variant="ghost" icon aria-label="More">
          <fig-icon name="more"></fig-icon>
        </fig-button>
        <fig-menu-item value="restore">Restore this version</fig-menu-item>
      </fig-menu>
    </fig-menu-item>
  </fig-content>
</dialog>
```

`fig-separator` and `fig-menu-separator` accept optional `label` — renders the rule, then secondary group text underneath.

---

#### Header

`<fig-header>` — [demo](https://rog.ie/figui3/#header)

A section header component.

```html
<fig-header>Section Title</fig-header>
```

---

#### Layer

`<fig-layer>` — [demo](https://rog.ie/figui3/#layer)

A collapsible layer list item with expand/collapse and visibility toggling. Supports nesting and exposes `role="treeitem"`, `aria-expanded`, `aria-hidden`, `aria-disabled`, and a keyboard-toggleable chevron button.
Import `fig-layer.js` and `fig-layer.css` to register and style it.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `open` | boolean | `false` | Whether children are expanded |
| `visible` | boolean | `true` | Whether the layer is visible |

**Events:** `openchange` (detail: `{ open }`), `visibilitychange` (detail: `{ visible }`).

```html
<fig-layer open="true">
  <div class="fig-layer-row">
    <span class="fig-layer-icon"></span>
    <span class="fig-layer-name">Group 1</span>
  </div>
  <fig-layer>
    <div class="fig-layer-row">
      <span class="fig-layer-icon"></span>
      <span class="fig-layer-name">Child 1</span>
    </div>
  </fig-layer>
</fig-layer>
```

---

#### Preview

`<fig-preview>`

A thin styled layer for arbitrary visual content. Use it for generated previews, canvas output, SVG, images, or other custom rendered surfaces when you do not need media upload behavior.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `aspect-ratio` | string | `"4/3"` | CSS aspect ratio such as `"1/1"` or `"16/9"` |
| `fit` | string | `contain` | Object fit for direct media children |
| `full` | boolean | `false` | Stretch to the available width |
| `checkerboard` | boolean | `false` | Show checkerboard behind transparent content |

Set `--fig-preview-background` to customize the surface color, including `transparent` to remove it.

```html
<fig-preview full style="height: 96px">
  <canvas width="320" height="180"></canvas>
</fig-preview>

<fig-preview checkerboard>
  <img src="photo.png" alt="Preview">
</fig-preview>
```

---

#### Media

`<fig-media>`

Unified media component that supports image/video modes and shared sizing/upload behavior. The media surface is rendered inside a `fig-preview`; generated video controls render below that preview rather than as an overlay. Set `size` for a token-sized square, or `aspect-ratio` to fill the container width with a fixed ratio.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `type` | string | `"image"` | `"image"` or `"video"` |
| `src` | string | — | Media URL |
| `alt` | string | `""` | Alt text forwarded to the generated `<img>` (image mode) |
| `upload` | boolean | `false` | Show upload overlay (`fig-input-file`) |
| `loading-indicator` | boolean | `true` | Set to `"false"` to disable the delayed loading spinner for generated images |
| `label` | string | `"Upload"` | Upload button label |
| `size` | string | — | `small` \| `medium` \| `large` \| `auto` (token-sized square) |
| `aspect-ratio` | string | — | CSS aspect-ratio (e.g. `"16 / 9"`); fills container width |
| `fit` | string | `"contain"` | CSS object-fit (`"cover"`, `"contain"`, etc.) |
| `checkerboard` | boolean | `false` | Show checkerboard behind transparent media |
| `caption` | string | — | Caption text rendered below the media preview |
| `controls` | boolean | `false` | Show playback controls for video |
| `autoplay` | boolean | `false` | Video autoplay |
| `loop` | boolean | `false` | Video loop |
| `muted` | boolean | `false` | Video muted |
| `poster` | string | — | Video poster URL |
| `aria-label` | string | — | Accessible label forwarded to generated videos |

Use meaningful `alt` text for informative images. Use `alt=""` only when the image is decorative or already described by nearby text.

```html
<fig-media type="image" src="photo.jpg" alt="Selected image"></fig-media>
<fig-media type="image" src="photo.jpg" alt="Cover image" aspect-ratio="16 / 9" fit="cover"></fig-media>
<fig-media type="video" src="clip.mp4" aria-label="Product demo video" caption="Looping product demo" controls muted></fig-media>
<fig-media type="image" src="photo.jpg" alt="Selected image">
  <figcaption>Selected image from the current document.</figcaption>
</fig-media>
```

Use the `caption` attribute for a plain-text caption, or a direct `<figcaption>` child for authored caption content.

Native load lifecycle events are re-emitted from the `fig-media` host as bubbling, composed `CustomEvent`s. Image mode emits `load` and `error`. Video mode forwards `loadstart`, `progress`, `suspend`, `abort`, `error`, `emptied`, `stalled`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`, `playing`, `waiting`, `seeking`, `seeked`, `durationchange`, `timeupdate`, `ratechange`, `resize`, and `volumechange`; existing `play`, `pause`, and `ended` events remain available. Event `detail` includes `src`, `media`, and `originalEvent`, plus video timing and readiness state.

For generated images, a spinner appears when loading exceeds 150ms and is removed on `load` or `error`. The host reflects `aria-busy="true"` while pending. Authored media or preview content does not receive an automatic spinner.

---

#### Image

`<fig-image>` — [demo](https://rog.ie/figui3/#image)

An image display component with optional upload, aspect ratio, and object-fit control. Renders a real `<img>` inside a `fig-preview`.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | string | — | Image URL |
| `alt` | string | `""` | Alt text forwarded to the generated `<img>` |
| `upload` | boolean | `false` | Show upload overlay (`fig-input-file`) |
| `loading-indicator` | boolean | `true` | Set to `"false"` to disable the delayed loading spinner |
| `label` | string | `"Upload"` | Upload button label |
| `size` | string | — | `small` \| `medium` \| `large` \| `auto` (token-sized square) |
| `aspect-ratio` | string | — | CSS aspect-ratio (e.g. `"16 / 9"`); fills container width |
| `fit` | string | `"contain"` | CSS object-fit (`"cover"`, `"contain"`, etc.) |
| `checkerboard` | boolean | `false` | Show checkerboard behind transparent images |
| `caption` | string | — | Caption text rendered below the image preview |

Use meaningful `alt` text for informative images. Use `alt=""` for decorative previews, thumbnails with visible labels, or upload placeholders.

The generated image's native `load` and `error` events are re-emitted from `fig-image` as bubbling, composed `CustomEvent`s with `src`, `media`, and `originalEvent` in `event.detail`.

```html
<fig-image src="photo.jpg" alt="Selected image"></fig-image>
<fig-image src="photo.jpg" alt="Cover image" aspect-ratio="16 / 9" fit="cover" caption="Cover image"></fig-image>
<fig-image upload label="Upload Image" alt=""></fig-image>
<fig-image src="photo.jpg" alt="Selected image">
  <figcaption>Selected image from the current document.</figcaption>
  <fig-input-file slot="overlay" variant="overlay" label="Change image"></fig-input-file>
</fig-image>
```

Use `slot="overlay"` for custom overlay controls. Slotted overlays stay as direct light-DOM children so frameworks like React keep ownership of their nodes, while CSS places them over the preview and keeps them visible on hover, focus, and active interaction.

---

#### Card

`<fig-card>` — [demo](https://rog.ie/figui3/#card)

A media card with a truncated label and attribute-only selection chrome. With `src`, it composes a generated `fig-image`. The `label` and `sublabel` attributes render inside a generated `fig-footer`.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | string | — | Image URL forwarded to generated `fig-image` |
| `alt` | string | `""` | Alt text forwarded to generated `fig-image` |
| `label` | string | — | Card title (preferred over `text`) |
| `text` | string | — | Alias for `label` |
| `sublabel` | string | — | Secondary one-line text under the label |
| `selected` | boolean | `false` | Selected chrome only (no click-toggle) |
| `disabled` | boolean | `false` | Dim + non-interactive |
| `full` | boolean | `false` | Stretch to the available width (cards are already `width: 100%` by default) |
| `size` | string | default | Set to `"large"` for `--spacer-2` card padding and `--spacer-1` label spacing |
| `aspect-ratio` | string | `"1/1"` | Forwarded to generated `fig-image` |
| `fit` | string | `"contain"` | Forwarded to generated `fig-image` |
| `label-line-clamp` | string | `"1"` | `"1"` or `"2"` line clamp for the label |

```html
<fig-card src="photo.jpg" label="Autumn field"></fig-card>
<fig-card src="photo.jpg" label="Large card" size="large"></fig-card>
<fig-card src="photo.jpg" label="Shader pill" sublabel="Generative tools/effects" selected></fig-card>
<fig-card src="photo.jpg" label="Wide card" aspect-ratio="16/9" full></fig-card>
<fig-card label="Custom preview">
  <fig-preview>...</fig-preview>
</fig-card>
<fig-card>
  <fig-preview>...</fig-preview>
  <fig-footer><label>Authored footer</label></fig-footer>
</fig-card>
```

When `src` is omitted, authored direct children such as `fig-image`, `fig-media`, or `fig-preview` remain direct children of the card. An authored `fig-footer` is preserved; when no `label`, `text`, or `sublabel` attributes are present, the card does not generate another footer.

Place cards in a CSS grid for multi-column layouts — there is no built-in columns attribute. Prefer `full` in fluid layouts for consistency with other FigUI controls.

---

#### Video

`<fig-video>`

Video display/upload component with the same preview styling model as `fig-image`. Renders a real `<video>` inside a `fig-preview`; generated playback controls tack onto the bottom.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | string | — | Video URL |
| `upload` | boolean | `false` | Show upload overlay (`fig-input-file`) |
| `label` | string | `"Upload"` | Upload button label |
| `size` | string | — | `small` \| `medium` \| `large` \| `auto` (token-sized square) |
| `aspect-ratio` | string | — | CSS aspect-ratio (e.g. `"16 / 9"`); fills container width |
| `fit` | string | `"contain"` | CSS object-fit (`"cover"`, `"contain"`, etc.) |
| `controls` | boolean | `false` | Show playback controls |
| `autoplay` | boolean | `false` | Autoplay video |
| `loop` | boolean | `false` | Loop video |
| `muted` | boolean | `false` | Mute video |
| `poster` | string | — | Poster image URL (forwarded to inner `<video>`) |
| `aria-label` | string | — | Accessible label forwarded to the generated `<video>` |
| `caption` | string | — | Caption text rendered below the video preview |

Prefer `controls` for videos that play motion. Use native `<track>` text tracks when the video includes speech or essential audio.

```html
<fig-video src="clip.mp4" aria-label="Product demo video" caption="Product demo" controls></fig-video>
<fig-video src="clip.mp4" aria-label="Product demo video" aspect-ratio="16 / 9" controls></fig-video>
<fig-video upload label="Upload Video" aria-label="Uploaded video preview" controls muted>
  <figcaption>Uploaded video preview.</figcaption>
</fig-video>
```

---

#### Avatar

`<fig-avatar>` — [demo](https://rog.ie/figui3/#avatar)

Profile image or initials fallback.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | string | — | Image URL |
| `name` | string | — | Name for initials fallback |
| `size` | string | — | `"large"` |

```html
<fig-avatar src="https://example.com/photo.jpg" name="John Doe"></fig-avatar>
<fig-avatar name="Jane Smith" size="large"></fig-avatar>
```

---

#### Icon

`<fig-icon>` — [demo](https://rog.ie/figui3/#icon)

Masked icon using `--icon-16-*` and `--icon-24-*` design tokens (SVG artboard size). Display size is controlled separately via the `size` attribute.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `name` | string | — | Icon name: `add`, `send`, `close`, `chevron`, `arrow-left`, etc. |
| `size` | string | `medium` | `medium` (1.5rem) or `small` (1rem) |
| `color` | string | — | Alias (`primary`, `secondary`, `tertiary`, `disabled`, `brand`, `component`, `danger`, `success`, `warning`, `selected`, `hover`, `pressed`, `onbrand`, …); CSS variables and explicit CSS colors also accepted |

```html
<fig-icon name="close"></fig-icon>
<fig-icon name="send" color="brand"></fig-icon>
<fig-icon name="chevron" size="small"></fig-icon>
```

Legacy: `<span class="fig-mask-icon" style="--icon: var(--icon-24-add)"></span>` still works.

---

#### Spinner

`<fig-spinner>` — [demo](https://rog.ie/figui3/#spinner)

A loading spinner.

Defaults to `role="status"` and `aria-label="Loading"`; override the label when the loading target needs a more specific name.

```html
<fig-spinner></fig-spinner>
```

---

#### Shimmer

`<fig-shimmer>` — [demo](https://rog.ie/figui3/#shimmer)

A shimmer loading placeholder.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `duration` | string | `"1.5s"` | Animation cycle duration |
| `playing` | boolean | `true` | Whether animating |

Shimmer and skeleton placeholders are hidden from assistive tech unless you add `aria-label` or `aria-labelledby`; named placeholders expose `role="status"` and `aria-busy`.

```html
<fig-shimmer style="width: 200px; height: 20px;"></fig-shimmer>
```

---

#### Skeleton

`<fig-skeleton>`

Extends `<fig-shimmer>` for structured loading placeholders. Skeletons are inert by default, so any placeholder inputs or buttons inside them are removed from tab focus while loading.

```html
<fig-skeleton style="width: 100%; height: 1rem; border-radius: 4px;"></fig-skeleton>
```

---

## Theming

FigUI3 adapts to light and dark themes via CSS custom properties using Figma's naming convention:

```css
--figma-color-bg
--figma-color-bg-secondary
--figma-color-bg-hover
--figma-color-text
--figma-color-text-secondary
--figma-color-border
--figma-color-icon
/* ... and more */
```

In Figma plugins, these variables are provided automatically. For standalone usage, the library includes fallback values that respond to `prefers-color-scheme`.

Force a theme manually:

```html
<body style="color-scheme: dark;">
  <!-- Forces dark theme -->
</body>
```

Focus indicators are controlled with shared tokens:

```css
--figma-focus-outline
--figma-focus-outline-offset
--figma-focus-outline-radius
```

`--figma-focus-outline-radius` defaults to `inherit`, so focused controls can inherit their component radius unless a component overrides it for a specific shape.

---

## Framework Integration

### React

```jsx
import { useRef, useEffect } from 'react';
import '@rogieking/figui3/fig.css';
import '@rogieking/figui3/fig.js';

function ColorPicker({ value, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleChange = (e) => onChange(e.detail);
    el.addEventListener('change', handleChange);
    return () => el.removeEventListener('change', handleChange);
  }, [onChange]);

  useEffect(() => {
    if (ref.current) ref.current.setAttribute('value', value);
  }, [value]);

  return <fig-input-color ref={ref} text="true" alpha="true" />;
}
```

> **Note:** Avoid setting `value` directly in JSX during re-renders — use refs to prevent infinite loops from `attributeChangedCallback`.
>
> **SSR (Next.js/Remix/Astro):** Import `fig.js` only on the client to keep server rendering safe.

### Vue

```vue
<template>
  <fig-input-color :value="color" text="true" alpha="true" @input="onInput" @change="onChange" />
</template>

<script setup>
import { ref } from 'vue';
import '@rogieking/figui3/fig.css';
import '@rogieking/figui3/fig.js';

const color = ref('#FF5733');
const onInput = (e) => { color.value = e.detail.color; };
const onChange = (e) => { console.log('Final:', e.detail); };
</script>
```

### Svelte

```svelte
<script>
  import '@rogieking/figui3/fig.css';
  import '@rogieking/figui3/fig.js';
  let color = '#FF5733';
</script>

<fig-input-color value={color} text="true" alpha="true"
  on:input={(e) => color = e.detail.color}
  on:change={(e) => console.log('Saved:', e.detail)} />
```

---

## Development

```bash
git clone https://github.com/rogie/figui3.git
cd figui3
bun install
bun dev                # Component docs at http://localhost:3000
npm run dev:playground # Playground at http://localhost:5173 (/figui3, /propkit, /sandbox)
npm run build          # Build minified dist/ (JS + CSS)
npm run build:css      # Build minified CSS only
```

### Build Output

`npm run build` produces minified files in `dist/`:

| Source | Minified | Tool |
|---|---|---|
| `fig.js` (413 KB) | `dist/fig.js` (223 KB) | Bun `--minify` |
| `fig-editor.js` (67 KB) | `dist/fig-editor.js` (37 KB) | Bun `--minify` |
| `fig.css` | `dist/fig.css` (102 KB) | lightningcss `--minify --nesting --bundle` |
| `components.css` (130 KB) | `dist/components.css` (100 KB) | lightningcss |
| `fig-editor.css` (6 KB) | `dist/fig-editor.css` (4 KB) | lightningcss |
| `base.css` (2 KB) | `dist/base.css` (2 KB) | lightningcss |

Default imports resolve to minified `dist/` files. Unminified source is available via `@rogieking/figui3/src/*`:

```js
import "@rogieking/figui3/fig.css";      // minified (default)
import "@rogieking/figui3/src/fig.css";  // unminified source
```

### Playground

The playground is the fastest way to explore and validate component markup:

- **`/figui3`** — component examples with attribute controls
- **`/propkit`** — property panel patterns
- **`/sandbox`** — styled React sample app

---

## Browser Support

- Chrome/Edge 67+
- Firefox 63+
- Safari 10.1+

---

## License

Split license. See [LICENSE](LICENSE).

- **MIT:** `fig.js`, `fig-layer.js`, core CSS, `polyfills/`
- **PolyForm Shield 1.0.0 (not OSI open source):** `fig-editor.js`, `fig-lab.js`, and their CSS

&copy; Rogie King
