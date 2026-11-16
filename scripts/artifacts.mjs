export const LICENSE_MIT = "mit";

export const rootArtifacts = [
  { file: "fig.js", license: LICENSE_MIT },
  { file: "register.js", license: LICENSE_MIT },
  { file: "propskit.js", license: LICENSE_MIT },
  { file: "fig-color.js", license: LICENSE_MIT },
  { file: "fig.css", license: LICENSE_MIT },
  { file: "base.css", license: LICENSE_MIT },
  { file: "components.css", license: LICENSE_MIT },
  { file: "icons.css", license: LICENSE_MIT },
];

export const jsArtifacts = [
  { input: "fig-color.js", output: "fig-color.js", license: LICENSE_MIT },
  {
    input: "src/core/entrypoints/extended-runtime.js",
    output: "extended-runtime.js",
    license: LICENSE_MIT,
  },
  {
    input: "src/core/entrypoints/fig-layer.js",
    output: "fig-layer.js",
    license: LICENSE_MIT,
  },
  {
    input: "fig.js",
    output: "fig.js",
    license: LICENSE_MIT,
  },
  {
    input: "src/core/entrypoints/fig-property.js",
    output: "fig-property.js",
    license: LICENSE_MIT,
    external: ["fig.js"],
  },
  {
    input: "register.js",
    output: "register.js",
    license: LICENSE_MIT,
    external: ["fig.js"],
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
    input: "src/core/entrypoints/fig-property.css",
    output: "fig-property.css",
    license: LICENSE_MIT,
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
  "extended-runtime.js": "src/core/entrypoints/extended-runtime.js",
  "fig-layer.js": "src/core/entrypoints/fig-layer.js",
  "fig-layer.css": "src/core/entrypoints/fig-layer.css",
  "fig-property.js": "src/core/entrypoints/fig-property.js",
  "fig-property.css": "src/core/entrypoints/fig-property.css",
};

export const obsoleteDistFiles = [
  "fig-editor.js",
  "fig-editor.css",
  "fig-lab.js",
  "fig-lab.css",
  "fig-input-rotate.js",
  "fig-input-rotate.css",
  "fig-input-slider.js",
  "fig-input-slider.css",
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
