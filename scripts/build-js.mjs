import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

const jobs = [
  { input: "fig-color.js" },
  { input: "src/core/entrypoints/fig-layer.js" },
  { input: "fig.js", external: ["fig-color.js"] },
  { input: "src/editor/entrypoints/fig-input-rotate.js", external: ["fig.js"] },
  { input: "src/lab/entrypoints/fig-input-slider.js", external: ["fig.js"] },
  { input: "src/editor/entrypoints/fig-property.js", external: ["fig.js"] },
  {
    input: "src/editor/entrypoints/fig-gradient-editor.js",
    external: ["fig.js", "fig-color.js"],
  },
  {
    input: "src/editor/entrypoints/fig-palette-editor.js",
    external: ["fig.js", "fig-color.js"],
  },
  { input: "src/editor/entrypoints/fig-popup-easing.js", external: ["fig.js"] },
  {
    input: "src/editor/entrypoints/fig-popup-gradient.js",
    external: ["fig.js", "fig-color.js"],
  },
  {
    input: "src/editor/entrypoints/fig-popup-palette.js",
    external: ["fig.js", "fig-color.js"],
  },
  {
    input: "fig-editor.js",
    external: ["fig.js", "fig-color.js"],
  },
  {
    input: "fig-lab.js",
    external: ["fig.js"],
  },
  {
    input: "register.js",
    external: ["fig.js", "fig-editor.js", "fig-lab.js"],
  },
];

function externalPlugin(files = []) {
  const externalFiles = new Set(files);
  return {
    name: "figui-public-externals",
    setup(build) {
      build.onResolve({ filter: /\.js$/ }, (args) => {
        const file = basename(args.path);
        if (!externalFiles.has(file)) return;
        return { path: `./${file}`, external: true };
      });
    },
  };
}

function normalizeExternalPaths(path, files = []) {
  let output = readFileSync(path, "utf8");
  for (const file of files) {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(
      new RegExp(`(["'])(?:\\.\\.\\/)+${escaped}\\1`, "g"),
      `$1./${file}$1`,
    );
  }
  writeFileSync(path, output);
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

for (const job of jobs) {
  const result = await Bun.build({
    entrypoints: [job.input],
    outdir: "dist",
    minify: true,
    plugins: [externalPlugin(job.external)],
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exitCode = 1;
    break;
  }

  for (const output of result.outputs) {
    normalizeExternalPaths(output.path, job.external);
    console.log(`${output.path} ${output.size} bytes`);
  }
}

for (const file of readdirSync("dist").filter((entry) => entry.endsWith(".js"))) {
  const output = readFileSync(join("dist", file), "utf8");
  if (/(?:from|import)\s*["']\.\.\//.test(output)) {
    throw new Error(`${file} contains a broken parent-relative dist import`);
  }
}
