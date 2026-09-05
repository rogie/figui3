# React + FigUI3

FigUI3 is web components. Use the tags in JSX. There is no React wrapper package.

Shared by `figui3`, `fig-editor`, and `fig-lab`. Per-tag recipes: [components.md](components.md).

## Bootstrap

Register CSS + JS before the first render. Dynamic `import()` keeps bundlers from tree-shaking registration.

```tsx
import { createRoot } from "react-dom/client";
import "@rogieking/figui3/fig.css";

const bootstrap = async () => {
  await import("@rogieking/figui3/fig.js");
  createRoot(document.getElementById("app")!).render(<App />);
};

bootstrap();
```

Add editor and/or lab the same way, before render:

```tsx
import "@rogieking/figui3/fig-editor.css";
await import("@rogieking/figui3/fig-editor.js");

import "@rogieking/figui3/fig-lab.css";
await import("@rogieking/figui3/fig-lab.js");
```

SSR (Next/Remix/Astro): import the JS only on the client.

## JSX types

```ts
import "react";

type FigAttrs = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & { [key: string]: unknown };

type FigTag =
  | "fig-3d-rotate"
  | "fig-ai-context"
  | "fig-ai-prompt"
  | "fig-attachment"
  | "fig-attachments"
  | "fig-avatar"
  | "fig-button"
  | "fig-button-combo"
  | "fig-canvas-control"
  | "fig-card"
  | "fig-chat-message"
  | "fig-checkbox"
  | "fig-chit"
  | "fig-choice"
  | "fig-chooser"
  | "fig-color-tip"
  | "fig-combo-input"
  | "fig-content"
  | "fig-dropdown"
  | "fig-easing-curve"
  | "fig-field"
  | "fig-fill-picker"
  | "fig-footer"
  | "fig-group"
  | "fig-handle"
  | "fig-header"
  | "fig-icon"
  | "fig-image"
  | "fig-input-angle"
  | "fig-input-color"
  | "fig-input-combo"
  | "fig-input-file"
  | "fig-input-fill"
  | "fig-input-gradient"
  | "fig-input-number"
  | "fig-input-palette"
  | "fig-input-text"
  | "fig-input-wheel"
  | "fig-interpolation-swatch"
  | "fig-joystick"
  | "fig-layer"
  | "fig-media"
  | "fig-media-controls"
  | "fig-menu"
  | "fig-menu-item"
  | "fig-menu-separator"
  | "fig-options"
  | "fig-origin-grid"
  | "fig-preview"
  | "fig-radio"
  | "fig-reorder"
  | "fig-segment"
  | "fig-segmented-control"
  | "fig-select"
  | "fig-select-option"
  | "fig-select-options"
  | "fig-separator"
  | "fig-shimmer"
  | "fig-skeleton"
  | "fig-slider"
  | "fig-spinner"
  | "fig-swatch"
  | "fig-switch"
  | "fig-tab"
  | "fig-tab-content"
  | "fig-tabs"
  | "fig-tooltip"
  | "fig-truncate"
  | "fig-video"
  | "propskit-color"
  | "propskit-color-point"
  | "propskit-fill"
  | "propskit-gradient"
  | "propskit-group"
  | "propskit-number"
  | "propskit-oscillator"
  | "propskit-point-point"
  | "propskit-point-radius"
  | "propskit-point-radius-angle"
  | "propskit-position"
  | "propskit-select"
  | "propskit-slider"
  | "propskit-switch"
  | "propskit-text"
  | "propskit-wheel";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements
      extends Record<FigTag, FigAttrs> {
      dialog: React.DetailedHTMLProps<
        React.DialogHTMLAttributes<HTMLDialogElement>,
        HTMLDialogElement
      > & { is?: string; [key: string]: unknown };
    }
  }
}
```

## Host JSX

Render the custom elements as tags. Children are React nodes (`key` on lists). `className` works on `fig-*`, `propskit-*`, and `<dialog is="fig-…">`.

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

Passing `value` / `checked` as JSX props on re-render is OK. Components do not emit `input` from programmatic writes and ignore value writes during drag.

## Events

Use React handlers:

- `onClick` — `fig-button` and other clickable hosts
- `onInput` — live (`fig-switch`, `fig-slider`, number/color/text)
- `onChange` — commit (`fig-options`, `fig-dropdown`, often paired with `onInput`)

Read order:

1. `event.detail` (`.checked`, `.value`, or the detail payload)
2. `event.currentTarget.value` / `.checked`
3. `event.target.value`

```tsx
function readValue(event: Event) {
  const custom = event as CustomEvent<{ checked?: boolean; value?: unknown }>;
  const host = event.currentTarget as HTMLElement & {
    value?: unknown;
    checked?: boolean;
  };
  if (typeof custom.detail?.checked === "boolean") return custom.detail.checked;
  if (custom.detail?.value !== undefined) return custom.detail.value;
  if (custom.detail !== undefined && custom.detail !== null) return custom.detail;
  return host.value ?? host.checked;
}
```

Native `addEventListener` only when React does not map the event: dialog `close` / `cancel`, delegated host clicks, imperative APIs.

Common events: `input`, `change`, `loaded`, `optionhover`, `reorder`, `remove`, `modeready`, `webcamstream`, `close`.

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
- `fig-tabs` / `fig-chooser` children
- media `slot="overlay"`
- fill custom `slot="mode-*"`

Do not `innerHTML` a tree React rendered. Do not reparent nodes React created. Children may arrive after `connectedCallback`; hosts already watch for that.
