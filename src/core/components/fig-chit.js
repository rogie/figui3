/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figDefineElement,
} from "../runtime/index.js";
import { FigSwatch } from "./fig-swatch.js";

// Backwards-compatible alias. Custom element constructors cannot be registered
// under multiple tag names, so the legacy tag uses an otherwise empty subclass.
class FigChit extends FigSwatch {}
figDefineElement("fig-chit", FigChit);

export { FigChit };
