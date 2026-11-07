import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { bundle, transform } from "lightningcss";

const jobs = [
  { mode: "bundle", input: "fig.css", output: "dist/fig.css" },
  { mode: "bundle", input: "src/core/entrypoints/fig-layer.css", output: "dist/fig-layer.css" },
  { mode: "bundle", input: "src/editor/entrypoints/fig-input-rotate.css", output: "dist/fig-input-rotate.css" },
  { mode: "bundle", input: "src/lab/entrypoints/fig-input-slider.css", output: "dist/fig-input-slider.css" },
  { mode: "bundle", input: "src/editor/entrypoints/fig-property.css", output: "dist/fig-property.css" },
  { mode: "bundle", input: "src/editor/entrypoints/fig-gradient-editor.css", output: "dist/fig-gradient-editor.css" },
  { mode: "bundle", input: "src/editor/entrypoints/fig-palette-editor.css", output: "dist/fig-palette-editor.css" },
  { mode: "bundle", input: "src/editor/entrypoints/fig-popup-easing.css", output: "dist/fig-popup-easing.css" },
  { mode: "bundle", input: "src/editor/entrypoints/fig-popup-gradient.css", output: "dist/fig-popup-gradient.css" },
  { mode: "bundle", input: "src/editor/entrypoints/fig-popup-palette.css", output: "dist/fig-popup-palette.css" },
  { mode: "bundle", input: "fig-editor.css", output: "dist/fig-editor.css" },
  { mode: "bundle", input: "fig-lab.css", output: "dist/fig-lab.css" },
  { mode: "bundle", input: "components.css", output: "dist/components.css" },
  { mode: "transform", input: "icons.css", output: "dist/icons.css" },
  { mode: "transform", input: "base.css", output: "dist/base.css" },
];

const options = {
  minify: true,
  drafts: { nesting: true },
};

mkdirSync("dist", { recursive: true });

for (const job of jobs) {
  const result =
    job.mode === "bundle"
      ? bundle({ filename: job.input, ...options })
      : transform({
          filename: job.input,
          code: readFileSync(job.input),
          ...options,
        });

  writeFileSync(job.output, result.code);
  console.log(`${job.output} ${result.code.length} bytes`);
}
