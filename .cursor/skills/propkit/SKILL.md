---
name: propkit
description: >-
  Guides Figma-style property panel composition using fig-field rows and FigUI3
  controls, including React JSX.
user-invocable: false
---

# PropKit

Compose property panels from horizontal `fig-field` rows and core `fig-*` controls.

Core tags: `figui3` skill + [../figui3/components.md](../figui3/components.md). React: [../figui3/react.md](../figui3/react.md). Select/fill picker: `fig-editor`.

## Principles

1. Default to horizontal `fig-field` rows.
2. Use one concise label per control.
3. Put control attributes on the control, not the field.
4. Use `full` when the control should stretch.
5. Wire `input` for live updates and `change` for commits.

```tsx
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider value="100" min="0" max="100" units="%" text="true" full />
</fig-field>
```
