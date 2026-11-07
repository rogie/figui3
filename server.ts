const sourceAliases = new Map([
  ["/fig-layer.js", "/src/core/entrypoints/fig-layer.js"],
  ["/fig-layer.css", "/src/core/entrypoints/fig-layer.css"],
  ["/fig-input-rotate.js", "/src/editor/entrypoints/fig-input-rotate.js"],
  ["/fig-input-rotate.css", "/src/editor/entrypoints/fig-input-rotate.css"],
  ["/fig-property.js", "/src/editor/entrypoints/fig-property.js"],
  ["/fig-property.css", "/src/editor/entrypoints/fig-property.css"],
  ["/fig-gradient-editor.js", "/src/editor/entrypoints/fig-gradient-editor.js"],
  ["/fig-gradient-editor.css", "/src/editor/entrypoints/fig-gradient-editor.css"],
  ["/fig-palette-editor.js", "/src/editor/entrypoints/fig-palette-editor.js"],
  ["/fig-palette-editor.css", "/src/editor/entrypoints/fig-palette-editor.css"],
  ["/fig-popup-easing.js", "/src/editor/entrypoints/fig-popup-easing.js"],
  ["/fig-popup-easing.css", "/src/editor/entrypoints/fig-popup-easing.css"],
  ["/fig-popup-gradient.js", "/src/editor/entrypoints/fig-popup-gradient.js"],
  ["/fig-popup-gradient.css", "/src/editor/entrypoints/fig-popup-gradient.css"],
  ["/fig-popup-palette.js", "/src/editor/entrypoints/fig-popup-palette.js"],
  ["/fig-popup-palette.css", "/src/editor/entrypoints/fig-popup-palette.css"],
  ["/fig-input-slider.js", "/src/lab/entrypoints/fig-input-slider.js"],
  ["/fig-input-slider.css", "/src/lab/entrypoints/fig-input-slider.css"],
]);

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;
    
    // Default to index.html
    if (path === "/") {
      path = "/index.html";
    }
    const sourceAlias = sourceAliases.get(path);
    if (sourceAlias) {
      return Response.redirect(new URL(sourceAlias, url), 302);
    }
    
    const file = Bun.file(`.${path}`);
    
    if (await file.exists()) {
      return new Response(file);
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🎨 FigUI Dev Server running at http://localhost:${server.port}`);
