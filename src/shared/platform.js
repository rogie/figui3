/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

const HTMLElement = globalThis.HTMLElement ?? class {};
const HTMLDialogElement = globalThis.HTMLDialogElement ?? HTMLElement;
const CustomEvent = class extends (globalThis.CustomEvent ?? class {}) {
  constructor(type, options = {}) {
    super(
      type,
      options.bubbles && options.composed === undefined
        ? { ...options, composed: true }
        : options,
    );
  }
};

export { CustomEvent, HTMLDialogElement, HTMLElement };
