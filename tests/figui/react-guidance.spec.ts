import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const readWorkspaceFile = (path: string) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("React event guidance stays synchronized across published skill copies", async () => {
  const [cursorGuide, packagedGuide] = await Promise.all([
    readWorkspaceFile(".cursor/skills/figui3/react.md"),
    readWorkspaceFile("skills/figui3/react.md"),
  ]);

  expect(cursorGuide).toBe(packagedGuide);
});

test("React event guidance documents the React 18 and 19 event contract", async () => {
  const [guide, readme, ...componentGuides] = await Promise.all([
    readWorkspaceFile("skills/figui3/react.md"),
    readWorkspaceFile("README.md"),
    readWorkspaceFile(".cursor/skills/figui3/components.md"),
    readWorkspaceFile("skills/figui3/components.md"),
    readWorkspaceFile(".cursor/skills/fig-editor/components.md"),
    readWorkspaceFile("skills/fig-editor/components.md"),
    readWorkspaceFile(".cursor/skills/fig-lab/components.md"),
    readWorkspaceFile("skills/fig-lab/components.md"),
  ]);

  for (const content of [guide, readme]) {
    expect(content).toContain("React 19");
    expect(content).toContain("React 18");
    expect(content).toContain("nativeEvent.detail");
    expect(content).toContain("addEventListener");
  }

  expect(guide).toContain(
    "JSX `onChange` is not reliable on custom elements",
  );
  expect(guide).toContain(
    "(event.nativeEvent as CustomEvent).detail",
  );
  expect(readme).toContain(
    "do not rely on JSX `onChange` for custom elements",
  );
  for (const componentGuide of componentGuides) {
    expect(componentGuide).toMatch(
      /JSX `onChange` examples target React\s+19/,
    );
    expect(componentGuide).toContain(
      "`change` through `addEventListener`",
    );
  }
});

test("React guidance documents event-driven state and rejected edit restoration", async () => {
  const [guide, readme] = await Promise.all([
    readWorkspaceFile("skills/figui3/react.md"),
    readWorkspaceFile("README.md"),
  ]);

  expect(guide).not.toContain(
    "Passing `value` / `checked` as JSX props on re-render is OK",
  );
  for (const content of [guide, readme]) {
    expect(content).toMatch(/event-driven\/uncontrolled/i);
    expect(content).toContain("unchanged JSX");
    expect(content).toMatch(/restore rejected edits/i);
    expect(content).toContain('toggleAttribute("checked", checked)');
  }
  expect(guide).toContain("useLayoutEffect");
  expect(guide).toContain("committed.current");
});
