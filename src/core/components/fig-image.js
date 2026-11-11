/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figDefineElement,
} from "../runtime/index.js";
import { FigMedia } from "./fig-media.js";

class FigImage extends FigMedia {
  get mediaKind() {
    return "image";
  }
}
figDefineElement("fig-image", FigImage);

export { FigImage };
