/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figDefineElement,
} from "../runtime/index.js";
import { FigShimmer } from "./fig-shimmer.js";

// FigSkeleton
class FigSkeleton extends FigShimmer {
  connectedCallback() {
    super.connectedCallback();
    this.inert = true;
    this.setAttribute("inert", "");
  }
}
figDefineElement("fig-skeleton", FigSkeleton);

export { FigSkeleton };
