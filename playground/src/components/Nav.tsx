import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { Section } from "../data/sections";
import ThemeToggle from "./ThemeToggle";
import { copyText } from "../lib/prompt";
import { useCopyTooltip } from "../hooks/useCopyTooltip";
import ClipboardIcon from "../icons/icon.24.clipboard.svg?react";
import ChatIcon from "../icons/icon.24.cursor-chat.svg?react";

interface Props {
  activeSectionId: string;
  activeExampleId: string;
  isDark: boolean;
  setTheme: (dark: boolean) => void;
  includeEditorControls: boolean;
  setIncludeEditorControls: (include: boolean) => void;
  navigateTo: (sectionId: string, exampleId: string) => void;
  sections: Section[];
  appTitle: string;
  groupOrder?: string[];
}

const INSTALL_COMMAND = "npm i @rogieking/figui3";
const INSTALL_PROMPT =
  "Install the npm package @rogieking/figui3. Then use the included .cursor/skills files (figui3 and playground) for implementation guidance.";
const COLLAPSED_GROUPS = new Set([
  "Utilities",
  "Native elements",
  "Editor components",
  "Dialog examples",
]);

function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return (
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  ).replace(/^Ai\b/, "AI");
}

export default function Nav({
  activeSectionId,
  activeExampleId,
  isDark,
  setTheme,
  includeEditorControls,
  setIncludeEditorControls,
  navigateTo,
  sections,
  appTitle,
  groupOrder,
}: Props) {
  const navRef = useRef<HTMLDivElement>(null);
  const commandCopyTooltipRef = useRef<HTMLElement>(null);
  const promptCopyTooltipRef = useRef<HTMLElement>(null);
  const { showCopyTooltip } = useCopyTooltip();
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredSections = useMemo(() => {
    if (!normalizedSearch) return sections;

    const matches = (...values: Array<string | undefined>) =>
      values.some((value) =>
        value?.toLocaleLowerCase().includes(normalizedSearch),
      );

    return sections.flatMap((section) => {
      const sectionMatches = matches(
        section.id,
        section.name,
        section.group,
        section.description,
      );
      const examples = sectionMatches
        ? section.examples
        : section.examples.filter((example) =>
            matches(
              example.id,
              example.name,
              example.title,
              example.description,
            ),
          );

      return examples.length ? [{ ...section, examples }] : [];
    });
  }, [normalizedSearch, sections]);
  const singleExampleSectionIds = useMemo(
    () =>
      new Set(
        sections
          .filter((section) => section.examples.length === 1)
          .map((section) => section.id),
      ),
    [sections],
  );
  const orderedExamples = useMemo(
    () =>
      filteredSections.flatMap((section) =>
        section.examples.map((example) => ({
          sectionId: section.id,
          exampleId: example.id,
        })),
      ),
    [filteredSections],
  );

  const handleCopyInstallCommand = useCallback(async () => {
    await copyText(INSTALL_COMMAND);
    showCopyTooltip("Command copied", commandCopyTooltipRef.current);
  }, [showCopyTooltip]);

  const handleCopyInstallPrompt = useCallback(async () => {
    await copyText(INSTALL_PROMPT);
    showCopyTooltip("Prompt copied", promptCopyTooltipRef.current);
  }, [showCopyTooltip]);

  const handleLayerClick = useCallback(
    (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest(".fig-layer-chevron")) return;

      const row = target.closest(".fig-layer-row");
      if (!row) return;

      const layer = row.parentElement as HTMLElement;
      if (!layer?.tagName?.toLowerCase().includes("fig-layer")) return;

      const sectionId = layer.dataset.section;
      const exampleId = layer.dataset.example;

      if (sectionId && exampleId) {
        navigateTo(sectionId, exampleId);
      } else if (sectionId && !exampleId) {
        layer.setAttribute("open", "true");
        const firstChild = layer.querySelector(
          "fig-layer[data-example]",
        ) as HTMLElement | null;
        if (firstChild) {
          navigateTo(firstChild.dataset.section!, firstChild.dataset.example!);
        }
      }
    },
    [navigateTo],
  );

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.addEventListener("click", handleLayerClick);
    return () => el.removeEventListener("click", handleLayerClick);
  }, [handleLayerClick]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.querySelectorAll("fig-layer[data-example]").forEach((layer) => {
      const htmlLayer = layer as HTMLElement;
      const isActive =
        htmlLayer.dataset.section === activeSectionId &&
        htmlLayer.dataset.example === activeExampleId;
      if (isActive) htmlLayer.setAttribute("selected", "true");
      else htmlLayer.removeAttribute("selected");
    });

    el.querySelectorAll<HTMLElement>(
      "fig-layer[data-section]:not(fig-layer fig-layer)",
    ).forEach((parent) => {
      if (parent.dataset.section === activeSectionId) {
        parent.setAttribute("open", "true");
      }
    });

    const activeLayer = el.querySelector<HTMLElement>(
      `fig-layer[data-section="${activeSectionId}"][data-example="${activeExampleId}"]`,
    );
    if (!activeLayer) return;

    activeLayer
      .closest<HTMLElement>("fig-group[collapsible]")
      ?.setAttribute("open", "true");

    const frame = requestAnimationFrame(() => {
      const containerRect = el.getBoundingClientRect();
      const layerRect = activeLayer.getBoundingClientRect();
      const isAbove = layerRect.top < containerRect.top;
      const isBelow = layerRect.bottom > containerRect.bottom;
      if (isAbove || isBelow) {
        activeLayer.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSectionId, activeExampleId]);

  const handleArrowKeyNavigation = useCallback(
    (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const navEl = navRef.current;
      if (!navEl) return;

      const focused = document.activeElement as HTMLElement | null;
      const focusInNav = focused ? navEl.contains(focused) : false;
      const bodyFocused = focused === document.body;
      if (!focusInNav && !bodyFocused) return;

      const currentIndex = orderedExamples.findIndex(
        ({ sectionId, exampleId }) =>
          sectionId === activeSectionId && exampleId === activeExampleId,
      );
      if (currentIndex === -1) return;

      const offset = e.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(
        orderedExamples.length - 1,
        Math.max(0, currentIndex + offset),
      );
      if (nextIndex === currentIndex) return;

      const next = orderedExamples[nextIndex];
      navigateTo(next.sectionId, next.exampleId);
      e.preventDefault();
    },
    [activeSectionId, activeExampleId, navigateTo, orderedExamples],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleArrowKeyNavigation);
    return () =>
      window.removeEventListener("keydown", handleArrowKeyNavigation);
  }, [handleArrowKeyNavigation]);

  return (
    <nav>
      <fig-header borderless>
        <h1>{appTitle}</h1>
        <ThemeToggle
          isDark={isDark}
          setTheme={setTheme}
          includeEditorControls={includeEditorControls}
          setIncludeEditorControls={setIncludeEditorControls}
        />
      </fig-header>
      <fig-header className="nav-search-header">
        <fig-input-text
          type="search"
          value={searchQuery}
          placeholder="Search examples..."
          aria-label="Search examples"
          full
          onInput={(event: React.FormEvent<HTMLElement>) => {
            const input = event.currentTarget as HTMLElement & {
              value?: string;
            };
            setSearchQuery(input.value ?? "");
          }}
        ></fig-input-text>
      </fig-header>
      <div className="nav-links fig-overflow-fade" ref={navRef}>
        {filteredSections.length === 0 && (
          <div className="nav-search-empty">No examples found</div>
        )}
        {(() => {
          const groups: { group: string | undefined; sections: Section[] }[] =
            [];
          for (const section of filteredSections) {
            const existing = section.group
              ? groups.find((entry) => entry.group === section.group)
              : groups[groups.length - 1]?.group === undefined
                ? groups[groups.length - 1]
                : undefined;
            if (existing) {
              existing.sections.push(section);
            } else {
              groups.push({ group: section.group, sections: [section] });
            }
          }
          if (groupOrder) {
            const orderedGroups = groupOrder.map(
              (group) =>
                groups.find((entry) => entry.group === group) ?? {
                  group,
                  sections: [],
                },
            );
            groups
              .filter(
                (entry) =>
                  !entry.group || !groupOrder.includes(entry.group),
              )
              .forEach((entry) => orderedGroups.push(entry));
            groups.splice(0, groups.length, ...orderedGroups);
          }
          const nativeElementsIndex = groups.findIndex(
            (entry) => entry.group === "Native elements",
          );
          if (nativeElementsIndex >= 0) {
            groups.push(...groups.splice(nativeElementsIndex, 1));
          }

          return groups.map((g, gi) => {
            const layers = g.sections.map((section) => {
              const isSingleExample = singleExampleSectionIds.has(section.id);
              const onlyExample = section.examples[0];
              return (
                <fig-layer
                  key={section.id}
                  data-section={section.id}
                  data-example={isSingleExample ? onlyExample.id : undefined}
                >
                  <div className="fig-layer-row">
                    <label>{toSentenceCase(section.name)}</label>
                  </div>
                  {!isSingleExample &&
                    section.examples.map((example) => (
                      <fig-layer
                        key={example.id}
                        data-section={section.id}
                        data-example={example.id}
                      >
                        <div className="fig-layer-row">
                          <label>{toSentenceCase(example.name)}</label>
                        </div>
                      </fig-layer>
                    ))}
                </fig-layer>
              );
            });

            if (g.group) {
              const collapsed = COLLAPSED_GROUPS.has(g.group);
              return (
                <fig-group
                  key={g.group}
                  name={g.group}
                  compact
                  collapsible
                  open={normalizedSearch ? true : collapsed ? undefined : true}
                >
                  {layers}
                </fig-group>
              );
            }
            return (
              <React.Fragment key={`ungrouped-${gi}`}>
                {layers}
              </React.Fragment>
            );
          });
        })()}
      </div>
      <footer className="nav-footer">
        <div className="nav-install-row">
          <fig-input-text value={INSTALL_COMMAND} readonly></fig-input-text>
          <fig-tooltip ref={commandCopyTooltipRef} text="Copy command">
            <fig-button
              variant="ghost"
              icon
              onClick={handleCopyInstallCommand}
              aria-label="Copy install command"
            >
              <ClipboardIcon />
            </fig-button>
          </fig-tooltip>
          <fig-tooltip ref={promptCopyTooltipRef} text="Copy prompt">
            <fig-button
              variant="ghost"
              icon
              onClick={handleCopyInstallPrompt}
              aria-label="Copy install prompt"
            >
              <ChatIcon />
            </fig-button>
          </fig-tooltip>
        </div>
      </footer>
    </nav>
  );
}
