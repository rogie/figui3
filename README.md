# FigUI3

A lightweight, zero-dependency web components library for building Figma plugin and widget UIs with native look and feel.

[![npm version](https://img.shields.io/npm/v/@rogieking/figui3.svg)](https://www.npmjs.com/package/@rogieking/figui3)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Live Demo

View the interactive component documentation at **[rogie.github.io/figui3](https://rogie.github.io/figui3/)**

The demo page (`index.html`) is included in the npm package, so you can also open it locally after installing.

## Features

- 🎨 Figma UI3 design system
- 📦 Zero dependencies
- 🚀 Lightweight (~50kb unminified)
- 🎯 Built with Web Components
- 🌗 Automatic light/dark theme support
- ♿ Accessible with ARIA attributes and keyboard navigation
- 🔧 Framework agnostic (works with React, Vue, Svelte, or vanilla JS)

## Installation

### npm / yarn / bun / pnpm

```bash
npm install @rogieking/figui3
# or
yarn add @rogieking/figui3
# or
bun add @rogieking/figui3
# or
pnpm add @rogieking/figui3
```

Then import in your JavaScript/TypeScript:

```js
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
```

### CDN

```html
<link rel="stylesheet" href="https://unpkg.com/@rogieking/figui3@latest/fig.css" />
<script src="https://unpkg.com/@rogieking/figui3@latest/fig.js"></script>
```

Or via esm.sh:

```html
<link rel="stylesheet" href="https://esm.sh/@rogieking/figui3@latest/fig.css" />
<script src="https://esm.sh/@rogieking/figui3@latest/fig.js"></script>
```

### Development

```bash
git clone https://github.com/rogie/figui3.git
cd figui3
bun install
bun dev  # Opens documentation at http://localhost:3000
```

## Quick Start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="https://unpkg.com/@rogieking/figui3@latest/fig.css" />
  <script src="https://unpkg.com/@rogieking/figui3@latest/fig.js"></script>
</head>
<body>
  <fig-field>
    <label>Color</label>
    <fig-input-color value="#FF5733" text="true" alpha="true"></fig-input-color>
  </fig-field>
  
  <fig-button variant="primary">Save</fig-button>
</body>
</html>
```

---

## Components

### Button (`<fig-button>`)

A versatile button component with multiple variants and types.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | string | `"primary"` | Visual style: `"primary"`, `"secondary"`, `"ghost"`, `"link"` |
| `type` | string | `"button"` | Button type: `"button"`, `"toggle"`, `"submit"`, `"select"`, `"upload"` |
| `size` | string | — | Size variant: `"large"`, `"compact"` |
| `selected` | boolean | `false` | Whether button is in selected state (for toggle type) |
| `disabled` | boolean | `false` | Whether button is disabled |
| `icon` | boolean | `false` | Icon-only button styling |
| `href` | string | — | URL for link-style buttons |
| `target` | string | — | Target window for links (e.g., `"_blank"`) |

```html
<!-- Variants -->
<fig-button>Primary</fig-button>
<fig-button variant="secondary">Secondary</fig-button>
<fig-button variant="ghost">Ghost</fig-button>
<fig-button variant="link">Link</fig-button>

<!-- Types -->
<fig-button type="toggle" selected="true">Toggle</fig-button>
<fig-button type="submit">Submit</fig-button>

<!-- Icon button -->
<fig-button variant="ghost" icon>
  <svg><!-- icon --></svg>
</fig-button>

<!-- Select button with dropdown -->
<fig-button type="select">
  Select Option
  <fig-dropdown>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
  </fig-dropdown>
</fig-button>

<!-- Upload button -->
<fig-button type="upload">
  Upload File
  <input type="file" />
</fig-button>
```

---

### Dropdown (`<fig-dropdown>`)

A native select wrapper with Figma styling.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | — | Currently selected value |
| `type` | string | `"select"` | Type: `"select"` or `"dropdown"` |

```html
<fig-dropdown value="2">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
  <option value="3">Option 3</option>
</fig-dropdown>
```

---

### Tooltip (`<fig-tooltip>`)

Displays contextual information on hover or click. The tooltip automatically repositions itself when its child element moves (e.g. during drag), using a MutationObserver to track attribute changes on the child.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | — | Tooltip text content |
| `action` | string | `"hover"` | Trigger: `"hover"` or `"click"` |
| `delay` | number | `500` | Delay in ms before showing |
| `offset` | string | — | Position offset: `"left,top,right,bottom"` |
| `open` | boolean | `false` | Programmatically show/hide the tooltip |

```html
<fig-tooltip text="This is helpful info" action="hover">
  <fig-button>Hover me</fig-button>
</fig-tooltip>

<fig-tooltip text="Click triggered" action="click" delay="0">
  <fig-button>Click me</fig-button>
</fig-tooltip>

<!-- Instant tooltip (no delay) -->
<fig-tooltip text="Instant!" delay="0">
  <fig-button>No delay</fig-button>
</fig-tooltip>
```

---

### Popover (`<fig-popover>`)

A popover container for rich content.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `action` | string | `"click"` | Trigger: `"click"` or `"hover"` |
| `size` | string | — | Size of the popover |

```html
<fig-popover action="click">
  <fig-button slot="trigger">Open Popover</fig-button>
  <div slot="content">
    <h3>Popover Title</h3>
    <p>Rich content goes here.</p>
  </div>
</fig-popover>
```

---

### Dialog (`<fig-dialog>`)

A modal dialog component with drag support.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `open` | boolean | `false` | Whether dialog is visible |
| `modal` | boolean | `false` | Whether dialog is modal |
| `drag` | boolean | `false` | Whether dialog is draggable |
| `handle` | string | — | CSS selector for drag handle |
| `position` | string | — | Position: `"center center"`, `"top left"`, etc. |

```html
<fig-dialog id="myDialog" modal drag handle="fig-header">
  <fig-header>Dialog Title</fig-header>
  <div slot="content">
    <p>Dialog content goes here.</p>
  </div>
  <div slot="footer">
    <fig-button variant="secondary">Cancel</fig-button>
    <fig-button>Confirm</fig-button>
  </div>
</fig-dialog>

<script>
  document.getElementById('myDialog').showModal();
</script>
```

---

### Tabs (`<fig-tabs>` / `<fig-tab>`)

Tabbed navigation component.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | — | Currently selected tab value |
| `name` | string | — | Tabs group identifier |
| `disabled` | boolean | `false` | Disable all tabs |

```html
<fig-tabs value="tab1">
  <fig-tab value="tab1" label="General">
    <p>General settings content</p>
  </fig-tab>
  <fig-tab value="tab2" label="Advanced">
    <p>Advanced settings content</p>
  </fig-tab>
</fig-tabs>
```

---

### Segmented Control (`<fig-segmented-control>` / `<fig-segment>`)

A segmented button group for exclusive selection.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | — | Control group identifier |
| `value` | string | — | Selected segment value |

```html
<fig-segmented-control>
  <fig-segment value="left" selected="true">Left</fig-segment>
  <fig-segment value="center">Center</fig-segment>
  <fig-segment value="right">Right</fig-segment>
</fig-segmented-control>
```

---

### Slider (`<fig-slider>`)

A range slider with multiple types and optional text input.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `"range"` | Type: `"range"`, `"hue"`, `"opacity"`, `"delta"`, `"stepper"` |
| `value` | number | — | Current value |
| `min` | number | `0` | Minimum value |
| `max` | number | `100` | Maximum value |
| `step` | number | `1` | Step increment |
| `default` | number | — | Default/reset value (shown as a marker on the track) |
| `text` | boolean | `false` | Show text input |
| `units` | string | — | Unit label (e.g., `"%"`, `"px"`) |
| `transform` | number | — | Multiplier for display value |
| `color` | string | — | Track color (for opacity type) |
| `disabled` | boolean | `false` | Disable slider |

```html
<!-- Basic slider -->
<fig-slider min="0" max="100" value="50"></fig-slider>

<!-- With text input and units -->
<fig-slider min="0" max="100" value="75" text="true" units="%"></fig-slider>

<!-- Hue slider -->
<fig-slider type="hue" value="180"></fig-slider>

<!-- Opacity slider with color -->
<fig-slider type="opacity" value="75" color="#FF5733" text="true" units="%"></fig-slider>

<!-- Stepper with snap points -->
<fig-slider type="stepper" value="50" step="25">
  <datalist>
    <option value="0"></option>
    <option value="25"></option>
    <option value="50"></option>
    <option value="75"></option>
    <option value="100"></option>
  </datalist>
</fig-slider>

<!-- Delta slider -->
<fig-slider type="delta" value="0" min="-5" max="5" step="0.25">
  <datalist>
    <option value="0"></option>
  </datalist>
</fig-slider>
```

---

### Text Input (`<fig-input-text>`)

A styled text input with optional slots.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | — | Input value |
| `placeholder` | string | — | Placeholder text |
| `type` | string | `"text"` | Input type: `"text"` or `"number"` |
| `disabled` | boolean | `false` | Disable input |
| `multiline` | boolean | `false` | Use textarea |
| `min` | number | — | Min value (number type) |
| `max` | number | — | Max value (number type) |
| `step` | number | — | Step (number type) |
| `transform` | number | — | Display multiplier |

```html
<!-- Basic text input -->
<fig-input-text value="Hello" placeholder="Enter text..."></fig-input-text>

<!-- With prepend/append slots -->
<fig-input-text>
  <span slot="prepend">$</span>
  <span slot="append">.00</span>
</fig-input-text>

<!-- Multiline -->
<fig-input-text multiline placeholder="Enter description..."></fig-input-text>
```

---

### Number Input (`<fig-input-number>`)

A numeric input with units support.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | — | Numeric value |
| `placeholder` | string | — | Placeholder text |
| `min` | number | — | Minimum value |
| `max` | number | — | Maximum value |
| `step` | number | — | Step increment |
| `units` | string | — | Unit string (e.g., `"px"`, `"%"`) |
| `unit-position` | string | `"suffix"` | `"suffix"` or `"prefix"` |
| `transform` | number | — | Display multiplier |
| `steppers` | boolean | `false` | Show native spin buttons (up/down arrows) |
| `disabled` | boolean | `false` | Disable input |

```html
<fig-input-number value="100" units="px"></fig-input-number>
<fig-input-number value="50" units="%" min="0" max="100"></fig-input-number>
<fig-input-number value="45" units="°" step="15"></fig-input-number>

<!-- With native stepper arrows -->
<fig-input-number value="10" steppers="true" step="1"></fig-input-number>
```

---

### Color Input (`<fig-input-color>`)

A color picker with hex/alpha support.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | — | Hex color value (e.g., `"#FF5733"` or `"#FF573380"`) |
| `text` | boolean | `false` | Show hex text input |
| `alpha` | boolean | `false` | Show alpha slider |
| `picker` | string | `"native"` | Picker type: `"native"`, `"figma"`, `"false"` |
| `mode` | string | — | Color mode (e.g., `"hex"`, `"rgb"`, `"hsl"`) |
| `disabled` | boolean | `false` | Disable input |

```html
<!-- Basic color picker -->
<fig-input-color value="#FF5733"></fig-input-color>

<!-- With text and alpha -->
<fig-input-color value="#FF5733" text="true" alpha="true"></fig-input-color>

<!-- With Figma-style picker dialog -->
<fig-input-color value="#FF5733" text="true" alpha="true" picker="figma"></fig-input-color>
```

---

### Fill Input (`<fig-input-fill>`)

A comprehensive fill input supporting colors, gradients, images, and video.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | — | JSON fill data |
| `disabled` | boolean | `false` | Disable input |

```html
<!-- Solid color -->
<fig-input-fill value='{"type":"solid","color":"#FF5733","opacity":100}'></fig-input-fill>

<!-- Gradient -->
<fig-input-fill value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#FF0000"},{"position":100,"color":"#0000FF"}]}}'></fig-input-fill>

<!-- Image -->
<fig-input-fill value='{"type":"image","image":{"url":"path/to/image.jpg","scaleMode":"fill"}}'></fig-input-fill>
```

---

### Fill Picker (`<fig-fill-picker>`)

A comprehensive fill picker dialog supporting solid colors, gradients, images, video, and webcam.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | — | JSON fill value |
| `disabled` | boolean | `false` | Disable picker |
| `alpha` | boolean | `true` | Show alpha controls |
| `mode` | string | — | Lock to mode: `"solid"`, `"gradient"`, `"image"`, `"video"`, `"webcam"` |

```html
<!-- Wraps a trigger element -->
<fig-fill-picker value='{"type":"solid","color":"#FF5733"}'>
  <fig-chit></fig-chit>
</fig-fill-picker>

<!-- Lock to solid color mode -->
<fig-fill-picker mode="solid" alpha="true">
  <fig-button>Pick Color</fig-button>
</fig-fill-picker>
```

---

### Chit (`<fig-chit>`)

A color/gradient/image swatch element.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `background` | string | — | CSS background value |
| `size` | string | `"small"` | Size: `"small"` or `"large"` |
| `selected` | boolean | `false` | Show selection ring |
| `disabled` | boolean | `false` | Disable interaction |
| `alpha` | number | — | Opacity (0-1) |

```html
<fig-chit background="#FF5733"></fig-chit>
<fig-chit background="linear-gradient(90deg, #FF0000, #0000FF)"></fig-chit>
<fig-chit background="url(image.jpg)" size="large"></fig-chit>
<fig-chit background="#FF5733" alpha="0.5"></fig-chit>
```

---

### Checkbox (`<fig-checkbox>`)

A checkbox input with indeterminate state support.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `checked` | boolean | `false` | Whether checked |
| `indeterminate` | boolean | `false` | Indeterminate state |
| `disabled` | boolean | `false` | Disable checkbox |
| `name` | string | — | Form field name |
| `value` | string | — | Value when checked |
| `label` | string | — | Programmatic label text (alternative to slotted content) |

```html
<fig-checkbox>Accept terms</fig-checkbox>
<fig-checkbox checked>Selected option</fig-checkbox>
<fig-checkbox indeterminate>Parent option</fig-checkbox>
<fig-checkbox label="Via attribute"></fig-checkbox>
```

---

### Radio (`<fig-radio>`)

A radio button input.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `checked` | boolean | `false` | Whether selected |
| `disabled` | boolean | `false` | Disable radio |
| `name` | string | — | Radio group name |
| `value` | string | — | Value when selected |

```html
<fig-radio name="size" value="small">Small</fig-radio>
<fig-radio name="size" value="medium" checked>Medium</fig-radio>
<fig-radio name="size" value="large">Large</fig-radio>
```

---

### Switch (`<fig-switch>`)

A toggle switch component.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `checked` | boolean | `false` | Whether on |
| `disabled` | boolean | `false` | Disable switch |
| `name` | string | — | Form field name |
| `value` | string | — | Value when on |

```html
<fig-switch>Enable notifications</fig-switch>
<fig-switch checked>Active feature</fig-switch>
```

---

### Field (`<fig-field>`)

A form field wrapper with flexible layout. Automatically links `<label>` elements to the first `fig-*` child for accessibility.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `direction` | string | `"column"` | Layout: `"column"`, `"row"`, `"horizontal"` |
| `label` | string | — | Programmatically set the label text |

```html
<!-- Vertical (default) -->
<fig-field>
  <label>Username</label>
  <fig-input-text></fig-input-text>
</fig-field>

<!-- Horizontal -->
<fig-field direction="horizontal">
  <label>Volume</label>
  <fig-slider min="0" max="100" value="50"></fig-slider>
</fig-field>
```

---

### Combo Input (`<fig-combo-input>`)

A text input with dropdown suggestions.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `options` | string | — | Comma-separated options |
| `placeholder` | string | — | Placeholder text |
| `value` | string | — | Current value |
| `disabled` | boolean | `false` | Disable input |

```html
<fig-combo-input 
  options="House, Apartment, Condo, Other" 
  placeholder="Type of residence">
</fig-combo-input>
```

---

### Avatar (`<fig-avatar>`)

Displays a user's profile image or initials.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | string | — | Image URL |
| `name` | string | — | Name for initials fallback |
| `size` | string | — | Size: `"large"` |

```html
<fig-avatar src="https://example.com/photo.jpg" name="John Doe"></fig-avatar>
<fig-avatar name="Jane Smith" size="large"></fig-avatar>
```

---

### Image (`<fig-image>`)

An image display or upload component.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | string | — | Image URL |
| `upload` | boolean | `false` | Show upload button |
| `label` | string | — | Upload button label |
| `size` | string | — | Preview size |

```html
<fig-image src="photo.jpg"></fig-image>
<fig-image upload label="Upload Image"></fig-image>
```

---

### Input Joystick (`<fig-input-joystick>`)

A 2D position input control.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | — | Position: `"x,y"` (0-1 range) |
| `precision` | number | — | Decimal places |
| `transform` | number | — | Output scaling |
| `text` | boolean | `false` | Show X/Y inputs |
| `coordinates` | string | `"screen"` | Coordinate system: `"screen"` (0,0 top-left) or `"math"` (0,0 bottom-left) |

```html
<fig-input-joystick value="0.5,0.5"></fig-input-joystick>
<fig-input-joystick value="0.5,0.5" text="true" precision="2"></fig-input-joystick>

<!-- Math coordinates (Y-axis inverted: 0,0 at bottom-left) -->
<fig-input-joystick value="0.5,0.5" coordinates="math" text="true"></fig-input-joystick>
```

---

### Input Angle (`<fig-input-angle>`)

An angle/rotation input control with optional min/max clamping, multi-unit support, and unbounded winding (values beyond 360°).

When `min` and `max` are omitted, the input is unbounded — dragging continuously winds the angle past full revolutions (e.g. 720°, 1080°, or negative values). The text input also accepts values with unit suffixes (`90deg`, `3.14rad`, `0.5turn`) and converts them to the component's `units` format.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | number | `0` | Angle value (in the unit specified by `units`) |
| `precision` | number | `1` | Decimal places for display |
| `text` | boolean | `false` | Show numeric text input alongside the dial |
| `min` | number | — | Minimum angle (omit for unbounded) |
| `max` | number | — | Maximum angle (omit for unbounded) |
| `units` | string | `"°"` | Display unit: `"°"` (or `"deg"`), `"rad"`, `"turn"` |
| `show-rotations` | boolean | `false` | Show a ×N rotation counter when angle exceeds 1 full rotation |

```html
<!-- Basic dial -->
<fig-input-angle value="45"></fig-input-angle>

<!-- With text input -->
<fig-input-angle value="90" text="true"></fig-input-angle>

<!-- Unbounded (supports winding past 360°) -->
<fig-input-angle text="true" value="720"></fig-input-angle>

<!-- Clamped to a range -->
<fig-input-angle text="true" value="90" min="0" max="180"></fig-input-angle>

<!-- Radians -->
<fig-input-angle text="true" units="rad" value="3.14159"></fig-input-angle>

<!-- Turns -->
<fig-input-angle text="true" units="turn" value="0.5"></fig-input-angle>

<!-- Show rotation count (×2 at 720°, ×3 at 1080°, etc.) -->
<fig-input-angle text="true" show-rotations="true" value="1080"></fig-input-angle>
```

---

### Toast (`<fig-toast>`)

A toast notification component.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `duration` | number | `5000` | Auto-dismiss ms (0 = no dismiss) |
| `offset` | number | `16` | Distance from bottom |
| `theme` | string | `"dark"` | Theme: `"dark"`, `"light"`, `"danger"`, `"brand"` |
| `open` | boolean | `false` | Whether visible |

```html
<fig-toast id="myToast" theme="brand" duration="3000">
  Settings saved successfully!
</fig-toast>

<script>
  document.getElementById('myToast').show();
</script>
```

---

### Spinner (`<fig-spinner>`)

A loading spinner indicator.

```html
<fig-spinner></fig-spinner>
```

---

### Shimmer (`<fig-shimmer>`)

A loading placeholder with shimmer animation.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `duration` | string | `"1.5s"` | Animation cycle duration (CSS time value) |
| `playing` | boolean | `true` | Whether the animation is running |

```html
<fig-shimmer style="width: 200px; height: 20px;"></fig-shimmer>
<fig-shimmer style="width: 100px; height: 14px;" duration="2s"></fig-shimmer>
```

---

### Layer (`<fig-layer>`)

A layer list item component (for layer panels). Supports nesting, expand/collapse via chevron, and visibility toggling.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `open` | boolean | `false` | Whether child layers are expanded |
| `visible` | boolean | `true` | Whether the layer is visible |

**Events:** `openchange` (detail: `{ open }`) and `visibilitychange` (detail: `{ visible }`)

```html
<fig-layer>
  <div class="fig-layer-row">
    <span class="fig-layer-icon"></span>
    <span class="fig-layer-name">Rectangle 1</span>
  </div>
</fig-layer>

<!-- Nested with children -->
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

### Header (`<fig-header>`)

A section header component.

```html
<fig-header>Section Title</fig-header>
```

---

## Events

All form components emit standard `input` and `change` events:

- **`input`** - Fires continuously during interaction (dragging, typing)
- **`change`** - Fires when interaction completes (mouse up, blur)

Events include a `detail` object with component-specific data:

```js
// Color input events
colorInput.addEventListener('input', (e) => {
  console.log(e.detail);
  // { color: "#FF5733", alpha: 0.8, hsv: { h: 14, s: 80, v: 100, a: 0.8 } }
});

// Fill picker events
fillPicker.addEventListener('change', (e) => {
  console.log(e.detail);
  // { type: "gradient", gradient: { type: "linear", angle: 90, stops: [...] }, css: "linear-gradient(...)" }
});

// Slider events
slider.addEventListener('input', (e) => {
  console.log(e.target.value); // "75"
});
```

---

## Framework Integration

### React

Web components work in React, but require some considerations:

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

  // Set initial value via ref to avoid infinite loops
  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute('value', value);
    }
  }, [value]);

  return (
    <fig-input-color
      ref={ref}
      text="true"
      alpha="true"
      picker="figma"
    />
  );
}
```

> **Note:** Avoid setting the `value` prop directly on web components in JSX during re-renders, as `attributeChangedCallback` may trigger events that cause infinite loops. Use refs to control updates.

### Vue

```vue
<template>
  <fig-input-color
    :value="color"
    text="true"
    alpha="true"
    @input="onInput"
    @change="onChange"
  />
</template>

<script setup>
import { ref } from 'vue';
import '@rogieking/figui3/fig.css';
import '@rogieking/figui3/fig.js';

const color = ref('#FF5733');

const onInput = (e) => {
  color.value = e.detail.color;
};

const onChange = (e) => {
  console.log('Final color:', e.detail);
};
</script>
```

### Svelte

```svelte
<script>
  import '@rogieking/figui3/fig.css';
  import '@rogieking/figui3/fig.js';
  
  let color = '#FF5733';
  
  function handleInput(e) {
    color = e.detail.color;
  }
</script>

<fig-input-color
  value={color}
  text="true"
  alpha="true"
  on:input={handleInput}
  on:change={(e) => console.log('Saved:', e.detail)}
/>
```

---

## Theming

FigUI3 automatically adapts to light and dark themes using CSS custom properties. The library uses Figma's color variable naming convention:

```css
/* Colors automatically switch based on color-scheme */
--figma-color-bg
--figma-color-bg-secondary
--figma-color-bg-hover
--figma-color-text
--figma-color-text-secondary
--figma-color-border
--figma-color-icon
/* ... and more */
```

### Using in Figma Plugins

In Figma plugins, these variables are provided automatically. For standalone usage, the library includes fallback values that respond to `prefers-color-scheme`.

### Manual Theme Control

```html
<body style="color-scheme: dark;">
  <!-- Forces dark theme -->
</body>
```

---

## Browser Support

FigUI3 supports all modern browsers with Web Components support:

- Chrome/Edge 67+
- Firefox 63+
- Safari 10.1+

---

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting a pull request.

---

## License

[MIT License](LICENSE) © Rogie King
