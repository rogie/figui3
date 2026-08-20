# FigUI3 core API reference

Source of truth for live attrs: `playground/src/lib/attributeRules.ts` and `README.md`.
Playground: `/figui3#{section}`.

## Option string formats

Shared by `fig-dropdown`/`fig-options`/`fig-select`/`propskit-select` `options`:

- Comma-separated: `Left,Center,Right`
- Newline-delimited
- JSON array: `["Left","Center"]` or `[{"value":"left","label":"Left"}]`

## `fig-button`

- `variant`: `""` (primary), `secondary`, `destructive`, `destructiveSecondary`, `destructiveGhost`, `destructiveLink`, `ghost`, `link`, `input`, `overlay`
- `type`: `button`, `toggle`, `submit`, `select`, `upload`
- `size`: `""`, `large`, `compact`
- `selected`, `disabled`, `icon` (presence)

## `fig-dropdown`

- `value`, `type="select|dropdown"`, `variant="ghost"`, `full`, `disabled`
- Children: native `<option>` / `<optgroup>`

## `fig-slider`

- `type`: `range` (default), `opacity`, `hue`, `stepper`, `delta`
- `text` default true; `text="false"` hides the number field
- Always set `min`, `max`, `step`; `units` when displayed
- `transform` when internal scale ≠ UI scale
- `variant="classic"` for the older appearance
- Opacity: set `color` and usually `units="%"`
- Delta: include `default` and typically symmetric min/max
- Stepper: include a `<datalist>` of stops

## `fig-field`

- `direction="horizontal|vertical"`
- `label` or a child `<label>`

## `fig-popup` vs `fig-dialog`

Dialog: `modal`, `drag`, `resizable`, `autoresize`, `handle`, `closedby="any|closerequest|none"`, `position` (viewport: `top left` … `bottom right`).

Popup: `anchor` (selector or element), `position` (side or corner), `offset="8 8"`, `viewport-margin`, `theme="default|light|dark|menu"`, `variant="popover|tooltip"`.

Toast: `theme`, `duration`, `offset`, `dismiss`, `live="polite|assertive"`, `icon`. Method: `showToast()`.

## `fig-menu`

- Trigger: child with `fig-menu-trigger`, or `trigger="contextmenu"`
- `position`, `offset`, `closedby="auto|any|none"`, `open`
- Items: `fig-menu-item` (`value`, `disabled`, `subtle`)
- Dividers: `fig-separator` / `fig-menu-separator` (`label`, `sticky`, `borderless`)
- Popup uses `popover="manual"` (top layer)

## Color / fill values

`fig-input-color` events: `{ color, alpha, opacity }` aliases (opaque `#RRGGBB`, `0–1`, `0–100`) plus legacy `value` / `hex` / `rgba`.

`fig-input-fill` value JSON:

```json
{"type":"solid","color":"#FF5733","opacity":100}
{"type":"gradient","gradient":{}}
{"type":"image","image":{"url":"...","scaleMode":"fill"}}
```

Without `fig-fill-picker`, fill/color render a preview. With the picker registered, click opens the editor dialog.

## Media

- Surface lives in `fig-preview`
- `fig-image` / `fig-video`: `upload`, `fit`, `aspect-ratio`, `checkerboard`, `loading-indicator`
- Video controls render **below** the preview, not as an overlay
- Slotted image overlays stay in light DOM

## `fig-layer` (separate bundle)

```js
import "@rogieking/figui3/fig-layer.css";
import "@rogieking/figui3/fig-layer.js";
```

Attrs: `open`, `visible`, `disabled`. Markup: child `.fig-layer-row` plus nested `fig-layer`. Events: `openchange`, `visibilitychange`. Playground: `/figui3#layer` (behind Full editor).

## Native elements

`/figui3` also demos styled native `button`, `select`, `input`, `textarea`, `checkbox`, `.switch`, `radio`, `color`, `progress`, `fieldset`, `details`, `hr` under group “Native elements”. Use these when a custom element is unnecessary.
