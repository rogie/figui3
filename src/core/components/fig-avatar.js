/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

/* Avatar */
class FigAvatar extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.src = this.getAttribute("src");
    this.name = this.getAttribute("name");
    this.initials = this.getInitials(this.name);
    this.setAttribute("initials", this.initials);
    this.setSrc(this.src);
    this.img = this.querySelector("img");
  }
  setSrc(src) {
    this.src = src;
    if (!src) {
      this.querySelector(":scope > img")?.remove();
      this.img = null;
      return;
    }
    const img = this.querySelector(":scope > img") || document.createElement("img");
    img.src = src;
    img.alt = this.name || "";
    if (!img.isConnected) this.replaceChildren(img);
    this.img = img;
  }
  getInitials(name) {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
      : "";
  }
  static get observedAttributes() {
    return ["src", "href", "name"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    this[name] = newValue;
    if (name === "name") {
      if (this.img) this.img.alt = newValue || "";
      this.name = newValue;
      this.initials = this.getInitials(this.name);
      this.setAttribute("initials", this.initials);
    } else if (name === "src") {
      this.src = newValue;
      this.setSrc(this.src);
    }
  }
}
figDefineElement("fig-avatar", FigAvatar);

export { FigAvatar };
