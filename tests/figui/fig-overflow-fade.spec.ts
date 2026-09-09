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
});
