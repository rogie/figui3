---
name: propkit
description: >-
  Guides Figma-style property panel composition in the /propskit playground using
  fig-field rows and FigUI3 controls. Use when building or editing
  playground/src/data/sections.ts, generating field prompts, or choosing between
  raw fig-* rows and propskit-* wrappers (fig-lab).
user-invocable: false
---

# PropKit

Patterns for Figma property panels. Two layers:

| Surface | Route | What to use |
|---|---|---|
| **PropsKit playground** | `/propskit` | Horizontal `fig-field` + core `fig-*` |
| **Lab wrappers** | `/propskit/lab` | `propskit-*` (see `fig-lab` skill) |

Canonical `/propskit` examples: `playground/src/data/sections.ts`.
Core control APIs: `figui3` skill. Select/fill picker: `fig-editor`. Labeled wrappers: `fig-lab`.

## Principles

1. Default to horizontal `fig-field` rows.
2. One concise label per control.
3. For new labeled property controls in lab, prefer `propskit-*` over duplicating field chrome.
4. In `/propskit` demos, keep composing from `fig-*` so examples stay core-only unless the section needs lab.
5. Panel width ~240px. Match existing section density.

## React bootstrap

```tsx
import "@rogieking/figui3/fig.css";

const bootstrap = async () => {
  await import("@rogieking/figui3/fig.js");
  createRoot(document.getElementById("app")!).render(<App />);
};
bootstrap();
```

Add `fig-editor` when using `fig-select` / fill picker. Add `fig-lab` when using `propskit-*`.

On `fig-*` and `<dialog is="fig-...">`, use `class` not `className`.

## Field composition

```html
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider value="75" min="0" max="100" text="true" units="%" full></fig-slider>
</fig-field>
```

- Put control attrs on the control, not a wrapper.
- Use `full` when the control should stretch.
- Do not mix unrelated controls in one row unless grouped on purpose.

## Control heuristics

| Intent | `/propskit` (core) | Lab wrapper |
|---|---|---|
| Boolean | `fig-switch` | `propskit-switch` |
| Continuous number | `fig-slider` | `propskit-slider` |
| Exact number | `fig-input-number` | `propskit-number` |
| Text | `fig-input-text` | `propskit-text` |
| Small discrete set (2–5) | `fig-segmented-control` | — |
| Larger / rich list | `fig-select` (editor) | `propskit-select` |
| Native select only | `fig-dropdown` | — |
| Color | `fig-input-color` `text="true"` | `propskit-color` |
| Fill | `fig-input-fill` | — |
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
4. Check `/propskit` or `/propskit/lab` for an existing example before inventing markup.
5. Verify `input`/`change` and keyboard.

Primary files: `playground/src/data/sections.ts`, `playground/src/data/labSections.ts`, `fig.js`, `fig-lab.js`.
