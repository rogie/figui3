/*!
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

/**
 * Canonical FigUI icon registry.
 *
 * `component` preserves the fig-icon mapping:
 * - a number uses one token for every component size
 * - an object maps the component's medium/small sizes independently
 * - omission keeps the asset available only as a CSS custom property
 */
export const FIG_ICON_MANIFEST = Object.freeze([
  { name: "add", sizes: [24], component: 24 },
  {
    name: "adjust",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "angle", sizes: [24], component: 24 },
  {
    name: "arrow-left",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "audio", sizes: [24], component: 24 },
  { name: "back", sizes: [24], component: 24 },
  {
    name: "checkmark",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "chevron",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "close",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "copy",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "detach", sizes: [16, 24] },
  { name: "download", sizes: [24], component: 24 },
  { name: "drag-handle", sizes: [16], component: 16 },
  {
    name: "edit",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "eyedropper", sizes: [24], component: 24 },
  { name: "forward", sizes: [24], component: 24 },
  {
    name: "globe",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "hidden",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "image", sizes: [24], component: 24 },
  { name: "minus", sizes: [24], component: 24 },
  { name: "moon", sizes: [24], component: 24 },
  {
    name: "more",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "pause", sizes: [24], component: 24 },
  { name: "play", sizes: [24], component: 24 },
  {
    name: "reset",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "rotate", sizes: [24], component: 24 },
  { name: "rotate3d", sizes: [24], component: 24 },
  { name: "search", sizes: [24], component: 24 },
  {
    name: "send",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "settings",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "sound",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "sound-off",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "spinner", sizes: [16, 24] },
  { name: "steppers", sizes: [24], component: 24 },
  { name: "sun", sizes: [24], component: 24 },
  { name: "swap", sizes: [24], component: 24 },
  {
    name: "trash",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  { name: "upload", sizes: [24], component: 24 },
  { name: "variable", sizes: [14, 16] },
  {
    name: "video",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "visible",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
  {
    name: "warning",
    sizes: [16, 24],
    component: { medium: 24, small: 16 },
  },
]);

const tokenName = (size, name) => `--icon-${size}-${name}`;

export const FIG_ICON_TOKENS = Object.freeze(
  Object.fromEntries(
    FIG_ICON_MANIFEST.filter((icon) => icon.component).map((icon) => {
      if (typeof icon.component === "number") {
        return [icon.name, tokenName(icon.component, icon.name)];
      }
      return [
        icon.name,
        Object.freeze({
          medium: tokenName(icon.component.medium, icon.name),
          small: tokenName(icon.component.small, icon.name),
        }),
      ];
    }),
  ),
);

export const FIG_ICON_SET_16 = Object.freeze(
  FIG_ICON_MANIFEST.filter(
    (icon) => icon.component && icon.sizes.includes(16),
  ).map((icon) => icon.name),
);

export const FIG_ICON_SET_24 = Object.freeze(
  FIG_ICON_MANIFEST.filter(
    (icon) => icon.component && icon.sizes.includes(24),
  ).map((icon) => icon.name),
);
