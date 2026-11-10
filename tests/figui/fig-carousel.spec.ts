import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

let automaticErrors: ReturnType<typeof collectPageErrors>;

test.beforeEach(async ({ page }) => {
  automaticErrors = collectPageErrors(page);
  await bootFigFixture(page);
});

test.afterEach(() => {
  expect(automaticErrors.pageErrors).toEqual([]);
  expect(automaticErrors.consoleErrors).toEqual([]);
});

test("generates ordered bottom controls and selects one item", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" duration="60">
        <fig-image></fig-image>
        <fig-media type="image"></fig-media>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      index: number;
      playing: boolean;
    };
    const controls = carousel.querySelector(
      ":scope > [data-fig-carousel-controls]",
    )!;
    const activeSlide = carousel.querySelector(":scope > [selected]")!;
    const children = [...controls.children];
    return {
      index: carousel.index,
      playing: carousel.playing,
      role: carousel.getAttribute("role"),
      roleDescription: carousel.getAttribute("aria-roledescription"),
      controls: children.map((child) => ({
        tag: child.tagName,
        action: child.getAttribute("data-fig-carousel-action"),
        variant: child.getAttribute("variant"),
        pill: child.hasAttribute("pill"),
        icon: child.querySelector("fig-icon")?.getAttribute("name") ?? null,
      })),
      controlsAlignment: getComputedStyle(controls).justifyContent,
      controlsBelow:
        controls.getBoundingClientRect().top >=
        activeSlide.getBoundingClientRect().bottom,
      selected: carousel.querySelectorAll(":scope > [selected]").length,
      hidden: carousel.querySelectorAll(":scope > [hidden]").length,
      previousDisabled: children[0]?.hasAttribute("disabled"),
      nextDisabled: children[1]?.hasAttribute("disabled"),
    };
  });

  expect(state).toEqual({
    index: 0,
    playing: true,
    role: "group",
    roleDescription: "carousel",
    controls: [
      {
        tag: "FIG-BUTTON",
        action: "previous",
        variant: "ghost",
        pill: true,
        icon: "back",
      },
      {
        tag: "FIG-BUTTON",
        action: "next",
        variant: "ghost",
        pill: true,
        icon: "forward",
      },
      {
        tag: "FIG-BUTTON-PLAY",
        action: null,
        variant: "ghost",
        pill: false,
        icon: "pause",
      },
    ],
    controlsAlignment: "flex-end",
    controlsBelow: true,
    selected: 1,
    hidden: 1,
    previousDisabled: true,
    nextDisabled: false,
  });
});

test("manual navigation emits change and loop wraps", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" autoplay="false">
        <fig-image></fig-image>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      index: number;
    };
    const changes: Array<{
      index: number;
      previousIndex: number;
      tag: string | undefined;
    }> = [];
    carousel.addEventListener("change", ((event: CustomEvent) => {
      changes.push({
        index: event.detail.index,
        previousIndex: event.detail.previousIndex,
        tag: event.detail.item?.tagName,
      });
    }) as EventListener);
    carousel
      .querySelector<HTMLElement>('[data-fig-carousel-action="next"]')!
      .click();
    const atEnd = {
      index: carousel.index,
      nextDisabled: carousel
        .querySelector('[data-fig-carousel-action="next"]')
        ?.hasAttribute("disabled"),
    };
    carousel.setAttribute("loop", "");
    carousel
      .querySelector<HTMLElement>('[data-fig-carousel-action="next"]')!
      .click();
    return { atEnd, wrappedIndex: carousel.index, changes };
  });

  expect(state).toEqual({
    atEnd: { index: 1, nextDisabled: true },
    wrappedIndex: 0,
    changes: [
      { index: 1, previousIndex: 0, tag: "FIG-IMAGE" },
      { index: 0, previousIndex: 1, tag: "FIG-IMAGE" },
    ],
  });
});

test("exposes expanded navigation state and methods", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" autoplay="false">
        <fig-image id="one"></fig-image>
        <fig-image id="two"></fig-image>
        <fig-image id="three"></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      index: number;
      loop: boolean;
      currentItem: Element | null;
      canGoPrevious: boolean;
      canGoNext: boolean;
      goTo(index: number): void;
      previous(): void;
      first(): void;
      last(): void;
    };
    let changes = 0;
    carousel.addEventListener("change", () => changes++);
    const initial = {
      current: carousel.currentItem?.id,
      canPrevious: carousel.canGoPrevious,
      canNext: carousel.canGoNext,
    };
    carousel.goTo(99);
    const clamped = {
      index: carousel.index,
      current: carousel.currentItem?.id,
      canPrevious: carousel.canGoPrevious,
      canNext: carousel.canGoNext,
    };
    carousel.previous();
    const previousIndex = carousel.index;
    carousel.first();
    const firstIndex = carousel.index;
    carousel.last();
    const lastIndex = carousel.index;
    const changesAfterMethods = changes;
    carousel.index = 1;
    const changesAfterProperty = changes;
    carousel.loop = true;
    return {
      initial,
      clamped,
      previousIndex,
      firstIndex,
      lastIndex,
      changesAfterMethods,
      changesAfterProperty,
      loopCapabilities: [carousel.canGoPrevious, carousel.canGoNext],
    };
  });

  expect(state).toEqual({
    initial: { current: "one", canPrevious: false, canNext: true },
    clamped: {
      index: 2,
      current: "three",
      canPrevious: true,
      canNext: false,
    },
    previousIndex: 1,
    firstIndex: 0,
    lastIndex: 2,
    changesAfterMethods: 4,
    changesAfterProperty: 4,
    loopCapabilities: [true, true],
  });
});

test("restart resets active progress and preserves playback state", async ({
  page,
}) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" autoplay="false" duration="10">
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      playing: boolean;
      play(): void;
      pause(): void;
      restart(): void;
    };
    const playButton = carousel.querySelector("fig-button-play") as HTMLElement & {
      progress: number;
    };
    carousel.play();
    await new Promise((resolve) => setTimeout(resolve, 40));
    carousel.pause();
    const pausedBefore = playButton.progress;
    carousel.restart();
    const pausedRestart = {
      playing: carousel.playing,
      progress: playButton.progress,
    };
    carousel.play();
    await new Promise((resolve) => setTimeout(resolve, 20));
    carousel.restart();
    return {
      pausedBefore,
      pausedRestart,
      playingRestart: {
        playing: carousel.playing,
        progress: playButton.progress,
      },
    };
  });

  expect(state.pausedBefore).toBeGreaterThan(0);
  expect(state.pausedRestart).toEqual({ playing: false, progress: 0 });
  expect(state.playingRestart.playing).toBe(true);
  expect(state.playingRestart.progress).toBeLessThan(0.01);
});

test("dot navigation overlays centered progress-sized indicators", async ({
  page,
}) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <progress id="reference-progress" max="1" value="0.5"></progress>
      <fig-carousel id="carousel" navigation="dots" autoplay="false">
        <fig-image></fig-image>
        <fig-image></fig-image>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      index: number;
    };
    const controls = carousel.querySelector<HTMLElement>(
      ":scope > [data-fig-carousel-controls]",
    )!;
    const indicators = [
      ...carousel.querySelectorAll<HTMLElement>(".fig-carousel-indicator"),
    ];
    const dots = indicators.map(
      (indicator) =>
        indicator.querySelector(".fig-carousel-dot")!.getBoundingClientRect(),
    );
    const hostRect = carousel.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const referenceHeight = root
      .querySelector("progress")!
      .getBoundingClientRect().height;
    const colorProbe = document.createElement("span");
    colorProbe.style.background = "var(--fig-carousel-indicator-inactive-color)";
    carousel.append(colorProbe);
    const dotStyle = getComputedStyle(
      indicators[1].querySelector(".fig-carousel-dot")!,
    );
    const usesInactiveColor =
      dotStyle.backgroundColor === getComputedStyle(colorProbe).backgroundColor;
    const hasHandleShadow = dotStyle.boxShadow !== "none";
    colorProbe.remove();
    indicators[2].click();
    await new Promise((resolve) => setTimeout(resolve, 450));
    return {
      count: indicators.length,
      indicatorGap: getComputedStyle(indicators[0].parentElement!).gap,
      indicatorTags: indicators.map((indicator) => indicator.tagName),
      indicatorVariants: indicators.map((indicator) =>
        indicator.getAttribute("variant"),
      ),
      indicatorIcons: indicators.map((indicator) =>
        indicator.hasAttribute("icon"),
      ),
      indicatorSize: {
        width: indicators[0].getBoundingClientRect().width,
        height: indicators[0].getBoundingClientRect().height,
      },
      indicatorControlOverflow: getComputedStyle(indicators[0]).overflow,
      visiblePlayButton: Boolean(
        carousel.querySelector("fig-button-play:not([hidden])"),
      ),
      visibleNavigationButtons:
        carousel.querySelectorAll(
          '[data-fig-carousel-action="previous"], [data-fig-carousel-action="next"]',
        ).length,
      activeWider: dots[0].width > dots[1].width,
      dotHeight: dots[1].height,
      activeHeight: dots[0].height,
      referenceHeight,
      usesInactiveColor,
      hasHandleShadow,
      centered:
        Math.abs(
          controlsRect.left +
            controlsRect.width / 2 -
            (hostRect.left + hostRect.width / 2),
        ) < 1,
      bottomInset: Math.round(hostRect.bottom - controlsRect.bottom),
      index: carousel.index,
      currentIndex: carousel
        .querySelector("[aria-current]")
        ?.getAttribute("data-fig-carousel-index"),
      progressCount: carousel.querySelectorAll(
        ".fig-carousel-indicator progress",
      ).length,
      separated: indicators.every((indicator, index) => {
        const next = indicators[index + 1];
        if (!next) return true;
        return (
          indicator.getBoundingClientRect().right <=
          next.getBoundingClientRect().left + 0.5
        );
      }),
    };
  });

  expect(state).toEqual({
    count: 3,
    indicatorGap: "0px",
    indicatorTags: ["FIG-BUTTON", "FIG-BUTTON", "FIG-BUTTON"],
    indicatorVariants: ["ghost", "ghost", "ghost"],
    indicatorIcons: [true, true, true],
      indicatorSize: { width: 10, height: 14 },
      indicatorControlOverflow: "hidden",
    visiblePlayButton: false,
    visibleNavigationButtons: 0,
    activeWider: true,
    dotHeight: 6,
    activeHeight: 6,
    referenceHeight: 6,
    usesInactiveColor: true,
    hasHandleShadow: true,
    centered: true,
    bottomInset: 4,
    index: 2,
    currentIndex: "2",
    progressCount: 1,
    separated: true,
  });
});

test("dot indicators suppress button interaction visuals", async ({ page }) => {
  await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel navigation="dots" autoplay="false">
        <fig-image></fig-image>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
  });

  const indicator = page.locator(".fig-carousel-indicator").first();
  const visualState = () =>
    indicator.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        outline: style.outlineStyle,
        boxShadow: style.boxShadow,
      };
    });

  const resting = await visualState();
  await indicator.hover();
  const hovered = await visualState();
  await indicator.focus();
  const focused = await visualState();
  const bounds = await indicator.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  const pressed = await visualState();
  await page.mouse.up();

  expect(resting).toEqual({
    background: "rgba(0, 0, 0, 0)",
    outline: "none",
    boxShadow: "none",
  });
  expect(hovered).toEqual(resting);
  expect(focused).toEqual(resting);
  expect(pressed).toEqual(resting);
});

test("active and previous dot widths transition together", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel navigation="dots" autoplay="false" style="--fig-carousel-indicator-duration: 400ms">
        <fig-image></fig-image>
        <fig-image></fig-image>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const dots = [
      ...document.querySelectorAll<HTMLElement>(".fig-carousel-dot"),
    ];
    const widths = () => dots.map((dot) => dot.getBoundingClientRect().width);
    const start = widths();
    document
      .querySelectorAll<HTMLElement>(".fig-carousel-indicator")[1]
      .click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const mid = widths();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const end = widths();
    return { start, mid, end };
  });

  expect(state.start[0]).toBeGreaterThan(state.start[1]);
  expect(state.mid[0]).toBeLessThan(state.start[0]);
  expect(state.mid[0]).toBeGreaterThan(state.end[0]);
  expect(state.mid[1]).toBeGreaterThan(state.start[1]);
  expect(state.mid[1]).toBeLessThan(state.end[1]);
  expect(state.end[1]).toBeGreaterThan(state.end[0]);
  expect(state.end[2]).toBeCloseTo(state.end[0], 0);
});

test("incoming dot color interpolates from inactive to track", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel navigation="dots" autoplay="false" style="--fig-carousel-indicator-duration: 400ms">
        <fig-image></fig-image>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise((resolve) => setTimeout(resolve, 450));
    const carousel = root.querySelector("fig-carousel")!;
    const dots = [...carousel.querySelectorAll<HTMLElement>(".fig-carousel-dot")];
    const channels = (color: string) => {
      const values = color.match(/[\d.]+/g)?.map(Number) ?? [];
      if (values.length === 3) values.push(1);
      return values;
    };
    const probe = document.createElement("span");
    carousel.append(probe);
    const tokenColor = (token: string) => {
      probe.style.backgroundColor = `var(${token})`;
      return getComputedStyle(probe).backgroundColor;
    };
    const inactive = tokenColor("--fig-carousel-indicator-inactive-color");
    const track = tokenColor("--fig-carousel-indicator-track");
    const incoming = dots[1];
    const start = getComputedStyle(incoming).backgroundColor;
    carousel.querySelectorAll<HTMLElement>(".fig-carousel-indicator")[1].click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const mid = getComputedStyle(incoming).backgroundColor;
    await new Promise((resolve) => setTimeout(resolve, 400));
    const end = getComputedStyle(incoming).backgroundColor;
    const startAlpha = channels(start)[3];
    const midAlpha = channels(mid)[3];
    const endAlpha = channels(end)[3];
    return {
      start,
      inactive,
      end,
      track,
      alphaAdvanced: midAlpha < startAlpha && midAlpha > endAlpha,
    };
  });

  expect(state.start).toBe(state.inactive);
  expect(state.end).toBe(state.track);
  expect(state.alphaAdvanced).toBe(true);
});

test("static dot navigation keeps the active pill without progress", async ({
  page,
}) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" navigation="dots" progress="false" autoplay="false">
        <fig-image></fig-image>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel")!;
    const dots = [
      ...carousel.querySelectorAll<HTMLElement>(".fig-carousel-dot"),
    ].map((dot) => dot.getBoundingClientRect().width);
    return {
      progressCount: carousel.querySelectorAll("progress").length,
      activeWider: dots[0] > dots[1],
    };
  });

  expect(state).toEqual({ progressCount: 0, activeWider: true });
});

test("progress starts as the pagination transition begins", async ({
  page,
}) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" navigation="dots" duration="2" style="--fig-carousel-indicator-duration: 400ms">
        <fig-image></fig-image>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel")!;
    const indicators = [
      ...carousel.querySelectorAll<HTMLElement>(".fig-carousel-indicator"),
    ];
    const widths = () =>
      indicators.map(
        (indicator) =>
          indicator.querySelector(".fig-carousel-dot")!.getBoundingClientRect()
            .width,
      );
    const progressValues = () =>
      indicators.map(
        (indicator) =>
          indicator.querySelector<HTMLProgressElement>("progress")?.value ??
          null,
      );
    const startWidths = widths();
    indicators[1].click();
    const activeProgress =
      indicators[1].querySelector<HTMLProgressElement>("progress")!;
    const trackProbe = document.createElement("span");
    trackProbe.style.background =
      "var(--fig-carousel-indicator-track)";
    carousel.append(trackProbe);
    const atStart = {
      widths: widths(),
      progress: progressValues(),
      progressTrack: getComputedStyle(activeProgress).backgroundColor,
      expectedTrack: getComputedStyle(trackProbe).backgroundColor,
      progressBarMinWidth: getComputedStyle(activeProgress)
        .getPropertyValue("--progress-bar-min-width")
        .trim(),
    };
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      startWidths,
      atStart,
      mid: {
        widths: widths(),
        progress: progressValues(),
      },
    };
  });

  expect(state.startWidths[0]).toBeGreaterThan(state.startWidths[1]);
  expect(state.atStart.progress[0]).toBeNull();
  expect(state.atStart.progress[1]).toBe(0);
  expect(state.atStart.progressTrack).toBe(state.atStart.expectedTrack);
  expect(state.atStart.progressBarMinWidth).toBe("0");
  expect(state.mid.widths[0]).toBeLessThan(state.startWidths[0]);
  expect(state.mid.widths[1]).toBeGreaterThan(state.startWidths[1]);
  expect(state.mid.widths[1]).toBeLessThan(state.startWidths[0]);
  expect(state.mid.progress[0]).toBeNull();
  expect(state.mid.progress[1]).toBeGreaterThan(0);
});

test("dot progress follows timed image progress", async ({ page }) => {
  await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" navigation="dots" duration="2">
        <fig-image></fig-image>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
  });

  await expect
    .poll(() =>
      page
        .locator("#carousel .fig-carousel-indicator progress")
        .evaluate((progress: HTMLProgressElement) => progress.value),
    )
    .toBeGreaterThan(0);
});

test("uses item duration and stops at the final item", async ({ page }) => {
  await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" duration="1">
        <fig-image carousel-duration="0.05"></fig-image>
        <fig-image carousel-duration="0.05"></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
  });

  await expect
    .poll(() =>
      page.locator("#carousel").evaluate((element: HTMLElement & { index: number }) => ({
        index: element.index,
        playing: element.hasAttribute("playing"),
      })),
    )
    .toEqual({ index: 1, playing: false });
});

test("infers video duration, reports progress, and advances on ended", async ({
  page,
}) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" navigation="dots" autoplay="false">
        <fig-video muted></fig-video>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      index: number;
      play(): void;
    };
    const slide = carousel.querySelector("fig-video") as HTMLElement & {
      mediaEl: HTMLVideoElement;
    };
    const video = slide.mediaEl;
    let pauses = 0;
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      writable: true,
      value: 0,
    });
    video.play = () => Promise.resolve();
    video.pause = () => {
      pauses += 1;
    };
    carousel.play();
    video.dispatchEvent(new Event("loadedmetadata"));
    video.currentTime = 2;
    video.dispatchEvent(new Event("timeupdate"));
    const playButton = carousel.querySelector("fig-button-play")!;
    const progress = playButton.getAttribute("progress");
    const duration = playButton.getAttribute("duration");
    const progressValue = carousel.querySelector<HTMLProgressElement>(
      ".fig-carousel-indicator progress",
    )?.value;
    video.dispatchEvent(new Event("ended"));
    return {
      progress,
      duration,
      progressValue,
      index: carousel.index,
      oldVideoPaused: pauses > 0,
    };
  });

  expect(state).toEqual({
    progress: "0.25",
    duration: "8",
    progressValue: 0.25,
    index: 1,
    oldVideoPaused: true,
  });
});

test("restart seeks active video to zero without changing playback state", async ({
  page,
}) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" autoplay="false">
        <fig-video muted></fig-video>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      playing: boolean;
      play(): void;
      pause(): void;
      restart(): void;
    };
    const slide = carousel.querySelector("fig-video") as HTMLElement & {
      mediaEl: HTMLVideoElement;
    };
    const video = slide.mediaEl;
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      writable: true,
      value: 3,
    });
    video.play = () => Promise.resolve();
    video.pause = () => {};
    carousel.play();
    carousel.restart();
    const playingRestart = {
      playing: carousel.playing,
      currentTime: video.currentTime,
    };
    video.currentTime = 2;
    carousel.pause();
    carousel.restart();
    return {
      playingRestart,
      pausedRestart: {
        playing: carousel.playing,
        currentTime: video.currentTime,
      },
    };
  });

  expect(state).toEqual({
    playingRestart: { playing: true, currentTime: 0 },
    pausedRestart: { playing: false, currentTime: 0 },
  });
});

test("video item duration override uses the fixed item timer", async ({ page }) => {
  await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" autoplay="false">
        <fig-video carousel-duration="0.1" muted></fig-video>
        <fig-image></fig-image>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      play(): void;
    };
    const slide = carousel.querySelector("fig-video") as HTMLElement & {
      mediaEl: HTMLVideoElement;
    };
    slide.mediaEl.play = () => Promise.resolve();
    slide.mediaEl.pause = () => {};
    carousel.play();
    slide.mediaEl.dispatchEvent(new Event("ended"));
  });

  await expect
    .poll(() =>
      page.locator("#carousel").evaluate((element: HTMLElement & { index: number }) => ({
        index: element.index,
        playing: element.hasAttribute("playing"),
      })),
    )
    .toEqual({ index: 1, playing: true });
});

test("syncs dynamic children and pauses video on disconnect", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const root = document.querySelector("#fixture-root")!;
    root.innerHTML = `
      <fig-carousel id="carousel" navigation="dots" autoplay="false">
        <fig-video id="first-video" muted></fig-video>
        <fig-video id="second-video" muted></fig-video>
      </fig-carousel>
    `;
    await customElements.whenDefined("fig-carousel");
    await new Promise(requestAnimationFrame);
    const carousel = root.querySelector("fig-carousel") as HTMLElement & {
      items: Element[];
      play(): void;
      next(): void;
    };
    const first = carousel.querySelector("#first-video") as HTMLElement & {
      mediaEl: HTMLVideoElement;
    };
    const second = carousel.querySelector("#second-video") as HTMLElement & {
      mediaEl: HTMLVideoElement;
    };
    let firstPauses = 0;
    let secondPauses = 0;
    let secondPlays = 0;
    first.mediaEl.play = () => Promise.resolve();
    first.mediaEl.pause = () => {
      firstPauses += 1;
    };
    second.mediaEl.play = () => {
      secondPlays += 1;
      return Promise.resolve();
    };
    second.mediaEl.pause = () => {
      secondPauses += 1;
    };
    carousel.play();
    carousel.next();
    const image = document.createElement("fig-image");
    carousel.append(image);
    await new Promise(requestAnimationFrame);
    const itemCount = carousel.items.length;
    const indicatorCount = carousel.querySelectorAll(
      ".fig-carousel-indicator",
    ).length;
    carousel.remove();
    return {
      itemCount,
      indicatorCount,
      firstPauses,
      secondPauses,
      secondPlays,
    };
  });

  expect(state.itemCount).toBe(3);
  expect(state.indicatorCount).toBe(3);
  expect(state.firstPauses).toBeGreaterThan(0);
  expect(state.secondPauses).toBeGreaterThan(0);
  expect(state.secondPlays).toBeGreaterThan(0);
});
