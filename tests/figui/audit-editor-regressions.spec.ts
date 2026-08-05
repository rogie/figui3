import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-fill-picker audit regressions", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.addScriptTag({ type: "module", url: "/fig-lab.js" });
    await page.evaluate(() => customElements.whenDefined("fig-fill-picker"));
  });

  test("names the dialog, synchronizes trigger ARIA, and manages focus", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        open(): void;
        close(): void;
      };
      picker.setAttribute("aria-label", "Background fill");
      picker.innerHTML = `<fig-swatch id="fill-trigger"></fig-swatch>`;
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const trigger = picker.querySelector("#fill-trigger") as HTMLElement;
      trigger.focus();
      picker.open();
      await new Promise(requestAnimationFrame);
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLDialogElement;
      const openState = {
        name: dialog.getAttribute("aria-label"),
        labelled: dialog.hasAttribute("aria-labelledby"),
        focusInside: dialog.contains(document.activeElement),
        haspopup: trigger.getAttribute("aria-haspopup"),
        expanded: trigger.getAttribute("aria-expanded"),
        controls: trigger.getAttribute("aria-controls"),
        dialogId: dialog.id,
        staleColorInputs: trigger.querySelectorAll('input[type="color"]').length,
      };

      picker.close();
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return {
        ...openState,
        expandedAfterClose: trigger.getAttribute("aria-expanded"),
        focusRestored: document.activeElement === trigger,
      };
    });

    expect(state).toMatchObject({
      name: "Background fill",
      focusInside: true,
      haspopup: "dialog",
      expanded: "true",
      expandedAfterClose: "false",
      staleColorInputs: 0,
      focusRestored: true,
    });
    expect(state.labelled || state.name).toBeTruthy();
    expect(state.controls).toBe(state.dialogId);
  });

  test("round-trips canonical alpha and legacy opacity", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);

      picker.value = { type: "solid", color: "#336699", alpha: 0.35 };
      const canonical = picker.value;
      picker.value = { type: "solid", color: "#336699", opacity: 72 };
      const compatible = picker.value;
      return {
        canonicalAlpha: canonical.alpha,
        canonicalHsvAlpha: canonical.hsv.a,
        compatibleAlpha: compatible.alpha,
        compatibleHsvAlpha: compatible.hsv.a,
      };
    });

    expect(state).toEqual({
      canonicalAlpha: 0.35,
      canonicalHsvAlpha: 0.35,
      compatibleAlpha: 0.72,
      compatibleHsvAlpha: 0.72,
    });
  });

  test("refreshes the active tab and its UI for external values", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();

      picker.value = {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 180,
          stops: [
            { position: 0, color: "#000000", opacity: 100 },
            { position: 100, color: "#FFFFFF", opacity: 100 },
          ],
        },
      };
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLElement;
      const gradientVisible =
        (dialog.querySelector('[data-tab="gradient"]') as HTMLElement).style
          .display === "block";
      const gradientAngle = dialog
        .querySelector(".fig-fill-picker-gradient-angle")
        ?.getAttribute("value");

      picker.value = {
        type: "image",
        image: { url: "/tests/figui/fixture.html", scaleMode: "tile", scale: 37 },
      };
      const imageTab = dialog.querySelector('[data-tab="image"]') as HTMLElement;
      return {
        gradientVisible,
        gradientAngle,
        imageVisible: imageTab.style.display === "block",
        imageMode: (imageTab.querySelector(".fig-fill-picker-scale-mode") as any)
          .value,
        imageScale: imageTab
          .querySelector(".fig-fill-picker-scale")
          ?.getAttribute("value"),
        imageSrc: imageTab
          .querySelector(".fig-fill-picker-image-preview")
          ?.getAttribute("src"),
      };
    });

    expect(state).toEqual({
      gradientVisible: true,
      gradientAngle: "90",
      imageVisible: true,
      imageMode: "tile",
      imageScale: "37",
      imageSrc: "/tests/figui/fixture.html",
    });
  });

  test("emits one committed change and enforces disabled behavior", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        open(): void;
        close(): void;
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      let changes = 0;
      let inputs = 0;
      picker.addEventListener("change", (event) => {
        if (event.target === picker) changes++;
      });
      picker.addEventListener("input", (event) => {
        if (event.target === picker) inputs++;
      });

      picker.open();
      const hue = document.querySelector(
        ".fig-fill-picker-dialog fig-slider[type='hue']",
      ) as HTMLElement & { value: number };
      hue.value = 120;
      hue.dispatchEvent(new Event("input", { bubbles: true }));
      hue.dispatchEvent(new Event("change", { bubbles: true }));
      picker.close();
      await new Promise(requestAnimationFrame);
      const changesAfterClose = changes;

      picker.open();
      picker.setAttribute("disabled", "");
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLDialogElement;
      const closedWhenDisabled = !dialog.open;
      picker.open();
      hue.value = 240;
      hue.dispatchEvent(new Event("input", { bubbles: true }));
      hue.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        changesAfterClose,
        inputs,
        closedWhenDisabled,
        stayedClosed: !dialog.open,
        disabled: picker
          .querySelector("fig-swatch")
          ?.getAttribute("aria-disabled"),
      };
    });

    expect(state).toEqual({
      changesAfterClose: 1,
      inputs: 1,
      closedWhenDisabled: true,
      stayedClosed: true,
      disabled: "true",
    });
  });

  test("exposes saturation/brightness state without toggle semantics", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.value = {
        type: "solid",
        color: { h: 20, s: 40, v: 60, a: 1 },
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise(requestAnimationFrame);
      const handle = document.querySelector(
        ".fig-fill-picker-color-area fig-handle",
      ) as HTMLElement;
      return {
        role: handle.getAttribute("role"),
        valueNow: handle.getAttribute("aria-valuenow"),
        valueText: handle.getAttribute("aria-valuetext"),
        pressed: handle.getAttribute("aria-pressed"),
      };
    });

    expect(state).toEqual({
      role: "slider",
      valueNow: "60",
      valueText: "Saturation 40%, brightness 60%",
      pressed: null,
    });
  });

  test("removes unsupported rotate controls and gates webcam capture", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      let stoppedTracks = 0;
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => ({
            getTracks: () => [{ stop: () => stoppedTracks++ }],
          }),
          enumerateDevices: async () => [],
        },
      });
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.value = { type: "webcam" };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLElement;
      const status = dialog.querySelector(
        ".fig-fill-picker-webcam-status",
      ) as HTMLElement;
      const capture = dialog.querySelector(
        ".fig-fill-picker-webcam-capture",
      ) as HTMLElement;
      const video = dialog.querySelector(
        ".fig-fill-picker-webcam-video",
      ) as HTMLVideoElement;
      const captureInitiallyDisabled = capture.hasAttribute("disabled");
      await new Promise((resolve) => setTimeout(resolve, 0));
      Object.defineProperties(video, {
        readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
        videoWidth: { configurable: true, value: 320 },
        videoHeight: { configurable: true, value: 240 },
      });
      video.dispatchEvent(new Event("canplay"));
      const captureReady = !capture.hasAttribute("disabled");

      const revoked: string[] = [];
      const originalRevoke = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = (url: string) => {
        revoked.push(url);
        originalRevoke(url);
      };
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["snapshot"], { type: "image/png" }));
      };
      capture.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      picker.remove();
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
      return {
        rotateButtons: dialog.querySelectorAll(".fig-fill-picker-media-rotate")
          .length,
        statusRole: status.getAttribute("role"),
        statusLive: status.getAttribute("aria-live"),
        captureInitiallyDisabled,
        captureReady,
        revokedOwnedUrls: revoked.length,
        stoppedTracks,
        dialogRemoved: !dialog.isConnected,
      };
    });

    expect(state).toEqual({
      rotateButtons: 0,
      statusRole: "status",
      statusLive: "polite",
      captureInitiallyDisabled: true,
      captureReady: true,
      revokedOwnedUrls: 1,
      stoppedTracks: 1,
      dialogRemoved: true,
    });
  });
});
