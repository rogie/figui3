import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { jsArtifacts, obsoleteDistFiles } from "./artifacts.mjs";

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

mkdirSync("dist", { recursive: true });
for (const file of [...jsArtifacts.map(({ output }) => output), ...obsoleteDistFiles]) {
  rmSync(join("dist", file), { force: true });
}

for (const job of jsArtifacts) {
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
    if (basename(output.path) !== job.output) {
      throw new Error(
        `${job.input} emitted ${basename(output.path)}; expected ${job.output}`,
      );
    }
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
