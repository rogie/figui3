import { useCallback, useEffect, useState } from "react";
import Nav from "./components/Nav";
import ExampleView from "./components/ExampleView";
import AttributesView from "./components/AttributesView";
import CodeView from "./components/CodeView";
import { useTheme } from "./hooks/useTheme";
import { useNavigation } from "./hooks/useNavigation";
import { getExampleSourceMarkup } from "./lib/exampleMarkup";
import { applyAttributeMutation } from "./lib/attributeParser";
import { propkitSections } from "./data/sections";
import { figui3Sections } from "./data/figui3Sections";
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

function buildExampleDescription(
  sectionDescription: string,
  sectionName: string,
  exampleName: string,
): string {
  const sectionWord = sectionName.trim().toLowerCase();
  const base = exampleName.trim();
  if (!base || base.toLowerCase() === "default") return sectionDescription;
  return `${toSentenceCase(base)} ${sectionWord} example. ${sectionDescription}`;
}

interface Props {
  mode: "propkit" | "figui3";
}

export default function App({ mode }: Props) {
  const { isDark, setTheme } = useTheme();
  const sections: Section[] =
    mode === "figui3" ? figui3Sections : propkitSections;
  const basePath = mode === "figui3" ? "/figui3" : "/propkit";
  const appTitle = mode === "figui3" ? "FigUI3" : "Propkit";
  const {
    activeSectionId,
    activeExampleId,
    activeSection,
    activeExample,
    navigateTo,
  } = useNavigation(sections, basePath);
  const [editableMarkup, setEditableMarkup] = useState("");

  useEffect(() => {
    if (!activeExample) {
      setEditableMarkup("");
      return;
    }
    setEditableMarkup(getExampleSourceMarkup(activeExample.markup));
  }, [activeExample]);

  const handleMarkupChange = useCallback((nextMarkup: string) => {
    setEditableMarkup(nextMarkup);
  }, []);

  const handlePersistImageSource = useCallback(
    (fieldIndex: number, src: string) => {
      if (!src) return;
      setEditableMarkup((currentMarkup) =>
        applyAttributeMutation(currentMarkup, {
          fieldIndex,
          target: "control",
          name: "src",
          value: src,
        }),
      );
    },
    [],
  );

  const handlePersistDialogOpenState = useCallback(
    (fieldIndex: number, isOpen: boolean) => {
      setEditableMarkup((currentMarkup) =>
        applyAttributeMutation(currentMarkup, {
          fieldIndex,
          target: "control",
          name: "open",
          value: isOpen ? "" : null,
        }),
      );
    },
    [],
  );

  const handlePersistSwitchCheckedState = useCallback(
    (fieldIndex: number, isChecked: boolean) => {
      setEditableMarkup((currentMarkup) =>
        applyAttributeMutation(currentMarkup, {
          fieldIndex,
          target: "control",
          name: "checked",
          value: isChecked ? "" : null,
        }),
      );
    },
    [],
  );

  const handlePersistControlValue = useCallback(
    (fieldIndex: number, value: string) => {
      setEditableMarkup((currentMarkup) =>
        applyAttributeMutation(currentMarkup, {
          fieldIndex,
          target: "control",
          name: "value",
          value,
        }),
      );
    },
    [],
  );

  const activeTitle =
    activeSection && activeExample
      ? buildExampleTitle(activeSection.name, activeExample.name)
      : (activeSection?.name ?? "");
  const activeDescription =
    activeSection && activeExample
      ? buildExampleDescription(
          activeSection.description,
          activeSection.name,
          activeExample.name,
        )
      : (activeSection?.description ?? "");

  return (
    <>
      <Nav
        activeSectionId={activeSectionId}
        activeExampleId={activeExampleId}
        isDark={isDark}
        setTheme={setTheme}
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
              onPersistImageSource={handlePersistImageSource}
              onPersistDialogOpenState={handlePersistDialogOpenState}
              onPersistSwitchCheckedState={handlePersistSwitchCheckedState}
              onPersistControlValue={handlePersistControlValue}
            />
          </div>
        )}
        <AttributesView
          markup={editableMarkup}
          onMarkupChange={handleMarkupChange}
          showFieldControls={mode !== "figui3" || activeSectionId === "field"}
          includeFullControl={mode === "figui3"}
        />
        <CodeView markup={editableMarkup} onMarkupChange={handleMarkupChange} />
      </main>
    </>
  );
}
