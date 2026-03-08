# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.30.1]

### Fixed

- Ensure `.input-combo > label` uses explicit text-color token resolution so `fig-input-fill` labels render with the correct scheme-driven text color.

## [2.30.0]

### Added

- Added a full `propkit/` React + Vite app for interactive PropKit exploration, including section/example navigation and live preview composition.
- Added live CodeMirror-to-preview syncing so editing example markup re-renders the active example immediately.
- Added a dynamic `Attributes` panel in PropKit that parses `fig-field` + primary `fig-*` controls and maps attributes to native FigUI controls.
- Added a new `Number` section with `fig-input-number` examples and attribute mappings.
- Added a new project skill: `.cursor/skills/nested-css-selectors/`.

### Changed

- Updated PropKit layout and styles, including nested CSS refactors, top-aligned centered main content, and refined code/attributes panel headers.
- Updated PropKit example metadata and curation (removed redundant gradient/image/slider variants, removed combined panel, and refined example naming).
- Renamed example wrapper usage from `.prop-panel` to `.propkit-example`, with backward-compatible unwrap handling and standardized re-wrap behavior.
- Updated `.propkit-example` styling to remove the border and use opposite `color-scheme` for stronger visual contrast.
- Updated `Attributes` panel behavior with targeted control rules (dropdowns using `experimental=\"modern\"`, segmented control for `direction`, constrained aspect-ratio options, and specialized 3D rotate field labels/options).
- Removed `fig-popover` and `fig-popover-2` component implementations and associated demo/docs usage; popup guidance now centers on `fig-popup`.
- Updated `glitch.html` to use a `fig-popup` example instead of `fig-popover`.

### Fixed

- Fixed `fig-image` attribute reactivity for `upload`/`download` by supporting presence-style booleans, observing `download`, and handling each attribute independently in `attributeChangedCallback`.
- Fixed enum dropdown value handling in PropKit attributes so displayed sentence-case labels no longer corrupt raw attribute values (notably `fig-3d-rotate` fields).


## [2.29.3]

### Fixed

- Fix `querySelector` crash in propkit when navigating to `#3d-rotate` (IDs starting with a digit are invalid CSS selectors); switched to `getElementById`.

## [2.29.2]

### Fixed

- Include `propkit.html` and `.cursor/skills/` in published npm package.

## [2.29.1]

### Changed

- Reduced `fig-3d-rotate` field input flex-basis from `4rem` to `3rem` for tighter layouts.

## [2.29.0]

### Added

- `fig-3d-rotate` now supports a `fields` attribute to render `fig-input-number` inputs for specified axes (e.g. `fields="rotateX,rotateY,rotateZ"`), with two-way sync between the cube preview and number fields.
- Number fields use degree units, `precision="1"`, and flex-wrap responsively with a `4rem` min-width per field.
- Added propkit examples for fields: all axes, Y only, X & Y, fields with 16:9 aspect ratio and preset values, and fields without a label.

### Changed

- `fig-3d-rotate` layout updated to `flex-wrap: wrap` with gap for proper field stacking below the cube container.
- `fig-3d-rotate` now constrains properly inside horizontal `fig-field` via `min-width: 0`.

### Fixed

- `fig-3d-rotate` field inputs now intercept both `input` and `change` events from child `fig-input-number` elements, preventing mismatched event detail leaking to consumers.

## [2.28.0]

### Fixed

- Added missing `#wasDragged` private field declaration in `FigPopup` to prevent runtime syntax errors in popup drag/reposition logic.

## [2.27.0]

### Changed

- Refined easing curve editor visuals with rounded stroke caps/joins and padded drawing container for clearer spring/bezier presentation.

### Fixed

- `fig-popup` now stops anchor-based auto-repositioning after the user manually drags an anchored, draggable popup, preserving manual placement.

## [2.26.0]

### Added

- New `fig-easing-curve` component with bezier and spring editing, preset dropdown support, and `input`/`change` events exposing `value`, `cssValue`, `mode`, and `preset`.
- New `propkit.html` demo page with focused property-field examples, including image, color, fill, slider variants, switch, dropdown, segment, angle, and easing curve sections.
- Copy-prompt helpers in `propkit.html` section subheaders, including one-click prompt copy and toast feedback.

### Changed

- `fig-easing-curve` spring editor now keeps duration marker behavior aligned to the rendered spring timeline and improves handle interaction/visual consistency.
- Easing curve icon generation now uses 24x24 icons with 6px padding and dynamic custom preset icon refresh.
- Sliders in `propkit.html` now use the Neue slider variant.
- `fig-image` now supports `aspect-ratio` and `fit` mapping to internal CSS vars for richer image layout control.

### Fixed

- Tooltip warmup behavior: recently shown tooltips now open instantly during rapid hover transitions.
- `fig-input-fill` now supports `alpha="false"` and hides opacity controls when alpha is disabled.
- Easing curve bezier diagonal reference line visibility and spring duration marker rendering issues in demos.

## [2.25.0]

### Added

- Custom mode slots for `fig-fill-picker` — add custom tabs via `slot="mode-*"` children (e.g., `<div slot="mode-shader" label="Shader">`). The mode name must also appear in the `mode` attribute.
- `modeready` event on `fig-fill-picker` — fires per custom mode with `{ mode, container }` detail, giving frameworks like React a stable DOM target to render into without DOM reparenting.
- `picker-*` attribute forwarding on `fig-input-color` and `fig-input-fill` — attributes like `picker-anchor` and `picker-dialog-position` are forwarded to the underlying `fig-fill-picker`.
- `picker-anchor` attribute on `fig-input-color` and `fig-input-fill` — set to `"self"` to anchor the fill picker to the entire input, or pass a CSS selector for a custom anchor element.
- Custom trigger support examples for `fig-fill-picker` — buttons, icon buttons, inline text, and custom divs as triggers.
- Custom mode demos: Shader mode with `fig-input-text multiline`, built-in mode override with a palette, and a React mode using `modeready`.
- Prism.js syntax highlighting for code examples in the demo page.

### Changed

- `fig-input-fill` fill picker now defaults its anchor to the component itself (not just the chit).
- Custom mode tabs in `fig-fill-picker` automatically get zero padding on `.fig-fill-picker-content`, giving slot content full control over layout.
- `dialog-position` removed from `FigInputColor.observedAttributes` — use `picker-dialog-position` instead.
- `fig-fill-picker` trigger detection now skips `slot="mode-*"` children when identifying the trigger element.

### Fixed

- Dropdown inner content now has `width: 100%` for proper sizing.
- Ghost button active state now uses correct text color (`--figma-color-text`).

## [2.24.0]

### Changed

- Improved modern dropdown layout and FigImage teardown safety.

## [2.23.0]

### Added

- `viewport-margin` attribute for `fig-popup` — defines per-edge safe areas (CSS margin shorthand: `top right bottom left`) that popups avoid during positioning. Useful for keeping popups clear of persistent UI like toolbars.
- Viewport margin demo in the popup section showing a 64px bottom margin.

### Fixed

- Scroll events originating inside a popup no longer trigger repositioning.

## [2.22.3]

### Fixed

- Large icon buttons now correctly sized at 32px: added `flex-basis` override and `padding: 0` to prevent `[icon]` flex-basis (24px) and `[size="large"]` padding from shrinking/padding the icon area.
- Removed doubled padding on large text buttons: shadow DOM `:host([size="large"])` rule no longer adds its own padding (host padding suffices).

## [2.22.2]

### Added

- Button combo examples for `variant="input"` and `variant="ghost"` in the demo page.
- `size="large"` support for segmented controls with corresponding CSS.
- `size="large"` examples for all icon button variants with 24x24 icons.

### Fixed

- Large buttons: shadow DOM inner `<button>` uses `:host([size="large"])` selectors to properly respond to the host's size attribute.

## [2.22.1]

### Changed

- Popup shorthand positioning (`position="left"`, etc.) now smoothly slides the cross-axis to fit the viewport instead of snapping to discrete top/center/bottom alignments. Stays on the preferred side as long as the primary axis fits.
- Popup scroll tracking is now synchronous (no RAF delay), eliminating 1-frame lag when scrolling. Scroll listener uses `{ passive: true }` to avoid blocking scroll performance.
- Demo page sidebar width is now viewport-based (`15vw`, clamped between 180px–280px).

## [2.22.0]

### Added

- `dialog-position` attribute pass-through for `fig-input-color` — allows controlling the popup direction of nested color pickers (defaults to `"left"`).
- `#isInsideDescendantPopup` method on `fig-popup` — walks the popup anchor chain to determine logical containment across sibling `<dialog>` elements.

### Fixed

- Nested popup dismissal: interacting with a child popup (e.g., a gradient stop's color picker) no longer closes the parent popup. The outside-click handler now recognizes popups whose anchor chain traces back into the current popup.
- Gradient stop color pickers now open to the right (`dialog-position="right"`) to avoid viewport-edge fallback to top positioning.

### Changed

- Refined popup fallback positioning: single-word `position` values (e.g., `left`) now try opposite then perpendicular axes; two-word values use smarter ordered candidates instead of a 3x3 matrix.
- Removed hover `grab` cursor on draggable `fig-popup` (only shows `grabbing` while actively dragging).

## [2.21.0]

### Added

- `autoresize` attribute for `fig-popup` (default: true). Set `autoresize="false"` to disable content-driven repositioning and auto-sizing CSS (`width: max-content`, `max-width`, `max-height`, `overflow`).
- Drag cursor behavior for `fig-dialog` and `fig-popup`: `grab` on hover, `grabbing` while dragging (previously used `move`).
- Left shorthand popup position example in the demo page.

### Changed

- Popup `position` semantics for two-word values: when vertical is `top` or `bottom`, horizontal `left`/`right` now means edge-alignment (e.g., `top left` = above anchor, left edges aligned) rather than side-placement. `center left`/`center right` retains side-placement behavior.
- Fill picker popup (`fig-input-fill`, `fig-input-color`) now uses `position="left"` for correct side placement next to the trigger.
- Nav width increased to 240px in the demo page.

### Fixed

- Fill picker popup anchoring: now anchors to the trigger element (`fig-chit` or button) instead of the `fig-fill-picker` wrapper, which uses `display: contents` and has no bounding box.
- Fill picker popup sets `autoresize="false"` to prevent unwanted content-driven repositioning.

## [2.20.0]

### Added

- Toolbelt component at the bottom of the demo page with sectioned icon button groups.
- Non-modal dialog example with code showing `.show()` vs `.showModal()`.
- `closedby` attribute documentation and live demos (`any`, `closerequest`, `none`) in the dialog section.

### Changed

- Elevation shadow variables (`--figma-elevation-*`, `--handle-shadow`) now use `light-dark()` inline for theme switching, removing the need for separate `.figma-dark` and `@media (prefers-color-scheme: dark)` override blocks.

### Fixed

- Dialog `closedby="none"` and `closedby="closerequest"` now properly prevent outside-click dismissal in the JS fallback handler.

## [2.19.1]

### Fixed

- `@media (prefers-color-scheme)` blocks no longer conflict with manual theme switching via `color-scheme`. Scoped with `:not(.figma-dark):not(.figma-light)` so they only apply as a no-JS fallback; class-based overrides are now the primary mechanism.

## [2.19.0]

### Added

- New `variant="input"` for `fig-button` — styled to match input fields with matching hover, active, and focus-visible states.
- `--icon-chevron` added to the icons demo page.
- Button demo examples for the input variant: default, with chevron icon, icon-only, and disabled states.

### Fixed

- `fig-input-fill` gradient label now updates when changing gradient subtype (e.g., Radial → Linear) without switching fill types.
- `experimental` attribute now passes through to `fig-dropdown` elements in the image, video, and webcam tabs of `fig-fill-picker`.

## [2.18.3]

### Fixed

- `fig-input-fill` gradient label now updates when changing gradient subtype (e.g., Radial → Linear) without switching fill types.
- `experimental` attribute now passes through to `fig-dropdown` elements in the image, video, and webcam tabs of `fig-fill-picker`.

## [2.18.2]

### Fixed

- Gradient stop opacity at 0% no longer snaps back to 100% — replaced `|| 100` with `?? 100` (nullish coalescing) so zero is not treated as falsy.
- Color picker handle now updates its color when the hue slider changes — added missing `#updateHandlePosition()` call.

### Added

- Experimental attribute examples for `fig-fill-picker` and `fig-input-fill` in the demo page.

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
