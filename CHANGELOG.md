# Changelog

All notable changes to this project will be documented in this file.

## [2.18.1]

### Added

- Prepend/append slot elements on `fig-input-number` and `fig-input-text[type="number"]` now act as scrub handles — click and drag to scrub the value without holding alt/option.
- `cursor: ew-resize` on slot elements in numeric inputs to indicate the drag affordance.
- `react.html` test page for verifying web component behavior under React state-driven re-renders.

### Changed

- Alt-drag scrubbing no longer stops if the alt key is released mid-drag — once scrubbing starts, it continues until pointer release.

## [2.18.0]

### Fixed

- **Interaction guard for framework re-renders**: Components with drag/scrub interactions no longer get clobbered when React (or other frameworks) set the `value` attribute during an active user gesture. Follows the same `#isDraggingColor` pattern already used by `fig-fill-picker`.
  - `fig-input-number`: Guards alt-drag scrubbing and keyboard editing (focus/blur)
  - `fig-input-text`: Guards alt-drag scrubbing for number type
  - `fig-slider`: Guards native range input drag via pointerdown/pointerup
  - `fig-input-angle`: Guards handle drag
  - `fig-input-joystick`: Guards handle drag
- **`fig-input-fill` no longer destroys DOM mid-interaction**: `attributeChangedCallback` now updates children in-place instead of doing a full re-render when the fill type hasn't changed.

### Changed

- `fig-slider` with `text="true"` now skips the range input in tab order (`tabindex="-1"`), so Tab goes directly to the text input.
- `fig-input-color`, `fig-input-fill`, and `fig-slider` now properly flex and shrink inside horizontal `fig-field` layouts (`flex: 1; min-width: 0`).
- Updated horizontal fields demo section with a resizable container and `full` attribute on all inputs.

## [2.17.2]

### Added

- New `FigPopup` foundational floating component implemented as `<dialog is="fig-popup">`.
- `FigPopup` supports:
  - `anchor` selector binding (local-first lookup, then document fallback)
  - `position` with two-value placement (`vertical horizontal`)
  - single-value shorthand placement (`top`, `bottom`, `left`, `right`)
  - `offset="x y"` with unitless values treated as pixels
  - observer-driven repositioning on popup content changes and anchor resize
- Added comprehensive Popup examples in `index.html`, including:
  - default and explicit placements
  - property API usage (`popup.open = true/false`)
  - position matrix examples and single-value shorthand examples
  - per-example code snippets

### Changed

- `FigPopup` outside-click behavior now closes by default (`closedby="any"` with fallback handling).
- Popup open handling is idempotent (repeated open requests do not re-open/reinitialize when already open).
- Default popup offsets are now `0 0` (both horizontal and vertical).
- Popup demo anchors now bind directly to the corresponding open button (removed separate anchor-target buttons).

## [2.17.1]

### Changed

- Moved `fig-footer` styles from page-local `index.html` styles into `components.css` for reusable component-level styling.
- Added component-level sticky support for `fig-footer[sticky]`, including bottom stickiness and theme-aware background treatment.
- Kept demo markup clean by removing duplicated `fig-footer` style definitions from `index.html`.

## [2.17.0]

### Added

- Added a `fig-footer sticky="true"` demo to the main page with a settings control menu.
- Added rich dropdown option examples using `fig-checkbox` controls for fill-application actions.

### Changed

- Refined sticky footer behavior in `index.html` to use true sticky semantics (content-bottom when short, sticky on overflow).
- Updated settings menu trigger to follow the `fig-button type="select"` pattern used in button examples.
- Improved `fig-dropdown` handling for persistent controls (`fig-checkbox`, `fig-switch`, checkbox inputs) in option content so interaction does not behave like standard pick-and-close selection.
- Fixed `fig-checkbox` lifecycle behavior to prevent duplicate internal rendering when checkbox elements are cloned inside dropdown option content.

## [2.16.0]

### Added

- `fig-segmented-control` now supports a `disabled` attribute
- Added disabled segmented control examples in `index.html` for both text and icon variants
- Added an experimental modern dropdown example with icons in options (bleeding-edge browser support)

### Changed

- Improved experimental modern dropdown picker option layout spacing (`gap: var(--spacer-2)`)
- Enforced dark color scheme for the modern picker menu to keep option colors consistent in light mode
- Ensured nested elements inside modern picker options inherit text color for custom option content

## [2.15.0] - Breaking Changes

### Changed

- **BREAKING**: Experimental CSS features (customizable select picker) now require `experimental="modern"` instead of `variant="neue"`
  - Before: `<fig-dropdown variant="neue">`
  - After: `<fig-dropdown experimental="modern">`
- The `variant` attribute is now reserved for visual styling only (e.g., `fig-slider variant="neue"` for visual appearance)

### Added

- New `experimental` attribute for opting into experimental CSS features
- Extensible format allows multiple features: `experimental="modern popover"` (for future features)

### Migration Guide

If you were using `variant="neue"` on `fig-dropdown` to enable the customizable select picker:

```html
<!-- Before -->
<fig-dropdown variant="neue">
  <option>Option 1</option>
</fig-dropdown>

<!-- After -->
<fig-dropdown experimental="modern">
  <option>Option 1</option>
</fig-dropdown>
```

Note: `fig-slider variant="neue"` continues to work as before for visual styling.
