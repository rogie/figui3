import { useRef, useEffect } from "react";
import type { Example } from "../data/sections";
import { getInjectedExampleMarkup } from "../lib/exampleMarkup";

interface Props {
  example: Example;
  markup: string;
  onPersistImageSource?: (fieldIndex: number, src: string) => void;
}

export default function ExampleView({
  example,
  markup,
  onPersistImageSource,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onPersistImageSource) return;

    const handleLoaded = (event: Event) => {
      const customEvent = event as CustomEvent<{ base64?: string }>;
      const imageEl = event.target as HTMLElement | null;
      if (!imageEl || imageEl.tagName.toLowerCase() !== "fig-image") return;

      const srcAttr = imageEl.getAttribute("src") ?? "";
      if (!srcAttr.startsWith("blob:")) return;

      const base64 = customEvent.detail?.base64;
      if (!base64) return;

      const field = imageEl.closest("fig-field");
      if (!field) return;
      const fields = Array.from(container.querySelectorAll("fig-field"));
      const fieldIndex = fields.indexOf(field);
      if (fieldIndex < 0) return;

      onPersistImageSource(fieldIndex, base64);
    };

    container.addEventListener("loaded", handleLoaded as EventListener);
    return () => {
      container.removeEventListener("loaded", handleLoaded as EventListener);
    };
  }, [onPersistImageSource]);

  return (
    <div>
      <div
        ref={containerRef}
        key={example.id}
        dangerouslySetInnerHTML={{ __html: getInjectedExampleMarkup(markup) }}
      />
    </div>
  );
}
