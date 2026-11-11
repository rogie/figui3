/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

function runCleanup(cleanup) {
  try {
    const result = cleanup();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {
    // Resource cleanup is best-effort and must not block remaining cleanup.
  }
}

/**
 * Owns one generation of asynchronous work and its resources.
 * Starting a new operation invalidates and releases the previous generation.
 * Disposal is terminal and idempotent.
 */
class AsyncOperationOwner {
  #generation = 0;
  #disposed = false;
  #cleanups = [];

  get disposed() {
    return this.#disposed;
  }

  begin() {
    if (this.#disposed) return this.#operation(this.#generation);
    this.#generation += 1;
    this.#releaseResources();
    return this.#operation(this.#generation);
  }

  cancel() {
    if (this.#disposed) return;
    this.#generation += 1;
    this.#releaseResources();
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#generation += 1;
    this.#releaseResources();
  }

  #operation(generation) {
    return {
      isCurrent: () =>
        !this.#disposed && generation === this.#generation,
      own: (cleanup) => this.#own(generation, cleanup),
    };
  }

  #own(generation, cleanup) {
    let active = true;
    const dispose = () => {
      if (!active) return;
      active = false;
      const index = this.#cleanups.indexOf(dispose);
      if (index >= 0) this.#cleanups.splice(index, 1);
      runCleanup(cleanup);
    };
    const forget = () => {
      if (!active) return;
      active = false;
      const index = this.#cleanups.indexOf(dispose);
      if (index >= 0) this.#cleanups.splice(index, 1);
    };

    if (
      this.#disposed ||
      generation !== this.#generation ||
      typeof cleanup !== "function"
    ) {
      dispose();
    } else {
      this.#cleanups.push(dispose);
    }
    return { dispose, forget };
  }

  #releaseResources() {
    const cleanups = this.#cleanups.splice(0).reverse();
    cleanups.forEach((cleanup) => cleanup());
  }
}

export { AsyncOperationOwner };
