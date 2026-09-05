---
name: figui3
description: >-
  Guides FigUI3 core (`fig.js` / `fig.css`) web components for Figma-style plugin UIs,
  including React JSX usage. Use when adding, using, or debugging fig-* elements from
  the core bundle—buttons, fields, overlays, menus, sliders, color/fill inputs, media,
  dialogs, popups, toasts. Not for fig-select or fig-fill-picker (fig-editor),
  propskit-* / AI / canvas / angle / wheel / reorder (fig-lab), or fig-layer.
user-invocable: false
---

# FigUI3 core (`fig.js`)

Zero-dependency web components for Figma UI3 plugin and widget UIs.

Public API: `README.md`. React: [react.md](react.md). Per-tag JSX: [components.md](components.md). Attrs: [reference.md](reference.md).

Related skills: `fig-editor` (`fig-select`, `fig-fill-picker`), `fig-lab` (`propskit-*`, AI, canvas), `propkit` (property-row composition).

## Bundles

Always import CSS with JS. Register before first render. In React, see [react.md](react.md).

```js
import "@rogieking/figui3/fig.css";
import "@rogieking/figui3/fig.js";
```

| Bundle | CSS + JS | Components |
|---|---|---|
| **Core** (this skill) | `fig.css` + `fig.js` | All `fig-*` in [components.md](components.md) |
| **Editor** | `fig-editor.css` + `fig-editor.js` | `fig-select*`, `fig-fill-picker`, `fig-interpolation-swatch` |
| **Lab** (unstable) | `fig-lab.css` + `fig-lab.js` | `propskit-*`, `fig-ai-*`, `fig-canvas-control`, `fig-input-angle`, `fig-input-wheel`, `fig-reorder` |
| **Layer** | `fig-layer.css` + `fig-layer.js` | `fig-layer` |

`fig-editor.js` also imports `fig.js` and `fig-lab.js`. Lab CSS is still separate. `fig-layer` is **not** registered by `fig-editor.js`. Toast is core; layer is `fig-layer.js`.

## Principles

1. Prefer existing `fig-*` tags over one-off markup.
2. Use design tokens (`--figma-color-*`, `--radius-*`, `--spacer-*`). Do not hardcode Figma colors.
3. Emit `input` while interacting and `change` on commit. Do not fire `input` from programmatic attribute writes.
4. Preserve a11y: labels, keyboard, ARIA, disabled. See the `a11y` skill.
5. Keep components framework-agnostic. No React internals in `fig.js`.

## Overlay rules

- `<dialog is="fig-dialog">` — modal/task dialog. `position` is viewport placement. No `anchor`.
- `<dialog is="fig-popup">` — anchored float (`anchor`, `position`, `offset`, `viewport-margin`). `title` auto-builds a header. `variant="popover"` uses CSS `filter` (containing block for `position: fixed`). Sticky `fig-separator` + `fig-menu-item` lists scroll on the popup.
- `<dialog is="fig-toast">` — call `showToast()`. `theme`, `duration`, `live`, `dismiss`, `icon`.
- `fig-menu` and `fig-select` use `popover="manual"` so lists escape filter-containing popups to the top layer. Nested menus inside popovers must keep that. `fig-menu` slots items (does not relocate them); triggers get `slot="trigger"`.

```tsx
<dialog is="fig-dialog" drag handle="fig-header">
  <fig-header>
    Title
    <fig-button variant="ghost" icon close-dialog aria-label="Close">
      <fig-icon name="close" />
    </fig-button>
  </fig-header>
  <fig-content>Body</fig-content>
</dialog>
```

## Field composition

```tsx
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider value="75" min="0" max="100" text="true" units="%" full />
</fig-field>
```

Labeled property wrappers (`propskit-*`) are lab. See the `propkit` and `fig-lab` skills.

## Select vs dropdown

| Tag | Bundle | Use |
|---|---|---|
| `fig-dropdown` | core | Native `<select>` wrapper. `type="select\|dropdown"`, `variant="ghost"` |
| `fig-select` | editor | Custom listbox: groups, overflow chevrons, sticky separators, rich options |
| `propskit-select` | lab | Full-surface labeled field around `fig-select` |

Prefer `fig-select` for Figma-style menus. Use `fig-dropdown` only for a native select.

## Events

```txt
fig-slider          input/change → e.currentTarget.value
fig-input-color     input/change → detail { color, alpha, opacity } plus legacy value/hex/rgba
fig-input-fill      input/change → fill payload in e.detail
fig-menu            change → detail { value }
fig-dialog/popup    native dialog close plus FigUI3 positioning attrs
```

`fig-input-angle` and `fig-input-wheel` are **lab**, not core.

## Maintainer workflow

1. Read `fig.js` + `components.css` before editing.
2. Update `README.md` + `CHANGELOG.md` for public API changes.
3. `bun build` for dist.
4. Tests: `npm run test:components` (Playwright).

Primary files: `fig.js`, `components.css`, `base.css`, `README.md`.
