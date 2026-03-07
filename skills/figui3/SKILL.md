---
name: figui3
description: Guides development and maintenance of the FigUI3 web components library for Figma-style plugin UIs. Applies when adding or modifying `fig-*` custom elements, updating docs/demo pages, adjusting theme tokens, improving accessibility, or debugging component behavior in `fig.js`, `components.css`, `index.html`, and `README.md`.
user-invocable: false
---

# FigUI3

A lightweight web components library for Figma UI3-style plugin and widget interfaces.

> IMPORTANT: Prefer the project's native scripts and structure. Use `bun dev` for local docs/demo work and `bun build` for production output.

## Current Project Context

```json
!`node -e "const p=require('./package.json'); console.log(JSON.stringify({name:p.name,version:p.version,scripts:p.scripts,exports:p.exports},null,2))" 2>/dev/null || echo '{"error":"package.json not found"}'`
```

The JSON above is the source of truth for package name, build commands, and exported files.

## Principles

1. **Preserve native Web Components patterns.** Keep components framework-agnostic and rooted in custom elements.
2. **Prefer existing `fig-*` components over one-off markup.** Compose from current primitives before inventing new ones.
3. **Keep Figma UI3 visual consistency.** Use existing CSS variables and spacing/radius conventions.
4. **Honor interaction semantics.** Emit `input` while interacting and `change` on committed value changes.
5. **Treat accessibility as required behavior.** Preserve labels, keyboard support, ARIA attributes, and disabled states.

## React + Vite Integration

### Install and bootstrap in React

- Install package: `npm i @rogieking/figui3` (or `pnpm add` / `bun add`).
- Import CSS once in app entry (`main.tsx` / `main.jsx`): `import "@rogieking/figui3/fig.css";`
- Register custom elements before first render. In Vite/React, prefer an explicit bootstrap:

```tsx
import "@rogieking/figui3/fig.css";

const bootstrap = async () => {
  // Prevent production tree-shaking from dropping registration side effects.
  await import("@rogieking/figui3/fig.js");
  createRoot(document.getElementById("app")!).render(<App />);
};

bootstrap();
```

### Vite config guidance

- Standard React Vite config is usually enough:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

- Keep FigUI3 registration import at the top-level app bootstrap (not inside leaf components).
- If a production build appears to tree-shake element registration, use the explicit dynamic import pattern above.

### React usage rules for web components

- Use DOM attrs on custom elements (`<fig-slider text="true" />`) and read values from `e.target` / `e.detail`.
- In React, use `class` (not `className`) for all FigUI3 web components (`fig-*` and `<dialog is="fig-...">`) to keep attribute behavior consistent.
- Prefer refs + `addEventListener` when wiring complex `input`/`change` behavior.

### React + color picker modes (`fig-input-color` / `fig-fill-picker`)

- `fig-input-color` supports custom mode workflows only through `picker="figma"` (internally uses `fig-fill-picker`).
- The `mode` attribute on `fig-input-color` is pass-through to inner `fig-fill-picker`; mode logic lives in `fig-fill-picker`.
- `picker-*` attrs on `fig-input-color` are forwarded to `fig-fill-picker` (except `picker-anchor`, which is handled separately).
  - Example: `picker-dialog-position`, `picker-experimental`, etc.
- For React custom modes, use `fig-fill-picker` + slot API:
  - Add a child with `slot="mode-<name>"` (and optional `label`).
  - Include `<name>` in the `mode` attribute (e.g. `mode="solid,react-demo"`).
  - Listen for `modeready` and render into `e.detail.container`.
- Do not reparent React-owned DOM into the picker after render; use the provided `modeready` container as mount target.
- Keep React lifecycle cleanup explicit for custom mode mounts:
  - keep one `root` per mode container
  - call `root.unmount()` when the host component unmounts
  - remove `modeready` listeners in cleanup to avoid duplicate mounts
- Custom mode content must dispatch `input` / `change` with `detail` payload so picker can store mode data and propagate events.
- Preserve value shape expectations:
  - `fig-input-color` expects solid color data (`detail.color`, optional `detail.alpha`) from the picker.
  - `fig-fill-picker` custom modes use JSON with `type` set to mode name and remaining data in payload.
- Keep `picker-anchor` behavior explicit in React:
  - `picker-anchor="self"` anchors to the color input element itself.
  - Selector values anchor to another DOM element (resolved via `document.querySelector`).

## Experimental Attribute Guidance

- Use `experimental` as a feature-flag string for opt-in behavior. Treat it as progressive enhancement, not guaranteed baseline behavior.
- Prefer `experimental="modern"` when enabling modern customizable select/picker UI behavior.
- Keep usage explicit on the component that needs it (for example `fig-dropdown`, `fig-fill-picker`, `fig-input-fill`, `fig-input-color`).
- Preserve pass-through behavior:
  - `fig-input-color` and `fig-input-fill` forward experimental-related picker settings into internal `fig-fill-picker` usage.
  - Avoid adding hidden implicit defaults that enable experimental behavior globally.
- Backward-compat rule:
  - Do not reintroduce `variant="neue"` for dropdown experimental behavior.
  - Keep `variant="neue"` handling only where it is still intentionally supported (for example slider visuals).
- Documentation rule: any new experimental token must be documented with activation syntax, intended scope, and fallback behavior in demos + README + changelog.

## Critical Rules

### Overlay Components (`fig-dialog`, `fig-popup`)

- Choose the overlay primitive intentionally:
  - **`<dialog is="fig-dialog">`** for modal/light-dismiss dialog workflows.
  - **`<dialog is="fig-popup">`** for anchored floating surfaces (menus, contextual panels, nested popups).
- Keep overlay semantics stable:
  - `fig-dialog` should remain dialog-first (title/header/footer patterns, modal semantics).
  - `fig-popup` should remain anchor/position-first (offset, collision handling, viewport margins).
- Preserve drag and positioning behavior on both `fig-dialog` and `fig-popup`; do not regress manual placement rules.
- For popup chains, maintain containment and dismissal logic across descendant popups.
- Document any overlay behavior change in demos and changelog with a concrete before/after note.

### Component Architecture

- Extend `HTMLElement` and implement lifecycle cleanup in `disconnectedCallback`.
- Use `observedAttributes` + `attributeChangedCallback` for attribute-driven reactivity.
- Keep attribute names and behavior backward-compatible unless explicitly doing a breaking change.
- Support `disabled` behavior wherever interaction is possible.
- Avoid introducing framework-specific assumptions in component internals.

### Events and Data Contracts

- Emit standard `input` and `change` events for form-like controls.
- Put rich payloads in `event.detail` when needed; keep names stable.
- Do not silently change event payload shape for existing components.
- When adding new events, document trigger timing and payload fields.

### Styling and Theming

- Reuse established design tokens and CSS variables before adding new ones.
- Keep light/dark compatibility working with `color-scheme` and current token strategy.
- Avoid ad-hoc hardcoded colors when semantic tokens already exist.
- Preserve current sizing, spacing, and radius rhythm unless intentionally refactoring system-wide.

### Documentation and Demos

- Update `README.md` component docs when public API or behavior changes.
- Update demo pages (`index.html` and `propkit.html` where relevant) for visible behavior changes.
- Prefer realistic examples that mirror plugin/property panel usage.
- If introducing an experimental feature, document activation and fallback behavior clearly.

### Compatibility and Safety

- Keep browser support expectations aligned with current README claims.
- Use progressive enhancement for bleeding-edge CSS features.
- Avoid regressions in existing attributes, defaults, and emitted events.

### Color Picker Mode Extensibility

- Treat custom modes as a `fig-fill-picker` concern, not a standalone `fig-input-color` concern.
- When adding a new mode, update demos/docs with both:
  - vanilla slot usage (`slot="mode-*"`)
  - React `modeready` usage
- Do not emit `input` from programmatic attribute writes (`value` updates); preserve current loop-avoidance behavior for React.

## Key Patterns

```html
<!-- Modal/dialog content container -->
<dialog is="fig-dialog" drag="true" handle="fig-header">
  <fig-header>
    Dialog Title
    <fig-button variant="ghost" icon close-dialog aria-label="Close dialog">
      <span class="fig-mask-icon" style="--icon: var(--icon-close)"></span>
    </fig-button>
  </fig-header>
  <div>Dialog body</div>
</dialog>

<!-- Anchored popup surface -->
<dialog is="fig-popup" anchor="#trigger" position="bottom left" offset="8 8">
  <div>Popup content</div>
</dialog>
```

```js
// Event contract pattern: continuous + committed updates.
this.dispatchEvent(new CustomEvent("input", { detail, bubbles: true }));
this.dispatchEvent(new CustomEvent("change", { detail, bubbles: true }));

// Attribute-driven updates.
static get observedAttributes() { return ["value", "disabled"]; }
attributeChangedCallback(name, oldValue, newValue) {
  if (oldValue === newValue) return;
  // sync internal UI state
}
```

```txt
Event contract quick map:
- fig-slider: input/change -> current value on e.target.value
- fig-input-color: input/change -> value on e.target.value, structured color via e.detail (when available)
- fig-input-fill / fig-fill-picker: input/change -> fill payload in e.detail
```

```html
<!-- Typical field composition -->
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider value="75" min="0" max="100" text="true" units="%"></fig-slider>
</fig-field>
```

## `fig-popup` vs `fig-dialog`

- **Use `fig-dialog` when the UI is a dialog.**
  - Best for modal or primary task flows.
  - Works well with explicit dialog structure and close policies.
- **Use `fig-popup` when you need low-level floating control.**
  - Best for anchored contextual surfaces and advanced positioning behavior.
  - Prefer this when you need explicit anchor/position/offset/viewport tuning.

Rule of thumb: `fig-dialog` = dialog UX, `fig-popup` = popup primitive.

## Workflow

1. **Read existing implementation first.** Check `fig.js`, `components.css`, and related demo usage before editing.
2. **Confirm API surface impact.** Identify affected attributes, events, and slots.
3. **Implement with compatibility in mind.** Preserve defaults and old usage unless explicitly changed.
4. **Update docs/demo in same pass.** Keep examples and behavior synchronized.
5. **Run project checks.** Use `bun dev` for interactive verification and `bun build` for output sanity.
6. **Verify accessibility and theming.** Check keyboard flow, labels, disabled states, and both light/dark appearance.

## Release-Ready Checklist

- Validate in a production build (`bun build`) and confirm custom elements are registered at runtime.
- Verify `input` vs `change` behavior for touched controls in both vanilla usage and React integration.
- Verify light/dark themes and keyboard navigation for any changed component.
- Verify overlay behavior (`fig-dialog`, `fig-popup`) including close/dismiss and drag behavior when applicable.
- Update `README.md`, demos, and `CHANGELOG.md` for any public API or behavior change.

## Quick Reference

```bash
# Start docs/demo server
bun dev

# Build distributable files
bun build
```

## Primary Files

- `fig.js` - component implementations and behavior
- `components.css` - component-level styling and states
- `base.css` - foundational styles and variables
- `index.html` - main interactive docs/demo
- `README.md` - public API and usage documentation
- `CHANGELOG.md` - release history and migration notes
