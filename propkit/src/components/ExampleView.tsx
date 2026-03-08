import { useRef, useEffect } from "react";
import type { Example } from "../data/sections";
import { getInjectedExampleMarkup } from "../lib/exampleMarkup";

interface Props {
  example: Example;
  markup: string;
}

export default function ExampleView({ example, markup }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.querySelectorAll("fig-slider").forEach((s) =>
      s.setAttribute("variant", "neue"),
    );
  }, [example, markup]);

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
