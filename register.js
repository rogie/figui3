/*!
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

let coreRegistration;
let editorRegistration;
let labRegistration;

function canRegister() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof customElements !== "undefined"
  );
}

export function registerFigUI() {
  if (!canRegister()) return Promise.resolve();
  coreRegistration ??= import("./fig.js").then(() => {});
  return coreRegistration;
}

export function registerFigEditor() {
  if (!canRegister()) return Promise.resolve();
  editorRegistration ??= registerFigUI()
    .then(() => import("./fig-editor.js"))
    .then(() => {});
  return editorRegistration;
}

export function registerFigLab() {
  if (!canRegister()) return Promise.resolve();
  labRegistration ??= registerFigUI()
    .then(() => import("./fig-lab.js"))
    .then(() => {});
  return labRegistration;
}

export async function register(options = {}) {
  if (!canRegister()) return;
  await registerFigUI();
  await Promise.all([
    options.editor ? registerFigEditor() : null,
    options.lab ? registerFigLab() : null,
  ]);
}
