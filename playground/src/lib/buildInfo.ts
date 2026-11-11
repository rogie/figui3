export interface FiguiBuildInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  repositoryUrl: string;
  sha: string;
  branch: string;
  /** ISO-8601 timestamp baked in at Vite config load time. */
  builtAt: string;
}

declare const __FIGUI_BUILD_INFO__: FiguiBuildInfo;

/** Build-time package.json + git metadata injected by Vite. */
export function getBuildInfo(): FiguiBuildInfo {
  return __FIGUI_BUILD_INFO__;
}

/** `2026-11-11` */
function formatBuiltDate(builtAt: string): string {
  const stamp = Date.parse(builtAt);
  if (Number.isNaN(stamp)) return "unknown";
  return new Date(stamp).toLocaleDateString("en-CA");
}

/** `1:22 AM` (narrow space before meridiem when the locale supplies it). */
function formatBuiltTime(builtAt: string): string {
  const stamp = Date.parse(builtAt);
  if (Number.isNaN(stamp)) return "unknown";
  return new Date(stamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** UI parts for the first build-info line (time is shown muted in About). */
export function getBuildVersionDisplayParts(info: FiguiBuildInfo = getBuildInfo()) {
  return {
    version: info.version,
    date: formatBuiltDate(info.builtAt),
    time: formatBuiltTime(info.builtAt),
  };
}

/** Format: v11.11.5 (2026-11-11, 1:22 AM) */
export function formatBuildVersionLine(
  info: FiguiBuildInfo = getBuildInfo(),
): string {
  const { version, date, time } = getBuildVersionDisplayParts(info);
  return `v${version} (${date}, ${time})`;
}

/** Format: 936214e, feat-build-info */
export function formatBuildRevisionLine(
  info: FiguiBuildInfo = getBuildInfo(),
): string {
  return `${info.sha}, ${info.branch}`;
}

/** Two-line clipboard payload for the About build info block. */
export function formatBuildInfoCopyText(
  info: FiguiBuildInfo = getBuildInfo(),
): string {
  return `${formatBuildVersionLine(info)}\n${formatBuildRevisionLine(info)}`;
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
