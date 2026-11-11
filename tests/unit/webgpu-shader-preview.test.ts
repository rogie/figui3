import { afterEach, describe, expect, test } from "bun:test";
import { setupWebGpuShaderPreviews } from "../../playground/src/lib/webgpuShaderPreview";

const originalDescriptors = new Map(
  ["navigator", "window", "requestAnimationFrame", "cancelAnimationFrame", "MutationObserver"].map(
    (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)],
  ),
);

afterEach(() => {
  for (const [name, descriptor] of originalDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete (globalThis as Record<string, unknown>)[name];
  }
});

describe("WebGPU shader preview lifecycle", () => {
  test("destroys a device that resolves after disposal exactly once", async () => {
    let resolveDevice!: (device: Record<string, unknown>) => void;
    const devicePromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveDevice = resolve;
    });
    let destroys = 0;
    let contextRequests = 0;

    Object.defineProperties(globalThis, {
      navigator: {
        configurable: true,
        value: {
          gpu: {
            requestAdapter: async () => ({
              requestDevice: () => devicePromise,
            }),
            getPreferredCanvasFormat: () => "rgba8unorm",
          },
        },
      },
      window: {
        configurable: true,
        value: { devicePixelRatio: 1 },
      },
      requestAnimationFrame: {
        configurable: true,
        value: () => 1,
      },
      cancelAnimationFrame: {
        configurable: true,
        value: () => {},
      },
      MutationObserver: {
        configurable: true,
        value: class {
          observe() {}
          disconnect() {}
        },
      },
    });

    const listeners = new Map<string, Set<(event: Event) => void>>();
    const sourceInput = {
      value: "",
      addEventListener(type: string, listener: (event: Event) => void) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: (event: Event) => void) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent() {
        return true;
      },
    };
    const canvas = {
      isConnected: true,
      getContext() {
        contextRequests += 1;
        return null;
      },
      setAttribute() {},
      removeAttribute() {},
    };
    const fill = {
      setAttribute() {},
      querySelector(selector: string) {
        return selector.includes("webgpu") ? canvas : sourceInput;
      },
    };
    const root = {
      querySelectorAll() {
        return [fill];
      },
    };

    const cleanup = setupWebGpuShaderPreviews(root as unknown as HTMLElement);
    await Promise.resolve();
    await Promise.resolve();
    cleanup();

    resolveDevice({
      destroy() {
        destroys += 1;
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    cleanup();

    expect(destroys).toBe(1);
    expect(contextRequests).toBe(0);
    expect(listeners.get("input")?.size ?? 0).toBe(0);
    expect(listeners.get("change")?.size ?? 0).toBe(0);
  });
});
