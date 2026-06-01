---
name: web-component-testing
description: Guides real-browser tests for FigUI3 custom elements. Use when adding or debugging tests for fig-* web components, attribute/property contracts, value synchronization, event payloads, disabled behavior, or custom element registration.
---

# Web Component Testing

Use Playwright in a real browser for `fig-*` components. Avoid jsdom for component behavior because this repo depends on Custom Elements, layout, focus, dialogs, pointer events, media elements, and CSS.

## Contract Priorities

1. Assert registration with `customElements.get(tag)` or customized built-in upgrade.
2. Mount representative markup and wait for `customElements.whenDefined(tag)`.
3. Fail on page errors and unexpected console errors.
4. Test both attribute writes and property writes for value-like APIs.
5. Capture `input`, `change`, and component-specific events from real interactions.
6. Assert `event.detail` shape for data controls.
7. Verify disabled controls do not emit normal interaction changes where applicable.

## Interaction Pattern

- Prefer user-like interactions: `click`, `keyboard`, pointer drag, native input dispatch.
- Use host properties for public APIs: `el.value`, `el.checked`, `el.selected`, `el.open`.
- Use internal DOM only when no public interaction exists.
- Keep each failure tagged with component name and scenario id.

## Fixture Guidance

- Keep fixtures minimal and deterministic.
- Include required children for compound controls.
- Avoid network-dependent assertions; external media URLs are acceptable for smoke fixtures but not for pass/fail timing.
- For customized built-ins, create with markup such as `<dialog is="fig-dialog">`.
