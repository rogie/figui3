const SHADER_SOURCE = `struct Uniforms {
  resolution: vec2f,
  time: f32,
  padding: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );
  return vec4f(positions[vertexIndex], 0.0, 1.0);
}

fn palette(t: f32) -> vec3f {
  return 0.55 + 0.45 * cos(6.28318 * (t + vec3f(0.0, 0.33, 0.67)));
}

@fragment
fn main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let size = max(min(uniforms.resolution.x, uniforms.resolution.y), 1.0);
  let uv = (position.xy * 2.0 - uniforms.resolution) / size;
  let radius = length(uv);
  let angle = atan2(uv.y, uv.x);
  let wave = sin(radius * 18.0 - uniforms.time * 2.2 + angle * 5.0);
  let color = palette(angle / 6.28318 + radius * 0.32 + uniforms.time * 0.05);
  let shimmer = 0.45 + 0.55 * smoothstep(-0.8, 0.8, wave);
  let vignette = 1.0 - smoothstep(0.55, 1.45, radius);
  return vec4f(color * (0.5 + shimmer) * vignette, 1.0);
}`;

type ValueElement = HTMLElement & { value?: string };

function drawUnavailable(canvas: HTMLCanvasElement, message: string) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round((bounds.width || 640) * ratio));
  canvas.height = Math.max(1, Math.round((bounds.height || 360) * ratio));
  context.fillStyle = "#1e1e1e";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#b3b3b3";
  context.font = `${13 * ratio}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(message, canvas.width / 2, canvas.height / 2);
}

function setupShaderPreview(fill: HTMLElement): () => void {
  const canvas = fill.querySelector<HTMLCanvasElement>(
    "[data-playground-webgpu-shader]",
  );
  const sourceInput = fill.querySelector<ValueElement>(
    "[data-playground-shader-source]",
  );
  if (!canvas || !sourceInput) return () => {};

  let disposed = false;
  let animationFrame = 0;
  let compileRevision = 0;
  let forwardingEvent = false;
  let device: any = null;
  let context: any = null;
  let pipeline: any = null;
  let bindGroup: any = null;
  let uniformBuffer: any = null;
  let compileShader: (source: string) => Promise<void> = async () => {};

  const setFillValue = (source: string) => {
    fill.setAttribute(
      "value",
      JSON.stringify({ type: "shader", source, language: "wgsl" }),
    );
  };

  const forwardSourceEvent = (event: Event) => {
    if (forwardingEvent) return;
    event.stopPropagation();
    const source = sourceInput.value || "";
    setFillValue(source);
    if (event.type === "input") void compileShader(source);
    forwardingEvent = true;
    sourceInput.dispatchEvent(
      new CustomEvent(event.type, {
        bubbles: true,
        detail: { source, language: "wgsl" },
      }),
    );
    forwardingEvent = false;
  };

  sourceInput.value = SHADER_SOURCE;
  setFillValue(SHADER_SOURCE);
  sourceInput.addEventListener("input", forwardSourceEvent);
  sourceInput.addEventListener("change", forwardSourceEvent);

  const initialize = async () => {
    const gpu = (navigator as Navigator & { gpu?: any }).gpu;
    if (!gpu) {
      drawUnavailable(canvas, "WebGPU is unavailable");
      return;
    }

    const adapter = await gpu.requestAdapter();
    if (!adapter || disposed) {
      if (!disposed) drawUnavailable(canvas, "WebGPU adapter unavailable");
      return;
    }

    device = await adapter.requestDevice();
    if (disposed) {
      device.destroy?.();
      return;
    }

    context = canvas.getContext("webgpu") as any;
    if (!context) {
      drawUnavailable(canvas, "WebGPU canvas unavailable");
      return;
    }

    const format = gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "premultiplied" });
    const bufferUsage =
      (globalThis as typeof globalThis & {
        GPUBufferUsage?: { UNIFORM: number; COPY_DST: number };
      }).GPUBufferUsage ?? { UNIFORM: 64, COPY_DST: 8 };
    uniformBuffer = device.createBuffer({
      size: 16,
      usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST,
    });

    compileShader = async (source: string) => {
      const revision = ++compileRevision;
      const module = device.createShaderModule({ code: source });
      const compilation = await module.getCompilationInfo?.();
      const compilationError = compilation?.messages?.find(
        (message: { type?: string }) => message.type === "error",
      );
      if (compilationError || revision !== compileRevision || disposed) {
        if (compilationError) canvas.title = compilationError.message;
        return;
      }

      device.pushErrorScope?.("validation");
      const nextPipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vertexMain" },
        fragment: { module, entryPoint: "main", targets: [{ format }] },
        primitive: { topology: "triangle-list" },
      });
      const validationError = await device.popErrorScope?.();
      if (validationError || revision !== compileRevision || disposed) {
        if (validationError) canvas.title = validationError.message;
        return;
      }

      pipeline = nextPipeline;
      bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });
      canvas.removeAttribute("title");
      canvas.setAttribute("data-playground-webgpu-ready", "true");
    };

    await compileShader(sourceInput.value || SHADER_SOURCE);
    if (disposed) return;

    const render = (timestamp: number) => {
      if (disposed || !canvas.isConnected) return;
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round((bounds.width || 640) * ratio));
      const height = Math.max(1, Math.round((bounds.height || 360) * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      if (pipeline && bindGroup) {
        device.queue.writeBuffer(
          uniformBuffer,
          0,
          new Float32Array([width, height, timestamp / 1000, 0]),
        );
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 0.03, g: 0.03, b: 0.04, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);
      }

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
  };

  void initialize().catch(() => {
    if (!disposed) drawUnavailable(canvas, "Shader preview unavailable");
  });

  return () => {
    disposed = true;
    compileRevision += 1;
    cancelAnimationFrame(animationFrame);
    sourceInput.removeEventListener("input", forwardSourceEvent);
    sourceInput.removeEventListener("change", forwardSourceEvent);
    uniformBuffer?.destroy?.();
    device?.destroy?.();
  };
}

export function setupWebGpuShaderPreviews(root: HTMLElement): () => void {
  let disposed = false;
  let scanFrame = 0;
  const active = new Map<HTMLCanvasElement, () => void>();

  const scan = () => {
    scanFrame = 0;
    if (disposed) return;

    for (const [canvas, cleanup] of active) {
      if (canvas.isConnected) continue;
      cleanup();
      active.delete(canvas);
    }

    root
      .querySelectorAll<HTMLElement>("[data-playground-shader-fill]")
      .forEach((fill) => {
        const canvas = fill.querySelector<HTMLCanvasElement>(
          "[data-playground-webgpu-shader]",
        );
        const source = fill.querySelector("[data-playground-shader-source]");
        if (!canvas || !source || active.has(canvas)) return;
        active.set(canvas, setupShaderPreview(fill));
      });
  };

  const scheduleScan = () => {
    if (disposed || scanFrame) return;
    scanFrame = requestAnimationFrame(scan);
  };

  const observer = new MutationObserver(scheduleScan);
  observer.observe(root, { childList: true, subtree: true });
  scan();

  return () => {
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(scanFrame);
    active.forEach((cleanup) => cleanup());
    active.clear();
  };
}
