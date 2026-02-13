# Changelog

All notable changes to this project will be documented in this file.

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
