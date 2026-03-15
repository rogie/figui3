import { useState, useEffect, useCallback } from "react";
import type { Section } from "../data/sections";

function getDefaultRoute(sections: Section[]) {
  const first = sections[0];
  if (!first?.examples[0]) return null;
  return { sectionId: first.id, exampleId: first.examples[0].id };
}

function parseHashRoute(hashValue: string, sections: Section[]) {
  if (!hashValue.includes("/")) return null;
  const [sectionId, exampleId] = hashValue.split("/");
  if (!sectionId || !exampleId) return null;
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const example = section.examples.find((e) => e.id === exampleId);
  if (!example) return null;
  return { sectionId, exampleId };
}

export function useNavigation(sections: Section[], basePath: string) {
  const [activeSectionId, setActiveSectionId] = useState("");
  const [activeExampleId, setActiveExampleId] = useState("");

  const navigateTo = useCallback(
    (sectionId: string, exampleId: string) => {
      setActiveSectionId(sectionId);
      setActiveExampleId(exampleId);
      const search = location.search;
      history.replaceState(null, "", `${basePath}${search}#${sectionId}/${exampleId}`);
    },
    [basePath],
  );

  useEffect(() => {
    const route =
      parseHashRoute(location.hash.slice(1), sections) ?? getDefaultRoute(sections);
    if (route) navigateTo(route.sectionId, route.exampleId);
  }, [navigateTo, sections]);

  useEffect(() => {
    const handler = () => {
      const route =
        parseHashRoute(location.hash.slice(1), sections) ?? getDefaultRoute(sections);
      if (!route) return;
      setActiveSectionId(route.sectionId);
      setActiveExampleId(route.exampleId);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [sections]);

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const activeExample = activeSection?.examples.find((e) => e.id === activeExampleId);

  return { activeSectionId, activeExampleId, activeSection, activeExample, navigateTo };
}
