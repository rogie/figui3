declare module "*.css";
declare module "../../fig.js";
declare module "../../fig-layer.js";
declare module "../../fig-editor.js";
declare module "../../../fig-editor.js";
declare module "../../fig-lab.js";
declare module "../../propskit.js";
declare module "../../dist/propskit.css";

interface Window {
  createPropsKit?: typeof import("../../../propskit-core.js").createPropsKit;
  applyFiguiTheme?: typeof import("../../../propskit-core.js").applyFiguiTheme;
}
