import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { bundle, transform } from "lightningcss";
import { cssArtifacts } from "./artifacts.mjs";

const options = {
  minify: true,
  drafts: { nesting: true },
};

mkdirSync("dist", { recursive: true });

for (const job of cssArtifacts) {
  const result =
    job.mode === "bundle"
      ? bundle({ filename: job.input, ...options })
      : transform({
          filename: job.input,
          code: readFileSync(job.input),
          ...options,
        });

  const output = `dist/${job.output}`;
  writeFileSync(output, result.code);
  console.log(`${output} ${result.code.length} bytes`);
}
