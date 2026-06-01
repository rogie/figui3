# Changelog

All notable changes to this project will be documented in this file.

## [6.4.0]

### Added

- Added a PropsKit horizontal fields stress test dialog with generated property labels and multiple slider types.

### Changed

- Refined default slider tick sizing.

## [6.3.0]

### Added

- Added Playwright component contract tests covering every `fig.js` web component.
- Added a playground `/tests` route with visual fixtures generated from the shared component manifest.
- Added project testing skills for web component and CSS validation.

## [6.2.0]

### Added

- Added PropsKit video examples after the image examples.

### Changed

- PropsKit image examples now start with a default image example and include explicit fit settings.
- PropsKit preview examples now hide field labels by default, and the image preview uses varied aspect ratio images.

### Fixed

- PropsKit attributes now always expose `fit` for image, video, and media controls.

## [6.1.1]

### Fixed

- Origin grid overflow handles now keep their icon-only treatment.

## [6.1.0]

### Added

- Added `/propskit` as the canonical PropsKit playground route, with `/propkit` redirecting to it.

### Changed

- Renamed the playground header and document title from Propkit to PropsKit.
- Refined lab field slider styling.

## [6.0.0]

### Breaking

- `fig-handle` now uses `tip="color"`, `tip="add"`, or `tip="remove"` for persistent color tips. The old handle `color-tip` and `control` attributes were removed.

### Added

- `fig-input-gradient` now supports `mode="handle"` and `mode="tip"` for color stop handle presentation.

### Changed

- `fig-input-gradient` now defaults to `mode="handle"`; use `mode="tip"` for persistent color tips on gradient stops.
- Refined `fig-input-gradient` handle sizing, border radius, and ghost handle stacking.
- Disabled `fig-handle`s now render without elevation.

## [5.1.1]

### Fixed

- Restored classic script compatibility by removing module syntax from the built `fig.js` output.
- Restored direct `fig-slider.value` reads for consumers using the host element property.

## [5.1.0]

### Added

- `fig-input-text type="search"` now adds a search icon and clear action.
- `fig-input-text type="password"` now adds a show/hide password toggle.
- Added visible and hidden icon tokens for medium and small `fig-icon` sizes.
- `fig-fill-picker` image and video tabs now include rotate actions.

### Changed

- Refined `fig-fill-picker` media preview spacing and webcam capture layout.
- Updated `fig-field` examples and lab styles to use the default horizontal layout.
- Improved secondary and input button hover/pressed states.
- Refined easing editor, slider defaults, canvas handles, and layer label styling.

### Fixed

- `fig-fill-picker` webcam captures now preview correctly and use blob URLs.
- `fig-media` now clears uploaded file previews cleanly.

## [5.0.0]

### Breaking

- `fig-fill-picker` is now optional. Import `fig-editor.js` and `fig-editor.css` to register and style the full picker dialog.
- `fig-input-color` no longer supports the `picker` attribute. It opens `fig-fill-picker` automatically when registered, otherwise it uses the native color input.
- `picker-anchor` was removed. Picker popups anchor to the component that opens them.

### Added

- New package exports: `@rogieking/figui3/fig-editor.js` and `@rogieking/figui3/fig-editor.css`.
- `fig-input-color`, `fig-input-fill`, `fig-input-gradient`, `fig-handle type="color"`, and `fig-color-tip` now check for `fig-fill-picker` at interaction time.

### Changed

- `fig.js` and `components.css` no longer include the full fill picker by default.
- `fig-slider` now uses the compact modern appearance by default; use `variant="classic"` for the previous appearance.
- `fig-slider` now shows its text input by default; use `text="false"` for compact slider-only controls.
- `picker-*` attributes are still forwarded to `fig-fill-picker` when the optional picker is registered.
- `fig-input-gradient edit="picker"` falls back to inline gradient editing when `fig-fill-picker` is unavailable.
- `fig-handle type="color"` falls back to the native color picker when `fig-fill-picker` is unavailable.
- `fig-input-color` now shows alpha/opacity controls by default; use `alpha="false"` to hide them.
- `fig-color-tip` now preserves opacity from bare 4- and 8-digit hex values such as `CB0FFF5E`.
- Playground imports the optional picker files explicitly and no longer uses removed `picker` or `picker-anchor` attributes.

## [4.15.10]

### Added

- PropKit Controls in dialogs: added an All Fields example with every field control using default `fig-field` layout.

### Changed

- PropKit Attributes view uses `columns="2/5"` for attribute rows.
- Playground sidebars use narrower nav and attributes widths.
- `fig-handle`: default and color handles use clearer custom-property-driven styling.
- `fig-media`/`fig-image` upload overlays are constrained to the preview width.

## [4.15.9]

### Changed

- `fig-handle type="color"` closes its color picker when dragging starts and uses an 8px popup offset.

### Fixed

- `fig-fill-picker`: internal color-area handles no longer open nested color pickers.

## [4.15.8]

### Changed

- PropKit Design Token Editor keeps the standard 300px dialog width while using default horizontal field columns.
- `fig-footer` vertical padding now uses `--spacer-2-5`.

## [4.15.7]

### Changed

- PropKit Animated Melty Gif dialog footer now uses the waiting-for-selection layout with an upload prompt before enabling placement.
- `fig-footer` spacing now better supports label-driven action bars.

## [4.15.6]

### Changed

- PropKit header and footer container examples now focus on default usage, with footer states for waiting on selection and applying to a selection.
- PropKit footer labels and actions now lay out cleanly with primary buttons pinned to the right.

### Fixed

- PropKit Attributes view now shows `fig-footer` attributes directly instead of field attributes when editing standalone footers.
- PropKit header attribute control now labels the header action toggle as "Button".

## [4.15.5]

### Added

- `fig-preview`: styled visual preview layer for arbitrary content such as images, canvas, SVG, and generated previews.
- PropKit container examples for `fig-content`, `fig-header`, and `fig-footer`.
- PropKit Animated Melty Gif dialog includes a collapsible "About this tool" section.

### Changed

- `fig-fill-picker`: image and video tabs now use `fig-image` and `fig-media` upload components, keeping preview behavior consistent with the rest of FigUI.
- `hstack`: vertically centers items by default and supports `align` overrides.
- PropKit Preview canvas example now shows a shader-style preview.
- PropKit plugin iframe More Info group is collapsed by default.

### Fixed

- `fig-handle`: percentage values now remain responsive instead of being converted to fixed pixels, keeping gradient handles aligned when containers resize.
- `fig-fill-picker`: gradient stop handles refresh correctly when switching into the Gradient tab from another fill type.

## [4.15.4]

### Added

- PropKit button examples with labeled and unlabeled action rows.
- `fig-field`: `columns="2/5"` layout ratio for compact dialog rows.
- Checkerboard sizing tokens for chits, sliders, and handles.

### Changed

- PropKit dialog examples use 300px dialogs and half-column internal fields, with the design token editor using `columns="2/5"`.
- `fig-input-palette`: expanded color rows always show alpha controls, and palette fields get tighter layout behavior inside `fig-field`.
- Attribute panel label for `checkerboard` is now "Checkered".
- PropKit plugin iframe More Info copy now uses short instructional paragraphs.
- Opacity slider and handle checkerboards use component-specific checkerboard sizing.

## [4.15.3]

### Added

- `fig-handle`: `color-tip` attribute restores the compact color-tip interaction when needed.

### Changed

- `fig-handle type="color"` now opens the solid fill picker directly by default while preserving `{ color, opacity }` input/change events.
- `fig-input-gradient`: color stop handles opt into `color-tip` to keep the compact gradient-stop editing workflow.
- `fig-menu`: popup placement happens before reveal and arrow-key navigation works from the trigger.
- `fig-input-color`: tab flow skips nested swatch color inputs when a text input is present.
- `fig-input-palette`: inline swatches are passive previews; clicking the inline strip or add button expands the palette; remove buttons include "Remove color" tooltips.

### Fixed

- `fig-input-palette`: remove buttons re-enable after adding colors back above the minimum.
- `fig-color-tip`: compact tip positioning is anchored correctly for non-drag color handles.

## [4.15.2]

### Fixed

- `fig-menu`: reopening after dismiss (outside click, Escape) works again — `fig-popup` now calls native `dialog.close()` via `:open` so the menu `open` state stays in sync; trigger ignores stale `open` when the popup is not showing.

## [4.15.1]

### Changed

- Propkit plugin iframe demo loads FigUI from `unpkg.com/@rogieking/figui3@latest` again (was local `/fig.css` and `/fig.js`).

## [4.15.0]

### Added

- `fig-icon` component — masked icons via `name`; `size="small"` (1rem) or `medium` (1.5rem, default); `color` sets fill via `background-color` (Figma icon tokens).

### Changed

- **Breaking:** Icon design tokens renamed by artboard size: `--icon-16-*` (16×16) and `--icon-24-*` (24×24). Update custom CSS from e.g. `var(--icon-close)` to `var(--icon-24-close)`.
- Library internals: `fig-mask-icon` spans replaced with `<fig-icon>` (dialog close, palette add/remove, fill picker, easing curve, chooser nav, media controls, etc.). Legacy `.fig-mask-icon` CSS still supported.
- `fig-handle`: no longer auto-sets `type="canvas"` when `type` is omitted (default is the base brand dot handle).

## [4.14.1]

### Changed

- `:root.figma-light` / `:root.figma-dark`: set `color-scheme` and `background-color` from `--figma-color-bg`.
- `fig-dialog`: `--dialog-radius` token; child `iframe` uses matching bottom corner radius.

## [4.14.0]

### Added

- `fig-input-palette` `fixed` attribute — when present or `fixed="true"`, palette length is locked (no add or remove buttons). Expanded rows show alpha controls when fixed.

### Changed

- `fig-input-palette`: replaced `add` with `fixed` (breaking: use `fixed` instead of `add="false"` for preset palettes).
- `fig-input-palette`: color swatches use the native color picker instead of `fig-fill-picker`.
- `fig-chit`: checkerboard layer uses new `--checkerboard-chit` token (14px tiles); `fig-handle` color swatch checkerboard matches.

### Fixed

- `fig-input-palette`: inline chit strip layout — nested `fig-chit` styles, swatch dividers, and full-width strip when `fixed`.
- `fig-combo-input`: joined-border radius rules no longer apply to nested `fig-chit`.

## [4.13.1]

### Added

- `fig-canvas-control` radius ring: new white halo outer circle painted behind the brand-colored radius circle (sandwiched between `.fig-canvas-control-radius-hit` and the brand circle). Both halo and brand strokes thicken to `--fig-canvas-control-line-stroke-width-hover` on hover/active so hover and active drag look identical.
- `--fig-canvas-control-radius-stroke` / `--fig-canvas-control-radius-stroke-halo` CSS vars to override radius ring colors.

### Changed

- `fig-canvas-control` radius ring default stroke now `--figma-color-border-brand` (was a translucent white).
- `fig-canvas-control` `type="point-radius-angle"` during radius drag: the angle handle (and its hit-area) is now `pointer-events: none` so the body's rotation/resize cursor wins and the angle tooltip cannot show. Restored on pointer up.
- `fig-color-tip` popup nudged up another 2px (from `bottom: calc(100% + 6px)` to `+ 8px`) for breathing room above the handle.

### Fixed

- `fig-canvas-control` radius drag: angle tooltip no longer leaks in if the cursor passes over the angle handle mid-drag. Hover guard now also returns early when `#isRadiusDragging` is true, and the tooltip is force-hidden at the start of radius drag.

### Added

- `fig-canvas-control`: hover tooltips for all handles (point, angle, second, radius). Tooltip appears on `pointerenter` and hides on `pointerleave`, gated by drag state so it never flickers during interaction.
- `fig-canvas-control` radius: the radius tooltip now follows the cursor via a virtual anchor (during both hover and drag) and is nudged 8px above the cursor.
- `fig-canvas-control` `type="point-point"`: the connecting line is now draggable. A 12px transparent hit-line under the visible line uses `cursor: move` and translates both points by the same delta, clamped so both endpoints stay within `[0%, 100%]`. Emits a single `input`/`change` cycle.
- `fig-canvas-control` `type="color"`: hover tooltip now shown (previously suppressed). Auto-hides when the color picker (`fig-color-tip`) opens via a MutationObserver on the handle, and re-enables when it closes.
- `fig-popup` `set anchor`: now accepts any object with a `getBoundingClientRect()` method (virtual anchor), not just `Element` instances. Anchor-dependent code paths (`classList`, `contains`, ResizeObserver) are guarded so virtual anchors work safely.

### Changed

- `fig-canvas-control`: all handle tooltips (point, angle, second, point-point line drag) are now hidden during drag rather than shown. Hover guards also check drag state so tooltips can't be re-shown mid-drag from a stray `pointerenter`.
- `fig-handle[type="color"]` `fig-color-tip`: nudged the picker popover up by 4px (from `bottom: calc(100% + 2px)` to `+ 6px`).
- Propkit dialogs (Rename, Shadow, Progressive Blur, Photo Stack, Export Settings, Design Token Editor, Prepress, Animated Melty Gif): dialog body content is now wrapped in `<fig-content>` so the scroll region and `fig-footer` placement matches the recommended structure. The Plugin dialog (which hosts an iframe) is intentionally left alone.
- Lab Color canvas example: `name` changed from "Position" to "Click to edit color".

### Fixed

- `fig-chooser` `layout="grid"`: the start nav button no longer shows up at the top when scrolled to the start. In grid mode the sticky `position: sticky` + negative-margin chevron trick used by flex layouts didn't collapse, so the nav buttons took real grid rows and pushed `scrollTop` to a non-zero value at "start". Grid mode now skips creating nav buttons entirely (and CSS hides them as a safety belt); use `overflow="scrollbar"` for native scrolling when grid content overflows.
- `fig-chooser` `#syncOverflow`: added a `scrollable` guard so `overflow-start` / `overflow-end` classes are only applied when the chooser actually has overflow beyond a 2px threshold. Prevents spurious nav buttons when content fits exactly.
- `fig-chooser`: `layout` is now an observed attribute; switching layout at runtime re-applies overflow mode and re-syncs nav button visibility immediately.

### Changed

- `fig-chooser` `layout="grid"`: now uses `column-gap` + `row-gap` (both `--fig-chooser-gap`) with `fig-choice { margin: 0 !important }` so choices flow naturally into a 2-column grid without doubled spacing from the base flex `margin-block-end`.

### Fixed

- `select > button` (customized select closed-state button): switched from `display: inline-block` (which silently ignored `align-items`/`justify-content`) to `display: inline-flex` with `justify-content: flex-start` so children align left and vertically center as intended.
- `select`: removed the now-unneeded `&:has(> button) { padding-left: 0 }` override since the flex button already controls its own inner padding.

## [4.12.0]

### Added

- `fig-chooser` nav buttons now render an explicit `.fig-mask-icon.fig-chooser-nav-chevron` span (using `--icon: var(--icon-chevron)` and `--size: 1rem`) instead of a CSS `::after` pseudo-element. Rotation is still handled by class-scoped CSS (180° for nav-start, ±90° for horizontal layout).
- `fig-chooser` nav buttons: `box-shadow` border edge switched from `--figma-color-border` to `--figma-color-bordertranslucent` for a softer divider.

### Changed

- `fig-chooser`: removed the `padding` attribute entirely (was `padding="false"` to drop internal padding). The chooser no longer reads or styles a `padding` attribute; use `--fig-chooser-gap` and `fig-choice` padding controls instead. `fig-choice`'s own `padding` attribute is unchanged.
- Propkit Chooser examples (Text, Images, Images + Labels, Colors, Palettes, Gradients): the wrapping `fig-field` now defaults to `direction="vertical"` so the chooser gets full panel width.
- Propkit Chooser Text + Images + Labels examples: every `fig-choice` now has `padding` set so the selection ring frames the content with breathing room.

### Removed

- `fig-chooser` `padding` from `observedAttributes`, the `&[padding="false"]` CSS block, the playground attributes rule, and the README attributes table row.

### Added

- `fig-media`, `fig-image`, `fig-video`: new `size` attribute (`small` = 2rem, `medium` = 4rem, `large` = 6rem) for quick fixed-size media tiles. Exposes a `--fig-media-size` CSS var that drives both `max-width` and `max-height`.
- `fig-handle`: new `type="canvas"` variant (used by `fig-canvas-control` for angle/second/non-color handles). Handles now default to `type="canvas"` when no type is set, and the canvas variant renders the `::after` indicator like `type="color"`.
- Playground attributes panel: `type` enum (default/color/canvas) added for `fig-handle`.

### Changed

- `fig-chooser`: initial scroll-to-selected is now reliable. After connect, the chooser waits for any child `<img>`/`<video>` media to load (or error) and then re-centers the selected choice without animation, so the first paint already lands on the right item. `#scrollToChoice` now measures via `getBoundingClientRect` instead of `offsetTop/Left`, so nested transforms and shadow layouts no longer offset the math.
- `fig-chooser` nav buttons: replaced the linear-gradient fades with solid `var(--figma-color-bg)` backgrounds + a 1px `box-shadow` border on the leading/trailing edge (top/bottom for vertical, left/right for horizontal). No more hover-only border flash.
- `fig-lab` `fig-canvas-control`: angle, second-point, and non-color handles now explicitly set `type="canvas"` so they pick up the new shared styling.
- Propkit Chooser "Style" example: switched the inline `fig-image` tiles from `size="auto"` to `size="small"` for a tighter, consistent thumbnail row.

### Fixed

- `components.css`: invalid `gap: var(--spacer-1),0.25rem;` on `fig-select > button` (stray comma + extra value) reverted to `gap: var(--spacer-1);`.
- `fig-select`: closed-state padding now reserves room for the chevron (`0 var(--spacer-4) 0 var(--spacer-2)`) so long values no longer collide with the icon.
- `fig-select` customized-button with a leading `<svg>`: icon now hangs into the left padding via negative `margin-left` instead of removing the padding, keeping text alignment consistent across icon/no-icon buttons.

## [4.10.2]

### Added

- `/propkit` Chooser: new "Gradients" example showcasing four distinct gradient styles (Sunset Glow, Aurora, Bubblegum hard-stops, Holographic 5-stop iridescence) using `fig-input-gradient` with `edit="false"` and `disabled`.

## [4.10.1]

### Added

- `fig-media-controls`: bidirectional sync with parent `fig-media`/`fig-video` is now robust during scrubbing — uses a pending-seek guard so the slider doesn't snap back while the browser settles on a seek target. Adds a `seeked` listener so loop restarts immediately reset the scrubber to 0.
- Native `<select multiple>` example in the `/figui3` Native elements group.
- Checkbox group + disabled checkbox examples in `/figui3`.
- Attribute rules: `checked` switch added to the Attributes panel for `fig-checkbox` and `fig-radio`.

### Changed

- `fig-media-controls`: slider updates are now applied via `setAttribute("value", …)` so `FigSlider`'s interacting-guard keeps the user's drag stable.

### Fixed

- Playground description rendering: section/example names containing HTML-like tokens (e.g. `<select>`) are now escaped before being injected via `dangerouslySetInnerHTML`, preventing a stray native `<select>` from appearing inside the description paragraph.

## [4.10.0]

### Added

- `<fig-media-controls>`: new standalone playback controls element. Renders a play/pause button (with `--icon-play`/`--icon-pause` mask icons), a `fig-slider` scrubber, and a `MM:SS` time display. Holds its own state via `playing` (boolean presence), `duration`, and `time` (number, seconds) attributes/properties. Emits `play`, `pause`, and `seek` events. Supports an `overlay` attribute to render as a bottom overlay over media.
- `--icon-play` and `--icon-pause` design tokens (matching the `data:image/svg+xml` URL format used by the other `--icon-*` tokens).

### Changed

- `fig-media`/`fig-video`: native `<video controls>` chrome is now always suppressed. When the host's `controls` attribute is enabled (or a user places a `<fig-media-controls>` child), the host wires it up bidirectionally — video → controls for `playing`/`duration`/`time`/`seeked`/loop reset, controls → video for `play`/`pause`/`seek`. Auto-generated controls get `overlay` by default.
- `fig-media` now exposes a `mediaEl` getter and `play()`/`pause()`/`toggle()` methods.

### Fixed

- `fig-input-palette`: restored the `disabled !== "false"` guard in the add-button click handler that had been accidentally removed (the dangling `&&` was throwing a SyntaxError and breaking the whole class).
- `--icon-play` / `--icon-pause` tokens: replaced raw inline `<svg>` values with proper `url("data:image/svg+xml,...")` strings so they actually work as mask images.

## [4.9.1]

### Fixed

- `fig-media`, `fig-image`, `fig-video`: `fit="cover"` and other `object-fit` values now correctly apply to the inner `<video>`/`<img>` elements. The cover selector was missing the `>` child combinator and only targeted the generated class, so the rule never matched `<video>`. Inner media now sizes via `width/height: 100%` instead of `min-*` + `auto`, so `cover`, `fill`, and friends all render as expected.

### Changed

- `fig-media`, `fig-image`, `fig-video`: default `aspect-ratio` is now `4/3` (both in CSS and in the connectedCallback) so media elements have a sensible aspect ratio out of the box when no `aspect-ratio` attribute is set.
- `fig-media`: removed the `type` attribute from the playground attributes panel (type is determined by the example markup, not toggled at runtime).

## [4.9.0]

### Changed

- `fig-input-palette`: layout reworked to a 2-row grid. Row 1: inline palette + add button (right-aligned). Row 2: expanded color list spans the full width. When `add="false"`, the inline palette spans both columns.
- `fig-input-palette`: expanded `fig-input-color` rows no longer expose alpha (`alpha="false"`) — alpha editing is still available in the inline pickers.
- `fig-input-gradient`: dropped hardcoded `size="medium"` on the chit so it inherits the default chit sizing.
- `fig-input-gradient`: stop and ghost handles now use `size="small"` to match Figma's compact gradient affordances.

## [4.8.3]

### Fixed

- Safari: `fig-dialog` and `fig-toast` no longer throw `Cannot access invalid private field` / `Cannot access private method` errors when running through the customized built-in polyfill. The polyfill prototype-swaps existing nodes without invoking the constructor, so all `#privateField` members in `FigDialog` and `FigToast` were converted to underscore-prefixed (`_name`) members and initialized via an idempotent `_figInit()` that runs from both the constructor and lifecycle callbacks.
- `fig-dialog`: merged duplicate `static get observedAttributes()` and `attributeChangedCallback()` declarations. The second pair was overriding the first, so `autoresize` was never actually observed.

### Changed

- Playground `/propkit` "Plugin" iframe page: load the Inter font from Google Fonts so the iframe content matches the figui3 system font.

## [4.8.2]

### Fixed

- `fig-color-tip`: `selected` attribute now correctly toggles off when the fill picker dialog closes. Replaced the brittle `document.querySelector(".fig-fill-picker-dialog[open]")` watcher with a `MutationObserver` on the inner `fig-chit`'s `selected` attribute, mirroring its state to the host.

## [4.8.1]

### Changed

- Playground `/propkit` "Plugin" iframe page: removed unused IBM Plex Mono Google Fonts stylesheet and a redundant `flex: 1 1 auto` on `body > fig-content`.

## [4.8.0]

### Added

- `fig-dialog[autoresize]`: when a `<fig-content>` is a direct child, it becomes the scroll region (`flex: 1 1 auto; overflow: auto; overscroll-behavior: contain`). The dialog itself sizes to content via `height: max-content` and is capped by the base `dialog` `max-height`. `fig-header` and `fig-footer` siblings remain pinned naturally without `position: sticky` (no rubber-band bounce).

### Changed

- `fig-dialog` autoresize: replaced JS-driven content-height measurement with pure CSS (`height: max-content`). JS only clears stale inline heights now; iframe `postMessage` sizing path is unchanged.
- `dialog` base styles: removed the unused `&[tooltip]` block (legacy attribute-style tooltip styling that was superseded by `dialog[is="fig-popup"][variant="tooltip"]`).
- Playground `/propkit` "Plugin" iframe page: scroll moved from `body` to `body > fig-content`; `fig-footer` is no longer `position: sticky` (flex layout pins it naturally).
- Playground `figui3` Dialog example: wraps content in `<fig-content>` with longer prose so scroll behavior is visible.

## [4.7.1]

### Changed

- Playground `/propkit` "Plugin" iframe page: merged the `.plugin-body` flex/scroll rules into the `body` element directly, eliminating the wrapper div so the footer stays pinned via `margin-top: auto` and content scrolls within body.

## [4.7.0]

### Added

- `fig-dialog`: listens for `{ type: "figui:iframe-resize", height, width }` `postMessage` events from a descendant iframe and resizes itself to fit the broadcasted content, accounting for header/footer/padding chrome. Pairs with the new `dialog` `max-height: calc(100vh - var(--spacer-4))` so dialogs grow up to the viewport and stop there.
- Playground `/propkit` "Plugin" example: iframe page broadcasts its natural content size (`scrollHeight` of scrollable regions + rendered footer height) on load, on DOM mutations, on font readiness, and on any descendant `ResizeObserver` change so dialog stays in sync.

### Changed

- `dialog` base styles: added `max-height: calc(100vh - var(--spacer-4))` so dialogs never overflow the viewport.
- `fig-dialog`: cleans up the iframe `message` listener on disconnect.
- Playground "Plugin" example: iframe `src` is now relative (`/propkit/iframe.html`) so the example always loads the locally deployed version of the iframe page.

## [4.6.1]

### Changed

- Playground "Plugin" dialog example: iframe now points to the absolute `https://rog.ie/propkit/iframe.html` URL so the example works outside the dev playground.

## [4.6.0]

### Added

- `fig-media`: new unified media host component supporting `type="image"` and `type="video"` with shared sizing (`size`, `aspect-ratio`, `fit`), `upload` overlay, and video attributes (`controls`, `autoplay`, `loop`, `muted`, `poster`).
- `fig-video`: new video component built on the media host with playback attributes and optional upload overlay.
- `fig-image`: added `alt` attribute, `size` token sizing, and updated default sizing model (host shrinkwraps to intrinsic image size).
- Base styles: added default `iframe` rules so iframes flex naturally inside dialogs and other flex containers.
- Playground (`/propkit`): new "Plugin" example under "Controls in dialogs" hosting plugin UI inside an iframe (`/propkit/iframe.html`) with parent/child resize broadcasting.
- Playground (`/propkit`): new "Media" field example demonstrating `fig-media` inside a `fig-field` row.
- Playground (`/figui3`): added Image, Media, and Video sections with examples covering image, video, poster, and upload modes.
- Playground attributes panel: added rules for `fig-media` and `fig-video` (type, fit, upload, checkerboard, controls, autoplay, loop, muted, poster).

### Changed

- `fig-image`: rewritten as a thin wrapper over the new media host. Renders a real `<img>` inside the element; `getBase64()` now uses the inner `<img>` element directly (requires CORS-clean source).
- `dialog`: `dialog[open]` now uses `display: flex; flex-direction: column;` so dialog contents (including iframes) can flex correctly. Removed the old `fig-header` / `fig-footer` margin rules in `fig-dialog` in favor of in-dialog layout.
- `fig-segment`: option labels are now `text-transform: capitalize` for consistency with segmented control styling.
- Playground routing: trailing slashes in `/figui3`, `/propkit`, `/propkit/lab`, and `/sandbox` paths are normalized so `mode` resolution and base path matching no longer break for `/propkit/` style URLs.
- Playground attribute resolver: enum option matching now normalizes whitespace and `/` separators so values like `16 / 9` resolve correctly against `16/9`-style options.

### Fixed

- `fig-image` / `fig-media` / `fig-video`: chit placeholder is now properly hidden when a real media source (or video poster) is present, and shown when the source is empty.
- Playground: `fig-image` upload overlay defaults are no longer accidentally toggled when controlling other attributes.

## [4.5.3]

### Fixed

- Playground routing: `/propkit/lab` is now the canonical Lab route, with automatic migration from legacy `/lab` URLs.

### Changed

- `fig-field-slider` lab styling now applies horizontal layout styles to `fig-field[direction="horizontal"]` and adds focus-visible container treatment.

## [4.5.2]

### Changed

- Playground: section list now has vertical padding only for ungrouped lists, while grouped (`fig-group`) lists remain flush.

## [4.5.1]

### Fixed

- `fig-options`: now captures internal `fig-segmented-control` / `fig-dropdown` events and re-emits normalized `input` and `change` events from `fig-options`.
- `fig-options`: dropdown mode no longer propagates undefined event detail values; emitted event payloads now keep consistent string value shape.

### Changed

- `fig-input-color`: removed `localStorage` persistence for color input mode from `fig.js`.

### Added

- Playground `/propkit` Event output now shows both control `value` and raw `event.detail` (plus detail type) for easier event-shape debugging.

## [4.5.0]

### Fixed

- `fig-input-number`: `units="px"` no longer renders disallowed units by default.

### Added

- `fig-input-number`: new `units-disallow` attribute with comma-separated unit filtering support in component docs and playground attribute controls.

### Changed

- `fig-input-number`: disallowed units are now ignored even when explicitly provided via `units`; default disallow list now includes `"px"`.
- Playground/dev setup: refreshed dependency lockfiles and launcher wiring for local playground dev startup.

## [4.4.4]

### Fixed

- `fig-input-palette`: expand/collapse no longer causes a flash — toggling `open` now skips unnecessary DOM re-render since CSS handles visibility.

### Changed

- `fig-field`: label gap uses margin instead of padding for more consistent spacing behavior.

## [4.4.3]

### Fixed

- `fig-field`: only-child grid spanning now correctly covers `input1 + gap + input2` columns in label-less horizontal fields.

### Changed

- Playground: added File Input example to FigUI3 tab, removed standalone Angle Input example, set default dev port to 6600.

## [4.4.2]

### Fixed

- `fig-menu`: Hide direct `fig-menu-item` and `fig-menu-separator` children via CSS so items don't flash before JS moves them into the popup.
- `fig-menu`: Detect late-arriving trigger elements (e.g. React rendering children after `connectedCallback`) via MutationObserver, wiring up click listener and popup anchor when the trigger appears.

## [4.4.1]

### Fixed

- Rebuild dist bundle — `dist/fig.css` and `dist/fig.js` now include all recent component additions (fig-menu, presentational elements, etc.).

## [4.4.0]

### Fixed

- `fig-tooltip`: no longer lingers after dialog close; clears pending show timeout in `disconnectedCallback` and bails from `showPopup` when parent dialog is closed.
- `fig-tabs`: single-click tab activation now works correctly; fixed `#selectByValue("")` deselecting all tabs when tabs use `content` attribute instead of `value`.
- `fig-tabs`: click targeting uses `closest("fig-tab")` for reliable hit detection on child elements.
- `fig-tabs`: keyboard navigation now properly sets `selected` attribute on the new tab.

### Added

- `fig-tabs`: `disabled` attribute fully disables all tab interaction with visual feedback.
- `fig-tabs` / `fig-tab-content`: full-width by default (`width: 100%`).
- `fig-palette`: expanded view uses named grid columns with `:has()` for flexible layout with/without remove buttons.

### Changed

- Playground: Tabs example expanded with tabbed content panels; Prepress "Apply To" uses `fig-options`.

## [4.3.0]

### Added

- `fig-options`: supports newline-delimited and JSON array formats for the `options` attribute, enabling values that contain commas.
- `fig-palette`: remove button (ghost variant, minus icon) on each color in expanded view; respects `min` attribute to prevent removal below minimum count.

## [4.2.0]

### Added

- `fig-footer`: new component mirroring `fig-header` with top border, `borderless` and `sticky` attribute support.
- `fig-dialog`: `resizable` attribute allows user-resizable dialogs (off by default).
- `fig-dialog`: auto-generates `fig-header` with title and close button when `title` attribute is set and no header exists.
- `fig-segmented-control`: label truncation with ellipsis when segments overflow available space.
- `fig-field`: refactored to CSS grid layout for more consistent label/input alignment.

### Fixed

- `fig-slider`: no longer forces parent dialogs wider than other controls; intrinsic width now matches `fig-input-number` and `fig-input-color` in grid layouts.
- `fig-slider`: consolidated duplicated range input styles and orphaned CSS blocks.
- `fig-tab`: removed dead `:has(:checked)` and `[type="radio"]` CSS rules.
- `input[type="checkbox"].switch`: nested pseudo-class rules for cleaner stylesheet structure.

### Changed

- Dialog footer elements in propkit examples converted from `<footer>` to `<fig-footer>`.
- Radio group example in `/figui3` now wraps each radio in its own `fig-field` with label passed via attribute.

## [4.1.4]

### Fixed

- `fig-image`: upload preview now works correctly by ignoring bubbled native input change events.
- `fig-image`: prevent re-entrant clear event from wiping uploaded image source.

### Changed

- `fig-image`: default `--fit` changed from `cover` to `contain`.

## [4.1.3]

### Added

- `fig-menu`: playground attribute controls for position, offset, closed-by, disabled, and open.
- `fig-menu`: `disabled` attribute now forwards to the trigger element.

## [4.1.2]

### Added

- `fig-menu`: new context menu component with trigger detection, keyboard navigation (arrow keys, Home/End, Enter/Space), ARIA roles, `position`/`offset`/`closedby` forwarding, `open` attribute, and `change` event with `{ value, item }` detail.
- `fig-menu-item`: menu item element with `value` attribute and `disabled` support.
- `fig-menu-separator`: visual divider between menu item groups.
- Playground: added Menu examples (default + disabled items) to `/figui3` Core components.
- Playground: EventView now serializes DOM elements in event output instead of showing `{}`.

### Fixed

- `fig-button`: SVG fill selector now excludes `fill="none"` to prevent overriding transparent fills.
- `fig-chooser`: fixed spacing with CSS custom property `--fig-chooser-gap`, updated choice padding and selection ring width.
- `fig-layer`: removed extra margin-left on layer rows, adjusted padding and chevron position.
- Playground: EventView now shown for Menu section in `/figui3`.

## [4.1.1]

### Changed

- Playground: added "Native elements" group to `/figui3` with 12 styled HTML element examples (button, select, inputs, textarea, checkbox, switch, radio, color, fieldset, details, hr).
- Playground: refactored nav to use collapsible `fig-group` wrappers instead of `.nav-group-header` elements.
- `details`: improved styling with padding, full width, and adjusted summary alignment.

## [4.1.0]

### Fixed

- `fig-combo-input`: rewrote to meet component standards — now emits `input`/`change` events, wires text input changes, uses private methods, synchronous render, proper cleanup in `disconnectedCallback`.

### Changed

- `fig-input-fill`: gradient angle picker replaced with `fig-input-number` (removed internal dependency on `fig-input-angle`).
- `fig-combo-input`: added `fig-combo-input` CSS display rule for proper flex layout participation.
- Playground: moved `fig-canvas-control` and `fig-input-angle` to experimental `/lab` route (`fig-lab.js`/`fig-lab.css`).
- Playground: moved `fig-handle` example from `/propkit` to `/figui3` under Utilities group.
- Playground: added Radio "Group" and "Disabled" examples in `/figui3`.

## [4.0.0]

### Breaking Changes

- `fig-image`: removed `download` attribute and internal `<div>` wrapper. Upload overlay now uses `fig-input-file` instead of native `<input>` inside `fig-button`.
- `fig-image`: `loaded` event detail changed from `{ blob, base64 }` to `{ file, src }`. Use the new `async getBase64()` method if base64 is needed.
- `fig-image`: no longer auto-generates blob URLs or base64 on every load. Component is now synchronous on connect.

### Added

- `fig-image`: `async getBase64()` method for on-demand base64 conversion.
- `fig-image`: `file` getter to access the raw uploaded File object.
- `fig-image`: preserves user-provided children (no more innerHTML wipe). Supports composable overlays.
- `fig-image`: `aspect-ratio="auto"` uses `createImageBitmap` for fast, lazy dimension detection.
- `fig-image`: auto-generated `fig-input-file` shows "Replace" label when an image is already set.
- `fig-input-file`: `variant` attribute passthrough to internal `fig-button` (default "input").
- `fig-input-file`: `url` attribute for display-only file state (extracts filename from URL, no network request).
- Playground: "Plain" and "Custom Buttons" image examples in /propkit.

### Changed

- `fig-image` CSS: hover-reveal now targets `fig-input-file[data-generated]` instead of `> div`.

## [3.23.0]

### Added

- `fig-input-file`: file upload input with filename display, clear button, accepts tooltip, drag-and-drop, and multiple file support.
- `fig-truncate`: text truncation utility with `position` (right/left/middle), `tail` preservation, and overflow `tooltip`.
- `fig-field`: auto-detects toggleable children (elements with `open` property) and injects an expand/collapse chevron.
- Playground: File examples in /propkit, Truncate examples under Utilities group in /figui3.

### Changed

- Playground EventView now serializes File objects (name, size, type) instead of empty objects.
- Playground text input fields re-sync correctly when navigating between examples.

## [3.22.0]

### Changed

- Standardized collapse/expand pattern across `fig-layer`, `fig-group`, and `fig-input-palette`: all use `open` attribute and emit `openchange` event.
- `fig-group`: replaced `collapse` attribute with `collapsible` (presence boolean) + `open` for state.
- `fig-input-palette`: replaced `expanded` attribute with `open`; added public `open` getter/setter and `openchange` event.
- `fig-input-color` and `fig-input-fill`: text input now shown by default (unless `text="false"`).
- Removed `color-strip` attribute from `fig-input-palette`.

### Added

- `fig-field`: auto-detects toggleable children (elements with an `open` property) and injects a chevron for expand/collapse toggle via label click.
- Playground: palette field added to collapsible group example.

## [3.21.2]

### Fixed

- `fig-input-gradient` now always renders as a horizontal linear gradient at 90 degrees, regardless of the incoming gradient type (angular, radial, etc.) — preserves interpolationSpace, hueInterpolation, and stops.
- `fig-color-tip` now preserves alpha when opening — extracts alpha from 8-char hex (`#RRGGBBAA`) and rgba strings, passing opacity to the fill picker's initial value.
- `fig-color-tip` `#syncFromAttributes` no longer strips alpha when re-setting the fill picker value.
- `fig-fill-picker` gradient stops list color input reads opacity from `e.detail.rgba.a` instead of the `alpha` HTML attribute.
- `fig-input-fill` gradient opacity input no longer overrides individual stop opacities.

### Changed

- Playground: `fig-switch` attributes view now includes Checked, Indeterminate, and Disabled toggles.
- Playground: `fig-input-gradient` default example updated to 3 stops with a semi-transparent middle stop.

## [3.21.1]

### Fixed

- `fig-handle` type="color" now renders transparent colors — `#colorWithOpacity` converts hex + opacity to rgba for `--fill`, and events forward opacity from `fig-color-tip`.
- `fig-color-tip` now derives opacity from `detail.alpha` when `detail.opacity` is absent, fixing the disconnect between `fig-fill-picker` (which emits alpha 0-1) and the color tip (which expected opacity 0-100).
- `fig-handle` checkerboard behind color swatch — `::after` uses `linear-gradient(var(--fill), var(--fill)), var(--checkerboard)` so transparency is visible.
- `fig-chit` solid color backgrounds now wrapped as `linear-gradient(color, color)` internally, enabling correct CSS layering with checkerboard for transparent colors.
- `fig-input-gradient` MutationObserver no longer stores rgba strings back into stop data — skips non-hex color attribute values, preventing `figHexToRGB` NaN errors.
- `fig-input-gradient` stop handles now display opacity via rgba color strings (`#stopColorCSS`) instead of a separate alpha attribute.
- `fig-input-fill` gradient opacity input no longer overrides individual stop opacities — each gradient stop manages its own opacity independently.
- `fig-fill-picker` gradient stops list color input now reads `e.detail.rgba.a` for opacity instead of the `alpha` HTML attribute, which returned `"true"` instead of a numeric value.

### Added

- `fig-swatch` element as an alias for `fig-chit`.

## [3.21.0]

### Added

- `fig-input-gradient` `edit` attribute with three modes: `"true"` (default, full inline editing), `"false"` (display-only chit), and `"picker"` (opens fill picker dialog locked to gradient tab).
- `fig-input-gradient` now supports color interpolation spaces — `#buildGradientCSS` includes the interpolation clause (`in oklab`, `in oklch shorter hue`, etc.) for correct gradient rendering.
- `fig-input-gradient` color sampling (`#sampleGradientColor`) now uses the correct interpolation space and hue mode when adding stops, instead of basic sRGB canvas sampling.
- Shared color math utilities: `figSampleGradientAt`, `figRGBToOklab`, `figOklabToRGB`, `figOklabToOklch`, `figOklchToOklab`, `figInterpolateHue` for accurate color interpolation across OKLab, OKLCH, and sRGB-linear spaces.
- `fig-input-palette` `color-strip` toggle in playground attributes view.

### Changed

- Fill picker gradient tab now uses an embedded `fig-input-gradient edit="true" size="large"` for visual stop editing, replacing the static gradient bar div.
- Fill picker gradient stops list updates in-place when stop count is unchanged, preventing flash/flicker during drag interactions.
- `fig-fill-picker` `#buildGradientCSS` now defaults gradient stop opacity to 100 when undefined, preventing invisible gradients.
- Playground gradient example in `/figui3` now includes `opacity` and `angle` in the gradient value for correct rendering.

## [3.20.3]

### Fixed

- `fig-input-gradient` click-to-add no longer creates duplicate stops — the pointerdown handler now stops propagation to prevent the click handler from firing a second add.
- `fig-input-gradient` click-to-add now correctly selects the new stop — the original pointerdown event no longer bubbles to document where the new handle's deselect listener would immediately undo the selection.
- `fig-input-gradient` color-tip input/change events no longer trigger the drag tooltip — color events are now handled separately from position drag events on the track.

### Changed

- `fig-input-gradient` stop handles now have `hit-area="4"` for easier interaction.
- `fig-input-gradient` ghost handle uses native `control="add"` and `type="color"` on `fig-handle` instead of manually creating a `fig-color-tip` element.
- `fig-handle` `control` attribute and color tip rendering now works on gradient ghost handles (removed `#isGhost` exclusion).

## [3.20.2]

### Fixed

- `fig-input-color` events now include `{ value, hex, rgba }` detail.
- `fig-input-angle` events now include `{ value, angle }` detail.
- `fig-joystick` events now include `{ value, x, y }` detail.
- `fig-input-text` and `fig-input-number` mouse-drag events now include `{ detail: value }` (previously missing).
- Playground event output panel now handles primitive event details (strings, numbers) by wrapping them in `{ value }`.

### Changed

- Playground: number example defaults to steppers on, multiline text example defaults to autoresize on.
- Playground: event output hidden for skeleton example (no interactive controls).

## [3.20.1]

### Fixed

- `fig-input-text` and `fig-input-number` now correctly update the inner element's placeholder when the `placeholder` attribute changes, and no longer show literal `"null"` when the attribute is removed.

### Changed

- Multiline text input example in `/figui3` now starts empty with placeholder only.

## [3.20.0]

### Added

- `fig-tooltip` `theme` attribute — applies a color scheme to the tooltip popup (`"dark"`, `"light"`, or `"brand"`). Brand theme uses `--figma-color-bg-brand` background.
- `fig-tooltip` `pointer` attribute — set `pointer="false"` to hide the tooltip arrow/caret.
- `fig-handle` drag threshold — a 3px movement threshold before a drag begins, preventing accidental drags on click.
- `fig-handle` color change events — color handle `input` and `change` events now bubble with `{ color }` detail, so parent components (like `fig-canvas-control`) can react to color edits.
- `fig-canvas-control` color value — `value` getter now includes `color` for `type="color"` controls.
- `fig-canvas-control` brand-themed tooltips with hidden pointers for a cleaner look during drag.
- `fig-canvas-control` tooltip text now prefixed with labels ("Radius", "Angle") for clarity.
- Playground event output panel — `/propkit` examples now show a live event output view in the attributes sidebar.
- Playground `fig-tooltip` attribute controls for `theme` and `pointer`.

### Changed

- `fig-tooltip` default colors now use `light-dark()` for proper light/dark mode support and `color-scheme: dark` base.
- `fig-tooltip` box-shadow inner highlight adapts to light/dark mode via `light-dark()`.
- `fig-canvas-control` line stroke color uses `light-dark()` for better light-mode visibility.
- `fig-canvas-control` line stroke width reduced from 1.5px to 1.25px.
- `fig-canvas-control` handle positioning switched from `value` attribute to direct `left`/`top` pixel placement for smoother updates.
- `fig-canvas-control` dynamic cursor updates throttled to avoid redundant re-renders (only updates when rounded degree changes).
- `fig-canvas-control` point-radius default changed from percentage to pixel radius in playground examples.
- `readBooleanValue` in playground now respects `falseValue` for custom bool modes.
- Playground uses `Fragment` instead of wrapper `div` around attribute panels.

## [3.19.0]

### Added

- `fig-canvas-control` `type="point-point"` — two full-size handles connected by a styled line, with angle and length inferred from the endpoints. Value shape: `{ x, y, x2, y2 }`.
- `fig-canvas-control` `name` attribute supports comma-separated labels (e.g. `"Start, End"`) for dual-handle types.
- `fig-canvas-control` point-point handles support direct drag (dynamic directional resize cursor) and rotation via hit area (dragging from hit area rotates around the opposite handle at fixed distance, with rotate cursor and 15-degree snapping).

### Changed

- **BREAKING:** Renamed `fig-canvas-point` to `fig-canvas-control` (and class `FigCanvasPoint` to `FigCanvasControl`).

## [3.18.0]

### Added

- `fig-canvas-control` component — a spatial control for interactive point, radius, and angle editing on a user-provided canvas surface. Supports `type` variants: default (point only), `color` (color handle), `point-radius` (resizable circle), and `point-radius-angle` (circle + rotatable angle handle). Value is a JSON object (`{ x, y, radius?, angle? }`). Includes `name`, `tooltips`, `disabled`, `snapping`, `drag-surface`, and `color` attributes.
- `fig-handle` `hit-area` attribute — expands the interactive zone around a handle without changing its visual size. Accepts a unitless px padding value, optionally with `circle` keyword (e.g., `hit-area="16"`, `hit-area="16 circle"`).
- `fig-handle` `hit-area-mode` attribute — controls hit area behavior: `"handle"` (default) proxies interactions to the handle, `"delegate"` emits a `hitareadown` CustomEvent for parent components to define custom behavior.
- `--fig-handle-hit-area-opacity` CSS custom property for debugging hit area bounds (red overlay, default `0`).
- `fig-canvas-control` dynamic cursors — radius ring shows a directional resize cursor that rotates to point radially from center on hover and during drag; angle handle hit area shows a rotating cursor reflecting the current angle.
- `fig-canvas-control` brand color highlight — radius ring, angle line, and angle handle turn `--figma-color-bg-brand` on hover and during drag.
- `fig-canvas-control` radius ring hit area — invisible 12px-wide stroke for forgiving drag interaction without changing visual size.
- Playground `/propkit` canvas controls: four `fig-canvas-control` examples (Point, Color, Point + Radius, Point + Radius + Angle) replacing the old standalone Point example.
- Playground `fig-handle` hit area controls: size slider, shape segmented control, mode segmented control, and debug opacity slider.
- `fig-canvas-control` and `fig-handle` hit area documented in README.

### Changed

- `fig-handle` drag from hit area now calculates initial pointer-to-center offset to prevent drag jumps.

## [3.17.0]

### Added

- `fig-input-gradient` drag-to-add — pointerdown on empty track space creates a new stop and immediately begins dragging it.
- CSS minification via lightningcss — `npm run build` now produces minified CSS alongside minified JS in `dist/`.
- `npm run build:css` script for standalone CSS minification.
- Unminified source exports via `@rogieking/figui3/src/*` for debugging.
- README restructured with component index table, domain-grouped sections, per-component event documentation, and playground links.
- 10 previously undocumented components added to README: field-slider, input-palette, easing-curve, 3d-rotate, origin-grid, skeleton, color-tip, choice, chooser, handle.

### Changed

- Default package exports (`main`, `module`, `exports`) now point to minified `dist/` files instead of unminified source.
- CDN URLs updated to reference `dist/` paths.
- `figGetHighestZIndex` replaced with a monotonic counter — eliminates O(n) full DOM scan on every tooltip/popup open.
- Shared reusable canvas for color normalization — `FigInputGradient`, `FigChit`, and `FigColorTip` no longer create throwaway canvases.
- Gradient CSS support test results are now cached across `FigFillPicker` instances.
- `FigHandle` drag path reduces redundant `getBoundingClientRect` calls by reusing the rect from clamp computation.
- Deduplicated `#syncAspectRatioVar`, `#syncPerspectiveVar`, and `#syncCSSVar` into shared `figSyncCssVar` helper across `FigEasingCurve`, `Fig3DRotate`, `FigOriginGrid`, and `FigInputJoystick`.

### Fixed

- Event listener leaks — `FigTooltip`, `FigTab`, `FigTabs`, `FigSegment`, `FigDialog`, `FigToast`, `FigDropdown`, and `FigInputAngle` now store bound listener references and correctly remove them in `disconnectedCallback`.
- `FigDropdown` was missing `disconnectedCallback` entirely — added cleanup for slotchange, input, and change listeners.
- `FigFillPicker` resource leaks — MutationObservers (`#dialogOpenObserver`, `#webcamTabObserver`) are now disconnected, webcam MediaStream tracks are stopped, and video blob URLs are revoked on disconnect.
- `FigInputGradient` resource leaks — `#colorObserver` is disconnected, tooltip timer is cleared, and track event listeners are removed on disconnect.
- Duplicate CSS declarations removed: button `color`, tab `content`, color swatch `color-scheme`/`border-radius`, chit pseudo-element sizing, segmented control `display`, switch `margin`, field `flex`, joystick crosshair `height`, 3D rotate `--border-end-color`.
- Merged duplicate `&:active` blocks inside button `&:hover`.
- Removed empty `&[expanded]` ruleset.

## [3.16.0]

### Added

- `fig-input-color` `disabled` attribute support — propagates disabled state to hex input, alpha input, fill picker, and chit.
- `fig-input-fill` `#syncDisabled()` — updates child controls in-place instead of full re-render on disabled change.
- `fig-input-palette` `add` attribute — set `add="false"` to hide the add-color button.
- `fig-input-palette` dual-render layout with inline chit strip and expanded color rows always present in DOM, toggled via CSS.
- `fig-chooser` scroll-snap support (`scroll-snap-type: y mandatory`) for smooth item alignment.
- `fig-chooser` `padding="false"` attribute — removes internal padding and widens gap for edge-to-edge choice layouts.
- `fig-choice` `padding="false"` attribute — zeroes choice padding via `--fig-choice-padding` CSS var.
- `fig-choice` border-radius now derives from `--fig-choice-padding` for consistent inset ring appearance.
- Disabled toggle in playground attributes for `fig-input-color`, `fig-input-gradient`, and `fig-input-palette`.
- Padding toggle in playground attributes for `fig-chooser`.
- `/propkit` nav group headers — sections are now grouped under labelled categories (Field controls, Composite controls, etc.).
- `/propkit` overhauled sections with new Chooser examples (text, images, images + labels, colors) and consolidated field control catalog.
- `data-playground-hide-field` attribute — hides the Field controls panel in the attributes sidebar for specific examples.
- Playground `data-playground-*` attribute preservation during markup merge for roundtrip editing fidelity.

### Changed

- `fig-chit` disabled selector tightened to `:not([disabled="false"])` to support explicit opt-out.
- `fig-input-palette` layout switched from CSS grid to flex column with separate `.palette-colors-inline` and `.palette-colors-expanded` containers.
- `fig-input-color` hover state now shows a subtle border outline.
- `fig-easing-curve` duration bar width increased from 5 to 7 with radius from 3 to 4.
- `fig-easing-curve` removed nested `fig-handle` sizing rules from `.fig-easing-curve-handle` (handled by component defaults).
- `fig-choice` selection ring width increased from 1px to 1.25px.
- `fig-chooser` overflow changed from `hidden auto` to `visible auto`.
- `/propkit` sections reorganized alphabetically with group labels; removed standalone Handle section from `/figui3`.
- Removed chooser content mode switcher from attributes sidebar (replaced by separate per-content-type examples).
- Playground CSS formatting cleanup (whitespace normalization in App.css).

### Fixed

- `fig-input-fill` disabled attribute change no longer triggers a full re-render — uses targeted `#syncDisabled()` instead.
- `fig-input-palette` expanded state CSS scoping now correctly targets `.palette-colors-expanded` container.

## [3.15.0]

### Added

- `fig-input-color` `text` attribute is now observed and triggers UI rebuild, enabling runtime toggle of hex input visibility.
- `fig-input-palette` `expanded` attribute for vertical layout with text and alpha inputs per color.
- `fig-input-palette` incremental add — clicking "Add color" appends without re-rendering existing pickers.
- `fig-input-palette` wraps color pickers in a `.palette-colors` div, separating them from the add button.
- `/propkit` Expanded toggle for palette attributes panel.
- `/propkit` Minimal palette example with two colors.
- `/propkit` Skeleton example (moved from `/figui3`).
- `/figui3` Fill segmented control (Solid/Gradient) for chit example.
- `/figui3` Text toggle for `fig-input-color` attributes panel.
- `fig-field[direction="horizontal"]:has(> fig-input-palette)` padding rule for proper field alignment.

### Changed

- `fig-input-palette` uses `fig-input-color` instead of `fig-fill-picker` for each color swatch.
- `fig-input-palette` add button is now a ghost icon button with tooltip in all states.
- `fig-input-palette` layout uses CSS grid (`inputs` + `button` areas) instead of inline-flex.
- `fig-chit` reworked selection ring: moved from `::before` box-shadow to element-level `box-shadow` for correct stacking.
- `fig-chit` swapped `::before` / `::after` roles: `::before` now renders the color/gradient fill, `::after` renders the border overlay with `z-index: 1`.
- `fig-chit` `::before`/`::after` sizing now respects `--padding` for inset thumbnails at all sizes.
- `fig-input-gradient` scoped chit selector to direct child (`> fig-chit`).
- `/propkit` Palette attributes panel header renamed from "Input-palette" to "Palette".
- Exclude `src` attribute from playground URL parameter serialization.

### Fixed

- `fig-chit` selected ring was invisible due to overlapping box-shadow spreads on `::before`.
- `fig-chit` checkerboard background now targets `::after` to match the reworked pseudo-element roles.
- `fig-input-color` `text="false"` now properly hides hex input (strict `=== "true"` check).

## [3.14.1]

### Added

- `fig-handle` `select()` and `deselect()` public API methods for programmatic selection with color tip management.
- `fig-handle` `showColorTip()` and `hideColorTip()` public API methods to toggle color tip visibility without destroy/recreate.
- `fig-input-gradient` Tab/Shift+Tab cycles selection through stop handles with wraparound.
- `fig-input-gradient` Left/Right arrow keys nudge selected stop by 1% (Shift for 10%), with tooltip showing position.
- `fig-handle` auto-selects on drag start if not already selected.

### Fixed

- `fig-tooltip` `destroy()` now nulls `this.popup` reference, fixing tooltip not reappearing on subsequent show/hide cycles.
- `fig-input-gradient` track-level click swallower after drag no longer eats clicks on other handles, fixing intermittent selection failures.
- `fig-input-gradient` hides color tip during drag and arrow key nudge, restoring it when done.

## [3.14.0]

### Added

- `fig-tooltip` `show` attribute — persists the tooltip when present/true, ignoring hover and click interactions. Removing the attribute allows normal hide behavior.
- `fig-tooltip` `text` getter/setter — updates tooltip content in-place without re-rendering the popup. Repositions automatically if open.
- `fig-tooltip` `text` observed attribute — setting via `setAttribute("text", ...)` also updates content without re-render.
- `fig-input-gradient` drag tooltips — each stop handle is wrapped in a `fig-tooltip` that shows the percentage position during drag.
- `fig-handle` `.dragging` class — added during actual drag, removed on pointer up. Not applied on simple click.
- `fig-chit` `medium` size (1.5rem) with full-area swatch style.
- `/figui3` Tooltip playground: action segmented control (hover/click/manual), show switch, and button text updates per action mode.

### Changed

- `fig-tooltip` `show` attribute callback now fires synchronously instead of via `requestAnimationFrame` for immediate persistence.
- `fig-tooltip` `showPopup()` lazily creates the popup if not yet rendered, fixing manual action mode.
- `fig-tooltip` `showPopup()` sets `display: block` before repositioning for accurate dimensions.
- `fig-handle` cursor and `.dragging` class only apply on actual drag movement, not on click.
- `fig-input-gradient` uses `fig-chit size="medium"` instead of `fig-fill-picker` for gradient preview.
- `fig-input-gradient` stop handles use `drag-surface` to target the track container through tooltip wrappers.
- `fig-chit` large size increased to 2rem.
- `/figui3` Handle playground: merged Color and Color tip toggles into single Color toggle.

### Fixed

- `fig-tooltip` crash when calling `showPopup()` on `action="manual"` tooltip (popup was never created).
- `fig-input-gradient` drag tooltip not appearing due to `requestAnimationFrame` race in `show` attribute handler.
- `fig-input-gradient` handle stacking/positioning when wrapped in `fig-tooltip` (`display: contents`).

## [3.13.1]

### Added

- `fig-color-tip` `add` attribute — replaces the internal chit with an add icon and emits an `add` event on click.
- `fig-handle` `add` attribute — shows a `fig-color-tip` in add mode, always visible and not tied to select/deselect.
- `fig-input-gradient` ghost handle now uses `add` mode instead of a tooltip, showing the add icon above the handle on hover.
- Clicking empty gradient track space to add a stop now auto-selects and opens the color tip on the new handle.

### Changed

- `/figui3` Color Tip attributes panel now shows Add toggle at the top; value/color field is hidden when Add is on.
- `/figui3` Handle attributes panel now shows Add toggle; type and color fields are hidden when Add is on.
- `/propkit` Gradient description updated to explain interaction model.

### Fixed

- Removed `contain: layout style` from `fig-handle` color/add mode to prevent drag positioning issues.

## [3.13.0]

### Added

- `fig-handle` `type="color"` attribute — clicking a color-type handle opens a `fig-color-tip` positioned above it; deselecting closes it. Color changes from the tip update the handle's fill.
- `fig-handle` `size="small"` support for compact handles.
- `fig-handle` selection now uses `click` instead of `pointerdown`, so dragging no longer selects.
- `fig-color-tip` `alpha` attribute — defaults to `true`, enabling opacity control in the fill picker. Set `alpha="false"` to disable.
- `fig-color-tip` auto-selects when its picker opens and deselects when the picker dialog closes.
- `fig-input-gradient` stop handles now use `type="color"` with `size="small"`, allowing inline color editing per stop.
- `fig-input-gradient` ghost handle — hovering empty track space shows a preview handle at the cursor position with the interpolated gradient color and an "Add color stop" tooltip. Clicking adds a new stop.
- `fig-tooltip` `action="manual"` mode — skips auto-binding event listeners so `render()`/`showPopup()`/`hidePopup()` can be called programmatically.
- `fig-handle` now supports `drag-snapping` with `false` (default), `modifier` (hold Shift), and `true` (always) modes to snap drag position to edges, center, and diagonals.
- New `fig-color-tip` component for compact solid-color picking, built on `fig-fill-picker` and supporting `value`, `selected`, and `disabled`.
- New `/figui3` Color Tip playground section with default and state examples.

### Changed

- `/figui3` Handle playground example defaults to `type="color"` with a Color toggle in the attributes panel.
- `/figui3` Attributes View now exposes `fig-color-tip` `value` using `fig-input-color` (Figma picker) with alpha enabled, plus `selected`/`disabled` toggles.
- Handle attributes panel shows Size segmented control (Default / Small) and hides Color row when type is not "color".

### Fixed

- `fig-tooltip` positioning inside dialogs with `contain: layout` — tooltip popup now offsets by the container's position so tooltips render correctly inside fill picker dialogs.
- `fig-handle` with `type="color"` no longer repositions on click — only drags move the handle.
- Clicking inside a `fig-color-tip` picker dialog no longer deselects the parent `fig-handle`.
- `fig-input-color` now reacts to `alpha` attribute changes so alpha controls appear/disappear reliably during live attribute updates.

## [3.12.1]

### Added

- CSS `contain` properties across components for reduced layout thrashing and paint invalidation:
  - `contain: strict` on fixed-size controls (switch, checkbox, radio, mask-icon, handle, close icon).
  - `contain: layout paint` on toast, slider track container, segmented control, avatar, and chit.
  - `contain: layout` on dialog/popup/tooltip surfaces and fill picker dialog.
- `fig-handle` example in Propkit playground.

### Changed

- Gradient interpolation UI merged into a single dropdown with optgroups (sRGB / OKLab / OKLCH) and a "Mixing" label, moved below the gradient preview.
- Default gradient example updated to `#7AEA66` → `#FF00BF` at 90°.

## [3.12.0]

### Added

- Color input mode switcher in solid fill picker — dropdown to choose between Hex, RGB, HSL, HSB, LAB (OKLab), and LCH (OKLCH) input modes.
- OKLab/OKLCH reverse conversion utilities (`#oklabToRGB`, `#oklchToRGB`) for bidirectional color editing in perceptual color spaces.
- Tooltips on each color component input (e.g. "Red", "Hue", "Lightness", "Chroma").
- Gamut selector (sRGB / Display P3) in fill picker dialog header, affecting both solid canvas rendering and gradient stop color format.
- Eyedropper button repositioned into `.fig-fill-picker-sliders` grid with "Sample color" tooltip.
- Color input mode preference persisted via localStorage.

### Changed

- Solid fill picker inputs area now uses a `fig-dropdown` + dynamic `input-combo` fields instead of a single `fig-input-color`.
- `.fig-fill-picker-sliders` uses CSS grid layout with eyedropper spanning the left column.
- Sliders no longer wrapped in `fig-field` elements inside `.fig-fill-picker-sliders`.
- Gradient interpolation dropdown trimmed to sRGB Linear, OKLab, and OKLCH (gamut selection moved to top-level header).
- Default gradient `interpolationSpace` changed from `srgb` to `oklab`.
- `experimental` attribute passed through to color input mode dropdown.

## [3.11.0]

### Added

- New `fig-input-gradient` component — a gradient-only fill input that opens `fig-fill-picker` locked to gradient mode.
- Gradient color interpolation support: `interpolationSpace` (`srgb`, `srgb-linear`, `display-p3`, `oklab`, `oklch`) and `hueInterpolation` (`shorter`, `longer`, `increasing`, `decreasing`) for OKLCH.
- `fig-preview` component for displaying gradient bar previews with stop handles.
- Gradient interpolation UI in `fig-fill-picker`: space dropdown and hue interpolation dropdown (shown for OKLCH).
- Playground section and Attributes View support for `fig-input-gradient`.
- README documentation for `fig-input-gradient` and gradient interpolation spaces.

### Fixed

- Fixed gradient CSS interpolation syntax — the `in <color-space>` clause was incorrectly placed as a separate comma-delimited argument instead of within the same argument group as the direction/angle (e.g. `conic-gradient(from 180deg in oklch shorter hue, ...)` instead of the invalid `conic-gradient(in oklch shorter hue, from 180deg, ...)`). This caused browsers to reject the interpolation and silently fall back to sRGB.

### Changed

- `fig-input-fill` and `fig-fill-picker` gradient value shape now includes `interpolationSpace` (and `hueInterpolation` for OKLCH).
- Updated `fig-input-fill` and `fig-input-color` focus/popup-open outline styling with `.has-popup-open` class.
- Refined `fig-input-fill` internal CSS selectors for label/input padding to avoid conflicts with `fig-input-gradient`.

## [3.10.0]

### Added

- `fig-skeleton` component and editor scaffold.

## [3.9.3]

### Changed

- Added `dial` attribute support to `fig-input-angle` (defaults to `true`; `dial="false"` hides the circular dial).
- Renamed `show-rotations` usage to `rotations` for `fig-input-angle` while keeping backward-compatible alias support.
- Added `Dial` and `Rotations` controls to playground Attributes View for `fig-input-angle`.
- Updated `fig-input-angle` layout so its number input keeps intrinsic width by default, while `full` mode still expands as expected.
- Updated `README` docs for `fig-input-angle` to cover `dial` and `rotations`.

## [3.9.2]

### Changed

- Updated `fig-choice` styling with reusable tokens for padding and selection-ring width, and adjusted selected-state visuals to use a secondary background plus an image outline ring.

### Fixed

- Removed disabled-state opacity dimming from `fig-chit` so disabled chips keep consistent text/icon contrast.

## [3.9.1]

### Fixed

- Synced segmented-control playground examples to explicitly use `sizing="equal"` so Attributes View and code markup stay aligned by default on `/figui3` and `/propkit`.

## [3.9.0]

### Added

- Added `animated` and `sizing` attributes to `fig-segmented-control`.
- Added a sliding selected-segment indicator for `fig-segmented-control` when `animated` is enabled.
- Added `Animated` and `Sizing` controls for segmented controls in playground Attributes View.

### Changed

- Updated segmented-control sizing so `sizing="auto"` keeps intrinsic width, including when `full` is present.
- Updated playground segmented-control examples on `/figui3` and `/propkit` so `Animated` defaults to off in Attributes View.
- Updated 3D Rotate `fields` options in playground Attributes View to `None`, `X, Y, Z`, and `X, Y`.
- Updated segmented-control docs in `README.md` to include `animated` and `sizing`.

### Fixed

- Fixed animated segmented-control flicker by stabilizing indicator sync during transient layout/mutation frames.
- Fixed playground animated segmented-control flashing by avoiding value persistence re-renders for animated controls.

## [3.8.2]

### Changed

- Changed easing curve arm stroke from `--figma-color-border-strong` to `--figma-color-bordertranslucent` for a softer appearance.

## [3.8.1]

### Changed

- Reduced easing curve handle radius from 6 to 5 for bezier and spring handles.
- Updated duration bar width from 4.25 to 5.
- Switched `fig-handle` inside easing curve handles to use explicit `--width`/`--height` CSS vars instead of `width: 100%; height: 100%`.

## [3.8.0]

### Added

- Added `fig-handle` component — a reusable, style-customizable handle element with CSS vars for `--width`, `--height`, `--fill`, `--border-radius`, `--box-shadow`, `--outline`, and `--border`.
- Added `--icon-reset` icon token.
- Added reset button to `fig-joystick` that appears when the value differs from the default (50% 50%) and resets on click. Exposes `default` attribute and `--is-not-default` CSS var.
- Added `:host` selectors to `base.css` and `components.css` root rules for shadow DOM compatibility.

### Changed

- Refactored `fig-joystick` to use `fig-handle` instead of a styled div.
- Refactored `fig-origin-grid` to use `fig-handle` instead of a styled span, setting `--border-radius` to match the original rounded-square shape.
- Refactored `fig-easing-curve` handles to use `foreignObject` + `fig-handle` instead of SVG circles, and the duration bar to use `foreignObject` + `fig-handle` instead of an SVG rect.
- Increased easing curve handle size from 8.5 to 12 SVG units.
- Removed unused easing curve CSS variables (`--easing-duration-bar-fill`, `--easing-duration-bar-stroke`, `--easing-duration-bar-stroke-width`).
- Added `/sandbox` route documentation to README.

## [3.7.0]

### Added

- Added `steppers` passthrough support to `fig-field-slider`, forwarding to its internal `fig-input-number`.
- Added a `Steppers` toggle to the `/propkit` field-slider attributes controls.

### Changed

- Updated `fig-origin-grid` and `fig-joystick` handle visuals for a more consistent compact handle treatment.
- Added configurable slider thumb outline tokens and applied focus-outline styling for `fig-field-slider` thumbs.
- Refined `fig-field-slider` number-input pill styling with explicit border radius.

### Fixed

- Fixed `fig-field-slider` steppers sync so the internal number input stays in sync after slider re-renders.
- Fixed overflowed `fig-origin-grid` handles to suppress regular handle box-shadow in arrow-mask overflow states.

## [3.6.0]

### Added

- Added `fig-field-slider` component that composes `fig-field` + `fig-slider`, defaults to `label="Label"`, `direction="horizontal"`, and `text="true"`, and re-emits `input`/`change` events.
- Added a top-level **Field Slider** section to `/propkit` playground with a dedicated example.
- Added slider styling tokens: `--slider-thumb-color`, `--slider-thumb-radius`, `--slider-tick-width`, `--slider-tick-height`, `--slider-tick-radius`, `--slider-tick-opacity`, and `--slider-stepper-padding`.

### Changed

- Refined `fig-field-slider` visuals to a full-surface style with custom thumb/tick sizing, opacity, radius, and masking behavior.
- Updated `/propkit` field-slider attributes view ordering and visibility (type-first; removed direction/value/min/max/step/placeholder/default/precision controls).

### Fixed

- Fixed `fig-field-slider` slider type updates not always reflecting visually by improving initial attribute sync timing.
- Fixed field-slider type defaults so `type="delta"` and `type="stepper"` enforce `default="50"`, and stepper enforces `step="10"` when not explicitly provided.
- Fixed blank label handling in `fig-field-slider` so `label=""` removes the rendered label element.

## [3.5.0]

### Added

- Added `checkerboard` attribute for `fig-image` — shows a checkerboard pattern behind the image, passed through to the inner `fig-chit`.
- Added `checkerboard` attribute for `fig-chit` — displays a checkerboard background via CSS.
- Added `--chit-bg-repeat` CSS variable to `fig-chit` for controllable background repeat behavior.
- Added "Checker" toggle to image attributes view in playground.

### Fixed

- Fixed `fig-chit` not resolving CSS variable backgrounds — added `#resolveBackground` that computes actual values from `var()` references.
- Fixed `fig-chit` `#detectType` treating empty `url()` as an image type — now checks for a non-empty URL source.
- Fixed `fig-chit` `::after` background shorthand resetting longhand properties (size, position, repeat) — switched to `background-image` with individual longhands.
- Fixed `fig-image` defaulting to `background="url()"` when no source is set — now uses `var(--figma-color-bg-secondary)` or empty `url()` when checkerboard is active.
- Fixed `fig-image` always forcing `data-type="image"` on its inner `fig-chit` for consistent thumbnail rendering.

## [3.4.3]

### Fixed

- Fixed drag toggle not syncing correctly in chooser attributes view — bare boolean attributes now read as `true` in string bool mode.
- Fixed playground `#app` min-width to account for main content padding.
- Fixed attributes sidebar switching to `absolute` positioning at narrow viewports to prevent overlap when horizontally scrolling.

### Changed

- Added default `axis-labels="X Y"` to joystick example in `/propkit`.
- Removed stale verification screenshots and reports.

## [3.4.2]

### Fixed

- Fixed `fig-segmented-control[full]` and `fig-dropdown[full]` to respect `full="false"` via `:not([full="false"])` guard.
- Added missing `full` attribute support for `fig-dropdown`.

## [3.4.1]

### Fixed

- Fixed playground URL path handling to preserve trailing slash style, preventing routing issues when embedded in external sites.
- Prevented no-op `replaceState` calls in playground navigation that could interfere with host routing.

### Changed

- Removed chooser example from `/figui3` playground (still available in `/propkit`).

## [3.4.0]

### Added

- Added `fig-chooser` component with keyboard navigation, selection management, and scroll overflow detection.
- Added `overflow` attribute for `fig-chooser` — `overflow="buttons"` (default) uses custom nav buttons with easing gradients, `overflow="scrollbar"` shows native scrollbars.
- Added `drag` attribute for `fig-chooser` — enables drag-to-scroll (on by default, set `drag="false"` to disable).
- Added `loop` attribute for `fig-chooser` — when present, arrow key navigation wraps around; when absent, stops at edges.
- Added `fig-choice` element with selected, hover, and disabled states.
- Added `--eased-fade-stops` CSS variable to `:root` for reusable easing gradients.
- Added chooser example to `/propkit` playground with image grid, layout/overflow/max-size/drag/loop controls.
- Added URL-based state sharing in the playground — attribute changes are reflected in the URL for shareable links.
- Added right-pinned attributes sidebar to the playground layout.

### Changed

- Moved `AttributesView` panels to a fixed right sidebar with separated sections.
- Switched playground placeholder images to `picsum.photos` for reliability.
- Removed `focus-visible` outline from `fig-choice` in favor of selected style for keyboard navigation.
- Suppressed hover style on selected `fig-choice` elements.

### Fixed

- Fixed `fig-chooser` layout change not syncing max-size style — moved handler from dead code path to dropdown onChange.
- Fixed playground URL parameters being lost on page refresh.
- Fixed `fig-field` label toggle state not persisting via URL parameters.
- Added missing `*.svg?raw` module declaration to fix TypeScript build.

## [3.3.0]

### Fixed

- Fixed `fig-tabs` not selecting the initial tab when `value` attribute is set — `#selectByValue` and `handleClick` now properly set the `selected` attribute on the matching `fig-tab`.
- Deferred initial tab selection in `fig-tabs` to `requestAnimationFrame` to ensure child elements are upgraded before selection runs.

### Added

- Added `[full]` attribute support for `fig-input-angle` (CSS and playground toggle).
- Added `theme="auto"` for `fig-toast` — automatically resolves to the opposite of the page's current `color-scheme` at show time.
- Added `theme="success"` option for `fig-toast`.
- Added "Icon" toggle and "Borderless" toggle to the `fig-header` playground attributes view.
- Added "Prepend" field steppers to popup offset inputs in the playground.

### Changed

- Renamed "Input Angle" section to "Angle input" and moved it below "Number input" in the `/figui3` playground nav.
- Renamed tabs attributes view header to "Tabs" and removed unused `value`, `name`, and `disabled` fields.
- Refactored copy prompt to derive from the code markup string instead of querying the live DOM, making it work for both `/figui3` and `/propkit` examples.
- Applied sentence case to all playground attributes view labels and headings.
- Set `columns="thirds"` on all attributes view fields for consistent layout.

## [3.2.0]

### Added

- Added a new `Icons` segmented control example to the `/figui3` playground, reusing the same icon set as `/propkit` for consistency.

### Changed

- Updated `/figui3` segmented control attributes to hide `value` and `name` fields in the Attributes panel, matching `/propkit`.
- Renamed the default `/figui3` segmented control example label from `Default` to `Text`.

## [3.1.0]

### Added

- Added value-driven segmented control behavior so setting `fig-segmented-control[value]` selects the matching segment, with fallback matching from `fig-segment` text content when segment `value` is omitted.
- Added bubbling `input` and `change` events for `fig-segmented-control` with the resolved selected value in `event.detail`.

### Changed

- Updated playground page titles for `/figui3` and `/propkit` routes with framework-agnostic descriptions.
- Updated Propkit segmented control attributes UI to hide `value` and `name` controls.
- Updated code/prompt export sanitization to strip `data-playground-*` attributes from generated snippets.
- Documented segmented control matching rules, precedence, and event behavior in `README.md`.

### Fixed

- Fixed a segmented control mutation-resync feedback loop that could cause the playground to hang on load.

## [3.0.3]

### Changed

- Updated segmented control playground examples in `/figui3` and `/propkit` to hide `value` and `name` in the Attributes panel.
- Added per-example `data-playground-hide-attrs` support so demo controls can suppress specific attribute fields without changing global rules.

## [3.0.2]

### Changed

- Updated joystick and fill picker handle elevation styling to use `--figma-elevation-100-canvas` for consistent control depth.
- Simplified related hover-shadow behavior for joystick/fill picker handles and cleaned up nested `fig-layer` open-state selector structure.

## [3.0.1]

### Fixed

- Fixed `fig-joystick` layering so axis labels render below the handle by adjusting z-index order.

## [3.0.0]

### Added

- Added new `fig-joystick` component tag with percentage-first value handling (`50% 50%` default), `fields`, `aspect-ratio`, and `axis-labels` support.
- Added joystick axis label rendering around the control plane with top/left/right/bottom placement rules and PropKit attributes integration.
- Added live joystick value persistence in the playground code/preview flow, matching origin-grid behavior to avoid scrub interruption re-renders.

### Changed

- **Breaking:** Renamed joystick tag from `fig-input-joystick` to `fig-joystick` and updated docs/playground/type mappings to use the new element name.
- Updated joystick handle visuals to match the color picker handle treatment and refined axis label typography styling.

### Fixed

- Fixed joystick X/Y field scrubbing in playground scenarios by aligning commit semantics with origin-grid (`input` during interaction, `change` on focus-out/release).

## [2.39.0]

### Added

- Added WebKit/iOS customized built-in support by loading a vendored `@ungap/custom-elements-builtin` polyfill when native support is unavailable.
- Added `polyfills/` to published package files so runtime polyfill imports resolve correctly for consumers.

### Changed

- Updated customized built-in registrations (`fig-dialog`, `fig-popup`, `fig-toast`) to use a polyfill-aware define helper and avoid duplicate element definitions.
- Updated README CDN script examples to use `type="module"` and documented SSR guidance for client-only `fig.js` imports.
- Refined playground nav list styling with vertical spacing and scroll-edge gradient fades.

### Fixed

- Fixed playground nav behavior by removing wheel-based auto-advance between examples so wheel/trackpad scrolling stays native.
- Fixed playground dropdown value syncing by binding `<fig-dropdown value>` directly and removing per-option `selected` attributes.
- Fixed attribute rules typing to allow nullable `trueValue` for boolean controls.

## [2.38.3]

### Changed

- Published a patch release with no runtime code changes to keep package and changelog versions aligned.

## [2.38.2]

### Changed

- Updated playground `/figui3` popup attributes controls so `offset` edits use split X/Y numeric inputs (`fig-input-number` with prepend labels) and serialize back to the single `offset="x y"` attribute.
- Updated playground `/figui3` popup `viewport-margin` control to use `fig-input-number` for numeric editing.

### Fixed

- Fixed popup `offset` attribute syncing in playground attributes when using numeric inputs by accepting both number and string event payloads.

## [2.38.1]

### Fixed

- Fixed playground layout so `.propkit-code-view` no longer shrinks in flex containers.

## [2.38.0]

### Added

- Added new `fig-origin-grid` component for transform-origin editing with optional `fields`, draggable handle interaction, and click-to-cell-center placement.
- Added PropKit integration for `fig-origin-grid` including section example, JSX typing, and attributes panel support.
- Added overflow-aware handle states for out-of-bounds values, including directional classes and masked arrow indicator styling.

### Changed

- Updated `fig-origin-grid` drag and click behavior to separate click vs drag intent, enable freeform out-of-bounds dragging, and support Shift snapping.
- Updated `fig-origin-grid` value parsing/sync so single-value origins mirror to both axes and X/Y fields stay synchronized with component value changes.
- Updated origin handle overflow nudge behavior with aspect-ratio-aware offset scaling.

### Fixed

- Fixed playground scrub interruptions for `fig-origin-grid` X/Y number fields by emitting commit `change` on field focus-out instead of every scrub tick.
- Fixed `fig-origin-grid` drag cursor behavior so grabbing only appears after actual drag threshold crossing.

## [2.37.0]

### Added

- Added `placeholder` passthrough support on `fig-slider` so `text="true"` forwards placeholder text to its internal `fig-input-number`.

### Changed

- `fig-slider` now normalizes missing/empty/invalid `value` inputs with type-aware fallbacks (`min` for standard sliders, `default` then `0` for delta) while keeping drag interaction available.
- In slider text mode, clearing the value now keeps the numeric field visually blank (showing placeholder when present) while preserving an internal fallback thumb position.
- Playground attributes now only shows `fig-slider` `placeholder` when `text` is enabled.

## [2.36.0]

### Added

- Added `selected` attribute to `fig-3d-rotate` that applies a `selected` class to the named face (e.g. `selected="front"`).
- Added `drag` boolean attribute to `fig-3d-rotate` (default true). Setting `drag="false"` disables cube drag rotation and switches the cursor to default.
- Added `.selected` face styling with `--figma-color-border-strong` background and border radius.

## [2.35.0]

### Added

- Added `perspective-origin` and `transform-origin` attributes to `fig-3d-rotate`, synced to CSS custom properties `--perspective-origin` and `--transform-origin`.
- `transform-origin` auto-preserves the default `-50cqi` Z depth when only two values (X Y) are provided.

### Fixed

- Fixed `fig-3d-rotate` drag release outside the window by using `setPointerCapture` with `pointercancel` and `lostpointercapture` listeners, matching the color picker fix.

## [2.34.0]

### Added

- Added configurable `perspective` attribute to `fig-3d-rotate` for controlling the 3D depth effect, with a `--perspective` CSS custom property.
- Added gradient edge borders on each side face of the `fig-3d-rotate` cube that fade from the front face backward, using per-face `border-image` gradients with `--border-start-color` / `--border-end-color` tokens.
- Added `perspective` toggle and `perspective-distance` slider controls to the playground attributes panel for `fig-3d-rotate`.
- Added value persistence for `fig-3d-rotate` in the playground so drag interactions survive markup re-renders.
- Added empty-string option to `fig-3d-rotate` `fields` enum for clearing visible input fields.

### Changed

- Improved `fig-3d-rotate` cube centering with `container-type: inline-size` and `transform-origin: 50% 50% -50cqi` for more accurate 3D rotation.
- Updated `fig-3d-rotate` to sync the `value` attribute on both `input` and `change` events during drag interactions.

## [2.33.4]

### Changed

- Improved playground nav wheel behavior to be overflow-aware: nav lists now scroll naturally first, then advance examples at scroll boundaries.
- Updated `.nav-links` overflow styling with thin, low-profile scrollbars for a cleaner navigation panel appearance.

### Fixed

- Fixed fill-picker color handle drag state to reliably end on pointer cancel/lost capture and when pointer buttons are released outside the picker/window.
- Fixed numeric alt-drag scrubbing (`fig-input-text[type="number"]`, `fig-input-number`) so drag state and cursor reset correctly when release happens outside the window.

## [2.33.3]

### Changed

- Centered the playground example container within the main layout for more consistent `/figui3` presentation.
- Updated `.propkit-example` spacing to use horizontal zero padding while preserving vertical padding.

## [2.33.2]

### Added

- Added a `Layer` section back to the `/figui3` playground with examples for icon and no-icon rows, including nested child layers.

### Changed

- Updated the icon-based layer example to default to `open` and `selected` on the parent with a selected nested child for clearer selection-state demos.
- Refined playground panel spacing and related component styling polish for the latest `/figui3` examples.

### Fixed

- Simplified shimmer direction empty-state labeling in attributes view from `Default (horizontal)` to `Default`.

## [2.33.1]

### Changed

- Updated `README.md` to reflect current FigUI3 workflows, including a dedicated playground usage section and refreshed popup/field/toast docs.
- Updated playground attributes panel spacing by increasing `.propkit-attributes-content` bottom padding to `var(--spacer-2-5)`.

### Fixed

- Removed `index.html` from published package files and retained the docs source in-repo as `old.html`.

## [2.33.0]

### Added

- Added a new `/playground` app flow for both FigUI3 and PropKit examples, including interactive preview, attribute editing, and code view tooling.
- Added richer FigUI3 field and popup authoring controls in the playground (field input presets, columns presets, popup theme/viewport margin/expanded position options).

### Changed

- Replaced legacy standalone PropKit pages/app files with the unified playground implementation and refreshed related skills/docs references.
- Updated FigUI3 examples for header, popup, and toast to use more realistic trigger/icon patterns and current component structure.

### Fixed

- Fixed playground code view sanitization to hide internal-only field attributes while preserving them during code-edit roundtrips.
- Fixed enum/dropdown value syncing in attributes view (including popup theme selection) and improved fig-popup beak alignment calculations on horizontal placements.

## [2.32.0]

### Added

- Added a PropKit nav footer install helper with a readonly `fig-input-text` command field plus copy buttons for both command and install prompt.
- Added contextual nav copy toasts (`Command copied` / `Prompt copied`) to match existing PropKit copy feedback patterns.
- Added SVG-focused CodeMirror folding behavior in PropKit code view, with subtle fold placeholder styling.
- Added an icon-only `Icons` example to the segmented control section.

### Changed

- Renamed the segment section to `Segmented control` and updated the text example label to `Text`.
- Updated attributes input panel titles to use section-aware names (for example `Segmented control` instead of `Input`).
- Hid empty attributes input panels when there are no visible controls to render.
- Constrained PropKit code view/editor height with internal scrolling so long markup does not overflow the viewport.

### Fixed

- Fixed PropKit image upload persistence by writing uploaded image sources into editable markup so subsequent attribute edits keep the uploaded image.
- Fixed image fit attribute controls by removing `50%` from fit options and treating `fit=auto` as attribute removal for better sync.
- Added `readonly` support to `fig-input-text` so readonly fields are truly non-editable and reactive to attribute changes.

## [2.31.2]

### Changed

- Tuned PropKit `.propkit-example` dash-inset spacing for cleaner vertical rhythm in preview blocks.
- Updated units dropdown options in PropKit attributes by removing `turn` and `rem`.

### Fixed

- Fixed PropKit slider variant controls by removing forced slider variant overrides in preview rendering and defaulting variant selection to `default` when no variant attribute is set.
- Fixed `fig-slider` variant reactivity by observing `variant` attribute changes and regenerating internals when variant updates.

## [2.31.1]

### Changed

- Refined PropKit layout spacing by tightening `main` description spacing and updating `.propkit-example` vertical dash-inset margins.

## [2.31.0]

### Added

- Added context-aware copy toasts in PropKit code actions (`HTML copied` / `Prompt copied`).
- Added new PropKit examples for dropdown optgroups (`Groups`, `Labelled groups`) and switch `Indeterminate`.
- Added per-field `Label` toggle controls in PropKit attributes to add/remove the `label` element from each `fig-field`.

### Changed

- Refined PropKit attributes UI into two stacked panels: `Field` controls (`Direction`, `Label`) and `Input` controls.
- Updated PropKit nav behavior for single-example sections so the parent row is directly selectable without rendering a nested child row.
- Curated PropKit examples by removing the Dial section and trimming extra Easing Curve and 3D Rotate variants.

### Fixed

- Fixed `fig-input-number` native steppers to honor decimal `step` values (e.g. `0.5`) and keep native `min`/`max`/`step` attributes synchronized.
- Fixed switch/checkbox indeterminate state syncing so setting `checked` clears indeterminate visuals correctly.

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
- Sliders in `propkit.html` now use the modern compact slider appearance.
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

- **BREAKING**: Experimental CSS features (customizable select picker) now require `experimental="modern"` instead of the old `neue` variant name.
  - Before: old dropdown variant attribute
  - After: `<fig-dropdown experimental="modern">`
- The `variant` attribute is now reserved for visual styling only.

### Added

- New `experimental` attribute for opting into experimental CSS features
- Extensible format allows multiple features: `experimental="modern popover"` (for future features)

### Migration Guide

If you were using the old `neue` variant on `fig-dropdown` to enable the customizable select picker:

```html
<!-- After -->
<fig-dropdown experimental="modern">
  <option>Option 1</option>
</fig-dropdown>
```
