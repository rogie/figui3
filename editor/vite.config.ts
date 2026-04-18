import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync } from "fs";

function serveFigAssets(): Plugin {
  const repoRoot = resolve(__dirname, "..");
  return {
    name: "serve-fig-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/fig.js" || req.url === "/fig.css" || req.url === "/base.css" || req.url === "/components.css") {
          const filePath = resolve(repoRoot, req.url.slice(1));
          try {
            const content = readFileSync(filePath, "utf-8");
            const ext = req.url.endsWith(".css") ? "text/css" : "application/javascript";
            res.setHeader("Content-Type", ext);
            res.end(content);
          } catch {
            next();
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveFigAssets()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/standalone.tsx"),
      formats: ["es"],
      fileName: () => "editor.js",
    },
    outDir: resolve(__dirname, "../dist"),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
});
