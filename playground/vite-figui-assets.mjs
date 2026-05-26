import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const assetNames = ["fig.css", "fig.js", "base.css", "components.css"];

const mimeTypes = {
  ".css": "text/css",
  ".js": "text/javascript",
};

function serveRepoAsset(req, res, next) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  const name = pathname.replace(/^\//, "");
  if (!assetNames.includes(name)) return next();

  const filePath = path.join(repoRoot, name);
  if (!filePath.startsWith(repoRoot + path.sep) || !fs.existsSync(filePath)) {
    return next();
  }

  const ext = path.extname(filePath);
  if (mimeTypes[ext]) res.setHeader("Content-Type", mimeTypes[ext]);
  fs.createReadStream(filePath).pipe(res);
}

/** Serve repo-root fig assets at /fig.css, /fig.js, etc. (dev, preview, and build output). */
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
      for (const name of assetNames) {
        const filePath = path.join(repoRoot, name);
        this.emitFile({
          type: "asset",
          fileName: name,
          source: fs.readFileSync(filePath),
        });
      }
    },
  };
}
