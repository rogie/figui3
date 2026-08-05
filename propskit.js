/**
 * PropsKit entry — one JS file for consumers.
 * Bundles fig + fig-lab + fig-editor + propskit-core.
 */
import "./fig-editor.js";

export {
  PROPSKIT_SCOPE_ROOT_CLASS,
  PROPSKIT_OVERLAY_ROOT_ATTR,
  applyFiguiTheme,
  syncOverlayTheme,
  inferControl,
  parseConfig,
  createPropsKit,
} from "./propskit-core.js";
