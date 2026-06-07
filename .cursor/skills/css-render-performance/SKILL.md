---
name: css-render-performance
description: Guides CSS rendering and layout performance tests for component UIs. Use when checking selector cost, layout thrash, paint work, animation smoothness, CSS containment, computed styles, or visual regressions caused by CSS changes.
---

# CSS Render Performance

Test CSS performance in a browser with real stylesheets loaded. Pair this with `css-component-testing` when the risk is both correctness and render cost.

## Performance Risks

- Layout thrash from alternating DOM writes and layout reads.
- Expensive selectors over large component trees.
- Paint-heavy effects: filters, shadows, backdrops, gradients, large clipping, and opacity stacks.
- Animation of layout properties instead of transform/opacity.
- Missing containment around isolated panels, popups, lists, or preview surfaces.
- Theme/token changes that trigger broad restyles.

## Measurement Pattern

1. Mount a scaled fixture: enough nodes to expose the cost, but still deterministic.
2. Wait for styles, custom elements, and fonts to settle.
3. Measure a single operation: class toggle, attribute change, theme switch, popup open, resize, or list update.
4. Read layout at controlled points using `getBoundingClientRect` or computed styles.
5. Use `requestAnimationFrame` to separate write, style/layout flush, and visual completion.

## Useful Browser APIs

- `performance.now()` for scoped timings.
- `requestAnimationFrame` for frame-boundary checks.
- `getComputedStyle` for resolved token/state assertions.
- `getBoundingClientRect` for layout cost and final geometry.
- `PerformanceObserver` for long tasks when supported by the browser under test.

## CSS Fix Preferences

- Prefer transform/opacity for motion.
- Prefer `contain` or `content-visibility` only when it preserves layout, accessibility, and interaction behavior.
- Prefer narrower DOM updates over broader selector work.
- Keep selector specificity maintainable; do not trade readability for theoretical wins without measurement.

## Avoid

- Timing raw selector queries without the real component tree.
- Replacing stable computed-style assertions with broad screenshots.
- Adding CSS containment that breaks popups, focus rings, sticky positioning, or overlay geometry.
