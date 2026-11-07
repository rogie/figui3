import { access, readdir, readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { expect, test } from "@playwright/test";
import { editorComponentContracts } from "../../playground/src/testing/componentManifest";

const readWorkspaceFile = (path: string) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");

const sourceRoots = ["src/core", "src/editor", "src/lab"];

async function sourceFiles(roots = sourceRoots) {
  const files: string[] = [];
  const visit = async (path: string) => {
    const entries = await readdir(new URL(`../../${path}/`, import.meta.url), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) await visit(child);
      else if (entry.name.endsWith(".js")) files.push(child);
    }
  };
  for (const root of roots) await visit(root);
  return files.sort();
}

const customizedBuiltIns = new Set([
  "fig-dialog",
  "fig-popup",
  "fig-popup-easing",
  "fig-popup-gradient",
  "fig-popup-palette",
  "fig-toast",
]);

const registrationPattern =
  /(?:figDefineElement|figDefineCustomizedBuiltIn|figEditorDefineElement|figLabDefineElement|defineElement|customElements\.define)\(\s*"([^"]+)"/g;

test("declarations cover every registered autonomous custom element", async () => {
  const autonomousSources = await sourceFiles();
  const [sources, declarations] = await Promise.all([
    Promise.all(autonomousSources.map(readWorkspaceFile)),
    readWorkspaceFile("types/index.d.ts"),
  ]);
  const registered = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(registrationPattern)) {
      if (!customizedBuiltIns.has(match[1])) registered.add(match[1]);
    }
  }

  const declared = new Set(
    Array.from(
      declarations.matchAll(/^\s*"([^"]+)":\s+Fig\w+/gm),
      (match) => match[1],
    ),
  );
  expect([...registered].sort()).toEqual([...declared].sort());
  expect(declared.has("fig-toast")).toBe(false);
  expect(declared.has("fig-stack")).toBe(true);
  expect(declared.has("fig-audio-waveform")).toBe(true);
  expect(declared.has("fig-input-slider-wheel")).toBe(true);
});

test("every registered tag owns a matching JavaScript and CSS pair", async () => {
  for (const file of await sourceFiles()) {
    const source = await readWorkspaceFile(file);
    for (const match of source.matchAll(registrationPattern)) {
      const tag = match[1];
      expect(basename(file), `${tag} registration owner`).toBe(`${tag}.js`);
      expect(dirname(file).endsWith("/components"), `${tag} source directory`).toBe(
        true,
      );
      await access(
        new URL(`../../${dirname(file)}/${tag}.css`, import.meta.url),
      );
    }
  }
});

test("component directories contain only paired per-tag modules", async () => {
  for (const domain of ["core", "editor", "lab"]) {
    const entries = await readdir(
      new URL(`../../src/${domain}/components/`, import.meta.url),
      { withFileTypes: true },
    );
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
    for (const file of files) {
      expect(file, `${domain} component filename`).toMatch(
        /^fig-[a-z0-9-]+\.(?:css|js)$/,
      );
    }
    const scripts = files
      .filter((file) => file.endsWith(".js"))
      .map((file) => file.slice(0, -3));
    const styles = files
      .filter((file) => file.endsWith(".css"))
      .map((file) => file.slice(0, -4));
    expect(scripts, `${domain} JavaScript/CSS pairs`).toEqual(styles);
    for (const component of scripts) {
      const source = await readWorkspaceFile(
        `src/${domain}/components/${component}.js`,
      );
      const registrations = Array.from(
        source.matchAll(registrationPattern),
        (match) => match[1],
      );
      expect(registrations, `${component}.js registration`).toEqual([
        component,
      ]);
    }
  }
});

test("npm manifest publishes DOM, React, and module declarations", async () => {
  const manifest = JSON.parse(await readWorkspaceFile("package.json"));
  expect(manifest.types).toBe("types/index.d.ts");
  expect(manifest.files).toContain("types/");
  expect(manifest.exports["."].types).toBe("./types/index.d.ts");
  expect(manifest.exports["./react"].types).toBe("./types/react.d.ts");
  expect(manifest.exports["./fig-color.js"].types).toBe(
    "./types/fig-color.d.ts",
  );
  expect(manifest.exports["./fig-input-slider.js"].types).toBe(
    "./types/fig-input-slider.d.ts",
  );
  expect(manifest.exports["./icons.css"]).toBe("./dist/icons.css");
  expect(manifest.exports["./src/icons.css"]).toBe("./icons.css");
  expect(manifest.exports["./src/fig-layer.js"]).toBe(
    "./src/core/entrypoints/fig-layer.js",
  );
  expect(manifest.exports["./src/fig-input-rotate.js"]).toBe(
    "./src/editor/entrypoints/fig-input-rotate.js",
  );
  expect(manifest.exports["./src/fig-input-slider.js"]).toBe(
    "./src/lab/entrypoints/fig-input-slider.js",
  );
  expect(manifest.exports["./src/fig-property.js"]).toBe(
    "./src/editor/entrypoints/fig-property.js",
  );
  expect(manifest.files).toContain("icons.css");
  expect(manifest.files).toContain("icons/manifest.js");
  expect(manifest.files).toContain("icons/manifest.d.ts");
  expect(manifest.files).toContain("src/");
  expect(manifest.files).not.toContain("fig-property.js");
  expect(manifest.files).not.toContain("fig-input-slider.css");
});

test("editor registrations all have shared component contracts", async () => {
  const sources = await Promise.all(
    (await sourceFiles(["src/editor"])).map(readWorkspaceFile),
  );
  const registered = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(registrationPattern)) {
      registered.add(match[1]);
    }
  }

  expect(editorComponentContracts.map((contract) => contract.tag).sort()).toEqual(
    [...registered].sort(),
  );
});
