import { expect, test } from "@playwright/test";
import { bootFigFixture } from "./helpers";

test("registration conflicts are diagnosed without replacing the existing constructor", async ({
  page,
}) => {
  await page.goto("/tests/figui/registration-fixture.html");
  const result = await page.evaluate(async () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...values) => warnings.push(values.join(" "));
    try {
      class ForeignButton extends HTMLElement {}
      customElements.define("fig-button", ForeignButton);
      await import("/fig.js");
      return {
        preserved: customElements.get("fig-button") === ForeignButton,
        warnings,
      };
    } finally {
      console.warn = originalWarn;
    }
  });

  expect(result.preserved).toBe(true);
  expect(result.warnings).toEqual([
    expect.stringContaining(
      'Custom element "fig-button" is already registered with a different constructor',
    ),
  ]);
});

test("tabs scope panels locally and reconcile programmatic child selection", async ({
  page,
}) => {
  await bootFigFixture(page);
  const result = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <section id="first-scope">
        <fig-tabs id="tabs" value="one">
          <fig-tab value="one" selected content=".shared-panel">One</fig-tab>
          <fig-tab id="second-tab" value="two" content="#second-panel">Two</fig-tab>
        </fig-tabs>
        <div class="shared-panel">Local panel</div>
        <div id="second-panel">Second panel</div>
      </section>
      <section><div class="shared-panel">Foreign panel</div></section>
    `;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const tabs = root.querySelector("#tabs")!;
    const local = root.querySelector("#first-scope .shared-panel") as HTMLElement;
    const foreign = root.querySelector(
      "section:last-child .shared-panel",
    ) as HTMLElement;
    const second = root.querySelector("#second-tab")!;
    second.setAttribute("selected", "true");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return {
      value: tabs.getAttribute("value"),
      firstSelected: tabs
        .querySelector('fig-tab[value="one"]')
        ?.hasAttribute("selected"),
      secondSelected: second.hasAttribute("selected"),
      localDisplay: local.style.display,
      foreignDisplay: foreign.style.display,
    };
  });

  expect(result).toEqual({
    value: "two",
    firstSelected: false,
    secondSelected: true,
    localDisplay: "none",
    foreignDisplay: "",
  });
});

test("invalid drag selectors fail safely and canvas surface markers are released", async ({
  page,
}) => {
  await bootFigFixture(page);
  const result = await page.evaluate(async () => {
    await import("/fig-lab.js");
    await customElements.whenDefined("fig-canvas-control");
    const root = document.querySelector("#fixture-root")!;
    const handle = document.createElement("fig-handle") as HTMLElement & {
      value: string;
    };
    handle.setAttribute("drag-surface", "[");
    root.append(handle);
    let handleThrew = false;
    try {
      void handle.value;
    } catch {
      handleThrew = true;
    }

    const parent = document.createElement("div");
    const control = document.createElement("fig-canvas-control");
    parent.append(control);
    root.append(parent);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const markedWhileConnected = parent.hasAttribute(
      "data-fig-canvas-control-surface",
    );
    control.remove();
    return {
      handleThrew,
      markedWhileConnected,
      markedAfterDisconnect: parent.hasAttribute(
        "data-fig-canvas-control-surface",
      ),
    };
  });

  expect(result).toEqual({
    handleThrew: false,
    markedWhileConnected: true,
    markedAfterDisconnect: false,
  });
});

test("input slot tooltip teardown removes its binding marker", async ({
  page,
}) => {
  await bootFigFixture(page);
  const result = await page.evaluate(async () => {
    const input = document.createElement("fig-input-text");
    const prepend = document.createElement("span");
    prepend.slot = "prepend";
    prepend.textContent = "Width";
    input.append(prepend);
    document.querySelector("#fixture-root")!.append(input);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const bound = prepend.dataset.figInputSlotTooltipBound;
    prepend.append(document.createElement("b"));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return {
      bound,
      cleared: prepend.dataset.figInputSlotTooltipBound,
      aria: prepend.getAttribute("aria-label"),
    };
  });

  expect(result).toEqual({
    bound: "true",
    cleared: undefined,
    aria: null,
  });
});

test("canvas-dependent components fail safely when 2D contexts are unavailable", async ({
  page,
}) => {
  await bootFigFixture(page);
  const result = await page.evaluate(async () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;
    try {
      const root = document.querySelector("#fixture-root")!;
      const swatch = document.createElement("fig-swatch");
      swatch.setAttribute("color", "rgb(1, 2, 3)");
      root.append(swatch);

      const image = document.createElement("fig-image") as HTMLElement & {
        getBase64(): Promise<string | null>;
      };
      image.setAttribute("src", "data:image/svg+xml,<svg></svg>");
      root.append(image);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const media = image.querySelector("img");
      if (media) {
        Object.defineProperty(media, "naturalWidth", {
          configurable: true,
          value: 1,
        });
        Object.defineProperty(media, "naturalHeight", {
          configurable: true,
          value: 1,
        });
        Object.defineProperty(media, "decode", {
          configurable: true,
          value: async () => {},
        });
      }
      return {
        base64: await image.getBase64(),
        swatchConnected: swatch.isConnected,
      };
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });

  expect(result).toEqual({ base64: null, swatchConnected: true });
});

test("malformed light-DOM composition is diagnosed", async ({ page }) => {
  await bootFigFixture(page);
  const warnings = await page.evaluate(async () => {
    const captured: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...values) => captured.push(values.join(" "));
    try {
      const root = document.querySelector("#fixture-root")!;
      const field = document.createElement("fig-field");
      const property = document.createElement("fig-property");
      const layer = document.createElement("fig-layer");
      const menu = document.createElement("fig-menu");
      menu.append(
        document.createElement("fig-button"),
        document.createElement("fig-button"),
      );
      root.append(field, property, layer, menu);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return captured;
    } finally {
      console.warn = originalWarn;
    }
  });

  expect(warnings).toEqual(
    expect.arrayContaining([
      expect.stringContaining("fig-field expects exactly one"),
      expect.stringContaining("fig-property expects exactly one"),
      expect.stringContaining("fig-layer requires a direct"),
      expect.stringContaining("fig-menu found 2 possible triggers"),
    ]),
  );
});

test("Escape does not close a popup beneath a modal dialog", async ({
  page,
}) => {
  await bootFigFixture(page);
  const popupStayedOpen = await page.evaluate(async () => {
    await customElements.whenDefined("fig-popup");
    const popup = document.createElement("dialog", {
      is: "fig-popup",
    }) as HTMLDialogElement & { open: boolean };
    popup.setAttribute("is", "fig-popup");
    document.body.append(popup);
    popup.open = true;

    const modal = document.createElement("dialog");
    modal.textContent = "Modal";
    document.body.append(modal);
    modal.showModal();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    await Promise.resolve();
    const stayedOpen = popup.open;
    modal.close();
    popup.remove();
    modal.remove();
    return stayedOpen;
  });

  expect(popupStayedOpen).toBe(true);
});

test("the test server rejects repository files outside its public allowlist", async ({
  request,
}) => {
  const [privateFile, publicFile] = await Promise.all([
    request.get("/package.json"),
    request.get("/fig.js"),
  ]);
  expect(privateFile.status()).toBe(404);
  expect(publicFile.status()).toBe(200);
});
