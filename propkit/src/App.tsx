import { useCallback, useEffect, useState } from "react";
import Nav from "./components/Nav";
import ExampleView from "./components/ExampleView";
import AttributesView from "./components/AttributesView";
import CodeView from "./components/CodeView";
import { useTheme } from "./hooks/useTheme";
import { useNavigation } from "./hooks/useNavigation";
import { getExampleSourceMarkup } from "./lib/exampleMarkup";
import { applyAttributeMutation } from "./lib/attributeParser";

function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function buildExampleTitle(sectionName: string, exampleName: string): string {
  const sectionWord = sectionName.trim().toLowerCase();
  const base = exampleName.trim();
  if (!base || base.toLowerCase() === "default") return toSentenceCase(sectionWord);
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

export default function App() {
  const { isDark, setTheme } = useTheme();
  const { activeSectionId, activeExampleId, activeSection, activeExample, navigateTo } =
    useNavigation();
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

  const activeTitle =
    activeSection && activeExample
      ? buildExampleTitle(activeSection.name, activeExample.name)
      : activeSection?.name ?? "";
  const activeDescription =
    activeSection && activeExample
      ? buildExampleDescription(
          activeSection.description,
          activeSection.name,
          activeExample.name,
        )
      : activeSection?.description ?? "";

  return (
    <>
      <Nav
        activeSectionId={activeSectionId}
        activeExampleId={activeExampleId}
        isDark={isDark}
        setTheme={setTheme}
        navigateTo={navigateTo}
      />
      <main>
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
            />
          </div>
        )}
        <AttributesView markup={editableMarkup} onMarkupChange={handleMarkupChange} />
        <CodeView
          markup={editableMarkup}
          onMarkupChange={handleMarkupChange}
        />
      </main>
    </>
  );
}
