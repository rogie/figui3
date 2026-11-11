---
name: propskit
description: >-
  Guides declarative PropsKit property panels rendered from JSON-style FigUI3
  control definitions.
user-invocable: false
---

# PropsKit

Render subscribed property panels from JSON-style config using the Core-only
`@rogieking/figui3/propskit.js` entrypoint.

Core tags: `figui3` skill + [../figui3/components.md](../figui3/components.md).

## Principles

1. Use primitive shorthand where inference is sufficient.
2. Use explicit definitions for renderer choices and attributes.
3. Nest objects to create static `fig-group` sections. Add `_collapsed: false`
   for an initially open collapsible group or `_collapsed: true` for an
   initially closed one.
4. Subscribe for all value updates; use `onInput` for live user interactions and `onChange` for committed user interactions. Programmatic setters do not echo through those callbacks.
5. Destroy the kit and root when their owning view unmounts.

```js
import "@rogieking/figui3/fig.css";
import {
  figCreateProps,
  figCreatePropsRoot,
} from "@rogieking/figui3/propskit.js";

const kit = figCreateProps("Appearance", {
  opacity: 75,
  columns: { type: "number", default: 3, min: 1, max: 12 },
  width: { type: "number", control: "number", default: 320, units: "px" },
  visible: true,
  title: "Hello",
});

const root = figCreatePropsRoot({ target: "#properties", panelIds: [kit.id] });
const unsubscribe = kit.subscribe((values) => console.log(values));
```

On sliders, `stepper: true` enables stepper mode. Exact number controls
(`control: "number"`) show steppers by default; set `stepper: false` to hide
them.

Image and video controls always render a `fig-chooser`. The first tile uses
`upload="icon"` to upload one or more files, and `options` become selectable source tiles. Uploaded files
become panel-local choices at the beginning of the selectable list; the first
new upload is selected while the stored value remains one source string. Choosers
use one column with no media sources and two columns with one or more sources,
with a 12rem maximum height and native scrollbar overflow.
Audio alone supports `multiple` arrays.
