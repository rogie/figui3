# Fig.js

A lightweight, customizable web component library that provides Figma-inspired UI elements for modern web applications.

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
- `<fig-slider>` - Input slider with optional text input and units
- `<fig-field>` - Form field wrapper with flexible layout options
- `<fig-dropdown>` - Customizable dropdown select
- `<fig-tooltip>` - Hover and click-triggered tooltips
- `<fig-dialog>` - Modal dialog component
- `<fig-input-color>` - Color picker with hex/rgba support
- And more...

## Installation

```bash
npm install fig-js
```

Or include directly in your HTML:

```html
<script src="https://unpkg.com/fig-js@latest/dist/fig.js"></script>
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

For detailed documentation and examples, visit our [documentation site](https://your-docs-site.com).

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

<!-- Ghost variant with icon -->
<fig-button variant="ghost" icon="true">
  <svg><!-- your icon svg --></svg>
</fig-button>

<!-- Disabled state -->
<fig-button disabled>Disabled</fig-button>

<!-- Toggle button -->
<fig-button type="toggle">Toggle Me</fig-button>
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
  <h2 slot="header">Dialog Title</h2>
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
<!-- Basic slider -->
<fig-slider min="0" max="100" value="50"></fig-slider>

<!-- Slider with text input and units -->
<fig-slider min="0" max="100" value="75" text="true" units="%"> </fig-slider>

<!-- Opacity slider with color -->
<fig-slider type="opacity" value="0.75" color="#ff0000" units="%" text="true">
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
