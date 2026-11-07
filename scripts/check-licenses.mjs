import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { basename, join } from "node:path";

const ROOT_MIT_FILES = new Set([
  "fig.js",
  "register.js",
  "fig-color.js",
  "fig.css",
  "base.css",
  "components.css",
  "icons.css",
]);

const ROOT_POLYFORM_FILES = new Set([
  "fig-editor.js",
  "fig-editor.css",
  "fig-lab.js",
  "fig-lab.css",
]);

const DIST_MIT_FILES = new Set([
  ...ROOT_MIT_FILES,
  "fig-layer.js",
  "fig-layer.css",
]);

const DIST_POLYFORM_FILES = new Set([
  ...ROOT_POLYFORM_FILES,
  "fig-input-rotate.js",
  "fig-input-rotate.css",
  "fig-input-slider.js",
  "fig-input-slider.css",
  "fig-property.js",
  "fig-property.css",
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
]);

const MIT_NOTICE = [
  "MIT License",
  "Copyright (c) 2026 Rogie King",
  "https://github.com/rogie/figui3/blob/main/LICENSE",
];

const POLYFORM_NOTICE = [
  "PolyForm Shield License 1.0.0",
  "https://polyformproject.org/licenses/shield/1.0.0",
  "Required Notice: Copyright (c) 2026 Rogie King",
  "Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)",
];

const ISC_NOTICE = [
  "ISC License",
  "Copyright (c) 2018, Andrea Giammarchi, @WebReflection",
  "Permission to use, copy, modify, and/or distribute this software",
  "THE SOFTWARE IS PROVIDED \"AS IS\"",
];

function fail(message) {
  throw new Error(`License check failed: ${message}`);
}

function read(path) {
  if (!existsSync(path)) fail(`missing ${path}`);
  return readFileSync(path, "utf8");
}

function assertContains(path, tokens) {
  const contents = read(path);
  for (const token of tokens) {
    if (!contents.includes(token)) fail(`${path} is missing ${JSON.stringify(token)}`);
  }
}

function listFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? listFiles(child) : [child];
  });
}

function listCodeFiles(path) {
  if (!existsSync(path)) fail(`missing ${path}`);
  return listFiles(path)
    .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
    .sort();
}

const rootCodeFiles = readdirSync(".")
  .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
  .sort();
const classifiedSourceFiles = new Set([
  ...ROOT_MIT_FILES,
  ...ROOT_POLYFORM_FILES,
]);
const classifiedDistFiles = new Set([
  ...DIST_MIT_FILES,
  ...DIST_POLYFORM_FILES,
]);

for (const file of rootCodeFiles) {
  if (!classifiedSourceFiles.has(file)) fail(`unclassified source file ${file}`);
}
for (const file of classifiedSourceFiles) {
  if (!rootCodeFiles.includes(file)) fail(`classification references missing source ${file}`);
}

for (const file of ROOT_MIT_FILES) assertContains(file, MIT_NOTICE);
for (const file of ROOT_POLYFORM_FILES) assertContains(file, POLYFORM_NOTICE);
assertContains("polyfills/custom-elements-webkit.js", ISC_NOTICE);

const license = read("LICENSE");
function licensePathIsDeclared(path) {
  return license.includes(path);
}

const sourceLicenseGroups = [
  { paths: ["src/shared/", "src/core/"], notice: MIT_NOTICE },
  { paths: ["src/editor/", "src/lab/"], notice: POLYFORM_NOTICE },
];
const nestedSourceFiles = [];
for (const group of sourceLicenseGroups) {
  for (const sourcePath of group.paths) {
    if (!licensePathIsDeclared(sourcePath)) {
      fail(`LICENSE does not classify ${sourcePath}`);
    }
    const files = listCodeFiles(sourcePath);
    nestedSourceFiles.push(...files);
    for (const file of files) assertContains(file, group.notice);
  }
}

const distCodeFiles = readdirSync("dist")
  .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
  .sort();

for (const file of distCodeFiles) {
  if (!classifiedDistFiles.has(basename(file))) fail(`unclassified dist file ${file}`);
}
for (const file of classifiedDistFiles) {
  assertContains(
    join("dist", file),
    DIST_MIT_FILES.has(file) ? MIT_NOTICE : POLYFORM_NOTICE,
  );
}
assertContains("dist/fig.js", ISC_NOTICE);

for (const file of classifiedDistFiles) {
  if (!license.includes(file)) fail(`LICENSE does not classify ${file}`);
}
const skillPaths = [
  ".cursor/skills/fig-editor/",
  ".cursor/skills/fig-lab/",
  "skills/fig-editor/",
  "skills/fig-lab/",
];
for (const skillPath of skillPaths) {
  if (!license.includes(skillPath)) fail(`LICENSE does not classify ${skillPath}`);
  for (const file of listFiles(skillPath)) {
    assertContains(file, POLYFORM_NOTICE);
  }
}
for (const token of [...MIT_NOTICE.slice(0, 2), ...POLYFORM_NOTICE, ...ISC_NOTICE]) {
  if (!license.includes(token)) fail(`LICENSE is missing ${JSON.stringify(token)}`);
}

for (const file of ["icons/manifest.js", "icons/manifest.d.ts"]) {
  assertContains(file, MIT_NOTICE);
}
if (!license.includes("icons/")) fail("LICENSE does not classify icons/");

const packageJson = JSON.parse(read("package.json"));
for (const file of rootCodeFiles) {
  if (!packageJson.files.includes(file)) fail(`package.json does not ship ${file}`);
}
for (const required of ["LICENSE", "README.md", "src/", "polyfills/", "dist/"]) {
  if (!packageJson.files.includes(required)) fail(`package.json does not ship ${required}`);
}

console.log(
  `License notices verified for ${rootCodeFiles.length + nestedSourceFiles.length} source and ${distCodeFiles.length} dist files.`,
);
