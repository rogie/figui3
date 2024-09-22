# Figma UI3 Web Components

figUI3 is a collection of custom web components that provide various UI elements and functionality for web applications. These components are designed to be easily integrated into your projects, offering a set of reusable and customizable UI elements.

## Table of Contents

- [Components](#components)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Components

The Fig Components library includes the following custom elements:

1. `<fig-button>`: A customizable button component.
2. `<fig-dropdown>`: A dropdown select component.
3. `<fig-tooltip>`: A tooltip component that can be triggered by hover or click.
4. `<fig-popover>`: A popover component similar to tooltip but with more flexibility.
5. `<fig-dialog>`: A dialog/modal component.
6. `<fig-tabs>`: A tabbed interface component.
7. `<fig-segmented-control>`: A segmented control component for mutually exclusive options.
8. `<fig-slider>`: A slider input component with optional text input.
9. `<fig-input-text>`: A text input component with optional append and prepend slots.
10. `<fig-field>`: A form field wrapper component.
11. `<fig-input-color>`: A color input component with optional text and alpha inputs.
12. `<fig-checkbox>`: A checkbox input component.
13. `<fig-switch>`: A switch/toggle input component.

## Installation

To use Fig Components in your project, include the JavaScript file in your HTML:

```html
<script src="path/to/fig-components.js"></script>
```

Make sure to replace `path/to/fig-components.js` with the actual path to the JavaScript file containing the component definitions.

## Usage

After including the Fig Components script in your HTML, you can use the custom elements in your markup. Here are some examples:

### Button

```html
<fig-button>Click me</fig-button>
```

### Dropdown

```html
<fig-dropdown>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
  <option value="3">Option 3</option>
</fig-dropdown>
```

### Tooltip

```html
<fig-tooltip text="This is a tooltip" action="hover">
  Hover over me
</fig-tooltip>
```

### Slider

```html
<fig-slider min="0" max="100" value="50" text></fig-slider>
```

### Color Input

```html
<fig-input-color value="#ff0000" text alpha></fig-input-color>
```

For more detailed usage instructions and examples for each component, please refer to the individual component documentation.

## Contributing

Contributions to Fig Components are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
