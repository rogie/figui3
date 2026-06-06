import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Nav from "./components/Nav";
import ExampleView from "./components/ExampleView";
import AttributesView from "./components/AttributesView";
import CodeView from "./components/CodeView";
import EventView from "./components/EventView";
import { useTheme } from "./hooks/useTheme";
import { useNavigation } from "./hooks/useNavigation";
import { getExampleSourceMarkup } from "./lib/exampleMarkup";
import { applyAttributeMutation } from "./lib/attributeParser";
import {
  diffFromDefault,
  serializeToURL,
  readFromURL,
  clearURLParams,
  hasURLParams,
  applyParamsToMarkup,
} from "./lib/urlState";
import { propkitSections } from "./data/sections";
import { figui3Sections } from "./data/figui3Sections";
import { labSections } from "./data/labSections";
import type { Section } from "./data/sections";

function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function buildExampleTitle(sectionName: string, exampleName: string): string {
  const sectionWord = sectionName.trim().toLowerCase();
  const base = exampleName.trim();
  if (!base || base.toLowerCase() === "default")
    return toSentenceCase(sectionWord);
  if (base.toLowerCase().endsWith(sectionWord)) return toSentenceCase(base);
  return toSentenceCase(`${base} ${sectionWord}`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildExampleDescription(
  sectionDescription: string,
  sectionName: string,
  exampleName: string,
): string {
  const sectionWord = escapeHtml(sectionName.trim().toLowerCase());
  const base = exampleName.trim();
  if (!base || base.toLowerCase() === "default") return sectionDescription;
  return `${escapeHtml(toSentenceCase(base))} ${sectionWord} example. ${sectionDescription}`;
}

interface Props {
  mode: "propkit" | "figui3" | "lab";
}

function sectionsForMode(mode: Props["mode"]): Section[] {
  if (mode === "lab") return labSections;
  if (mode === "figui3") return figui3Sections;
  return propkitSections;
}

function getRequiredCustomElements(markup: string): string[] {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(markup, "text/html");
  const required = new Set<string>();

  doc.body.querySelectorAll("*").forEach((node) => {
    const tag = node.tagName.toLowerCase();
    if (tag.startsWith("fig-")) {
      required.add(tag);
      return;
    }

    const customizedBuiltIn = node.getAttribute("is")?.toLowerCase();
    if (customizedBuiltIn?.startsWith("fig-")) {
      required.add(customizedBuiltIn);
    }
  });

  return Array.from(required);
}

function getSectionRequiredCustomElements(section: Section): string[] {
  const required = new Set<string>();
  section.examples.forEach((example) => {
    getRequiredCustomElements(example.markup).forEach((tag) => required.add(tag));
  });
  return Array.from(required);
}

function isExampleAvailable(example: Section["examples"][number]) {
  if (typeof customElements === "undefined") return true;
  return getRequiredCustomElements(example.markup).every((tag) =>
    Boolean(customElements.get(tag)),
  );
}

const EDITOR_SECTION_IDS = new Set(["fill-picker", "layer", "toast"]);
const EDITOR_GROUP_NAME = "Editor components";

function filterAvailableSections(
  sections: Section[],
  options: { includeEditorControls: boolean },
): Section[] {
  const visibleSections = sections
    .filter((section) => {
      if (EDITOR_SECTION_IDS.has(section.id)) return options.includeEditorControls;
      return true;
    })
    .map((section) => ({
      ...section,
      group: EDITOR_SECTION_IDS.has(section.id) ? EDITOR_GROUP_NAME : section.group,
      examples: section.examples.filter(isExampleAvailable),
    }))
    .filter((section) => section.examples.length > 0);

  const editorSections = visibleSections.filter(
    (section) => section.group === EDITOR_GROUP_NAME,
  );
  if (!editorSections.length) return visibleSections;

  const otherSections = visibleSections.filter(
    (section) => section.group !== EDITOR_GROUP_NAME,
  );
  const lastCoreIndex = otherSections.reduce(
    (lastIndex, section, index) =>
      section.group === "Core components" ? index : lastIndex,
    -1,
  );
  const insertIndex = lastCoreIndex + 1;

  return [
    ...otherSections.slice(0, insertIndex),
    ...editorSections,
    ...otherSections.slice(insertIndex),
  ];
}

function titleForMode(mode: Props["mode"]): string {
  if (mode === "lab") return "Lab";
  if (mode === "figui3") return "FigUI3";
  return "PropsKit";
}

function basePathForMode(mode: Props["mode"]): string {
  if (mode === "figui3") return "/figui3";
  if (mode === "lab") return "/propskit/lab";
  return "/propskit";
}

export default function App({ mode }: Props) {
  const {
    isDark,
    setTheme,
    includeEditorControls,
    setIncludeEditorControls,
    editorComponentsVersion,
  } = useTheme();
  const allSections: Section[] = sectionsForMode(mode);
  const [customElementsVersion, setCustomElementsVersion] = useState(0);
  const sections = useMemo(
    () => filterAvailableSections(allSections, { includeEditorControls }),
    [
      allSections,
      customElementsVersion,
      editorComponentsVersion,
      includeEditorControls,
    ],
  );
  const basePath = basePathForMode(mode);
  const appTitle = titleForMode(mode);
  const {
    activeSectionId,
    activeExampleId,
    activeSection,
    activeExample,
    navigateTo,
  } = useNavigation(sections, basePath);
  const [editableMarkup, setEditableMarkup] = useState("");
  const defaultMarkupRef = useRef("");
  const initialParamsRef = useRef<Record<string, string> | null>(
    hasURLParams() ? readFromURL() : null,
  );

  useEffect(() => {
    if (typeof customElements === "undefined") return;
    const pending = new Set<string>();
    allSections.forEach((section) => {
      getSectionRequiredCustomElements(section).forEach((tag) => {
        if (!customElements.get(tag)) pending.add(tag);
      });
    });

    let cancelled = false;
    pending.forEach((tag) => {
      customElements.whenDefined(tag).then(() => {
        if (!cancelled) setCustomElementsVersion((version) => version + 1);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [allSections]);

  useEffect(() => {
    if (!activeExample) {
      setEditableMarkup("");
      defaultMarkupRef.current = "";
      return;
    }
    const defaultMarkup = getExampleSourceMarkup(activeExample.markup);
    defaultMarkupRef.current = defaultMarkup;

    const initialParams = initialParamsRef.current;
    if (initialParams) {
      initialParamsRef.current = null;
      setEditableMarkup(applyParamsToMarkup(defaultMarkup, initialParams));
    } else {
      setEditableMarkup(defaultMarkup);
      clearURLParams();
    }
  }, [activeExample]);

  const handleMarkupChange = useCallback((nextMarkup: string) => {
    setEditableMarkup(nextMarkup);
    const defaultMarkup = defaultMarkupRef.current;
    if (defaultMarkup) {
      const diffs = diffFromDefault(nextMarkup, defaultMarkup);
      if (Object.keys(diffs).length > 0) {
        serializeToURL(diffs);
      } else {
        clearURLParams();
      }
    }
  }, []);

  const syncURL = useCallback((nextMarkup: string) => {
    const defaultMarkup = defaultMarkupRef.current;
    if (!defaultMarkup) return;
    const diffs = diffFromDefault(nextMarkup, defaultMarkup);
    if (Object.keys(diffs).length > 0) {
      serializeToURL(diffs);
    } else {
      clearURLParams();
    }
  }, []);

  const handlePersistImageSource = useCallback(
    (fieldIndex: number, src: string) => {
      if (!src) return;
      if (src.startsWith("blob:")) return;
      setEditableMarkup((currentMarkup) => {
        const next = applyAttributeMutation(currentMarkup, {
          fieldIndex,
          target: "control",
          name: "src",
          value: src,
        });
        syncURL(next);
        return next;
      });
    },
    [syncURL],
  );

  const handlePersistDialogOpenState = useCallback(
    (fieldIndex: number, isOpen: boolean) => {
      setEditableMarkup((currentMarkup) => {
        const next = applyAttributeMutation(currentMarkup, {
          fieldIndex,
          target: "control",
          name: "open",
          value: isOpen ? "" : null,
        });
        syncURL(next);
        return next;
      });
    },
    [syncURL],
  );

  const handlePersistSwitchCheckedState = useCallback(
    (fieldIndex: number, isChecked: boolean) => {
      setEditableMarkup((currentMarkup) => {
        const next = applyAttributeMutation(currentMarkup, {
          fieldIndex,
          target: "control",
          name: "checked",
          value: isChecked ? "" : null,
        });
        syncURL(next);
        return next;
      });
    },
    [syncURL],
  );

  const handlePersistControlValue = useCallback(
    (fieldIndex: number, value: string) => {
      setEditableMarkup((currentMarkup) => {
        const next = applyAttributeMutation(currentMarkup, {
          fieldIndex,
          target: "control",
          name: "value",
          value,
        });
        syncURL(next);
        return next;
      });
    },
    [syncURL],
  );

  const activeTitle =
    activeSection && activeExample
      ? (activeExample.title ??
          buildExampleTitle(activeSection.name, activeExample.name))
      : (activeSection?.name ?? "");
  const activeDescription =
    activeSection && activeExample
      ? (activeExample.description ??
          buildExampleDescription(
            activeSection.description,
            activeSection.name,
            activeExample.name,
          ))
      : (activeSection?.description ?? "");

  return (
    <>
      <Nav
        activeSectionId={activeSectionId}
        activeExampleId={activeExampleId}
        isDark={isDark}
        setTheme={setTheme}
        includeEditorControls={includeEditorControls}
        setIncludeEditorControls={setIncludeEditorControls}
        navigateTo={navigateTo}
        sections={sections}
        appTitle={appTitle}
      />
      <main className={mode === "figui3" ? "mode-figui3" : undefined}>
        {activeSection && (
          <>
            <h2>{activeTitle}</h2>
            <p
              className="description"
              dangerouslySetInnerHTML={{ __html: activeDescription }}
            />
          </>
        )}
        {activeExample && (
          <div className="example-view-container">
            <ExampleView
              key={`${activeSectionId}/${activeExampleId}`}
              example={activeExample}
              markup={editableMarkup}
              onPersistImageSource={
                mode === "figui3" || mode === "lab" ? handlePersistImageSource : undefined
              }
              onPersistDialogOpenState={handlePersistDialogOpenState}
              onPersistSwitchCheckedState={handlePersistSwitchCheckedState}
              onPersistControlValue={handlePersistControlValue}
            />
          </div>
        )}
        <CodeView markup={editableMarkup} onMarkupChange={handleMarkupChange} />
      </main>
      <aside className="attributes-sidebar">
        <AttributesView
          markup={editableMarkup}
          onMarkupChange={handleMarkupChange}
          showFieldControls={mode === "propkit" || mode === "lab" || activeSectionId === "field"}
          includeFullControl={mode === "figui3" || mode === "lab"}
        />
        {((mode === "propkit" || mode === "lab" || mode === "figui3") && activeSectionId !== "skeleton") && (
          <EventView key={`${activeSectionId}/${activeExampleId}`} />
        )}
      </aside>
    </>
  );
}
