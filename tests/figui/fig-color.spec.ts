import { expect, test } from "@playwright/test";

test.describe("fig-color utilities", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/figui/fixture.html");
  });

  test("matches OKLab and OKLCH reference values and round-trips hex", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const color = await import("/fig-color.js");
      const lab = color.figRGBToOklab(255, 0, 0);
      const lch = color.figRGBToOklch(255, 0, 0);
      return {
        lab,
        lch,
        roundTrip: color.figOklchToHex(lch.l, lch.c, lch.h),
        shortHex: color.figHexToRGB("#0af8"),
      };
    });

    expect(result.lab.l).toBeCloseTo(0.627955, 5);
    expect(result.lab.a).toBeCloseTo(0.224863, 5);
    expect(result.lab.b).toBeCloseTo(0.125846, 5);
    expect(result.lch.l).toBeCloseTo(0.627955, 5);
    expect(result.lch.c).toBeCloseTo(0.257683, 5);
    expect(result.lch.h).toBeCloseTo(29.2339, 3);
    expect(result.roundTrip).toBe("#FF0000");
    expect(result.shortHex).toEqual({
      r: 0,
      g: 170,
      b: 255,
      a: 136 / 255,
    });
  });

  test("converts between sRGB and Display-P3 without relabeling channels", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const color = await import("/fig-color.js");
      const p3 = color.figConvertRGB(255, 0, 0, {
        from: "srgb",
        to: "display-p3",
      });
      const source = { r: 13, g: 153, b: 255 };
      const converted = color.figConvertRGB(source.r, source.g, source.b, {
        from: "srgb",
        to: "display-p3",
      });
      const roundTrip = color.figConvertRGB(
        converted.r,
        converted.g,
        converted.b,
        {
          from: "display-p3",
          to: "srgb",
        },
      );
      const p3Lab = color.figRGBToOklab(64, 180, 220, {
        colorSpace: "display-p3",
      });
      const p3RoundTrip = color.figOklabToRGB(
        p3Lab.l,
        p3Lab.a,
        p3Lab.b,
        { colorSpace: "display-p3" },
      );
      return { p3, source, roundTrip, p3RoundTrip };
    });

    expect(result.p3).toEqual({ r: 234, g: 51, b: 35 });
    expect(Math.abs(result.roundTrip.r - result.source.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.roundTrip.g - result.source.g)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.roundTrip.b - result.source.b)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.p3RoundTrip.r - 64)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.p3RoundTrip.g - 180)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.p3RoundTrip.b - 220)).toBeLessThanOrEqual(1);
  });

  test("shares hue, HSL, HSV, distance, and gamut-safe operations", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const color = await import("/fig-color.js");
      const outOfGamut = { l: 0.7, c: 0.4, h: 40 };
      const mapped = color.figMapOklchToGamut(
        outOfGamut.l,
        outOfGamut.c,
        outOfGamut.h,
      );
      const red = color.figRGBToOklab(255, 0, 0);
      const blue = color.figRGBToOklab(0, 0, 255);
      return {
        hsl: color.figRGBToHsl(255, 0, 0),
        hslRoundTrip: color.figHslToRGB(120, 100, 50),
        hsv: color.figRGBToHsv(0, 0, 255),
        hsvRoundTrip: color.figHsvToRGB(60, 100, 100),
        shorterHue: color.figInterpolateHue(350, 10, 0.5, "shorter"),
        longerHue: color.figInterpolateHue(350, 10, 0.5, "longer"),
        distance: color.figOklabDistance(red, blue),
        reverseDistance: color.figOklabDistance(blue, red),
        beforeInGamut: color.figIsOklchInGamut(
          outOfGamut.l,
          outOfGamut.c,
          outOfGamut.h,
        ),
        mapped,
        afterInGamut: color.figIsOklchInGamut(
          mapped.l,
          mapped.c,
          mapped.h,
        ),
      };
    });

    expect(result.hsl).toEqual({ h: 0, s: 100, l: 50 });
    expect(result.hslRoundTrip).toEqual({ r: 0, g: 255, b: 0 });
    expect(result.hsv).toEqual({ h: 240, s: 100, v: 100 });
    expect(result.hsvRoundTrip).toEqual({ r: 255, g: 255, b: 0 });
    expect(result.shorterHue).toBe(0);
    expect(result.longerHue).toBe(180);
    expect(result.distance).toBeGreaterThan(0.5);
    expect(result.distance).toBeCloseTo(result.reverseDistance, 12);
    expect(result.beforeInGamut).toBe(false);
    expect(result.mapped.l).toBe(0.7);
    expect(result.mapped.h).toBe(40);
    expect(result.mapped.c).toBeLessThan(0.4);
    expect(result.afterInGamut).toBe(true);
  });
});
