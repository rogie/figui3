import { useRef, useState, type ComponentType, type SVGProps } from "react";
import AboutIcon from "../icons/icon.24.info.svg?react";
import GithubIcon from "../icons/icon.github.svg?react";
import NpmIcon from "../icons/icon.npm.svg?react";
import PlaygroundIcon from "../icons/icon.playground.svg?react";
import { useFigPopupAnchor } from "../hooks/useFigPopupAnchor";
import {
  formatBuildVersionLine,
  formatGithubLabel,
  formatNpmLabel,
  formatNpmUrl,
  getBuildInfo,
} from "../lib/buildInfo";

interface Props {
  appTitle: string;
  isDark: boolean;
}

type LinkIcon = ComponentType<SVGProps<SVGSVGElement>>;
type InfoLink = {
  id: string;
  label: string;
  href: string;
  Icon: LinkIcon;
};

const PLAYGROUND_URL = "https://rog.ie/figui3";
const AUTHOR_URL = "https://rog.ie";

export default function InfoPopup({ appTitle, isDark }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDialogElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  // Compile-time constant from Vite `define` — safe to read once per render.
  const buildInfo = getBuildInfo();
  const versionLine = formatBuildVersionLine(buildInfo);

  // Links/labels come from root package.json (baked at Vite config time).
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
      label: "FigUI3 playground",
      href: PLAYGROUND_URL,
      Icon: PlaygroundIcon,
    },
  ];

  const popupAttrs = {
    is: "fig-popup",
    variant: "popover",
    position: "bottom",
    offset: "0 8",
    // Invert theme so the popup contrasts against the nav chrome.
    theme: isDark ? "light" : "dark",
  } as any;

  const toggleInfo = () => setInfoOpen((open) => !open);

  useFigPopupAnchor(popupRef, triggerRef, infoOpen, () => setInfoOpen(false));

  return (
    <fig-stack className="nav-title-info" data-dark={isDark || undefined}>
      {/* Title + icon are one hover/click target. */}
      <fig-tooltip text="About FigUI3">
        <button
          ref={triggerRef}
          type="button"
          className="nav-title-trigger"
          aria-label="About FigUI3"
          aria-haspopup="dialog"
          aria-controls="info-popup"
          aria-expanded={infoOpen}
          onClick={toggleInfo}
        >
          <h1>{appTitle}</h1>
          <AboutIcon aria-hidden="true" />
        </button>
      </fig-tooltip>
      <dialog
        id="info-popup"
        ref={popupRef}
        {...popupAttrs}
        open={infoOpen ? true : undefined}
        className="info-popup"
        aria-labelledby="info-popup-title"
      >
        <fig-header>
          <h3 id="info-popup-title">About FigUI3</h3>
        </fig-header>
        <fig-content>
          <div className="info-popup-intro">
            <p>{buildInfo.description}</p>
          </div>
          {/* Same ghost icon-button row pattern as Preferences / theme switch. */}
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
          {buildInfo.author ? (
            <p className="info-popup-credit">
              Created by{" "}
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
          <fig-separator></fig-separator>
          {/* Build metadata sits below the rule. */}
          <fig-field direction="vertical">
            <label>{versionLine}</label>
            <span>{buildInfo.branch}</span>
          </fig-field>
        </fig-content>
      </dialog>
    </fig-stack>
  );
}
