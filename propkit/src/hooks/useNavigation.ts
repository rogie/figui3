import { useState, useEffect, useCallback } from "react";
import { sections } from "../data/sections";

function getDefaultRoute() {
  const first = sections[0];
  if (!first?.examples[0]) return null;
  return { sectionId: first.id, exampleId: first.examples[0].id };
}

function parseHashRoute(hashValue: string) {
  if (!hashValue.includes("/")) return null;
  const [sectionId, exampleId] = hashValue.split("/");
  if (!sectionId || !exampleId) return null;
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const example = section.examples.find((e) => e.id === exampleId);
  if (!example) return null;
  return { sectionId, exampleId };
}

export function useNavigation() {
  const [activeSectionId, setActiveSectionId] = useState("");
  const [activeExampleId, setActiveExampleId] = useState("");

  const navigateTo = useCallback((sectionId: string, exampleId: string) => {
    setActiveSectionId(sectionId);
    setActiveExampleId(exampleId);
    history.replaceState(null, "", `#${sectionId}/${exampleId}`);
  }, []);

  useEffect(() => {
    const route = parseHashRoute(location.hash.slice(1)) ?? getDefaultRoute();
    if (route) navigateTo(route.sectionId, route.exampleId);
  }, [navigateTo]);

  useEffect(() => {
    const handler = () => {
      const route = parseHashRoute(location.hash.slice(1)) ?? getDefaultRoute();
      if (!route) return;
      setActiveSectionId(route.sectionId);
      setActiveExampleId(route.exampleId);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const activeExample = activeSection?.examples.find((e) => e.id === activeExampleId);

  return { activeSectionId, activeExampleId, activeSection, activeExample, navigateTo };
}
