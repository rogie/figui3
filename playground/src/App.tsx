import { useCallback, useEffect, useRef, useState } from "react";
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

function titleForMode(mode: Props["mode"]): string {
  if (mode === "lab") return "Lab";
  if (mode === "figui3") return "FigUI3";
  return "Propkit";
}

export default function App({ mode }: Props) {
  const { isDark, setTheme, includeFillPicker, setIncludeFillPicker } =
    useTheme();
  const sections: Section[] = sectionsForMode(mode);
  const canonicalBase =
    mode === "figui3"
      ? "/figui3"
      : mode === "lab"
        ? "/propkit/lab"
        : "/propkit";
  const basePath = canonicalBase;
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
        includeFillPicker={includeFillPicker}
        setIncludeFillPicker={setIncludeFillPicker}
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
        {((mode === "propkit" || mode === "lab") && activeSectionId !== "skeleton" || (mode === "figui3" && activeSectionId === "menu")) && (
          <EventView key={`${activeSectionId}/${activeExampleId}`} />
        )}
      </aside>
    </>
  );
}
