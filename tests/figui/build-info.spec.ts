import { expect, test } from "@playwright/test";
import {
  formatBuildInfoCopyText,
  formatBuildRevisionLine,
  formatBuildVersionLine,
  formatGithubLabel,
  formatNpmLabel,
  formatNpmUrl,
  type FiguiBuildInfo,
} from "../../playground/src/lib/buildInfo";

/** Minimal fixture — formatters accept explicit info (no Vite define needed). */
const sample: FiguiBuildInfo = {
  name: "@rogieking/figui3",
  version: "11.8.5",
  description: "Test description",
  author: "Rogie King",
  repositoryUrl: "https://github.com/rogie/figui3",
  sha: "76c00a2",
  branch: "feat-build-info",
  // Midday UTC keeps en-CA calendar date stable across US test timezones.
  builtAt: "2026-11-06T12:00:00.000Z",
};

test.describe("playground build info formatters", () => {
  test("formats version line from builtAt (date + local time)", () => {
    const line = formatBuildVersionLine(sample);
    expect(line).toMatch(/^v11\.8\.5 \(2026-11-06, \d{1,2}:\d{2} (AM|PM)\)$/);
  });

  test("formats revision line from sha + branch", () => {
    expect(formatBuildRevisionLine(sample)).toBe(
      "76c00a2, feat-build-info",
    );
  });

  test("formats clipboard text as version line then revision line", () => {
    expect(formatBuildInfoCopyText(sample)).toBe(
      `${formatBuildVersionLine(sample)}\n${formatBuildRevisionLine(sample)}`,
    );
  });

  test("formats GitHub label from repository URL", () => {
    expect(formatGithubLabel(sample)).toBe("GitHub - rogie/figui3");
  });

  test("falls back when repository URL is not GitHub", () => {
    expect(
      formatGithubLabel({
        ...sample,
        repositoryUrl: "https://example.com/figui3",
      }),
    ).toBe("GitHub - https://example.com/figui3");
  });

  test("formats npm label and package URL", () => {
    expect(formatNpmLabel(sample)).toBe("npm - @rogieking/figui3");
    expect(formatNpmUrl(sample)).toBe(
      "https://www.npmjs.com/package/@rogieking/figui3",
    );
  });

  test("handles empty npm name", () => {
    const empty = { ...sample, name: "" };
    expect(formatNpmLabel(empty)).toBe("npm");
    expect(formatNpmUrl(empty)).toBe("https://www.npmjs.com");
  });
});
