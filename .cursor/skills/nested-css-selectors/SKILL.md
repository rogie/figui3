---
name: nested-css-selectors
description: Implements CSS nesting and advanced selectors with progressive enhancement and maintainable specificity. Use when writing or refactoring nested CSS, or when the user mentions :has, :is, :where, :not, or complex selector composition.
user-invocable: false
---

# Nested CSS + Selectors

## Purpose

Write modern, readable CSS using nesting and selector composition without breaking fallback behavior or creating specificity traps.

## Core Rules

1. Start with a stable baseline rule first.
2. Use nesting to improve readability, not to increase selector depth.
3. Keep selector chains short; avoid deeply coupled DOM paths.
4. Prefer low-specificity patterns (`:where(...)`) for reusable component styles.
5. Gate risky/brand-new behavior behind `@supports selector(...)` when needed.

## Nesting Guidelines

- Nest only when the child selector is semantically tied to the parent block.
- Keep nesting to ~2 levels in normal component styles.
- Use `&` explicitly for pseudo-classes, variants, and stateful modifiers.
- Avoid implicit descendant nesting that recreates fragile long selectors.

```css
.card {
  padding: 12px;

  &__title {
    font-weight: 600;
  }

  &:hover {
    background: var(--figma-color-bg-secondary);
  }
}
```

## Advanced Selector Guidelines

- Use `:is(...)` to group alternatives without repeating declarations.
- Use `:where(...)` when you want grouping with near-zero specificity cost.
- Use `:has(...)` for parent/state relationships that previously required JS classes.
- Keep `:not(...)` small and explicit; avoid broad negative matching.

```css
.field :is(input, select, textarea) {
  font: inherit;
}

.panel :where(button, [role="button"]) {
  cursor: pointer;
}
```

## Progressive Enhancement Pattern

```css
/* baseline behavior */
.form-row {
  border: 1px solid var(--figma-color-border);
}

/* enhanced behavior only where supported */
@supports selector(.form-row:has(input:focus-visible)) {
  .form-row:has(input:focus-visible) {
    border-color: var(--figma-color-border-selected);
  }
}
```

## Specificity Guardrails

- Prefer class-based selectors over element+class combinations unless necessary.
- Avoid IDs in component styling.
- If a rule should be easy to override, wrap grouping parts in `:where(...)`.
- If a selector becomes hard to reason about, split it into two simpler rules.

## Refactor Workflow

1. Identify repeated selector/declaration blocks.
2. Consolidate with `:is(...)` or `:where(...)` where intent matches.
3. Introduce nesting inside the owning component block.
4. Recheck specificity effects (especially when replacing comma groups).
5. Verify hover/focus/disabled/error states are unchanged.

## Quick Checklist

- [ ] Baseline works without advanced selectors.
- [ ] Nesting depth remains shallow and readable.
- [ ] `:has(...)` usage is support-gated when compatibility matters.
- [ ] Specificity is intentional (`:where` for low-cost overrides).
- [ ] No fragile selector tied to incidental DOM structure.
