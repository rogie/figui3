import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { figuiRepoAssets } from "./vite-figui-assets.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Run git argv from the monorepo root; empty string on failure. Avoids shell. */
function git(args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/** Turn `git+https://github.com/org/repo.git` into an https browse URL. */
function normalizeRepoUrl(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/^git\+/, "")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "");
}

type RootPackageJson = {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  repository?: string | { type?: string; url?: string };
};

const packageJson = JSON.parse(
  readFileSync(resolve(rootDir, "package.json"), "utf8"),
) as RootPackageJson;

const repositoryUrl =
  typeof packageJson.repository === "string"
    ? packageJson.repository
    : packageJson.repository?.url;

// Bake package.json + checkout metadata into the playground About popup.
const figuiBuildInfo = {
  name: packageJson.name ?? "@rogieking/figui3",
  version: packageJson.version ?? "0.0.0",
  description: packageJson.description ?? "",
  author: packageJson.author ?? "",
  repositoryUrl: normalizeRepoUrl(repositoryUrl),
  sha: git(["rev-parse", "--short", "HEAD"]) || "unknown",
  branch: git(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown",
  // Wall-clock time when Vite loads (dev server start or production build).
  builtAt: new Date().toISOString(),
};

export default defineConfig({
  plugins: [react(), svgr(), figuiRepoAssets()],
  define: {
    __FIGUI_BUILD_INFO__: JSON.stringify(figuiBuildInfo),
  },
  server: {
    port: 6600,
    fs: {
      allow: [".."],
    },
  },
});
