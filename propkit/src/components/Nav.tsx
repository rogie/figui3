import { useRef, useEffect, useCallback } from "react";
import { sections } from "../data/sections";
import ThemeToggle from "./ThemeToggle";

interface Props {
  activeSectionId: string;
  activeExampleId: string;
  isDark: boolean;
  setTheme: (dark: boolean) => void;
  navigateTo: (sectionId: string, exampleId: string) => void;
}

const orderedExamples = sections.flatMap((section) =>
  section.examples.map((example) => ({
    sectionId: section.id,
    exampleId: example.id,
  })),
);

function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export default function Nav({
  activeSectionId,
  activeExampleId,
  isDark,
  setTheme,
  navigateTo,
}: Props) {
  const navRef = useRef<HTMLDivElement>(null);

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
        const firstChild = layer.querySelector("fig-layer[data-example]") as HTMLElement | null;
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

    el.querySelectorAll<HTMLElement>(":scope > fig-layer[data-section]").forEach((parent) => {
      if (parent.dataset.section === activeSectionId) {
        parent.setAttribute("open", "true");
      }
    });

    const activeLayer = el.querySelector<HTMLElement>(
      `fig-layer[data-section="${activeSectionId}"][data-example="${activeExampleId}"]`,
    );
    if (!activeLayer) return;

    const containerRect = el.getBoundingClientRect();
    const layerRect = activeLayer.getBoundingClientRect();
    const isAbove = layerRect.top < containerRect.top;
    const isBelow = layerRect.bottom > containerRect.bottom;
    if (isAbove || isBelow) {
      activeLayer.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
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
    [activeSectionId, activeExampleId, navigateTo],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleArrowKeyNavigation);
    return () => window.removeEventListener("keydown", handleArrowKeyNavigation);
  }, [handleArrowKeyNavigation]);

  return (
    <nav>
      <fig-header>
        <h1>PropKit</h1>
        <ThemeToggle isDark={isDark} setTheme={setTheme} />
      </fig-header>
      <div className="nav-links" ref={navRef}>
        {sections.map((section) => {
          const isSingleExample = section.examples.length === 1;
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
        })}
      </div>
    </nav>
  );
}
