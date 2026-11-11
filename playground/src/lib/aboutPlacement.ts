/** Where the playground surfaces package / build “About” content. */
export type AboutPlacement = "title" | "settings";

const PARAM = "about";

/** URL: `?about=settings` puts About under Preferences; default is title trigger popup. */
export function getAboutPlacement(): AboutPlacement {
  const value = new URLSearchParams(window.location.search).get(PARAM);
  return value === "settings" ? "settings" : "title";
}
