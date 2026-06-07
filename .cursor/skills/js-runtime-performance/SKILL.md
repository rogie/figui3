---
name: js-runtime-performance
description: Guides JavaScript runtime performance testing for frontend components. Use when profiling event handlers, DOM update loops, memory leaks, timers, animation frames, pointer/keyboard interactions, or regressions in vanilla JS component code.
---

# JS Runtime Performance

Measure JavaScript cost through real user-facing paths. For FigUI3, that usually means interactions on `fig-*` elements in Playwright, not isolated functions.

## What To Check

- Event handlers stay short during pointer drag, key repeat, input, and resize.
- Attribute/property updates avoid redundant DOM writes.
- Repeated mount/unmount cycles clean listeners, timers, observers, and animation frames.
- Expensive parsing or serialization does not run on every frame.
- Overlay and picker positioning does not do repeated forced layout work.
- Component registration and upgrade do not block page boot unexpectedly.

## Test Pattern

1. Reproduce the user path with real DOM and real events.
2. Warm up once, then measure repeated runs.
3. Collect timings with `performance.now()` around the smallest meaningful operation.
4. For leak risks, mount/unmount repeatedly and count retained DOM/listeners through observable public effects.
5. Assert behavior first, then assert timing or bounded operation counts.

## Instrumentation Ideas

- Wrap public methods or callbacks temporarily inside `page.evaluate` to count calls.
- Count emitted `input` and `change` events during interactions.
- Use `requestAnimationFrame` loops to detect frame starvation.
- Use console timing only for manual investigation; tests should return structured values to Playwright.

## Fix Preferences

- Batch DOM writes before layout reads.
- Cache parsed static data, but invalidate when public attributes/properties change.
- Prefer one listener on a stable root over many per-child listeners when behavior allows.
- Cancel timers, observers, and frame callbacks in `disconnectedCallback`.

## Avoid

- Optimizing private code paths that do not affect measured UI behavior.
- Adding debounce/throttle that changes `input` vs `change` semantics.
- Hiding slow work behind `setTimeout` without proving user-perceived latency improves.
