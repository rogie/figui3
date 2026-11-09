import { useEffect, useRef, useState } from "react";
// @ts-expect-error Local runtime source is typed by the package entrypoint.
import { figCreateProps, figCreatePropsRoot } from "../../../propskit.js";
import type { PropsKitExample } from "../data/propskitSections";
import CodeView from "./CodeView";

const PROPSKIT_IMPORT =
  /import\s*\{[\s\S]*?\}\s*from\s*["']@rogieking\/figui3\/propskit\.js["'];?/g;

function withoutPropsKitImport(source: string): string {
  return source.replace(PROPSKIT_IMPORT, "");
}

interface Props {
  example: PropsKitExample;
  onValuesChange: (values: unknown) => void;
  onEventChange: (event: unknown) => void;
}

export default function PropsKitExampleView({
  example,
  onValuesChange,
  onEventChange,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [draftMarkup, setDraftMarkup] = useState(example.markup);
  const [runState, setRunState] = useState({
    markup: example.markup,
    revision: 0,
  });
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    const target = mountRef.current;
    if (!target) return;
    const kits: Array<ReturnType<typeof figCreateProps>> = [];
    const roots: Array<ReturnType<typeof figCreatePropsRoot>> = [];
    const unsubscribes: Array<() => void> = [];

    target.replaceChildren();
    setRunError(null);

    const createProps = ((
      name: unknown,
      config: unknown,
      options: {
        onInput?: (path: string, value: unknown, interaction: unknown) => void;
        onChange?: (path: string, value: unknown, interaction: unknown) => void;
        [key: string]: unknown;
      } = {},
    ) => {
      const kit = figCreateProps(name, config, {
        ...options,
        onInput(path: string, value: unknown, interaction: unknown) {
          options.onInput?.(path, value, interaction);
          onEventChange({ phase: "input", path, value, interaction });
        },
        onChange(path: string, value: unknown, interaction: unknown) {
          options.onChange?.(path, value, interaction);
          onEventChange({ phase: "change", path, value, interaction });
        },
      });
      kits.push(kit);
      unsubscribes.push(
        kit.subscribe((values: unknown) => onValuesChange(values)),
        kit.subscribe(
          (records: unknown) => onEventChange(records),
          { mode: "changes" },
        ),
      );
      return kit;
    }) as typeof figCreateProps;

    const createPropsRoot = ((
      options: {
        target?: string | HTMLElement;
        [key: string]: unknown;
      } = {},
    ) => {
      const requestedTarget = options.target;
      const scopedTarget =
        typeof requestedTarget === "string"
          ? (target.matches(requestedTarget)
              ? target
              : target.querySelector<HTMLElement>(requestedTarget)) ?? target
          : (requestedTarget ?? target);
      const root = figCreatePropsRoot({
        ...options,
        target: scopedTarget,
      });
      roots.push(root);
      return root;
    }) as typeof figCreatePropsRoot;

    const execute = (source: string) => {
      const run = new Function(
        "figCreateProps",
        "figCreatePropsRoot",
        `"use strict";\n${withoutPropsKitImport(source)}`,
      );
      run(createProps, createPropsRoot);
    };

    try {
      if (example.lang === "html") {
        const template = document.createElement("template");
        template.innerHTML = runState.markup;
        const scripts = Array.from(
          template.content.querySelectorAll<HTMLScriptElement>("script"),
        );
        scripts.forEach((script) => script.remove());
        target.append(template.content.cloneNode(true));
        scripts.forEach((script) => execute(script.textContent ?? ""));
      } else {
        execute(runState.markup);
      }
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    }

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      roots.forEach((root) => root.destroy());
      kits.forEach((kit) => kit.destroy());
      target.replaceChildren();
    };
  }, [
    example.lang,
    onEventChange,
    onValuesChange,
    runState.markup,
    runState.revision,
  ]);

  useEffect(() => {
    if (draftMarkup === runState.markup) return;
    const timeout = window.setTimeout(() => {
      setRunState((current) => ({
        markup: draftMarkup,
        revision: current.revision + 1,
      }));
    }, 2_000);
    return () => window.clearTimeout(timeout);
  }, [draftMarkup, runState.markup]);

  return (
    <>
      <div className="example-view-container">
        <div className="propkit-example propskit-example-preview">
          <div id="properties" ref={mountRef} />
          {runError ? (
            <div className="propkit-run-error" role="alert">
              {runError}
            </div>
          ) : null}
        </div>
      </div>
      <CodeView
        markup={draftMarkup}
        onMarkupChange={setDraftMarkup}
        lang={example.lang ?? "javascript"}
        showPromptAction={false}
        title={example.lang === "html" ? "HTML + JavaScript" : "JavaScript"}
      />
    </>
  );
}
