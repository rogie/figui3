export interface FiguiBuildInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  repositoryUrl: string;
  sha: string;
  date: string;
  branch: string;
}

declare const __FIGUI_BUILD_INFO__: FiguiBuildInfo;

/** Build-time package.json + git metadata injected by Vite. */
export function getBuildInfo(): FiguiBuildInfo {
  return __FIGUI_BUILD_INFO__;
}

/** Format: v11.8.5 (76c00a2, 2026-11-06) */
export function formatBuildVersionLine(
  info: FiguiBuildInfo = getBuildInfo(),
): string {
  return `v${info.version} (${info.sha}, ${info.date})`;
}

/** `https://github.com/rogie/figui3` → `rogie/figui3` */
export function formatGithubLabel(
  info: FiguiBuildInfo = getBuildInfo(),
): string {
  const match = info.repositoryUrl.match(/github\.com\/([^/]+\/[^/]+)/i);
  const slug = match?.[1] ?? info.repositoryUrl;
  return slug ? `GitHub - ${slug}` : "GitHub";
}

export function formatNpmLabel(info: FiguiBuildInfo = getBuildInfo()): string {
  return info.name ? `npm - ${info.name}` : "npm";
}

export function formatNpmUrl(info: FiguiBuildInfo = getBuildInfo()): string {
  return info.name
    ? `https://www.npmjs.com/package/${info.name}`
    : "https://www.npmjs.com";
}
