export type QuickstartSection = {
  id: string;
  name: string;
  title: string;
  description: string;
  /** Host-page docs markup (no live panel chrome). */
  docs: string;
};

/** Same property set used by the live panel + every framework example. */
export const LAYER_CONFIG_SOURCE = `const layerConfig = {
  name: { type: 'text', default: 'Layer 1', placeholder: 'Enter a name' },
  opacity: [75, 0, 100, 1],          // slider: [value, min, max, step?]
  visible: true,                     // switch
  fill: '#0D99FF',                   // color (hex)
  blend: {
    type: 'select',
    options: ['Normal', 'Multiply', 'Screen', 'Overlay'],
    default: 'Normal',
  },
  rotation: [0, -180, 180, 1],
  cornerRadius: [8, 0, 64, 1],
  easing: { type: 'easing', value: [0.4, 0, 0.2, 1] },
  shadow: {
    _collapsed: true,                // folder
    offsetY: [8, 0, 24, 1],
    blur: [16, 0, 48, 1],
    color: '#000000',
  },
  reset: { type: 'action' },
}`;

/** Single floating Properties panel shown for the whole quickstart page. */
export const QUICKSTART_PANEL_MARKUP = `<fig-panel theme="system" id="quickstart-properties-panel" class="propskit-quickstart-panel">
  <propskit-text label="Name" value="Layer 1" placeholder="Enter a name"></propskit-text>
  <propskit-slider label="Opacity" value="75" min="0" max="100" units="%"></propskit-slider>
  <propskit-switch label="Visible" checked></propskit-switch>
  <propskit-color label="Fill" value="#0D99FF"></propskit-color>
  <propskit-select label="Blend" value="Normal" options="Normal,Multiply,Screen,Overlay"></propskit-select>
  <propskit-slider label="Rotation" value="0" min="-180" max="180"></propskit-slider>
  <propskit-slider label="Corner Radius" value="8" min="0" max="64"></propskit-slider>
  <propskit-group name="Shadow" open="false">
    <propskit-slider label="Offset Y" value="8" min="0" max="24"></propskit-slider>
    <propskit-slider label="Blur" value="16" min="0" max="48"></propskit-slider>
    <propskit-color label="Color" value="#000000"></propskit-color>
  </propskit-group>
</fig-panel>`;

function pre(code: string) {
  return `<pre>${code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;
}

const REACT_EXAMPLE = `import { useEffect, useRef, useState } from 'react'
import '@rogieking/figui3/propskit.css'
import { createPropsKit } from '@rogieking/figui3/propskit.js'

${LAYER_CONFIG_SOURCE}

export function LayerProperties() {
  const mountRef = useRef(null)
  const kitRef = useRef(null)
  const [values, setValues] = useState({})

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const kit = createPropsKit(el, 'Layer', layerConfig, {
      theme: 'system',
      onChange: (path, value, all) => {
        setValues(all)
        console.log(path, value, all)
      },
      onAction: (name) => {
        if (name === 'reset') kit.set('opacity', 75)
      },
    })
    kitRef.current = kit
    setValues(kit.values)

    return () => kit.destroy()
  }, [])

  return (
    <>
      <aside ref={mountRef} />
      <p>{values.name} · {values.opacity}% · {values.fill}</p>
    </>
  )
}`;

const VUE_EXAMPLE = `<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import '@rogieking/figui3/propskit.css'
import { createPropsKit } from '@rogieking/figui3/propskit.js'

${LAYER_CONFIG_SOURCE}

const mount = ref(null)
const values = ref({})
let kit

onMounted(() => {
  kit = createPropsKit(mount.value, 'Layer', layerConfig, {
    theme: 'system',
    onChange: (path, value, all) => {
      values.value = all
      console.log(path, value, all)
    },
    onAction: (name) => {
      if (name === 'reset') kit.set('opacity', 75)
    },
  })
  values.value = kit.values
})

onBeforeUnmount(() => kit?.destroy())
</script>

<template>
  <aside ref="mount" />
  <p>{{ values.name }} · {{ values.opacity }}% · {{ values.fill }}</p>
</template>`;

const SVELTE_EXAMPLE = `<script>
  import { onMount } from 'svelte'
  import '@rogieking/figui3/propskit.css'
  import { createPropsKit } from '@rogieking/figui3/propskit.js'

  ${LAYER_CONFIG_SOURCE}

  let mount
  let values = $state({})
  let kit

  onMount(() => {
    kit = createPropsKit(mount, 'Layer', layerConfig, {
      theme: 'system',
      onChange: (path, value, all) => {
        values = all
        console.log(path, value, all)
      },
      onAction: (name) => {
        if (name === 'reset') kit.set('opacity', 75)
      },
    })
    values = kit.values
    return () => kit.destroy()
  })
</script>

<aside bind:this={mount}></aside>
<p>{values.name} · {values.opacity}% · {values.fill}</p>`;

const SOLID_EXAMPLE = `import { createSignal, onCleanup, onMount } from 'solid-js'
import '@rogieking/figui3/propskit.css'
import { createPropsKit } from '@rogieking/figui3/propskit.js'

${LAYER_CONFIG_SOURCE}

export function LayerProperties() {
  let mount
  const [values, setValues] = createSignal({})
  let kit

  onMount(() => {
    kit = createPropsKit(mount, 'Layer', layerConfig, {
      theme: 'system',
      onChange: (path, value, all) => {
        setValues(all)
        console.log(path, value, all)
      },
      onAction: (name) => {
        if (name === 'reset') kit.set('opacity', 75)
      },
    })
    setValues(kit.values)
  })

  onCleanup(() => kit?.destroy())

  return (
    <>
      <aside ref={(el) => (mount = el)} />
      <p>
        {values().name} · {values().opacity}% · {values().fill}
      </p>
    </>
  )
}`;

const VANILLA_EXAMPLE = `import '@rogieking/figui3/propskit.css'
import { createPropsKit } from '@rogieking/figui3/propskit.js'

${LAYER_CONFIG_SOURCE}

const kit = createPropsKit(document.querySelector('#panel'), 'Layer', layerConfig, {
  theme: 'system',
  onChange: (path, value, values) => {
    console.log(path, value, values)
  },
  onAction: (name) => {
    if (name === 'reset') kit.set('opacity', 75)
  },
})

kit.subscribe((values) => {
  console.log(values.name, values.opacity, values.fill)
})`;

export const quickstartSections: QuickstartSection[] = [
  {
    id: "install",
    name: "Install",
    title: "Install PropsKit",
    description: "One CSS + one JS import for embeds.",
    docs: `<div class="propskit-quickstart-copy">
  ${pre(`npm install @rogieking/figui3`)}
  <p>One CSS + one JS (compiled from fig + fig-lab + fig-editor):</p>
  ${pre(`import '@rogieking/figui3/propskit.css'
import '@rogieking/figui3/propskit.js'`)}
  <p>Mark a panel root (theme defaults to <code>system</code>):</p>
  ${pre(`<aside class="figui-root" theme="system">…</aside>
<!-- or -->
<fig-panel theme="dark">…</fig-panel>`)}
</div>`,
  },
  {
    id: "scoped-vs-bleed",
    name: "Scoped vs bleed",
    title: "Scoped vs bleed",
    description:
      "Host controls outside .figui-root stay unstyled; the Properties dialog uses PropsKit chrome.",
    docs: `<div class="propskit-quickstart-copy">
  <p>Host UI below is plain HTML. The floating <code>fig-dialog</code> on the right is the PropsKit root.</p>
</div>`,
  },
  {
    id: "theme",
    name: "Theme",
    title: "Theme",
    description:
      "Default system; force light or dark with the theme attribute. Popups follow the panel.",
    docs: `<div class="propskit-quickstart-copy">
  ${pre(`<dialog is="fig-dialog" class="figui-root" theme="system">…</dialog>`)}
  <p>Use the host theme control above (or <code>applyFiguiTheme(el, 'dark')</code>) to switch the panel + overlay popups.</p>
</div>`,
  },
  {
    id: "compose",
    name: "Compose a panel",
    title: "Compose a panel",
    description: "Hand-authored propskit-* rows for common property controls.",
    docs: `<div class="propskit-quickstart-copy">
  ${pre(`<fig-panel theme="system">
  <propskit-text label="Name" value="Layer 1" placeholder="Enter a name"></propskit-text>
  <propskit-slider label="Opacity" value="75" min="0" max="100" units="%"></propskit-slider>
  <propskit-switch label="Visible" checked></propskit-switch>
  <propskit-color label="Fill" value="#0D99FF"></propskit-color>
  <propskit-select label="Blend" value="Normal" options="Normal,Multiply,Screen,Overlay"></propskit-select>
  <propskit-slider label="Rotation" value="0" min="-180" max="180"></propskit-slider>
  <propskit-slider label="Corner Radius" value="8" min="0" max="64"></propskit-slider>
</fig-panel>`)}
</div>`,
  },
  {
    id: "folders",
    name: "Folders / groups",
    title: "Folders / groups",
    description: "Nest controls in propskit-group.",
    docs: `<div class="propskit-quickstart-copy">
  ${pre(`<propskit-group name="Shadow" open="false">
  <propskit-slider label="Offset Y" value="8" min="0" max="24"></propskit-slider>
  <propskit-slider label="Blur" value="16" min="0" max="48"></propskit-slider>
  <propskit-color label="Color" value="#000000"></propskit-color>
</propskit-group>`)}
</div>`,
  },
  {
    id: "events",
    name: "Listen to values",
    title: "Listen to values",
    description: "Single container listener for input/change events.",
    docs: `<div class="propskit-quickstart-copy">
  <p>Interact with the Properties panel — events stream here:</p>
  <pre id="quickstart-events-log" class="propskit-quickstart-log">Listening for input/change…</pre>
  ${pre(`panel.addEventListener('change', (e) => {
  console.log(e.target, e.detail)
})`)}
</div>`,
  },
  {
    id: "config",
    name: "Config API",
    title: "Config API",
    description:
      "One config object → full panel. Same properties used by every framework example below.",
    docs: `<div class="propskit-quickstart-copy">
  ${pre(`import { createPropsKit } from '@rogieking/figui3/propskit.js'

${LAYER_CONFIG_SOURCE}

createPropsKit(mountEl, 'Layer', layerConfig, {
  theme: 'system',
  onChange: (path, value, values) => console.log(path, value, values),
  onAction: (name) => console.log('action', name),
})`)}
</div>`,
  },
  {
    id: "frameworks",
    name: "Frameworks",
    title: "Frameworks",
    description:
      "One import (`propskit.js`) — mount it from React, Vue, Svelte, Solid, or plain JS.",
    docs: `<div class="propskit-quickstart-copy propskit-quickstart-frameworks">
  <p>Every example imports <code>createPropsKit</code> from <code>@rogieking/figui3/propskit.js</code> and uses the same <code>layerConfig</code>.</p>

  <h3>React</h3>
  ${pre(REACT_EXAMPLE)}

  <h3>Vue</h3>
  ${pre(VUE_EXAMPLE)}

  <h3>Svelte</h3>
  ${pre(SVELTE_EXAMPLE)}

  <h3>Solid</h3>
  ${pre(SOLID_EXAMPLE)}

  <h3>Vanilla</h3>
  ${pre(VANILLA_EXAMPLE)}
</div>`,
  },
];
