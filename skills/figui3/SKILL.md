---
name: figui3
description: >-
  Guides FigUI3 core (`fig.js` / `fig.css`) web components for Figma-style plugin UIs.
  Use when adding, using, or debugging fig-* elements from the core bundle—buttons,
  fields, overlays, menus, sliders, color/fill inputs, media, dialogs, popups, toasts—or
  when working in the /figui3 playground. Not for fig-select or fig-fill-picker
  (fig-editor), propskit-* / AI / canvas / angle / wheel / reorder (fig-lab), or fig-layer.
user-invocable: false
---

# FigUI3 core (`fig.js`)

Zero-dependency web components for Figma UI3 plugin and widget UIs.

Canonical examples live in the **playground**, not `index.html`.

- Live: https://rog.ie/figui3/
- Local: `npm run dev:playground` → `/figui3`
- Sections: `playground/src/data/figui3Sections.ts`
- Attribute inspector: `playground/src/lib/attributeRules.ts`
- Public API: `README.md`

Related skills: `fig-editor` (`fig-select`, `fig-fill-picker`), `fig-lab` (`propskit-*`, AI, canvas), `propkit` (`/propskit` field composition).

## Bundles

Always import CSS with JS. Register before first render.

```js
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
```

| Bundle | CSS + JS | Components |
|---|---|---|
| **Core** (this skill) | `fig.css` + `fig.js` | All `fig-*` below |
| **Editor** | `fig-editor.css` + `fig-editor.js` | `fig-select*`, `fig-fill-picker`, `fig-interpolation-swatch` |
| **Lab** (unstable) | `fig-lab.css` + `fig-lab.js` | `propskit-*`, `fig-ai-*`, `fig-canvas-control`, `fig-input-angle`, `fig-input-wheel`, `fig-reorder` |
| **Layer** | `fig-layer.css` + `fig-layer.js` | `fig-layer` |

`fig-editor.js` also imports `fig.js` and `fig-lab.js`. Lab CSS is still separate. `fig-layer` is **not** registered by `fig-editor.js`.

Playground “Full editor” toggle reveals `#select`, `#fill-picker`, `#layer`, and `#toast`. That grouping is UI-only: toast is core; layer is `fig-layer.js`.

## Principles

1. Prefer existing `fig-*` tags over one-off markup.
2. Use design tokens (`--figma-color-*`, `--radius-*`, `--spacer-*`). Do not hardcode Figma colors.
3. Emit `input` while interacting and `change` on commit. Do not fire `input` from programmatic attribute writes.
4. Preserve a11y: labels, keyboard, ARIA, disabled. See the `a11y` skill.
5. Keep components framework-agnostic. No React internals.

## React + Vite

```tsx
import "@rogieking/figui3/fig.css";

const bootstrap = async () => {
  await import("@rogieking/figui3/fig.js");
  createRoot(document.getElementById("app")!).render(<App />);
};
bootstrap();
```

- Use DOM attrs (`text="true"`). Read values from `e.target` / `e.detail`.
- On `fig-*` and `<dialog is="fig-...">`, use `class` not `className`.
- Prefer refs + `addEventListener` for `input`/`change`.

Color picker modes: `fig-fill-picker` is optional editor. Do not use `picker` / `picker-anchor` on `fig-input-color`. `picker-*` attrs forward to the picker only when it is registered. See `fig-editor`.

## Overlay rules

- `<dialog is="fig-dialog">` — modal/task dialog. `position` is viewport placement. No `anchor`.
- `<dialog is="fig-popup">` — anchored float (`anchor`, `position`, `offset`, `viewport-margin`). `title` auto-builds a header. `variant="popover"` uses CSS `filter` (containing block for `position: fixed`). Sticky `fig-separator` + `fig-menu-item` lists scroll on the popup.
- `<dialog is="fig-toast">` — call `showToast()`. `theme`, `duration`, `live`, `dismiss`, `icon`.
- `fig-menu` and `fig-select` use `popover="manual"` so lists escape filter-containing popups to the top layer. Nested menus inside popovers must keep that. `fig-menu` slots items (does not relocate them); triggers get `slot="trigger"`.

```html
<dialog is="fig-dialog" drag handle="fig-header">
  <fig-header>
    Title
    <fig-button variant="ghost" icon close-dialog aria-label="Close">
      <fig-icon name="close"></fig-icon>
    </fig-button>
  </fig-header>
  <fig-content>Body</fig-content>
</dialog>

<dialog is="fig-popup" anchor="#trigger" position="bottom left" offset="8 8">
  Popup content
</dialog>
```

## Field composition

Default property row:

```html
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider value="75" min="0" max="100" text="true" units="%" full></fig-slider>
</fig-field>
```

Labeled property wrappers (`propskit-*`) are lab. For `/propskit` playground patterns, use the `propkit` skill.

## Select vs dropdown

| Tag | Bundle | Use |
|---|---|---|
| `fig-dropdown` | core | Native `<select>` wrapper. `type="select\|dropdown"`, `variant="ghost"` |
| `fig-select` | editor | Custom listbox: groups, overflow chevrons, sticky separators, rich options |
| `propskit-select` | lab | Full-surface labeled field around `fig-select` |

Prefer `fig-select` for Figma-style menus. Use `fig-dropdown` only for a native select.

## Core catalog

Playground hashes: `/figui3#{id}`. Full attrs: [reference.md](reference.md).

### Buttons and inputs

| Tag | Playground | Notes |
|---|---|---|
| `fig-button` | `#button` | `variant`: secondary, ghost, link, destructive*, overlay, input. `type`: button, toggle, submit, select, upload. `size`, `icon`, `selected` |
| `fig-dropdown` | `#dropdown` | Native select. Options as `<option>` / `<optgroup>`. `variant="ghost"` |
| `fig-combo-input` | `#combo-input` | Text + suggestions (`options`) |
| `fig-input-text` | `#text-input` | `multiline` for textarea |
| `fig-input-number` | `#number-input` | `min`, `max`, `step`, `units`, `precision` |
| `fig-input-file` | `#file-input` | `accepts`, `multiple`, button `variant` |
| `fig-checkbox` / `fig-radio` / `fig-switch` | `#checkbox` `#radio` `#switch` | Switch supports `indeterminate` |
| `fig-slider` | `#slider` | `type`: range, opacity, hue, stepper, delta. `text`, `units`, `transform`, `variant="classic"` |
| `fig-options` | (propkit `#options`) | Option list helper; same option string formats as select |

### Color and fill (no picker dialog)

| Tag | Playground | Notes |
|---|---|---|
| `fig-input-color` | (propkit `#color`) | Solid color. `text`, `alpha`. Auto-detects `fig-fill-picker` |
| `fig-input-fill` | `#fill-input` | Solid/gradient/image/video/webcam JSON `value`. Same `webcam` / `video.poster` shape as the picker. `webcam-mode`, `default-video`, `picker-*` forwarded if picker registered |
| `fig-input-palette` | (propkit `#palette`) | Multi-color. `fixed`, `open` |
| `fig-input-gradient` | (propkit `#gradient`) | Stops. `edit`, `mode="handle\|tip"` |
| `fig-swatch` | `#swatch` | `size`, `selected`, `alpha` |
| `fig-color-tip` | `#color-tip` | `control="color\|add\|remove"` |
| `fig-chit` | — | Alias-style color chip |

### Layout and chrome

| Tag | Playground | Notes |
|---|---|---|
| `fig-field` | `#field` | `direction="horizontal\|vertical"`, `label` |
| `fig-group` | (containers) | `name`, `collapsible`, `open`, `compact` |
| `fig-header` / `fig-footer` / `fig-content` | (containers) | Header: `borderless`, `compact`. Footer: `sticky` |
| `fig-tabs` / `fig-tab` | `#tabs` | Roving tabs. `content="#id"` for panels |
| `fig-segmented-control` / `fig-segment` | `#segmented-control` | Radio-group pattern |
| `fig-chooser` / `fig-choice` | `#chooser` | Listbox. Omit `value` to select first; `value=""` means none. |
| `fig-separator` / `fig-menu-separator` | `#separator` | Optional `label`, `sticky`, `borderless` |
| `fig-menu` / `fig-menu-item` | `#menu` | `fig-menu-trigger`, `trigger="contextmenu"`, `position`, `offset`. Item also works in `fig-popup` (sticky separators, nested row menus). |
| `fig-icon` | `#icon` | Token mask (`name`, `size="small"`, `color`) |
| `fig-avatar` | `#avatar` | `src` / `name`, `size="large"` |
| `fig-truncate` | `#truncate` | `position="right\|left\|middle"`, `tooltip`, `tail` |

### Overlays

| Tag | Playground | Notes |
|---|---|---|
| `dialog is="fig-dialog"` | `#dialog` | `modal`, `drag`, `resizable`, `autoresize`, `handle`, `closedby`, `position` |
| `dialog is="fig-popup"` | `#popup` | `anchor`, `position`, `offset`, `viewport-margin`, `variant`, `theme` |
| `dialog is="fig-toast"` | `#toast` | `showToast()`. `theme`, `duration`, `live`, `dismiss`, `icon` |
| `fig-tooltip` | `#tooltip` | `text`, `action="hover\|click\|manual"`, `delay`, `theme` |

### Media

| Tag | Playground | Notes |
|---|---|---|
| `fig-preview` | (propkit `#preview`) | `aspect-ratio`, `fit`, `full`, `checkerboard` |
| `fig-media` / `fig-image` / `fig-video` | `#media` `#image` `#video` | Upload via `upload`. Video controls below preview |
| `fig-card` | `#card` | Media + label + selection |
| `fig-media-controls` | `#media-controls` | Play/pause chrome |
| `fig-input-file` | `#file-input` | File picker button |

### Specialized

| Tag | Playground | Notes |
|---|---|---|
| `fig-easing-curve` | (propkit `#easing`) | Bezier/spring |
| `fig-3d-rotate` | (containers) | Cube rotate |
| `fig-origin-grid` | (propkit) | Transform origin |
| `fig-joystick` | (propkit `#joystick`) | 2D position |
| `fig-handle` | `#handle` | `type="default\|minimal\|color\|canvas"`, `drag`, `drag-snapping` |
| `fig-spinner` / `fig-shimmer` / `fig-skeleton` | `#spinner` `#shimmer` | Loading |

`fig-input-angle` and `fig-input-wheel` are **lab**, not core.

## Events

```txt
fig-slider          input/change → e.target.value
fig-input-color     input/change → detail { color, alpha, opacity } plus legacy value/hex/rgba
fig-input-fill      input/change → fill payload in e.detail
fig-menu            change → detail { value }
fig-dialog/popup    native dialog close plus FigUI3 positioning attrs
```

## Maintainer workflow

1. Read `fig.js` + `components.css` before editing.
2. Mirror playground examples in `figui3Sections.ts` and `attributeRules.ts`.
3. Update `README.md` + `CHANGELOG.md` for public API changes.
4. `bun build` for dist. Never kill `npm run dev:playground`.
5. Tests: `npm run test:components` (Playwright). Do not start a second playground if one is running.

Primary files: `fig.js`, `components.css`, `base.css`, `README.md`, `playground/src/data/figui3Sections.ts`.
