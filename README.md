# FigUI3

A lightweight, customizable web component library that uses Figmas UI3 style for modern web applications, but specifically for Figma plugins.

## Features

- 🎨 Figma-inspired design system
- 📦 Zero dependencies
- 🚀 Lightweight and performant
- 🎯 Built with Web Components
- 🔧 Highly customizable
- 🌐 Framework agnostic

## Components

The library includes the following components:

- `<fig-button>` - Versatile button component with multiple variants
- `<fig-checkbox>` - Checkbox input with indeterminate state support
- `<fig-dialog>` - Modal dialog component
- `<fig-dropdown>` - Customizable dropdown select
- `<fig-field>` - Form field wrapper with flexible layout options
- `<fig-header>` - Section header component
- `<fig-input-color>` - Color picker with hex/rgba support
- `<fig-input-text>` - Text/Number input with optional prefix/suffix slots
- `<fig-slider>` - Input slider with optional text input and units
- `<fig-switch>` - Toggle switch component
- `<fig-tooltip>` - Hover and click-triggered tooltips
- `<fig-spinner>` - Loading spinner component
- `<fig-combo-input>` - Combobox input
- `<fig-chit>` - Color/Gradient/Pattern/Image/Icon/Text chit component
- `<fig-tabs>` - Tabbed navigation component
- `<fig-segmented-control>` - Segmented control component
- `<fig-image>` - Image display or input component

## Installation

```bash
npm install @rogieking/figui3
```

```jsx
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
```

Or include directly in your HTML:

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/@rogieking/figui3@latest/fig.css"
/>
<script src="https://unpkg.com/@rogieking/figui3@latest/fig.js"></script>
```

or

```html
<link rel="stylesheet" href="https://esm.sh/@rogieking/figui3@latest/fig.css" />
<script src="https://esm.sh/@rogieking/figui3@latest/fig.js"></script>
```

## Usage

```html
<!-- Basic button -->
<fig-button>Click me</fig-button>

<!-- Slider with text input -->
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider type="opacity" value="0.75" color="#ff0000" units="%" text="true">
  </fig-slider>
</fig-field>
```

## Documentation

For detailed documentation and examples, visit our [documentation site](https://github.com/rogie/figui3#readme).

## Browser Support

Fig.js supports all modern browsers that implement the Web Components standard:

- Chrome/Edge (Chromium) 67+
- Firefox 63+
- Safari 10.1+

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting a pull request.

## License

[MIT License](LICENSE)

## Component Examples

### Button (`<fig-button>`)

```html
<!-- Basic button -->
<fig-button>Click me</fig-button>

<!-- Primary variant -->
<fig-button variant="primary">Primary Button</fig-button>

<!-- Secondary variant -->
<fig-button variant="secondary">Secondary Button</fig-button>

<!-- Ghost variant -->
<fig-button variant="ghost">Ghost Button</fig-button>

<!-- Ghost variant with icon -->
<fig-button variant="ghost" icon="true">
  <svg><!-- your icon svg --></svg>
</fig-button>

<!-- Link variant -->
<fig-button variant="link">Link Button</fig-button>

<!-- Disabled state -->
<fig-button disabled>Disabled</fig-button>

<!-- Toggle button -->
<fig-button type="toggle">Toggle Me</fig-button>

<!-- Submit button -->
<fig-button type="submit">Submit</fig-button>

<!-- Select list button -->
<fig-button type="select">
  Select Me
  <fig-dropdown>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
    <option value="3">Option 3</option>
  </fig-dropdown>
</fig-button>

<!-- Default button -->
<fig-button type="button">Default</fig-button>

<!-- Upload button -->
<fig-button type="upload">
  Upload
  <input type="file" />
</fig-button>
```

### Dropdown (`<fig-dropdown>`)

```html
<!-- Basic dropdown -->
<fig-dropdown>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
  <option value="3">Option 3</option>
</fig-dropdown>

<!-- With default selection -->
<fig-dropdown value="2">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
  <option value="3">Option 3</option>
</fig-dropdown>
```

### Tooltip (`<fig-tooltip>`)

```html
<!-- Hover tooltip -->
<fig-tooltip text="This is a tooltip" action="hover">
  Hover over me
</fig-tooltip>

<!-- Click tooltip -->
<fig-tooltip text="Click tooltip" action="click"> Click me </fig-tooltip>
```

### Popover (`<fig-popover>`)

```html
<!-- Basic popover -->
<fig-popover>
  <button slot="trigger">Open Popover</button>
  <div slot="content">
    <h3>Popover Title</h3>
    <p>This is the popover content.</p>
  </div>
</fig-popover>
```

### Dialog (`<fig-dialog>`)

```html
<!-- Basic dialog -->
<fig-dialog>
  <fig-header>Dialog Title</fig-header>
  <div slot="content">
    <p>Dialog content goes here.</p>
  </div>
  <div slot="footer">
    <fig-button>Cancel</fig-button>
    <fig-button variant="primary">Confirm</fig-button>
  </div>
</fig-dialog>
```

### Tabs (`<fig-tabs>`)

```html
<fig-tabs>
  <fig-tab label="Tab 1">Content 1</fig-tab>
  <fig-tab label="Tab 2">Content 2</fig-tab>
  <fig-tab label="Tab 3">Content 3</fig-tab>
</fig-tabs>
```

### Segmented Control (`<fig-segmented-control>`)

```html
<fig-segmented-control>
  <button value="1">Option 1</button>
  <button value="2">Option 2</button>
  <button value="3">Option 3</button>
</fig-segmented-control>
```

### Slider (`<fig-slider>`)

```html
<!-- Basic range slider -->
<fig-slider min="0" max="100" value="50"></fig-slider>

<!-- Slider with text input and units -->
<fig-slider min="0" max="100" value="75" text="true" units="%"> </fig-slider>

<!-- Hue slider -->
<fig-slider type="hue" value="55"></fig-slider>

<!-- Stepper slider with discrete snapping values-->
<fig-slider type="stepper" value="25" default="50" step="25">
  <datalist id="markers">
    <option value="0"></option>
    <option value="25"></option>
    <option value="50"></option>
    <option value="75"></option>
    <option value="100"></option>
  </datalist>
</fig-slider>

<!-- Delta slider  -->
<fig-slider type="delta" value=".25" default="0" step="0.25" min="-5" max="5">
  <datalist id="markers">
    <option value="0"></option>
  </datalist>
</fig-slider>

<!-- Opacity slider with color -->
<fig-slider type="opacity" value="0.75" color="#ff0000" units="%" text="true">
</fig-slider>

<!-- Number slider with number transform and percentage units -->
<fig-slider
  min="0"
  max="1"
  transform="100"
  units="%"
  step="0.01"
  text="true"
  value="0.5"
>
</fig-slider>
```

### Text Input (`<fig-input-text>`)

```html
<!-- Basic text input -->
<fig-input-text value="Hello World"></fig-input-text>

<!-- With placeholder -->
<fig-input-text placeholder="Enter text..."></fig-input-text>

<!-- With prepend and append slots -->
<fig-input-text>
  <span slot="prepend">$</span>
  <span slot="append">.00</span>
</fig-input-text>
```

### Field (`<fig-field>`)

```html
<!-- Vertical layout -->
<fig-field>
  <label>Username</label>
  <fig-input-text></fig-input-text>
  <span class="help">Enter your username</span>
</fig-field>

<!-- Horizontal layout -->
<fig-field direction="horizontal">
  <label>Volume</label>
  <fig-slider min="0" max="100" value="50"></fig-slider>
</fig-field>
```

### Color Input (`<fig-input-color>`)

```html
<!-- Basic color picker -->
<fig-input-color value="#ff0000"></fig-input-color>

<!-- With text input and alpha channel -->
<fig-input-color value="#ff0000" text="true" alpha="true"> </fig-input-color>
```

### Checkbox (`<fig-checkbox>`)

```html
<!-- Basic checkbox -->
<fig-checkbox>Accept terms</fig-checkbox>

<!-- Checked state -->
<fig-checkbox checked>Selected option</fig-checkbox>

<!-- Indeterminate state -->
<fig-checkbox indeterminate>Parent option</fig-checkbox>
```

### Switch (`<fig-switch>`)

```html
<!-- Basic switch -->
<fig-switch></fig-switch>

<!-- With label -->
<fig-switch>Enable notifications</fig-switch>

<!-- Checked state -->
<fig-switch checked>Active</fig-switch>
```

### Spinner (`<fig-spinner>`)

```html
<!-- Basic spinner -->
<fig-spinner></fig-spinner>
```

### Combo Input (`<fig-combo-input>`)

```html
<!-- Basic combo input -->
<fig-combo-input
  options="House, Apartment, Condo, Other"
  placeholder="Type of residence"
></fig-combo-input>
```

### Chit (`<fig-chit>`)

```html
<!-- Basic chit -->
<fig-chit type="color" value="#ff0000"></fig-chit>
```

### Image (`<fig-image>`)

```html
<!-- Basic image -->
<fig-image src="https://via.placeholder.com/150"></fig-image>
```

### Header (`<fig-header>`)

```html
<!-- Basic header -->
<fig-header>
  <h3>Header</h3>
</fig-header>
```

### fig-segmented-control (`<fig-segmented-control>`)

```html
<!-- Basic segmented control -->
<fig-segmented-control>
  <fig-segment value="1" selected="true">Option 1</fig-segment>
  <fig-segment value="2">Option 2</fig-segment>
</fig-segmented-control>
```
