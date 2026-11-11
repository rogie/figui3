# React + FigUI3

FigUI3 is web components. Use the tags in JSX. There is no React wrapper package.

Shared by `figui3`, `fig-editor`, and `fig-lab`. Per-tag recipes: [components.md](components.md).

## Bootstrap

For client-only apps, register before the first render. `register()` is
idempotent and keeps the registration side effect explicit.

```tsx
import { createRoot } from "react-dom/client";
import { register } from "@rogieking/figui3/register.js";
import "@rogieking/figui3/fig.css";

const bootstrap = async () => {
  await register();
  createRoot(document.getElementById("app")!).render(<App />);
};

bootstrap();
```

Opt into editor and/or lab bundles:

```tsx
import "@rogieking/figui3/fig-editor.css";
import "@rogieking/figui3/fig-lab.css";
await register({ editor: true, lab: true });
```

### SSR and hydration

The JavaScript bundles are safe to import in a server runtime, where
registration becomes a no-op. However, a side-effect import in the browser
still upgrades existing custom elements immediately. During hydration, let
React claim the server DOM first, then register FigUI3 from an effect:

```tsx
import { useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { register } from "@rogieking/figui3/register.js";
import "@rogieking/figui3/fig.css";

function RegisterFigUI() {
  useEffect(() => {
    void register();
  }, []);
  return null;
}

hydrateRoot(
  document.getElementById("app")!,
  <>
    <RegisterFigUI />
    <App />
  </>,
);
```

Do not statically import `fig.js`, `fig-editor.js`, or `fig-lab.js` in a
hydrating client bundle. Those compatibility entry points still register at
module evaluation time. Framework client-only boundaries are not enough when
they evaluate before hydration; call `register()` from a post-hydration effect.

## Bundler registration

FigUI3 JavaScript includes registration-only modules. Their imports define
custom elements even when they export no values, so bundlers must preserve
their side effects.

When core components work but an editor is missing, diagnose registration after
importing `fig-editor.js`:

```js
customElements.get("fig-popup-palette");
```

An `undefined` result means a registration module was not evaluated, usually
because an affected FigUI3 package version let the bundler tree-shake it.
Upgrade FigUI3 first. As a temporary Vite workaround for affected versions,
disable dependency and production tree-shaking:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { esbuildOptions: { treeShaking: false } },
  build: { rollupOptions: { treeshake: false } },
});
```

Remove this workaround after upgrading. Corrected releases declare:

```json
{
  "sideEffects": ["**/*.js", "**/*.css"]
}
```

## JSX types

Install the packaged React augmentation once in your app:

```ts
import "@rogieking/figui3/react";
```

This covers every registered core, editor, and Lab tag. DOM queries use the
packaged `HTMLElementTagNameMap`, refs expose component methods, and
`onInput` / `onChange` type `nativeEvent.detail`. Customized built-ins remain
`<dialog is="fig-dialog|fig-popup|fig-toast">`; there is no autonomous
`<fig-toast>` tag.

## Host JSX


```tsx
<fig-field direction="horizontal">
  <label>Opacity</label>
  <fig-slider
    value={String(opacity)}
    min="0"
    max="100"
    text="true"
    units="%"
    full
    onInput={onInput}
    onChange={onChange}
  />
</fig-field>
```

## Attributes

- Strings: `text="true"`, `variant="ghost"`, `value={String(n)}`.
- Presence: `icon`, `full`, `compact`, `disabled` as boolean props; unset with `undefined`.
- Checked: `checked={on ? "true" : undefined}` — never `checked={false}`.
- Native dialog open: `open={open ? true : undefined}`.
- Optional flags / `data-*`: omit with `undefined`.

Treat FigUI3 controls as event-driven/uncontrolled in React. Components reflect
user edits to their own `value` or `checked` state. If application state stays
unchanged after an edit, React does not write an unchanged JSX prop again, so
the DOM edit is not automatically rejected.

For accepted edits, update application state from `input` / `change`. For a
rejected or normalized edit, restore the committed value through the ref in
the event handler. A reusable controlled wrapper must do both: synchronize the
host after every committed render and restore rejected edits immediately.

```tsx
import type { FigTextInputElement } from "@rogieking/figui3";

const ref = useRef<FigTextInputElement>(null);
const committed = useRef(value);
committed.current = value;

useLayoutEffect(() => {
  const host = ref.current;
  if (host && host.value !== value) host.value = value;
}); // Intentionally runs after every committed render.

function handleInput(event: React.SyntheticEvent<FigTextInputElement>) {
  const next = (event.nativeEvent as CustomEvent<string>).detail;
  if (!isAllowed(next)) {
    if (ref.current) ref.current.value = committed.current;
    return;
  }
  setValue(next);
}

return <fig-input-text ref={ref} onInput={handleInput} />;
```

Restore rejected checked state with both the property and reflected attribute:

```ts
host.checked = checked;
host.toggleAttribute("checked", checked);
```

For drag controls, accept live `input` updates or restore on `change` after the
gesture commits. React 18 wrappers should attach these events natively as
described below.

## Events

React's custom-element event behavior differs by major version:

| Event | React 19 | React 18 |
|---|---|---|
| `click` | `onClick` | `onClick` |
| `input` | `onInput`; detail is on `nativeEvent.detail` | `onInput`; detail is on `nativeEvent.detail` |
| `change` | `onChange`; detail is on `nativeEvent.detail` | Use `addEventListener`; JSX `onChange` is not reliable on custom elements |
| Named custom events | Use `addEventListener` for portable code | Use `addEventListener` |

React wraps `input` and `change` in a `SyntheticEvent`. Do not read
`event.detail` from a React handler. Read order:

1. `(event.nativeEvent as CustomEvent).detail`
2. `event.currentTarget.value` / `.checked`
3. `event.target.value`

```tsx
function readValue(event: React.SyntheticEvent<HTMLElement>) {
  const detail = (
    event.nativeEvent as CustomEvent<{
      checked?: boolean;
      value?: unknown;
    }>
  ).detail;
  const host = event.currentTarget as HTMLElement & {
    value?: unknown;
    checked?: boolean;
  };
  if (typeof detail?.checked === "boolean") return detail.checked;
  if (detail?.value !== undefined) return detail.value;
  if (detail !== undefined && detail !== null) return detail;
  return host.value ?? host.checked;
}
```

For React 18 `change`, named custom events, or code shared by React 18 and 19,
attach a native listener through a ref. Native listeners receive the
`CustomEvent` directly, so `event.detail` is correct:

```tsx
const ref = useRef<HTMLElement>(null);

useEffect(() => {
  const host = ref.current;
  if (!host) return;
  const onChange = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    // Commit detail…
  };
  host.addEventListener("change", onChange);
  return () => host.removeEventListener("change", onChange);
}, []);

return <fig-slider ref={ref} />;
```

Common named events that should use native listeners: `loaded`, `optionhover`,
`optionschange`, `reorder`, `remove`, `modeready`, `webcamstream`, dialog
`close`, and dialog `cancel`.

## Customized built-ins

Do not use `<fig-dialog>`, `<fig-popup>`, or `<fig-toast>`. Use `<dialog is="…">`.

```tsx
const buttonRef = useRef<HTMLElement>(null);
const popupRef = useRef<HTMLDialogElement>(null);

useEffect(() => {
  const popup = popupRef.current;
  if (!popup) return;
  (popup as HTMLDialogElement & { anchor?: Element | null }).anchor =
    buttonRef.current;
  const onClose = () => setOpen(false);
  popup.addEventListener("close", onClose);
  return () => popup.removeEventListener("close", onClose);
}, []);

<dialog
  ref={popupRef}
  is="fig-popup"
  variant="popover"
  position="bottom"
  offset="0 8"
  className="preferences-popup"
  open={open ? true : undefined}
>
  <fig-header>Preferences</fig-header>
  <fig-content>…</fig-content>
</dialog>
```

Set `anchor` as an element on the ref after mount (selector strings also work).

## Imperative refs

`useRef<HTMLElement>(null)` on hosts. Tooltips:

```tsx
tooltip.text = "Copied";
tooltip.showPopup?.();
tooltip.hidePopup?.();
```

Toasts: `toast.showToast()`. Lab reset: `host.resetToDefault()`.

## Light DOM

React owns child nodes. Components slot; they do not relocate children.

- `fig-menu` items; trigger gets `slot="trigger"`
- `fig-select-options slot="panel"`
- `fig-tabs` / `fig-toolbelt` / `fig-chooser` children
- media `slot="overlay"`
- fill custom `slot="mode-*"`

Do not `innerHTML` a tree React rendered. Do not reparent nodes React created. Children may arrive after `connectedCallback`; hosts already watch for that.
