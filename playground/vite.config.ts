import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { figuiRepoAssets } from "./vite-figui-assets.mjs";

export default defineConfig({
  plugins: [react(), svgr(), figuiRepoAssets()],
  server: {
    port: 6600,
    fs: {
      allow: [".."],
    },
  },
});
