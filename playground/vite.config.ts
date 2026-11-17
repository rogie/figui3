import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { figuiRepoAssets } from "./vite-figui-assets.mjs";

const fromRepo = (path: string) => new URL(`../${path}`, import.meta.url).pathname;

export default defineConfig({
  plugins: [react(), svgr(), figuiRepoAssets()],
  resolve: {
    alias: {
      "@rogieking/figui3/fig.js": fromRepo("fig.js"),
      "@rogieking/figui3/fig.css": fromRepo("fig.css"),
      "@rogieking/figui3/fig-color.js": fromRepo("fig-color.js"),
      "@rogieking/figui3/extended-runtime.js": fromRepo(
        "src/core/entrypoints/extended-runtime.js",
      ),
      "@rogieking/figui3/propskit.js": fromRepo("propskit.js"),
      "@rogieking/figui3/fig-layer.js": fromRepo(
        "src/core/entrypoints/fig-layer.js",
      ),
      "@rogieking/figui3/fig-layer.css": fromRepo(
        "src/core/entrypoints/fig-layer.css",
      ),
    },
  },
  optimizeDeps: {
    exclude: ["@rogieking/figui3-extended"],
  },
  server: {
    port: 6600,
    fs: {
      allow: [".."],
    },
  },
});
