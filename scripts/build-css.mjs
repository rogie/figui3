import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { bundle, transform } from "lightningcss";

const jobs = [
  { mode: "bundle", input: "fig.css", output: "dist/fig.css" },
  { mode: "bundle", input: "fig-layer.css", output: "dist/fig-layer.css" },
  { mode: "bundle", input: "fig-editor.css", output: "dist/fig-editor.css" },
  { mode: "bundle", input: "fig-lab.css", output: "dist/fig-lab.css" },
  { mode: "bundle", input: "components.css", output: "dist/components.css" },
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
