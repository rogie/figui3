export const LICENSE_MIT = "mit";
export const LICENSE_POLYFORM = "polyform";

export const rootArtifacts = [
  { file: "fig.js", license: LICENSE_MIT },
  { file: "register.js", license: LICENSE_MIT },
  { file: "propskit.js", license: LICENSE_MIT },
  { file: "fig-color.js", license: LICENSE_MIT },
  { file: "fig.css", license: LICENSE_MIT },
  { file: "base.css", license: LICENSE_MIT },
  { file: "components.css", license: LICENSE_MIT },
  { file: "icons.css", license: LICENSE_MIT },
  { file: "fig-editor.js", license: LICENSE_POLYFORM },
  { file: "fig-editor.css", license: LICENSE_POLYFORM },
  { file: "fig-lab.js", license: LICENSE_POLYFORM },
  { file: "fig-lab.css", license: LICENSE_POLYFORM },
];

export const jsArtifacts = [
  { input: "fig-color.js", output: "fig-color.js", license: LICENSE_MIT },
  {
    input: "src/core/entrypoints/fig-layer.js",
    output: "fig-layer.js",
    license: LICENSE_MIT,
  },
  {
    input: "fig.js",
    output: "fig.js",
    license: LICENSE_MIT,
    external: ["fig-color.js"],
  },
  {
    input: "src/editor/entrypoints/fig-input-rotate.js",
    output: "fig-input-rotate.js",
    license: LICENSE_POLYFORM,
    external: ["fig.js"],
  },
  {
    input: "src/lab/entrypoints/fig-input-slider.js",
    output: "fig-input-slider.js",
    license: LICENSE_POLYFORM,
    external: ["fig.js"],
  },
  {
    input: "src/core/entrypoints/fig-property.js",
    output: "fig-property.js",
    license: LICENSE_MIT,
    external: ["fig.js"],
  },
  {
    input: "fig-editor.js",
    output: "fig-editor.js",
    license: LICENSE_POLYFORM,
    external: ["fig.js", "fig-color.js"],
  },
  {
    input: "fig-lab.js",
    output: "fig-lab.js",
    license: LICENSE_POLYFORM,
    external: ["fig.js"],
  },
  {
    input: "register.js",
    output: "register.js",
    license: LICENSE_MIT,
    external: ["fig.js", "fig-editor.js", "fig-lab.js"],
  },
  {
    input: "propskit.js",
    output: "propskit.js",
    license: LICENSE_MIT,
    external: ["fig.js"],
  },
];

export const cssArtifacts = [
  { mode: "bundle", input: "fig.css", output: "fig.css", license: LICENSE_MIT },
  {
    mode: "bundle",
    input: "src/core/entrypoints/fig-layer.css",
    output: "fig-layer.css",
    license: LICENSE_MIT,
  },
  {
    mode: "bundle",
    input: "src/editor/entrypoints/fig-input-rotate.css",
    output: "fig-input-rotate.css",
    license: LICENSE_POLYFORM,
  },
  {
    mode: "bundle",
    input: "src/lab/entrypoints/fig-input-slider.css",
    output: "fig-input-slider.css",
    license: LICENSE_POLYFORM,
  },
  {
    mode: "bundle",
    input: "src/core/entrypoints/fig-property.css",
    output: "fig-property.css",
    license: LICENSE_MIT,
  },
  {
    mode: "bundle",
    input: "fig-editor.css",
    output: "fig-editor.css",
    license: LICENSE_POLYFORM,
  },
  {
    mode: "bundle",
    input: "fig-lab.css",
    output: "fig-lab.css",
    license: LICENSE_POLYFORM,
  },
  {
    mode: "bundle",
    input: "components.css",
    output: "components.css",
    license: LICENSE_MIT,
  },
  {
    mode: "transform",
    input: "icons.css",
    output: "icons.css",
    license: LICENSE_MIT,
  },
  {
    mode: "transform",
    input: "base.css",
    output: "base.css",
    license: LICENSE_MIT,
  },
];

export const publicAliases = {
  "fig-layer.js": "src/core/entrypoints/fig-layer.js",
  "fig-layer.css": "src/core/entrypoints/fig-layer.css",
  "fig-input-rotate.js": "src/editor/entrypoints/fig-input-rotate.js",
  "fig-input-rotate.css": "src/editor/entrypoints/fig-input-rotate.css",
  "fig-input-slider.js": "src/lab/entrypoints/fig-input-slider.js",
  "fig-input-slider.css": "src/lab/entrypoints/fig-input-slider.css",
  "fig-property.js": "src/core/entrypoints/fig-property.js",
  "fig-property.css": "src/core/entrypoints/fig-property.css",
};

export const obsoleteDistFiles = [
  "fig-gradient-editor.js",
  "fig-gradient-editor.css",
  "fig-palette-editor.js",
  "fig-palette-editor.css",
  "fig-popup-easing.js",
  "fig-popup-easing.css",
  "fig-popup-gradient.js",
  "fig-popup-gradient.css",
  "fig-popup-palette.js",
  "fig-popup-palette.css",
];

export const distArtifacts = [
  ...jsArtifacts.map(({ output, license }) => ({ file: output, license })),
  ...cssArtifacts.map(({ output, license }) => ({ file: output, license })),
];

export const rootAssetNames = rootArtifacts.map(({ file }) => file);
