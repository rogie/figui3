import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-overflow-fade utility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("uses a normal element and gates its mask behind scroll-timeline support", async ({
    page,
  }) => {
    const source = readFileSync("components.css", "utf8");
    const utilityStart = source.indexOf(".fig-overflow-fade {");
    const supportStart = source.indexOf(
      "@supports (animation-timeline: scroll(self block))",
    );
    const baseUtility = source.slice(utilityStart, supportStart);

    expect(utilityStart).toBeGreaterThan(-1);
    expect(supportStart).toBeGreaterThan(utilityStart);
    expect(baseUtility).toContain("overflow-y: auto");
    expect(baseUtility).not.toContain("mask-image");
    expect(source.slice(supportStart)).toContain("rgba(0, 0, 0, 0.5)");

    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div id="fade" class="fig-overflow-fade" style="width:180px;height:80px">
          <div style="height:240px"></div>
        </div>
      `;
      const fade = root.querySelector("#fade")!;
      const style = getComputedStyle(fade);
      return {
        customElementRegistered: Boolean(
          customElements.get("fig-overflow-fade"),
        ),
        supportsScrollTimeline: CSS.supports(
          "animation-timeline",
          "scroll(self block)",
        ),
        overflowY: style.overflowY,
        maskImage: style.maskImage,
      };
    });

    expect(state).toEqual({
      customElementRegistered: false,
      supportsScrollTimeline: true,
      overflowY: "auto",
      maskImage: expect.stringContaining("linear-gradient"),
    });
  });

  test("animates the fade lengths from the active scroll position", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div id="fade" class="fig-overflow-fade" style="width:180px;height:80px">
          <div style="height:240px"></div>
        </div>
      `;
    });

    const fade = page.locator("#fade");
    const readFadeLengths = () =>
      fade.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          top: style.getPropertyValue("--fig-overflow-fade-top").trim(),
          bottom: style
            .getPropertyValue("--fig-overflow-fade-bottom")
            .trim(),
        };
      });

    await expect.poll(readFadeLengths).toEqual({ top: "0px", bottom: "32px" });
    const defaultMasks = await fade.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        maskImage: style.maskImage,
        webkitMaskImage: style.webkitMaskImage,
      };
    });
    expect(defaultMasks.maskImage).toContain("rgba(0, 0, 0, 0.04)");
    expect(defaultMasks.webkitMaskImage).toBe(defaultMasks.maskImage);

    await fade.evaluate((element) => {
      element.scrollTop = 60;
    });
    await expect.poll(readFadeLengths).toEqual({ top: "32px", bottom: "32px" });

    await fade.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect.poll(readFadeLengths).toEqual({ top: "32px", bottom: "0px" });
  });

  test("supports horizontal overflow with direction-aware fades", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div id="fade" class="fig-overflow-fade fig-overflow-fade-horizontal" style="width:180px;height:80px">
          <div style="width:540px;height:80px"></div>
        </div>
      `;
    });

    const fade = page.locator("#fade");
    const readFadeState = () =>
      fade.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          left: style.getPropertyValue("--fig-overflow-fade-left").trim(),
          right: style.getPropertyValue("--fig-overflow-fade-right").trim(),
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          maskImage: style.maskImage,
        };
      });

    await expect.poll(readFadeState).toEqual({
      left: "0px",
      right: "32px",
      overflowX: "auto",
      overflowY: "hidden",
      maskImage: expect.stringContaining("linear-gradient"),
    });

    await fade.evaluate((element) => {
      element.scrollLeft = 120;
    });
    await expect.poll(readFadeState).toEqual({
      left: "32px",
      right: "32px",
      overflowX: "auto",
      overflowY: "hidden",
      maskImage: expect.stringContaining("linear-gradient"),
    });

    await fade.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect.poll(readFadeState).toEqual({
      left: "32px",
      right: "0px",
      overflowX: "auto",
      overflowY: "hidden",
      maskImage: expect.stringContaining("linear-gradient"),
    });
  });

  test("supports single-edge vertical fades", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div id="top" class="fig-overflow-fade fig-overflow-fade-top" style="width:180px;height:80px">
          <div style="height:240px"></div>
        </div>
        <div id="bottom" class="fig-overflow-fade fig-overflow-fade-bottom" style="width:180px;height:80px">
          <div style="height:240px"></div>
        </div>
        <div id="bottom-fit" class="fig-overflow-fade fig-overflow-fade-bottom" style="width:180px;height:80px">
          <div style="height:40px"></div>
        </div>
      `;
    });

    const top = page.locator("#top");
    const bottom = page.locator("#bottom");
    const readFadeLengths = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          top: style.getPropertyValue("--fig-overflow-fade-top").trim(),
          bottom: style
            .getPropertyValue("--fig-overflow-fade-bottom")
            .trim(),
          topOpacity: style
            .getPropertyValue("--fig-overflow-fade-top-opacity")
            .trim(),
          bottomOpacity: style
            .getPropertyValue("--fig-overflow-fade-bottom-opacity")
            .trim(),
          maskImage: style.maskImage,
          webkitMaskImage: style.webkitMaskImage,
        };
      });
    const readFadeValues = async (selector: string) => {
      const { maskImage, webkitMaskImage, ...values } =
        await readFadeLengths(selector);
      return values;
    };

    await expect.poll(() => readFadeValues("#top")).toEqual({
      top: "0px",
      bottom: "0px",
      topOpacity: "1",
      bottomOpacity: "1",
    });
    let masks = await readFadeLengths("#top");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).not.toContain("rgba");

    await top.evaluate((element) => {
      element.scrollTop = 60;
    });
    await expect.poll(() => readFadeValues("#top")).toEqual({
      top: "32px",
      bottom: "0px",
      topOpacity: "0",
      bottomOpacity: "1",
    });
    masks = await readFadeLengths("#top");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).toContain("rgba(0, 0, 0, 0.04)");
    expect(masks.maskImage).toMatch(/rgb\(0, 0, 0\) 100%\)$/);

    await expect.poll(() => readFadeValues("#bottom")).toEqual({
      top: "0px",
      bottom: "32px",
      topOpacity: "1",
      bottomOpacity: "0",
    });
    masks = await readFadeLengths("#bottom");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).toMatch(
      /^linear-gradient\(rgb\(0, 0, 0\) 0px, rgb\(0, 0, 0\) calc\(100% - 32px\),/,
    );
    expect(masks.maskImage).not.toContain("rgba(0, 0, 0, 0) 0px");
    expect(masks.maskImage).toContain("rgba(0, 0, 0, 0.04)");
    expect(masks.maskImage).toMatch(/rgba\(0, 0, 0, 0\) 100%\)$/);

    await bottom.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect.poll(() => readFadeValues("#bottom")).toEqual({
      top: "0px",
      bottom: "0px",
      topOpacity: "1",
      bottomOpacity: "1",
    });
    masks = await readFadeLengths("#bottom");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).not.toContain("rgba");

    await expect.poll(() => readFadeValues("#bottom-fit")).toEqual({
      top: "0px",
      bottom: "0px",
      topOpacity: "1",
      bottomOpacity: "1",
    });
    masks = await readFadeLengths("#bottom-fit");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).not.toContain("rgba");
  });

  test("single-edge left and right fades imply horizontal overflow", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root")!;
      root.innerHTML = `
        <div id="left" class="fig-overflow-fade fig-overflow-fade-left" style="width:180px;height:80px">
          <div style="width:540px;height:80px"></div>
        </div>
        <div id="right" class="fig-overflow-fade fig-overflow-fade-right" style="width:180px;height:80px">
          <div style="width:540px;height:80px"></div>
        </div>
      `;
    });

    const left = page.locator("#left");
    const right = page.locator("#right");
    const readFadeState = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          left: style.getPropertyValue("--fig-overflow-fade-left").trim(),
          right: style.getPropertyValue("--fig-overflow-fade-right").trim(),
          leftOpacity: style
            .getPropertyValue("--fig-overflow-fade-left-opacity")
            .trim(),
          rightOpacity: style
            .getPropertyValue("--fig-overflow-fade-right-opacity")
            .trim(),
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          maskImage: style.maskImage,
          webkitMaskImage: style.webkitMaskImage,
        };
      });
    const readFadeValues = async (selector: string) => {
      const { maskImage, webkitMaskImage, ...values } =
        await readFadeState(selector);
      return values;
    };

    await expect.poll(() => readFadeValues("#left")).toEqual({
      left: "0px",
      right: "0px",
      leftOpacity: "1",
      rightOpacity: "1",
      overflowX: "auto",
      overflowY: "hidden",
    });
    let masks = await readFadeState("#left");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).not.toContain("rgba");

    await left.evaluate((element) => {
      element.scrollLeft = 120;
    });
    await expect.poll(() => readFadeValues("#left")).toEqual({
      left: "32px",
      right: "0px",
      leftOpacity: "0",
      rightOpacity: "1",
      overflowX: "auto",
      overflowY: "hidden",
    });
    masks = await readFadeState("#left");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).toContain("rgba(0, 0, 0, 0.04)");
    expect(masks.maskImage).toMatch(/rgb\(0, 0, 0\) 100%\)$/);

    await expect.poll(() => readFadeValues("#right")).toEqual({
      left: "0px",
      right: "32px",
      leftOpacity: "1",
      rightOpacity: "0",
      overflowX: "auto",
      overflowY: "hidden",
    });
    masks = await readFadeState("#right");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).toMatch(
      /^linear-gradient\(to right, rgb\(0, 0, 0\) 0px, rgb\(0, 0, 0\) calc\(100% - 32px\),/,
    );
    expect(masks.maskImage).not.toContain("rgba(0, 0, 0, 0) 0px");
    expect(masks.maskImage).toContain("rgba(0, 0, 0, 0.04)");
    expect(masks.maskImage).toMatch(/rgba\(0, 0, 0, 0\) 100%\)$/);

    await right.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect.poll(() => readFadeValues("#right")).toEqual({
      left: "0px",
      right: "0px",
      leftOpacity: "1",
      rightOpacity: "1",
      overflowX: "auto",
      overflowY: "hidden",
    });
    masks = await readFadeState("#right");
    expect(masks.webkitMaskImage).toBe(masks.maskImage);
    expect(masks.maskImage).not.toContain("rgba");
  });
});
