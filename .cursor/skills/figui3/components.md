# FigUI3 core components (`fig.js`)

React contract: [react.md](react.md). Attrs: [reference.md](reference.md).

Handlers below assume `onInput` / `onChange` / `onClick` from [react.md](react.md).

## Buttons and inputs

### `fig-button`

```tsx
<fig-button variant="ghost" icon aria-label="Close" onClick={onClick}>
  <fig-icon name="close" />
</fig-button>
```

- Attrs: `variant` (`""` primary, `secondary`, `destructive`, `destructiveSecondary`, `destructiveGhost`, `destructiveLink`, `ghost`, `link`, `input`, `overlay`), `type` (`button`, `toggle`, `submit`, `select`, `upload`), `size` (`""`, `large`, `compact`), `align`, `selected`, `disabled`, `icon`, `close-dialog`
- Events: `click`; toggle also reflects `selected`

### `fig-button-combo`

```tsx
<fig-button-combo>
  <fig-button>Save</fig-button>
  <fig-button variant="secondary">Cancel</fig-button>
</fig-button-combo>
```

- Attrs: none required. Children stay in light DOM.

### `fig-dropdown`

```tsx
<fig-dropdown value={value} variant="ghost" full onChange={onChange}>
  <option value="left">Left</option>
  <option value="center">Center</option>
</fig-dropdown>
```

- Attrs: `value`, `type` (`select` | `dropdown`), `variant` (`ghost`), `full`, `disabled`
- Events: `input` / `change` → `currentTarget.value`
- Prefer `fig-select` (editor) for Figma-style menus.

### `fig-combo-input`

```tsx
<fig-combo-input
  value={value}
  options="Small,Medium,Large"
  placeholder="Size"
  full
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `value`, `options`, `placeholder`, `disabled`, `full`

### `fig-input-text`

```tsx
<fig-input-text
  value={value}
  placeholder="Name"
  full
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `type` (`text`, `email`, `password`, `search`, `url`), `multiline`, `autoresize`, `resizable`, `disabled`, `readonly`, `placeholder`, `full`

### `fig-input-number`

```tsx
<fig-input-number
  value={String(n)}
  min="0"
  max="100"
  step="1"
  units="%"
  steppers="true"
  full
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `min`, `max`, `step`, `precision`, `units`, `units-disallow`, `steppers`, `disabled`, `full`

### `fig-input-combo`

```tsx
<fig-input-combo>
  <fig-input-text value={value} onInput={onInput} />
  <fig-button>Go</fig-button>
</fig-input-combo>
```

- Children stay in light DOM.

### `fig-input-file`

```tsx
<fig-input-file
  label="Upload"
  accepts="image/*"
  multiple
  onChange={onChange}
/>
```

- Attrs: `label`, `accepts`, `multiple`, `disabled`, `variant` (`input`, `primary`, `secondary`, `ghost`, `link`, `overlay`)
- Events: `change` / `input` with files on the host

### `fig-checkbox`

```tsx
<fig-checkbox
  label="Enabled"
  checked={on ? "true" : undefined}
  onInput={onInput}
/>
```

- Attrs: `label`, `checked`, `disabled`, `value`
- Events: `input` / `change` → `detail.checked` ?? `host.checked`

### `fig-radio`

```tsx
<fig-radio
  name="align"
  value="left"
  label="Left"
  checked={value === "left" ? "true" : undefined}
  onInput={onInput}
/>
```

- Attrs: `name`, `value`, `label`, `checked`, `disabled`

### `fig-switch`

```tsx
<fig-switch
  checked={on ? "true" : undefined}
  onInput={onInput}
/>
```

- Attrs: `checked`, `disabled`, `label`, `indeterminate`
- Events: `input` / `change` → `detail.checked` ?? `host.checked`

### `fig-slider`

```tsx
<fig-slider
  value={String(opacity)}
  min="0"
  max="100"
  step="1"
  text="true"
  units="%"
  full
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `type` (`range`, `opacity`, `hue`, `stepper`, `delta`), `min`, `max`, `step`, `text`, `units`, `transform`, `color`, `default`, `variant` (`classic`), `placeholder`, `full`, `disabled`
- Events: `input` / `change` → `currentTarget.value`
- React: keep `value` a string; do not remount during drag. Opacity: set `color`. Delta: set `default`. Stepper: include a `<datalist>` of stops.

### `fig-options`

```tsx
<fig-options
  options="Light,Dark"
  value={isDark ? "Dark" : "Light"}
  full
  onChange={onChange}
/>
```

- Attrs: `options` (comma / newline / JSON), `value`, `full`, `disabled`
- Events: `input` / `change` → `detail` ?? `target.value`

## Color and fill

### `fig-input-color`

```tsx
<fig-input-color
  value={color}
  text="true"
  alpha="true"
  full
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `value`, `text`, `alpha`, `full`, `disabled`. Forwards `picker-*` when `fig-fill-picker` is registered. Do not use `picker` / `picker-anchor`.
- Events: `input` / `change` → `detail.{ color, alpha, opacity }` plus legacy `value` / `hex` / `rgba`

### `fig-input-fill`

```tsx
<fig-input-fill
  value={fillJson}
  full
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `value` (JSON or string), `mode`, `webcam-mode`, `default-video`, `picker-*`, `disabled`, `full`
- Events: `input` / `change` with fill payload in `detail`
- Custom modes: include the name in `mode`; slot `slot="mode-<name>"`. Closed chrome matches image fills. In React, listen for `modeready` and mount into `e.detail.container` (see `fig-editor`).

### `fig-input-palette`

```tsx
<fig-input-palette
  value='["#0D99FF","#14AE5C"]'
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `value`, `fixed`, `open`, `disabled`

### `fig-input-gradient`

```tsx
<fig-input-gradient
  value={gradientJson}
  mode="tip"
  onInput={onInput}
  onChange={onChange}
/>
```

- Attrs: `value`, `edit`, `mode` (`handle` | `tip`), `disabled`

### `fig-swatch`

```tsx
<fig-swatch background="#14AE5C" size="small" selected={selected || undefined} />
```

- Attrs: `background`, `size` (`small` | `medium` | `large`), `selected`, `disabled`, `alpha`

### `fig-chit`

```tsx
<fig-chit background="#14AE5C" />
```

- Alias-style color chip. Same idea as `fig-swatch`.

### `fig-color-tip`

```tsx
<fig-color-tip value="#0D99FF" control="color" />
```

- Attrs: `value`, `control` (`color` | `add` | `remove`)

## Layout and chrome

### `fig-field`

```tsx
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider value="75" min="0" max="100" text="true" units="%" full />
</fig-field>
```

- Attrs: `direction` (`horizontal` | `vertical`), `label`, `columns`
- Put control attrs on the control, not the field.

### `fig-group`

```tsx
<fig-group name="Appearance" collapsible open compact>
  {children}
</fig-group>
```

- Attrs: `name`, `collapsible`, `open`, `compact`

### `fig-header`

```tsx
<fig-header borderless compact>
  <h3>Title</h3>
</fig-header>
```

- Attrs: `borderless`, `compact`

### `fig-footer`

```tsx
<fig-footer sticky>
  <fig-button>Save</fig-button>
</fig-footer>
```

- Attrs: `borderless`, `sticky`

### `fig-content`

```tsx
<fig-content>Body</fig-content>
```

### `fig-tabs` / `fig-tab` / `fig-tab-content`

```tsx
<fig-tabs value={tab} onChange={onChange}>
  <fig-tab value="general" selected={tab === "general" || undefined}>
    General
  </fig-tab>
  <fig-tab value="export" content="#export">
    Export
  </fig-tab>
</fig-tabs>
<fig-tab-content id="export">…</fig-tab-content>
```

- Tabs: roving tabindex, `aria-controls` via `content="#id"`
- Children stay in light DOM (overflow chrome must not steal them)
- Events: `input` / `change` → `currentTarget.value`

### `fig-segmented-control` / `fig-segment`

```tsx
<fig-segmented-control value={align} onChange={onChange}>
  <fig-segment value="left">Left</fig-segment>
  <fig-segment value="center">Center</fig-segment>
</fig-segmented-control>
```

- Radio-group pattern. Segments stay light-DOM children.
- Events: `input` / `change` → `currentTarget.value`

### `fig-chooser` / `fig-choice`

```tsx
<fig-chooser value={value} layout="vertical" onChange={onChange}>
  <fig-choice value="a" selected={value === "a" || undefined}>
    A
  </fig-choice>
  <fig-choice value="b">B</fig-choice>
</fig-chooser>
```

- Attrs (chooser): `value`, `layout` (`vertical` | `horizontal` | `grid`), `columns`, `drag`, `loop`, `auto-scroll`, `scroll-behavior`
- Choice: always set `value`. Omit chooser `value` to select first; `value=""` means none.
- Children stay in light DOM.

### `fig-separator` / `fig-menu-separator`

```tsx
<fig-separator label="Darken" sticky />
```

- Attrs: `label`, `sticky`, `borderless`. First separator in a panel is auto-`borderless`.

### `fig-menu` / `fig-menu-item`

```tsx
<fig-menu position="bottom left" offset="8 8" onChange={onChange}>
  <fig-button slot="trigger">Menu</fig-button>
  <fig-menu-item value="copy">Copy</fig-menu-item>
  <fig-separator />
  <fig-menu-item value="paste" disabled>
    Paste
  </fig-menu-item>
</fig-menu>
```

- Attrs (menu): `position`, `offset`, `closedby` (`auto` | `any` | `none`), `open`, `disabled`, `trigger="contextmenu"`
- Item: `value`, `disabled`, `subtle`. Also valid as a row in `fig-popup`.
- Trigger: `slot="trigger"` (also assigned automatically). Items stay in light DOM and slot into the popup — do not relocate.
- Internal popup uses `popover="manual"` (top layer) so lists work inside `fig-popup variant="popover"`.
- Events: `change` → `detail.{ value }`

### `fig-icon`

```tsx
<fig-icon name="search" size="small" color="secondary" />
```

- Attrs: `name`, `size` (`medium` | `small`), `color` (token)

### `fig-avatar`

```tsx
<fig-avatar name="Rogie King" src={src} size="large" />
```

- Attrs: `src`, `name`, `size` (`""` | `large`)

### `fig-truncate`

```tsx
<fig-truncate position="middle" tooltip tail="…">
  A very long layer name
</fig-truncate>
```

- Attrs: `position` (`right` | `left` | `middle`), `tooltip`, `tail`

## Overlays

### `dialog is="fig-dialog"`

```tsx
<dialog is="fig-dialog" drag handle="fig-header" modal>
  <fig-header>
    Title
    <fig-button variant="ghost" icon close-dialog aria-label="Close">
      <fig-icon name="close" />
    </fig-button>
  </fig-header>
  <fig-content>Body</fig-content>
</dialog>
```

- Attrs: `modal`, `drag`, `resizable`, `autoresize`, `handle`, `closedby` (`any` | `closerequest` | `none`), `position` (viewport: `top left` … `bottom right`). No `anchor`.
- Events: native `close` / `cancel` — listen on the dialog ref.

### `dialog is="fig-popup"`

```tsx
<dialog
  ref={popupRef}
  is="fig-popup"
  variant="popover"
  position="bottom left"
  offset="8 8"
  className="menu"
  open={open ? true : undefined}
>
  <fig-content>…</fig-content>
</dialog>
```

- Attrs: `anchor` (selector or element on the ref), `position`, `offset`, `viewport-margin`, `variant` (`popover` | `tooltip`), `theme` (`default` | `light` | `dark` | `menu`), `title` (auto header)
- `variant="popover"` uses CSS `filter` (containing block for `position: fixed`). Nested `fig-menu` / `fig-select` keep `popover="manual"`.
- Set `anchor` as an element after mount. Listen for `close`.

### `dialog is="fig-toast"`

```tsx
<dialog ref={toastRef} is="fig-toast" theme="success" duration="3000" dismiss>
  Saved
</dialog>
```

```tsx
toastRef.current?.showToast();
```

- Attrs: `theme`, `duration`, `offset`, `dismiss`, `live` (`polite` | `assertive`), `icon`

### `fig-tooltip`

```tsx
<fig-tooltip ref={tipRef} text="Copy command">
  <fig-button variant="ghost" icon onClick={onCopy} aria-label="Copy">
    <fig-icon name="copy" />
  </fig-button>
</fig-tooltip>
```

- Attrs: `text`, `action` (`hover` | `click` | `manual`), `delay`, `theme`, `pointer`, `show`
- Imperative: `tooltip.text = "Copied"; tooltip.showPopup(); tooltip.hidePopup();`

## Media

### `fig-preview`

```tsx
<fig-preview aspect-ratio="16/9" fit="cover" checkerboard>
  <img src={src} alt="" />
</fig-preview>
```

- Attrs: `aspect-ratio`, `fit`, `full`, `checkerboard`
- Overlay: `slot="overlay"` — stays light DOM.

### `fig-media`

```tsx
<fig-media
  type="image"
  src={src}
  fit="cover"
  checkerboard="true"
  upload
  onChange={onChange}
/>
```

- Attrs: `type`, `src`, `caption`, `aspect-ratio`, `fit`, `upload`, `loading-indicator`, `checkerboard`, `controls`, `autoplay`, `loop`, `muted`, `poster`
- Events: `loaded` (`detail.src`), `input` / `change`

### `fig-image`

```tsx
<fig-image src={src} fit="cover" upload checkerboard="true" onChange={onChange} />
```

- Attrs: same media surface attrs. `loaded` → `detail.src`

### `fig-video`

```tsx
<fig-video poster={poster} muted fit="cover" controls="true" />
```

- Controls render **below** the preview, not as an overlay.

### `fig-card`

```tsx
<fig-card
  src={src}
  label="Card"
  aspect-ratio="1/1"
  selected={selected || undefined}
  onClick={onClick}
/>
```

- Attrs: `src`, `label`, `sublabel`, `selected`, `disabled`, `full`, `size`, `aspect-ratio`, `fit`, `label-line-clamp`

### `fig-media-controls`

```tsx
<fig-media-controls
  duration="120"
  time={String(time)}
  playing={playing || undefined}
  onInput={onInput}
/>
```

- Attrs: `playing`, `overlay`, `disabled`, `duration`, `time`

## Specialized

### `fig-easing-curve`

```tsx
<fig-easing-curve value="ease-in-out" onInput={onInput} onChange={onChange} />
```

### `fig-3d-rotate`

```tsx
<fig-3d-rotate value='{"x":0,"y":0}' onInput={onInput} onChange={onChange} />
```

- JSON `value`. Pass as a string attr.

### `fig-origin-grid`

```tsx
<fig-origin-grid value="50% 50%" fields="true" onInput={onInput} />
```

### `fig-joystick`

```tsx
<fig-joystick value="50% 50%" axis-labels="X Y" onInput={onInput} />
```

### `fig-handle`

```tsx
<div style={{ position: "relative", width: 120, height: 80 }}>
  <fig-handle value="50% 50%" drag type="default" />
</div>
```

- Attrs: `type` (`default` | `minimal` | `color` | `canvas`), `tip`, `size`, `color`, `selected`, `disabled`, `drag`, `drag-axes`, `drag-snapping`

### `fig-spinner`

```tsx
<fig-spinner size="small" />
```

### `fig-shimmer`

```tsx
<fig-shimmer>
  <span>Thinking…</span>
</fig-shimmer>
```

- Attrs: `duration`, `direction`, `playing`

### `fig-skeleton`

```tsx
<fig-skeleton>
  <fig-field>
    <label>Name</label>
    <fig-input-text value="Loading" />
  </fig-field>
</fig-skeleton>
```

- Attrs: `duration`, `direction`, `playing`

## `fig-layer` (separate bundle)

Not registered by `fig.js`. Import `fig-layer.css` + `fig-layer.js`.

```tsx
<fig-layer data-section="button" open>
  <div className="fig-layer-row">
    <label>Button</label>
  </div>
  <fig-layer data-section="button" data-example="primary">
    <div className="fig-layer-row">
      <label>Primary</label>
    </div>
  </fig-layer>
</fig-layer>
```

- Attrs: `open`, `visible`, `disabled`, `selected`
- Events: `openchange`, `visibilitychange`. Nested layers are React children; sync `selected` / `open` via attrs or `setAttribute` after render.
- Clicks on `.fig-layer-chevron` toggle; row clicks are yours (delegate on a parent).
