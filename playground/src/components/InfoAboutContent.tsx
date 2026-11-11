import type { ComponentType, SVGProps } from "react";
import GithubIcon from "../icons/icon.github.svg?react";
import NpmIcon from "../icons/icon.npm.svg?react";
import PlaygroundIcon from "../icons/icon.playground.svg?react";
import {
  formatBuildVersionLine,
  formatGithubLabel,
  formatNpmLabel,
  formatNpmUrl,
  getBuildInfo,
} from "../lib/buildInfo";

type LinkIcon = ComponentType<SVGProps<SVGSVGElement>>;
type InfoLink = {
  id: string;
  label: string;
  href: string;
  Icon: LinkIcon;
};

const PLAYGROUND_URL = "https://rog.ie/figui3";
const AUTHOR_URL = "https://rog.ie";

/** Shared About body for the title popup and Preferences → About section. */
export default function InfoAboutContent() {
  const buildInfo = getBuildInfo();
  const versionLine = formatBuildVersionLine(buildInfo);

  const links: InfoLink[] = [
    ...(buildInfo.repositoryUrl
      ? [
          {
            id: "github",
            label: formatGithubLabel(buildInfo),
            href: buildInfo.repositoryUrl,
            Icon: GithubIcon,
          },
        ]
      : []),
    ...(buildInfo.name
      ? [
          {
            id: "npm",
            label: formatNpmLabel(buildInfo),
            href: formatNpmUrl(buildInfo),
            Icon: NpmIcon,
          },
        ]
      : []),
    {
      id: "playground",
      label: "Figma PropsKit playground",
      href: PLAYGROUND_URL,
      Icon: PlaygroundIcon,
    },
  ];

  return (
    <div className="info-about">
      <div className="info-popup-intro">
        <p>{buildInfo.description}</p>
      </div>
      {buildInfo.author ? (
        <p className="info-popup-credit">
          Crafted by{" "}
          <button
            type="button"
            className="info-popup-credit-link"
            onClick={() => {
              window.open(AUTHOR_URL, "_blank", "noopener,noreferrer");
            }}
          >
            {buildInfo.author}
          </button>
        </p>
      ) : null}
      <fig-stack className="info-popup-links">
        {links.map(({ id, label, href, Icon }) => (
          <fig-tooltip key={id} text={label}>
            <fig-button
              variant="ghost"
              icon
              aria-label={label}
              onClick={() => {
                window.open(href, "_blank", "noopener,noreferrer");
              }}
            >
              <Icon />
            </fig-button>
          </fig-tooltip>
        ))}
      </fig-stack>
      <fig-separator />
      <fig-field direction="vertical">
        <label>{versionLine}</label>
        <span>{buildInfo.branch}</span>
      </fig-field>
    </div>
  );
}
