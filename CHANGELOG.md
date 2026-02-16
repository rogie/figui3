# Changelog

All notable changes to this project will be documented in this file.

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
