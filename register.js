/*!
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

let coreRegistration;

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

export async function register() {
  if (!canRegister()) return;
  await registerFigUI();
}
