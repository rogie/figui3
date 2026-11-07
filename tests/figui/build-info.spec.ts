import { expect, test } from "@playwright/test";
import {
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
  date: "2026-11-06",
  branch: "feat-build-info",
};

test.describe("playground build info formatters", () => {
  test("formats version line from sha + date", () => {
    expect(formatBuildVersionLine(sample)).toBe(
      "v11.8.5 (76c00a2, 2026-11-06)",
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
