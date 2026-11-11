import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  distArtifacts,
  jsArtifacts,
  obsoleteDistFiles,
  publicAliases,
  rootArtifacts,
} from "./artifacts.mjs";

function fail(message) {
  throw new Error(`Artifact check failed: ${message}`);
}

function assertFile(path) {
  if (!existsSync(path)) fail(`missing ${path}`);
}

function exportTargets(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(exportTargets);
}

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const targets = new Set([
  manifest.main,
  manifest.module,
  manifest.types,
  ...exportTargets(manifest.exports),
].filter(Boolean));

for (const target of targets) {
  assertFile(target.replace(/^\.\//, ""));
}

const expectedDist = distArtifacts.map(({ file }) => file).sort();
const actualDist = readdirSync("dist")
  .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
  .sort();
if (JSON.stringify(actualDist) !== JSON.stringify(expectedDist)) {
  fail(
    `dist inventory differs\nexpected ${expectedDist.join(", ")}\nactual ${actualDist.join(", ")}`,
  );
}

for (const file of obsoleteDistFiles) {
  if (existsSync(`dist/${file}`)) fail(`obsolete standalone output dist/${file}`);
}

for (const file of ["fig.js", "fig-editor.js"]) {
  const output = readFileSync(`dist/${file}`, "utf8");
  if (/["']\.\/fig-color\.js["']/.test(output)) {
    fail(`${file} must bundle fig-color.js instead of importing it`);
  }
}

for (const { file } of rootArtifacts) {
  assertFile(file);
  if (!manifest.files.includes(file)) {
    fail(`package.json files does not include ${file}`);
  }
}

for (const [name, source] of Object.entries(publicAliases)) {
  assertFile(source);
  const exported = manifest.exports[`./src/${name}`];
  if (exported !== `./${source}`) {
    fail(`./src/${name} must export ./${source}`);
  }
}

for (const { output } of jsArtifacts) {
  await import(`${pathToFileURL(resolve("dist", output)).href}?artifact-check`);
}

console.log(
  `Artifact inventory verified: ${expectedDist.length} dist files, ${targets.size} package targets.`,
);
