import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.beforeEach(async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => customElements.whenDefined("fig-button-play"));
});

test("embeds a secondary pill icon button and forwards variants", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const control = document.createElement("fig-button-play");
    document.body.append(control);
    const button = control.querySelector("fig-button");
    const icon = button?.querySelector("fig-icon");
    const initial = {
      variant: button?.getAttribute("variant"),
      icon: button?.hasAttribute("icon"),
      pill: button?.hasAttribute("pill"),
      iconName: icon?.getAttribute("name"),
      label: button?.getAttribute("aria-label"),
    };
    control.setAttribute("variant", "ghost");
    control.setAttribute("playing", "");
    return {
      initial,
      forwardedVariant: button?.getAttribute("variant"),
      playingIcon: icon?.getAttribute("name"),
      playingLabel: button?.getAttribute("aria-label"),
    };
  });

  expect(result).toEqual({
    initial: {
      variant: "secondary",
      icon: true,
      pill: true,
      iconName: "play",
      label: "Play",
    },
    forwardedVariant: "ghost",
    playingIcon: "pause",
    playingLabel: "Pause",
  });
});

test("authored progress selects controlled mode", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const control = document.createElement("fig-button-play") as HTMLElement & {
      progress: number;
    };
    control.setAttribute("duration", "0.05");
    control.setAttribute("progress", "0.4");
    control.setAttribute("playing", "");
    document.body.append(control);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      progress: control.progress,
      playing: control.hasAttribute("playing"),
    };
  });

  expect(result).toEqual({ progress: 0.4, playing: true });
});

test("internal timer pauses, resumes, and completes", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const control = document.createElement("fig-button-play") as HTMLElement & {
      progress: number;
      play(): void;
      pause(): void;
    };
    control.setAttribute("duration", "0.16");
    document.body.append(control);
    let completeDetail: unknown = null;
    control.addEventListener("complete", (event) => {
      completeDetail = (event as CustomEvent).detail;
    });

    control.play();
    await new Promise((resolve) => setTimeout(resolve, 60));
    control.pause();
    const pausedProgress = control.progress;
    await new Promise((resolve) => setTimeout(resolve, 60));
    const heldProgress = control.progress;
    control.play();
    await new Promise<void>((resolve) => {
      control.addEventListener("complete", () => resolve(), { once: true });
    });

    return {
      pausedProgress,
      heldProgress,
      finalProgress: control.progress,
      playing: control.hasAttribute("playing"),
      completeDetail,
    };
  });

  expect(result.pausedProgress).toBeGreaterThan(0);
  expect(result.heldProgress).toBeCloseTo(result.pausedProgress, 4);
  expect(result.finalProgress).toBe(1);
  expect(result.playing).toBe(false);
  expect(result.completeDetail).toEqual({ progress: 1 });
});

test("disabled state reaches the inner button and blocks playback", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const control = document.createElement("fig-button-play") as HTMLElement & {
      play(): void;
    };
    control.setAttribute("disabled", "");
    document.body.append(control);
    control.play();
    const button = control.querySelector("fig-button");
    return {
      innerDisabled: button?.hasAttribute("disabled"),
      playing: control.hasAttribute("playing"),
    };
  });

  expect(result).toEqual({ innerDisabled: true, playing: false });
});
