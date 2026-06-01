---
name: css-component-testing
description: Guides CSS and layout tests for FigUI3 components. Use when validating component CSS, nested selectors, tokens, interaction states, computed styles, layout boxes, or visual regressions.
---

# CSS Component Testing

Test public CSS behavior in a browser. Prefer computed styles and bounding boxes for stable assertions; use screenshots only for targeted visual regressions.

## What To Test

- Token-driven styles resolve through CSS custom properties.
- Public states work: hover, focus, selected, disabled, open, dragging.
- Layout dimensions and positioning stay within expected bounds.
- Light and dark `color-scheme` paths do not throw or hide content.
- Nested selectors compile through the existing build pipeline.

## Test Pattern

1. Mount the smallest fixture that exposes the CSS behavior.
2. Wait for custom elements and fonts/layout to settle.
3. Read `getComputedStyle`, `getBoundingClientRect`, or public attributes/classes.
4. Assert behavior, not implementation details, unless debugging a specific regression.

## Avoid

- Broad screenshot snapshots for every component.
- Assertions tied to browser antialiasing or exact subpixel layout unless necessary.
- Testing private class names when a public attribute/state can be asserted instead.
