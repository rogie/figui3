/*!
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

export interface FigIconManifestEntry {
  readonly name: string;
  readonly sizes: readonly number[];
  readonly component?:
    | number
    | {
        readonly medium: number;
        readonly small: number;
      };
}

export const FIG_ICON_MANIFEST: readonly FigIconManifestEntry[];

export const FIG_ICON_TOKENS: Readonly<
  Record<
    string,
    | string
    | {
        readonly medium: string;
        readonly small: string;
      }
  >
>;

export const FIG_ICON_SET_16: readonly string[];
export const FIG_ICON_SET_24: readonly string[];
