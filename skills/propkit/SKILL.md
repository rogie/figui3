---
name: propkit
description: >-
  Guides Figma-style property panel composition using fig-field rows and FigUI3
  controls, including React JSX. Use when building labeled property panels or
  choosing between raw fig-* rows and propskit-* wrappers (fig-lab).
user-invocable: false
---

# PropKit

Patterns for Figma property panels. Two layers:

| Surface | What to use |
|---|---|
| **Core rows** | Horizontal `fig-field` + core `fig-*` |
| **Lab wrappers** | `propskit-*` (see `fig-lab` skill) |

Core tags: `figui3` skill + [../figui3/components.md](../figui3/components.md). React: [../figui3/react.md](../figui3/react.md). Select/fill picker: `fig-editor`. Labeled wrappers: `fig-lab`.

## Principles

1. Default to horizontal `fig-field` rows.
2. One concise label per control.
3. For new labeled property controls in lab, prefer `propskit-*` over duplicating field chrome.
4. Compose from `fig-*` unless the row needs lab wrappers.
5. Panel width ~240px. Keep density tight.

## Field composition

```tsx
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider
    value={String(opacity)}
    min="0"
    max="100"
    text="true"
    units="%"
    full
    onInput={onInput}
    onChange={onChange}
  />
</fig-field>
```

- Put control attrs on the control, not a wrapper.
- Use `full` when the control should stretch.
- Do not mix unrelated controls in one row unless grouped on purpose.
- Add `fig-editor` when using `fig-select` / fill picker. Add `fig-lab` when using `propskit-*`.

## Control heuristics

| Intent | Core | Lab wrapper |
|---|---|---|
| Boolean | `fig-switch` | `propskit-switch` |
| Continuous number | `fig-slider` | `propskit-slider` |
| Exact number | `fig-input-number` | `propskit-number` |
| Text | `fig-input-text` | `propskit-text` |
| Small discrete set (2–5) | `fig-segmented-control` | — |
| Larger / rich list | `fig-select` (editor) | `propskit-select` |
| Native select only | `fig-dropdown` | — |
| Color | `fig-input-color` `text="true"` | `propskit-color` (fill-picker swatch) |
| Fill | `fig-input-fill` | `propskit-fill` (fill-picker swatch) |
| Gradient | `fig-input-gradient` | `propskit-gradient` |
| Image | `fig-image` `upload` | — |
| Easing | `fig-easing-curve` | — |
| Angle | `fig-input-angle` (**lab**) | — |
| X/Y | `fig-joystick` or two numbers | `propskit-position` |

Do not use dropdown/slider for pure on/off. Do not use `fig-dropdown` for Figma-style property selects when `fig-select` is available.

## Slider rules

- Default `type="range"`. Always set `min`, `max`, `step`.
- `opacity`: set `color`, usually `units="%"`
- `hue`: hue workflows only
- `stepper`: include a datalist of stops
- `delta`: include `default`, often symmetric min/max
- Text field on by default; `text="false"` for compact rows
- `transform` when internal scale ≠ display scale
- `variant="classic"` only when the old look is required

Prompt style: imperative, include direction, tag, and behavior-critical attrs.

```txt
Use a horizontal fig-field, with a fig-slider, min=0 max=100 text=true units=%. With a label of Opacity.
```

## Workflow

1. Identify intent (boolean, discrete, continuous, color/fill, media, motion).
2. Pick core vs lab wrapper.
3. Compose the row; set defaults explicitly.
4. Wire `onInput` (live) and `onChange` (commit).
5. Verify keyboard.
