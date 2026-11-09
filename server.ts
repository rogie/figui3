import { resolve, sep } from "node:path";
import {
  publicAliases,
  rootAssetNames,
} from "./scripts/artifacts.mjs";

const repoRoot = resolve(import.meta.dir);
const rootAssets = new Set(["index.html", ...rootAssetNames]);
const allowedDirectories = ["dist", "icons", "polyfills", "src", "tests"];
const requestedPort = Number.parseInt(process.env.FIGUI_PORT ?? "3000", 10);
const port = Number.isFinite(requestedPort) ? requestedPort : 3000;

function resolvePublicAsset(pathname: string) {
  const name = pathname.replace(/^\/+/, "");
  const allowed =
    rootAssets.has(name) ||
    allowedDirectories.some(
      (directory) => name === directory || name.startsWith(`${directory}/`),
    );
  if (!allowed) return null;
  const filePath = resolve(repoRoot, name);
  return filePath.startsWith(`${repoRoot}${sep}`) ? filePath : null;
}

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;
    
    // Default to index.html
    if (path === "/") {
      path = "/index.html";
    }
    const name = path.replace(/^\/+/, "");
    const sourceAlias = publicAliases[name];
    if (sourceAlias) {
      return Response.redirect(new URL(`/${sourceAlias}`, url), 302);
    }

    const filePath = resolvePublicAsset(path);
    if (!filePath) return new Response("Not Found", { status: 404 });
    const file = Bun.file(filePath);
    
    if (await file.exists()) {
      return new Response(file);
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🎨 FigUI Dev Server running at http://localhost:${server.port}`);
