---
name: propskit
description: Add a PropsKit-powered tuning panel to a Figma Make code prototype. Use when a prototype needs editable knobs, dials, parameters, constants, component props, design tokens, behavior settings, animation controls, layout controls, theme controls, media controls, or domain-specific tuning controls. Select props based on the user's recent requests, conversation context, code changes, and the unique functionality of the current prototype. Prefer current FigUI3 components from `fig.js`.
---
<!-- type: custom-skill -->
# PropsKit

Add a compact FigUI3 property panel to an existing prototype so users can tune design and behavior parameters without editing code.

The final result must include:

- A small gear trigger fixed to the top-right corner of the prototype.
- A floating panel that appears below the trigger, not a sidebar.
- Panel state that stays open while the user switches prototype states, tabs, or views.
- Grouped controls wired to real component state, constants, theme tokens, or behavior flags.
- Only useful props. Do not expose every possible value.

Use the FigUI3 property-panel pattern as the source of truth: `fig-group` sections containing `fig-field` rows with one primary control per row.

## Install

PropsKit uses `@rogieking/figui3`.

```bash
pnpm add @rogieking/figui3
```

Import CSS once and register elements before the first render. In React/Vite, use the async bootstrap so production tree-shaking does not drop custom-element registration.

```tsx
import "@rogieking/figui3/fig.css";

const bootstrap = async () => {
  await import("@rogieking/figui3/fig.js");
  createRoot(document.getElementById("root")!).render(<App />);
};

bootstrap();
```

## React JSX Types

For prototypes without a shared JSX declaration file, add permissive custom-element types once.

```ts
type WCProps = React.HTMLAttributes<HTMLElement> & { [key: string]: unknown };

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "fig-3d-rotate": WCProps;
      "fig-avatar": WCProps;
      "fig-button": WCProps;
      "fig-checkbox": WCProps;
      "fig-choice": WCProps;
      "fig-chooser": WCProps;
      "fig-swatch": WCProps;
      "fig-combo-input": WCProps;
      "fig-content": WCProps;
      "fig-dropdown": WCProps;
      "fig-easing-curve": WCProps;
      "fig-field": WCProps;
      "fig-footer": WCProps;
      "fig-group": WCProps;
      "fig-handle": WCProps;
      "fig-header": WCProps;
      "fig-icon": WCProps;
      "fig-image": WCProps;
      "fig-input-color": WCProps;
      "fig-input-file": WCProps;
      "fig-input-fill": WCProps;
      "fig-input-gradient": WCProps;
      "fig-input-number": WCProps;
      "fig-input-palette": WCProps;
      "fig-input-text": WCProps;
      "fig-joystick": WCProps;
      "fig-media": WCProps;
      "fig-media-controls": WCProps;
      "fig-menu": WCProps;
      "fig-menu-item": WCProps;
      "fig-menu-separator": WCProps;
      "fig-options": WCProps;
      "fig-origin-grid": WCProps;
      "fig-preview": WCProps;
      "fig-radio": WCProps;
      "fig-segment": WCProps;
      "fig-segmented-control": WCProps;
      "fig-shimmer": WCProps;
      "fig-skeleton": WCProps;
      "fig-slider": WCProps;
      "fig-spinner": WCProps;
      "fig-switch": WCProps;
      "fig-tab": WCProps;
      "fig-tab-content": WCProps;
      "fig-tabs": WCProps;
      "fig-tooltip": WCProps;
      "fig-truncate": WCProps;
      "fig-video": WCProps;
    }
  }
}
```

For customized built-ins, use native `dialog` plus `is`:

```tsx
<dialog is="fig-dialog">...</dialog>
<dialog is="fig-popup">...</dialog>
<dialog is="fig-toast">Saved</dialog>
```

In React, use `class`, not `className`, on customized built-ins if you need classes.

## React Wrapper Pattern

Web components work best in React through refs and native events. Do not keep pushing `value` through JSX props on every render. Use `useEffect` to sync attributes and `addEventListener` for `input` or `change`.

```tsx
function FigSliderControl({ value, onChange }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (event: Event) => {
      const target = event.target as HTMLElement & { value?: string };
      const next = Number(target.value);
      if (!Number.isNaN(next)) onChange(next);
    };
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, [onChange]);

  useEffect(() => {
    ref.current?.setAttribute("value", String(value));
  }, [value]);

  return (
    <fig-field>
      <label>Opacity</label>
      <fig-slider ref={ref} value="75" min="0" max="100" units="%" full />
    </fig-field>
  );
}
```

Use `input` for live preview updates. Use `change` for committed updates, expensive renders, analytics, or save operations.

## Panel Structure

Use a floating panel, not a right sidebar.

```tsx
<button
  aria-label="Open properties"
  onClick={() => setPanelOpen((open) => !open)}
  style={{
    position: "fixed",
    top: 12,
    right: 12,
    zIndex: 50,
  }}
>
  Settings
</button>

{panelOpen && (
  <div
    style={{
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 50,
      width: 280,
      maxHeight: "calc(100vh - 80px)",
      overflowY: "auto",
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: 12,
      boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      transformOrigin: "top right",
      paddingBottom: 8,
    }}
  >
    <fig-group name="Appearance" open>
      {/* fields */}
    </fig-group>
  </div>
)}
```

Key rules:

- Panel width is 280px unless the prototype genuinely needs more room.
- The panel stays light even when the app shell uses a dark topbar.
- Keep the panel open across tabs or prototype states.
- Add Reset only when it restores every exposed prop to a known default.
- Keep the existing prototype intact; add controls alongside it.

## Component Patterns

The canonical PropKit row is `fig-field` with a label and one primary control.

```html
<fig-field>
  <label>Opacity</label>
  <fig-slider value="75" min="0" max="100" units="%" text="true" full></fig-slider>
</fig-field>
```

Do not set `direction="horizontal"` on normal rows. The default `fig-field` grid already gives the label/control layout. Use `full` on controls that should fill the control column.

Use `fig-group` for panel sections. Name the group when the label helps scanning; leave `name` off for tiny anonymous groups.

```html
<fig-group name="Appearance" collapsible open>
  <fig-field>
    <label>Fill</label>
    <fig-input-fill value='{"type":"solid","color":"#0D99FF"}' full></fig-input-fill>
  </fig-field>
  <fig-field>
    <label>Visible</label>
    <fig-switch checked></fig-switch>
  </fig-field>
</fig-group>
```

Use `direction="vertical"` only for controls that need full-width vertical space, such as rich choosers, large previews, media, palettes, or 3D/spatial controls.

```html
<fig-field direction="vertical">
  <label>Style</label>
  <fig-chooser layout="grid" columns="3" value="top-left" full>
    <fig-choice value="top-left" padding selected>Top left</fig-choice>
    <fig-choice value="top" padding>Top</fig-choice>
    <fig-choice value="top-right" padding>Top right</fig-choice>
  </fig-chooser>
</fig-field>
```

Always add `padding` to text or label-based `fig-choice` items. Image-only and swatch-only choices can omit it when the child component supplies the shape.

### Canonical Recipes

Prefer these component compositions over one-off markup.

```html
<!-- Layout + spacing -->
<fig-group name="Layout">
  <fig-field>
    <label>Direction</label>
    <fig-dropdown full>
      <option selected>Horizontal</option>
      <option>Vertical</option>
    </fig-dropdown>
  </fig-field>
  <fig-field>
    <label>Gap</label>
    <fig-slider value="8" min="0" max="64" text="true" units="px" full></fig-slider>
  </fig-field>
</fig-group>
```

```html
<!-- Appearance -->
<fig-group name="Appearance" collapsible open>
  <fig-field>
    <label>Color</label>
    <fig-input-color value="#0D99FF" text="true" full></fig-input-color>
  </fig-field>
  <fig-field>
    <label>Opacity</label>
    <fig-slider value="100" min="0" max="100" text="true" units="%" full></fig-slider>
  </fig-field>
  <fig-field>
    <label>Palette</label>
    <fig-input-palette value='["#0D99FF","#14AE5C","#FFCD29","#FF7262","#9747FF"]' full></fig-input-palette>
  </fig-field>
</fig-group>
```

```html
<!-- Media field -->
<fig-field>
  <label>Image</label>
  <fig-image full="true" upload="true" label="Upload" alt="" fit="cover" size="auto" checkerboard="true"></fig-image>
</fig-field>
```

```html
<!-- Rich visual choices -->
<fig-field direction="vertical">
  <label>Alignment</label>
  <fig-chooser layout="grid" columns="3" value="top-left" full>
    <fig-choice value="top-left" padding selected>Top left</fig-choice>
    <fig-choice value="top" padding>Top</fig-choice>
    <fig-choice value="top-right" padding>Top right</fig-choice>
    <fig-choice value="left" padding>Left</fig-choice>
    <fig-choice value="center" padding>Center</fig-choice>
    <fig-choice value="right" padding>Right</fig-choice>
  </fig-chooser>
</fig-field>
```

```html
<!-- Preset palettes or gradients as choices -->
<fig-field direction="vertical">
  <label>Palettes</label>
  <fig-chooser layout="vertical" value="sunset" full drag>
    <fig-choice value="sunset" selected>
      <fig-input-palette value="#FF6B6B,#FFA07A,#FFD700,#FF4500" fixed disabled full></fig-input-palette>
    </fig-choice>
    <fig-choice value="ocean">
      <fig-input-palette value="#0D99FF,#00CEC9,#6C5CE7,#0984E3" fixed disabled full></fig-input-palette>
    </fig-choice>
  </fig-chooser>
</fig-field>
```

```html
<!-- Motion -->
<fig-field>
  <label>Easing</label>
  <fig-easing-curve value="0.42, 0, 0.58, 1"></fig-easing-curve>
</fig-field>
```

## Prop Model

Define defaults once and keep panel state shallow and explicit.

```ts
const defaults = {
  accentColor: "#7c3aed",
  columns: 3,
  gap: 20,
  radius: 16,
  animationEnabled: true,
  duration: 500,
};

const [props, setProps] = useState(defaults);
const set = useCallback((patch: Partial<typeof defaults>) => {
  setProps((prev) => ({ ...prev, ...patch }));
}, []);
const reset = () => setProps(defaults);
```

Wire props directly into the prototype:

```tsx
<Gallery columns={props.columns} gap={props.gap} radius={props.radius} />
```

## Choosing Props

Scan for:

- Hardcoded numbers: spacing, radius, counts, durations, thresholds, scale, blur, depth.
- Frequently adjusted design values: colors, fills, palette, typography, density, alignment.
- Real component props: layout mode, variant, state, feature flags, media source, content.
- Animation parameters: duration, delay, stagger, easing, spring values.
- Spatial parameters: origin, position, rotation, perspective, radius, angle, points.

Prioritize by prototype:

- Grid, cards, gallery: columns, gap, radius, padding, image fit, hover lift, palette.
- Typography: text, font size, weight, line height, letter spacing, width, alignment.
- Animation: enabled, duration, delay, easing curve, spring stiffness/damping, stagger.
- 3D or spatial: rotate, perspective, transform origin, joystick position, point/radius/angle.
- Branding and theme: fill, accent color, background, palette, surface style, blur.
- Media: image/video source, fit, poster, playback, upload, crop, fill mode.
- Data/content: item count, density, labels, visibility toggles, debug states.

Expose the smallest set that creates meaningful tuning. Do not expose values that do nothing visible.

## Current Component Guide

### Primary Prop Controls

Use these first for most property panels:

- `fig-slider`: continuous numeric values. Attrs/modifiers: `type="range|opacity|hue|stepper|delta"`, `value`, `min`, `max`, `step`, `default`, `precision`, `text`, `placeholder`, `units`, `transform`, `color`, `variant`, `disabled`, `full`.
- `fig-input-number`: exact numeric entry for size, coordinates, counts, or values where scrubbing is less useful. Attrs/modifiers: `value`, `placeholder`, `min`, `max`, `step`, `transform`, `units`, `units-disallow`, `unit-position`, `name`, `disabled`, `steppers`, `readonly`, `full`.
- `fig-input-text`: labels, copy, prompt text, URLs, names, and multiline descriptions. Attrs/modifiers: `type`, `value`, `placeholder`, `disabled`, `readonly`, `multiline`, `autoresize`, `resizable`, `min`, `max`, `step`, `transform`, `full`, slots `prepend`/`append`.
- `fig-switch`: boolean state. Attrs/modifiers: `checked`, `disabled`, `label`, `name`, `value`, `indeterminate`.
- `fig-dropdown`: compact enum selection with native `<option>` and `<optgroup>` support. Attrs/modifiers: `value`, `type="select|dropdown"`, `experimental`, `label`, `disabled`, `full`.
- `fig-options`: adaptive small enum selector. Attrs/modifiers: `options`, `value`, `disabled`, `full`, `sizing="equal|auto"`.
- `fig-segmented-control` with `fig-segment`: fixed 2-5 choices, especially alignment, theme, mode, density, or icon/text choices. Attrs/modifiers: control `value`, `name`, `disabled`, `animated`, `sizing="equal|auto"`, `full`; segment `value`, `selected`, `disabled`.
- `fig-chooser` with `fig-choice`: rich visual choice lists, grids, image choices, palette presets, gradient presets, draggable horizontal strips, and long visible lists. Attrs/modifiers: chooser `value`, `layout="vertical|horizontal|grid"`, `columns`, `choice-element`, `drag`, `overflow="buttons|scrollbar"`, `loop`, `disabled`, `full`; choice `value`, `selected`, `disabled`, `padding`.

### Color And Fill

- `fig-input-color`: one solid color. Attrs/modifiers: `value`, `alpha`, `text`, `disabled`, `swatch-disabled`, `full`, plus ARIA passthrough attrs. Use `text="true"` for hex entry and `alpha="true"` when opacity matters.
- `fig-swatch`: display-only swatch for colors, gradients, images, and fill previews. Attrs/modifiers: `background`, `size="small|large"`, `selected`, `disabled`, `alpha`, plus ARIA label attrs.
- `fig-input-palette`: editable list of colors. Attrs/modifiers: `value`, `disabled`, `min`, `max`, `open`, `fixed`, `full`. Good for chart series, card accents, generated palettes, and theme ramps.
- `fig-input-gradient`: focused gradient stop editor. Attrs/modifiers: `value`, `disabled`, `edit="true|false"`, `mode="handle|tip"`, `size="large"`, `full`. Use `edit="false"` for preset previews inside `fig-choice`.
- `fig-input-fill`: best default for fills. Attrs/modifiers: `value`, `disabled`, `mode`, `alpha`, `full`, plus ARIA passthrough attrs. Supports solid, gradient, image, video, and webcam fill shapes depending on value type.

Fill value examples:

```html
<fig-input-fill value='{"type":"solid","color":"#667eea","opacity":85}' full></fig-input-fill>
<fig-input-fill value='{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"position":0,"color":"#00F5A0","opacity":100},{"position":100,"color":"#4B00E0","opacity":100}]}}' full></fig-input-fill>
<fig-input-fill value='{"type":"image","image":{"url":"https://picsum.photos/320/320","scaleMode":"fill","scale":50}}' full></fig-input-fill>
```

### Media And Preview

- `fig-preview`: generic preview surface for images, canvas, SVG, shader output, and generated visuals. Attrs/modifiers: `fit`, `full`, `checkerboard`.
- `fig-image`: image display and upload. Attrs/modifiers: `src`, `alt`, `upload`, `label`, `size="small|medium|large|auto"`, `aspect-ratio`, `fit`, `checkerboard`, `full`.
- `fig-video`: video display, poster, upload, autoplay, muted, controls, and checkerboard previews. Attrs/modifiers: `src`, `poster`, `upload`, `label`, `size`, `aspect-ratio`, `fit`, `checkerboard`, `controls`, `autoplay`, `loop`, `muted`, `full`, ARIA label attrs.
- `fig-media`: shared image/video host when the type can switch. Attrs/modifiers: `type="image|video"`, `src`, `poster`, `alt`, `upload`, `label`, `size`, `aspect-ratio`, `fit`, `checkerboard`, `controls`, `autoplay`, `loop`, `muted`, `full`, ARIA label attrs.
- `fig-media-controls`: standalone playback controls for custom media surfaces. Attrs/modifiers: `playing`, `duration`, `time`.
- `fig-input-file`: file upload input with filename display. Attrs/modifiers: `accepts`, `label`, `disabled`, `multiple`, `variant="button|overlay"`, `url`, `filename`, `full`.

### Motion And Spatial

- `fig-easing-curve`: animation easing and spring-like curves. Attrs/modifiers: `value`, `precision`, `aspect-ratio`, `edit`. Use for any animation prototype instead of a plain easing dropdown.
- `fig-3d-rotate`: 3D rotation control. Attrs/modifiers: `value`, `precision`, `aspect-ratio`, `fields`, `perspective`, `perspective-origin`, `transform-origin`, `selected`, `drag`. Use `value="rotateX(...) rotateY(...) rotateZ(...)"` and `fields="rotateX,rotateY,rotateZ"` when numeric precision matters.
- `fig-origin-grid`: transform origin selector. Attrs/modifiers: `value`, `precision`, `aspect-ratio`, `drag`, `fields`.
- `fig-joystick`: 2D position control. Attrs/modifiers: `value`, `precision`, `transform`, `fields`, `coordinates="screen|math"`, `aspect-ratio`, `axis-labels`, generated `default` state. Use for light position, transform position, gradient center, camera target, or other X/Y controls.
- `fig-handle`: low-level draggable handle for custom surfaces. Attrs/modifiers: `value`, `type`, `color`, `tip`, `drag`, `drag-surface`, `drag-axes`, `drag-snapping`, `hit-area`, `selected`, `disabled`. Use only when building a custom spatial control.

### Layout, Containers, And Feedback

- `fig-group`: group fields into named sections. Attrs/modifiers: `name`, `collapsible`, `open`, `borderless`.
- `fig-field`: label/control row and accessibility wrapper. Attrs/modifiers: `label`, `direction="horizontal|vertical"`, `columns="half|2/5"`, child `[full]`.
- `fig-header`, `fig-content`, `fig-footer`: dialog or panel structure. Attrs/modifiers: header/footer `borderless`, header `dialog-header`, content `fit`.
- `fig-tabs`, `fig-tab`, `fig-tab-content`: organize larger panels into persistent panes. Attrs/modifiers: tabs `value`, `name`, `disabled`; tab `value`, `selected`, `disabled`, `content`; tab content `id`.
- `fig-button`: primary, secondary, ghost, link, icon, toggle, select, and upload button affordances. Attrs/modifiers: `variant`, `type`, `size`, `selected`, `disabled`, `icon`, `href`, `target`, `full`, `close-dialog`.
- `fig-tooltip`: hover, click, or manual contextual help. Attrs/modifiers: `action`, `delay`, `open`, `pointer`, `show`, `text`, `theme`.
- `fig-dialog`: modal or non-modal dialog surface using `<dialog is="fig-dialog">`. Attrs/modifiers: `open`, `modal`, `drag`, `handle`, `position`, `title`, `resizable`, `closedby`.
- `fig-popup`: anchored floating surface using `<dialog is="fig-popup">`. Attrs/modifiers: `open`, `anchor`, `position`, `offset`, `variant`, `theme`, `viewport-margin`, `closedby`.
- `fig-toast`: temporary feedback using `<dialog is="fig-toast">`. Attrs/modifiers: `duration`, `offset`, `open`, `theme`, `live`.
- `fig-menu`, `fig-menu-item`, `fig-menu-separator`: triggered keyboard-accessible action menus. Attrs/modifiers: menu `position`, `offset`, `disabled`; trigger `[fig-menu-trigger]`; item `value`, `disabled`.

### Status And Display

- `fig-avatar`: profile image or initials. Attrs/modifiers: `src`, `href`, `name`.
- `fig-icon`: masked icon from design tokens. Attrs/modifiers: `name`, `size="small|medium"`, `color`.
- `fig-spinner`: loading spinner. Attrs/modifiers: `size="small"`.
- `fig-shimmer`: animated loading wrapper. Attrs/modifiers: `duration`, `playing`, `aria-label`, `aria-labelledby`.
- `fig-skeleton`: skeleton placeholder around real fields. Attrs/modifiers: inherited shimmer attrs plus wrapped field content.
- `fig-truncate`: right, left, or middle truncation with optional tooltip. Attrs/modifiers: `position`, `tail`, `tooltip`.
- `fig-layer`: layer tree row. Attrs/modifiers: `open`, `selected`, `visible`, nested `fig-layer`, `.fig-layer-row`, `.fig-layer-icon`, `.fig-layer-chevron`.

## Control Selection Rules

Use `fig-slider` for scrub-friendly numeric values: opacity, blur, gap, radius, scale, duration, intensity, perspective, shadow, count.

Use `fig-input-number` for exact numeric values: x/y, width/height, frame count, seed, index, threshold, duration when exact entry matters.

Use `fig-input-color` for one solid color. Use `fig-input-fill` when the user may choose solid, gradient, image, video, or opacity as a fill.

Use `fig-input-palette` for multiple editable colors. Use `fig-chooser` when selecting among named palette presets.

Use `fig-switch` for booleans. Never use a dropdown for pure true/false.

Use `fig-options` or `fig-segmented-control` for small enums. Use `fig-dropdown` for longer lists. Use `fig-chooser` when choices are visual.

Use `fig-easing-curve` for animation timing. Do not use a text field for easing unless the prototype is specifically about editing raw CSS.

Use `fig-origin-grid`, `fig-joystick`, or `fig-3d-rotate` for spatial parameters instead of many disconnected number fields.

Use `fig-image`, `fig-video`, `fig-media`, and `fig-preview` when the prop is easier to understand visually than textually.

## Common Wrappers

### Color

```tsx
function FigColor({ label, value, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (event) => onChange(event.detail?.color ?? event.target.value);
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, [onChange]);

  useEffect(() => {
    ref.current?.setAttribute("value", value);
  }, [value]);

  return (
    <fig-field>
      <label>{label}</label>
      <fig-input-color ref={ref} text="true" alpha="true" full />
    </fig-field>
  );
}
```

### Dropdown

```tsx
function FigSelect({ label, value, options, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (event) => onChange(event.target.value);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onChange]);

  useEffect(() => {
    ref.current?.setAttribute("value", value);
  }, [value]);

  return (
    <fig-field>
      <label>{label}</label>
      <fig-dropdown ref={ref} full>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </fig-dropdown>
    </fig-field>
  );
}
```

### Switch

```tsx
function FigSwitchControl({ label, value, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (event) => onChange(event.target.checked);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    value ? el.setAttribute("checked", "") : el.removeAttribute("checked");
  }, [value]);

  return (
    <fig-field>
      <label>{label}</label>
      <fig-switch ref={ref} />
    </fig-field>
  );
}
```

### Rich Chooser

```tsx
function FigChooserControl({ label, value, options, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (event) => onChange(event.detail?.value ?? event.detail);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onChange]);

  useEffect(() => {
    ref.current?.setAttribute("value", value);
  }, [value]);

  return (
    <fig-field direction="vertical">
      <label>{label}</label>
      <fig-chooser ref={ref} layout="grid" columns="3" full>
        {options.map((option) => (
          <fig-choice
            key={option.value}
            value={option.value}
            padding
            selected={option.value === value ? "" : undefined}
          >
            {option.label}
          </fig-choice>
        ))}
      </fig-chooser>
    </fig-field>
  );
}
```

## Prompt Pattern

When generating a panel, write explicit instructions:

```txt
Use a fig-group named Appearance. Add a fig-field with label Opacity and a fig-slider value=75 min=0 max=100 step=1 units=% text=true full. Wire input to props.opacity.
```

Good prompts name:

- Group name.
- Field label.
- Control tag.
- Important attrs: `value`, `min`, `max`, `step`, `units`, `type`, `full`, `text`, `alpha`, `mode`, `layout`, `columns`, `fit`, `size`, `checkerboard`.
- Event timing: `input` for live changes or `change` for commits.
- State key to update.

## Quality Checklist

Before finishing:

- `@rogieking/figui3` is installed.
- `fig.css` and `fig.js` are imported before render.
- Custom element JSX types include every `fig-*` tag used.
- Controls sync through refs/effects and native events.
- Every exposed control changes visible behavior.
- Fields are grouped by user intent, not implementation detail.
- Panel is floating, top-right, light, compact, and remains open across app state changes.
- Reset restores all exposed props.
- Every rich `fig-choice` has `value`; text/label choices also have `padding`.
- Numeric controls have explicit range semantics.
- Color/fill values are valid strings or valid JSON.
- Prototype builds successfully.

## Common Pitfalls

- Importing the wrong `propskit` package. The correct package is `@rogieking/figui3`.
- Forgetting `fig.css` or registering `fig.js` after render.
- Using `value` as a React-controlled JSX prop and creating attribute/event loops.
- Exposing every constant instead of the few props that matter.
- Making the panel a sidebar.
- Closing the panel when switching prototype states.
- Using `fig-dropdown` for booleans; use `fig-switch`.
- Using raw text fields for fills, easing, or spatial values when FigUI3 has dedicated controls.
- Leaving choices without `value`, or text choices without `padding`.
- Forgetting `alt` or accessible labels on media and image controls.
