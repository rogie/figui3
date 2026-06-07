---
name: frontend-performance-testing
description: Guides browser-based performance testing for HTML, CSS, JavaScript, and UI interactions. Use when measuring frontend performance, adding Playwright perf tests, checking regressions, profiling load/render/interaction cost, or discussing performance budgets.
---

# Frontend Performance Testing

Use real browsers for performance checks. In this repo, prefer Playwright because `playwright.config.ts` already boots `bun server.ts` and runs against Chromium.

## What To Measure

- Load readiness: time to fixture boot, first usable UI, and custom element definitions.
- Interaction latency: click, keyboard, pointer drag, slider movement, picker open/close.
- Render cost: layout, style recalculation, paint, animation frames, and DOM update loops.
- Bundle/build changes: output size and runtime behavior after `bun build`.
- Regressions under scale: repeated components, large option lists, nested controls, and overlay stacks.

## Test Pattern

1. Mount the smallest deterministic fixture that reproduces the performance risk.
2. Warm up once before measuring.
3. Use browser APIs inside `page.evaluate`: `performance.now()`, `PerformanceObserver`, `requestAnimationFrame`, `getBoundingClientRect`, and `document.fonts.ready` when relevant.
4. Repeat enough times to reduce noise; assert on median or bounded worst case, not one sample.
5. Keep budgets local and named after the scenario, not global magic numbers.

## Playwright Guidance

- Put stable performance checks near `tests/figui` unless they need a separate fixture.
- Fail on page errors and unexpected console errors before trusting timing data.
- Use `test.slow()` for intentionally heavier regression scenarios.
- Capture traces only for failing or investigative runs; do not turn every perf test into a trace artifact.
- Prefer `expect.poll` for readiness, then measure a synchronous scenario.

## Budget Rules

- Budgets should catch meaningful regressions without flaking on normal machine variance.
- Use relative comparisons when possible: changed implementation vs baseline path in the same page.
- Avoid hard sub-millisecond thresholds.
- Document what user-facing lag the budget protects.

## Avoid

- jsdom performance conclusions.
- Network-dependent timing assertions.
- Screenshot diffs as a proxy for performance.
- Microbenchmarks that skip the actual DOM/CSS/component path.
