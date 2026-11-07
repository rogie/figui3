import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const rootAssetNames = [
  "fig.css",
  "fig.js",
  "fig-color.js",
  "fig-editor.css",
  "fig-editor.js",
  "fig-lab.css",
  "fig-lab.js",
  "base.css",
  "components.css",
  "icons.css",
];

const publicAliases = {
  "fig-layer.js": "src/core/entrypoints/fig-layer.js",
  "fig-layer.css": "src/core/entrypoints/fig-layer.css",
  "fig-input-rotate.js": "src/editor/entrypoints/fig-input-rotate.js",
  "fig-input-rotate.css": "src/editor/entrypoints/fig-input-rotate.css",
  "fig-property.js": "src/editor/entrypoints/fig-property.js",
  "fig-property.css": "src/editor/entrypoints/fig-property.css",
  "fig-gradient-editor.js": "src/editor/entrypoints/fig-gradient-editor.js",
  "fig-gradient-editor.css": "src/editor/entrypoints/fig-gradient-editor.css",
  "fig-palette-editor.js": "src/editor/entrypoints/fig-palette-editor.js",
  "fig-palette-editor.css": "src/editor/entrypoints/fig-palette-editor.css",
  "fig-popup-easing.js": "src/editor/entrypoints/fig-popup-easing.js",
  "fig-popup-easing.css": "src/editor/entrypoints/fig-popup-easing.css",
  "fig-popup-gradient.js": "src/editor/entrypoints/fig-popup-gradient.js",
  "fig-popup-gradient.css": "src/editor/entrypoints/fig-popup-gradient.css",
  "fig-popup-palette.js": "src/editor/entrypoints/fig-popup-palette.js",
  "fig-popup-palette.css": "src/editor/entrypoints/fig-popup-palette.css",
  "fig-input-slider.js": "src/lab/entrypoints/fig-input-slider.js",
  "fig-input-slider.css": "src/lab/entrypoints/fig-input-slider.css",
};

function listSourceAssets(directory = "src") {
  const absoluteDirectory = path.join(repoRoot, directory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const name = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceAssets(name);
    return /\.(?:css|js)$/.test(entry.name) ? [name] : [];
  });
}

const assetSources = new Map([
  ...rootAssetNames.map((name) => [name, name]),
  ...Object.entries(publicAliases),
  ...listSourceAssets().map((name) => [name, name]),
]);

const mimeTypes = {
  ".css": "text/css",
  ".js": "text/javascript",
};

function serveRepoAsset(req, res, next) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  const name = pathname.replace(/^\//, "");
  if (publicAliases[name]) {
    res.statusCode = 302;
    res.setHeader("Location", `/${publicAliases[name]}`);
    res.end();
    return;
  }
  const source = assetSources.get(name);
  if (!source) return next();

  const filePath = path.join(repoRoot, source);
  if (!filePath.startsWith(repoRoot + path.sep) || !fs.existsSync(filePath)) {
    return next();
  }

  const ext = path.extname(filePath);
  if (mimeTypes[ext]) res.setHeader("Content-Type", mimeTypes[ext]);
  fs.createReadStream(filePath).pipe(res);
}

/** Serve public FigUI asset names from root bundles or domain source entrypoints. */
export function figuiRepoAssets() {
  return {
    name: "figui-repo-assets",
    configureServer(server) {
      server.middlewares.use(serveRepoAsset);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveRepoAsset);
    },
    writeBundle() {
      for (const [name, sourcePath] of assetSources) {
        const filePath = path.join(repoRoot, sourcePath);
        const aliasSource = publicAliases[name]
          ? name.endsWith(".css")
            ? `@import url("./${sourcePath}");\n`
            : `export * from "./${sourcePath}";\n`
          : fs.readFileSync(filePath);
        this.emitFile({
          type: "asset",
          fileName: name,
          source: aliasSource,
        });
      }
    },
  };
}
