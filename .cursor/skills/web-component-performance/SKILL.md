---
name: web-component-performance
description: Guides performance testing for native Web Components and custom elements. Use when measuring custom element registration, upgrade cost, connected/disconnected callbacks, attributeChangedCallback churn, Shadow DOM work, slots, or fig-* component scalability.
---

# Web Component Performance

Measure custom element performance in real browsers. Pair this with `web-component-testing` when validating both behavior contracts and performance regressions.

## Hot Paths

- `customElements.define` and `customElements.whenDefined` during boot.
- Initial upgrade of many existing elements.
- `connectedCallback` and `disconnectedCallback` during repeated mount/unmount.
- `attributeChangedCallback` and property setters during state sync.
- Shadow DOM creation, slot distribution, and internal event wiring.
- Form-style event emission during fast interactions.

## Test Pattern

1. Create a scaled fixture with representative `fig-*` markup.
2. Wait for definitions, then separate upgrade timing from interaction timing.
3. Measure repeated mount/unmount cycles for cleanup and callback cost.
4. Stress public APIs: attributes, properties, slots, and user interactions.
5. Assert no page errors, no console errors, correct final state, and bounded timing.

## Useful Checks

- Count how many times lifecycle callbacks run for one user-visible operation.
- Verify attribute writes do not emit user interaction events unless the component contract says so.
- Compare one component vs many components in the same page to catch nonlinear scaling.
- Test overlay/picker components with nested popups because geometry work can multiply.
- Confirm cleanup by removing hosts, re-adding them, and checking events are not duplicated.

## Fix Preferences

- Avoid rebuilding Shadow DOM when a targeted text/style/value update is enough.
- Coalesce repeated attribute/property sync when the public contract allows it.
- Keep event listeners stable and remove external listeners in `disconnectedCallback`.
- Prefer public host state for tests; inspect internals only to prove a suspected performance issue.

## Avoid

- Measuring autonomous custom elements in jsdom.
- Benchmarking constructors alone when the real cost is upgrade plus connected work.
- Adding caches that make attribute/property reflection stale.
- Changing public event timing to pass a benchmark.
