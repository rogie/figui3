# FigUI3

A lightweight, zero-dependency web components library for building Figma plugin and widget UIs with native look and feel.

[![npm version](https://img.shields.io/npm/v/@rogieking/figui3.svg)](https://www.npmjs.com/package/@rogieking/figui3)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**[Live Playground & Demos](https://rog.ie/figui3/)**

## Features

- Figma UI3 design system
- Zero dependencies
- ~228 KB JS + ~102 KB CSS minified
- Built with Web Components
- Automatic light/dark theme support
- Accessible with ARIA attributes and keyboard navigation
- Framework agnostic (React, Vue, Svelte, or vanilla JS)

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

Or use a CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@rogieking/figui3@latest/dist/fig.css" />
<script type="module" src="https://unpkg.com/@rogieking/figui3@latest/dist/fig.js"></script>
```

Minimal example:

```html
<fig-field direction="horizontal">
  <label>Color</label>
  <fig-input-color value="#FF5733" text="true" alpha="true"></fig-input-color>
</fig-field>
<fig-button variant="primary">Save</fig-button>
```

---

## Components

| Component | Tag | Description |
|---|---|---|
| [Button](#button) | `<fig-button>` | Buttons with variants, toggle, select, upload |
| [Dropdown](#dropdown) | `<fig-dropdown>` | Native select wrapper with Figma styling |
| [Combo Input](#combo-input) | `<fig-combo-input>` | Text input with dropdown suggestions |
| [Checkbox](#checkbox) | `<fig-checkbox>` | Checkbox with indeterminate state |
| [Radio](#radio) | `<fig-radio>` | Radio button |
| [Switch](#switch) | `<fig-switch>` | Toggle switch |
| [Slider](#slider) | `<fig-slider>` | Range, hue, opacity, delta, stepper |
| [Field Slider](#field-slider) | `<fig-field-slider>` | Labeled field + slider combo |
| [Text Input](#text-input) | `<fig-input-text>` | Styled text/textarea input |
| [Number Input](#number-input) | `<fig-input-number>` | Numeric input with units |
| [Input Angle](#input-angle) | `<fig-input-angle>` | Angle/rotation dial and text input |
| [Chit](#chit) | `<fig-chit>` | Color/gradient/image swatch |
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
| [Canvas Point](#canvas-point) | `<fig-canvas-point>` | Point with optional radius & angle |
| [Dialog](#dialog) | `<fig-dialog>` | Modal/non-modal dialog |
| [Popup](#popup) | `<fig-popup>` | Anchored floating surface |
| [Toast](#toast) | `<fig-toast>` | Toast notification |
| [Tooltip](#tooltip) | `<fig-tooltip>` | Hover/click tooltip |
| [Header](#header) | `<fig-header>` | Section header |
| [Layer](#layer) | `<fig-layer>` | Collapsible layer list item |
| [Image](#image) | `<fig-image>` | Image display/upload |
| [Avatar](#avatar) | `<fig-avatar>` | Profile image or initials |
| [Spinner](#spinner) | `<fig-spinner>` | Loading spinner |
| [Shimmer](#shimmer) | `<fig-shimmer>` | Shimmer loading placeholder |
| [Skeleton](#skeleton) | `<fig-skeleton>` | Skeleton loading placeholder |

---

### Form Controls

#### Button

`<fig-button>` — [demo](https://rog.ie/figui3/#button)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `variant` | string | `"primary"` | `"primary"`, `"secondary"`, `"ghost"`, `"link"` |
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
<fig-button type="toggle" selected="true">Toggle</fig-button>
<fig-button variant="ghost" icon>
  <svg><!-- icon --></svg>
</fig-button>
```

---

#### Dropdown

`<fig-dropdown>` — [demo](https://rog.ie/figui3/#dropdown)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Selected value |
| `type` | string | `"select"` | `"select"` or `"dropdown"` |
| `experimental` | string | — | Feature flags (e.g. `"modern"` for `appearance: base-select`) |

```html
<fig-dropdown value="2">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</fig-dropdown>
```

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
| `value` | number | — | Current value |
| `min` | number | `0` | Minimum |
| `max` | number | `100` | Maximum |
| `step` | number | `1` | Step increment |
| `default` | number | — | Default/reset value (shown as marker) |
| `text` | boolean | `false` | Show text input |
| `placeholder` | string | `"##"` | Text input placeholder |
| `units` | string | — | Unit label (e.g. `"%"`, `"px"`) |
| `transform` | number | — | Display value multiplier |
| `color` | string | — | Track color (opacity type) |
| `variant` | string | — | Visual variant (e.g. `"neue"`) |
| `precision` | number | — | Decimal places for output |
| `disabled` | boolean | `false` | Disabled state |

**Events:** `input` (continuous), `change` (on release).

```html
<fig-slider min="0" max="100" value="50" text="true" units="%"></fig-slider>
<fig-slider type="hue" value="180"></fig-slider>
<fig-slider type="opacity" value="75" color="#FF5733" text="true" units="%"></fig-slider>
```

---

#### Field Slider

`<fig-field-slider>`

Wraps a `<fig-field>` and `<fig-slider>` into a single labeled control. All slider attributes (except `label`, `direction`) are forwarded to the inner slider.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | string | — | Field label text |
| `direction` | string | `"column"` | Layout direction |
| *slider attrs* | — | — | All `<fig-slider>` attributes are forwarded |

**Events:** `input`, `change` — forwarded from the inner slider.

```html
<fig-field-slider label="Opacity" min="0" max="100" value="75" text="true" units="%"></fig-field-slider>
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
| `unit-position` | string | `"suffix"` | `"suffix"` or `"prefix"` |
| `transform` | number | — | Display multiplier |
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

### Color & Fill

#### Chit

`<fig-chit>` — [demo](https://rog.ie/figui3/#chit)

A color/gradient/image swatch element with checkerboard background for alpha.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `background` | string | — | CSS background value |
| `size` | string | `"small"` | `"small"` or `"large"` |
| `selected` | boolean | `false` | Selection ring |
| `disabled` | boolean | `false` | Disabled state |
| `alpha` | number | — | Opacity (0-1) |

```html
<fig-chit background="#FF5733"></fig-chit>
<fig-chit background="linear-gradient(90deg, #FF0000, #0000FF)" size="large"></fig-chit>
```

---

#### Color Tip

`<fig-color-tip>` — [demo](https://rog.ie/figui3/#color-tip)

A compact solid-color swatch that wraps `<fig-fill-picker>`. Used inside gradient handles and other controls.

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
| `input` | `{ color, opacity? }` — while editing |
| `change` | `{ color, opacity? }` — on commit |
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
| `alpha` | boolean | `false` | Show alpha slider |
| `picker` | string | `"native"` | `"native"`, `"figma"`, `"false"` |
| `mode` | string | — | Color mode (`"hex"`, `"rgb"`, `"hsl"`) |
| `experimental` | string | — | Feature flags |
| `disabled` | boolean | `false` | Disabled state |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ color, alpha, hsv: { h, s, v, a } }` |
| `change` | `{ color, alpha, hsv: { h, s, v, a } }` |

```html
<fig-input-color value="#FF5733" text="true" alpha="true"></fig-input-color>
<fig-input-color value="#FF5733" text="true" alpha="true" picker="figma"></fig-input-color>
```

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
| `expanded` | boolean | `false` | Show text + alpha inputs per color |
| `add` | boolean | `true` | Show add-color button (`add="false"` hides it) |

**Events:**

| Event | Detail |
|---|---|
| `input` | Full color array (during editing) |
| `change` | Full color array (on commit or add) |

```html
<fig-input-palette value='["#FF0000","#00FF00","#0000FF"]'></fig-input-palette>
<fig-input-palette value='[{"color":"#FF0000","alpha":0.5},{"color":"#00FF00","alpha":1}]' expanded="true"></fig-input-palette>
```

---

#### Gradient Input

`<fig-input-gradient>`

A gradient editor with draggable stops. Opens `<fig-fill-picker>` locked to gradient mode.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | JSON gradient fill data |
| `disabled` | boolean | `false` | Disabled state |
| `experimental` | string | — | Picker feature flags |
| `picker-*` | string | — | Passthrough picker attributes |
| `picker-anchor` | string | `"self"` | Anchor selector or `"self"` |

Supported interpolation spaces: `srgb`, `srgb-linear`, `display-p3`, `oklab`, `oklch` (with `hueInterpolation`: `shorter`, `longer`, `increasing`, `decreasing`).

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ type, gradient, css }` |
| `change` | `{ type, gradient, css }` |

```html
<fig-input-gradient
  value='{"type":"gradient","gradient":{"type":"linear","angle":90,"interpolationSpace":"oklab","stops":[{"position":0,"color":"#FF0000","opacity":100},{"position":100,"color":"#0000FF","opacity":100}]}}'
></fig-input-gradient>
```

---

#### Fill Input

`<fig-input-fill>` — [demo](https://rog.ie/figui3/#fill-input)

A comprehensive fill input supporting solid, gradient, image, and video fills.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | JSON fill data |
| `disabled` | boolean | `false` | Disabled state |
| `mode` | string | — | Lock to a fill mode |
| `experimental` | string | — | Feature flags |
| `alpha` | boolean | `true` | Show alpha controls |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ type, color?, gradient?, image?, video?, css }` |
| `change` | `{ type, color?, gradient?, image?, video?, css }` |

```html
<fig-input-fill value='{"type":"solid","color":"#FF5733","opacity":100}'></fig-input-fill>
```

---

#### Fill Picker

`<fig-fill-picker>` — [demo](https://rog.ie/figui3/#fill-picker)

Full fill picker dialog supporting solid, gradient, image, video, and webcam. Wraps a trigger element (e.g. `<fig-chit>`).

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | JSON fill value |
| `disabled` | boolean | `false` | Disabled state |
| `alpha` | boolean | `true` | Show alpha controls |
| `mode` | string | — | Lock to mode: `"solid"`, `"gradient"`, `"image"`, `"video"`, `"webcam"` |
| `experimental` | string | — | Feature flags |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ type, gradient?, color?, css }` |
| `change` | `{ type, gradient?, color?, css }` |

```html
<fig-fill-picker value='{"type":"solid","color":"#FF5733"}'>
  <fig-chit></fig-chit>
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

**fig-chooser attributes:**

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Selected choice value |
| `choice-element` | string | `"fig-choice"` | CSS selector for child choices |
| `layout` | string | `"vertical"` | `"vertical"`, `"horizontal"`, `"grid"` |
| `disabled` | boolean | `false` | Disabled state |
| `drag` | boolean | `false` | Enable drag-to-scroll |
| `overflow` | string | — | Overflow behavior |
| `loop` | boolean | `false` | Loop keyboard navigation |
| `padding` | boolean | `true` | Internal padding (`padding="false"` removes it) |

**fig-choice attributes:**

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Choice identifier |
| `selected` | boolean | `false` | Selected state |
| `disabled` | boolean | `false` | Disabled state |

**Events (on fig-chooser):** `input`, `change` — detail is the selected value string.

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

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ x, y, value }` — while dragging |
| `change` | `{ x, y, value }` — on release |

```html
<fig-joystick value="50% 50%" fields="true" precision="2"></fig-joystick>
```

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

---

#### Easing Curve

`<fig-easing-curve>`

An interactive bezier or spring easing curve editor with draggable control points and an optional preset dropdown.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | — | Bezier: `"0.42, 0, 0.58, 1"` or Spring: `"spring(200, 15, 1)"` |
| `precision` | number | `2` | Decimal places |
| `aspect-ratio` | string | — | Editor aspect ratio |
| `dropdown` | boolean | `false` | Show preset dropdown |

**Static:** `FigEasingCurve.PRESETS` — built-in preset array. `FigEasingCurve.curveIcon(value)` — SVG icon helper.

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ mode, value, cssValue, preset }` — while dragging |
| `change` | `{ mode, value, cssValue, preset }` — on release |

```html
<fig-easing-curve value="0.42, 0, 0.58, 1" dropdown="true"></fig-easing-curve>
<fig-easing-curve value="spring(200, 15, 1)"></fig-easing-curve>
```

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
| `type` | string | — | `"color"` for color handle with `fig-color-tip` |
| `control` | string | — | `"add"` or `"remove"` delegated to color tip |
| `hit-area` | string | — | Expanded interaction zone (unitless px). `"8"`, `"8 12"` (v h), or `"8 circle"` |
| `hit-area-mode` | string | `"handle"` | `"handle"` proxies to handle drag/select; `"delegate"` emits `hitareadown` event |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ x, y, px, py, shiftKey }` — while dragging |
| `change` | `{ x, y, px, py }` — on release |
| `add` | — (when control="add") |
| `remove` | — (when control="remove") |
| `hitareadown` | `{ originalEvent }` — when `hit-area-mode="delegate"` and the hit area is clicked |

```html
<div style="position: relative; width: 200px; height: 200px; background: #eee;">
  <fig-handle drag="true" value="50% 50%"></fig-handle>
</div>
```

---

#### Canvas Point

`<fig-canvas-point>` — [demo](https://rog.ie/figui3/#canvas-point)

A composite point control with optional radius circle and angle handle. Place inside a positioned container; the component uses `display: contents` and does not create its own box.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `type` | string | `"point"` | `"point"`, `"color"`, `"point-radius"`, `"point-radius-angle"` |
| `value` | JSON string | — | `{ "x": 50, "y": 50, "radius"?: 30, "angle"?: 45 }` — radius accepts unitless (px) or `"25%"` |
| `color` | string | — | Passthrough color for `type="color"` handle |
| `tooltips` | string | `"true"` | Show value tooltips on interaction |
| `disabled` | boolean | `false` | Disable all interaction |
| `drag-surface` | string | `"parent"` | Forwarded to inner `fig-handle`s |
| `snapping` | string | `"false"` | `"false"`, `"true"`, `"modifier"` — applies to point, radius, and angle |

**Events:**

| Event | Detail |
|---|---|
| `input` | `{ x, y, radius?, angle? }` — while dragging |
| `change` | `{ x, y, radius?, angle? }` — on release |

```html
<div style="position: relative; width: 200px; height: 200px; background: #eee;">
  <fig-canvas-point
    type="point-radius-angle"
    value='{"x":50,"y":50,"radius":"25%","angle":45}'
    snapping="modifier"
  ></fig-canvas-point>
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
  <fig-slider value="50" text="true" units="%"></fig-slider>
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
  <fig-content><p>Content here.</p></fig-content>
</dialog>
```

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

```html
<dialog is="fig-popup" anchor="#my-button" position="center right" variant="popover">
  <fig-header><h3>Popup</h3></fig-header>
</dialog>
```

---

#### Toast

`<fig-toast>` — [demo](https://rog.ie/figui3/#toast)

A toast notification. Uses `is="fig-toast"` on a native `<dialog>`.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `duration` | number | `5000` | Auto-dismiss ms (0 = no dismiss) |
| `offset` | number | `16` | Distance from bottom |
| `theme` | string | `"dark"` | `"dark"`, `"light"`, `"danger"`, `"brand"`, `"auto"` |

```html
<dialog is="fig-toast" id="myToast" theme="brand" duration="3000">
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

A collapsible layer list item with expand/collapse and visibility toggling. Supports nesting.

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

#### Image

`<fig-image>` — [demo](https://rog.ie/figui3/#image)

An image display component with optional upload, aspect ratio, and object-fit control.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | string | — | Image URL |
| `upload` | boolean | `false` | Show upload button |
| `download` | boolean | `false` | Show download button |
| `label` | string | — | Upload button label |
| `aspect-ratio` | string | — | CSS aspect-ratio (e.g. `"16 / 9"`) |
| `fit` | string | — | CSS object-fit (`"cover"`, `"contain"`, etc.) |
| `checkerboard` | boolean | `false` | Show checkerboard behind transparent images |

```html
<fig-image src="photo.jpg" aspect-ratio="16 / 9" fit="cover"></fig-image>
<fig-image upload label="Upload Image"></fig-image>
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

#### Spinner

`<fig-spinner>` — [demo](https://rog.ie/figui3/#spinner)

A loading spinner.

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

```html
<fig-shimmer style="width: 200px; height: 20px;"></fig-shimmer>
```

---

#### Skeleton

`<fig-skeleton>`

Extends `<fig-shimmer>` with no additional attributes. Use for structured loading placeholders.

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

  return <fig-input-color ref={ref} text="true" alpha="true" picker="figma" />;
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
| `fig.js` (416 KB) | `dist/fig.js` (228 KB) | Bun `--minify` |
| `fig.css` (133 KB) | `dist/fig.css` (102 KB) | lightningcss `--minify --nesting --bundle` |
| `base.css` (1.9 KB) | `dist/base.css` (1.5 KB) | lightningcss |
| `components.css` (131 KB) | `dist/components.css` (100 KB) | lightningcss |

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

[MIT License](LICENSE) &copy; Rogie King
