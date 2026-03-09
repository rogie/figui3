---
name: propkit
description: Guides creation and refinement of Figma-style property panel patterns ("PropKit") using FigUI3 components. Applies when building or modifying property fields in the playground app (`/propkit` route), generating consistent field prompts, composing horizontal `fig-field` rows, or tuning panel UX for controls like image, color, fill, slider, switch, dropdown, segmented control, easing, and angle.
user-invocable: false
---

# PropKit

Patterns for composing clean, production-ready Figma property panels with FigUI3.

> IMPORTANT: Favor composition and consistency over custom one-off controls. Build panels from existing `fig-*` elements first.

## Current Project Context

```json
!`node -e "const fs=require('fs'); const ok=fs.existsSync('playground/src/main.tsx'); console.log(JSON.stringify({playground:ok, route:'/propkit', example:'horizontal fig-field + label + fig-* control'},null,2))" 2>/dev/null || echo '{"error":"context unavailable"}'`
```

## Principles

1. **Use horizontal property rows by default.** PropKit fields are primarily `fig-field direction="horizontal"`.
2. **One clear label per control.** Keep labels concise and aligned with Figma property language.
3. **Prefer native FigUI3 controls.** Use `fig-input-fill`, `fig-slider`, `fig-dropdown`, `fig-switch`, etc.
4. **Use realistic panel widths and spacing.** Match the property panel feel (`~240px` panel blocks in demos).
5. **Keep prompts and examples deterministic.** Prompt text should describe exact structure and key attributes.

## React + Vite PropKit Usage

### Include FigUI3 in React projects

- Import once in app bootstrap:
  - `import "@rogieking/figui3/fig.css";`
  - `await import("@rogieking/figui3/fig.js");`
- Register components before first React render to avoid undefined custom elements.
- Keep this setup in entry files (`main.tsx` / `main.jsx`), not scattered across feature components.

### Vite setup and tree-shaking behavior

- Base Vite React config is sufficient in most cases:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

- In production, FigUI3 side-effect registration can be tree-shaken if only imported for side effects.
- Preferred pattern (from `webgpu-effects`) is explicit async bootstrap:

```tsx
import "@rogieking/figui3/fig.css";

const bootstrap = async () => {
  await import("@rogieking/figui3/fig.js");
  createRoot(document.getElementById("app")!).render(<App />);
};

bootstrap();
```

### React composition conventions for PropKit rows

- Continue using canonical row shape in JSX:
  - `<fig-field direction="horizontal">` + `<label>` + one primary `fig-*` control.
- For customized built-ins in React (`<dialog is="fig-popup">` / `<dialog is="fig-dialog">`), use `class`, not `className`.
- Use refs and native event listeners (`input`, `change`) for reliable control updates.

## Critical Rules

### Field Composition

- Default pattern: label + single primary control inside one horizontal `fig-field`.
- Keep control-specific options on the component itself (not hidden wrapper logic).
- Use `full` where property controls should stretch within row constraints.
- Avoid mixing unrelated controls in a single field row unless intentionally grouped.

### Prompt Generation Style

- Write prompts as imperative build instructions.
- Include field direction, control tag, and meaningful attrs.
- Prefer short explicit phrasing over vague prose.
- Keep wording consistent:
  - `Use a horizontal fig-field...`
  - `With a label of ...`
- Include concrete defaults when relevant (value, min/max, step, units, mode, variant) so generated fields are deterministic.
- Avoid placeholder-only prompts for numeric controls; always specify range semantics.

### Control Guidance

- **Image:** prefer `fig-image` with `upload`, `fit`, and `aspect-ratio` where needed.
- **Color:** use `fig-input-color` with `text="true"` and optional `alpha`.
- **Fill:** use `fig-input-fill` for multi-mode fills; keep value JSON valid.
- **Slider:** choose proper type (`range`, `opacity`, `hue`, `stepper`, `delta`) and include units/transform intentionally.
- **Dropdown:** use `fig-dropdown`; include sensible default options.
- **Boolean:** use `fig-switch`; avoid using dropdowns for true/false.
- **Discrete choices:** use `fig-segmented-control` + `fig-segment`.
- **Motion easing:** use `fig-easing-curve` with/without presets depending on context.
- **Angle:** use `fig-input-angle` with `text="true"` for precision workflows.

### Slider Types and Variants

- Default to `type="range"` for generic numeric properties (opacity %, size, spacing, intensity).
- Use `type="opacity"` when color context is needed (set `color` and usually `units="%"`).
- Use `type="hue"` only for hue selection workflows.
- Use `type="stepper"` for discrete snap points (include a `datalist` with valid stops).
- Use `type="delta"` for offset/relative adjustments around a neutral point (typically include `default`, and often symmetric min/max).
- Prefer `text="true"` for precision-critical properties; omit it for compact/simplified rows.
- Use `transform` when internal value scale differs from UI display (example: internal `0..1`, display `0..100%`).
- Variants:
  - Default variant for most property panels.
  - `variant="minimal"` for visually quieter contexts.
  - `variant="neue"` only where explicitly requested for that panel's style.
- Always set explicit `min`, `max`, and `step` (and `units` where applicable) to keep behavior predictable.

### Control Selection Heuristics

- Use `fig-slider` for scrub-friendly continuous values (opacity, intensity, scale, blur amount).
- Use `fig-input-number` for precise direct entry (sizes, coordinates, exact typed values).
- Use slider + text (`text="true"`) when users need both quick scrubbing and precise adjustment.
- Use `fig-segmented-control` for small discrete sets (2-5 fixed options).
- Use `fig-dropdown` for larger or less frequently switched option sets.
- Use `fig-switch` for binary state, never slider/dropdown for pure on/off.

### UX Consistency

- Keep panel patterns visually consistent across sections.
- Preserve theme behavior (light/dark) and avoid non-token color overrides.
- Ensure labels and controls remain keyboard and screen-reader usable.

## Key Patterns

```html
<!-- Canonical PropKit row -->
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider value="75" min="0" max="100" text="true" units="%" full></fig-slider>
</fig-field>
```

```html
<!-- Non-horizontal (stacked/default column) field -->
<fig-field>
  <label>Opacity</label>
  <fig-slider value="75" min="0" max="100" text="true" units="%"></fig-slider>
</fig-field>
```

```html
<!-- Fill + blend pair -->
<fig-field direction="horizontal">
  <label>Fill</label>
  <fig-input-fill value='{"type":"solid","color":"#667eea"}' experimental="modern"></fig-input-fill>
</fig-field>
<fig-field direction="horizontal">
  <label>Blend</label>
  <fig-dropdown full experimental="modern">
    <option selected>Normal</option>
    <option>Multiply</option>
  </fig-dropdown>
</fig-field>
```

```txt
Prompt pattern:
Use a horizontal fig-field, with a fig-slider, min=0 max=100 text=true units=%. With a label of Opacity.
```

```html
<!-- Slider type/variant examples -->
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider type="opacity" value="0.75" color="#0D99FF" units="%" text="true" full></fig-slider>
</fig-field>
<fig-field direction="horizontal">
  <label>Hue</label>
  <fig-slider type="hue" value="180" text="true" variant="minimal" full></fig-slider>
</fig-field>
<fig-field direction="horizontal">
  <label>Offset</label>
  <fig-slider type="delta" value="0" default="0" min="-5" max="5" step="0.25" text="true" full></fig-slider>
</fig-field>
```

## Workflow

1. **Identify property intent.** Determine if control is boolean, discrete choice, continuous numeric, color/fill, media, or motion.
2. **Pick the canonical FigUI3 control.** Avoid custom alternatives unless required.
3. **Compose row structure.** Use horizontal `fig-field`, then label + control.
4. **Set defaults and attrs explicitly.** Include values/ranges/units so behavior is deterministic.
5. **Verify panel consistency.** Check row spacing, width, and theme parity against existing PropKit sections.
6. **Validate events and interactions.** Ensure controls emit usable `input`/`change` and behave well in keyboard workflows.

## Delivery Checklist

- Confirm prompts include all behavior-critical attrs (`value`, `min`, `max`, `step`, `units`, `type`, `variant` as needed).
- Confirm control choice matches intent (continuous vs discrete vs boolean vs exact numeric entry).
- Verify row density and panel width feel consistent with existing PropKit sections.
- Verify keyboard navigation and label association for every field row.
- Verify changes in `playground/src/data/sections.ts` still mirror recommended patterns in this skill.

## Quick Reference

```txt
Common PropKit controls:
- fig-image
- fig-input-color
- fig-input-fill
- fig-slider
- fig-switch
- fig-dropdown
- fig-segmented-control
- fig-easing-curve
- fig-input-angle
```

## Primary Files

- `playground/src/data/sections.ts` - canonical PropKit examples and prompt-copy behavior
- `fig.js` - control behavior and emitted events
- `components.css` - visual treatment and layout constraints
- `README.md` - component API details and usage
