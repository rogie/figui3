import { expect, test } from "@playwright/test";
import { componentContracts } from "../../playground/src/testing/componentManifest";
import {
  bootFigFixture,
  collectPageErrors,
  getContractElementCount,
  mountContract,
  runAttributeContract,
  runEventContract,
  runPropertyContract,
  waitForComponentDefinitions,
} from "./helpers";

test.describe("fig.js component contracts", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await waitForComponentDefinitions(page, componentContracts);
  });

  test("registers every component in the manifest", async ({ page }) => {
    const missing = await page.evaluate((tags) => {
      return tags.filter((tag) => !customElements.get(tag));
    }, componentContracts.map((contract) => contract.tag));

    expect(missing).toEqual([]);
  });

  test("fig.js alone does not register fig-select", async ({ page }) => {
    const registered = await page.evaluate(() => Boolean(customElements.get("fig-select")));
    expect(registered).toBe(false);
  });

  test("fig.js alone does not register fig-interpolation-swatch", async ({
    page,
  }) => {
    const registered = await page.evaluate(() =>
      Boolean(customElements.get("fig-interpolation-swatch")),
    );
    expect(registered).toBe(false);
  });

  test("fig-editor registers fig-interpolation-swatch", async ({ page }) => {
    const state = await page.evaluate(async () => {
      await import("/fig-editor.js");
      await customElements.whenDefined("fig-interpolation-swatch");
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-interpolation-swatch size="large" value='{"type":"gradient","gradient":{"type":"linear","stops":[{"color":"#FF0000","position":0},{"color":"#4F9EFF","position":100}],"interpolationSpace":"oklch","hueInterpolation":"longer"}}'></fig-interpolation-swatch>`;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const el = root.querySelector("fig-interpolation-swatch") as HTMLElement;
      return {
        registered: Boolean(customElements.get("fig-interpolation-swatch")),
        hasFill: Boolean(el?.querySelector(".fig-interpolation-swatch-fill")),
      };
    });
    expect(state).toEqual({ registered: true, hasFill: true });
  });

  test("fig-editor registers fig-select and easing uses it", async ({ page }) => {
    const result = await page.evaluate(async () => {
      await import("/fig-editor.js");
      await Promise.all([
        customElements.whenDefined("fig-select"),
        customElements.whenDefined("fig-select-option"),
        customElements.whenDefined("fig-select-options"),
        customElements.whenDefined("fig-easing-curve"),
      ]);
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-easing-curve value="0, 0, 1, 1"></fig-easing-curve>`;
      const easing = root.querySelector("fig-easing-curve");
      const select = easing?.querySelector("fig-select");
      return {
        selectRegistered: Boolean(customElements.get("fig-select")),
        optionRegistered: Boolean(customElements.get("fig-select-option")),
        optionsRegistered: Boolean(customElements.get("fig-select-options")),
        easingUsesSelect: Boolean(select),
        selectedValue: select?.getAttribute("value"),
        triggerHasIcon: Boolean(
          select?.shadowRoot?.querySelector(".fig-select-prepend svg"),
        ),
      };
    });

    expect(result).toEqual({
      selectRegistered: true,
      optionRegistered: true,
      optionsRegistered: true,
      easingUsesSelect: true,
      selectedValue: "Linear",
      triggerHasIcon: true,
    });
  });

  test("fig-easing-curve falls back to fig-dropdown without fig-editor", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<fig-easing-curve value="0, 0, 1, 1"></fig-easing-curve>';
      const easing = root.querySelector("fig-easing-curve");
      const dropdown = easing?.querySelector("fig-dropdown");
      return {
        selectRegistered: Boolean(customElements.get("fig-select")),
        usesDropdown: Boolean(dropdown),
        usesSelect: Boolean(easing?.querySelector("fig-select")),
        value: dropdown?.getAttribute("value"),
        optionCount: dropdown?.querySelectorAll(
          ":scope > option, :scope > optgroup > option",
        ).length,
        groupCount: dropdown?.querySelectorAll(":scope > optgroup").length,
      };
    });

    expect(result).toEqual({
      selectRegistered: false,
      usesDropdown: true,
      usesSelect: false,
      value: "Linear",
      optionCount: 13,
      groupCount: 2,
    });
  });

  for (const contract of componentContracts) {
    test(`${contract.tag}: mounts without runtime errors`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await mountContract(page, contract);

      await expect
        .poll(async () => getContractElementCount(page, contract), {
          message: `${contract.tag} fixture should create its target element`,
        })
        .toBeGreaterThan(0);

      expect(errors.pageErrors, `${contract.tag} page errors`).toEqual([]);
      expect(errors.consoleErrors, `${contract.tag} console errors`).toEqual([]);
    });

    for (const attribute of contract.attributes ?? []) {
      test(`${contract.tag}: ${attribute.name} attribute`, async ({ page }) => {
        await mountContract(page, contract);
        const actual = await runAttributeContract(
          page,
          contract,
          attribute.attribute,
          attribute.value,
        );

        expect(actual).toBe(attribute.expected ?? attribute.value);
      });
    }

    for (const property of contract.properties ?? []) {
      test(`${contract.tag}: ${property.name}`, async ({ page }) => {
        await mountContract(page, contract);
        const actual = await runPropertyContract(
          page,
          contract,
          property.property,
          property.value,
        );

        if (typeof property.expected === "boolean") {
          expect(Boolean(actual)).toBe(property.expected);
        } else {
          expect(String(actual)).toBe(String(property.expected));
        }
      });
    }

    for (const eventContract of contract.events ?? []) {
      test(`${contract.tag}: ${eventContract.name}`, async ({ page }) => {
        await mountContract(page, contract);
        const events = await runEventContract(page, contract, eventContract);

        expect(events.length).toBeGreaterThan(0);
        const last = events[events.length - 1];
        expect(last.type).toBe(eventContract.event);
        if ("expectedDetail" in eventContract) {
          expect(last.detail).toEqual(eventContract.expectedDetail);
        }
      });
    }
  }
});

test("fig-button destructive variants use danger colors", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-button id="destructive" variant="destructive">Delete</fig-button>
      <fig-button id="destructive-secondary" variant="destructiveSecondary">Destructive secondary</fig-button>
      <fig-button id="destructive-ghost" variant="destructiveGhost">Destructive ghost</fig-button>
      <fig-button id="destructive-link" variant="destructiveLink">Destructive link</fig-button>
    `;
  });

  const button = page.locator("#destructive");
  const styles = () =>
    button.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    });
  const resolveTokens = async (backgroundToken: string, colorToken: string) =>
    page.evaluate(
      ([background, color]) => {
        const probe = document.createElement("div");
        probe.style.backgroundColor = `var(${background})`;
        probe.style.color = `var(${color})`;
        document.body.append(probe);
        const style = getComputedStyle(probe);
        const resolved = {
          backgroundColor: style.backgroundColor,
          color: style.color,
        };
        probe.remove();
        return resolved;
      },
      [backgroundToken, colorToken],
    );

  expect(await styles()).toEqual(
    await resolveTokens("--figma-color-bg-danger", "--figma-color-text-ondanger"),
  );

  await button.hover();
  expect(await styles()).toEqual(
    await resolveTokens(
      "--figma-color-bg-danger-hover",
      "--figma-color-text-ondanger",
    ),
  );

  await page.mouse.down();
  expect(await styles()).toEqual(
    await resolveTokens(
      "--figma-color-bg-danger-pressed",
      "--figma-color-text-ondanger-secondary",
    ),
  );
  await page.mouse.up();

  const secondary = page.locator("#destructive-secondary");
  await secondary.hover();
  const secondaryStyles = await secondary.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });
  expect(secondaryStyles).toEqual(
    await resolveTokens(
      "--figma-color-bg-danger-tertiary",
      "--figma-color-text-danger",
    ),
  );

  const ghost = page.locator("#destructive-ghost");
  await ghost.hover();
  const ghostStyles = await ghost.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });
  expect(ghostStyles).toEqual(
    await resolveTokens(
      "--figma-color-bg-danger-tertiary",
      "--figma-color-text-danger",
    ),
  );

  const link = page.locator("#destructive-link");
  await link.hover();
  await page.mouse.down();
  const linkStyles = await link.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });
  expect(linkStyles).toEqual(
    await resolveTokens(
      "--figma-color-bg-danger-tertiary",
      "--figma-color-text-danger-secondary",
    ),
  );
  await page.mouse.up();
});

test("fig-separator borderless hides the separator line", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-separator id="default-separator" label="Group"></fig-separator>
      <fig-separator id="borderless-separator" label="Group" borderless></fig-separator>
      <fig-separator id="false-separator" label="Group" borderless="false"></fig-separator>
    `;
  });

  const beforeDisplay = (selector: string) =>
    page.locator(selector).evaluate((element) => {
      return getComputedStyle(element, "::before").display;
    });

  expect(await beforeDisplay("#default-separator")).not.toBe("none");
  expect(await beforeDisplay("#borderless-separator")).toBe("none");
  expect(await beforeDisplay("#false-separator")).not.toBe("none");
});

test("fig-icon maps chevron to size-specific tokens", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-icon id="medium-chevron" name="chevron"></fig-icon>
      <fig-icon id="small-chevron" name="chevron" size="small"></fig-icon>
    `;
  });

  const iconVars = await page.evaluate(() => ({
    medium: (document.querySelector("#medium-chevron") as HTMLElement).style
      .getPropertyValue("--icon"),
    small: (document.querySelector("#small-chevron") as HTMLElement).style
      .getPropertyValue("--icon"),
  }));

  expect(iconVars).toEqual({
    medium: "var(--icon-24-chevron)",
    small: "var(--icon-16-chevron)",
  });
});

test("fig-icon maps globe to size-specific tokens", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-icon id="medium-globe" name="globe"></fig-icon>
      <fig-icon id="small-globe" name="globe" size="small"></fig-icon>
    `;
  });

  const iconVars = await page.evaluate(() => ({
    medium: (document.querySelector("#medium-globe") as HTMLElement).style
      .getPropertyValue("--icon"),
    small: (document.querySelector("#small-globe") as HTMLElement).style
      .getPropertyValue("--icon"),
  }));

  expect(iconVars).toEqual({
    medium: "var(--icon-24-globe)",
    small: "var(--icon-16-globe)",
  });
});

test("fig-icon maps warning to size-specific tokens", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-icon id="medium-warning" name="warning"></fig-icon>
      <fig-icon id="small-warning" name="warning" size="small"></fig-icon>
    `;
  });

  const iconVars = await page.evaluate(() => ({
    medium: (document.querySelector("#medium-warning") as HTMLElement).style
      .getPropertyValue("--icon"),
    small: (document.querySelector("#small-warning") as HTMLElement).style
      .getPropertyValue("--icon"),
  }));

  expect(iconVars).toEqual({
    medium: "var(--icon-24-warning)",
    small: "var(--icon-16-warning)",
  });

  const resolved = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      medium: styles.getPropertyValue("--icon-24-warning").trim(),
      small: styles.getPropertyValue("--icon-16-warning").trim(),
    };
  });

  expect(resolved.medium.startsWith('url("data:image/svg+xml,')).toBe(true);
  expect(resolved.small.startsWith('url("data:image/svg+xml,')).toBe(true);
});

test("fig-icon maps copy to size-specific tokens", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-icon id="medium-copy" name="copy"></fig-icon>
      <fig-icon id="small-copy" name="copy" size="small"></fig-icon>
    `;
  });

  const result = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      iconVars: {
        medium: (document.querySelector("#medium-copy") as HTMLElement).style
          .getPropertyValue("--icon"),
        small: (document.querySelector("#small-copy") as HTMLElement).style
          .getPropertyValue("--icon"),
      },
      resolved: {
        medium: styles.getPropertyValue("--icon-24-copy").trim(),
        small: styles.getPropertyValue("--icon-16-copy").trim(),
      },
    };
  });

  expect(result.iconVars).toEqual({
    medium: "var(--icon-24-copy)",
    small: "var(--icon-16-copy)",
  });
  expect(result.resolved.medium.startsWith('url("data:image/svg+xml,')).toBe(
    true,
  );
  expect(result.resolved.small.startsWith('url("data:image/svg+xml,')).toBe(
    true,
  );
});

test("fig-icon maps color aliases to icon color tokens", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-icon id="primary-icon" name="add" color="primary"></fig-icon>
      <fig-icon id="secondary-icon" name="add" color="secondary"></fig-icon>
      <fig-icon id="tertiary-icon" name="add" color="tertiary"></fig-icon>
      <fig-icon id="disabled-icon" name="add" color="disabled"></fig-icon>
      <fig-icon id="brand-icon" name="add" color="brand"></fig-icon>
      <fig-icon id="component-icon" name="add" color="component"></fig-icon>
      <fig-icon id="danger-icon" name="add" color="danger"></fig-icon>
      <fig-icon id="success-icon" name="add" color="success"></fig-icon>
      <fig-icon id="warning-icon" name="add" color="warning"></fig-icon>
      <fig-icon id="selected-icon" name="add" color="selected"></fig-icon>
      <fig-icon id="variable-icon" name="add" color="var(--custom-icon-color)"></fig-icon>
      <fig-icon id="literal-icon" name="add" color="#ff0000"></fig-icon>
    `;
  });

  const colors = await page.evaluate(() => {
    const background = (id: string) =>
      (document.querySelector(`#${id}`) as HTMLElement).style.backgroundColor;
    return {
      primary: background("primary-icon"),
      secondary: background("secondary-icon"),
      tertiary: background("tertiary-icon"),
      disabled: background("disabled-icon"),
      brand: background("brand-icon"),
      component: background("component-icon"),
      danger: background("danger-icon"),
      success: background("success-icon"),
      warning: background("warning-icon"),
      selected: background("selected-icon"),
      variable: background("variable-icon"),
      literal: background("literal-icon"),
    };
  });

  expect(colors).toEqual({
    primary: "var(--figma-color-icon)",
    secondary: "var(--figma-color-icon-secondary)",
    tertiary: "var(--figma-color-icon-tertiary)",
    disabled: "var(--figma-color-icon-disabled)",
    brand: "var(--figma-color-icon-brand)",
    component: "var(--figma-color-icon-component)",
    danger: "var(--figma-color-icon-danger)",
    success: "var(--figma-color-icon-success)",
    warning: "var(--figma-color-icon-warning)",
    selected: "var(--figma-color-icon-selected)",
    variable: "var(--custom-icon-color)",
    literal: "rgb(255, 0, 0)",
  });
});

test("fig-icon applies color to slotted svg instead of painting a background", async ({
  page,
}) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-icon id="slotted-colored" color="secondary"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6h12v12H6z" fill="currentColor"></path></svg></fig-icon>
      <fig-icon id="slotted-plain"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6h12v12H6z" fill="currentColor"></path></svg></fig-icon>
      <fig-icon id="masked-colored" name="add" color="secondary"></fig-icon>
    `;
  });

  const result = await page.evaluate(() => {
    const read = (id: string) => {
      const el = document.querySelector(`#${id}`) as HTMLElement;
      const styles = getComputedStyle(el);
      const svg = el.querySelector("svg");
      return {
        backgroundColor: styles.backgroundColor,
        maskImage: styles.maskImage,
        svgColor: svg ? getComputedStyle(svg).color : null,
      };
    };
    const secondary = getComputedStyle(document.documentElement)
      .getPropertyValue("--figma-color-icon-secondary")
      .trim();
    const probe = document.createElement("span");
    probe.style.color = secondary;
    document.body.append(probe);
    const secondaryRgb = getComputedStyle(probe).color;
    probe.remove();
    return {
      slottedColored: read("slotted-colored"),
      slottedPlain: read("slotted-plain"),
      maskedColored: read("masked-colored"),
      secondaryRgb,
    };
  });

  // Slotted SVGs paint themselves: no background block, color drives currentColor.
  expect(result.slottedColored.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(result.slottedColored.maskImage).toBe("none");
  expect(result.slottedColored.svgColor).toBe(result.secondaryRgb);

  // Without a color attribute the slotted SVG keeps inheriting from its context.
  expect(result.slottedPlain.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(result.slottedPlain.svgColor).not.toBe(result.secondaryRgb);

  // Masked icons still tint via background-color.
  expect(result.maskedColored.backgroundColor).toBe(result.secondaryRgb);
  expect(result.maskedColored.maskImage).not.toBe("none");
});

test.describe("AI lab styling components", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-editor.js");
      await Promise.all([
        customElements.whenDefined("fig-ai-prompt"),
        customElements.whenDefined("fig-ai-context"),
        customElements.whenDefined("fig-attachment"),
        customElements.whenDefined("fig-attachments"),
        customElements.whenDefined("fig-chat-message"),
        customElements.whenDefined("fig-select"),
      ]);
    });
  });

  test("registers as a presentation-only prompt layout", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="width:240px">
          <fig-ai-prompt>
            <fig-input-text multiline placeholder="Describe your idea" aria-label="Describe your idea"></fig-input-text>
            <fig-footer>
              <fig-button variant="ghost" icon aria-label="Add attachment">
                <fig-icon name="add"></fig-icon>
              </fig-button>
              <hstack>
                <fig-select value="auto" aria-label="Model">
                  <fig-select-options>
                    <fig-select-option value="auto">Auto</fig-select-option>
                    <fig-select-option value="fast">Fast</fig-select-option>
                  </fig-select-options>
                </fig-select>
                <fig-button icon aria-label="Send prompt">
                  <fig-icon name="send"></fig-icon>
                </fig-button>
              </hstack>
            </fig-footer>
          </fig-ai-prompt>
        </div>
      `;
    });

    const prompt = page.locator("fig-ai-prompt");
    const layout = await prompt.evaluate((element) => {
      const input = element.querySelector("fig-input-text");
      const textarea = input?.querySelector("textarea");
      const footer = element.querySelector("fig-footer");
      const model = element.querySelector("fig-select");
      const sendIcon = element.querySelector(
        'fig-button[aria-label="Send prompt"] fig-icon',
      );
      const buttons = element.querySelectorAll("fig-button");
      const hostRect = element.getBoundingClientRect();
      const inputRect = input?.getBoundingClientRect();
      const textareaRect = textarea?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      const addRect = buttons[0]?.getBoundingClientRect();
      const settingsRect = buttons[1]?.getBoundingClientRect();
      return {
        registered: Boolean(customElements.get("fig-ai-prompt")),
        directChildren: Array.from(element.children).map((child) =>
          child.tagName.toLowerCase(),
        ),
        width: hostRect.width,
        marginInline: getComputedStyle(element).marginInline,
        minHeight: hostRect.height,
        inputFontSize: textarea ? getComputedStyle(textarea).fontSize : null,
        inputPosition: input ? getComputedStyle(input).position : null,
        inputPadding: textarea
          ? getComputedStyle(textarea).paddingLeft
          : null,
        inputPaddingBottom: textarea
          ? getComputedStyle(textarea).paddingBottom
          : null,
        inputReachesPromptEdges:
          Boolean(inputRect) &&
          Math.abs((inputRect?.left ?? 0) - hostRect.left) <= 2 &&
          Math.abs((inputRect?.right ?? 0) - hostRect.right) <= 2 &&
          Math.abs((inputRect?.top ?? 0) - hostRect.top) <= 2,
        inputEndsAboveFooter:
          Boolean(inputRect && footerRect) &&
          inputRect.bottom <= footerRect.top,
        textareaFillsInputHeight:
          Boolean(inputRect && textareaRect) &&
          Math.abs((textareaRect?.top ?? 0) - (inputRect?.top ?? 0)) <= 1 &&
          Math.abs((textareaRect?.bottom ?? 0) - (inputRect?.bottom ?? 0)) <= 1,
        modelValue: model?.getAttribute("value"),
        sendIconVar: (sendIcon as HTMLElement | null)?.style.getPropertyValue(
          "--icon",
        ),
        actionsSeparated:
          Boolean(addRect && settingsRect) && addRect.left < settingsRect.left,
      };
    });

    expect(layout).toEqual({
      registered: true,
      directChildren: ["fig-input-text", "fig-footer"],
      width: 208,
      marginInline: "16px",
      minHeight: 128,
      inputFontSize: "13px",
      inputPosition: "static",
      inputPadding: "16px",
      inputPaddingBottom: "0px",
      inputReachesPromptEdges: true,
      inputEndsAboveFooter: true,
      textareaFillsInputHeight: true,
      modelValue: "auto",
      sendIconVar: "var(--icon-24-send)",
      actionsSeparated: true,
    });

    await prompt.locator("textarea").focus();
    await expect
      .poll(() =>
        prompt.evaluate((element) => getComputedStyle(element).outlineStyle),
      )
      .not.toBe("none");

    await prompt.locator("fig-footer fig-button").first().focus();
    await expect
      .poll(() =>
        prompt.evaluate((element) => getComputedStyle(element).outlineStyle),
      )
      .toBe("none");

    await prompt.locator("fig-input-text").evaluate((input) => {
      input.setAttribute("disabled", "");
    });
    await expect
      .poll(() =>
        prompt
          .locator("fig-input-text")
          .evaluate((input) => getComputedStyle(input).boxShadow),
      )
      .toBe("none");
  });

  test("stacks fig-ai-context as an open container above the prompt", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="width:240px">
          <fig-ai-context aria-label="Prompt context">
            <fig-attachments aria-label="Prompt attachments">
              <fig-attachment name="reference.png"></fig-attachment>
              <fig-attachment name="brief.pdf"></fig-attachment>
            </fig-attachments>
            <hstack>
              <fig-icon name="checkmark"></fig-icon>
              <span>Indexed 24 files</span>
            </hstack>
          </fig-ai-context>
          <fig-ai-prompt>
            <fig-input-text multiline aria-label="Describe your idea"></fig-input-text>
            <fig-footer>
              <fig-button icon aria-label="Send prompt">
                <fig-icon name="send"></fig-icon>
              </fig-button>
            </fig-footer>
          </fig-ai-prompt>
        </div>
      `;
    });

    const result = await page.evaluate(() => {
      const context = document.querySelector("fig-ai-context");
      const prompt = document.querySelector("fig-ai-prompt");
      const attachments = context?.querySelector("fig-attachments");
      const contextRect = context?.getBoundingClientRect();
      const promptRect = prompt?.getBoundingClientRect();
      return {
        registered: Boolean(customElements.get("fig-ai-context")),
        isSiblingOfPrompt: context?.nextElementSibling === prompt,
        display: context ? getComputedStyle(context).display : null,
        flexDirection: context
          ? getComputedStyle(context).flexDirection
          : null,
        attachmentsVisible: Boolean(
          attachments && (attachments as HTMLElement).offsetHeight > 0,
        ),
        abovePrompt:
          Boolean(contextRect && promptRect) &&
          (contextRect?.bottom ?? 0) <= (promptRect?.top ?? 0) + 2,
      };
    });

    expect(result).toEqual({
      registered: true,
      isSiblingOfPrompt: true,
      display: "flex",
      flexDirection: "column",
      attachmentsVisible: true,
      abovePrompt: true,
    });
  });

  test("composes square attachment previews with wrapping and fallback states", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-attachments aria-label="Prompt attachments" style="width:100px">
          <fig-attachment id="image-attachment" name="reference.png" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='16' height='16' fill='red'/%3E%3C/svg%3E"></fig-attachment>
          <fig-attachment id="file-attachment" name="brief.pdf"></fig-attachment>
          <fig-attachment name="notes.txt"></fig-attachment>
        </fig-attachments>
      `;
    });

    const result = await page.evaluate(async () => {
      const container = document.querySelector("fig-attachments");
      const imageAttachment = document.querySelector("#image-attachment");
      const fileAttachment = document.querySelector("#file-attachment");
      const image = imageAttachment?.querySelector("fig-image");
      const mediaImage = image?.querySelector("img");
      const tooltip = imageAttachment?.querySelector("fig-tooltip");
      const items = Array.from(
        container?.querySelectorAll(":scope > fig-attachment") || [],
      );
      const rects = items.map((item) => item.getBoundingClientRect());
      const heightBeforeLoading =
        imageAttachment?.getBoundingClientRect().height ?? 0;
      const spinner = document.createElement("fig-spinner");
      spinner.setAttribute("slot", "overlay");
      spinner.setAttribute("data-loading-indicator", "");
      spinner.setAttribute("data-generated", "");
      image?.append(spinner);
      await new Promise(requestAnimationFrame);
      const heightWhileLoading =
        imageAttachment?.getBoundingClientRect().height ?? 0;
      return {
        registered:
          Boolean(customElements.get("fig-attachment")) &&
          Boolean(customElements.get("fig-attachments")),
        containerRole: container?.getAttribute("role"),
        itemRoles: items.map((item) => item.getAttribute("role")),
        aspectRatio: image?.getAttribute("aspect-ratio"),
        fit: image?.getAttribute("fit"),
        full: image?.hasAttribute("full"),
        alt: mediaImage?.getAttribute("alt"),
        tooltip: tooltip?.getAttribute("text"),
        imageSize: imageAttachment?.getBoundingClientRect().width,
        isSquare:
          Math.abs(
            (imageAttachment?.getBoundingClientRect().width ?? 0) -
              (imageAttachment?.getBoundingClientRect().height ?? 0),
          ) <= 0.5,
        loadingHeightStable:
          Math.abs(heightBeforeLoading - heightWhileLoading) <= 0.5,
        spinnerFlexShrink: getComputedStyle(spinner).flexShrink,
        wrapped:
          rects.length === 3 &&
          Math.abs(rects[0].top - rects[1].top) <= 0.5 &&
          rects[2].top > rects[0].top,
        fallback:
          fileAttachment?.hasAttribute("data-fallback") &&
          fileAttachment.querySelector(".fig-attachment-fallback")?.textContent,
      };
    });

    expect(result).toEqual({
      registered: true,
      containerRole: "list",
      itemRoles: ["listitem", "listitem", "listitem"],
      aspectRatio: "1/1",
      fit: "cover",
      full: true,
      alt: "reference.png",
      tooltip: "reference.png",
      imageSize: 40,
      isSquare: true,
      loadingHeightStable: true,
      spinnerFlexShrink: "0",
      wrapped: true,
      fallback: "PDF",
    });

    await page.locator("#image-attachment").evaluate((attachment) => {
      attachment.setAttribute("src", "data:image/png;base64,broken");
    });
    await expect
      .poll(() =>
        page
          .locator("#image-attachment")
          .evaluate((attachment) => attachment.hasAttribute("data-fallback")),
      )
      .toBe(true);
  });

  test("reveals a keyboard-accessible remove control and emits a cancelable request", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-attachment id="removable" value="asset-1" name="reference.png" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'/%3E"></fig-attachment>
        <fig-attachment id="fixed" name="fixed.png" removable="false"></fig-attachment>
        <fig-attachment id="disabled" name="disabled.png" disabled></fig-attachment>
      `;
      const attachment = document.querySelector("#removable");
      attachment?.addEventListener("remove", (event) => {
        const customEvent = event as CustomEvent;
        customEvent.preventDefault();
        (window as typeof window & { attachmentRemove?: unknown }).attachmentRemove = {
          defaultPrevented: customEvent.defaultPrevented,
          value: customEvent.detail.value,
          name: customEvent.detail.name,
          src: customEvent.detail.src,
          attachmentMatches: customEvent.detail.attachment === attachment,
        };
      });
    });

    const removeButton = page.locator("#removable .fig-attachment-remove");
    await expect(removeButton).toHaveCSS("opacity", "0");
    await page.locator("#removable").hover();
    await expect(removeButton).toHaveCSS("opacity", "1");
    await expect(removeButton).toHaveAttribute("aria-label", "Remove reference.png");
    await expect(removeButton).toHaveAttribute("variant", "overlay");
    await expect(
      page.locator("#removable .fig-attachment-remove-tooltip"),
    ).toHaveAttribute("text", "Remove attachment");
    await expect(removeButton.locator("fig-icon")).toHaveAttribute("name", "close");
    await expect(removeButton.locator("fig-icon")).toHaveAttribute("size", "small");
    expect(await removeButton.boundingBox()).toMatchObject({
      width: 20,
      height: 20,
    });

    await removeButton.focus();
    await expect(removeButton).toHaveCSS("opacity", "1");
    await removeButton.press("Enter");

    const event = await page.evaluate(
      () =>
        (window as typeof window & { attachmentRemove?: unknown })
          .attachmentRemove,
    );
    expect(event).toEqual({
      defaultPrevented: true,
      value: "asset-1",
      name: "reference.png",
      src: expect.stringContaining("data:image/svg+xml"),
      attachmentMatches: true,
    });
    await expect(page.locator("#removable")).toHaveCount(1);
    await expect(page.locator("#fixed .fig-attachment-remove")).toBeHidden();
    await expect(page.locator("#disabled .fig-attachment-remove")).toHaveAttribute(
      "disabled",
      "",
    );
    expect(
      await page.locator("#disabled .fig-attachment-remove").evaluate(
        (button) =>
          (button as HTMLElement & { button?: HTMLButtonElement }).button?.disabled,
      ),
    ).toBe(true);
  });

  test("styles user and agent chat messages without changing content", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.setAttribute("style", "width:240px");
      root.innerHTML = `
        <fig-chat-message id="user-message" from="user">User message<fig-avatar name="Rogie King"></fig-avatar></fig-chat-message>
        <fig-chat-message id="agent-message" from="agent">Agent message</fig-chat-message>
        <fig-chat-message from="agent"><fig-shimmer><span id="thinking">Thinking…</span></fig-shimmer></fig-chat-message>
      `;
    });

    const result = await page.evaluate(() => {
      const user = document.querySelector("#user-message");
      const agent = document.querySelector("#agent-message");
      if (!user || !agent) throw new Error("Missing chat messages");
      const avatar = user.querySelector("fig-avatar");
      const userStyle = getComputedStyle(user);
      const agentStyle = getComputedStyle(agent);
      const thinking = document.querySelector("#thinking");
      const userRect = user.getBoundingClientRect();
      const avatarRect = avatar?.getBoundingClientRect();
      return {
        registered: Boolean(customElements.get("fig-chat-message")),
        userText: user.textContent,
        agentText: agent.textContent,
        userNarrower:
          user.getBoundingClientRect().width <
          agent.getBoundingClientRect().width,
        userFontSize: userStyle.fontSize,
        agentFontSize: agentStyle.fontSize,
        userPaddingLeft: userStyle.paddingLeft,
        userPaddingRight: userStyle.paddingRight,
        userMarginLeft: userStyle.marginLeft,
        avatarFontSize: avatar
          ? getComputedStyle(avatar, "::after").fontSize
          : null,
        avatarAlignedOutside:
          Boolean(avatarRect) &&
          (avatarRect?.left ?? 0) > userRect.right &&
          Math.abs((avatarRect?.bottom ?? 0) - userRect.bottom) <= 0.5,
        differentBackground:
          userStyle.backgroundColor !== agentStyle.backgroundColor,
        thinkingAnimation: thinking
          ? getComputedStyle(thinking).animationName
          : null,
      };
    });

    expect(result).toEqual({
      registered: true,
      userText: "User message",
      agentText: "Agent message",
      userNarrower: true,
      userFontSize: "13px",
      agentFontSize: "13px",
      userPaddingLeft: "12px",
      userPaddingRight: "12px",
      userMarginLeft: "24px",
      avatarFontSize: "11px",
      avatarAlignedOutside: true,
      differentBackground: true,
      thinkingAnimation: "fig-shimmer-text",
    });
  });
});

test.describe("duplicate module registration", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("re-evaluating package modules preserves existing definitions", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      await import("/fig-lab.js");
      await import("/fig-editor.js");
      const before = {
        button: customElements.get("fig-button"),
        switch: customElements.get("propskit-switch"),
        inputWheel: customElements.get("fig-input-wheel"),
        fillPicker: customElements.get("fig-fill-picker"),
      };

      await import("/fig.js?duplicate-registration=1");
      await import("/fig-lab.js?duplicate-registration=1");
      await import("/fig-editor.js?duplicate-registration=1");

      return {
        button: before.button === customElements.get("fig-button"),
        switch: before.switch === customElements.get("propskit-switch"),
        inputWheel:
          before.inputWheel === customElements.get("fig-input-wheel"),
        fillPicker:
          before.fillPicker === customElements.get("fig-fill-picker"),
      };
    });

    expect(result).toEqual({
      button: true,
      switch: true,
      inputWheel: true,
      fillPicker: true,
    });
  });
});

test.describe("propskit-number", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-number");
    });
  });

  test("composes and forwards number attributes and events", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-number label="Width" value="24" min="0" max="100" units="px"></propskit-number>';
    });

    const control = page.locator("propskit-number");
    await expect(control.locator("fig-field > label")).toHaveText("Width");
    await expect(control.locator("fig-input-number")).toHaveAttribute("units", "px");
    await expect(control.locator("input")).toHaveValue("24");
    const fieldBox = await control.locator("fig-field").boundingBox();
    const inputBox = await control.locator("fig-input-number").boundingBox();
    expect(fieldBox?.height).toBe(32);
    expect(inputBox?.height).toBe(24);
    expect(inputBox?.width).toBeLessThan(fieldBox?.width ?? 0);
    expect(
      Math.abs(
        (inputBox?.x ?? 0) +
          (inputBox?.width ?? 0) -
          ((fieldBox?.x ?? 0) + (fieldBox?.width ?? 0)),
      ),
    ).toBe(4);

    const events = await control.evaluate((element) => {
      const received: Array<{ type: string; detail: unknown }> = [];
      element.addEventListener("input", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      const inner = element.querySelector("fig-input-number");
      inner?.dispatchEvent(
        new CustomEvent("input", {
          detail: 32,
          bubbles: true,
        }),
      );
      return received;
    });

    expect(events).toEqual([{ type: "input", detail: 32 }]);
  });
});

test.describe("fig-input-wheel", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("fig-input-wheel");
    });
  });

  test("defaults its numeric contract and renders wheel geometry", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-wheel id="omitted"></fig-input-wheel>
        <fig-input-number id="input-reference"></fig-input-number>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const omitted = root.querySelector("#omitted") as HTMLElement & {
        value: string;
        step: number;
      };
      const inputReference = root.querySelector("#input-reference")!;
      const wheelStyle = getComputedStyle(omitted);
      const inputStyle = getComputedStyle(inputReference);
      const tickPath = omitted.querySelector(
        ".fig-input-wheel-tick",
      ) as SVGPathElement | null;
      const ticks = (tickPath?.getAttribute("d") ?? "")
        .split(" Z")
        .filter(Boolean)
        .map((command) => {
          const parts = command.trim().split(/\s+/);
          return {
            x: Number(parts[1]),
            y1: Number(parts[2]),
            y2: Number(parts[14]),
            width: Number(parts[4]) - Number(parts[16]),
          };
        });
      const xs = ticks.map((tick) => tick.x);
      const mid = omitted.clientWidth / 2;
      const tickExtent = Math.max(...xs.map((x) => Math.abs(x - mid)));
      const centerSpan = xs.filter((x) => Math.abs(x - mid) < tickExtent * 0.4);
      const edgeSpan = xs.filter((x) => Math.abs(x - mid) > tickExtent * 0.7);
      const centerLengths = ticks
        .filter((tick) => Math.abs(tick.x - mid) < tickExtent * 0.4)
        .map((tick) => Math.abs(tick.y2 - tick.y1));
      const edgeLengths = ticks
        .filter((tick) => Math.abs(tick.x - mid) > tickExtent * 0.7)
        .map((tick) => Math.abs(tick.y2 - tick.y1));
      const centerWidths = ticks
        .filter((tick) => Math.abs(tick.x - mid) < tickExtent * 0.4)
        .map((tick) => tick.width);
      const edgeWidths = ticks
        .filter((tick) => Math.abs(tick.x - mid) > tickExtent * 0.7)
        .map((tick) => tick.width);
      const centerGaps: number[] = [];
      const sortedCenter = centerSpan.slice().sort((a, b) => a - b);
      for (let i = 1; i < sortedCenter.length; i += 1) {
        centerGaps.push(sortedCenter[i] - sortedCenter[i - 1]);
      }
      const edgeGaps: number[] = [];
      const sortedEdge = edgeSpan.slice().sort((a, b) => a - b);
      for (let i = 1; i < sortedEdge.length; i += 1) {
        edgeGaps.push(sortedEdge[i] - sortedEdge[i - 1]);
      }
      const avg = (values: number[]) =>
        values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0;
      const handleCenterDelta = () => {
        const trackRect = omitted.getBoundingClientRect();
        const handleRect = omitted
          .querySelector(".fig-input-wheel-handle")
          ?.getBoundingClientRect();
        return Math.abs(
          ((handleRect?.left ?? 0) + (handleRect?.right ?? 0)) / 2 -
            ((trackRect?.left ?? 0) + (trackRect?.right ?? 0)) / 2,
        );
      };
      const wheelRect = omitted.getBoundingClientRect();
      const svgRect = omitted
        .querySelector(".fig-input-wheel-svg")!
        .getBoundingClientRect();
      const svgStyle = getComputedStyle(
        omitted.querySelector(".fig-input-wheel-svg")!,
      );
      return {
        value: Number(omitted.value),
        step: omitted.step,
        hasUnitsProperty: "units" in omitted,
        wheelRole: omitted.getAttribute("role"),
        ariaText: omitted.getAttribute("aria-valuetext"),
        wheelBackground: wheelStyle.backgroundColor,
        inputBackground: inputStyle.backgroundColor,
        wheelRadius: wheelStyle.borderRadius,
        inputRadius: inputStyle.borderRadius,
        tickElementCount: omitted.querySelectorAll(".fig-input-wheel-tick").length,
        tickCount: ticks.length,
        centerGap: avg(centerGaps),
        edgeGap: avg(edgeGaps),
        centerLength: avg(centerLengths),
        edgeLength: avg(edgeLengths),
        centerWidth: avg(centerWidths),
        edgeWidth: avg(edgeWidths),
        minTickWidth: Math.min(...ticks.map((tick) => tick.width)),
        maxTickWidth: Math.max(...ticks.map((tick) => tick.width)),
        maxTickVisualHeight: Math.max(
          ...ticks.map((tick) => Math.abs(tick.y2 - tick.y1)),
        ),
        handleHeight:
          omitted.querySelector(".fig-input-wheel-handle")?.getBoundingClientRect()
            .height ?? 0,
        handleCenterDelta: handleCenterDelta(),
        svgInsetLeft: svgRect.left - wheelRect.left,
        svgInsetRight: wheelRect.right - svgRect.right,
        svgMarginInlineStart: Number.parseFloat(svgStyle.marginInlineStart),
        wheelMask:
          svgStyle.maskImage,
        tickFill: tickPath ? getComputedStyle(tickPath).fill : "",
      };
    });

    expect(state.value).toBe(0);
    expect(state.step).toBe(1);
    expect(state.hasUnitsProperty).toBe(false);
    expect(state.wheelRole).toBe("spinbutton");
    expect(state.ariaText).toBe("0");
    expect(state.wheelBackground).toBe(state.inputBackground);
    expect(state.wheelRadius).toBe(state.inputRadius);
    expect(state.tickElementCount).toBe(1);
    expect(state.tickCount).toBe(11);
    expect(state.centerGap).toBeGreaterThan(0);
    expect(state.edgeGap).toBeGreaterThan(0);
    expect(state.centerLength).toBeGreaterThan(state.edgeLength);
    expect(state.centerWidth).toBeGreaterThan(state.edgeWidth);
    expect(state.minTickWidth).toBeGreaterThanOrEqual(1);
    expect(state.maxTickWidth).toBeLessThanOrEqual(2);
    expect(state.maxTickVisualHeight).toBeCloseTo(state.handleHeight - 4, 1);
    expect(state.handleCenterDelta).toBeCloseTo(0, 5);
    expect(state.svgInsetLeft).toBeCloseTo(state.svgMarginInlineStart, 5);
    expect(state.svgInsetRight).toBeCloseTo(state.svgMarginInlineStart, 5);
    expect(state.wheelMask).not.toBe("none");
    expect(state.wheelMask).toContain("rgba(0, 0, 0, 0.1)");
    expect(state.wheelMask).toContain("rgba(0, 0, 0, 0.5)");
    expect(state.tickFill).not.toBe("none");
  });

  test("spin false keeps ticks stationary while values keep updating", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-wheel value="0" step="0.25" spin="false"></fig-input-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const wheel = root.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const tickPath = wheel.querySelector(".fig-input-wheel-tick")!;
      const initialPath = tickPath.getAttribute("d");
      const events: number[] = [];
      wheel.addEventListener("input", (event) => {
        events.push((event as CustomEvent<number>).detail);
      });

      wheel.value = "0.5";
      await new Promise(requestAnimationFrame);
      const staticPath = tickPath.getAttribute("d");
      wheel.focus();
      wheel.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
        }),
      );
      await new Promise(requestAnimationFrame);
      const interactionPath = tickPath.getAttribute("d");
      const interactionValue = wheel.value;

      wheel.value = "0.5";
      wheel.removeAttribute("spin");
      await new Promise(requestAnimationFrame);
      return {
        initialPath,
        staticPath,
        interactionPath,
        interactionValue,
        spinningPath: tickPath.getAttribute("d"),
        events,
      };
    });

    expect(state.staticPath).toBe(state.initialPath);
    expect(state.interactionPath).toBe(state.initialPath);
    expect(Number(state.interactionValue)).toBeGreaterThan(0.5);
    expect(state.events.length).toBeGreaterThan(0);
    expect(state.spinningPath).not.toBe(state.initialPath);
  });

  test("coalesces tick rendering into one path update per frame", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `<fig-input-wheel value="0"></fig-input-wheel>`;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const host = root.querySelector("fig-input-wheel")!;
      const tickPath = host.querySelector(".fig-input-wheel-tick")!;
      let pathUpdates = 0;
      const observer = new MutationObserver((records) => {
        pathUpdates += records.filter(
          (record) => record.attributeName === "d",
        ).length;
      });
      observer.observe(tickPath, { attributes: true });

      for (let value = 1; value <= 100; value += 1) {
        host.setAttribute("value", String(value));
      }
      await new Promise(requestAnimationFrame);
      await Promise.resolve();
      observer.disconnect();

      return {
        pathUpdates,
        tickElementCount: host.querySelectorAll(".fig-input-wheel-tick").length,
      };
    });

    expect(state.pathUpdates).toBe(1);
    expect(state.tickElementCount).toBe(1);
  });

  test("keeps a tick centered at every snapped step", async ({ page }) => {
    const deltas = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `<fig-input-wheel value="0" step="0.1"></fig-input-wheel>`;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const wheel = root.querySelector("fig-input-wheel") as HTMLElement;
      const tickPath = wheel.querySelector(".fig-input-wheel-tick")!;
      const readCenterDelta = () => {
        const centerX = wheel.clientWidth / 2;
        const tickXs = [
          ...(tickPath.getAttribute("d") ?? "").matchAll(/M ([^ ]+) /g),
        ].map((match) => Number(match[1]));
        return Math.min(...tickXs.map((x) => Math.abs(x - centerX)));
      };

      const result = [readCenterDelta()];
      for (const value of ["0.1", "0.2", "-0.1", "1"]) {
        wheel.setAttribute("value", value);
        await new Promise(requestAnimationFrame);
        result.push(readCenterDelta());
      }
      return result;
    });

    expect(deltas).toEqual([0, 0, 0, 0, 0]);
  });

  test("rotates continuously between snapped tick values", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `<fig-input-wheel value="0" step="1"></fig-input-wheel>`;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const wheel = root.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const tickPath = wheel.querySelector(".fig-input-wheel-tick")!;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const initialPath = tickPath.getAttribute("d");

      wheel.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: centerX,
          clientY: centerY,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 1,
          clientX: centerX + (rect.width / 11) * 0.4,
          clientY: centerY,
        }),
      );
      await new Promise(requestAnimationFrame);
      const movingPath = tickPath.getAttribute("d");
      const movingValue = Number(wheel.value);

      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          clientX: centerX + (rect.width / 11) * 0.4,
          clientY: centerY,
        }),
      );
      await new Promise(requestAnimationFrame);

      return {
        movingValue,
        pathMoved: movingPath !== initialPath,
        returnedToSnappedPath: tickPath.getAttribute("d") === initialPath,
      };
    });

    expect(state).toEqual({
      movingValue: 0,
      pathMoved: true,
      returnedToSnappedPath: true,
    });
  });

  test("dragging left moves value and tick wheel left by step", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-wheel value="0" step="0.25"></fig-input-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const wheel = root.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const wheelCenterX = rect.width / 2;
      const dragDistance = rect.width / 11;
      wheel.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: centerX,
          clientY: centerY,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 1,
          clientX: centerX - dragDistance,
          clientY: centerY,
        }),
      );
      const valueDuringInput = Number(wheel.value);
      await new Promise(requestAnimationFrame);
      const centerTickX = Number([
        ...(
          wheel.querySelector(".fig-input-wheel-tick")?.getAttribute("d") ?? ""
        ).matchAll(/M ([^ ]+) /g),
      ][0]?.[1]);
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          clientX: centerX - dragDistance,
          clientY: centerY,
        }),
      );

      return {
        valueDuringInput,
        valueAfterChange: Number(wheel.value),
        centerTickX,
        wheelCenterX,
      };
    });

    expect(state.valueDuringInput).toBe(-0.25);
    expect(state.valueAfterChange).toBe(-0.25);
    expect(state.centerTickX).toBeLessThan(state.wheelCenterX);
  });

  test("shift-drag scrubs at ten times the step speed", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-wheel value="0" step="0.25"></fig-input-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const wheel = root.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dragDistance = rect.width / 11;

      wheel.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: centerX,
          clientY: centerY,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 1,
          shiftKey: true,
          clientX: centerX + dragDistance,
          clientY: centerY,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          shiftKey: true,
          clientX: centerX + dragDistance,
          clientY: centerY,
        }),
      );
      return Number(wheel.value);
    });

    expect(state).toBe(2.5);
  });

  test("focused wheel supports every arrow and shift multiplies step", async ({
    page,
  }) => {
    const events = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `<fig-input-wheel value="0" step="0.1"></fig-input-wheel>`;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const wheel = root.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const received: Array<{
        type: string;
        detail: unknown;
        targetIsWheel: boolean;
        composed: boolean;
      }> = [];
      wheel.addEventListener("input", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
          targetIsWheel: event.target === wheel,
          composed: event.composed,
        });
      });
      wheel.addEventListener("change", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
          targetIsWheel: event.target === wheel,
          composed: event.composed,
        });
      });
      wheel.focus();
      const focusedAfterFocus = document.activeElement === wheel;
      const press = (key: string, shiftKey = false) => {
        wheel.dispatchEvent(
          new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }),
        );
        return Number(wheel.value);
      };
      const arrows = {
        up: press("ArrowUp"),
        down: press("ArrowDown"),
        right: press("ArrowRight"),
        left: press("ArrowLeft"),
        shiftUp: press("ArrowUp", true),
        shiftDown: press("ArrowDown", true),
        shiftRight: press("ArrowRight", true),
        shiftLeft: press("ArrowLeft", true),
      };
      const startBox = wheel.getBoundingClientRect();
      wheel.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: startBox.left + startBox.width / 2,
          clientY: startBox.top + startBox.height / 2,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 1,
          clientX: startBox.left + startBox.width / 2 + 80,
          clientY: startBox.top + startBox.height / 2,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          clientX: startBox.left + startBox.width / 2 + 80,
          clientY: startBox.top + startBox.height / 2,
        }),
      );
      const afterDrag = Number(wheel.value);
      const focusedAfterDrag = document.activeElement === wheel;
      wheel.setAttribute("disabled", "");
      const disabledEvents = received.length;
      wheel.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      return {
        arrows,
        afterDrag,
        focusedAfterFocus,
        focusedAfterDrag,
        emittedAfterDisable: received.length - disabledEvents,
        types: received.map((entry) => entry.type),
        targetAndComposed: received.every(
          (entry) => entry.targetIsWheel && entry.composed,
        ),
      };
    });

    expect(events.arrows).toEqual({
      up: 0.1,
      down: 0,
      right: 0.1,
      left: 0,
      shiftUp: 1,
      shiftDown: 0,
      shiftRight: 1,
      shiftLeft: 0,
    });
    expect(events.afterDrag).toBeGreaterThan(0);
    expect(events.focusedAfterFocus).toBe(true);
    expect(events.focusedAfterDrag).toBe(true);
    expect(events.emittedAfterDisable).toBe(0);
    expect(events.types).toContain("input");
    expect(events.types).toContain("change");
    expect(events.targetAndComposed).toBe(true);
  });

  test("keyboard travel rotates ticks and nudges the handle", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `<fig-input-wheel value="0" step="1"></fig-input-wheel>`;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const wheel = root.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const tickPath = wheel.querySelector(".fig-input-wheel-tick")!;
      const centerDelta = () => {
        const centerX = wheel.clientWidth / 2;
        const tickXs = [
          ...(tickPath.getAttribute("d") ?? "").matchAll(/M ([^ ]+) /g),
        ].map((match) => Number(match[1]));
        return Math.min(...tickXs.map((x) => Math.abs(x - centerX)));
      };

      wheel.focus();
      wheel.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          shiftKey: true,
          bubbles: true,
        }),
      );
      let movingRight = {
        value: Number(wheel.value),
        active: false,
        centerDelta: 0,
        handleOffset: 0,
      };
      for (let frame = 0; frame < 8; frame += 1) {
        await new Promise(requestAnimationFrame);
        movingRight = {
          value: Number(wheel.value),
          active: wheel.hasAttribute("data-fig-input-wheel-keyboard-moving"),
          centerDelta: centerDelta(),
          handleOffset:
            Number.parseFloat(
              wheel.style.getPropertyValue(
                "--fig-input-wheel-handle-drag-offset",
              ),
            ) || 0,
        };
        if (movingRight.centerDelta > 0.1 && movingRight.handleOffset > 0) break;
      }
      wheel.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          shiftKey: true,
          bubbles: true,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      const repeatedRightOffset = Number.parseFloat(
        wheel.style.getPropertyValue("--fig-input-wheel-handle-drag-offset"),
      );
      await new Promise((resolve) => setTimeout(resolve, 180));
      const settled = {
        active: wheel.hasAttribute("data-fig-input-wheel-keyboard-moving"),
        centerDelta: centerDelta(),
        hasHandleOffset: Boolean(
          wheel.style.getPropertyValue("--fig-input-wheel-handle-drag-offset"),
        ),
      };

      wheel.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowLeft",
          shiftKey: true,
          bubbles: true,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      const movingLeftOffset = Number.parseFloat(
        wheel.style.getPropertyValue("--fig-input-wheel-handle-drag-offset"),
      );

      return { movingRight, repeatedRightOffset, settled, movingLeftOffset };
    });

    expect(state.movingRight.value).toBe(10);
    expect(state.movingRight.active).toBe(true);
    expect(state.movingRight.centerDelta).toBeGreaterThan(0.1);
    expect(state.movingRight.handleOffset).toBeGreaterThan(0);
    expect(state.repeatedRightOffset).toBeGreaterThanOrEqual(
      state.movingRight.handleOffset,
    );
    expect(state.settled.active).toBe(false);
    expect(state.settled.centerDelta).toBeCloseTo(0, 5);
    expect(state.settled.hasHandleOffset).toBe(false);
    expect(state.movingLeftOffset).toBeLessThan(0);
  });

  test("omitted min/max stay unbounded and authored bounds clamp", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-wheel id="free" value="0" step="0.1"></fig-input-wheel>
        <fig-input-wheel id="bounded" value="50" min="0" max="100" step="10"></fig-input-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const free = root.querySelector("#free") as HTMLElement & {
        value: string;
        min: number | null;
        max: number | null;
      };
      const bounded = root.querySelector("#bounded") as HTMLElement & {
        value: string;
        min: number | null;
        max: number | null;
      };
      free.focus();
      free.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
      const freeAfterLeft = Number(free.value);
      bounded.focus();
      for (let index = 0; index < 20; index += 1) {
        bounded.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
        );
      }
      const atMin = Number(bounded.value);
      for (let index = 0; index < 30; index += 1) {
        bounded.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
        );
      }
      const atMax = Number(bounded.value);
      bounded.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
      );
      const afterHome = Number(bounded.value);
      bounded.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true }),
      );
      const afterEnd = Number(bounded.value);
      bounded.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
      );
      bounded.min = 20;
      const afterRaiseMin = Number(bounded.value);
      bounded.max = null;
      bounded.value = "500";
      const afterClearMax = Number(bounded.value);
      return {
        freeAfterLeft,
        freeMin: free.min,
        freeMax: free.max,
        freeAriaMin: free.getAttribute("aria-valuemin"),
        freeAriaMax: free.getAttribute("aria-valuemax"),
        atMin,
        atMax,
        afterHome,
        afterEnd,
        afterRaiseMin,
        afterClearMax,
        ariaMin: bounded.getAttribute("aria-valuemin"),
        ariaMax: bounded.getAttribute("aria-valuemax"),
        ariaNow: bounded.getAttribute("aria-valuenow"),
        ariaText: bounded.getAttribute("aria-valuetext"),
        minProp: bounded.min,
      };
    });

    expect(state.freeAfterLeft).toBe(-0.1);
    expect(state.freeMin).toBeNull();
    expect(state.freeMax).toBeNull();
    expect(state.freeAriaMin).toBeNull();
    expect(state.freeAriaMax).toBeNull();
    expect(state.atMin).toBe(0);
    expect(state.atMax).toBe(100);
    expect(state.afterHome).toBe(0);
    expect(state.afterEnd).toBe(100);
    expect(state.afterRaiseMin).toBe(20);
    expect(state.afterClearMax).toBe(500);
    expect(state.ariaMin).toBe("20");
    expect(state.ariaMax).toBeNull();
    expect(state.ariaNow).toBe("500");
    expect(state.ariaText).toBe("500");
    expect(state.minProp).toBe(20);
  });

  test("dragging stops at bounds and emits bounded values", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-wheel id="min-time" value="50" min="0" max="100" step="1"></fig-input-wheel>
        <fig-input-wheel id="max-time" value="50" min="0" max="100" step="1"></fig-input-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const minHost = root.querySelector("#min-time") as HTMLElement & {
        value: string;
      };
      const maxHost = root.querySelector("#max-time") as HTMLElement & {
        value: string;
      };
      const tickPath = minHost.querySelector(
        ".fig-input-wheel-tick",
      ) as SVGPathElement;
      const inputSnapshots: number[] = [];
      minHost.addEventListener("input", (event) => {
        inputSnapshots.push((event as CustomEvent<number>).detail);
      });
      maxHost.addEventListener("input", (event) => {
        inputSnapshots.push((event as CustomEvent<number>).detail);
      });

      const minRect = minHost.getBoundingClientRect();
      const minCenterX = minRect.left + minRect.width / 2;
      const minCenterY = minRect.top + minRect.height / 2;
      minHost.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: minCenterX,
          clientY: minCenterY,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 1,
          clientX: minCenterX - minRect.width * 5,
          clientY: minCenterY,
        }),
      );
      await new Promise(requestAnimationFrame);
      const minValue = Number(minHost.value);
      const minPath = tickPath.getAttribute("d");

      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 1,
          clientX: minCenterX - minRect.width * 6,
          clientY: minCenterY,
        }),
      );
      await new Promise(requestAnimationFrame);
      const stoppedMinPath = tickPath.getAttribute("d");
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          clientX: minCenterX - minRect.width * 6,
          clientY: minCenterY,
        }),
      );

      maxHost.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "End",
        }),
      );
      await new Promise(requestAnimationFrame);
      const maxValue = Number(maxHost.value);

      return {
        minValue,
        maxValue,
        minPath,
        stoppedMinPath,
        inputSnapshots,
      };
    });

    expect(state.minValue).toBe(0);
    expect(state.maxValue).toBe(100);
    expect(state.stoppedMinPath).toBe(state.minPath);
    expect(state.inputSnapshots).toContain(0);
    expect(state.inputSnapshots).toContain(100);
  });

  test("handle pulls without stretching the host", async ({
    page,
  }) => {
    await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <fig-input-wheel id="default-wheel" value="0" step="0.1"></fig-input-wheel>
        <fig-input-wheel id="legacy-elastic" value="0" step="0.1" elastic="false"></fig-input-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });

    const dragHandle = async (id: string) => {
      const wheel = page.locator(`#${id}`);
      const rect = await wheel.boundingBox();
      if (!rect) throw new Error(`Missing wheel bounds for #${id}`);
      await page.mouse.move(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      const hoverCursor = await wheel.evaluate(
        (element) => getComputedStyle(element).cursor,
      );
      await page.mouse.down();
      await page.mouse.move(rect.x + rect.width + 40, rect.y + rect.height / 2);
      const dragging = await wheel.evaluate((element) => {
        const handleEl = element.querySelector(".fig-input-wheel-handle")!;
        const wheelRect = element.getBoundingClientRect();
        const handleRect = handleEl.getBoundingClientRect();
        const hostTransform = getComputedStyle(element).transform;
        return {
          stretchMarker: element.hasAttribute(
            "data-fig-input-wheel-elastic-dragging",
          ),
          offset: Number.parseFloat(
            (element as HTMLElement).style.getPropertyValue(
              "--fig-input-wheel-handle-drag-offset",
            ),
          ),
          centerDelta:
            handleRect.left +
            handleRect.width / 2 -
            (wheelRect.left + wheelRect.width / 2),
          hostTransform,
          hostScale:
            hostTransform === "none" ? 1 : new DOMMatrix(hostTransform).a,
          stretchScale: (element as HTMLElement).style.getPropertyValue(
            "--fig-input-wheel-elastic-scale",
          ),
          stretchOrigin: (element as HTMLElement).style.getPropertyValue(
            "--fig-input-wheel-elastic-origin",
          ),
          cursor: getComputedStyle(element).cursor,
          bodyDragging: document.body.classList.contains(
            "fig-input-wheel-dragging",
          ),
        };
      });
      await page.mouse.up();
      const releaseStartDelta = await wheel.evaluate((element) => {
        const wheelRect = element.getBoundingClientRect();
        const handleRect = element
          .querySelector(".fig-input-wheel-handle")!
          .getBoundingClientRect();
        return (
          handleRect.left +
          handleRect.width / 2 -
          (wheelRect.left + wheelRect.width / 2)
        );
      });
      await page.waitForTimeout(350);
      const released = await wheel.evaluate((element) => {
        const wheelRect = element.getBoundingClientRect();
        const handle = element.querySelector(".fig-input-wheel-handle")!;
        const handleRect = handle.getBoundingClientRect();
        const hostTransform = getComputedStyle(element).transform;
        return {
          stretchMarker: element.hasAttribute(
            "data-fig-input-wheel-elastic-dragging",
          ),
          offset: (element as HTMLElement).style.getPropertyValue(
            "--fig-input-wheel-handle-drag-offset",
          ),
          centerDelta:
            handleRect.left +
            handleRect.width / 2 -
            (wheelRect.left + wheelRect.width / 2),
          transitionDuration: getComputedStyle(handle).transitionDuration,
          hostScale:
            hostTransform === "none" ? 1 : new DOMMatrix(hostTransform).a,
          cursor: getComputedStyle(element).cursor,
          bodyDragging: document.body.classList.contains(
            "fig-input-wheel-dragging",
          ),
        };
      });
      return { hoverCursor, dragging, releaseStartDelta, released };
    };

    const defaultWheel = await dragHandle("default-wheel");
    const legacyElastic = await dragHandle("legacy-elastic");

    expect(defaultWheel.hoverCursor).toBe("ew-resize");
    expect(defaultWheel.dragging.cursor).toBe("grabbing");
    expect(defaultWheel.dragging.bodyDragging).toBe(true);
    expect(defaultWheel.released.cursor).toBe("ew-resize");
    expect(defaultWheel.released.bodyDragging).toBe(false);
    expect(defaultWheel.dragging.stretchMarker).toBe(false);
    expect(defaultWheel.dragging.offset).toBeGreaterThan(0);
    expect(defaultWheel.dragging.offset).toBeLessThanOrEqual(8);
    expect(defaultWheel.dragging.centerDelta).toBeGreaterThan(0);
    expect(defaultWheel.dragging.centerDelta).toBeLessThanOrEqual(8.5);
    expect(defaultWheel.dragging.hostTransform).toBe("none");
    expect(defaultWheel.dragging.hostScale).toBe(1);
    expect(defaultWheel.dragging.stretchScale).toBe("");
    expect(defaultWheel.dragging.stretchOrigin).toBe("");
    expect(defaultWheel.releaseStartDelta).toBeGreaterThan(0);
    expect(defaultWheel.released.stretchMarker).toBe(false);
    expect(defaultWheel.released.offset).toBe("");
    expect(defaultWheel.released.centerDelta).toBeCloseTo(0, 1);
    expect(defaultWheel.released.transitionDuration).toBe("0.28s");
    expect(defaultWheel.released.hostScale).toBeCloseTo(1, 2);
    expect(legacyElastic.dragging.stretchMarker).toBe(false);
    expect(legacyElastic.dragging.offset).toBeGreaterThan(0);
    expect(legacyElastic.dragging.centerDelta).toBeGreaterThan(0);
    expect(legacyElastic.dragging.hostScale).toBe(1);
  });

  test("slightly blurs ticks only during very fast movement", async ({
    page,
  }) => {
    await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `<fig-input-wheel value="0" step="0.1"></fig-input-wheel>`;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });

    const wheel = page.locator("fig-input-wheel");
    await wheel.evaluate((element) => {
      (
        element as HTMLElement & {
          beginScrub(start: { clientX: number }): boolean;
        }
      ).beginScrub({ clientX: 0 });
    });
    await page.waitForTimeout(100);
    await wheel.evaluate((element) => {
      (
        element as HTMLElement & {
          updateScrub(position: number): string;
        }
      ).updateScrub(1);
    });
    const slow = await wheel.evaluate((element) => ({
      active: element.hasAttribute("data-fig-input-wheel-fast"),
      filter: getComputedStyle(
        element.querySelector(".fig-input-wheel-tick")!,
      ).filter,
    }));

    await page.waitForTimeout(16);
    await wheel.evaluate((element) => {
      (
        element as HTMLElement & {
          updateScrub(position: number): string;
        }
      ).updateScrub(121);
    });
    const fast = await wheel.evaluate((element) => ({
      active: element.hasAttribute("data-fig-input-wheel-fast"),
      filter: getComputedStyle(
        element.querySelector(".fig-input-wheel-tick")!,
      ).filter,
    }));

    await page.waitForTimeout(220);
    const settled = await wheel.evaluate((element) => ({
      active: element.hasAttribute("data-fig-input-wheel-fast"),
      filter: getComputedStyle(
        element.querySelector(".fig-input-wheel-tick")!,
      ).filter,
    }));
    await wheel.evaluate((element) => {
      (
        element as HTMLElement & {
          endScrub(commit?: boolean): string;
        }
      ).endScrub(false);
    });

    expect(slow.active).toBe(false);
    expect(slow.filter).toBe("none");
    expect(fast.active).toBe(true);
    expect(fast.filter).toBe("blur(2px)");
    expect(settled.active).toBe(false);
    expect(settled.filter).toBe("none");
  });

  test("wheel input honors shift and disabled blocks interaction", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-wheel aria-label="Delay" value="1" step="0.1"
          min="0" max="20"></fig-input-wheel>
      `;
      await new Promise(requestAnimationFrame);
      const wheel = root.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const events: Array<{ type: string; detail: number }> = [];
      for (const type of ["input", "change"]) {
        wheel.addEventListener(type, (event) => {
          events.push({
            type,
            detail: (event as CustomEvent<number>).detail,
          });
        });
      }
      wheel.dispatchEvent(
        new WheelEvent("wheel", { deltaY: 1, bubbles: true, cancelable: true }),
      );
      wheel.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: 1,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      const beforeDisable = {
        value: Number(wheel.value),
        events: [...events],
      };
      wheel.setAttribute("disabled", "");
      const disabledEventCount = events.length;
      wheel.dispatchEvent(
        new WheelEvent("wheel", { deltaY: 1, bubbles: true, cancelable: true }),
      );
      wheel.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      return {
        beforeDisable,
        finalValue: Number(wheel.value),
        disabledEmits: events.length - disabledEventCount,
        role: wheel.getAttribute("role"),
        name: wheel.getAttribute("aria-label"),
        now: wheel.getAttribute("aria-valuenow"),
        text: wheel.getAttribute("aria-valuetext"),
        min: wheel.getAttribute("aria-valuemin"),
        max: wheel.getAttribute("aria-valuemax"),
        disabled: wheel.getAttribute("aria-disabled"),
        tabIndex: wheel.getAttribute("tabindex"),
      };
    });

    expect(state.beforeDisable).toEqual({
      value: 2.1,
      events: [
        { type: "input", detail: 1.1 },
        { type: "change", detail: 1.1 },
        { type: "input", detail: 2.1 },
        { type: "change", detail: 2.1 },
      ],
    });
    expect(state.finalValue).toBe(2.1);
    expect(state.disabledEmits).toBe(0);
    expect(state).toMatchObject({
      role: "spinbutton",
      name: "Delay",
      now: "2.1",
      text: "2.1",
      min: "0",
      max: "20",
      disabled: "true",
      tabIndex: "-1",
    });
  });
});

test.describe("propskit-wheel", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-wheel");
    });
  });

  test("composes labels, wheel insets, number attributes, and centered handles", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <propskit-wheel id="omitted"></propskit-wheel>
        <propskit-wheel id="named" label="Delay" value="1.5" units="seconds"></propskit-wheel>
        <propskit-wheel id="blank" label="" value="240" units="milliseconds"></propskit-wheel>
        <propskit-wheel id="arbitrary" label="Width" value="12" units="px"
          precision="3"></propskit-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const omitted = root.querySelector("#omitted") as HTMLElement & {
        value: string;
      };
      const named = root.querySelector("#named")!;
      const blank = root.querySelector("#blank")!;
      const arbitrary = root.querySelector("#arbitrary")!;
      const readLayout = (host: Element) => {
        const surfaceRect = host
          .querySelector(".propskit-wheel-surface")!
          .getBoundingClientRect();
        const wheel = host.querySelector("fig-input-wheel")!;
        const wheelRect = wheel.getBoundingClientRect();
        const handleRect = wheel
          .querySelector(".fig-input-wheel-handle")!
          .getBoundingClientRect();
        return {
          leftInset: wheelRect.left - surfaceRect.left,
          rightInset: surfaceRect.right - wheelRect.right,
          handleCenterDelta: Math.abs(
            (handleRect.left + handleRect.right) / 2 -
              (wheelRect.left + wheelRect.right) / 2,
          ),
        };
      };
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return {
        omittedLabel: omitted.querySelector("label")?.textContent,
        namedLabel: named.querySelector("label")?.textContent,
        blankLabel: blank.querySelector("label")?.textContent,
        blankLabelState: blank.hasAttribute("data-label-empty"),
        surfaceCount: omitted.querySelectorAll(".propskit-wheel-surface").length,
        directChildren: [
          ...(omitted.querySelector(".propskit-wheel-surface")?.children ?? []),
        ].map((child) => child.tagName),
        role: omitted.querySelector("fig-input-wheel")?.getAttribute("role"),
        omittedValue: Number(omitted.value),
        omittedStep: omitted
          .querySelector("fig-input-number")
          ?.getAttribute("step"),
        omittedPrecision: omitted
          .querySelector("fig-input-number")
          ?.getAttribute("precision"),
        namedUnits: named.querySelector("fig-input-number")?.getAttribute("units"),
        namedStep: named.querySelector("fig-input-number")?.getAttribute("step"),
        namedWheelUnits: named
          .querySelector("fig-input-wheel")
          ?.getAttribute("units"),
        namedWheelStep: named
          .querySelector("fig-input-wheel")
          ?.getAttribute("step"),
        namedWheelAriaText: named
          .querySelector("fig-input-wheel")
          ?.getAttribute("aria-valuetext"),
        namedPrecision: named
          .querySelector("fig-input-number")
          ?.getAttribute("precision"),
        blankUnits: blank.querySelector("fig-input-number")?.getAttribute("units"),
        blankStep: blank.querySelector("fig-input-number")?.getAttribute("step"),
        blankWheelUnits: blank
          .querySelector("fig-input-wheel")
          ?.getAttribute("units"),
        blankWheelStep: blank
          .querySelector("fig-input-wheel")
          ?.getAttribute("step"),
        blankWheelAriaText: blank
          .querySelector("fig-input-wheel")
          ?.getAttribute("aria-valuetext"),
        arbitraryUnits: arbitrary
          .querySelector("fig-input-number")
          ?.getAttribute("units"),
        arbitraryWheelUnits: arbitrary
          .querySelector("fig-input-wheel")
          ?.getAttribute("units"),
        arbitraryPrecision: arbitrary
          .querySelector("fig-input-number")
          ?.getAttribute("precision"),
        omittedLayout: readLayout(omitted),
        blankLayout: readLayout(blank),
        standardInset: rem * 3,
        spacer2: rem * 0.5,
      };
    });

    expect(state).toMatchObject({
      omittedLabel: "Value",
      namedLabel: "Delay",
      blankLabel: "",
      blankLabelState: true,
      surfaceCount: 1,
      directChildren: ["LABEL", "FIG-INPUT-WHEEL", "FIG-INPUT-NUMBER"],
      role: "spinbutton",
      omittedValue: 0,
      omittedStep: "1",
      omittedPrecision: "0",
      namedUnits: "s",
      namedStep: "0.1",
      namedWheelUnits: null,
      namedWheelStep: "0.1",
      namedWheelAriaText: "1.5 seconds",
      namedPrecision: "2",
      blankUnits: "ms",
      blankStep: "100",
      blankWheelUnits: null,
      blankWheelStep: "100",
      blankWheelAriaText: "240 milliseconds",
      arbitraryUnits: "px",
      arbitraryWheelUnits: null,
      arbitraryPrecision: "3",
    });
    expect(state.omittedLayout.leftInset).toBeCloseTo(state.standardInset, 0);
    expect(state.omittedLayout.rightInset).toBeCloseTo(state.standardInset, 0);
    expect(state.blankLayout.leftInset).toBeCloseTo(state.spacer2, 0);
    expect(state.blankLayout.rightInset).toBeCloseTo(state.standardInset, 0);
    expect(state.omittedLayout.handleCenterDelta).toBeCloseTo(0, 5);
    expect(state.blankLayout.handleCenterDelta).toBeCloseTo(0, 5);
  });

  test("spin false updates only the value and number presentation", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <propskit-wheel value="0" step="0.25" spin="false"></propskit-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("propskit-wheel") as HTMLElement & {
        value: string;
      };
      const wheel = host.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const number = host.querySelector("fig-input-number")!;
      const tickPath = wheel.querySelector(".fig-input-wheel-tick")!;
      const initialPath = tickPath.getAttribute("d");

      host.value = "0.5";
      await new Promise(requestAnimationFrame);
      const afterHostWrite = {
        host: host.value,
        wheel: wheel.value,
        number: number.getAttribute("value"),
        path: tickPath.getAttribute("d"),
      };
      wheel.focus();
      wheel.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
        }),
      );
      await new Promise(requestAnimationFrame);
      return {
        childSpin: wheel.getAttribute("spin"),
        initialPath,
        afterHostWrite,
        afterInteraction: {
          host: host.value,
          wheel: wheel.value,
          number: number.getAttribute("value"),
          path: tickPath.getAttribute("d"),
        },
      };
    });

    expect(state.childSpin).toBe("false");
    expect(state.afterHostWrite).toEqual({
      host: "0.5",
      wheel: "0.5",
      number: "0.5",
      path: state.initialPath,
    });
    expect(Number(state.afterInteraction.host)).toBeGreaterThan(0.5);
    expect(state.afterInteraction.wheel).toBe(state.afterInteraction.host);
    expect(state.afterInteraction.number).toBe(state.afterInteraction.host);
    expect(state.afterInteraction.path).toBe(state.initialPath);
  });

  test("number input visibly spins ticks when enabled", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <propskit-wheel value="0" step="1"></propskit-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("propskit-wheel") as HTMLElement & {
        value: string;
      };
      const wheel = host.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const tickPath = wheel.querySelector(".fig-input-wheel-tick")!;
      const number = host.querySelector("fig-input-number")!;
      const input = number.querySelector("input") as HTMLInputElement;
      const initialPath = tickPath.getAttribute("d");
      const centerDelta = () => {
        const centerX = wheel.clientWidth / 2;
        const tickXs = [
          ...(tickPath.getAttribute("d") ?? "").matchAll(/M ([^ ]+) /g),
        ].map((match) => Number(match[1]));
        return Math.min(...tickXs.map((x) => Math.abs(x - centerX)));
      };

      input.value = "4";
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
      let movingPath = initialPath;
      let moving = false;
      let movingCenterDelta = 0;
      for (let frame = 0; frame < 8; frame += 1) {
        await new Promise(requestAnimationFrame);
        movingPath = tickPath.getAttribute("d");
        moving = wheel.hasAttribute(
          "data-fig-input-wheel-keyboard-moving",
        );
        movingCenterDelta = centerDelta();
        if (moving && movingCenterDelta > 0.1) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 180));
      return {
        hostValue: host.value,
        wheelValue: wheel.value,
        numberValue: number.getAttribute("value"),
        initialPath,
        movingPath,
        moving,
        movingCenterDelta,
        settledCenterDelta: centerDelta(),
      };
    });

    expect(state.hostValue).toBe("4");
    expect(state.wheelValue).toBe("4");
    expect(state.numberValue).toBe("4");
    expect(state.moving).toBe(true);
    expect(state.movingPath).not.toBe(state.initialPath);
    expect(state.movingCenterDelta).toBeGreaterThan(0.1);
    expect(state.settledCenterDelta).toBeCloseTo(0, 5);
  });

  test("text false removes and reinserts the number while expanding the wheel", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <propskit-wheel label="Frames" value="12" text="false"></propskit-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("propskit-wheel") as HTMLElement & {
        value: string;
      };
      const wheel = host.querySelector("fig-input-wheel") as HTMLElement;
      const readLayout = () => {
        const surfaceRect = host
          .querySelector(".propskit-wheel-surface")!
          .getBoundingClientRect();
        const wheelRect = wheel.getBoundingClientRect();
        const handleRect = wheel
          .querySelector(".fig-input-wheel-handle")!
          .getBoundingClientRect();
        return {
          rightInset: surfaceRect.right - wheelRect.right,
          handleCenterDelta: Math.abs(
            (handleRect.left + handleRect.right) / 2 -
              (wheelRect.left + wheelRect.right) / 2,
          ),
        };
      };
      const withoutText = {
        inputCount: host.querySelectorAll("fig-input-number").length,
        ...readLayout(),
      };
      wheel.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      host.removeAttribute("text");
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return {
        withoutText,
        valueAfterKeyboard: Number(host.value),
        withText: {
          inputCount: host.querySelectorAll("fig-input-number").length,
          inputValue: host.querySelector("fig-input-number")?.getAttribute("value"),
          ...readLayout(),
        },
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      };
    });

    expect(state.withoutText.inputCount).toBe(0);
    expect(state.withoutText.rightInset).toBeCloseTo(state.rem * 0.5, 0);
    expect(state.withoutText.handleCenterDelta).toBeCloseTo(0, 5);
    expect(state.valueAfterKeyboard).toBe(13);
    expect(state.withText.inputCount).toBe(1);
    expect(state.withText.inputValue).toBe("13");
    expect(state.withText.rightInset).toBeCloseTo(state.rem * 3, 0);
    expect(state.withText.handleCenterDelta).toBeCloseTo(0, 5);
  });

  test("keeps handle pull while toggling composed row stretch", async ({
    page,
  }) => {
    await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <propskit-wheel id="elastic-row" value="0"></propskit-wheel>
        <propskit-wheel id="rigid-row" value="0" elastic="false"></propskit-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });

    const dragRow = async (id: string) => {
      const wheel = page.locator(`#${id} fig-input-wheel`);
      const rect = await wheel.boundingBox();
      if (!rect) throw new Error(`Missing wheel bounds for #${id}`);
      await page.mouse.move(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(rect.x + rect.width + 24, rect.y + rect.height / 2);
      await page.waitForTimeout(30);
      const dragging = await page.locator(`#${id}`).evaluate((host) => {
        const wheel = host.querySelector("fig-input-wheel") as HTMLElement;
        const handle = wheel.querySelector(
          ".fig-input-wheel-handle",
        ) as HTMLElement;
        const hostTransform = getComputedStyle(host).transform;
        return {
          active: host.hasAttribute(
            "data-propskit-wheel-elastic-dragging",
          ),
          hostScale:
            hostTransform === "none" ? 1 : new DOMMatrix(hostTransform).a,
          wheelTransform: getComputedStyle(wheel).transform,
          handleOffset:
            Number.parseFloat(
              wheel.style.getPropertyValue(
                "--fig-input-wheel-handle-drag-offset",
              ),
            ) || 0,
          handleTransition: getComputedStyle(handle).transitionDuration,
        };
      });
      await page.mouse.up();
      await page.waitForTimeout(350);
      const released = await page.locator(`#${id}`).evaluate((host) => {
        const transform = getComputedStyle(host).transform;
        return {
          active: host.hasAttribute(
            "data-propskit-wheel-elastic-dragging",
          ),
          scale: transform === "none" ? 1 : new DOMMatrix(transform).a,
        };
      });
      return { dragging, released };
    };

    const elastic = await dragRow("elastic-row");
    const rigid = await dragRow("rigid-row");

    expect(elastic.dragging.active).toBe(true);
    expect(elastic.dragging.hostScale).toBeGreaterThan(1);
    expect(elastic.dragging.wheelTransform).toBe("none");
    expect(elastic.dragging.handleOffset).toBeGreaterThan(0);
    expect(elastic.dragging.handleTransition).toBe("0s");
    expect(elastic.released.active).toBe(false);
    expect(elastic.released.scale).toBeCloseTo(1, 2);
    expect(rigid.dragging.active).toBe(false);
    expect(rigid.dragging.hostScale).toBe(1);
    expect(rigid.dragging.handleOffset).toBeGreaterThan(0);
    expect(rigid.dragging.handleTransition).toBe("0s");
  });

  test("synchronizes both children, retargets events, and resets to default", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-wheel label="Delay" value="5" default="3" units="s"></propskit-wheel>
      `;
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("propskit-wheel") as HTMLElement & {
        value: string;
        defaultValue: string;
        isDefault: boolean;
        resetToDefault(): void;
      };
      const wheel = host.querySelector("fig-input-wheel") as HTMLElement & {
        value: string;
      };
      const number = host.querySelector("fig-input-number") as HTMLElement & {
        value: number;
      };
      const received: Array<{
        type: string;
        detail: number;
        targetIsHost: boolean;
        composed: boolean;
      }> = [];
      for (const type of ["input", "change"]) {
        host.addEventListener(type, (event) => {
          received.push({
            type,
            detail: (event as CustomEvent<number>).detail,
            targetIsHost: event.target === host,
            composed: event.composed,
          });
        });
      }

      host.value = "7";
      const afterHostWrite = {
        host: host.value,
        wheel: wheel.value,
        number: number.getAttribute("value"),
      };
      wheel.value = "8";
      wheel.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          composed: true,
          detail: 8,
        }),
      );
      const afterWheelInput = {
        host: host.value,
        wheel: wheel.value,
        number: number.getAttribute("value"),
      };
      number.value = 9;
      number.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          composed: true,
          detail: 9,
        }),
      );
      const afterNumberChange = {
        host: host.value,
        wheel: wheel.value,
        number: number.getAttribute("value"),
      };
      const dirtyBeforeReset = host.isDefault;
      host.resetToDefault();
      host.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return {
        afterHostWrite,
        afterWheelInput,
        afterNumberChange,
        dirtyBeforeReset,
        reset: {
          host: host.value,
          wheel: wheel.value,
          number: number.getAttribute("value"),
          defaultValue: host.defaultValue,
          isDefault: host.isDefault,
        },
        events: received,
        labelId: host.querySelector("label")?.id,
        wheelLabelledBy: wheel.getAttribute("aria-labelledby"),
        numberLabelledBy: number.getAttribute("aria-labelledby"),
        clickDelegatedFocus: document.activeElement === wheel,
      };
    });

    expect(state.afterHostWrite).toEqual({ host: "7", wheel: "7", number: "7" });
    expect(state.afterWheelInput).toEqual({
      host: "8",
      wheel: "8",
      number: "8",
    });
    expect(state.afterNumberChange).toEqual({
      host: "9",
      wheel: "9",
      number: "9",
    });
    expect(state.dirtyBeforeReset).toBe(false);
    expect(state.reset).toEqual({
      host: "3",
      wheel: "3",
      number: "3",
      defaultValue: "3",
      isDefault: true,
    });
    expect(state.events).toEqual([
      { type: "input", detail: 8, targetIsHost: true, composed: true },
      { type: "change", detail: 9, targetIsHost: true, composed: true },
      { type: "input", detail: 3, targetIsHost: true, composed: true },
      { type: "change", detail: 3, targetIsHost: true, composed: true },
    ]);
    expect(state.wheelLabelledBy).toBe(state.labelId);
    expect(state.numberLabelledBy).toBe(state.labelId);
    expect(state.clickDelegatedFocus).toBe(true);
  });

  test("number field starts a scrub before focus and still clicks to edit", async ({
    page,
  }) => {
    await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "240px";
      root.innerHTML = `
        <propskit-wheel value="50" min="0" max="100" step="1" units="s"></propskit-wheel>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("propskit-wheel") as HTMLElement;
      host.dataset.inputCount = "0";
      host.dataset.changeCount = "0";
      host.addEventListener("input", () => {
        host.dataset.inputCount = String(
          Number(host.dataset.inputCount) + 1,
        );
      });
      host.addEventListener("change", () => {
        host.dataset.changeCount = String(
          Number(host.dataset.changeCount) + 1,
        );
      });
    });

    const host = page.locator("propskit-wheel");
    const input = host.locator("fig-input-number input");
    const rect = await input.boundingBox();
    if (!rect) throw new Error("Missing time number input bounds");
    const startX = rect.x + rect.width / 2;
    const startY = rect.y + rect.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 2, startY);
    const beforeThreshold = await host.evaluate((element) => ({
      value: Number((element as HTMLElement & { value: string }).value),
      numberScrubbing: element.hasAttribute("data-number-scrubbing"),
    }));
    await page.mouse.move(startX + 40, startY);
    const duringScrub = await host.evaluate((element) => ({
      value: Number((element as HTMLElement & { value: string }).value),
      numberScrubbing: element.hasAttribute("data-number-scrubbing"),
      handleOffset: Number.parseFloat(
        (
          element.querySelector("fig-input-wheel") as HTMLElement
        ).style.getPropertyValue("--fig-input-wheel-handle-drag-offset"),
      ),
      inputCount: Number((element as HTMLElement).dataset.inputCount),
      wheelFocused:
        document.activeElement ===
        element.querySelector("fig-input-wheel"),
    }));
    await page.mouse.up();
    await page.waitForTimeout(20);
    const afterScrub = await host.evaluate((element) => ({
      numberScrubbing: element.hasAttribute("data-number-scrubbing"),
      changeCount: Number((element as HTMLElement).dataset.changeCount),
    }));

    await input.click();
    const focusedAfterClick = await input.evaluate(
      (element) => element === document.activeElement,
    );

    expect(beforeThreshold.value).toBe(50);
    expect(beforeThreshold.numberScrubbing).toBe(false);
    expect(duringScrub.value).toBeGreaterThan(50);
    expect(duringScrub.numberScrubbing).toBe(true);
    expect(duringScrub.handleOffset).toBeGreaterThan(0);
    expect(duringScrub.inputCount).toBeGreaterThan(0);
    expect(duringScrub.wheelFocused).toBe(true);
    expect(afterScrub.numberScrubbing).toBe(false);
    expect(afterScrub.changeCount).toBe(1);
    expect(focusedAfterClick).toBe(true);
  });

  test("disabled forwards to both child controls and does not emit", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<propskit-wheel disabled value="12" units="s"></propskit-wheel>`;
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("propskit-wheel") as HTMLElement;
      const input = host.querySelector("fig-input-number");
      const wheel = host.querySelector("fig-input-wheel");
      let emitted = 0;
      host.addEventListener("input", () => {
        emitted += 1;
      });
      wheel?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      return {
        inputDisabled: input?.hasAttribute("disabled"),
        wheelDisabled: wheel?.hasAttribute("disabled"),
        wheelAriaDisabled: wheel?.getAttribute("aria-disabled"),
        wheelTabIndex: wheel?.getAttribute("tabindex"),
        emitted,
      };
    });

    expect(state.inputDisabled).toBe(true);
    expect(state.wheelDisabled).toBe(true);
    expect(state.wheelAriaDisabled).toBe("true");
    expect(state.wheelTabIndex).toBe("-1");
    expect(state.emitted).toBe(0);
  });
});

test.describe("propskit-position", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-position");
    });
  });

  test("reflects x and y while preserving the compact point layout", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-position id="position" label="" x="25" y="75"
          default='{"x":25,"y":75}'></propskit-position>
      `;
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("#position") as HTMLElement & {
        value: { x: number; y: number };
        units: "none" | "percent";
        isDefault: boolean;
        resetToDefault(): void;
      };
      const events: Array<{ type: string; detail: unknown; composed: boolean }> = [];
      for (const type of ["input", "change"]) {
        host.addEventListener(type, (event) => {
          events.push({
            type,
            detail: (event as CustomEvent).detail,
            composed: event.composed,
          });
        });
      }
      const xInput = host.querySelector(
        '[data-propskit-position-axis="x"]',
      ) as HTMLElement & { value: number };
      xInput.value = 40;
      xInput.dispatchEvent(
        new CustomEvent("input", { bubbles: true, detail: 40 }),
      );
      const isDefaultAfterEdit = host.isDefault;
      host.resetToDefault();
      const inputs = [
        ...host.querySelectorAll("[data-propskit-position-axis]"),
      ];
      const initialUnits = inputs.map((input) => input.getAttribute("units"));
      host.units = "none";
      const noUnits = inputs.map((input) => input.getAttribute("units"));
      host.units = "percent";
      const percentUnits = inputs.map((input) => input.getAttribute("units"));
      return {
        label: host.querySelector(":scope > fig-field > label")?.textContent,
        axes: [
          ...host.querySelectorAll("[data-propskit-position-axis]"),
        ].map((input) => input.getAttribute("data-propskit-position-axis")),
        prepends: [...host.querySelectorAll("[slot='prepend']")].map(
          (prepend) => prepend.textContent,
        ),
        isDefaultAfterEdit,
        value: host.value,
        attributes: { x: host.getAttribute("x"), y: host.getAttribute("y") },
        initialUnits,
        noUnits,
        percentUnits,
        events,
      };
    });

    expect(state).toEqual({
      label: "Position",
      axes: ["x", "y"],
      prepends: ["X", "Y"],
      isDefaultAfterEdit: false,
      value: { x: 25, y: 75 },
      attributes: { x: "25", y: "75" },
      initialUnits: [null, null],
      noUnits: [null, null],
      percentUnits: ["%", "%"],
      events: [
        {
          type: "input",
          detail: { x: 40, y: 75, units: "none" },
          composed: true,
        },
        {
          type: "input",
          detail: { x: 25, y: 75, units: "none" },
          composed: true,
        },
        {
          type: "change",
          detail: { x: 25, y: 75, units: "none" },
          composed: true,
        },
      ],
    });
  });

  test("removes disabled text and number input chrome", async ({ page }) => {
    const styles = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-position disabled></propskit-position>
        <propskit-number disabled value="12"></propskit-number>
        <propskit-text disabled value="Layer"></propskit-text>
      `;
      await new Promise(requestAnimationFrame);
      return [
        ...root.querySelectorAll("fig-input-number, fig-input-text"),
      ].map((input) => {
        const style = getComputedStyle(input);
        return {
          backgroundColor: style.backgroundColor,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
        };
      });
    });

    expect(styles).toEqual([
      {
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderWidth: "0px",
        boxShadow: "none",
      },
      {
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderWidth: "0px",
        boxShadow: "none",
      },
      {
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderWidth: "0px",
        boxShadow: "none",
      },
      {
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderWidth: "0px",
        boxShadow: "none",
      },
    ]);
  });
});

test.describe("propskit-color-point", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-color-point");
    });
  });

  test("wraps compact color and position controls with color-point values", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-color-point id="control" label="Light" size="small"
          value='{"x":25,"y":75,"color":"#FF00BF"}'></propskit-color-point>
      `;
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("#control") as HTMLElement & {
        value: { x: number; y: number; color: string };
      };
      const group = host.querySelector(
        ":scope > fig-group",
      ) as HTMLElement & { open: boolean };
      const color = group.querySelector(
        ":scope > propskit-color",
      ) as HTMLElement & { value: string };
      const position = group.querySelector(
        ":scope > propskit-position",
      ) as HTMLElement & { value: { x: number; y: number } };
      const initial = {
        name: group.getAttribute("name"),
        compact: group.hasAttribute("compact"),
        collapsible: group.hasAttribute("collapsible"),
        open: group.getAttribute("open"),
        children: [...group.children]
          .filter((child) => child.hasAttribute("data-propskit-color-point-control"))
          .map((child) => child.tagName.toLowerCase()),
        sizes: [color.getAttribute("size"), position.getAttribute("size")],
        color: color.value,
        position: position.value,
        positionUnits: position.getAttribute("units"),
        value: host.value,
      };

      host.setAttribute("label", "Sun");
      host.setAttribute("collapsible", "false");
      const collapsedDisabled = {
        name: group.getAttribute("name"),
        collapsible: group.hasAttribute("collapsible"),
        open: group.getAttribute("open"),
      };
      host.setAttribute("collapsible", "true");
      host.setAttribute("open", "false");
      group.open = true;
      host.removeAttribute("size");

      const events: Array<{ type: string; detail: unknown; composed: boolean }> = [];
      for (const type of ["input", "change"]) {
        host.addEventListener(type, (event) => {
          events.push({
            type,
            detail: (event as CustomEvent).detail,
            composed: event.composed,
          });
        });
      }
      position.value = { x: 40, y: 60 };
      position.dispatchEvent(
        new CustomEvent("input", {
          detail: position.value,
          bubbles: true,
          composed: true,
        }),
      );
      color.value = "#0D99FF";
      color.dispatchEvent(
        new CustomEvent("change", {
          detail: color.value,
          bubbles: true,
          composed: true,
        }),
      );

      return {
        initial,
        collapsedDisabled,
        hostOpenAfterGroupToggle: host.getAttribute("open"),
        sizesAfterRemoval: [
          color.getAttribute("size"),
          position.getAttribute("size"),
        ],
        value: host.value,
        valueAttribute: JSON.parse(host.getAttribute("value") || "{}"),
        events,
      };
    });

    expect(state).toEqual({
      initial: {
        name: "Light",
        compact: true,
        collapsible: true,
        open: "true",
        children: ["propskit-color", "propskit-position"],
        sizes: ["small", "small"],
        color: "#FF00BF",
        position: { x: 25, y: 75 },
        positionUnits: "percent",
        value: { x: 25, y: 75, color: "#FF00BF" },
      },
      collapsedDisabled: {
        name: "Sun",
        collapsible: false,
        open: null,
      },
      hostOpenAfterGroupToggle: "true",
      sizesAfterRemoval: [null, null],
      value: { x: 40, y: 60, color: "#0D99FF" },
      valueAttribute: { x: 40, y: 60, color: "#0D99FF" },
      events: [
        {
          type: "input",
          detail: {
            x: 40,
            y: 60,
            color: "#FF00BF",
            units: "percent",
          },
          composed: true,
        },
        {
          type: "change",
          detail: {
            x: 40,
            y: 60,
            color: "#0D99FF",
            units: "percent",
          },
          composed: true,
        },
      ],
    });
  });
});

test.describe("propskit-point-radius", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-point-radius");
    });
  });

  test("wraps compact position and radius controls with unit-preserving values", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-point-radius id="control" label="Blur" size="small" units="percent"
          value='{"x":25,"y":75,"radius":"25%"}'></propskit-point-radius>
      `;
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("#control") as HTMLElement & {
        value: { x: number; y: number; radius: number | string };
        units: "none" | "percent";
      };
      const group = host.querySelector(":scope > fig-group")!;
      const position = group.querySelector(
        ":scope > propskit-position",
      ) as HTMLElement & { value: { x: number; y: number } };
      const radius = group.querySelector(
        ":scope > propskit-number",
      ) as HTMLElement & { value: number | string };
      const radiusInput = radius.querySelector("fig-input-number")!;
      const initial = {
        name: group.getAttribute("name"),
        compact: group.hasAttribute("compact"),
        collapsible: group.hasAttribute("collapsible"),
        open: group.getAttribute("open"),
        children: [...group.children]
          .filter((child) => child.hasAttribute("data-propskit-point-radius-control"))
          .map((child) => child.tagName.toLowerCase()),
        sizes: [position.getAttribute("size"), radius.getAttribute("size")],
        position: position.value,
        positionUnits: position.getAttribute("units"),
        radius: radius.value,
        radiusUnits: radius.getAttribute("units"),
        value: host.value,
      };

      host.removeAttribute("units");
      await new Promise(requestAnimationFrame);
      const unitsAfterDefault = {
        attribute: position.getAttribute("units"),
        inputs: [
          ...position.querySelectorAll("fig-input-number"),
        ].map((input) => input.getAttribute("units")),
        radius: radius.getAttribute("units"),
        radiusInput: radiusInput.getAttribute("units"),
      };
      host.units = "percent";

      host.value = { x: 25, y: 75, radius: 16 };
      await new Promise(requestAnimationFrame);
      const numericRadius = {
        value: radius.value,
        units: radius.getAttribute("units"),
        inputUnits: radiusInput.getAttribute("units"),
      };
      host.value = { x: 25, y: 75, radius: "25%" };
      await new Promise(requestAnimationFrame);

      const events: Array<{ type: string; detail: unknown; composed: boolean }> = [];
      for (const type of ["input", "change"]) {
        host.addEventListener(type, (event) => {
          events.push({
            type,
            detail: (event as CustomEvent).detail,
            composed: event.composed,
          });
        });
      }
      position.value = { x: 40, y: 60 };
      position.dispatchEvent(
        new CustomEvent("input", {
          detail: position.value,
          bubbles: true,
          composed: true,
        }),
      );
      radius.value = 35;
      radiusInput.setAttribute("units", "%");
      radius.dispatchEvent(
        new CustomEvent("change", {
          detail: radius.value,
          bubbles: true,
          composed: true,
        }),
      );

      return {
        initial,
        unitsAfterDefault,
        numericRadius,
        value: host.value,
        valueAttribute: JSON.parse(host.getAttribute("value") || "{}"),
        radiusUnitsAfterEdit: radius.getAttribute("units"),
        events,
      };
    });

    expect(state).toEqual({
      initial: {
        name: "Blur",
        compact: true,
        collapsible: true,
        open: "true",
        children: ["propskit-position", "propskit-number"],
        sizes: ["small", "small"],
        position: { x: 25, y: 75 },
        positionUnits: "percent",
        radius: 25,
        radiusUnits: "%",
        value: { x: 25, y: 75, radius: "25%" },
      },
      unitsAfterDefault: {
        attribute: null,
        inputs: [null, null],
        radius: null,
        radiusInput: null,
      },
      numericRadius: {
        value: 16,
        units: "%",
        inputUnits: "%",
      },
      value: { x: 40, y: 60, radius: "35%" },
      valueAttribute: { x: 40, y: 60, radius: "35%" },
      radiusUnitsAfterEdit: "%",
      events: [
        {
          type: "input",
          detail: { x: 40, y: 60, radius: 25, units: "percent" },
          composed: true,
        },
        {
          type: "change",
          detail: { x: 40, y: 60, radius: 35, units: "percent" },
          composed: true,
        },
      ],
    });
  });
});

test.describe("propskit-point-radius-angle", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-point-radius-angle");
    });
  });

  test("wraps compact position, radius, and angle controls", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-point-radius-angle id="control" label="Gradient" size="small" units="percent"
          value='{"x":25,"y":75,"radius":"25%","angle":45}'></propskit-point-radius-angle>
      `;
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("#control") as HTMLElement & {
        value: {
          x: number;
          y: number;
          radius: number | string;
          angle: number;
        };
        units: "none" | "percent";
      };
      const group = host.querySelector(":scope > fig-group")!;
      const position = group.querySelector(
        ':scope > [data-propskit-point-radius-angle-control="position"]',
      ) as HTMLElement & { value: { x: number; y: number } };
      const radius = group.querySelector(
        ':scope > [data-propskit-point-radius-angle-control="radius"]',
      ) as HTMLElement & { value: number | string };
      const angle = group.querySelector(
        ':scope > [data-propskit-point-radius-angle-control="angle"]',
      ) as HTMLElement & { value: number | string };
      const radiusInput = radius.querySelector("fig-input-number")!;
      const initial = {
        name: group.getAttribute("name"),
        compact: group.hasAttribute("compact"),
        collapsible: group.hasAttribute("collapsible"),
        open: group.getAttribute("open"),
        children: [...group.children]
          .filter((child) =>
            child.hasAttribute("data-propskit-point-radius-angle-control"),
          )
          .map((child) => child.tagName.toLowerCase()),
        sizes: [
          position.getAttribute("size"),
          radius.getAttribute("size"),
          angle.getAttribute("size"),
        ],
        positionUnits: position.getAttribute("units"),
        radiusUnits: radius.getAttribute("units"),
        angleUnits: angle.getAttribute("units"),
        value: host.value,
      };

      host.removeAttribute("units");
      await new Promise(requestAnimationFrame);
      const defaultUnits = {
        position: [...position.querySelectorAll("fig-input-number")].map(
          (input) => input.getAttribute("units"),
        ),
        radius: radius.getAttribute("units"),
        radiusInput: radiusInput.getAttribute("units"),
      };
      host.units = "percent";

      const events: Array<{ type: string; detail: unknown; composed: boolean }> = [];
      for (const type of ["input", "change"]) {
        host.addEventListener(type, (event) => {
          events.push({
            type,
            detail: (event as CustomEvent).detail,
            composed: event.composed,
          });
        });
      }
      position.value = { x: 40, y: 60 };
      position.dispatchEvent(
        new CustomEvent("input", {
          detail: position.value,
          bubbles: true,
          composed: true,
        }),
      );
      radius.value = 35;
      radiusInput.setAttribute("units", "%");
      radius.dispatchEvent(
        new CustomEvent("change", {
          detail: radius.value,
          bubbles: true,
          composed: true,
        }),
      );
      angle.value = 90;
      angle.dispatchEvent(
        new CustomEvent("input", {
          detail: angle.value,
          bubbles: true,
          composed: true,
        }),
      );

      return {
        initial,
        defaultUnits,
        value: host.value,
        valueAttribute: JSON.parse(host.getAttribute("value") || "{}"),
        events,
      };
    });

    expect(state).toEqual({
      initial: {
        name: "Gradient",
        compact: true,
        collapsible: true,
        open: "true",
        children: [
          "propskit-position",
          "propskit-number",
          "propskit-number",
        ],
        sizes: ["small", "small", "small"],
        positionUnits: "percent",
        radiusUnits: "%",
        angleUnits: "°",
        value: { x: 25, y: 75, radius: "25%", angle: 45 },
      },
      defaultUnits: {
        position: [null, null],
        radius: null,
        radiusInput: null,
      },
      value: { x: 40, y: 60, radius: "35%", angle: 90 },
      valueAttribute: { x: 40, y: 60, radius: "35%", angle: 90 },
      events: [
        {
          type: "input",
          detail: {
            x: 40,
            y: 60,
            radius: 25,
            angle: 45,
            units: "percent",
          },
          composed: true,
        },
        {
          type: "change",
          detail: {
            x: 40,
            y: 60,
            radius: 35,
            angle: 45,
            units: "percent",
          },
          composed: true,
        },
        {
          type: "input",
          detail: {
            x: 40,
            y: 60,
            radius: 35,
            angle: 90,
            units: "percent",
          },
          composed: true,
        },
      ],
    });
  });
});

test.describe("propskit-point-point", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-point-point");
    });
  });

  test("wraps two position controls and aggregates values", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-point-point id="control" label="Gradient" size="small" units="percent"
          value='{"x":25,"y":30,"x2":75,"y2":70}'></propskit-point-point>
      `;
      await new Promise(requestAnimationFrame);
      const host = root.querySelector("#control") as HTMLElement & {
        value: { x: number; y: number; x2: number; y2: number };
        units: "none" | "percent";
      };
      const group = host.querySelector(":scope > fig-group")!;
      const start = group.querySelector(
        ':scope > [data-propskit-point-point-control="start"]',
      ) as HTMLElement & { value: { x: number; y: number } };
      const end = group.querySelector(
        ':scope > [data-propskit-point-point-control="end"]',
      ) as HTMLElement & { value: { x: number; y: number } };
      const initial = {
        name: group.getAttribute("name"),
        compact: group.hasAttribute("compact"),
        collapsible: group.hasAttribute("collapsible"),
        open: group.getAttribute("open"),
        labels: [start.getAttribute("label"), end.getAttribute("label")],
        sizes: [start.getAttribute("size"), end.getAttribute("size")],
        units: [start.getAttribute("units"), end.getAttribute("units")],
        value: host.value,
      };

      host.removeAttribute("units");
      const noUnits = [start, end].map((control) => ({
        attribute: control.getAttribute("units"),
        inputs: [...control.querySelectorAll("fig-input-number")].map((input) =>
          input.getAttribute("units"),
        ),
      }));

      const events: Array<{ type: string; detail: unknown }> = [];
      for (const type of ["input", "change"]) {
        host.addEventListener(type, (event) => {
          events.push({ type, detail: (event as CustomEvent).detail });
        });
      }
      start.value = { x: 10, y: 20 };
      start.dispatchEvent(
        new CustomEvent("input", {
          detail: start.value,
          bubbles: true,
          composed: true,
        }),
      );
      end.value = { x: 80, y: 90 };
      end.dispatchEvent(
        new CustomEvent("change", {
          detail: end.value,
          bubbles: true,
          composed: true,
        }),
      );

      return {
        initial,
        noUnits,
        value: host.value,
        valueAttribute: JSON.parse(host.getAttribute("value") || "{}"),
        events,
      };
    });

    expect(state).toEqual({
      initial: {
        name: "Gradient",
        compact: true,
        collapsible: true,
        open: "true",
        labels: ["Start", "End"],
        sizes: ["small", "small"],
        units: ["percent", "percent"],
        value: { x: 25, y: 30, x2: 75, y2: 70 },
      },
      noUnits: [
        { attribute: null, inputs: [null, null] },
        { attribute: null, inputs: [null, null] },
      ],
      value: { x: 10, y: 20, x2: 80, y2: 90 },
      valueAttribute: { x: 10, y: 20, x2: 80, y2: 90 },
      events: [
        {
          type: "input",
          detail: {
            x: 10,
            y: 20,
            x2: 75,
            y2: 70,
            units: "none",
          },
        },
        {
          type: "change",
          detail: {
            x: 10,
            y: 20,
            x2: 80,
            y2: 90,
            units: "none",
          },
        },
      ],
    });
  });
});

test.describe("PropsKit disabled contract", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
    });
  });

  test("forwards disabled across primitive and composite controls", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-switch disabled></propskit-switch>
        <propskit-color disabled></propskit-color>
        <propskit-fill disabled></propskit-fill>
        <propskit-gradient disabled></propskit-gradient>
        <propskit-select disabled options="One,Two"></propskit-select>
        <propskit-text disabled></propskit-text>
        <propskit-number disabled></propskit-number>
        <propskit-position disabled></propskit-position>
        <propskit-slider disabled></propskit-slider>
        <propskit-wheel disabled></propskit-wheel>
        <propskit-oscillator disabled></propskit-oscillator>
        <propskit-color-point disabled></propskit-color-point>
        <propskit-point-radius disabled></propskit-point-radius>
        <propskit-point-radius-angle disabled></propskit-point-radius-angle>
        <propskit-point-point disabled></propskit-point-point>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const innerSelectors: Record<string, string> = {
        "propskit-switch": "fig-segmented-control",
        "propskit-color": "fig-fill-picker",
        "propskit-fill": "fig-fill-picker",
        "propskit-gradient": "fig-input-gradient",
        "propskit-select": "fig-select, fig-dropdown",
        "propskit-text": "fig-input-text",
        "propskit-number": "fig-input-number",
        "propskit-position": "fig-input-number",
        "propskit-slider": "fig-slider",
        "propskit-wheel": ":is(fig-input-wheel, fig-input-number)",
      };
      const primitives = Object.fromEntries(
        Object.entries(innerSelectors).map(([tag, selector]) => {
          const controls = [
            ...root.querySelectorAll(`${tag} ${selector}`),
          ];
          return [
            tag,
            controls.length > 0 &&
              controls.every((control) => control.hasAttribute("disabled")),
          ];
        }),
      );

      const composites = [
        "propskit-color-point",
        "propskit-point-radius",
        "propskit-point-radius-angle",
        "propskit-point-point",
      ].map((tag) => {
        const host = root.querySelector(tag)!;
        const controls = [
          ...host.querySelectorAll(`:scope > fig-group > [data-${tag}-control]`),
        ];
        return {
          tag,
          count: controls.length,
          allDisabled: controls.every((control) =>
            control.hasAttribute("disabled"),
          ),
        };
      });

      const oscillator = root.querySelector("propskit-oscillator")!;
      const oscillatorControls = [
        ...oscillator.querySelectorAll(
          "propskit-slider, .propskit-oscillator-remove-button, .propskit-oscillator-add-type, .propskit-oscillator-add-type-button",
        ),
      ];

      return {
        primitives,
        composites,
        oscillator: oscillatorControls.map((control) => ({
          tag: control.tagName.toLowerCase(),
          className: control.className,
          disabled: control.hasAttribute("disabled"),
        })),
      };
    });

    expect(state.primitives).toEqual({
      "propskit-switch": true,
      "propskit-color": true,
      "propskit-fill": true,
      "propskit-gradient": true,
      "propskit-select": true,
      "propskit-text": true,
      "propskit-number": true,
      "propskit-position": true,
      "propskit-slider": true,
      "propskit-wheel": true,
    });
    expect(state.composites).toEqual([
      { tag: "propskit-color-point", count: 2, allDisabled: true },
      { tag: "propskit-point-radius", count: 2, allDisabled: true },
      { tag: "propskit-point-radius-angle", count: 3, allDisabled: true },
      { tag: "propskit-point-point", count: 2, allDisabled: true },
    ]);
    expect(state.oscillator.length).toBeGreaterThan(0);
    expect(state.oscillator.filter((control) => !control.disabled)).toEqual([]);
  });

  test("group disabled state is reversible and preserves authored state", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-group id="group" name="Layer" open>
          <propskit-number id="inherited" value="1"></propskit-number>
          <propskit-number id="authored" value="2" disabled></propskit-number>
        </propskit-group>
      `;
      await new Promise(requestAnimationFrame);
      const group = root.querySelector("#group")!;
      const inherited = root.querySelector("#inherited")!;
      const authored = root.querySelector("#authored")!;
      group.setAttribute("disabled", "");
      await new Promise(requestAnimationFrame);
      const whileDisabled = {
        inherited: inherited.hasAttribute("disabled"),
        authored: authored.hasAttribute("disabled"),
        headerDisabled: group
          .querySelector(":scope > fig-header")
          ?.getAttribute("aria-disabled"),
      };
      group.removeAttribute("disabled");
      await new Promise(requestAnimationFrame);
      return {
        whileDisabled,
        afterEnable: {
          inherited: inherited.hasAttribute("disabled"),
          authored: authored.hasAttribute("disabled"),
          headerTabIndex: group
            .querySelector(":scope > fig-header")
            ?.getAttribute("tabindex"),
        },
      };
    });

    expect(state).toEqual({
      whileDisabled: {
        inherited: true,
        authored: true,
        headerDisabled: "true",
      },
      afterEnable: {
        inherited: false,
        authored: true,
        headerTabIndex: "0",
      },
    });
  });

  test("disabled oscillator stops and resumes its playhead", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<propskit-oscillator id="oscillator"></propskit-oscillator>`;
      const oscillator = root.querySelector("#oscillator")!;
      await new Promise((resolve) => setTimeout(resolve, 50));
      oscillator.setAttribute("disabled", "");
      const disabledPlayhead = oscillator.querySelector(
        ".propskit-oscillator-playhead",
      );
      const disabledStart = disabledPlayhead?.getAttribute("cx");
      await new Promise((resolve) => setTimeout(resolve, 80));
      const disabledEnd = disabledPlayhead?.getAttribute("cx");
      oscillator.removeAttribute("disabled");
      await new Promise((resolve) => setTimeout(resolve, 80));
      const resumed = oscillator
        .querySelector(".propskit-oscillator-playhead")
        ?.getAttribute("cx");
      return { disabledStart, disabledEnd, resumed };
    });

    expect(state.disabledEnd).toBe(state.disabledStart);
    expect(state.resumed).not.toBeNull();
    expect(state.resumed).not.toBe(state.disabledEnd);
  });
});

test.describe("fig-canvas-control value synchronization", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await import("/fig-lab.js");
    });
  });

  test("color value objects synchronize fig-canvas-control color", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="position:relative;width:200px;height:100px">
          <fig-canvas-control id="canvas" type="color"
            value='{"x":20,"y":30,"color":"#FF00BF"}'></fig-canvas-control>
        </div>
      `;
      await new Promise(requestAnimationFrame);
      const canvas = root.querySelector("#canvas") as HTMLElement & {
        value: Record<string, unknown>;
      };
      canvas.value = { x: 40, y: 60, color: "#0D99FF" };
      await new Promise(requestAnimationFrame);
      return {
        value: canvas.value,
        color: canvas.getAttribute("color"),
        handleColor: canvas.querySelector("fig-handle")?.getAttribute("color"),
      };
    });

    expect(state).toEqual({
      value: { x: 40, y: 60, color: "#0D99FF" },
      color: "#0D99FF",
      handleColor: "#0D99FF",
    });
  });
});

test.describe("propskit sizes", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-editor.js");
      await Promise.all(
        [
          "propskit-switch",
          "propskit-color",
          "propskit-fill",
          "propskit-gradient",
          "propskit-select",
          "propskit-text",
          "propskit-number",
          "propskit-position",
          "propskit-slider",
          "propskit-wheel",
          "fig-select",
        ].map((tag) => customElements.whenDefined(tag)),
      );
    });
  });

  test("omitted size is large, small compacts, and explicit large stays compatible", async ({ page }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const fixtures: Record<string, string> = {
        "propskit-switch": 'label="Enabled"',
        "propskit-color": 'label="Fill" value="#0D99FF"',
        "propskit-fill":
          "label=\"Fill\" value='{\"type\":\"solid\",\"color\":\"#0D99FF\",\"alpha\":1}'",
        "propskit-gradient":
          "label=\"Gradient\" value='{\"type\":\"gradient\",\"gradient\":{\"type\":\"linear\",\"angle\":90,\"stops\":[{\"position\":0,\"color\":\"#0D99FF\",\"opacity\":100},{\"position\":100,\"color\":\"#9747FF\",\"opacity\":100}]}}'",
        "propskit-select": 'label="Mode" value="A" options="A,B"',
        "propskit-text": 'label="Name" value="Layer"',
        "propskit-number": 'label="Width" value="24"',
        "propskit-position": 'label="Position" x="25" y="75"',
        "propskit-slider": 'label="Opacity" value="50" min="0" max="100"',
        "propskit-wheel": 'label="Delay" value="240" units="ms"',
      };
      root.innerHTML = Object.entries(fixtures)
        .flatMap(([tag, attrs]) => [
          `<${tag} data-size-case="default" ${attrs}></${tag}>`,
          `<${tag} data-size-case="small" size="small" ${attrs}></${tag}>`,
          `<${tag} data-size-case="large" size="large" ${attrs}></${tag}>`,
        ])
        .join("");

      const signature = (element: Element) => {
        const host = getComputedStyle(element);
        const field = element.querySelector("fig-field");
        const fieldStyle = field ? getComputedStyle(field) : null;
        return {
          height: host.height,
          paddingTop: host.paddingTop,
          paddingBottom: host.paddingBottom,
          paddingLeft: host.paddingLeft,
          paddingRight: host.paddingRight,
          fieldPaddingLeft: fieldStyle?.paddingLeft ?? "",
          fieldPaddingRight: fieldStyle?.paddingRight ?? "",
        };
      };

      const styles = Object.keys(fixtures).map((tag) => {
        const defaultElement = root.querySelector(
          `${tag}[data-size-case="default"]`,
        );
        const largeElement = root.querySelector(
          `${tag}[data-size-case="large"]`,
        );
        const smallElement = root.querySelector(
          `${tag}[data-size-case="small"]`,
        );
        if (!defaultElement || !smallElement || !largeElement) {
          throw new Error(`Missing ${tag} size fixtures`);
        }
        return {
          tag,
          defaultStyle: signature(defaultElement),
          smallStyle: signature(smallElement),
          largeStyle: signature(largeElement),
        };
      });

      return {
        styles,
        numberForwardsSize: root
          .querySelector('propskit-number[size="small"] fig-input-number')
          ?.hasAttribute("size"),
        gradientSizes: {
          default: root
            .querySelector(
              'propskit-gradient[data-size-case="default"] fig-input-gradient',
            )
            ?.getAttribute("size"),
          small: root
            .querySelector(
              'propskit-gradient[data-size-case="small"] fig-input-gradient',
            )
            ?.getAttribute("size"),
          large: root
            .querySelector(
              'propskit-gradient[data-size-case="large"] fig-input-gradient',
            )
            ?.getAttribute("size"),
        },
        gradientHeights: {
          default: root
            .querySelector(
              'propskit-gradient[data-size-case="default"] fig-input-gradient',
            )
            ?.getBoundingClientRect().height,
          small: root
            .querySelector(
              'propskit-gradient[data-size-case="small"] fig-input-gradient',
            )
            ?.getBoundingClientRect().height,
          large: root
            .querySelector(
              'propskit-gradient[data-size-case="large"] fig-input-gradient',
            )
            ?.getBoundingClientRect().height,
        },
        rightSpacing: {
          defaultText: getComputedStyle(
            root.querySelector(
              'propskit-text[data-size-case="default"] fig-input-text',
            )!,
          ).marginRight,
          defaultNumber: getComputedStyle(
            root.querySelector(
              'propskit-number[data-size-case="default"] fig-input-number',
            )!,
          ).marginRight,
          defaultSelect: getComputedStyle(
            root.querySelector(
              'propskit-select[data-size-case="default"] fig-select',
            )!,
          ).paddingRight,
          smallText: getComputedStyle(
            root.querySelector(
              'propskit-text[data-size-case="small"] fig-input-text',
            )!,
          ).marginRight,
          smallNumber: getComputedStyle(
            root.querySelector(
              'propskit-number[data-size-case="small"] fig-input-number',
            )!,
          ).marginRight,
          smallSelect: getComputedStyle(
            root.querySelector(
              'propskit-select[data-size-case="small"] fig-select',
            )!,
          ).paddingRight,
        },
        wheelLabelPadding: {
          default: getComputedStyle(
            root.querySelector(
              'propskit-wheel[data-size-case="default"] .propskit-wheel-surface > label',
            )!,
          ).paddingLeft,
          small: getComputedStyle(
            root.querySelector(
              'propskit-wheel[data-size-case="small"] .propskit-wheel-surface > label',
            )!,
          ).paddingLeft,
          large: getComputedStyle(
            root.querySelector(
              'propskit-wheel[data-size-case="large"] .propskit-wheel-surface > label',
            )!,
          ).paddingLeft,
        },
        numberHeights: [
          "propskit-number",
          "propskit-position",
          "propskit-slider",
          "propskit-wheel",
        ].flatMap((tag) =>
          ["default", "small", "large"].map((sizeCase) => {
            const number = root.querySelector(
              `${tag}[data-size-case="${sizeCase}"] fig-input-number`,
            );
            const input = number?.querySelector("input");
            return {
              tag,
              sizeCase,
              host: number?.getBoundingClientRect().height ?? 0,
              input: input?.getBoundingClientRect().height ?? 0,
            };
          }),
        ),
      };
    });

    const paddedFields = new Set([
      "propskit-switch",
      "propskit-color",
      "propskit-fill",
      "propskit-gradient",
      "propskit-text",
      "propskit-number",
      "propskit-slider",
    ]);
    for (const entry of result.styles) {
      expect(entry.defaultStyle.paddingTop, entry.tag).toBe("4px");
      expect(entry.defaultStyle.paddingBottom, entry.tag).toBe("4px");
      expect(entry.defaultStyle.height, entry.tag).toBe("40px");
      expect(entry.smallStyle.paddingTop, entry.tag).toBe("4px");
      expect(entry.smallStyle.paddingBottom, entry.tag).toBe("4px");
      expect(entry.smallStyle.height, entry.tag).toBe("32px");
      expect(entry.largeStyle.paddingTop, entry.tag).toBe("4px");
      expect(entry.largeStyle.paddingBottom, entry.tag).toBe("4px");
      expect(entry.largeStyle.height, entry.tag).toBe("40px");
      if (paddedFields.has(entry.tag)) {
        expect(entry.defaultStyle.fieldPaddingLeft, entry.tag).toBe("12px");
        expect(entry.smallStyle.fieldPaddingLeft, entry.tag).toBe("8px");
        expect(entry.largeStyle.fieldPaddingLeft, entry.tag).toBe("12px");
      }
    }
    expect(result.numberForwardsSize).toBe(false);
    expect(result.gradientSizes).toEqual({
      default: null,
      small: null,
      large: null,
    });
    expect(result.gradientHeights).toEqual({
      default: 32,
      small: 24,
      large: 32,
    });
    const gradientStyles = result.styles.find(
      (entry) => entry.tag === "propskit-gradient",
    );
    expect(gradientStyles?.defaultStyle.fieldPaddingRight).toBe("0px");
    expect(gradientStyles?.smallStyle.fieldPaddingRight).toBe("0px");
    expect(gradientStyles?.largeStyle.fieldPaddingRight).toBe("0px");
    expect(result.rightSpacing.defaultText).toBe(result.rightSpacing.defaultNumber);
    expect(result.rightSpacing.defaultText).toBe(result.rightSpacing.defaultSelect);
    expect(result.rightSpacing.smallText).toBe(result.rightSpacing.smallNumber);
    expect(result.rightSpacing.smallText).toBe(result.rightSpacing.smallSelect);
    expect(result.wheelLabelPadding).toEqual({
      default: "12px",
      small: "8px",
      large: "12px",
    });
    const switchStyles = result.styles.find(
      (entry) => entry.tag === "propskit-switch",
    );
    expect(switchStyles?.defaultStyle.fieldPaddingRight).toBe("4px");
    expect(switchStyles?.smallStyle.fieldPaddingRight).toBe("0px");
    expect(switchStyles?.largeStyle.fieldPaddingRight).toBe("4px");
    for (const number of result.numberHeights) {
      expect(number.host, `${number.tag} ${number.sizeCase} host`).toBe(24);
      expect(number.input, `${number.tag} ${number.sizeCase} input`).toBe(24);
    }
  });

  test("PropsKit number inputs use focused backgrounds and scrub cursors", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-number label="Width" value="24"></propskit-number>
        <propskit-slider label="Opacity" value="50" min="0" max="100"></propskit-slider>
        <propskit-wheel label="Delay" value="240" units="ms"></propskit-wheel>
        <propskit-position label="Position" x="25" y="75"></propskit-position>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--figma-color-bg)";
      root.append(probe);
      const expectedBackground = getComputedStyle(probe).backgroundColor;
      probe.remove();

      const tags = [
        "propskit-number",
        "propskit-slider",
        "propskit-wheel",
        "propskit-position",
      ];
      const states = tags.map((tag) => {
        const number = root.querySelector(
          `${tag} fig-input-number`,
        ) as HTMLElement | null;
        const input = number?.querySelector("input");
        if (!number || !(input instanceof HTMLInputElement)) {
          throw new Error(`Missing ${tag} number input`);
        }
        const restingBackground = getComputedStyle(number).backgroundColor;
        const restingCursor = getComputedStyle(input).cursor;
        input.focus();
        const focusedBackground = getComputedStyle(number).backgroundColor;
        const focusedCursor = getComputedStyle(input).cursor;
        input.blur();
        return {
          tag,
          restingBackground,
          restingCursor,
          focusedBackground,
          focusedCursor,
        };
      });

      return { expectedBackground, states };
    });

    for (const state of result.states) {
      expect(state.restingBackground, state.tag).toBe("rgba(0, 0, 0, 0)");
      expect(state.focusedBackground, state.tag).toBe(
        result.expectedBackground,
      );
      if (state.tag === "propskit-slider" || state.tag === "propskit-wheel") {
        expect(state.restingCursor, state.tag).toBe("ew-resize");
        expect(state.focusedCursor, state.tag).toBe("text");
      }
    }

    const wheelInput = page.locator("propskit-wheel fig-input-number input");
    await wheelInput.evaluate((input) => {
      input.addEventListener("mousedown", (event) => event.preventDefault(), {
        once: true,
      });
    });
    await wheelInput.hover();
    await page.mouse.down();
    const activeState = await page
      .locator("propskit-wheel fig-input-number")
      .evaluate((number) => ({
        active:
          number.matches(":active") ||
          Boolean(number.querySelector("input:active")),
        background: getComputedStyle(number).backgroundColor,
        cursor: getComputedStyle(number.querySelector("input")!).cursor,
      }));
    await page.mouse.up();

    expect(activeState.active).toBe(true);
    expect(activeState.background).toBe(result.expectedBackground);
    expect(activeState.cursor).toBe("text");
  });

  test("horizontal field labels span three quarters of the field", async ({
    page,
  }) => {
    const labels = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "300px";
      const fixtures: Record<string, string> = {
        "propskit-switch": "",
        "propskit-color": 'value="#0D99FF"',
        "propskit-fill": 'value=\'{"type":"solid","color":"#0D99FF","alpha":1}\'',
        "propskit-gradient": "",
        "propskit-select": 'value="A" options="A,B"',
        "propskit-text": 'value="Layer"',
        "propskit-number": 'value="24"',
        "propskit-slider": 'value="50" min="0" max="100"',
      };
      root.innerHTML = Object.entries(fixtures)
        .map(
          ([tag, attrs]) =>
            `<${tag} label="An intentionally long property label that must truncate" ${attrs}></${tag}>`,
        )
        .join("");

      return Object.keys(fixtures).map((tag) => {
        const label = root.querySelector(`${tag} fig-field > label`);
        const field = root.querySelector(`${tag} fig-field`);
        if (!label) throw new Error(`Missing ${tag} label`);
        if (!field) throw new Error(`Missing ${tag} field`);
        const style = getComputedStyle(label);
        return {
          tag,
          display: style.display,
          maxWidth: style.maxWidth,
          width: label.getBoundingClientRect().width,
          fieldWidth: field.getBoundingClientRect().width,
          overflow: style.overflow,
          textOverflow: style.textOverflow,
          whiteSpace: style.whiteSpace,
          isTruncated: label.scrollWidth > label.clientWidth,
        };
      });
    });

    for (const label of labels) {
      expect(label, label.tag).toMatchObject({
        display: "block",
        maxWidth: "75%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        isTruncated: true,
      });
      expect(label.width, label.tag).toBeCloseTo(label.fieldWidth * 0.75, 4);
    }
  });

  test("default propskit-select label matches shared horizontal label padding", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.style.width = "300px";
      root.innerHTML = `
        <propskit-text label="Alignment" value="Layer"></propskit-text>
        <propskit-select label="Alignment" value="Center" options="Left,Center,Right"></propskit-select>
      `;
      const textLabel = root.querySelector("propskit-text fig-field > label");
      const selectLabel = root.querySelector(
        "propskit-select fig-field > label",
      );
      const selectField = root.querySelector("propskit-select fig-field");
      if (!textLabel || !selectLabel || !selectField) {
        throw new Error("Missing large propskit labels");
      }
      const textStyle = getComputedStyle(textLabel);
      const selectStyle = getComputedStyle(selectLabel);
      return {
        textPaddingLeft: textStyle.paddingLeft,
        selectPaddingLeft: selectStyle.paddingLeft,
        selectMaxWidth: selectStyle.maxWidth,
        selectWidth: selectLabel.getBoundingClientRect().width,
        fieldWidth: selectField.getBoundingClientRect().width,
      };
    });

    expect(result.selectPaddingLeft).toBe(result.textPaddingLeft);
    expect(result.selectMaxWidth).toBe("75%");
    expect(result.selectWidth).toBeCloseTo(result.fieldWidth * 0.75, 4);
  });

  test("default and small propskit labels use matching max heights", async ({ page }) => {
    const results = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const fixtures: Record<string, string> = {
        "propskit-switch": 'label="Enabled"',
        "propskit-color": 'label="Fill" value="#0D99FF"',
        "propskit-fill":
          "label=\"Fill\" value='{\"type\":\"solid\",\"color\":\"#0D99FF\",\"alpha\":1}'",
        "propskit-gradient": "label=\"Gradient\"",
        "propskit-select": 'label="Align" value="A" options="A,B"',
        "propskit-text": 'label="Name" value="Layer"',
        "propskit-number": 'label="Size" value="24"',
        "propskit-slider": 'label="Amount" value="50" min="0" max="100"',
      };
      root.innerHTML = Object.entries(fixtures)
        .flatMap(([tag, attrs]) => [
          `<${tag} data-size-case="default" ${attrs}></${tag}>`,
          `<${tag} data-size-case="small" size="small" ${attrs}></${tag}>`,
        ])
        .join("");

      return Object.keys(fixtures).flatMap((tag) =>
        ["default", "small"].map((sizeCase) => {
          const host = root.querySelector(
            `${tag}[data-size-case="${sizeCase}"]`,
          );
          const field = host?.querySelector("fig-field") as HTMLElement;
          const label = host?.querySelector("fig-field > label") as HTMLElement;
          if (!field || !label) throw new Error(`Missing ${tag} ${sizeCase}`);
          return {
            tag,
            sizeCase,
            maxHeightVar: getComputedStyle(field)
              .getPropertyValue("--fig-field-label-max-height")
              .trim(),
            labelHeight: label.getBoundingClientRect().height,
            fieldHeight: field.getBoundingClientRect().height,
          };
        }),
      );
    });

    for (const entry of results) {
      const expectedHeight = entry.sizeCase === "small" ? 24 : 32;
      expect(entry.maxHeightVar, entry.tag).toBe(
        entry.sizeCase === "small" ? "1.5rem" : "2rem",
      );
      expect(entry.labelHeight, entry.tag).toBe(entry.fieldHeight);
      expect(entry.labelHeight, entry.tag).toBe(expectedHeight);
    }
  });
});

test.describe("propskit-color", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await import("/fig-editor.js");
      await customElements.whenDefined("propskit-color");
      await customElements.whenDefined("fig-fill-picker");
    });
  });

  test("composes a fill-picker swatch and forwards color events", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-color label="Fill" value="#0D99FF" alpha="true"></propskit-color>';
    });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    const control = page.locator("propskit-color");
    const field = control.locator("fig-field");
    const picker = control.locator("fig-fill-picker");
    const swatch = picker.locator("fig-swatch");
    await expect(control.locator("fig-field > label")).toHaveText("Fill");
    await expect(control.locator("fig-input-color")).toHaveCount(0);
    await expect(control.locator(".fig-field-chevron")).toHaveCount(0);
    await expect(picker).toHaveAttribute("mode", "solid");
    await expect(picker).toHaveAttribute("alpha", "true");
    await expect(swatch).toHaveCount(1);
    expect(
      (await swatch.getAttribute("background"))?.toLowerCase(),
    ).toBe("#0d99ff");
    const fieldBox = await field.boundingBox();
    const swatchBox = await swatch.boundingBox();
    expect(swatchBox?.height).toBe(32);
    expect(swatchBox?.width).toBeGreaterThan((fieldBox?.width ?? 0) * 0.28);
    expect(swatchBox?.width).toBeLessThanOrEqual((fieldBox?.width ?? 0) * 0.36);
    expect(swatchBox?.x).toBeGreaterThan(
      (fieldBox?.x ?? 0) + (fieldBox?.width ?? 0) * 0.4,
    );

    const events = await control.evaluate((element) => {
      const received: Array<{ type: string; detail: unknown }> = [];
      element.addEventListener("input", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      const inner = element.querySelector("fig-fill-picker");
      inner?.dispatchEvent(
        new CustomEvent("input", {
          detail: { type: "solid", color: "#FF00FF", alpha: 1 },
          bubbles: true,
        }),
      );
      return received;
    });

    expect(events).toEqual([
      { type: "input", detail: { color: "#FF00FF", alpha: 1, opacity: 100 } },
    ]);
    await expect(control).toHaveAttribute("value", "#FF00FF");
    await control.evaluate((element) => (element as HTMLElement).focus());
    await expect(swatch).toBeFocused();
    expect(await control.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("none");
    expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("solid");
    expect(await swatch.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("none");
    expect(
      await swatch.evaluate((element) => {
        const input = element.querySelector("input");
        return input ? getComputedStyle(input).outlineStyle : "none";
      }),
    ).toBe("none");
  });

  test("opens the color picker when the field surface is clicked", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-color label="Background" value="#0D99FF" alpha="true"></propskit-color>';
    });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    await page.locator("propskit-color fig-field").click({ position: { x: 12, y: 12 } });
    await expect(page.locator("dialog.fig-fill-picker-dialog")).toHaveAttribute(
      "open",
      "true",
    );
    expect(
      await page.evaluate(() => {
        const host = document.querySelector("propskit-color") as HTMLElement;
        const dialog = document.querySelector(
          "dialog.fig-fill-picker-dialog",
        ) as HTMLElement & { anchor?: Element };
        const swatch = host?.querySelector("fig-swatch");
        return {
          anchoredToHost: dialog?.anchor === host,
          hostOpen: host?.classList.contains("has-popup-open"),
          hostOutline: getComputedStyle(host).outlineStyle,
          fieldOutline: host
            ? getComputedStyle(host.querySelector("fig-field") as Element)
                .outlineStyle
            : "",
          swatchOutline: swatch ? getComputedStyle(swatch).outlineStyle : "",
          inputOutline: swatch?.querySelector("input")
            ? getComputedStyle(swatch.querySelector("input") as Element)
                .outlineStyle
            : "none",
        };
      }),
    ).toEqual({
      anchoredToHost: true,
      hostOpen: true,
      hostOutline: "none",
      fieldOutline: "solid",
      swatchOutline: "none",
      inputOutline: "none",
    });
  });
});

test.describe("propskit-fill", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await import("/fig-editor.js");
      await customElements.whenDefined("propskit-fill");
      await customElements.whenDefined("fig-fill-picker");
    });
  });

  test("composes a fill-picker swatch and forwards fill events", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        `<propskit-fill label="Fill" value='{"type":"solid","color":"#0D99FF","alpha":1}'></propskit-fill>`;
    });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    const control = page.locator("propskit-fill");
    const field = control.locator("fig-field");
    const picker = control.locator("fig-fill-picker");
    const swatch = picker.locator("fig-swatch");
    await expect(control.locator("fig-field > label")).toHaveText("Fill");
    await expect(control.locator("fig-input-fill")).toHaveCount(0);
    await expect(control.locator(".fig-input-fill-hex")).toHaveCount(0);
    await expect(control.locator(".fig-field-chevron")).toHaveCount(0);
    await expect(picker).not.toHaveAttribute("mode", "solid");
    await expect(swatch).toHaveCount(1);
    expect(
      (await swatch.getAttribute("background"))?.toLowerCase(),
    ).toBe("#0d99ff");
    const fieldBox = await field.boundingBox();
    const swatchBox = await swatch.boundingBox();
    expect(swatchBox?.height).toBe(32);
    expect(swatchBox?.width).toBeGreaterThan((fieldBox?.width ?? 0) * 0.28);
    expect(swatchBox?.width).toBeLessThanOrEqual((fieldBox?.width ?? 0) * 0.36);

    const events = await control.evaluate((element) => {
      const received: Array<{ type: string; detail: unknown }> = [];
      element.addEventListener("input", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      const inner = element.querySelector("fig-fill-picker");
      inner?.dispatchEvent(
        new CustomEvent("input", {
          detail: {
            type: "gradient",
            gradient: {
              type: "linear",
              angle: 90,
              stops: [
                { position: 0, color: "#0D99FF", opacity: 100 },
                { position: 100, color: "#9747FF", opacity: 100 },
              ],
            },
          },
          bubbles: true,
        }),
      );
      return {
        received,
        background: element.querySelector("fig-swatch")?.getAttribute("background"),
        value: element.getAttribute("value"),
      };
    });

    expect(events.received[0]?.type).toBe("input");
    expect((events.received[0]?.detail as { type?: string })?.type).toBe(
      "gradient",
    );
    expect(events.background).toContain("linear-gradient");
    expect(events.value).toContain('"type":"gradient"');
    await control.evaluate((element) => (element as HTMLElement).focus());
    await expect(swatch).toBeFocused();
    expect(await control.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("none");
    expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("solid");
    expect(await swatch.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("none");
    const fillColorInput = swatch.locator("input[type='color']");
    if ((await fillColorInput.count()) > 0) {
      expect(
        await fillColorInput.evaluate((element) => getComputedStyle(element).outlineStyle),
      ).toBe("none");
    }
  });

  test("opens the fill picker when the field surface is clicked", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        `<propskit-fill label="Fill" value='{"type":"solid","color":"#0D99FF","alpha":1}'></propskit-fill>`;
    });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    await page.locator("propskit-fill fig-field").click({ position: { x: 12, y: 12 } });
    await expect(page.locator("dialog.fig-fill-picker-dialog")).toHaveAttribute(
      "open",
      "true",
    );
    expect(
      await page.evaluate(() => {
        const host = document.querySelector("propskit-fill") as HTMLElement;
        const dialog = document.querySelector(
          "dialog.fig-fill-picker-dialog",
        ) as HTMLElement & { anchor?: Element };
        const swatch = host?.querySelector("fig-swatch");
        return {
          anchoredToHost: dialog?.anchor === host,
          hostOpen: host?.classList.contains("has-popup-open"),
          hostOutline: getComputedStyle(host).outlineStyle,
          fieldOutline: host
            ? getComputedStyle(host.querySelector("fig-field") as Element)
                .outlineStyle
            : "",
          swatchOutline: swatch ? getComputedStyle(swatch).outlineStyle : "",
          inputOutline: swatch?.querySelector("input")
            ? getComputedStyle(swatch.querySelector("input") as Element)
                .outlineStyle
            : "none",
        };
      }),
    ).toEqual({
      anchoredToHost: true,
      hostOpen: true,
      hostOutline: "none",
      fieldOutline: "solid",
      swatchOutline: "none",
      inputOutline: "none",
    });
  });

  test("accepts a bare video URL as value", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        `<propskit-fill label="Fill" value="https://example.com/clip.mp4"></propskit-fill>`;
      await customElements.whenDefined("propskit-fill");
      await customElements.whenDefined("fig-fill-picker");
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const host = root.querySelector("propskit-fill") as HTMLElement;
      const picker = host.querySelector("fig-fill-picker") as HTMLElement & {
        value?: { type?: string; video?: { url?: string } };
      };
      return {
        hostValue: host.getAttribute("value"),
        type: picker.value?.type,
        url: picker.value?.video?.url,
      };
    });

    expect(state).toEqual({
      hostValue: "https://example.com/clip.mp4",
      type: "video",
      url: "https://example.com/clip.mp4",
    });
  });

  test("captures a webcam snapshot onto the swatch and host value", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
          enumerateDevices: async () => [],
        },
      });
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        `<propskit-fill label="Fill" mode="webcam" value='{"type":"webcam"}'></propskit-fill>`;
      await customElements.whenDefined("propskit-fill");
      await customElements.whenDefined("fig-fill-picker");
      const control = root.querySelector("propskit-fill") as HTMLElement;
      const picker = control.querySelector("fig-fill-picker") as HTMLElement & {
        open(): void;
        value: { type?: string; webcam?: { snapshot?: string; scaleMode?: string } };
      };
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["live"], { type: "image/png" }));
      };
      picker.open();
      const video = document.querySelector(
        ".fig-fill-picker-webcam-video",
      ) as HTMLVideoElement;
      await new Promise((resolve) => setTimeout(resolve, 0));
      Object.defineProperties(video, {
        readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
        videoWidth: { configurable: true, value: 320 },
        videoHeight: { configurable: true, value: 240 },
      });
      video.dispatchEvent(new Event("canplay"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
      const hostValue = JSON.parse(control.getAttribute("value") || "{}");
      const snapshot = hostValue.webcam?.snapshot ?? picker.value.webcam?.snapshot;
      const swatch = control.querySelector("fig-swatch");
      return {
        type: hostValue.type,
        snapshot,
        background: swatch?.getAttribute("background") ?? "",
        contain: getComputedStyle(swatch as Element).contain,
        overflow: getComputedStyle(swatch as Element).overflow,
        bgSize: (swatch as HTMLElement | null)?.style.getPropertyValue(
          "--swatch-bg-size",
        ),
      };
    });

    expect(state.type).toBe("webcam");
    expect(state.snapshot).toMatch(/^blob:/);
    expect(state.background).toBe(`url("${state.snapshot}")`);
    expect(state.contain).toMatch(/paint/);
    expect(state.overflow).toBe("hidden");
  });
});

test.describe("propskit-gradient", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await import("/fig-editor.js");
      await customElements.whenDefined("propskit-gradient");
      await customElements.whenDefined("fig-fill-picker");
    });
  });

  test("composes a picker gradient and preserves its JSON event contract", async ({
    page,
  }) => {
    const initial = {
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 90,
        interpolationSpace: "srgb",
        hueInterpolation: "shorter",
        stops: [
          { position: 0, color: "#0D99FF", opacity: 100 },
          { position: 100, color: "#9747FF", opacity: 100 },
        ],
      },
    };
    await page.evaluate((value) => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const control = document.createElement("propskit-gradient");
      control.setAttribute("label", "Fill");
      control.setAttribute("mode", "tip");
      control.setAttribute("value", JSON.stringify(value));
      control.setAttribute("default", JSON.stringify(value));
      root.append(control);
    }, initial);

    const control = page.locator("propskit-gradient");
    const gradient = control.locator("fig-input-gradient");
    await expect(control.locator("fig-field > label")).toHaveText("Fill");
    await expect(gradient).toHaveAttribute("edit", "picker");
    await expect(gradient).toHaveAttribute("mode", "tip");
    await expect(gradient).not.toHaveAttribute("size");
    await expect(gradient).toHaveAttribute("aria-label", "Fill");
    await expect(gradient.locator("fig-fill-picker")).toHaveCount(1);
    await expect(gradient.locator("fig-handle:not(.fig-input-gradient-ghost)")).toHaveCount(
      0,
    );
    const fieldBox = await control.locator("fig-field").boundingBox();
    const gradientBox = await gradient.boundingBox();
    expect(gradientBox?.height).toBe(32);
    expect(gradientBox?.width).toBeGreaterThan((fieldBox?.width ?? 0) * 0.28);
    expect(gradientBox?.width).toBeLessThanOrEqual((fieldBox?.width ?? 0) * 0.36);
    expect(gradientBox?.x).toBeGreaterThan(
      (fieldBox?.x ?? 0) + (fieldBox?.width ?? 0) * 0.4,
    );
    expect(
      Math.abs(
        (gradientBox?.x ?? 0) +
          (gradientBox?.width ?? 0) -
          ((fieldBox?.x ?? 0) + (fieldBox?.width ?? 0)),
      ),
    ).toBeLessThan(1);
    await gradient.hover();
    expect(
      await gradient.evaluate((element) => getComputedStyle(element).outlineStyle),
    ).toBe("none");

    const next = {
      ...initial,
      gradient: {
        ...initial.gradient,
        stops: [
          { position: 0, color: "#FF0000", opacity: 100 },
          { position: 100, color: "#0000FF", opacity: 100 },
        ],
      },
    };
    const received = await control.evaluate((element, detail) => {
      const events: Array<{ type: string; detail: unknown }> = [];
      element.addEventListener("input", (event) => {
        events.push({ type: event.type, detail: (event as CustomEvent).detail });
      });
      element.querySelector("fig-input-gradient")?.dispatchEvent(
        new CustomEvent("input", { detail, bubbles: true }),
      );
      return events;
    }, next);

    expect(received).toEqual([{ type: "input", detail: next }]);
    await expect(control).toHaveAttribute("value", JSON.stringify(next));
    await control.evaluate((element) => (element as HTMLElement).focus());
    await expect(gradient).toBeFocused();
    expect(
      await control.evaluate((element) => getComputedStyle(element).outlineStyle),
    ).toBe("none");
    expect(
      await control.locator("fig-field").evaluate((element) => getComputedStyle(element).outlineStyle),
    ).toBe("solid");
    expect(
      await gradient.evaluate((element) => getComputedStyle(element).outlineStyle),
    ).toBe("none");
  });

  test("updates the swatch when the gradient type changes", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const control = document.createElement("propskit-gradient");
      control.setAttribute("label", "Fill");
      control.setAttribute(
        "value",
        JSON.stringify({
          type: "gradient",
          gradient: {
            type: "linear",
            angle: 90,
            stops: [
              { position: 0, color: "#0D99FF", opacity: 100 },
              { position: 100, color: "#9747FF", opacity: 100 },
            ],
          },
        }),
      );
      root.append(control);
    });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    const swatch = page.locator("propskit-gradient fig-swatch");
    expect(await swatch.getAttribute("background")).toMatch(/^linear-gradient\(/);
    expect(await swatch.getAttribute("background")).not.toMatch(/to right/);

    await page.locator("propskit-gradient fig-fill-picker").evaluate((picker) => {
      picker.dispatchEvent(
        new CustomEvent("input", {
          detail: {
            type: "gradient",
            gradient: {
              type: "radial",
              centerX: 50,
              centerY: 50,
              stops: [
                { position: 0, color: "#0D99FF", opacity: 100 },
                { position: 100, color: "#9747FF", opacity: 100 },
              ],
            },
            css: "radial-gradient(circle at 50% 50%, #0D99FF 0%, #9747FF 100%)",
          },
          bubbles: true,
        }),
      );
    });

    expect(await swatch.getAttribute("background")).toMatch(/^radial-gradient\(/);
  });

  test("uses structural defaults, resets, and forwards disabled state", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const initial = {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 90,
          stops: [
            { position: 0, color: "#0D99FF", opacity: 100 },
            { position: 100, color: "#9747FF", opacity: 100 },
          ],
        },
      };
      const reordered = {
        gradient: {
          stops: initial.gradient.stops.map((stop) => ({
            opacity: stop.opacity,
            color: stop.color,
            position: stop.position,
          })),
          angle: 90,
          type: "linear",
        },
        type: "gradient",
      };
      const control = document.createElement("propskit-gradient") as HTMLElement & {
        value: string | object;
        defaultValue: string;
        isDefault: boolean;
        resetToDefault(): void;
      };
      control.setAttribute("value", JSON.stringify(initial));
      control.setAttribute("default", JSON.stringify(reordered));
      control.setAttribute("disabled", "");
      document.querySelector("#fixture-root")?.append(control);
      await new Promise(requestAnimationFrame);
      const structurallyDefault = control.isDefault;
      control.value = {
        ...initial,
        gradient: { ...initial.gradient, angle: 45 },
      };
      const dirty = control.isDefault;
      const resetEvents: string[] = [];
      control.addEventListener("input", () => resetEvents.push("input"));
      control.addEventListener("change", () => resetEvents.push("change"));
      control.resetToDefault();
      return {
        structurallyDefault,
        dirty,
        resetDefault: control.isDefault,
        defaultValue: control.defaultValue,
        value: control.value,
        disabled: control
          .querySelector("fig-input-gradient")
          ?.hasAttribute("disabled"),
        resetEvents,
      };
    });

    expect(state.structurallyDefault).toBe(true);
    expect(state.dirty).toBe(false);
    expect(state.resetDefault).toBe(true);
    expect(JSON.parse(state.value as string)).toEqual(
      JSON.parse(state.defaultValue),
    );
    expect(state.disabled).toBe(true);
    expect(state.resetEvents).toEqual(["input", "change"]);
  });

  test("opens the fill picker when the field surface is clicked", async ({
    page,
  }) => {
    const initial = {
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 90,
        interpolationSpace: "srgb",
        hueInterpolation: "shorter",
        stops: [
          { position: 0, color: "#0D99FF", opacity: 100 },
          { position: 100, color: "#9747FF", opacity: 100 },
        ],
      },
    };
    await page.evaluate((value) => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const control = document.createElement("propskit-gradient");
      control.setAttribute("label", "Fill");
      control.setAttribute("value", JSON.stringify(value));
      root.append(control);
    }, initial);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    await page.locator("propskit-gradient fig-field").click({ position: { x: 12, y: 12 } });
    await expect(page.locator("dialog.fig-fill-picker-dialog")).toHaveAttribute(
      "open",
      "true",
    );
    expect(
      await page.evaluate(() => {
        const host = document.querySelector("propskit-gradient") as HTMLElement;
        const dialog = document.querySelector(
          "dialog.fig-fill-picker-dialog",
        ) as HTMLElement & { anchor?: Element };
        const swatch = host?.querySelector("fig-swatch");
        return {
          anchoredToHost: dialog?.anchor === host,
          hostOpen: host?.classList.contains("has-popup-open"),
          hostOutline: getComputedStyle(host).outlineStyle,
          fieldOutline: host
            ? getComputedStyle(host.querySelector("fig-field") as Element)
                .outlineStyle
            : "",
          swatchOutline: swatch ? getComputedStyle(swatch).outlineStyle : "",
          inputOutline: swatch?.querySelector("input")
            ? getComputedStyle(swatch.querySelector("input") as Element)
                .outlineStyle
            : "none",
        };
      }),
    ).toEqual({
      anchoredToHost: true,
      hostOpen: true,
      hostOutline: "none",
      fieldOutline: "solid",
      swatchOutline: "none",
      inputOutline: "none",
    });
  });
});

test.describe("propskit-switch", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-switch");
    });
  });

  test("composes and forwards switch state, events, and focus", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-switch label="Visible" checked name="visibility"></propskit-switch>';
    });

    const control = page.locator("propskit-switch");
    const field = control.locator("fig-field");
    const innerSwitch = control.locator("fig-segmented-control");
    const offSegment = innerSwitch.locator('fig-segment[value="off"]');
    const onSegment = innerSwitch.locator('fig-segment[value="on"]');
    await expect(control.locator("fig-field > label")).toHaveText("Visible");
    await expect(innerSwitch).toHaveAttribute("name", "visibility");
    await expect(onSegment).toHaveAttribute("selected", "true");

    const fieldBox = await field.boundingBox();
    const switchBox = await innerSwitch.boundingBox();
    expect(switchBox?.width).toBeLessThan(fieldBox?.width ?? 0);
    expect(switchBox?.x).toBeGreaterThan(
      (fieldBox?.x ?? 0) + (fieldBox?.width ?? 0) / 2,
    );

    const eventDetail = await control.evaluate((element) => {
      return new Promise((resolve) => {
        element.addEventListener(
          "input",
          (event) => resolve((event as CustomEvent).detail),
          { once: true },
        );
        (element.querySelector('fig-segment[value="off"]') as HTMLElement)?.click();
      });
    });

    expect(eventDetail).toEqual({ checked: false, value: "" });
    await expect(control).not.toHaveAttribute("checked", "");
    await expect(offSegment).toHaveAttribute("selected", "true");
    await offSegment.focus();
    await expect(offSegment).toBeFocused();
    expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("none");
  });
});

test.describe("propskit-select without fig-editor", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-select");
    });
  });

  test("falls back to fig-dropdown when fig-select is unavailable", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-select
          label="Alignment"
          value="Center"
          options="Left,Center,Right"
        ></propskit-select>
      `;
      // Allow fig-dropdown slotchange to clone options into the native select.
      await Promise.resolve();
      await new Promise((r) => requestAnimationFrame(r));
      const control = root.querySelector("propskit-select");
      const dropdown = control?.querySelector("fig-dropdown");
      const nativeSelect = dropdown?.querySelector(":scope > select") as
        | HTMLSelectElement
        | null
        | undefined;
      return {
        selectRegistered: Boolean(customElements.get("fig-select")),
        usesDropdown: Boolean(dropdown),
        usesSelect: Boolean(control?.querySelector("fig-select")),
        hasNativeSelect: Boolean(nativeSelect),
        full: dropdown?.hasAttribute("full") ?? false,
        value: dropdown?.getAttribute("value"),
        nativeValue: nativeSelect?.value ?? null,
        nativeOptionCount: nativeSelect?.options.length ?? 0,
        optionCount: dropdown?.querySelectorAll(":scope > option").length,
      };
    });

    expect(result).toEqual({
      selectRegistered: false,
      usesDropdown: true,
      usesSelect: false,
      hasNativeSelect: true,
      full: true,
      value: "Center",
      nativeValue: "Center",
      nativeOptionCount: 3,
      optionCount: 3,
    });
  });

  test("fig-dropdown native select stretches to the field height", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-select
          label="Alignment"
          value="Center"
          options="Left,Center,Right"
        ></propskit-select>
      `;
      await Promise.resolve();
      await new Promise((r) => requestAnimationFrame(r));
      const dropdown = root.querySelector("propskit-select fig-dropdown");
      const nativeSelect = dropdown?.querySelector(
        ":scope > select",
      ) as HTMLSelectElement | null;
      if (!dropdown || !nativeSelect) throw new Error("Missing dropdown select");
      return {
        dropdownHeight: dropdown.getBoundingClientRect().height,
        selectHeight: nativeSelect.getBoundingClientRect().height,
        selectHeightCss: getComputedStyle(nativeSelect).height,
      };
    });

    expect(result.dropdownHeight).toBe(32);
    expect(result.selectHeight).toBe(result.dropdownHeight);
  });
});

test.describe("propskit-select", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-editor.js");
      await Promise.all([
        customElements.whenDefined("propskit-select"),
        customElements.whenDefined("fig-select"),
      ]);
    });
  });

  test("composes and forwards options, value, events, and focus", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-select
          label="Alignment"
          value="Center"
          options="Left,Center,Right"
        ></propskit-select>
      `;
    });

    const control = page.locator("propskit-select");
    const field = control.locator("fig-field");
    const select = control.locator("fig-select");
    const optionsDialog = select.locator('dialog[is="fig-popup"]');
    const trigger = select.locator("fig-button.fig-select-trigger");
    await expect(control.locator("fig-field > label")).toHaveText("Alignment");
    await expect(select).toHaveAttribute("value", "Center");
    await expect(optionsDialog).toHaveCount(1);
    // Options are generated from the options attribute into the panel.
    const panel = select.locator(':scope > fig-select-options[slot="panel"]');
    await expect(panel).toHaveCount(1);
    await expect(panel.locator(":scope > fig-select-option")).toHaveCount(3);
    await expect(select.locator(".fig-select-label")).toHaveText("Center");

    const fieldBox = await field.boundingBox();
    const selectBox = await select.boundingBox();
    expect(selectBox?.height).toBe(fieldBox?.height);
    expect(selectBox?.width).toBe(fieldBox?.width);
    expect(
      Math.abs(
        (selectBox?.x ?? 0) +
          (selectBox?.width ?? 0) -
          ((fieldBox?.x ?? 0) + (fieldBox?.width ?? 0)),
      ),
    ).toBeLessThan(1);

    const events = await control.evaluate((element) => {
      const received: Array<{ type: string; detail: unknown }> = [];
      element.addEventListener("input", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      element.addEventListener("change", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      const figSelect = element.querySelector("fig-select") as HTMLElement & {
        value: string;
      };
      if (!figSelect) throw new Error("Missing fig-select");
      figSelect.value = "Right";
      figSelect.dispatchEvent(
        new CustomEvent("input", {
          detail: "Right",
          bubbles: true,
          composed: true,
        }),
      );
      figSelect.dispatchEvent(
        new CustomEvent("change", {
          detail: "Right",
          bubbles: true,
          composed: true,
        }),
      );
      return received;
    });

    expect(events).toEqual([
      { type: "input", detail: "Right" },
      { type: "change", detail: "Right" },
    ]);
    await expect(control).toHaveAttribute("value", "Right");
    await trigger.focus();
    await expect(trigger).toBeFocused();
    expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("none");
  });

  test("accepts JSON array options", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-select
          label="Size"
          value="Medium"
          options='["Small","Medium","Large"]'
        ></propskit-select>
      `;
    });

    const panel = page.locator("propskit-select fig-select-options");
    await expect(panel.locator(":scope > fig-select-option")).toHaveCount(3);
    await expect(
      page.locator("propskit-select fig-select .fig-select-label"),
    ).toHaveText("Medium");
  });

  test("preserves an authored rich options panel", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-select label="Interpolation" value="srgb">
          <fig-select-options slot="panel">
            <fig-select-option value="srgb" label="Classic — sRGB Linear">
              <div><h3>Classic</h3><span>sRGB Linear</span></div>
            </fig-select-option>
            <fig-select-option value="oklab" label="Smooth — OKLab">
              <div><h3>Smooth</h3><span>OKLab</span></div>
            </fig-select-option>
          </fig-select-options>
        </propskit-select>
      `;
    });

    const control = page.locator("propskit-select");
    const panel = control.locator("fig-select > fig-select-options");
    await expect(panel.locator(":scope > fig-select-option")).toHaveCount(2);
    await expect(panel.locator("h3").first()).toHaveText("Classic");
    await expect(panel.locator("span").first()).toHaveText("sRGB Linear");
    await expect(control.locator(".fig-select-label")).toHaveText(
      "Classic — sRGB Linear",
    );
  });

  test("builds panel options from the options attribute", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-select
          label="Align"
          value="Center"
          options="Left,Center,Right"
        ></fig-select>
      `;
    });

    const select = page.locator("fig-select");
    const panel = select.locator(':scope > fig-select-options[slot="panel"]');
    await expect(panel).toHaveCount(1);
    await expect(panel.locator(":scope > fig-select-option")).toHaveCount(3);
    await expect(panel.locator(":scope > fig-select-option").nth(1)).toHaveAttribute(
      "value",
      "Center",
    );
    await expect(select.locator(".fig-select-label")).toHaveText("Center");

    await select.evaluate((el) => {
      el.setAttribute("options", '["Small","Medium"]');
      el.setAttribute("value", "Medium");
    });
    await expect(panel.locator(":scope > fig-select-option")).toHaveCount(2);
    await expect(select.locator(".fig-select-label")).toHaveText("Medium");
  });

  test("options attribute does not override authored fig-select-option children", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-select label="Align" value="left" options="A,B,C">
          <fig-select-options slot="panel">
            <fig-select-option value="left">Left</fig-select-option>
            <fig-select-option value="right">Right</fig-select-option>
          </fig-select-options>
        </fig-select>
      `;
    });

    const panel = page.locator("fig-select fig-select-options");
    await expect(panel.locator(":scope > fig-select-option")).toHaveCount(2);
    await expect(panel.locator('fig-select-option[value="left"]')).toHaveCount(1);
    await expect(panel.locator('fig-select-option[value="A"]')).toHaveCount(0);
  });

  test("marks the first select separator as borderless", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-select value="one">
          <fig-select-options>
            <fig-separator label="First"></fig-separator>
            <fig-select-option value="one">One</fig-select-option>
            <fig-separator label="Second"></fig-separator>
            <fig-select-option value="two">Two</fig-select-option>
          </fig-select-options>
        </fig-select>
      `;
    });

    const separators = page.locator("fig-select-options > fig-separator");
    await expect(separators.first()).toHaveAttribute("borderless", "");
    await expect(separators.nth(1)).not.toHaveAttribute("borderless");
  });

  test("selecting a slotted option updates value, label, and events", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-select label="Align" value="left">
          <fig-select-options slot="panel">
            <fig-select-option value="left">Left</fig-select-option>
            <fig-select-option value="center">Center</fig-select-option>
            <fig-select-option value="right">Right</fig-select-option>
          </fig-select-options>
        </fig-select>
      `;
    });

    const select = page.locator("fig-select");
    const events = await select.evaluate((element) => {
      const received: Array<{ type: string; detail: unknown }> = [];
      element.addEventListener("input", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      element.addEventListener("change", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      (element as HTMLElement & { open: boolean }).open = true;
      return new Promise<Array<{ type: string; detail: unknown }>>((resolve) => {
        requestAnimationFrame(() => {
          const option = element.querySelector(
            'fig-select-option[value="center"]',
          ) as HTMLElement | null;
          option?.click();
          resolve(received);
        });
      });
    });

    expect(events).toEqual([
      { type: "input", detail: "center" },
      { type: "change", detail: "center" },
    ]);
    await expect(select).toHaveAttribute("value", "center");
    await expect(select.locator(".fig-select-label")).toHaveText("Center");
    await expect(select).not.toHaveAttribute("open", "");
  });

  test("emits optionhover with the hovered value without selecting it", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-select id="core-select" label="Align" value="left">
          <fig-select-options slot="panel">
            <fig-select-option value="left">Left</fig-select-option>
            <fig-select-option value="center"><span>Center</span></fig-select-option>
            <fig-select-option value="right" disabled>Right</fig-select-option>
          </fig-select-options>
        </fig-select>
        <propskit-select
          id="propskit-select"
          label="Alignment"
          value="Left"
          options="Left,Center,Right"
        ></propskit-select>
      `;
      for (const id of ["core-select", "propskit-select"]) {
        const element = document.querySelector(`#${id}`) as HTMLElement & {
          hoverEvents?: unknown[];
        };
        element.hoverEvents = [];
        element.addEventListener("optionhover", (event) => {
          element.hoverEvents?.push((event as CustomEvent).detail);
        });
      }
    });

    const core = page.locator("#core-select");
    await core.locator("fig-button.fig-select-trigger").click();
    await page.mouse.move(0, 0);
    await core.evaluate(
      (element: HTMLElement & { hoverEvents?: unknown[] }) =>
        (element.hoverEvents = []),
    );
    await core.locator('fig-select-option[value="center"]').hover();
    await core.locator('fig-select-option[value="center"] span').hover();
    await core.evaluate((element) => {
      element
        .querySelector('fig-select-option[value="right"]')
        ?.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    });

    expect(
      await core.evaluate(
        (element: HTMLElement & { hoverEvents?: unknown[] }) =>
          element.hoverEvents,
      ),
    ).toEqual(["center"]);
    await expect(core).toHaveAttribute("value", "left");
    await core.evaluate(
      (element: HTMLElement & { open?: boolean }) => (element.open = false),
    );

    const propskit = page.locator("#propskit-select");
    await propskit.locator("fig-button.fig-select-trigger").click();
    await page.mouse.move(0, 0);
    await propskit.evaluate(
      (element: HTMLElement & { hoverEvents?: unknown[] }) =>
        (element.hoverEvents = []),
    );
    await propskit.locator('fig-select-option[value="Right"]').hover();

    expect(
      await propskit.evaluate(
        (element: HTMLElement & { hoverEvents?: unknown[] }) =>
          element.hoverEvents,
      ),
    ).toEqual(["Right"]);
    await expect(propskit).toHaveAttribute("value", "Left");
  });

  test("resyncs value when the selected option is removed or its value changes", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-select label="Align" value="center">
          <fig-select-options slot="panel">
            <fig-select-option value="left">Left</fig-select-option>
            <fig-select-option value="center">Center</fig-select-option>
            <fig-select-option value="right">Right</fig-select-option>
          </fig-select-options>
        </fig-select>
      `;
    });

    const select = page.locator("fig-select");
    await expect(select).toHaveAttribute("value", "center");
    await expect(select.locator(".fig-select-label")).toHaveText("Center");

    await select.evaluate((element) => {
      element.querySelector('fig-select-option[value="center"]')?.remove();
    });
    await expect(select).toHaveAttribute("value", "left");
    await expect(select.locator(".fig-select-label")).toHaveText("Left");

    await select.evaluate((element) => {
      const left = element.querySelector('fig-select-option[value="left"]');
      left?.setAttribute("value", "start");
      if (left) left.textContent = "Start";
    });
    await expect(select).toHaveAttribute("value", "start");
    await expect(select.locator(".fig-select-label")).toHaveText("Start");
  });
});

test("fig-select-options spaces its first option when overflow buttons are adjacent", async ({
  page,
}) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.addStyleTag({ url: "/fig-editor.css" });
  await page.evaluate(async () => {
    await import("/fig-editor.js");
    await customElements.whenDefined("fig-select-options");
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-select-options>
        <fig-select-option value="one">One</fig-select-option>
        <fig-select-option value="two">Two</fig-select-option>
      </fig-select-options>
    `;
    const panel = root.querySelector("fig-select-options");
    const start = panel?.querySelector(".fig-overflow-start");
    const end = panel?.querySelector(".fig-overflow-end");
    if (!panel || !start || !end) throw new Error("Missing overflow controls");
    panel.prepend(end);
    panel.prepend(start);
  });

  const options = page.locator("fig-select-option");
  await expect(options.first()).toHaveCSS("margin-top", "8px");
  await expect(options.nth(1)).toHaveCSS("margin-top", "0px");
});

test("sticky fig-separator sits below overflow-start in select and menu lists", async ({
  page,
}) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.addStyleTag({ url: "/fig-editor.css" });
  await page.evaluate(async () => {
    await import("/fig-editor.js");
    await customElements.whenDefined("fig-separator");
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-select-options>
        <fig-separator sticky label="Models"></fig-separator>
        <fig-select-option value="one">One</fig-select-option>
      </fig-select-options>
      <div class="fig-menu-options">
        <fig-separator sticky label="Actions"></fig-separator>
        <fig-menu-item value="copy">Copy</fig-menu-item>
      </div>
    `;
  });

  const selectPanel = page.locator("fig-select-options");
  const menuPanel = page.locator(".fig-menu-options");
  const selectSeparator = selectPanel.locator("fig-separator");
  const menuSeparator = menuPanel.locator("fig-separator");

  await expect(selectSeparator).toHaveCSS("top", "0px");
  await expect(menuSeparator).toHaveCSS("top", "0px");

  await selectPanel.evaluate((panel) => panel.classList.add("overflow-start"));
  await menuPanel.evaluate((panel) => panel.classList.add("overflow-start"));

  const expectedTop = await selectPanel.evaluate((panel) => {
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.top = "var(--fig-vertical-overflow-size)";
    panel.append(probe);
    const top = getComputedStyle(probe).top;
    probe.remove();
    return top;
  });
  await expect(selectSeparator).toHaveCSS("top", expectedTop);
  await expect(menuSeparator).toHaveCSS("top", expectedTop);
});

test.describe("fig-select viewport edge repositioning", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-editor.js");
      await customElements.whenDefined("fig-select");
    });
  });

  const edgeCases = [
    {
      id: "top-left",
      style: "position:fixed;left:8px;top:8px;width:7rem",
      value: "Omega",
    },
    {
      id: "top-right",
      style: "position:fixed;right:8px;top:8px;width:7rem",
      value: "Omega",
    },
    {
      id: "bottom-left",
      style: "position:fixed;left:8px;bottom:8px;width:7rem",
      value: "Alpha",
    },
    {
      id: "bottom-right",
      style: "position:fixed;right:8px;bottom:8px;width:7rem",
      value: "Alpha",
    },
    {
      id: "mid-left",
      // Avoid transform on the host — it makes position:fixed listboxes
      // resolve against the host box instead of the viewport.
      style: "position:fixed;left:8px;top:198px;width:7rem",
      value: "Mu",
    },
    {
      id: "mid-right",
      style: "position:fixed;right:8px;top:198px;width:7rem",
      value: "Mu",
    },
  ] as const;

  for (const edge of edgeCases) {
    test(`keeps listbox fully in viewport near ${edge.id}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 420 });
      await page.evaluate((fixture) => {
        const root = document.querySelector("#fixture-root");
        if (!root) throw new Error("Missing #fixture-root");
        const options = [
          "Alpha",
          "Beta",
          "Gamma",
          "Delta",
          "Epsilon",
          "Zeta",
          "Eta",
          "Theta",
          "Iota",
          "Kappa",
          "Lambda",
          "Mu",
          "Nu",
          "Xi",
          "Omicron",
          "Pi",
          "Rho",
          "Sigma",
          "Tau",
          "Upsilon",
          "Phi",
          "Chi",
          "Psi",
          "Omega",
        ];
        root.innerHTML = `
          <fig-select
            id="edge-select"
            label="Greek"
            value="${fixture.value}"
            options="${options.join(",")}"
            style="${fixture.style}"
          ></fig-select>
        `;
      }, edge);

      const select = page.locator("#edge-select");
      await select.locator("fig-button.fig-select-trigger").click();
      await expect(select).toHaveAttribute("open");

      const popup = select.locator('dialog[is="fig-popup"]');
      await expect(popup).toHaveAttribute("open");

      // Wait for open-time rAF align + clamp.
      await page.waitForTimeout(50);

      const state = await popup.evaluate((dialog) => {
        const rect = dialog.getBoundingClientRect();
        const margin = 8;
        const vv = window.visualViewport;
        const width = vv?.width ?? window.innerWidth;
        const height = vv?.height ?? window.innerHeight;
        const offsetLeft = vv?.offsetLeft ?? 0;
        const offsetTop = vv?.offsetTop ?? 0;
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          minLeft: offsetLeft + margin,
          minTop: offsetTop + margin,
          maxRight: offsetLeft + width - margin,
          maxBottom: offsetTop + height - margin,
        };
      });

      expect(state.width, `${edge.id} menu width`).toBeGreaterThan(0);
      expect(state.height, `${edge.id} menu height`).toBeGreaterThan(0);
      expect(state.left, `${edge.id} left`).toBeGreaterThanOrEqual(state.minLeft - 0.5);
      expect(state.top, `${edge.id} top`).toBeGreaterThanOrEqual(state.minTop - 0.5);
      expect(state.right, `${edge.id} right`).toBeLessThanOrEqual(state.maxRight + 0.5);
      expect(state.bottom, `${edge.id} bottom`).toBeLessThanOrEqual(
        state.maxBottom + 0.5,
      );
    });
  }

  test("clamps a wide menu when trigger sits on the far right", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-select
          id="wide-edge-select"
          label="Wide"
          value="Short"
          style="position:fixed;right:4px;top:40%;width:4rem"
        >
          <fig-select-options slot="panel">
            <fig-select-option value="Short">Short</fig-select-option>
            <fig-select-option value="Wide">
              Extremely long option label that should force horizontal clamp
            </fig-select-option>
          </fig-select-options>
        </fig-select>
      `;
    });

    const select = page.locator("#wide-edge-select");
    await select.locator("fig-button.fig-select-trigger").click();
    await expect(select).toHaveAttribute("open");
    await page.waitForTimeout(50);

    const state = await select
      .locator('dialog[is="fig-popup"]')
      .evaluate((dialog) => {
        const rect = dialog.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          viewportWidth: window.visualViewport?.width ?? window.innerWidth,
        };
      });

    expect(state.width).toBeGreaterThan(0);
    expect(state.left).toBeGreaterThanOrEqual(7.5);
    expect(state.right).toBeLessThanOrEqual(state.viewportWidth - 7.5);
  });

  test("repositions open listbox when the window is resized", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 480 });
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-select
          id="resize-select"
          label="Resize"
          value="Center"
          style="position:fixed;left:40%;top:40%;width:7rem"
        >
          <fig-select-options slot="panel">
            <fig-select-option value="Top">Top</fig-select-option>
            <fig-select-option value="Center">Center</fig-select-option>
            <fig-select-option value="Bottom">Bottom</fig-select-option>
          </fig-select-options>
        </fig-select>
      `;
    });

    const select = page.locator("#resize-select");
    await select.locator("fig-button.fig-select-trigger").click();
    await expect(select).toHaveAttribute("open");
    await page.waitForTimeout(50);

    const before = await select.evaluate((host) => {
      const popup = host.shadowRoot?.querySelector('dialog[is="fig-popup"]');
      const label = host.shadowRoot?.querySelector(".fig-select-label");
      const popupRect = popup?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      return {
        popupTop: popupRect?.top ?? null,
        popupLeft: popupRect?.left ?? null,
        labelTop: labelRect?.top ?? null,
        labelLeft: labelRect?.left ?? null,
      };
    });

    await page.setViewportSize({ width: 360, height: 420 });
    await page.waitForTimeout(80);

    const after = await select.evaluate((host) => {
      const popup = host.shadowRoot?.querySelector('dialog[is="fig-popup"]');
      const label = host.shadowRoot?.querySelector(".fig-select-label");
      const popupRect = popup?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      const margin = 8;
      const vv = window.visualViewport;
      const width = vv?.width ?? window.innerWidth;
      const height = vv?.height ?? window.innerHeight;
      const offsetLeft = vv?.offsetLeft ?? 0;
      const offsetTop = vv?.offsetTop ?? 0;
      return {
        popupTop: popupRect?.top ?? null,
        popupLeft: popupRect?.left ?? null,
        popupRight: popupRect?.right ?? null,
        popupBottom: popupRect?.bottom ?? null,
        labelTop: labelRect?.top ?? null,
        labelLeft: labelRect?.left ?? null,
        minLeft: offsetLeft + margin,
        minTop: offsetTop + margin,
        maxRight: offsetLeft + width - margin,
        maxBottom: offsetTop + height - margin,
      };
    });

    expect(before.popupTop).not.toBeNull();
    expect(after.popupTop).not.toBeNull();
    // Trigger moved with the % positioning; menu must follow.
    expect(Math.abs((after.labelLeft ?? 0) - (before.labelLeft ?? 0))).toBeGreaterThan(1);
    expect(Math.abs((after.popupLeft ?? 0) - (before.popupLeft ?? 0))).toBeGreaterThan(1);
    expect(after.popupLeft!).toBeGreaterThanOrEqual(after.minLeft - 0.5);
    expect(after.popupTop!).toBeGreaterThanOrEqual(after.minTop - 0.5);
    expect(after.popupRight!).toBeLessThanOrEqual(after.maxRight + 0.5);
    expect(after.popupBottom!).toBeLessThanOrEqual(after.maxBottom + 0.5);
  });
});

test.describe("propskit-text", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-text");
    });
  });

  test("composes and forwards text attributes, events, and focus", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-text label="Name" value="Layer 1" placeholder="Enter a name"></propskit-text>';
    });

    const control = page.locator("propskit-text");
    const field = control.locator("fig-field");
    const textInput = control.locator("fig-input-text");
    const input = textInput.locator("input");
    await expect(control.locator("fig-field > label")).toHaveText("Name");
    await expect(textInput).toHaveAttribute("placeholder", "Enter a name");
    await expect(input).toHaveValue("Layer 1");
    await expect(input).toHaveAttribute("aria-label", "Name");

    const fieldBox = await field.boundingBox();
    const inputBox = await textInput.boundingBox();
    expect(inputBox?.height).toBe(fieldBox?.height);
    expect(inputBox?.width).toBeLessThan(fieldBox?.width ?? 0);
    expect(
      Math.abs(
        (inputBox?.x ?? 0) +
          (inputBox?.width ?? 0) -
          ((fieldBox?.x ?? 0) + (fieldBox?.width ?? 0)),
      ),
    ).toBe(4);

    const events = await control.evaluate((element) => {
      const received: Array<{ type: string; detail: unknown }> = [];
      element.addEventListener("input", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      element.addEventListener("change", (event) => {
        received.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
      const nativeInput = element.querySelector("input");
      if (!(nativeInput instanceof HTMLInputElement)) {
        throw new Error("Missing native input");
      }
      nativeInput.value = "Layer 2";
      nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
      nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
      return received;
    });

    expect(events).toEqual([
      { type: "input", detail: "Layer 2" },
      { type: "change", detail: "Layer 2" },
    ]);
    await expect(control).toHaveAttribute("value", "Layer 2");
    await input.focus();
    await expect(input).toBeFocused();
    expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("none");

    await input.fill("A very long layer name that cannot overlap the label");
    await input.blur();
    expect(await input.evaluate((element) => getComputedStyle(element).textOverflow))
      .toBe("ellipsis");
  });
});

test.describe("propskit delegated click behavior", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await import("/fig-editor.js");
    });
  });

  test("delta slider passes its value to the number input", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-slider
          label="Attractor strength"
          type="delta"
        ></propskit-slider>
      `;
      const host = root.querySelector("propskit-slider") as
        | (HTMLElement & { value: string })
        | null;
      if (!host) throw new Error("Missing propskit-slider");
      host.value = "0";
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );

      const slider = host?.querySelector("fig-slider") as
        | (HTMLElement & { value: string })
        | null;
      const number = slider?.querySelector("fig-input-number") as
        | (HTMLElement & { value: string })
        | null;
      const input = number?.querySelector("input");
      return {
        hostAttribute: host?.getAttribute("value"),
        hostValue: host?.value,
        sliderAttribute: slider?.getAttribute("value"),
        sliderValue: slider?.value,
        numberAttribute: number?.getAttribute("value"),
        numberValue: number?.value,
        inputValue: input?.value,
      };
    });

    expect(state).toEqual({
      hostAttribute: "0",
      hostValue: "0",
      sliderAttribute: "0",
      sliderValue: "0",
      numberAttribute: "0",
      numberValue: 0,
      inputValue: "0",
    });
  });

  test("delta slider keeps the number input in sync with a default value", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-slider
          label="Attractor strength"
          type="delta"
          default="0.08"
          min="-2"
          max="2"
          step="0.01"
        ></propskit-slider>
      `;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );

      const host = root.querySelector("propskit-slider") as HTMLElement | null;
      const slider = host?.querySelector("fig-slider") as
        | (HTMLElement & { value: string })
        | null;
      const number = slider?.querySelector("fig-input-number") as
        | (HTMLElement & { value: string | number })
        | null;
      const input = number?.querySelector("input");
      return {
        sliderAttribute: slider?.getAttribute("value"),
        sliderValue: slider?.value,
        numberAttribute: number?.getAttribute("value"),
        numberValue: number?.value,
        inputValue: input?.value,
      };
    });

    expect(state).toEqual({
      sliderAttribute: "0.08",
      sliderValue: "0.08",
      numberAttribute: "0.08",
      numberValue: 0.08,
      inputValue: "0.08",
    });
  });

  test("propskit slider keeps reset defaults separate from inner baselines", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-slider
          id="explicit-default"
          type="delta"
          value="5"
          default="2"
          min="-10"
          max="10"
        ></propskit-slider>
        <propskit-slider
          id="initial-default"
          type="delta"
          value="5"
          min="-10"
          max="30"
        ></propskit-slider>
      `;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );

      type PropskitSliderElement = HTMLElement & {
        value: string;
        defaultValue: string;
        isDefault: boolean;
        resetToDefault(): void;
      };
      type SliderElement = HTMLElement & { defaultValue: number };
      const read = (id: string) => {
        const host = root.querySelector(`#${id}`) as PropskitSliderElement;
        const slider = host.querySelector("fig-slider") as SliderElement;
        return {
          hostDefault: host.getAttribute("default"),
          innerDefault: slider.getAttribute("default"),
          resolvedDefault: slider.defaultValue,
          publicDefault: host.defaultValue,
          value: host.value,
          isDefault: host.isDefault,
        };
      };

      const before = {
        explicit: read("explicit-default"),
        initial: read("initial-default"),
      };
      const explicit = root.querySelector(
        "#explicit-default",
      ) as PropskitSliderElement;
      const initial = root.querySelector(
        "#initial-default",
      ) as PropskitSliderElement;
      explicit.value = "8";
      initial.value = "8";
      const updated = {
        explicit: read("explicit-default"),
        initial: read("initial-default"),
      };
      initial.setAttribute("min", "0");
      initial.setAttribute("max", "40");
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const midpointUpdated = read("initial-default");
      explicit.resetToDefault();
      initial.resetToDefault();
      const after = {
        explicit: read("explicit-default"),
        initial: read("initial-default"),
      };
      return { before, updated, midpointUpdated, after };
    });

    expect(state.before).toEqual({
      explicit: {
        hostDefault: "2",
        innerDefault: "0",
        resolvedDefault: 0,
        publicDefault: "2",
        value: "5",
        isDefault: false,
      },
      initial: {
        hostDefault: null,
        innerDefault: "10",
        resolvedDefault: 10,
        publicDefault: "5",
        value: "5",
        isDefault: true,
      },
    });
    expect(state.updated).toEqual({
      explicit: {
        hostDefault: "2",
        innerDefault: "0",
        resolvedDefault: 0,
        publicDefault: "2",
        value: "8",
        isDefault: false,
      },
      initial: {
        hostDefault: null,
        innerDefault: "10",
        resolvedDefault: 10,
        publicDefault: "5",
        value: "8",
        isDefault: false,
      },
    });
    expect(state.midpointUpdated).toEqual({
      hostDefault: null,
      innerDefault: "20",
      resolvedDefault: 20,
      publicDefault: "5",
      value: "8",
      isDefault: false,
    });
    expect(state.after).toEqual({
      explicit: {
        hostDefault: "2",
        innerDefault: "0",
        resolvedDefault: 0,
        publicDefault: "2",
        value: "2",
        isDefault: true,
      },
      initial: {
        hostDefault: null,
        innerDefault: "20",
        resolvedDefault: 20,
        publicDefault: "5",
        value: "5",
        isDefault: true,
      },
    });
  });

  test("focuses fields, toggles switches, and opens selects", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <propskit-number label="Count" value="3"></propskit-number>
        <propskit-text label="Name" value="Layer 1"></propskit-text>
        <propskit-color label="Fill" value="#0D99FF"></propskit-color>
        <propskit-slider label="Amount" value="50" min="0" max="100"></propskit-slider>
        <propskit-select label="Alignment" value="Left" options="Left,Right"></propskit-select>
        <propskit-switch label="Visible" checked></propskit-switch>
      `;
    });

    const clickField = async (tag: string) => {
      await page.locator(`${tag} fig-field`).dispatchEvent("click");
    };

    await clickField("propskit-number");
    await expect(page.locator("propskit-number input")).toBeFocused();

    await clickField("propskit-text");
    await expect(page.locator("propskit-text input")).toBeFocused();

    await clickField("propskit-color");
    await expect(page.locator("dialog.fig-fill-picker-dialog")).toHaveAttribute(
      "open",
      "true",
    );
    await page.locator(".fig-fill-picker-close").click();
    await expect(page.locator("dialog.fig-fill-picker-dialog")).not.toHaveAttribute(
      "open",
    );

    await page.locator("propskit-slider fig-field").click({ position: { x: 12, y: 12 } });
    await expect(page.locator('propskit-slider input[type="range"]')).toBeFocused();

    await clickField("propskit-select");
    await expect(page.locator("propskit-select fig-select")).toHaveAttribute("open", "");
    await expect(
      page.locator("propskit-select fig-select fig-button.fig-select-trigger"),
    ).toHaveAttribute("aria-expanded", "true");

    // Second click on the field closes (toggle), and must not reopen after
    // fig-popup light-dismiss on pointerdown.
    await page.locator("propskit-select fig-field").click({ position: { x: 12, y: 12 } });
    await expect(page.locator("propskit-select fig-select")).not.toHaveAttribute(
      "open",
    );
    await expect(
      page.locator("propskit-select fig-select fig-button.fig-select-trigger"),
    ).toHaveAttribute("aria-expanded", "false");

    await clickField("propskit-switch");
    await expect(page.locator("propskit-switch")).not.toHaveAttribute("checked", "");
    await expect(
      page.locator('propskit-switch fig-segment[value="off"]'),
    ).toHaveAttribute("selected", "true");
  });

  test("does not interrupt native propskit slider dragging with delayed focus", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-slider label="Amount" value="25" min="0" max="100"></propskit-slider>';
      const slider = root.querySelector("propskit-slider") as HTMLElement | null;
      if (!slider) throw new Error("Missing propskit-slider");
      slider.setAttribute("data-focus-calls", "0");
      const nativeFocus = slider.focus.bind(slider);
      slider.focus = (...args) => {
        slider.setAttribute(
          "data-focus-calls",
          String(Number(slider.getAttribute("data-focus-calls")) + 1),
        );
        nativeFocus(...args);
      };
    });

    const slider = page.locator("propskit-slider");
    const range = slider.locator('input[type="range"]');
    const box = await range.boundingBox();
    if (!box) throw new Error("Missing range bounds");

    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await expect(slider).toHaveAttribute("data-focus-calls", "0");

    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, {
      steps: 5,
    });
    await expect(slider).not.toHaveAttribute("value", "25");
    await page.mouse.up();
  });

  test("number area drags the slider before focus and supports editing after click", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-slider label="Amount" value="25" min="0" max="100"></propskit-slider>';
    });

    const host = page.locator("propskit-slider");
    const range = host.locator('input[type="range"]');
    const number = host.locator("fig-input-number input");
    const numberBox = await number.boundingBox();
    const rangeBox = await range.boundingBox();
    if (!numberBox || !rangeBox) throw new Error("Missing slider bounds");

    await page.mouse.click(
      numberBox.x + numberBox.width / 2,
      numberBox.y + numberBox.height / 2,
    );
    await expect(number).toBeFocused();
    await expect(host).toHaveAttribute("value", "25");

    await number.evaluate((input: HTMLInputElement) => input.blur());
    await page.mouse.move(
      numberBox.x + numberBox.width / 2,
      numberBox.y + numberBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(rangeBox.x + rangeBox.width * 0.65, rangeBox.y + rangeBox.height / 2, {
      steps: 5,
    });
    await page.mouse.up();

    await expect(host).not.toHaveAttribute("value", "25");
    await expect(range).toBeFocused();

    await number.focus();
    const valueBeforeAltDrag = await host.getAttribute("value");
    await page.keyboard.down("Alt");
    await page.mouse.move(
      numberBox.x + numberBox.width / 2,
      numberBox.y + numberBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      numberBox.x + numberBox.width / 2 + 10,
      numberBox.y + numberBox.height / 2,
      { steps: 2 },
    );
    await page.mouse.up();
    await page.keyboard.up("Alt");

    await expect(host).not.toHaveAttribute("value", valueBeforeAltDrag ?? "");
  });

  test("reflects scrub values without re-entering full slider attribute sync", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-slider label="Amount" value="10" min="0" max="100"></propskit-slider>';
      await new Promise(requestAnimationFrame);

      const host = root.querySelector("propskit-slider");
      const slider = host?.querySelector("fig-slider") as
        | (HTMLElement & { value: string })
        | null;
      const range = slider?.querySelector('input[type="range"]');
      if (!host || !slider || !range) throw new Error("Missing slider controls");

      let innerValueWrites = 0;
      const nativeSetAttribute = slider.setAttribute.bind(slider);
      slider.setAttribute = (name, value) => {
        if (name === "value") innerValueWrites += 1;
        nativeSetAttribute(name, value);
      };

      for (let value = 20; value <= 60; value += 10) {
        range.value = String(value);
        range.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await Promise.resolve();
      await new Promise(requestAnimationFrame);

      const reflected = {
        hostValue: host.getAttribute("value"),
        sliderValue: slider.value,
        rangeValue: range.value,
        innerValueWrites,
      };

      host.setAttribute("value", "80");
      await Promise.resolve();
      await new Promise(requestAnimationFrame);

      return {
        reflected,
        external: {
          hostValue: host.getAttribute("value"),
          sliderValue: slider.value,
          rangeValue: range.value,
        },
      };
    });

    expect(state).toEqual({
      reflected: {
        hostValue: "60",
        sliderValue: "60",
        rangeValue: "60",
        innerValueWrites: 5,
      },
      external: {
        hostValue: "80",
        sliderValue: "80",
        rangeValue: "80",
      },
    });
  });

  test("updates fig-slider constraints in place during interaction", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<fig-slider value="50" min="0" max="100" step="1" units="px" text="true"></fig-slider>';
      await new Promise(requestAnimationFrame);

      const slider = root.querySelector("fig-slider");
      const before = slider?.querySelector('input[type="range"]');
      if (!slider || !before) throw new Error("Missing fig-slider");
      before.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      slider.setAttribute("min", "0.0");
      slider.setAttribute("max", "200");
      slider.setAttribute("step", "2");
      slider.setAttribute("units", "rem");
      slider.setAttribute("text", "false");

      const during = slider.querySelector('input[type="range"]');
      const unitsDuring = slider
        .querySelector("fig-input-number")
        ?.getAttribute("units");
      before.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      const after = slider.querySelector('input[type="range"]');
      return {
        sameRangeDuringInteraction: before === during,
        regeneratedAfterRelease: before !== after,
        min: after?.min,
        max: after?.max,
        step: after?.step,
        unitsDuring,
        hasTextInput: Boolean(slider.querySelector("fig-input-number")),
      };
    });

    expect(state).toEqual({
      sameRangeDuringInteraction: true,
      regeneratedAfterRelease: true,
      min: "0",
      max: "200",
      step: "2",
      unitsDuring: "rem",
      hasTextInput: false,
    });
  });
});

test.describe("dropdown keyboard behavior", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-dropdown");
    });
  });

  test("opens the native picker when Enter is pressed on the focused select", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-dropdown label="Residence type">
          <option>House</option>
          <option>Apartment</option>
        </fig-dropdown>
      `;
      const select = root.querySelector("fig-dropdown select");
      if (!select) throw new Error("Missing generated select");
      (select as HTMLSelectElement & { showPicker?: () => void }).showPicker = () => {
        select.setAttribute("data-show-picker-called", "true");
      };
    });

    await page.locator("fig-dropdown select").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("fig-dropdown select")).toHaveAttribute(
      "data-show-picker-called",
      "true",
    );
  });

  test("fig-dropdown keeps a single select on reconnect", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-dropdown id="dropdown-reconnect" label="Residence type" value="Apartment">
          <option>House</option>
          <option value="Apartment">Apartment</option>
        </fig-dropdown>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#dropdown-reconnect").evaluate((host) => {
        const selects = host.querySelectorAll("select");
        const select = selects[0] as HTMLSelectElement | undefined;
        return {
          selectCount: selects.length,
          value: select?.value ?? null,
          optionCount: select?.options.length ?? 0,
        };
      });

    expect(await getState()).toEqual({
      selectCount: 1,
      value: "Apartment",
      optionCount: 2,
    });

    await page.evaluate(() => {
      const host = document.querySelector("#dropdown-reconnect");
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error("Missing dropdown host");
      parent.removeChild(host);
      parent.appendChild(host);
    });
    await page.waitForTimeout(50);

    expect(await getState()).toEqual({
      selectCount: 1,
      value: "Apartment",
      optionCount: 2,
    });
  });
});

test("fig-dropdown and fig-select ghost variant drop the border and use secondary hover fill", async ({
  page,
}) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  await page.addStyleTag({ url: "/fig-editor.css" });
  await page.evaluate(async () => {
    await import("/fig-editor.js");
    await Promise.all([
      customElements.whenDefined("fig-dropdown"),
      customElements.whenDefined("fig-select"),
    ]);
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = `
      <fig-dropdown id="dropdown-default">
        <option>One</option>
      </fig-dropdown>
      <fig-dropdown id="dropdown-ghost" variant="ghost">
        <option>One</option>
      </fig-dropdown>
      <fig-select id="select-default" value="one" options="One,Two"></fig-select>
      <fig-select id="select-ghost" variant="ghost" value="one" options="One,Two"></fig-select>
    `;
  });

  const secondary = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--figma-color-bg-secondary)";
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });

  await expect(page.locator("#dropdown-default select")).not.toHaveCSS(
    "box-shadow",
    "none",
  );
  await expect(page.locator("#dropdown-ghost select")).toHaveCSS(
    "box-shadow",
    "none",
  );
  await page.locator("#dropdown-ghost").hover();
  await expect(page.locator("#dropdown-ghost")).toHaveCSS(
    "background-color",
    secondary,
  );

  await expect(page.locator("#select-default")).not.toHaveCSS(
    "box-shadow",
    "none",
  );
  await expect(page.locator("#select-ghost")).toHaveCSS("box-shadow", "none");
  await page.locator("#select-ghost").hover();
  await expect(page.locator("#select-ghost")).toHaveCSS(
    "background-color",
    secondary,
  );
});

test.describe("joystick axis labels", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-joystick"),
        customElements.whenDefined("fig-handle"),
      ]);
    });
  });

  test("accepts space and comma-delimited axis-labels", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-joystick id="space-labels" axis-labels="X Y"></fig-joystick>
        <fig-joystick id="comma-labels" axis-labels="X,Y"></fig-joystick>
        <fig-joystick id="comma-four-labels" axis-labels="Left, Right, Top, Bottom"></fig-joystick>
      `;
    });

    const labelsFor = (selector: string) =>
      page.locator(selector).evaluate((host) => {
        const labelText = (position: string) =>
          host
            .querySelector(`.fig-joystick-axis-label.${position}`)
            ?.textContent?.trim() ?? "";

        return {
          left: labelText("left"),
          right: labelText("right"),
          top: labelText("top"),
          bottom: labelText("bottom"),
          leftNoRotate:
            host
              .querySelector(".fig-joystick-axis-label.left")
              ?.classList.contains("no-rotate") ?? false,
        };
      });

    await expect.poll(() => labelsFor("#space-labels")).toEqual({
      left: "X",
      right: "",
      top: "",
      bottom: "Y",
      leftNoRotate: true,
    });
    await expect.poll(() => labelsFor("#comma-labels")).toEqual({
      left: "X",
      right: "",
      top: "",
      bottom: "Y",
      leftNoRotate: true,
    });
    await expect.poll(() => labelsFor("#comma-four-labels")).toEqual({
      left: "Left",
      right: "Right",
      top: "Top",
      bottom: "Bottom",
      leftNoRotate: false,
    });
  });

  test("focuses the handle and keeps focus during keyboard movement", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-joystick id="joy" style="width: 200px;"></fig-joystick>`;
    });
    await page.waitForTimeout(100);

    const plane = page.locator("#joy .fig-input-joystick-plane-container");
    const handle = page.locator("#joy fig-handle");
    await expect(plane).not.toHaveAttribute("tabindex", "0");

    await page.locator("#joy").evaluate((host: HTMLElement) => host.focus());
    await expect(handle).toBeFocused();

    const focusStyles = await page.locator("#joy").evaluate((host) => {
      const guides = host.querySelector(".fig-input-joystick-guides");
      const handle = host.querySelector("fig-handle");
      const guideStyle = guides ? getComputedStyle(guides) : null;
      const handleStyle = handle ? getComputedStyle(handle) : null;
      return {
        guideOutlineStyle: guideStyle?.outlineStyle,
        handleOutlineStyle: handleStyle?.outlineStyle,
        handleOutlineOffset: handleStyle?.outlineOffset,
      };
    });
    expect(focusStyles).toEqual({
      guideOutlineStyle: "none",
      handleOutlineStyle: "solid",
      handleOutlineOffset: "1px",
    });

    await page.keyboard.press("ArrowRight");
    await expect(handle).toBeFocused();
    await expect(page.locator("#joy")).toHaveAttribute("value", "51% 50%");
  });
});

test.describe("button accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-button");
    });
  });

  test("toggle buttons sync aria-pressed and ignore disabled clicks", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="toggle" type="toggle">Toggle</fig-button>
        <fig-button id="disabled-toggle" type="toggle" disabled>Disabled</fig-button>
      `;
    });
    await page.waitForTimeout(50);

    const getState = (selector: string) =>
      page.locator(selector).evaluate((host) => {
        const button = host.shadowRoot?.querySelector("button");
        return {
          hostPressed: host.getAttribute("aria-pressed"),
          buttonPressed: button?.getAttribute("aria-pressed"),
          selected: host.getAttribute("selected"),
        };
      });

    await expect.poll(() => getState("#toggle")).toEqual({
      hostPressed: "false",
      buttonPressed: "false",
      selected: null,
    });

    await page.locator("#toggle").evaluate((host) => {
      host.shadowRoot?.querySelector("button")?.click();
    });
    await expect.poll(() => getState("#toggle")).toEqual({
      hostPressed: "true",
      buttonPressed: "true",
      selected: "",
    });

    await expect.poll(() => getState("#disabled-toggle")).toEqual({
      hostPressed: "false",
      buttonPressed: "false",
      selected: null,
    });
    await page.locator("#disabled-toggle").evaluate((host) => {
      host.shadowRoot?.querySelector("button")?.click();
    });
    await expect.poll(() => getState("#disabled-toggle")).toEqual({
      hostPressed: "false",
      buttonPressed: "false",
      selected: null,
    });
  });
});

test.describe("selection control accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-checkbox"),
        customElements.whenDefined("fig-radio"),
        customElements.whenDefined("fig-switch"),
      ]);
    });
  });

  test("checkbox, radio, and switch sync aria-checked on initial and dynamic state", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-checkbox id="checked" checked label="Checked"></fig-checkbox>
        <fig-checkbox id="mixed" indeterminate label="Mixed"></fig-checkbox>
        <fig-radio id="radio" checked label="Radio"></fig-radio>
        <fig-switch id="switch" checked label="Switch"></fig-switch>
        <fig-checkbox id="disabled-toggle" label="Disabled"></fig-checkbox>
      `;
    });
    await page.waitForTimeout(50);

    const inputState = (selector: string) =>
      page.locator(selector).evaluate((host) => {
        const input = host.querySelector("input");
        return {
          ariaChecked: input?.getAttribute("aria-checked"),
          disabled: input?.disabled,
          indeterminate: (input as HTMLInputElement | null)?.indeterminate,
          role: input?.getAttribute("role"),
        };
      });

    await expect.poll(() => inputState("#checked")).toEqual({
      ariaChecked: "true",
      disabled: false,
      indeterminate: false,
      role: null,
    });
    await expect.poll(() => inputState("#mixed")).toEqual({
      ariaChecked: "mixed",
      disabled: false,
      indeterminate: true,
      role: null,
    });
    await expect.poll(() => inputState("#radio")).toEqual({
      ariaChecked: "true",
      disabled: false,
      indeterminate: false,
      role: null,
    });
    await expect.poll(() => inputState("#switch")).toEqual({
      ariaChecked: "true",
      disabled: false,
      indeterminate: false,
      role: "switch",
    });

    await page.locator("#mixed").evaluate((host) => host.setAttribute("checked", ""));
    await expect.poll(() => inputState("#mixed")).toEqual({
      ariaChecked: "true",
      disabled: false,
      indeterminate: false,
      role: null,
    });

    await page
      .locator("#disabled-toggle")
      .evaluate((host) => host.setAttribute("disabled", ""));
    await expect.poll(() => inputState("#disabled-toggle")).toEqual({
      ariaChecked: "false",
      disabled: true,
      indeterminate: false,
      role: null,
    });
  });
});

test.describe("text input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-text");
    });
  });

  test("fig-input-text forwards ARIA names and state to native controls", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="hint">Helpful hint</p>
        <span id="message-label">Message</span>
        <fig-input-text
          id="named-input"
          aria-label="Project name"
          aria-describedby="hint"
          aria-invalid="true"
        ></fig-input-text>
        <fig-input-text
          id="named-textarea"
          multiline
          aria-labelledby="message-label"
        ></fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    const nativeAttrs = (selector: string) =>
      page.locator(selector).evaluate((host) => {
        const input = host.querySelector("input,textarea");
        return {
          ariaLabel: input?.getAttribute("aria-label"),
          ariaLabelledBy: input?.getAttribute("aria-labelledby"),
          ariaDescribedBy: input?.getAttribute("aria-describedby"),
          ariaInvalid: input?.getAttribute("aria-invalid"),
        };
      });

    await expect.poll(() => nativeAttrs("#named-input")).toEqual({
      ariaLabel: "Project name",
      ariaLabelledBy: null,
      ariaDescribedBy: "hint",
      ariaInvalid: "true",
    });
    await expect.poll(() => nativeAttrs("#named-textarea")).toEqual({
      ariaLabel: null,
      ariaLabelledBy: "message-label",
      ariaDescribedBy: null,
      ariaInvalid: null,
    });

    await page.locator("#named-input").evaluate((host) => {
      host.setAttribute("aria-label", "Renamed project");
      host.removeAttribute("aria-invalid");
    });
    await expect.poll(() => nativeAttrs("#named-input")).toEqual({
      ariaLabel: "Renamed project",
      ariaLabelledBy: null,
      ariaDescribedBy: "hint",
      ariaInvalid: null,
    });
  });

  test("fig-input-text shows focus outline only on the host", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text
          id="search"
          type="search"
          value="Text here"
          placeholder="Placeholder text"
        ></fig-input-text>
        <fig-input-text
          id="multiline"
          multiline
          placeholder="Type here..."
        ></fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    const focusStyles = async (hostSelector: string, controlSelector: string) => {
      await page.locator(`${hostSelector} ${controlSelector}`).focus();
      return page.locator(hostSelector).evaluate((host, controlSelector) => {
        const input = host.querySelector(controlSelector);
        const hostStyle = getComputedStyle(host);
        const inputStyle = input ? getComputedStyle(input) : null;
        return {
          hostOutlineStyle: hostStyle.outlineStyle,
          hostOutlineWidth: hostStyle.outlineWidth,
          hostOutlineOffset: hostStyle.outlineOffset,
          inputOutlineStyle: inputStyle?.outlineStyle,
          inputOutlineWidth: inputStyle?.outlineWidth,
          inputBoxShadow: inputStyle?.boxShadow,
        };
      }, controlSelector);
    };

    const searchFocusStyles = await focusStyles("#search", "input");
    expect(searchFocusStyles).toEqual({
      hostOutlineStyle: "solid",
      hostOutlineWidth: "1px",
      hostOutlineOffset: "-1px",
      inputOutlineStyle: "none",
      inputOutlineWidth: "0px",
      inputBoxShadow: "none",
    });

    const multilineFocusStyles = await focusStyles("#multiline", "textarea");
    expect(multilineFocusStyles).toEqual({
      hostOutlineStyle: "solid",
      hostOutlineWidth: "1px",
      hostOutlineOffset: "-1px",
      inputOutlineStyle: "none",
      inputOutlineWidth: "0px",
      inputBoxShadow: "none",
    });
  });

  test("fig-input-text search clear icon survives reconnect", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text
          id="search-reconnect"
          type="search"
          value="Text here"
        ></fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    const getClearIconStyle = () =>
      page
        .locator('#search-reconnect [data-generated="search-clear"] fig-icon')
        .evaluate((icon) => ({
        name: icon.getAttribute("name"),
        iconVar: icon.style.getPropertyValue("--icon"),
      }));

    expect(await getClearIconStyle()).toEqual({
      name: "close",
      iconVar: "var(--icon-16-close)",
    });

    await page.evaluate(() => {
      const host = document.querySelector("#search-reconnect");
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error("Missing search host");
      parent.removeChild(host);
      parent.appendChild(host);
    });
    await page.waitForTimeout(50);

    expect(await getClearIconStyle()).toEqual({
      name: "close",
      iconVar: "var(--icon-16-close)",
    });
  });

  test("fig-input-text password toggle icon survives reconnect", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text
          id="password-reconnect"
          type="password"
          value="secret"
        ></fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    const getToggleIcon = () =>
      page
        .locator('#password-reconnect [data-generated="password-toggle"] fig-icon')
        .evaluate((icon) => ({
          name: icon.getAttribute("name"),
          iconVar: icon.style.getPropertyValue("--icon"),
        }));

    expect(await getToggleIcon()).toEqual({
      name: "hidden",
      iconVar: "var(--icon-16-hidden)",
    });

    await page.evaluate(() => {
      const host = document.querySelector("#password-reconnect");
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error("Missing password host");
      parent.removeChild(host);
      parent.appendChild(host);
    });
    await page.waitForTimeout(50);

    expect(await getToggleIcon()).toEqual({
      name: "hidden",
      iconVar: "var(--icon-16-hidden)",
    });
  });

  test("fig-input-text keeps prepend and append visually ordered across reactive child insertion", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text id="text-slots" value="Button" style="width: 220px">
          <span id="text-append" slot="append">append</span>
        </fig-input-text>
      `;
    });
    await page.waitForTimeout(50);

    await page.locator("#text-slots").evaluate((host) => {
      const prepend = document.createElement("span");
      prepend.id = "text-prepend";
      prepend.setAttribute("slot", "prepend");
      prepend.textContent = "prepend";
      host.append(prepend);
    });
    await page.waitForTimeout(50);

    const order = await page.locator("#text-slots").evaluate((host) => {
      const prepend = host.querySelector("#text-prepend");
      const input = host.querySelector("input");
      const append = host.querySelector("#text-append");
      if (!prepend || !input || !append) throw new Error("Missing slot test nodes");
      return {
        domOrder: Array.from(host.children).map((child) => child.id || child.tagName),
        prependText: prepend.textContent,
        appendText: append.textContent,
        prependLabel: prepend.getAttribute("aria-label"),
        appendLabel: append.getAttribute("aria-label"),
        prependLeft: prepend.getBoundingClientRect().left,
        inputLeft: input.getBoundingClientRect().left,
        appendLeft: append.getBoundingClientRect().left,
      };
    });

    expect(order.domOrder).toEqual(["INPUT", "text-append", "text-prepend"]);
    expect(order.prependText).toBe("P");
    expect(order.appendText).toBe("A");
    expect(order.prependLabel).toBe("prepend");
    expect(order.appendLabel).toBe("append");
    expect(order.prependLeft).toBeLessThan(order.inputLeft);
    expect(order.inputLeft).toBeLessThan(order.appendLeft);

    await page.locator("#text-append").hover();
    await expect(page.locator('dialog[data-tooltip-managed][role="tooltip"]')).toContainText("append");
    await page.mouse.move(0, 0);

    await page.locator("#text-append").evaluate((append) => {
      append.textContent = "suffix";
    });
    await expect
      .poll(() => page.locator("#text-append").evaluate((append) => append.textContent))
      .toBe("S");
    await expect
      .poll(() => page.locator("#text-append").evaluate((append) => append.getAttribute("aria-label")))
      .toBe("suffix");
    await page.locator("#text-append").hover();
    await expect(page.locator('dialog[data-tooltip-managed][role="tooltip"]')).toContainText("suffix");
  });

  test("fig-input-text fills a header when it is the only child", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-header id="text-header" style="width:320px">
          <fig-input-text value="Search"></fig-input-text>
        </fig-header>
      `;
    });

    const layout = await page.locator("#text-header").evaluate((header) => {
      const input = header.querySelector("fig-input-text");
      if (!input) throw new Error("Missing header text input");
      const headerStyle = getComputedStyle(header);
      const headerBox = header.getBoundingClientRect();
      const inputBox = input.getBoundingClientRect();
      return {
        availableWidth:
          headerBox.width -
          parseFloat(headerStyle.paddingLeft) -
          parseFloat(headerStyle.paddingRight),
        inputWidth: inputBox.width,
      };
    });

    expect(layout.inputWidth).toBeCloseTo(layout.availableWidth, 5);
  });
});

test.describe("number input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-number");
    });
  });

  test("fig-input-number exposes spinbutton semantics and forwarded names", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="number-hint">Use arrow keys to adjust.</p>
        <fig-input-number
          id="number"
          value="50"
          min="0"
          max="100"
          units="%"
          aria-label="Opacity"
          aria-describedby="number-hint"
          aria-required="true"
        ></fig-input-number>
      `;
    });
    await page.waitForTimeout(50);

    const nativeAttrs = () =>
      page.locator("#number").evaluate((host) => {
        const input = host.querySelector("input");
        return {
          role: input?.getAttribute("role"),
          ariaLabel: input?.getAttribute("aria-label"),
          ariaDescribedBy: input?.getAttribute("aria-describedby"),
          ariaRequired: input?.getAttribute("aria-required"),
          ariaValueMin: input?.getAttribute("aria-valuemin"),
          ariaValueMax: input?.getAttribute("aria-valuemax"),
          ariaValueNow: input?.getAttribute("aria-valuenow"),
          ariaValueText: input?.getAttribute("aria-valuetext"),
        };
      });

    await expect.poll(nativeAttrs).toEqual({
      role: "spinbutton",
      ariaLabel: "Opacity",
      ariaDescribedBy: "number-hint",
      ariaRequired: "true",
      ariaValueMin: "0",
      ariaValueMax: "100",
      ariaValueNow: "50",
      ariaValueText: "50%",
    });

    await page.locator("#number").evaluate((host) => {
      host.setAttribute("value", "75");
      host.setAttribute("aria-label", "Layer opacity");
      host.removeAttribute("max");
    });
    await expect.poll(nativeAttrs).toEqual({
      role: "spinbutton",
      ariaLabel: "Layer opacity",
      ariaDescribedBy: "number-hint",
      ariaRequired: "true",
      ariaValueMin: "0",
      ariaValueMax: null,
      ariaValueNow: "75",
      ariaValueText: "75%",
    });
  });

  test("fig-input-number keeps slots visually around the input before steppers", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-number id="number-slots" value="12" steppers style="width: 220px">
          <span id="number-append" slot="append">pixels</span>
        </fig-input-number>
      `;
    });
    await page.waitForTimeout(50);

    await page.locator("#number-slots").evaluate((host) => {
      const prepend = document.createElement("span");
      prepend.id = "number-prepend";
      prepend.setAttribute("slot", "prepend");
      prepend.textContent = "axis";
      host.append(prepend);
    });
    await page.waitForTimeout(50);

    const order = await page.locator("#number-slots").evaluate((host) => {
      const prepend = host.querySelector("#number-prepend");
      const input = host.querySelector("input");
      const append = host.querySelector("#number-append");
      const steppers = host.querySelector(".fig-steppers");
      if (!prepend || !input || !append || !steppers) {
        throw new Error("Missing number slot test nodes");
      }
      return {
        domOrder: Array.from(host.children).map((child) => child.id || child.tagName),
        prependText: prepend.textContent,
        appendText: append.textContent,
        prependLabel: prepend.getAttribute("aria-label"),
        appendLabel: append.getAttribute("aria-label"),
        prependLeft: prepend.getBoundingClientRect().left,
        inputLeft: input.getBoundingClientRect().left,
        appendLeft: append.getBoundingClientRect().left,
        steppersLeft: steppers.getBoundingClientRect().left,
      };
    });

    expect(order.domOrder).toEqual([
      "INPUT",
      "number-append",
      "SPAN",
      "number-prepend",
    ]);
    expect(order.prependText).toBe("A");
    expect(order.appendText).toBe("P");
    expect(order.prependLabel).toBe("axis");
    expect(order.appendLabel).toBe("pixels");
    expect(order.prependLeft).toBeLessThan(order.inputLeft);
    expect(order.inputLeft).toBeLessThan(order.appendLeft);
    expect(order.appendLeft).toBeLessThan(order.steppersLeft);
  });
});

test.describe("combo input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-combo-input"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-button"),
        customElements.whenDefined("fig-dropdown"),
      ]);
    });
  });

  test("forwards accessible name and state to generated controls", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="combo-help">Choose or enter a font.</p>
        <fig-combo-input
          id="combo"
          options="Inter, Roboto"
          placeholder="Font"
          aria-label="Font family"
          aria-describedby="combo-help"
          aria-required="true"
        ></fig-combo-input>
      `;
    });
    await page.waitForTimeout(100);

    const state = await page.locator("#combo").evaluate((host) => {
      const input = host.querySelector("fig-input-text input");
      const button = host.querySelector('fig-button[type="select"]');
      const dropdown = host.querySelector("fig-dropdown select");
      return {
        inputLabel: input?.getAttribute("aria-label"),
        inputDescribedBy: input?.getAttribute("aria-describedby"),
        inputRequired: input?.getAttribute("aria-required"),
        selectButtons: host.querySelectorAll('fig-button[type="select"]').length,
        nativeButtonInSelect: button?.shadowRoot?.querySelector("button") !== null,
        dropdownLabel: dropdown?.getAttribute("aria-label"),
      };
    });

    expect(state).toEqual({
      inputLabel: "Font family",
      inputDescribedBy: "combo-help",
      inputRequired: "true",
      selectButtons: 1,
      nativeButtonInSelect: false,
      dropdownLabel: "Font family options",
    });

    await page.locator("#combo fig-dropdown select").evaluate((select) => {
      const el = select as HTMLSelectElement & { showPicker?: () => void };
      el.showPicker = () => {
        el.dataset.showPickerCalled = "true";
      };
    });
    await page.locator("#combo fig-dropdown select").focus();
    await expect
      .poll(() =>
        page.locator("#combo").evaluate((host) => {
          const dropdownSelect = host.querySelector("fig-dropdown select");
          const button = host.querySelector('fig-button[type="select"]');
          return {
            selectFocused: document.activeElement === dropdownSelect,
            buttonFocused: document.activeElement === button,
          };
        }),
      )
      .toEqual({ selectFocused: true, buttonFocused: false });
    await page.keyboard.press("Enter");
    await expect(page.locator("#combo fig-dropdown select")).toHaveAttribute(
      "data-show-picker-called",
      "true",
    );

    const focusRing = await page
      .locator('#combo fig-button[type="select"]')
      .evaluate((button) => {
        const style = getComputedStyle(button);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      });
    expect(focusRing).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
    });
  });

  test("broadcasts dropdown input and change from the combo host only", async ({
    page,
  }) => {
    const events = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-combo-input
          id="combo-events"
          options="Inter, Roboto"
          value="Inter"
        ></fig-combo-input>
      `;
      await new Promise(requestAnimationFrame);

      const received = [];
      for (const type of ["input", "change"]) {
        root.addEventListener(type, (event) => {
          received.push({
            type: event.type,
            target: event.target?.tagName,
            detail: event.detail,
          });
        });
      }

      const select = root.querySelector("#combo-events fig-dropdown select");
      select.value = "Roboto";
      select.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      return received;
    });

    expect(events).toEqual([
      {
        type: "input",
        target: "FIG-COMBO-INPUT",
        detail: { value: "Roboto" },
      },
      {
        type: "change",
        target: "FIG-COMBO-INPUT",
        detail: { value: "Roboto" },
      },
    ]);
  });
});

test.describe("field accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-button"),
        customElements.whenDefined("fig-field"),
        customElements.whenDefined("fig-input-fill"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-image"),
        customElements.whenDefined("fig-popup"),
      ]);
    });
  });

  test("fig-field associates labels with inner native controls or composite hosts", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-field id="text-field">
          <label>Name</label>
          <fig-input-text></fig-input-text>
        </fig-field>
        <fig-field id="image-field">
          <label>Preview</label>
          <fig-image alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="></fig-image>
        </fig-field>
      `;
    });
    await page.waitForTimeout(100);

    const textAssociation = await page.locator("#text-field").evaluate((field) => {
      const label = field.querySelector("label");
      const input = field.querySelector("fig-input-text input");
      return {
        labelId: label?.id || null,
        labelFor: label?.getAttribute("for"),
        inputId: input?.id || null,
        inputLabelledBy: input?.getAttribute("aria-labelledby"),
      };
    });

    expect(textAssociation.labelId).toBeTruthy();
    expect(textAssociation.inputId).toBeTruthy();
    expect(textAssociation.labelFor).toBe(textAssociation.inputId);
    expect(textAssociation.inputLabelledBy).toBe(textAssociation.labelId);

    const imageAssociation = await page.locator("#image-field").evaluate((field) => {
      const label = field.querySelector("label");
      const input = field.querySelector("fig-image");
      return {
        labelId: label?.id || null,
        labelFor: label?.getAttribute("for"),
        hostLabelledBy: input?.getAttribute("aria-labelledby"),
      };
    });

    expect(imageAssociation.labelId).toBeTruthy();
    expect(imageAssociation.labelFor).toBeNull();
    expect(imageAssociation.hostLabelledBy).toBe(imageAssociation.labelId);
  });

  test("fig-field reserves input space only for trailing icon buttons", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-field id="plain-field" style="width:320px">
          <label>Fill</label>
          <fig-input-fill value='{"type":"solid","color":"#667eea"}'></fig-input-fill>
        </fig-field>
        <fig-field id="primary-icon-field" style="width:320px">
          <label>Action</label>
          <fig-button icon aria-label="Action"><fig-icon name="add"></fig-icon></fig-button>
        </fig-field>
        <fig-field id="secondary-accessory-field" style="width:320px">
          <label>Fill</label>
          <fig-input-fill value='{"type":"solid","color":"#667eea"}'></fig-input-fill>
          <fig-button icon variant="secondary" aria-label="Action"><fig-icon name="add"></fig-icon></fig-button>
        </fig-field>
        <fig-field id="ghost-accessory-field" style="width:320px">
          <label>Fill</label>
          <fig-input-fill value='{"type":"solid","color":"#667eea"}'></fig-input-fill>
          <fig-button icon variant="ghost" aria-label="Action"><fig-icon name="add"></fig-icon></fig-button>
        </fig-field>
      `;
    });

    const layout = await page.evaluate(() => {
      const measure = (id: string) => {
        const field = document.querySelector(id);
        const input = field?.querySelector("fig-input-text, fig-input-fill");
        const button = field?.querySelector("fig-button");
        if (!field) throw new Error(`Missing ${id}`);
        const fieldStyle = getComputedStyle(field);
        const fieldBox = field.getBoundingClientRect();
        const labelBox = field.querySelector("label")?.getBoundingClientRect();
        const inputBox = input?.getBoundingClientRect();
        const buttonBox = button?.getBoundingClientRect();
        return {
          areas: fieldStyle.gridTemplateAreas,
          columns: fieldStyle.gridTemplateColumns
            .split(" ")
            .map((value) => parseFloat(value)),
          inputArea: input ? getComputedStyle(input).gridArea : null,
          buttonArea: button ? getComputedStyle(button).gridArea : null,
          labelWidth: labelBox?.width ?? null,
          inputLeft: inputBox?.left ?? null,
          gap:
            inputBox && buttonBox ? buttonBox.left - inputBox.right : null,
          rightPad: buttonBox ? fieldBox.right - buttonBox.right : null,
        };
      };
      return {
        plain: measure("#plain-field"),
        primaryIcon: measure("#primary-icon-field"),
        secondary: measure("#secondary-accessory-field"),
        ghost: measure("#ghost-accessory-field"),
      };
    });

    expect(layout.plain.areas).toBe('"chevron label input pad"');
    expect(layout.plain.inputArea).toBe("input");
    expect(layout.plain.columns).toHaveLength(4);
    expect(layout.plain.columns.at(-1)).toBeCloseTo(16, 5);
    expect(layout.primaryIcon.areas).toBe('"chevron label input pad"');
    expect(layout.primaryIcon.buttonArea).toBe("input");
    expect(layout.primaryIcon.columns).toHaveLength(4);
    expect(layout.primaryIcon.columns.at(-1)).toBeCloseTo(16, 5);
    expect(layout.secondary.areas).toBe('"chevron label input pad"');
    expect(layout.secondary.columns).toEqual(layout.plain.columns);
    expect(layout.secondary.inputArea).toBe("input");
    expect(layout.secondary.buttonArea).toBe("input");
    expect(layout.secondary.labelWidth).toBeCloseTo(
      layout.plain.labelWidth ?? 0,
      5,
    );
    expect(layout.secondary.inputLeft).toBeCloseTo(
      layout.plain.inputLeft ?? 0,
      5,
    );
    expect(layout.secondary.gap).toBeCloseTo(4, 5);
    expect(layout.secondary.rightPad).toBeCloseTo(16, 5);
    expect(layout.ghost.columns).toEqual(layout.plain.columns);
    expect(layout.ghost.buttonArea).toBe("input");
    expect(layout.ghost.labelWidth).toBeCloseTo(layout.plain.labelWidth ?? 0, 5);
    expect(layout.ghost.inputLeft).toBeCloseTo(layout.plain.inputLeft ?? 0, 5);
    expect(layout.ghost.gap).toBeCloseTo(4, 5);
    expect(layout.ghost.rightPad).toBeCloseTo(12, 5);
  });

  test("fig-field shows a tooltip for labels inserted after connection", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-field id="dynamic-label-field" style="width: 140px;">
          <fig-input-text></fig-input-text>
        </fig-field>
      `;
    });
    await page.waitForTimeout(50);

    await page.evaluate(() => {
      const field = document.querySelector("#dynamic-label-field");
      const input = field?.querySelector("fig-input-text");
      if (!field || !input) throw new Error("Missing dynamic field");
      const label = document.createElement("label");
      label.textContent = "A very long field label that should truncate";
      field.insertBefore(label, input);
    });

    const label = page.locator("#dynamic-label-field > label");
    await expect
      .poll(() =>
        label.evaluate((node) => node.scrollWidth > node.clientWidth),
      )
      .toBe(true);

    await label.hover();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
  });
});

test.describe("content layout", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("fig-content adds inline gutters only when padding is enabled", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-content id="content-default">Default</fig-content>
        <fig-content id="content-padded" padding>Padded</fig-content>
        <fig-content id="content-padding-false" padding="false">False</fig-content>
        <fig-content id="content-padding-none" padding="none">None</fig-content>
      `;
    });

    const padding = await page.evaluate(() => {
      const read = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        const style = getComputedStyle(element);
        return {
          top: style.paddingTop,
          left: style.paddingLeft,
          right: style.paddingRight,
        };
      };
      return {
        default: read("#content-default"),
        padded: read("#content-padded"),
        disabled: read("#content-padding-false"),
        none: read("#content-padding-none"),
      };
    });

    expect(padding.default).toEqual({ top: "12px", left: "0px", right: "0px" });
    expect(padding.padded).toEqual({ top: "12px", left: "16px", right: "16px" });
    expect(padding.disabled).toEqual({ top: "12px", left: "0px", right: "0px" });
    expect(padding.none).toEqual({ top: "0px", left: "0px", right: "0px" });
  });

  test("adjacent hstack fields compact only their shared gutters", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <hstack id="paired-fields" style="width:400px">
          <fig-field direction="vertical" style="flex:1"><label>First</label><fig-input-text full></fig-input-text></fig-field>
          <fig-field direction="vertical" style="flex:1"><label>Last</label><fig-input-text full></fig-input-text></fig-field>
        </hstack>
        <hstack id="mixed-fields" style="width:400px">
          <fig-field direction="vertical" style="flex:1"><label>First</label><fig-input-text full></fig-input-text></fig-field>
          <span>Between</span>
          <fig-field direction="vertical" style="flex:1"><label>Last</label><fig-input-text full></fig-input-text></fig-field>
        </hstack>
        <fig-field id="standalone-field" direction="vertical" style="width:200px">
          <label>Name</label><fig-input-text full></fig-input-text>
        </fig-field>
      `;
    });

    const gutters = await page.evaluate(() => {
      const columns = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return getComputedStyle(element).gridTemplateColumns
          .split(" ")
          .map((value) => parseFloat(value));
      };
      return {
        first: columns("#paired-fields > fig-field:first-child"),
        last: columns("#paired-fields > fig-field:last-child"),
        mixedFirst: columns("#mixed-fields > fig-field:first-child"),
        mixedLast: columns("#mixed-fields > fig-field:last-child"),
        standalone: columns("#standalone-field"),
        gap: getComputedStyle(
          document.querySelector("#paired-fields")!,
        ).columnGap,
      };
    });

    expect(gutters.first[0]).toBeCloseTo(16, 5);
    expect(gutters.first.at(-1)).toBeCloseTo(4, 5);
    expect(gutters.last[0]).toBeCloseTo(4, 5);
    expect(gutters.last.at(-1)).toBeCloseTo(16, 5);
    expect(gutters.gap).toBe("8px");
    expect(gutters.mixedFirst[0]).toBeCloseTo(16, 5);
    expect(gutters.mixedFirst.at(-1)).toBeCloseTo(16, 5);
    expect(gutters.mixedLast[0]).toBeCloseTo(16, 5);
    expect(gutters.mixedLast.at(-1)).toBeCloseTo(16, 5);
    expect(gutters.standalone[0]).toBeCloseTo(16, 5);
    expect(gutters.standalone.at(-1)).toBeCloseTo(16, 5);
  });
});

test.describe("slider accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-slider"),
        customElements.whenDefined("fig-input-number"),
      ]);
    });
  });

  test("fig-slider labels the keyboard-operable control", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider id="text-slider" value="50" min="0" max="100" units="%" aria-label="Opacity"></fig-slider>
        <fig-slider id="range-slider" text="false" value="12" min="0" max="24" aria-label="Frames"></fig-slider>
        <fig-slider id="default-range" aria-label="Default range"></fig-slider>
        <fig-slider id="custom-range" min="10" max="30" aria-label="Custom range"></fig-slider>
      `;
    });
    await page.waitForTimeout(100);

    const textSliderState = await page.locator("#text-slider").evaluate((host) => {
      const range = host.querySelector('input[type="range"]');
      const number = host.querySelector("fig-input-number input");
      return {
        rangeHidden: range?.getAttribute("aria-hidden"),
        rangeLabel: range?.getAttribute("aria-label"),
        numberLabel: number?.getAttribute("aria-label"),
        numberRole: number?.getAttribute("role"),
        numberValueText: number?.getAttribute("aria-valuetext"),
      };
    });

    expect(textSliderState).toEqual({
      rangeHidden: "true",
      rangeLabel: null,
      numberLabel: "Opacity",
      numberRole: "spinbutton",
      numberValueText: "50%",
    });

    await page.locator("#text-slider").evaluate((host) => {
      host.focus();
    });
    await expect
      .poll(() =>
        page.locator("#text-slider").evaluate((host) => {
          return host.querySelector("fig-input-number input") === document.activeElement;
        }),
      )
      .toBe(true);

    const rangeSliderState = await page.locator("#range-slider").evaluate((host) => {
      const range = host.querySelector('input[type="range"]');
      return {
        rangeHidden: range?.getAttribute("aria-hidden"),
        rangeLabel: range?.getAttribute("aria-label"),
        rangeValueNow: range?.getAttribute("aria-valuenow"),
      };
    });

    expect(rangeSliderState).toEqual({
      rangeHidden: null,
      rangeLabel: "Frames",
      rangeValueNow: "12",
    });

    const defaultRangeState = await page.locator("#default-range").evaluate((host) => {
      const range = host.querySelector('input[type="range"]');
      const number = host.querySelector("fig-input-number input");
      return {
        hostValue: host.getAttribute("value"),
        rangeValue: (range as HTMLInputElement | null)?.value,
        rangeValueNow: range?.getAttribute("aria-valuenow"),
        numberValue: (number as HTMLInputElement | null)?.value,
      };
    });
    expect(defaultRangeState).toEqual({
      hostValue: "50",
      rangeValue: "50",
      rangeValueNow: "50",
      numberValue: "50",
    });

    const customRangeState = await page.locator("#custom-range").evaluate((host) => {
      const range = host.querySelector('input[type="range"]');
      const number = host.querySelector("fig-input-number input");
      return {
        hostValue: host.getAttribute("value"),
        rangeValue: (range as HTMLInputElement | null)?.value,
        numberValue: (number as HTMLInputElement | null)?.value,
      };
    });
    expect(customRangeState).toEqual({
      hostValue: "20",
      rangeValue: "20",
      numberValue: "20",
    });
  });

  test("fig-slider text input updates the range value", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider id="slider" value="50" min="0" max="100" aria-label="Opacity"></fig-slider>
      `;
      const slider = root.querySelector("#slider");
      slider?.addEventListener("input", (event) => {
        slider.setAttribute(
          "data-last-input",
          String((event as CustomEvent).detail),
        );
      });
    });
    await page.waitForTimeout(100);

    await page.locator("#slider fig-input-number input").fill("75");

    await expect
      .poll(() =>
        page.locator("#slider").evaluate((host) => {
          const range = host.querySelector('input[type="range"]') as HTMLInputElement | null;
          const number = host.querySelector("fig-input-number");
          const numberInput = number?.querySelector("input") as HTMLInputElement | null;
          return {
            hostValue: host.getAttribute("value"),
            rangeValue: range?.value,
            numberValue: number?.getAttribute("value"),
            numberInputValue: numberInput?.value,
            lastInput: host.getAttribute("data-last-input"),
          };
        }),
      )
      .toEqual({
        hostValue: "75",
        rangeValue: "75",
        numberValue: "75",
        numberInputValue: "75",
        lastInput: "75",
      });
  });

  test("fig-slider types pass resolved values through to the number input", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const cases = [
        { type: "range", value: "42", fallback: "50", attrs: 'min="0" max="100"' },
        { type: "hue", value: "180", fallback: "0", attrs: 'min="0" max="360"' },
        { type: "delta", value: "0.08", fallback: "0.08", attrs: 'min="-2" max="2" default="0.08" step="0.01"' },
        { type: "stepper", value: "50", fallback: "0", attrs: 'min="0" max="100" step="25"' },
        { type: "opacity", value: "75", fallback: "0", attrs: 'min="0" max="100"' },
      ];
      root.innerHTML = cases
        .flatMap(({ type, value, attrs }) => [
          `<fig-slider id="${type}-valued" type="${type}" value="${value}" ${attrs} text="true"></fig-slider>`,
          `<fig-slider id="${type}-fallback" type="${type}" ${attrs} text="true"></fig-slider>`,
        ])
        .join("");

      const read = (id: string) => {
        const host = root.querySelector(`#${id}`) as HTMLElement | null;
        const number = host?.querySelector("fig-input-number") as
          | (HTMLElement & { value: string | number })
          | null;
        const input = number?.querySelector("input") as HTMLInputElement | null;
        return {
          hostValue: host?.getAttribute("value"),
          numberAttribute: number?.getAttribute("value"),
          inputValue: input?.value,
        };
      };

      return Object.fromEntries(
        cases.map(({ type, value, fallback }) => [
          type,
          {
            valued: read(`${type}-valued`),
            fallback: read(`${type}-fallback`),
            expectedValue: value,
            expectedFallback: fallback,
          },
        ]),
      );
    });

    for (const [type, result] of Object.entries(state)) {
      const typed = result as {
        valued: { hostValue: string; numberAttribute: string; inputValue: string };
        fallback: { hostValue: string; numberAttribute: string; inputValue: string };
        expectedValue: string;
        expectedFallback: string;
      };
      expect(typed.valued, type).toEqual({
        hostValue: typed.expectedValue,
        numberAttribute: typed.expectedValue,
        inputValue: typed.expectedValue,
      });
      expect(typed.fallback, type).toEqual({
        hostValue: typed.expectedFallback,
        numberAttribute: typed.expectedFallback,
        inputValue: typed.expectedFallback,
      });
    }
  });

  test("fig-slider ignores invalid defaults and keeps runtime defaults in range", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider id="delta-high" type="delta" default="200" min="-10" max="10"></fig-slider>
        <fig-slider id="delta-positive" type="delta" default="30" min="10" max="20"></fig-slider>
        <fig-slider id="delta-valid" type="delta" default="5" min="-10" max="10"></fig-slider>
        <fig-slider id="delta-invalid" type="delta" default="nope" min="-10" max="10"></fig-slider>
        <fig-slider id="stepper-off-step" type="stepper" value="40" default="35" min="0" max="100" step="10"></fig-slider>
        <fig-slider id="range-high" type="range" value="50" default="200" min="0" max="100"></fig-slider>
      `;
      await new Promise(requestAnimationFrame);

      type Slider = HTMLElement & { defaultValue: number };
      const read = (id: string) => {
        const slider = root.querySelector(`#${id}`) as Slider;
        const defaultOption = slider.querySelector("datalist option[default]");
        return {
          authoredDefault: slider.getAttribute("default"),
          resolvedDefault: slider.defaultValue,
          cssDefault: slider.style.getPropertyValue("--default"),
          defaultTick: defaultOption?.getAttribute("value") ?? null,
        };
      };

      const initial = Object.fromEntries(
        [
          "delta-high",
          "delta-positive",
          "delta-valid",
          "delta-invalid",
          "stepper-off-step",
          "range-high",
        ].map((id) => [id, read(id)]),
      );

      const dynamic = root.querySelector("#delta-valid") as Slider;
      const normalizationEvents: string[] = [];
      for (const type of ["input", "change"]) {
        dynamic.addEventListener(type, () => normalizationEvents.push(type));
      }
      dynamic.setAttribute("default", "20");
      const invalidDefault = read("delta-valid");
      dynamic.setAttribute("min", "8");
      const rangeExcludesZero = read("delta-valid");
      dynamic.setAttribute("max", "30");
      const expandedRange = read("delta-valid");

      const stepper = root.querySelector("#stepper-off-step") as Slider;
      stepper.setAttribute("default", "20");
      const validStep = read("stepper-off-step");
      stepper.setAttribute("step", "30");
      const invalidatedStep = read("stepper-off-step");

      return {
        initial,
        dynamic: {
          invalidDefault,
          rangeExcludesZero,
          expandedRange,
          validStep,
          invalidatedStep,
        },
        normalizationEvents,
      };
    });

    expect(state.initial).toEqual({
      "delta-high": {
        authoredDefault: "200",
        resolvedDefault: 0,
        cssDefault: "0.5",
        defaultTick: "0",
      },
      "delta-positive": {
        authoredDefault: "30",
        resolvedDefault: 10,
        cssDefault: "0",
        defaultTick: "10",
      },
      "delta-valid": {
        authoredDefault: "5",
        resolvedDefault: 5,
        cssDefault: "0.75",
        defaultTick: "5",
      },
      "delta-invalid": {
        authoredDefault: "nope",
        resolvedDefault: 0,
        cssDefault: "0.5",
        defaultTick: "0",
      },
      "stepper-off-step": {
        authoredDefault: "35",
        resolvedDefault: 0,
        cssDefault: "0",
        defaultTick: "0",
      },
      "range-high": {
        authoredDefault: "200",
        resolvedDefault: 0,
        cssDefault: "0",
        defaultTick: null,
      },
    });
    expect(state.dynamic).toEqual({
      invalidDefault: {
        authoredDefault: "20",
        resolvedDefault: 0,
        cssDefault: "0.5",
        defaultTick: "0",
      },
      rangeExcludesZero: {
        authoredDefault: "20",
        resolvedDefault: 8,
        cssDefault: "0",
        defaultTick: "8",
      },
      expandedRange: {
        authoredDefault: "20",
        resolvedDefault: 20,
        cssDefault: `${12 / 22}`,
        defaultTick: "20",
      },
      validStep: {
        authoredDefault: "20",
        resolvedDefault: 20,
        cssDefault: "0.2",
        defaultTick: "20",
      },
      invalidatedStep: {
        authoredDefault: "20",
        resolvedDefault: 0,
        cssDefault: "0",
        defaultTick: "0",
      },
    });
    expect(state.normalizationEvents).toEqual([]);
  });

  test("fig-slider range supports Shift arrow key stepping", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider id="slider" text="false" value="50" min="0" max="100" step="2" aria-label="Scale"></fig-slider>
      `;
    });
    await page.waitForTimeout(100);

    await page.locator("#slider input").focus();
    await page.keyboard.press("Shift+ArrowRight");

    const state = await page.locator("#slider").evaluate((host) => {
      const range = host.querySelector('input[type="range"]') as HTMLInputElement | null;
      return {
        hostValue: host.getAttribute("value"),
        rangeValue: range?.value,
        rangeValueNow: range?.getAttribute("aria-valuenow"),
      };
    });

    expect(state).toEqual({
      hostValue: "70",
      rangeValue: "70",
      rangeValueNow: "70",
    });
  });

  test("fig-slider survives reconnect without duplicate controls", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-slider
          id="slider-reconnect"
          value="50"
          min="0"
          max="100"
          units="%"
          aria-label="Opacity"
        ></fig-slider>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#slider-reconnect").evaluate((host) => {
        const range = host.querySelector('input[type="range"]') as HTMLInputElement | null;
        const number = host.querySelector("fig-input-number");
        return {
          rangeCount: host.querySelectorAll('input[type="range"]').length,
          numberCount: host.querySelectorAll("fig-input-number").length,
          hostValue: host.getAttribute("value"),
          rangeValue: range?.value ?? null,
          numberValue: number?.getAttribute("value") ?? null,
        };
      });

    expect(await getState()).toEqual({
      rangeCount: 1,
      numberCount: 1,
      hostValue: "50",
      rangeValue: "50",
      numberValue: "50",
    });

    await page.evaluate(() => {
      const host = document.querySelector("#slider-reconnect");
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error("Missing slider host");
      parent.removeChild(host);
      parent.appendChild(host);
    });
    await page.waitForTimeout(50);

    expect(await getState()).toEqual({
      rangeCount: 1,
      numberCount: 1,
      hostValue: "50",
      rangeValue: "50",
      numberValue: "50",
    });
  });
});

test.describe("reconnect resilience", () => {
  const reconnect = async (page: import("@playwright/test").Page, selector: string) => {
    await page.evaluate((sel) => {
      const host = document.querySelector(sel);
      const parent = host?.parentElement;
      if (!host || !parent) throw new Error(`Missing ${sel}`);
      parent.removeChild(host);
      parent.appendChild(host);
    }, selector);
    await page.waitForTimeout(50);
  };

  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("fig-options keeps a single segmented control on reconnect", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-options id="options-reconnect" options="One,Two,Three" value="Two"></fig-options>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#options-reconnect").evaluate((host) => ({
        controlCount: host.querySelectorAll(
          ":scope > fig-segmented-control, :scope > fig-dropdown",
        ).length,
        value: host.getAttribute("value"),
        segmentCount: host.querySelectorAll("fig-segment").length,
      }));

    expect(await getState()).toEqual({
      controlCount: 1,
      value: "Two",
      segmentCount: 3,
    });

    await reconnect(page, "#options-reconnect");

    expect(await getState()).toEqual({
      controlCount: 1,
      value: "Two",
      segmentCount: 3,
    });
  });

  test("fig-combo-input keeps a single combo on reconnect", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-combo-input
          id="combo-reconnect"
          options="Alpha,Beta"
          value="Beta"
          placeholder="Type..."
        ></fig-combo-input>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#combo-reconnect").evaluate((host) => ({
        comboCount: host.querySelectorAll(":scope > .input-combo").length,
        textCount: host.querySelectorAll("fig-input-text").length,
        dropdownCount: host.querySelectorAll("fig-dropdown").length,
        value: host.getAttribute("value"),
        inputValue: host.querySelector("fig-input-text")?.getAttribute("value"),
      }));

    expect(await getState()).toEqual({
      comboCount: 1,
      textCount: 1,
      dropdownCount: 1,
      value: "Beta",
      inputValue: "Beta",
    });

    await reconnect(page, "#combo-reconnect");

    expect(await getState()).toEqual({
      comboCount: 1,
      textCount: 1,
      dropdownCount: 1,
      value: "Beta",
      inputValue: "Beta",
    });
  });

  test("fig-3d-rotate keeps axis fields at control height", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-3d-rotate
          id="rotate-fields"
          value="rotateX(0deg) rotateY(0deg) rotateZ(0deg)"
          fields="rotateX,rotateY,rotateZ"
          style="width:180px"
        ></fig-3d-rotate>
      `;
    });

    const heights = await page
      .locator("#rotate-fields > fig-input-number")
      .evaluateAll((inputs) =>
        inputs.map((input) => input.getBoundingClientRect().height),
      );

    expect(heights).toEqual([24, 24, 24]);
  });

  test("fig-origin-grid keeps a single handle on reconnect", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-origin-grid id="origin-reconnect" value="50% 50%" fields></fig-origin-grid>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#origin-reconnect").evaluate((host) => ({
        surfaceCount: host.querySelectorAll(".fig-origin-grid-surface").length,
        handleCount: host.querySelectorAll("fig-handle").length,
        value: host.getAttribute("value"),
      }));

    expect(await getState()).toEqual({
      surfaceCount: 1,
      handleCount: 1,
      value: "50% 50%",
    });

    await reconnect(page, "#origin-reconnect");

    expect(await getState()).toEqual({
      surfaceCount: 1,
      handleCount: 1,
      value: "50% 50%",
    });
  });

  test("fig-origin-grid fields share the available width equally", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-origin-grid id="origin-fields" value="50% 50%" fields style="width:240px"></fig-origin-grid>
      `;
    });

    const layout = await page.locator("#origin-fields").evaluate((host) => {
      const values = host.querySelector(".origin-values");
      const inputs = Array.from(
        host.querySelectorAll("fig-input-number"),
      );
      if (!values || inputs.length !== 2) {
        throw new Error("Missing origin value inputs");
      }
      const valuesBox = values.getBoundingClientRect();
      const [xBox, yBox] = inputs.map((input) =>
        input.getBoundingClientRect(),
      );
      return {
        containerLeft: valuesBox.left,
        containerRight: valuesBox.right,
        xLeft: xBox.left,
        xRight: xBox.right,
        xWidth: xBox.width,
        yLeft: yBox.left,
        yRight: yBox.right,
        yWidth: yBox.width,
      };
    });

    expect(layout.xWidth).toBeCloseTo(layout.yWidth, 5);
    expect(layout.xLeft).toBeCloseTo(layout.containerLeft, 5);
    expect(layout.yRight).toBeCloseTo(layout.containerRight, 5);
    expect(layout.yLeft - layout.xRight).toBeCloseTo(8, 5);
  });

  test("fig-joystick keeps a single plane on reconnect", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-joystick id="joystick-reconnect" value="50% 50%"></fig-joystick>
      `;
    });
    await page.waitForTimeout(100);

    const getState = () =>
      page.locator("#joystick-reconnect").evaluate((host) => ({
        planeCount: host.querySelectorAll(".fig-input-joystick-plane").length,
        handleCount: host.querySelectorAll("fig-handle").length,
        value: host.getAttribute("value"),
      }));

    expect(await getState()).toEqual({
      planeCount: 1,
      handleCount: 1,
      value: "50% 50%",
    });

    await reconnect(page, "#joystick-reconnect");
    await page.waitForTimeout(50);

    expect(await getState()).toEqual({
      planeCount: 1,
      handleCount: 1,
      value: "50% 50%",
    });
  });

  test("fig-input-color strips hash from hex text display", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<fig-input-color id="color-hex-display" value="#000000" text="true" full></fig-input-color>';
    });
    await page.waitForTimeout(50);

    const getHexDisplay = () =>
      page
        .locator("#color-hex-display fig-input-text input")
        .evaluate((input) => input.value);

    expect(await getHexDisplay()).toBe("000000");

    await page.locator("#color-hex-display").evaluate((host) => {
      host.setAttribute("value", "#FF0000");
    });

    expect(await getHexDisplay()).toBe("FF0000");
  });

  test("fig-input-color keeps a single combo on reconnect", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-color id="color-reconnect" value="#ff0000"></fig-input-color>
      `;
    });
    await page.waitForTimeout(50);

    const getState = () =>
      page.locator("#color-reconnect").evaluate((host) => ({
        comboCount: host.querySelectorAll(":scope > .input-combo").length,
        swatchCount: host.querySelectorAll("fig-swatch").length,
        textCount: host.querySelectorAll("fig-input-text").length,
        value: host.getAttribute("value"),
      }));

    expect(await getState()).toEqual({
      comboCount: 1,
      swatchCount: 1,
      textCount: 1,
      value: "#ff0000",
    });

    await reconnect(page, "#color-reconnect");

    expect(await getState()).toEqual({
      comboCount: 1,
      swatchCount: 1,
      textCount: 1,
      value: "#ff0000",
    });
  });

  test("fig-chit remains a backwards-compatible fig-swatch alias", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-swatch background="#14AE5C" alpha="0.5" size="large" selected></fig-swatch>
        <fig-chit background="#14AE5C" alpha="0.5" size="large" selected></fig-chit>
      `;
      const swatch = root.querySelector("fig-swatch");
      const chit = root.querySelector("fig-chit");
      const Swatch = customElements.get("fig-swatch");
      if (!swatch || !chit || !Swatch) throw new Error("Missing swatch aliases");
      const signature = (element: Element) => {
        const style = getComputedStyle(element);
        return {
          display: style.display,
          width: style.width,
          height: style.height,
          background: style.getPropertyValue("--swatch-background").trim(),
          alpha: style.getPropertyValue("--alpha").trim(),
          dataType: element.getAttribute("data-type"),
          childTags: Array.from(element.children).map((child) => child.tagName),
        };
      };
      return {
        chitIsSwatch: chit instanceof Swatch,
        swatch: signature(swatch),
        chit: signature(chit),
      };
    });

    expect(state.chitIsSwatch).toBe(true);
    expect(state.chit).toEqual(state.swatch);
  });

  test("fig-preview defaults and updates its aspect ratio", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = '<fig-preview id="ratio-preview"></fig-preview>';
    });

    const preview = page.locator("#ratio-preview");
    await expect
      .poll(() =>
        preview.evaluate((element) => getComputedStyle(element).aspectRatio),
      )
      .toBe("4 / 3");

    await preview.evaluate((element) =>
      element.setAttribute("aspect-ratio", "16/9"),
    );
    await expect
      .poll(() =>
        preview.evaluate((element) => getComputedStyle(element).aspectRatio),
      )
      .toBe("16 / 9");
  });

  test("fig-card large size increases generated and authored padding", async ({
    page,
  }) => {
    const padding = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      root.innerHTML = `
        <fig-card id="generated-default" src="${src}" label="Default"></fig-card>
        <fig-card id="generated-large" src="${src}" label="Large" size="large"></fig-card>
        <fig-card id="authored-default" label="Default"><fig-preview></fig-preview></fig-card>
        <fig-card id="authored-large" label="Large" size="large"><fig-preview></fig-preview></fig-card>
      `;
      await new Promise(requestAnimationFrame);
      const readPadding = (id: string) => {
        const card = document.querySelector(`#${id}`);
        return card ? getComputedStyle(card).padding : null;
      };
      const readFooterMarginTop = (id: string) => {
        const card = document.querySelector(`#${id}`);
        const footer = card?.querySelector("fig-footer[data-generated]");
        return footer ? getComputedStyle(footer).marginTop : null;
      };
      return {
        generatedDefault: readPadding("generated-default"),
        generatedLarge: readPadding("generated-large"),
        authoredDefault: readPadding("authored-default"),
        authoredLarge: readPadding("authored-large"),
        footerMarginDefault: readFooterMarginTop("generated-default"),
        footerMarginLarge: readFooterMarginTop("generated-large"),
        authoredFooterMarginDefault: readFooterMarginTop("authored-default"),
        authoredFooterMarginLarge: readFooterMarginTop("authored-large"),
      };
    });

    expect(padding).toEqual({
      generatedDefault: "4px",
      generatedLarge: "8px",
      authoredDefault: "4px",
      authoredLarge: "8px",
      footerMarginDefault: "0px",
      footerMarginLarge: "4px",
      authoredFooterMarginDefault: "0px",
      authoredFooterMarginLarge: "4px",
    });
  });

  test("fig-card preserves authored media as direct children without src", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const results = [];

      for (const tag of ["fig-media", "fig-preview", "fig-image"]) {
        const card = document.createElement("fig-card");
        card.setAttribute("label", tag);
        root.appendChild(card);

        const media = document.createElement(tag);
        media.setAttribute("data-authored-test", tag);
        card.appendChild(media);
        const control = document.createElement("button");
        control.textContent = "Custom control";
        card.appendChild(control);
        await new Promise(requestAnimationFrame);

        const directFooter = card.querySelector(
          ":scope > fig-footer[data-generated]",
        );
        results.push({
          tag,
          sameNode:
            card.querySelector(`[data-authored-test="${tag}"]`) === media,
          parentIsCard: media.parentElement === card,
          controlParentIsCard: control.parentElement === card,
          generatedImages: card.querySelectorAll(
            "fig-image[data-generated]",
          ).length,
          wrappers: card.querySelectorAll(".fig-card-link, .fig-card-media")
            .length,
          directLabel: Boolean(
            directFooter?.querySelector(
              ":scope > .fig-card-label[data-generated]",
            ),
          ),
          labelTag: directFooter?.querySelector(".fig-card-label")?.tagName,
          footerTag: directFooter?.tagName,
          labelIsLast: card.lastElementChild === directFooter,
          directMedia: card.querySelectorAll(
            ":scope > fig-media, :scope > fig-preview, :scope > fig-image",
          ).length,
        });
      }

      return results;
    });

    expect(state).toEqual([
      {
        tag: "fig-media",
        sameNode: true,
        parentIsCard: true,
        controlParentIsCard: true,
        generatedImages: 0,
        wrappers: 0,
        directLabel: true,
        labelTag: "LABEL",
        footerTag: "FIG-FOOTER",
        labelIsLast: true,
        directMedia: 1,
      },
      {
        tag: "fig-preview",
        sameNode: true,
        parentIsCard: true,
        controlParentIsCard: true,
        generatedImages: 0,
        wrappers: 0,
        directLabel: true,
        labelTag: "LABEL",
        footerTag: "FIG-FOOTER",
        labelIsLast: true,
        directMedia: 1,
      },
      {
        tag: "fig-image",
        sameNode: true,
        parentIsCard: true,
        controlParentIsCard: true,
        generatedImages: 0,
        wrappers: 0,
        directLabel: true,
        labelTag: "LABEL",
        footerTag: "FIG-FOOTER",
        labelIsLast: true,
        directMedia: 1,
      },
    ]);
  });

  test("fig-card generates direct media and ignores legacy link attributes", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-card
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          label="Generated card"
          sublabel="Generated details"
          href="#legacy"
          target="_blank"
        ></fig-card>
      `;
      await new Promise(requestAnimationFrame);
      const card = root.querySelector("fig-card")!;
      const staleWrapper = document.createElement("div");
      staleWrapper.className = "fig-card-link";
      while (card.firstChild) staleWrapper.appendChild(card.firstChild);
      card.appendChild(staleWrapper);
      card.remove();
      root.appendChild(card);
      await new Promise(requestAnimationFrame);

      const image = card.querySelector(
        ":scope > fig-image[data-generated]",
      );
      const footer = card.querySelector(
        ":scope > fig-footer[data-generated]",
      );
      return {
        anchors: card.querySelectorAll("a").length,
        linkWrappers: card.querySelectorAll(".fig-card-link").length,
        mediaWrappers: card.querySelectorAll(".fig-card-media").length,
        observesHref: (
          customElements.get("fig-card") as
            | (CustomElementConstructor & { observedAttributes?: string[] })
            | undefined
        )?.observedAttributes?.includes("href"),
        observesTarget: (
          customElements.get("fig-card") as
            | (CustomElementConstructor & { observedAttributes?: string[] })
            | undefined
        )?.observedAttributes?.includes("target"),
        imageIsDirect: image?.parentElement === card,
        footerIsDirect: footer?.parentElement === card,
        footerTag: footer?.tagName,
        labelTag: footer?.querySelector(".fig-card-label")?.tagName,
        sublabelTag: footer?.querySelector(".fig-card-sublabel")?.tagName,
        footerPadding: footer ? getComputedStyle(footer).padding : null,
        footerBoxShadow: footer ? getComputedStyle(footer).boxShadow : null,
        gap: getComputedStyle(card).gap,
      };
    });

    expect(state).toEqual({
      anchors: 0,
      linkWrappers: 0,
      mediaWrappers: 0,
      observesHref: false,
      observesTarget: false,
      imageIsDirect: true,
      footerIsDirect: true,
      footerTag: "FIG-FOOTER",
      labelTag: "LABEL",
      sublabelTag: "LABEL",
      footerPadding: "0px",
      footerBoxShadow: "none",
      gap: "4px",
    });
  });

  test("fig-card truncates long sublabels with an ellipsis", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-card
          style="width: 10rem"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          label="Shader pill"
          sublabel="Generative tools/effects very long label"
        ></fig-card>
      `;
      await new Promise(requestAnimationFrame);
      const sublabel = root.querySelector(".fig-card-sublabel");
      if (!sublabel) throw new Error("Missing fig-card sublabel");
      const style = getComputedStyle(sublabel);
      return {
        display: style.display,
        overflow: style.overflow,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
        isTruncated: sublabel.scrollWidth > sublabel.clientWidth,
      };
    });

    expect(state).toEqual({
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      isTruncated: true,
    });
  });

  test("fig-card centers loading spinners in images and previews", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-card
          id="image-card"
          style="width: 10rem"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          label="Loading"
        ></fig-card>
        <fig-card id="preview-card" style="width: 10rem">
          <fig-preview aspect-ratio="1/1">
            <fig-spinner></fig-spinner>
          </fig-preview>
        </fig-card>
      `;
      await new Promise(requestAnimationFrame);

      const image = root.querySelector("#image-card fig-image");
      const imagePreview = image?.querySelector("fig-preview");
      if (!image || !imagePreview) throw new Error("Missing generated fig-image");
      const imageSpinner = document.createElement("fig-spinner");
      imageSpinner.setAttribute("slot", "overlay");
      imageSpinner.setAttribute("data-loading-indicator", "");
      imageSpinner.setAttribute("data-generated", "");
      image.append(imageSpinner);
      await new Promise(requestAnimationFrame);

      const preview = root.querySelector("#preview-card > fig-preview");
      const previewSpinner = preview?.querySelector("fig-spinner");
      if (!preview || !previewSpinner) throw new Error("Missing authored preview");

      const centered = (container: Element, spinner: Element) => {
        const containerBox = container.getBoundingClientRect();
        const spinnerBox = spinner.getBoundingClientRect();
        return {
          x: Math.abs(
            spinnerBox.left +
              spinnerBox.width / 2 -
              (containerBox.left + containerBox.width / 2),
          ),
          y: Math.abs(
            spinnerBox.top +
              spinnerBox.height / 2 -
              (containerBox.top + containerBox.height / 2),
          ),
        };
      };

      return {
        imageDisplay: getComputedStyle(image).display,
        previewDisplay: getComputedStyle(preview).display,
        imageCenter: centered(imagePreview, imageSpinner),
        previewCenter: centered(preview, previewSpinner),
      };
    });

    expect(state.imageDisplay).toBe("grid");
    expect(state.previewDisplay).toBe("grid");
    expect(state.imageCenter.x).toBeLessThanOrEqual(0.5);
    expect(state.imageCenter.y).toBeLessThanOrEqual(0.5);
    expect(state.previewCenter.x).toBeLessThanOrEqual(0.5);
    expect(state.previewCenter.y).toBeLessThanOrEqual(0.5);
  });

  test("fig-card preserves an authored footer without generating labels", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-card id="custom-card">
          <fig-preview></fig-preview>
          <fig-footer id="custom-footer"><label>Authored label</label></fig-footer>
        </fig-card>
      `;
      await new Promise(requestAnimationFrame);

      const card = root.querySelector("#custom-card")!;
      const footer = root.querySelector("#custom-footer")!;
      const style = getComputedStyle(footer);
      return {
        footerPreserved: card.querySelector("#custom-footer") === footer,
        footerIsDirect: footer.parentElement === card,
        generatedFooters: card.querySelectorAll(
          "fig-footer[data-generated]",
        ).length,
        generatedLabels: card.querySelectorAll(
          ".fig-card-label[data-generated], .fig-card-sublabel[data-generated]",
        ).length,
        padding: style.padding,
        boxShadow: style.boxShadow,
      };
    });

    expect(state).toEqual({
      footerPreserved: true,
      footerIsDirect: true,
      generatedFooters: 0,
      generatedLabels: 0,
      padding: "0px",
      boxShadow: "none",
    });
  });

  test("color tips, handles, and gradient adapters share alpha aliases", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-color-tip id="tip" value="#0D99FF"></fig-color-tip>
        <fig-handle id="handle" type="color" tip="color" color="#0D99FF"></fig-handle>
        <fig-input-gradient
          id="gradient"
          value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}'
        ></fig-input-gradient>
      `;
      await new Promise(requestAnimationFrame);

      const tip = root.querySelector("#tip")!;
      const tipEvents: unknown[] = [];
      tip.addEventListener("input", (event) => {
        tipEvents.push((event as CustomEvent).detail);
      });
      tip.querySelector("fig-swatch")?.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: { color: "#112233", alpha: 0.35 },
        }),
      );

      const handle = root.querySelector("#handle")!;
      const handleEvents: unknown[] = [];
      handle.addEventListener("input", (event) => {
        handleEvents.push((event as CustomEvent).detail);
      });
      handle.querySelector("fig-color-tip")?.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: { color: "#445566", alpha: 0.35 },
        }),
      );

      const gradient = root.querySelector("#gradient")!;
      let gradientDetail: unknown;
      gradient.addEventListener("input", (event) => {
        gradientDetail = (event as CustomEvent).detail;
      });
      gradient.querySelector("fig-handle")?.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: { color: "#778899", alpha: 0.35 },
        }),
      );

      return { tipEvents, handleEvents, gradientDetail };
    });

    expect(state.tipEvents).toEqual([
      { color: "#112233", alpha: 0.35, opacity: 35 },
    ]);
    expect(state.handleEvents).toEqual([
      { color: "#445566", opacity: 35, alpha: 0.35 },
    ]);
    expect(state.gradientDetail).toMatchObject({
      gradient: {
        stops: [
          { color: "#778899", opacity: 35 },
          { color: "#14AE5C", opacity: 100 },
        ],
      },
    });
  });
});

test.describe("render timing composition", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-field"),
        customElements.whenDefined("fig-group"),
        customElements.whenDefined("fig-input-number"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-slider"),
      ]);
    });
  });

  test("preserves composed children during synchronous setup", async ({ page }) => {
    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-text id="text">
          <span id="text-prepend" slot="prepend">T</span>
          <button id="text-append" slot="append" type="button">Clear</button>
        </fig-input-text>
        <fig-input-number id="number" value="12" units="px" steppers>
          <span id="number-prepend" slot="prepend">N</span>
          <span id="number-append" slot="append">px</span>
        </fig-input-number>
        <fig-slider id="slider" text="false" value="5" min="0" max="10">
          <datalist id="slider-ticks">
            <option value="0"></option>
            <option value="5"></option>
          </datalist>
        </fig-slider>
        <fig-field id="field">
          <label>Name</label>
          <fig-input-text id="field-input"></fig-input-text>
        </fig-field>
        <fig-group id="group" name="Group" collapsible>
          <p id="group-body">Body</p>
        </fig-group>
      `;

      const text = document.querySelector("#text");
      const number = document.querySelector("#number");
      const slider = document.querySelector("#slider");
      const field = document.querySelector("#field");
      const group = document.querySelector("#group");
      const fieldLabel = field?.querySelector("label");
      const fieldNativeInput = field?.querySelector("fig-input-text input");
      const sliderInput = slider?.querySelector('input[type="range"]');
      const sliderDatalist = slider?.querySelector("datalist");

      return {
        textChildren: Array.from(text?.children ?? []).map((child) => child.id || child.tagName.toLowerCase()),
        numberChildren: Array.from(number?.children ?? []).map((child) => child.id || child.tagName.toLowerCase()),
        textInputReady: !!text?.querySelector("input"),
        numberInputReady: !!number?.querySelector("input"),
        numberSteppersReady: !!number?.querySelector(".fig-steppers"),
        sliderInputReady: !!sliderInput,
        sliderList: sliderInput?.getAttribute("list"),
        sliderDatalistParent: sliderDatalist?.parentElement?.className,
        fieldLabelFor: fieldLabel?.getAttribute("for"),
        fieldInputId: fieldNativeInput?.id || null,
        fieldInputLabelledBy: fieldNativeInput?.getAttribute("aria-labelledby"),
        fieldLabelId: fieldLabel?.id || null,
        groupHeaderReady: !!group?.querySelector(":scope > fig-header h3 .fig-group-chevron"),
        groupBodyStillProjected: group?.querySelector("#group-body")?.parentElement?.id,
      };
    });

    expect(state.textChildren).toEqual(["text-prepend", "input", "text-append"]);
    expect(state.numberChildren).toEqual([
      "number-prepend",
      "input",
      "number-append",
      "span",
    ]);
    expect(state.textInputReady).toBe(true);
    expect(state.numberInputReady).toBe(true);
    expect(state.numberSteppersReady).toBe(true);
    expect(state.sliderInputReady).toBe(true);
    expect(state.sliderList).toBe("slider-ticks");
    expect(state.sliderDatalistParent).toContain("fig-slider-input-container");
    expect(state.fieldLabelFor).toBe(state.fieldInputId);
    expect(state.fieldInputLabelledBy).toBe(state.fieldLabelId);
    expect(state.groupHeaderReady).toBe(true);
    expect(state.groupBodyStillProjected).toBe("group");
  });

  test("fig-group applies tokenized focus outline to collapsible header", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-group id="group" name="Advanced" collapsible>
          <p>Body</p>
        </fig-group>
      `;
    });
    await page.waitForTimeout(100);

    const group = page.locator("#group");
    const header = page.locator("#group > fig-header");
    const headingId = await page.locator("#group > fig-header h3").getAttribute("id");
    expect(headingId).toBeTruthy();
    await expect(group).toHaveAttribute("role", "group");
    await expect(group).toHaveAttribute("aria-labelledby", headingId || "");
    await expect(page.getByRole("group", { name: "Advanced" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Advanced" })).toHaveCount(1);
    await expect(header).toHaveAttribute("role", "button");
    await expect(header).toHaveAttribute("tabindex", "0");
    await expect(header).toHaveAttribute("aria-expanded", "false");

    await header.focus();
    const focusStyle = await header.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        focusOutlineRadius: style.getPropertyValue("--figma-focus-outline-radius").trim(),
        borderRadius: style.borderRadius,
      };
    });
    expect(focusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "-1px",
      focusOutlineRadius: "0.3125rem",
      borderRadius: "5px",
    });

    await page.keyboard.press("Enter");
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(group).toHaveAttribute("open", "true");
  });
});

test.describe("color input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-input-color"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-input-number"),
      ]);
    });
  });

  test("fig-input-color labels generated hex and opacity controls", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="color-hint">Use hex and opacity values.</p>
        <fig-input-color
          id="color"
          value="#0D99FF"
          aria-label="Fill"
          aria-describedby="color-hint"
          aria-required="true"
        ></fig-input-color>
      `;
    });
    await page.waitForTimeout(150);

    const state = () =>
      page.locator("#color").evaluate((host) => {
        const hex = host.querySelector("fig-input-text input");
        const alpha = host.querySelector("fig-input-number input");
        return {
          role: host.getAttribute("role"),
          hostDisabled: host.getAttribute("aria-disabled"),
          hexLabel: hex?.getAttribute("aria-label"),
          hexDescribedBy: hex?.getAttribute("aria-describedby"),
          hexRequired: hex?.getAttribute("aria-required"),
          alphaLabel: alpha?.getAttribute("aria-label"),
          alphaDescribedBy: alpha?.getAttribute("aria-describedby"),
          alphaRequired: alpha?.getAttribute("aria-required"),
          alphaValueText: alpha?.getAttribute("aria-valuetext"),
          hexDisabled: (hex as HTMLInputElement | null)?.disabled,
          alphaDisabled: (alpha as HTMLInputElement | null)?.disabled,
        };
      });

    await expect.poll(state).toEqual({
      role: "group",
      hostDisabled: null,
      hexLabel: "Fill hex color",
      hexDescribedBy: "color-hint",
      hexRequired: "true",
      alphaLabel: "Fill opacity",
      alphaDescribedBy: "color-hint",
      alphaRequired: "true",
      alphaValueText: "100%",
      hexDisabled: false,
      alphaDisabled: false,
    });

    await page.locator("#color fig-input-text input").focus();
    const hexFocusStyles = await page.locator("#color").evaluate((host) => {
      const hexHost = host.querySelector("fig-input-text");
      const hostStyle = getComputedStyle(host);
      const hexStyle = hexHost ? getComputedStyle(hexHost) : null;
      return {
        hostOutlineStyle: hostStyle.outlineStyle,
        hexOutlineStyle: hexStyle?.outlineStyle,
      };
    });
    expect(hexFocusStyles).toEqual({
      hostOutlineStyle: "solid",
      hexOutlineStyle: "none",
    });

    await page.locator("#color fig-input-number input").focus();
    const opacityFocusStyles = await page.locator("#color").evaluate((host) => {
      const opacityHost = host.querySelector("fig-input-number");
      const hostStyle = getComputedStyle(host);
      const opacityStyle = opacityHost ? getComputedStyle(opacityHost) : null;
      return {
        hostOutlineStyle: hostStyle.outlineStyle,
        opacityOutlineStyle: opacityStyle?.outlineStyle,
        opacityBoxShadow: opacityStyle?.boxShadow,
      };
    });
    expect(opacityFocusStyles.hostOutlineStyle).toBe("solid");
    expect(opacityFocusStyles.opacityOutlineStyle).toBe("none");
    expect(opacityFocusStyles.opacityBoxShadow).not.toBe("none");

    await page.locator("#color").evaluate((host) => {
      host.setAttribute("aria-label", "Stroke");
      host.setAttribute("disabled", "");
    });

    await expect.poll(state).toEqual({
      role: "group",
      hostDisabled: "true",
      hexLabel: "Stroke hex color",
      hexDescribedBy: "color-hint",
      hexRequired: "true",
      alphaLabel: "Stroke opacity",
      alphaDescribedBy: "color-hint",
      alphaRequired: "true",
      alphaValueText: "100%",
      hexDisabled: true,
      alphaDisabled: true,
    });
  });
});

test.describe("gradient picker availability", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(() =>
      customElements.whenDefined("fig-input-gradient"),
    );
  });

  test("upgrades picker edit mode when fig-fill-picker registers later", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-gradient
          id="late-gradient"
          edit="picker"
          value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}'
        ></fig-input-gradient>
      `;
    });

    const gradient = page.locator("#late-gradient");
    await expect(gradient.locator("fig-fill-picker")).toHaveCount(0);

    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() => customElements.whenDefined("fig-fill-picker"));
    await expect(gradient.locator('fig-fill-picker[mode="gradient"]')).toHaveCount(
      1,
    );

    await gradient.locator("fig-swatch").click();
    const dialog = page.locator("dialog.fig-fill-picker-dialog");
    await expect(dialog).toHaveAttribute("open", "true");
    await expect(dialog.locator('[data-tab="gradient"]')).toBeVisible();
    await expect(dialog.locator('[data-tab="solid"]')).toHaveCount(0);
  });
});

test.describe("fill picker accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-fill-picker"),
        customElements.whenDefined("fig-input-gradient"),
        customElements.whenDefined("fig-swatch"),
        customElements.whenDefined("fig-button"),
        customElements.whenDefined("fig-select"),
        customElements.whenDefined("fig-slider"),
        customElements.whenDefined("fig-handle"),
      ]);
    });
  });

  test("names trigger swatches and generated dialog controls", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-fill-picker
          id="picker"
          mode="solid,gradient"
          aria-label="Layer fill"
          value='{"type":"solid","color":"#0D99FF"}'
        >
          <fig-chit background="#0D99FF"></fig-chit>
        </fig-fill-picker>
      `;
    });
    await page.waitForTimeout(100);

    await expect(page.locator("#picker fig-chit")).toHaveAttribute(
      "aria-label",
      "Open Layer fill",
    );
    await page.locator("#picker fig-chit").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog.fig-fill-picker-dialog")).toHaveAttribute(
      "open",
      "true",
    );

    const state = await page.evaluate(() => {
      const dialog = document.querySelector("dialog.fig-fill-picker-dialog");
      const closeButton = dialog?.querySelector(".fig-fill-picker-close");
      const nativeClose = closeButton?.shadowRoot?.querySelector("button");
      const eyedropper = dialog?.querySelector(".fig-fill-picker-eyedropper");
      const nativeEyedropper = eyedropper?.shadowRoot?.querySelector("button");
      const fillType = dialog?.querySelector(".fig-fill-picker-type");
      const fillTypeTrigger = fillType?.shadowRoot?.querySelector("fig-button");
      const handle = dialog?.querySelector("fig-handle");
      const hue = dialog?.querySelector('fig-slider[type="hue"] input[type="range"]');
      const opacity = dialog?.querySelector(
        'fig-slider[type="opacity"] input[type="range"]',
      );
      return {
        closeLabel: nativeClose?.getAttribute("aria-label"),
        eyedropperLabel: nativeEyedropper?.getAttribute("aria-label"),
        fillTypeLabel: fillTypeTrigger?.getAttribute("aria-label"),
        handleLabel: handle?.getAttribute("aria-label"),
        hueLabel: hue?.getAttribute("aria-label"),
        opacityLabel: opacity?.getAttribute("aria-label"),
      };
    });

    expect(state).toEqual({
      closeLabel: "Close fill picker",
      eyedropperLabel: "Sample color",
      fillTypeLabel: "Fill type",
      handleLabel: "Color saturation and brightness",
      hueLabel: "Hue",
      opacityLabel: "Opacity",
    });
  });

  test("fig-input-gradient picker mode opens fill picker on Enter", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-gradient
          id="gradient"
          edit="picker"
          value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}'
        ></fig-input-gradient>
      `;
    });
    await page.waitForTimeout(100);

    const gradient = page.locator("#gradient");
    await expect(gradient).toHaveAttribute("tabindex", "0");
    await gradient.evaluate((host) => host.focus());
    await expect(gradient).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("dialog.fig-fill-picker-dialog")).toHaveAttribute(
      "open",
      "true",
    );
  });
});

test.describe("remaining accessibility contracts", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-tabs"),
        customElements.whenDefined("fig-segmented-control"),
        customElements.whenDefined("fig-chooser"),
        customElements.whenDefined("fig-choice"),
        customElements.whenDefined("fig-menu"),
        customElements.whenDefined("fig-easing-curve"),
        customElements.whenDefined("fig-origin-grid"),
        customElements.whenDefined("fig-input-fill"),
        customElements.whenDefined("fig-input-gradient"),
        customElements.whenDefined("fig-input-palette"),
        customElements.whenDefined("fig-spinner"),
        customElements.whenDefined("fig-shimmer"),
        customElements.whenDefined("fig-skeleton"),
        customElements.whenDefined("fig-handle"),
        customElements.whenDefined("fig-color-tip"),
        customElements.whenDefined("fig-layer"),
        customElements.whenDefined("fig-toast"),
      ]);
    });
  });

  test("fig-chooser value=\"\" keeps no selection and omitted value still picks the first choice", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-chooser id="empty" value="">
          <fig-choice value="a">A</fig-choice>
          <fig-choice value="b">B</fig-choice>
        </fig-chooser>
        <fig-chooser id="default">
          <fig-choice value="a">A</fig-choice>
          <fig-choice value="b">B</fig-choice>
        </fig-chooser>
        <fig-chooser id="clearable" value="b">
          <fig-choice value="a">A</fig-choice>
          <fig-choice value="b">B</fig-choice>
        </fig-chooser>
      `;
    });

    const empty = page.locator("#empty");
    const fallback = page.locator("#default");
    const clearable = page.locator("#clearable");

    await expect
      .poll(() =>
        empty.evaluate((chooser) => ({
          value: chooser.value,
          selected: chooser.querySelectorAll("fig-choice[selected]").length,
        })),
      )
      .toEqual({ value: "", selected: 0 });
    await expect
      .poll(() =>
        fallback.evaluate((chooser) => ({
          value: chooser.value,
          selected: chooser.querySelector("fig-choice[selected]")?.getAttribute("value"),
        })),
      )
      .toEqual({ value: "a", selected: "a" });

    const events = await clearable.evaluate((chooser) => {
      const received = [];
      chooser.addEventListener("input", (event) => {
        received.push({ type: event.type, detail: event.detail });
      });
      chooser.addEventListener("change", (event) => {
        received.push({ type: event.type, detail: event.detail });
      });
      chooser.value = "";
      return {
        received,
        value: chooser.value,
        attr: chooser.getAttribute("value"),
        selected: chooser.querySelectorAll("fig-choice[selected]").length,
        selectedChoice: chooser.selectedChoice,
      };
    });
    expect(events).toEqual({
      received: [],
      value: "",
      attr: "",
      selected: 0,
      selectedChoice: null,
    });

    await clearable.evaluate((chooser) => {
      chooser.value = null;
    });
    await expect(clearable).toHaveAttribute("value", "");
    expect(
      await clearable.evaluate((chooser) => chooser.querySelectorAll("fig-choice[selected]").length),
    ).toBe(0);
  });

  test("fig-chooser restores light-DOM overflow buttons after choices are replaced", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 6 }, (_, index) => {
        return `<fig-choice value="choice-${index}" style="min-width: 96px; height: 24px;">Choice ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser
          id="chooser"
          layout="horizontal"
          style="width: 120px; max-width: 120px;"
        >${choices}</fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#chooser").evaluate((chooser) => {
          return {
            navButtons: chooser.querySelectorAll("[data-fig-chooser-nav]").length,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            hasStartOverflow: chooser.classList.contains("overflow-start"),
            scrollLeft: chooser.scrollLeft,
          };
        }),
      )
      .toEqual({
        navButtons: 2,
        hasEndOverflow: true,
        hasStartOverflow: false,
        scrollLeft: 0,
      });

    await page.locator("#chooser").evaluate((chooser) => {
      chooser.innerHTML = `
        <fig-choice value="new-0" style="min-width: 96px; height: 24px;">New 0</fig-choice>
        <fig-choice value="new-1" style="min-width: 96px; height: 24px;">New 1</fig-choice>
        <fig-choice value="new-2" style="min-width: 96px; height: 24px;">New 2</fig-choice>
        <fig-choice value="new-3" style="min-width: 96px; height: 24px;">New 3</fig-choice>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#chooser").evaluate((chooser) => {
          const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
          return {
            choices: chooser.querySelectorAll("fig-choice").length,
            directChoices: chooser.querySelectorAll(":scope > fig-choice").length,
            legacyScroller: chooser.querySelectorAll(":scope > [data-fig-chooser-scroll]").length,
            navButtons: chooser.querySelectorAll("[data-fig-chooser-nav]").length,
            value: chooser.getAttribute("value"),
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            navEndPosition: navEnd ? getComputedStyle(navEnd).position : null,
            navEndPointerEvents: navEnd ? getComputedStyle(navEnd).pointerEvents : null,
          };
        }),
      )
      .toEqual({
        choices: 4,
        directChoices: 4,
        legacyScroller: 0,
        navButtons: 2,
        value: "new-0",
        hasEndOverflow: true,
        navEndPosition: "sticky",
        navEndPointerEvents: "auto",
      });

    await page.locator("#chooser").evaluate((chooser) => {
      chooser.querySelector('fig-choice[value="new-2"]')?.click();
    });
    await expect(page.locator("#chooser")).toHaveAttribute("value", "new-2");

    await page.locator("#chooser").evaluate((chooser) => {
      chooser.scrollLeft = 0;
      const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
      navEnd?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
    });

    await expect
      .poll(() =>
        page.locator("#chooser").evaluate((chooser) => {
          const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
          if (chooser.scrollLeft <= 0) return null;
          if (!navEnd) return null;
          const chooserRect = chooser.getBoundingClientRect();
          const navEndRect = navEnd.getBoundingClientRect();
          return {
            scrollLeft: chooser.scrollLeft,
            navEndRightDelta: Math.round(navEndRect.right - chooserRect.right),
          };
        }),
      )
      .toMatchObject({
        scrollLeft: expect.any(Number),
        navEndRightDelta: 0,
      });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 6 }, (_, index) => {
        return `<fig-choice value="vertical-${index}" style="height: 32px;">Vertical ${index}</fig-choice>`;
      }).join("");
      root.insertAdjacentHTML("beforeend", `
        <fig-chooser
          id="vertical-chooser"
          style="height: 72px; max-height: 72px; width: 120px;"
        >${choices}</fig-chooser>
      `);
    });

    await expect
      .poll(() =>
        page.locator("#vertical-chooser").evaluate((chooser) => {
          return {
            scrollTop: chooser.scrollTop,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            hasStartOverflow: chooser.classList.contains("overflow-start"),
          };
        }),
      )
      .toEqual({
        scrollTop: 0,
        hasEndOverflow: true,
        hasStartOverflow: false,
      });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.insertAdjacentHTML("beforeend", `
        <fig-chooser
          id="text-chooser"
          layout="vertical"
          value="option-a"
          full
          drag
          style="max-height: 190px; width: 240px;"
        >
          <fig-choice value="option-a" padding selected><span style="white-space: nowrap;">Option A</span></fig-choice>
          <fig-choice value="option-b" padding><span style="white-space: nowrap;">Option B</span></fig-choice>
          <fig-choice value="option-c" padding><span style="white-space: nowrap;">Option C</span></fig-choice>
          <fig-choice value="option-d" padding><span style="white-space: nowrap;">Option D</span></fig-choice>
          <fig-choice value="option-e" padding><span style="white-space: nowrap;">Option E</span></fig-choice>
          <fig-choice value="option-f" padding><span style="white-space: nowrap;">Option F</span></fig-choice>
        </fig-chooser>
      `);
    });

    await expect
      .poll(() =>
        page.locator("#text-chooser").evaluate((chooser) => {
          const navStart = chooser.querySelector('[data-fig-chooser-nav="start"]');
          const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
          return {
            scrollTop: chooser.scrollTop,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            hasStartOverflow: chooser.classList.contains("overflow-start"),
            navStartOpacity: navStart ? getComputedStyle(navStart).opacity : null,
            navEndOpacity: navEnd ? getComputedStyle(navEnd).opacity : null,
          };
        }),
      )
      .toEqual({
        scrollTop: 0,
        hasEndOverflow: true,
        hasStartOverflow: false,
        navStartOpacity: "0",
        navEndOpacity: "1",
      });

    await expect
      .poll(() =>
        page.locator("#vertical-chooser").evaluate((chooser) => {
          const navEnd = chooser.querySelector('[data-fig-chooser-nav="end"]');
          if (!navEnd) return null;
          chooser.scrollTop = 40;
          const chooserRect = chooser.getBoundingClientRect();
          const navEndRect = navEnd.getBoundingClientRect();
          return {
            scrollTop: chooser.scrollTop,
            navEndBottomDelta: Math.round(navEndRect.bottom - chooserRect.bottom),
          };
        }),
      )
      .toMatchObject({
        scrollTop: expect.any(Number),
        navEndBottomDelta: 0,
      });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div id="panel" style="width: 240px;">
          <fig-chooser id="panel-chooser" layout="horizontal" value="a" full drag>
            <fig-choice value="a" padding selected>Option A</fig-choice>
            <fig-choice value="b" padding>Option B</fig-choice>
            <fig-choice value="c" padding>Option C</fig-choice>
            <fig-choice value="d" padding>Option D</fig-choice>
            <fig-choice value="e" padding>Option E</fig-choice>
            <fig-choice value="f" padding>Option F</fig-choice>
          </fig-chooser>
        </div>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#panel-chooser").evaluate((chooser) => {
          const panel = document.querySelector("#panel");
          if (!panel) return null;
          return {
            panelWidth: Math.round(panel.getBoundingClientRect().width),
            chooserWidth: Math.round(chooser.getBoundingClientRect().width),
            scrollsHorizontally: chooser.scrollWidth > chooser.clientWidth,
          };
        }),
      )
      .toEqual({
        panelWidth: 240,
        chooserWidth: 240,
        scrollsHorizontally: true,
      });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = [
        "red",
        "blue",
        "green",
        "orange",
        "purple",
        "pink",
        "teal",
        "yellow",
      ]
        .map((color) => {
          return `<fig-choice value="${color}"><fig-swatch size="large" disabled></fig-swatch></fig-choice>`;
        })
        .join("");
      root.innerHTML = `
        <fig-chooser id="color-chooser" layout="horizontal" value="red" full drag style="width: 240px; max-width: 240px;">
          ${choices}
        </fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#color-chooser").evaluate((chooser) => {
          const choices = Array.from(chooser.querySelectorAll(":scope > fig-choice"));
          const rects = choices.map((choice) => choice.getBoundingClientRect());
          const gaps = rects.slice(1).map((rect, index) =>
            Math.round(rect.left - rects[index].right),
          );
          return {
            scrollsHorizontally: chooser.scrollWidth > chooser.clientWidth,
            minChoiceWidth: Math.min(
              ...choices.map((choice) =>
                Math.round(choice.getBoundingClientRect().width),
              ),
            ),
            minGap: Math.min(...gaps),
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            hasStartOverflow: chooser.classList.contains("overflow-start"),
          };
        }),
      )
      .toEqual({
        scrollsHorizontally: true,
        minChoiceWidth: 32,
        minGap: 8,
        hasEndOverflow: true,
        hasStartOverflow: false,
      });
  });

  test("fig-chooser supports grid column counts with fallback", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 6 }, (_, index) => {
        return `<fig-choice value="choice-${index}">Choice ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser id="grid-default" layout="grid">${choices}</fig-chooser>
        <fig-chooser id="grid-three" layout="grid" columns="3">${choices}</fig-chooser>
        <fig-chooser id="grid-invalid" layout="grid" columns="nope">${choices}</fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const columnCount = (selector: string) => {
            const chooser = document.querySelector(selector);
            if (!chooser) return null;
            return {
              columns: getComputedStyle(chooser).gridTemplateColumns
                .split(" ")
                .filter(Boolean).length,
              columnVar: getComputedStyle(chooser)
                .getPropertyValue("--fig-chooser-grid-columns")
                .trim(),
            };
          };

          return {
            defaultGrid: columnCount("#grid-default"),
            threeGrid: columnCount("#grid-three"),
            invalidGrid: columnCount("#grid-invalid"),
          };
        }),
      )
      .toEqual({
        defaultGrid: { columns: 2, columnVar: "" },
        threeGrid: { columns: 3, columnVar: "3" },
        invalidGrid: { columns: 2, columnVar: "" },
      });
  });

  test("fig-chooser centers selected choices on click and keyboard", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 8 }, (_, index) => {
        return `<fig-choice value="choice-${index}" style="width: 72px; height: 32px;">Choice ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser id="selection-scroll-chooser" layout="horizontal" value="choice-0" style="width: 200px; max-width: 200px;">
          ${choices}
        </fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#selection-scroll-chooser").evaluate((chooser) => {
          return {
            scrollLeft: chooser.scrollLeft,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
          };
        }),
      )
      .toEqual({
        scrollLeft: 0,
        hasEndOverflow: true,
      });

    await page.locator('#selection-scroll-chooser fig-choice[value="choice-2"]').click();

    await expect
      .poll(() =>
        page.locator("#selection-scroll-chooser").evaluate((chooser) => {
          const selected = chooser.querySelector('fig-choice[value="choice-2"]');
          if (!selected) return null;
          const chooserRect = chooser.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          const centerDelta = Math.round(
            selectedRect.left +
              selectedRect.width / 2 -
              (chooserRect.left + chooserRect.width / 2),
          );
          return {
            value: chooser.getAttribute("value"),
            scrollLeft: Math.round(chooser.scrollLeft),
            centerDelta,
          };
        }),
      )
      .toMatchObject({
        value: "choice-2",
        scrollLeft: expect.any(Number),
        centerDelta: 0,
      });

    await expect
      .poll(() =>
        page.locator("#selection-scroll-chooser").evaluate((chooser) => chooser.scrollLeft),
      )
      .toBeGreaterThan(0);

    await page.locator('#selection-scroll-chooser fig-choice[value="choice-2"]').press("ArrowRight");

    await expect
      .poll(() =>
        page.locator("#selection-scroll-chooser").evaluate((chooser) => {
          const selected = chooser.querySelector('fig-choice[value="choice-3"]');
          if (!selected) return null;
          const chooserRect = chooser.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          const centerDelta = Math.round(
            selectedRect.left +
              selectedRect.width / 2 -
              (chooserRect.left + chooserRect.width / 2),
          );
          return {
            value: chooser.getAttribute("value"),
            centerDelta,
          };
        }),
      )
      .toEqual({
        value: "choice-3",
        centerDelta: 0,
      });
  });

  test("fig-chooser separates selection from scrolling when auto-scroll is disabled", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 8 }, (_, index) => {
        const media = index === 0 ? "<video></video>" : "";
        return `<fig-choice value="choice-${index}" style="width: 72px; height: 32px;">Choice ${index}${media}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser
          id="manual-scroll-chooser"
          layout="horizontal"
          value="choice-0"
          auto-scroll="false"
          scroll-behavior="auto"
          style="width: 200px; max-width: 200px;"
        >
          ${choices}
        </fig-chooser>
      `;
      const chooser = document.querySelector("#manual-scroll-chooser");
      chooser.__events = [];
      chooser.addEventListener("input", (event) => {
        chooser.__events.push(["input", event.detail]);
      });
      chooser.addEventListener("change", (event) => {
        chooser.__events.push(["change", event.detail]);
      });
    });

    await expect
      .poll(() =>
        page.locator("#manual-scroll-chooser").evaluate((chooser) => ({
          scrollLeft: chooser.scrollLeft,
          value: chooser.value,
          autoScroll: chooser.autoScroll,
          scrollBehavior: chooser.scrollBehavior,
        })),
      )
      .toEqual({
        scrollLeft: 0,
        value: "choice-0",
        autoScroll: false,
        scrollBehavior: "auto",
      });

    await page.locator("#manual-scroll-chooser").evaluate(async (chooser) => {
      chooser.value = "choice-4";
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });

    await expect
      .poll(() =>
        page.locator("#manual-scroll-chooser").evaluate((chooser) => ({
          scrollLeft: chooser.scrollLeft,
          value: chooser.value,
          selected: chooser.selectedChoice?.getAttribute("value"),
          events: chooser.__events,
        })),
      )
      .toEqual({
        scrollLeft: 0,
        value: "choice-4",
        selected: "choice-4",
        events: [],
      });

    const returnValue = await page
      .locator("#manual-scroll-chooser")
      .evaluate((chooser) => {
        return chooser.scrollSelectionIntoView({
          behavior: "auto",
          inline: "center",
        });
      });
    expect(returnValue).toBeUndefined();

    await expect
      .poll(() =>
        page.locator("#manual-scroll-chooser").evaluate((chooser) => {
          const selected = chooser.selectedChoice;
          if (!selected) return null;
          const chooserRect = chooser.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          return {
            scrollLeft: Math.round(chooser.scrollLeft),
            centerDelta: Math.round(
              selectedRect.left +
                selectedRect.width / 2 -
                (chooserRect.left + chooserRect.width / 2),
            ),
            events: chooser.__events,
          };
        }),
      )
      .toMatchObject({
        scrollLeft: expect.any(Number),
        centerDelta: 0,
        events: [],
      });

    await expect
      .poll(() =>
        page.locator("#manual-scroll-chooser").evaluate((chooser) => chooser.scrollLeft),
      )
      .toBeGreaterThan(0);

    const settled = await page
      .locator("#manual-scroll-chooser")
      .evaluate(async (chooser) => {
        chooser.scrollLeft = 0;
        chooser.setAttribute("columns", "3");
        chooser.style.width = "180px";
        chooser.style.maxWidth = "180px";
        chooser.setAttribute("layout", "vertical");
        chooser.style.height = "64px";
        chooser.style.maxHeight = "64px";
        chooser.querySelector("video")?.dispatchEvent(new Event("loadedmetadata"));
        chooser.append(
          Object.assign(document.createElement("fig-choice"), {
            textContent: "Choice 8",
          }),
        );
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        return {
          scrollLeft: chooser.scrollLeft,
          scrollTop: chooser.scrollTop,
          value: chooser.value,
          events: chooser.__events,
        };
      });
    expect(settled).toEqual({
      scrollLeft: 0,
      scrollTop: 0,
      value: "choice-4",
      events: [],
    });
  });

  test("fig-chooser prevents implicit focus scrolling when auto-scroll is disabled", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-chooser id="keyboard-scroll-chooser" layout="horizontal" value="choice-0" auto-scroll="false" style="width: 120px;">
          <fig-choice value="choice-0" style="width: 72px;">Choice 0</fig-choice>
          <fig-choice value="choice-1" style="width: 72px;">Choice 1</fig-choice>
          <fig-choice value="choice-2" style="width: 72px;">Choice 2</fig-choice>
        </fig-chooser>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const chooser = document.querySelector("#keyboard-scroll-chooser");
      const current = chooser.querySelector('[value="choice-0"]');
      const next = chooser.querySelector('[value="choice-1"]');
      const events = [];
      let focusOptions = null;
      next.focus = (options) => {
        focusOptions = options;
      };
      chooser.addEventListener("input", (event) => {
        events.push(["input", event.detail]);
      });
      chooser.addEventListener("change", (event) => {
        events.push(["change", event.detail]);
      });

      current.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
          cancelable: true,
        }),
      );
      await new Promise(requestAnimationFrame);

      return {
        value: chooser.value,
        scrollLeft: chooser.scrollLeft,
        focusOptions,
        events,
      };
    });

    expect(state).toEqual({
      value: "choice-1",
      scrollLeft: 0,
      focusOptions: { preventScroll: true },
      events: [
        ["input", "choice-1"],
        ["change", "choice-1"],
      ],
    });
  });

  test("fig-chooser resolves scroll behavior for selection and overflow controls", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 8 }, (_, index) => {
        return `<fig-choice value="choice-${index}" style="width: 72px;">Choice ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser id="behavior-chooser" layout="horizontal" value="choice-0" scroll-behavior="auto" style="width: 160px;">
          ${choices}
        </fig-chooser>
      `;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const chooser = document.querySelector("#behavior-chooser");
      const scrollToCalls = [];
      const scrollByCalls = [];
      chooser.scrollTo = (options) => scrollToCalls.push(options);
      chooser.scrollBy = (options) => scrollByCalls.push(options);

      chooser.value = "choice-4";
      await new Promise(requestAnimationFrame);
      chooser
        .querySelector('[data-fig-chooser-nav="end"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      chooser.scrollSelectionIntoView({ behavior: "smooth", inline: "end" });
      await new Promise(requestAnimationFrame);

      const attributeAuto = getComputedStyle(chooser).scrollBehavior;
      chooser.scrollBehavior = "smooth";
      const attributeSmooth = getComputedStyle(chooser).scrollBehavior;
      chooser.style.scrollBehavior = "auto";
      const cssOverride = getComputedStyle(chooser).scrollBehavior;

      return {
        scrollToBehaviors: scrollToCalls.map((options) => options.behavior),
        scrollByBehaviors: scrollByCalls.map((options) => options.behavior),
        attributeAuto,
        attributeSmooth,
        cssOverride,
        reflectedAttribute: chooser.getAttribute("scroll-behavior"),
      };
    });

    expect(state).toMatchObject({
      scrollByBehaviors: ["auto"],
      attributeAuto: "auto",
      attributeSmooth: "smooth",
      cssOverride: "auto",
      reflectedAttribute: "smooth",
    });
    expect(state.scrollToBehaviors.at(-1)).toBe("smooth");
    expect(state.scrollToBehaviors.slice(0, -1)).not.toHaveLength(0);
    expect(state.scrollToBehaviors.slice(0, -1)).toEqual(
      state.scrollToBehaviors.slice(0, -1).map(() => "auto"),
    );
  });

  test("fig-chooser defaults to reduced-motion-safe scrolling", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-chooser id="reduced-default">
          <fig-choice value="a">A</fig-choice>
        </fig-chooser>
        <fig-chooser id="reduced-explicit" scroll-behavior="smooth">
          <fig-choice value="a">A</fig-choice>
        </fig-chooser>
      `;
      return {
        defaultBehavior: getComputedStyle(
          document.querySelector("#reduced-default"),
        ).scrollBehavior,
        explicitBehavior: getComputedStyle(
          document.querySelector("#reduced-explicit"),
        ).scrollBehavior,
      };
    });

    expect(state).toEqual({
      defaultBehavior: "auto",
      explicitBehavior: "smooth",
    });
  });

  test("fig-chooser resettles selected choice after resize and layout changes", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 8 }, (_, index) => {
        return `<fig-choice value="choice-${index}" style="width: 72px; height: 32px;">Choice ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser id="resize-scroll-chooser" layout="horizontal" value="choice-4" style="width: 320px; max-width: 320px;">
          ${choices}
        </fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#resize-scroll-chooser").evaluate((chooser) => {
          const selected = chooser.querySelector('fig-choice[value="choice-4"]');
          if (!selected) return null;
          const chooserRect = chooser.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          return Math.round(
            selectedRect.left +
              selectedRect.width / 2 -
              (chooserRect.left + chooserRect.width / 2),
          );
        }),
      )
      .toBe(0);

    await page.locator("#resize-scroll-chooser").evaluate((chooser) => {
      chooser.style.width = "180px";
      chooser.style.maxWidth = "180px";
    });

    await expect
      .poll(() =>
        page.locator("#resize-scroll-chooser").evaluate((chooser) => {
          const selected = chooser.querySelector('fig-choice[value="choice-4"]');
          if (!selected) return null;
          const chooserRect = chooser.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          return {
            width: Math.round(chooserRect.width),
            centerDelta: Math.round(
              selectedRect.left +
                selectedRect.width / 2 -
                (chooserRect.left + chooserRect.width / 2),
            ),
          };
        }),
      )
      .toEqual({
        width: 180,
        centerDelta: 0,
      });

    await page.locator("#resize-scroll-chooser").evaluate((chooser) => {
      chooser.setAttribute("layout", "vertical");
      chooser.style.width = "180px";
      chooser.style.maxHeight = "96px";
    });

    await expect
      .poll(() =>
        page.locator("#resize-scroll-chooser").evaluate((chooser) => {
          const selected = chooser.querySelector('fig-choice[value="choice-4"]');
          if (!selected) return null;
          const chooserRect = chooser.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          return {
            scrollLeft: Math.round(chooser.scrollLeft),
            scrollTop: Math.round(chooser.scrollTop),
            centerDelta: Math.round(
              selectedRect.top +
                selectedRect.height / 2 -
                (chooserRect.top + chooserRect.height / 2),
            ),
          };
        }),
      )
      .toMatchObject({
        scrollLeft: 0,
        scrollTop: expect.any(Number),
        centerDelta: 0,
      });

    await expect
      .poll(() =>
        page.locator("#resize-scroll-chooser").evaluate((chooser) => chooser.scrollTop),
      )
      .toBeGreaterThan(0);
  });

  test("fig-chooser grid overflow keeps scrollTop at start with sticky nav", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const choices = Array.from({ length: 12 }, (_, index) => {
        return `<fig-choice value="grid-${index}" style="height: 48px;">Grid ${index}</fig-choice>`;
      }).join("");
      root.innerHTML = `
        <fig-chooser id="grid-overflow" layout="grid" columns="2" style="height: 120px; max-height: 120px; width: 160px;">
          ${choices}
        </fig-chooser>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#grid-overflow").evaluate((chooser) => {
          const navStart = chooser.querySelector('[data-fig-chooser-nav="start"]');
          return {
            scrollTop: chooser.scrollTop,
            hasEndOverflow: chooser.classList.contains("overflow-end"),
            navStartOpacity: navStart ? getComputedStyle(navStart).opacity : null,
            directChoices: chooser.querySelectorAll(":scope > fig-choice").length,
            legacyScroller: chooser.querySelectorAll(":scope > [data-fig-chooser-scroll]").length,
          };
        }),
      )
      .toEqual({
        scrollTop: 0,
        hasEndOverflow: true,
        navStartOpacity: "0",
        directChoices: 12,
        legacyScroller: 0,
      });
  });

  test("tabs and segmented controls expose roving selection semantics", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tabs value="one">
          <fig-tab value="one" content="#panel-one" selected>One</fig-tab>
          <fig-tab value="two" content="#panel-two">Two</fig-tab>
        </fig-tabs>
        <section id="panel-one">One panel</section>
        <section id="panel-two">Two panel</section>
        <fig-tabs id="text-tabs">
          <fig-tab selected>General</fig-tab>
          <fig-tab>Advanced</fig-tab>
        </fig-tabs>
        <fig-segmented-control value="left">
          <fig-segment value="left">Left</fig-segment>
          <fig-segment value="right">Right</fig-segment>
        </fig-segmented-control>
      `;
    });
    await page.waitForTimeout(100);

    await expect(page.locator('fig-tab[value="one"]')).toHaveAttribute("tabindex", "0");
    await expect(page.locator('fig-tab[value="two"]')).toHaveAttribute("tabindex", "-1");
    await expect(page.locator("#panel-one")).toHaveAttribute("role", "tabpanel");
    await expect(page.locator('fig-segment[value="left"]')).toHaveAttribute("role", "radio");
    await expect(page.locator('fig-segment[value="left"]')).toHaveAttribute("aria-checked", "true");

    await page.locator('fig-tab[value="one"]').focus();
    const tabFocusStyle = await page.locator('fig-tab[value="one"]').evaluate((tab) => {
      const style = getComputedStyle(tab);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });
    expect(tabFocusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "-1px",
    });

    await page.locator('fig-segment[value="left"]').focus();
    const leftFocusStyle = await page
      .locator('fig-segment[value="left"]')
      .evaluate((segment) => {
        const style = getComputedStyle(segment);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
        };
      });
    expect(leftFocusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "0px",
    });

    await page.keyboard.press("ArrowRight");
    await expect(page.locator('fig-segment[value="right"]')).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('fig-segment[value="right"]')).toBeFocused();
    await page.waitForTimeout(50);
    await expect(page.locator('fig-segment[value="right"]')).toBeFocused();
    const rightFocusStyle = await page
      .locator('fig-segment[value="right"]')
      .evaluate((segment) => {
        const style = getComputedStyle(segment);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
        };
      });
    expect(rightFocusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "0px",
    });

    await page.locator("fig-tabs").first().evaluate((tabs) => {
      (window as any).__tabEvents = [];
      const record = (event: CustomEvent) => {
        (window as any).__tabEvents.push({
          type: event.type,
          detail: event.detail,
          value: (event.target as any)?.value,
        });
      };
      tabs.addEventListener("input", record as EventListener);
      tabs.addEventListener("change", record as EventListener);
    });
    await page.locator('fig-tab[value="two"]').click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__tabEvents))
      .toEqual([
        { type: "input", detail: "two", value: "two" },
        { type: "change", detail: "two", value: "two" },
      ]);

    await page.locator('fig-tab[value="two"]').focus();
    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(() => page.evaluate(() => (window as any).__tabEvents))
      .toEqual([
        { type: "input", detail: "two", value: "two" },
        { type: "change", detail: "two", value: "two" },
        { type: "input", detail: "one", value: "one" },
        { type: "change", detail: "one", value: "one" },
      ]);

    await page.locator("#text-tabs").evaluate((tabs) => {
      (window as any).__textTabEvents = [];
      const record = (event: CustomEvent) => {
        (window as any).__textTabEvents.push({
          type: event.type,
          detail: event.detail,
          value: (event.target as any)?.value,
        });
      };
      tabs.addEventListener("input", record as EventListener);
      tabs.addEventListener("change", record as EventListener);
    });
    await page.locator("#text-tabs fig-tab").nth(1).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__textTabEvents))
      .toEqual([
        { type: "input", detail: "Advanced", value: "Advanced" },
        { type: "change", detail: "Advanced", value: "Advanced" },
      ]);
  });

  test("fig-tabs centers selected tabs in overflow without moving the page", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div id="scroll-page" style="height: 2000px; padding-top: 400px;">
          <div style="width: 120px;">
            <fig-tabs id="overflow-tabs" value="all">
              <fig-tab value="all">All</fig-tab>
              <fig-tab value="ascii">ASCII</fig-tab>
              <fig-tab value="latin">Latin</fig-tab>
              <fig-tab value="punctuation">Punctuation</fig-tab>
              <fig-tab value="math">Math</fig-tab>
              <fig-tab value="arrows">Arrows</fig-tab>
              <fig-tab value="currency">Currency</fig-tab>
              <fig-tab value="symbols">Symbols</fig-tab>
              <fig-tab value="emoji">Emoji</fig-tab>
            </fig-tabs>
          </div>
        </div>
      `;
      window.scrollTo(0, 200);
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          const navEnd = tabs.querySelector('[data-fig-tabs-nav="end"]');
          return {
            navButtons: tabs.querySelectorAll("[data-fig-tabs-nav]").length,
            hasEndOverflow: tabs.classList.contains("overflow-end"),
            navEndPointerEvents: navEnd ? getComputedStyle(navEnd).pointerEvents : null,
            navEndPosition: navEnd ? getComputedStyle(navEnd).position : null,
          };
        }),
      )
      .toEqual({
        navButtons: 2,
        hasEndOverflow: true,
        navEndPointerEvents: "auto",
        navEndPosition: "sticky",
      });

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      const navEnd = tabs.querySelector('[data-fig-tabs-nav="end"]');
      navEnd?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          return tabs.scrollLeft > 0 && tabs.classList.contains("overflow-start");
        }),
      )
      .toBe(true);

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      tabs.setAttribute("value", "math");
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          const selected = tabs.querySelector('fig-tab[value="math"]');
          if (!selected) return false;
          const tabsRect = tabs.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          const tabsCenter = tabsRect.left + tabsRect.width / 2;
          const selectedCenter = selectedRect.left + selectedRect.width / 2;
          return window.scrollY === 200 && Math.abs(selectedCenter - tabsCenter) <= 3;
        }),
      )
      .toBe(true);

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      tabs.querySelector('fig-tab[value="currency"]')?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          const selected = tabs.querySelector('fig-tab[value="currency"]');
          if (!selected) return false;
          const tabsRect = tabs.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          const tabsCenter = tabsRect.left + tabsRect.width / 2;
          const selectedCenter = selectedRect.left + selectedRect.width / 2;
          return window.scrollY === 200 && Math.abs(selectedCenter - tabsCenter) <= 3;
        }),
      )
      .toBe(true);

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      tabs.setAttribute("value", "all");
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          const selected = tabs.querySelector('fig-tab[value="all"]');
          if (!selected) return false;
          const tabsRect = tabs.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          return window.scrollY === 200 && selectedRect.left >= tabsRect.left - 1;
        }),
      )
      .toBe(true);

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      tabs.innerHTML = `
        <fig-tab value="first">First</fig-tab>
        <fig-tab value="second">Second</fig-tab>
        <fig-tab value="third">Third</fig-tab>
        <fig-tab value="fourth">Fourth</fig-tab>
        <fig-tab value="fifth">Fifth</fig-tab>
      `;
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          return {
            tabs: tabs.querySelectorAll("fig-tab").length,
            directTabs: tabs.querySelectorAll(":scope > fig-tab").length,
            legacyScroller: tabs.querySelectorAll(":scope > [data-fig-tabs-scroll]").length,
            navButtons: tabs.querySelectorAll("[data-fig-tabs-nav]").length,
            sharedButtons: tabs.querySelectorAll(".fig-overflow").length,
          };
        }),
      )
      .toEqual({
        tabs: 5,
        directTabs: 5,
        legacyScroller: 0,
        navButtons: 2,
        sharedButtons: 2,
      });

    await page.locator("#overflow-tabs").evaluate((tabs) => {
      const tab = document.createElement("fig-tab");
      tab.setAttribute("value", "sixth");
      tab.textContent = "Sixth";
      tabs.append(tab);
    });

    await expect
      .poll(() =>
        page.locator("#overflow-tabs").evaluate((tabs) => {
          return {
            tabs: tabs.querySelectorAll("fig-tab").length,
            directTabs: tabs.querySelectorAll(":scope > fig-tab").length,
            legacyScroller: tabs.querySelectorAll(":scope > [data-fig-tabs-scroll]").length,
            navButtons: tabs.querySelectorAll("[data-fig-tabs-nav]").length,
            sharedButtons: tabs.querySelectorAll(".fig-overflow").length,
          };
        }),
      )
      .toEqual({
        tabs: 6,
        directTabs: 6,
        legacyScroller: 0,
        navButtons: 2,
        sharedButtons: 2,
      });
  });

  test("fig-input-palette uses tokenized focus outline on the visible swatch row", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-palette
          id="palette"
          value='["#0D99FF","#14AE5C","#FFCD29"]'
          aria-label="Palette"
        ></fig-input-palette>
      `;
    });
    await page.waitForTimeout(100);

    await page.locator("#palette").focus();

    const focusStyle = await page.locator("#palette").evaluate((host) => {
      const row = host.querySelector(".palette-colors-inline");
      if (!row) return null;
      const hostStyle = getComputedStyle(host);
      const rowStyle = getComputedStyle(row);
      return {
        hostOutlineStyle: hostStyle.outlineStyle,
        rowOutlineStyle: rowStyle.outlineStyle,
        rowOutlineWidth: rowStyle.outlineWidth,
        rowOutlineOffset: rowStyle.outlineOffset,
      };
    });

    expect(focusStyle).toEqual({
      hostOutlineStyle: "none",
      rowOutlineStyle: "solid",
      rowOutlineWidth: "1px",
      rowOutlineOffset: "-1px",
    });

    const row = page.locator("#palette .palette-colors-inline");
    await expect(row).toHaveAttribute("role", "button");
    await expect(row).not.toHaveAttribute("tabindex", "0");
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await page.locator("#palette").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#palette")).toHaveAttribute("open", "");
    await expect(row).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Tab");
    await expect(row).not.toBeFocused();

    await page.locator("#palette .palette-colors-inline fig-input-color").first().focus();
    const inlineSwatchStyle = await page
      .locator("#palette .palette-colors-inline fig-input-color")
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        const rowStyle = getComputedStyle(element.closest(".palette-colors-inline") as Element);
        return {
          outlineStyle: style.outlineStyle,
          rowOutlineStyle: rowStyle.outlineStyle,
          rowOutlineWidth: rowStyle.outlineWidth,
          rowOutlineOffset: rowStyle.outlineOffset,
        };
      });
    expect(inlineSwatchStyle).toEqual({
      outlineStyle: "none",
      rowOutlineStyle: "none",
      rowOutlineWidth: "3px",
      rowOutlineOffset: "0px",
    });
  });

  test("fig-input-gradient swatch always previews left-to-right linear", async ({
    page,
  }) => {
    const backgrounds = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const cases = [
        {
          id: "linear-angled",
          value:
            '{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}',
        },
        {
          id: "radial",
          value:
            '{"type":"gradient","gradient":{"type":"radial","centerX":50,"centerY":50,"stops":[{"position":0,"color":"#FF0000","opacity":100},{"position":100,"color":"#0000FF","opacity":100}]}}',
        },
        {
          id: "angular",
          value:
            '{"type":"gradient","gradient":{"type":"angular","angle":45,"stops":[{"position":0,"color":"#FFCD29","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}}',
        },
      ];
      root.innerHTML = cases
        .map(
          ({ id, value }) =>
            `<fig-input-gradient id="${id}" edit="false" value='${value}'></fig-input-gradient>`,
        )
        .join("");
      return cases.map(({ id }) => {
        const swatch = root.querySelector(`#${id} fig-swatch`);
        return {
          id,
          background: swatch?.getAttribute("background") ?? "",
        };
      });
    });

    for (const entry of backgrounds) {
      expect(entry.background, entry.id).toMatch(/^linear-gradient\(to right/);
      expect(entry.background, entry.id).not.toMatch(/radial-gradient|conic-gradient|\d+deg/);
    }
  });

  test("fig-input-gradient routes focus to handles only when editable", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const value =
        '{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}';
      root.innerHTML = `
        <button id="before">Before</button>
        <fig-input-gradient id="editable" value='${value}'></fig-input-gradient>
        <fig-input-gradient id="static" edit="false" value='${value}'></fig-input-gradient>
        <button id="after">After</button>
      `;
    });
    await page.waitForTimeout(100);

    const editable = page.locator("#editable");
    const editableFirstHandle = page
      .locator("#editable fig-handle:not(.fig-input-gradient-ghost)")
      .first();
    const staticGradient = page.locator("#static");

    await expect(editable).toHaveAttribute("tabindex", "-1");
    await editable.evaluate((host) => host.focus());
    await expect(editableFirstHandle).toBeFocused();

    const editableFocusStyle = await editable.evaluate((host) => {
      const handle = host.querySelector("fig-handle:not(.fig-input-gradient-ghost)");
      if (!handle) return null;
      const hostStyle = getComputedStyle(host);
      const handleStyle = getComputedStyle(handle);
      return {
        hostOutlineStyle: hostStyle.outlineStyle,
        handleOutlineStyle: handleStyle.outlineStyle,
        handleOutlineOffset: handleStyle.outlineOffset,
      };
    });
    expect(editableFocusStyle).toEqual({
      hostOutlineStyle: "none",
      handleOutlineStyle: "solid",
      handleOutlineOffset: "1px",
    });

    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect(editableFirstHandle).toBeFocused();

    await expect(staticGradient).toHaveAttribute("tabindex", "0");
    await staticGradient.evaluate((host) => host.focus());
    await expect(staticGradient).toBeFocused();

    const staticFocusStyle = await staticGradient.evaluate((host) => {
      const style = getComputedStyle(host);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });
    expect(staticFocusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "-1px",
    });
  });

  test("fig-input-gradient handle mode deletes the selected stop", async ({
    page,
  }) => {
    const value =
      '{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":40,"color":"#F24822","opacity":100},{"position":70,"color":"#FFCD29","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}';
    await page.evaluate((gradientValue) => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-input-gradient id="gradient" mode="handle" value='${gradientValue}'></fig-input-gradient>`;
    }, value);

    const gradient = page.locator("#gradient");
    const handles = gradient.locator("fig-handle:not(.fig-input-gradient-ghost)");
    await expect(handles).toHaveCount(4);

    await handles.nth(1).dispatchEvent("pointerdown", { button: 0 });
    await expect(handles.nth(1)).toHaveAttribute("selected", "");
    await expect(handles.nth(1)).toBeFocused();

    await page.keyboard.press("Delete");
    await expect(handles).toHaveCount(3);

    const afterFirst = await gradient.evaluate((host) => {
      const selected = host.querySelector(
        "fig-handle[selected]:not(.fig-input-gradient-ghost)",
      );
      return {
        selected: Boolean(selected),
        focused: selected === document.activeElement,
        count: host.querySelectorAll(
          "fig-handle:not(.fig-input-gradient-ghost)",
        ).length,
      };
    });
    expect(afterFirst).toEqual({ selected: true, focused: true, count: 3 });

    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    await page.keyboard.press("Backspace");
    await expect(handles).toHaveCount(2);
  });

  test("fig-origin-grid handle uses tokenized focus outline", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-origin-grid id="origin" value="50% 50%"></fig-origin-grid>`;
    });
    await page.waitForTimeout(100);

    const handle = page.locator("#origin fig-handle");
    await handle.focus();

    const focusStyle = await handle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });

    expect(focusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "1px",
    });

    await page.keyboard.press("ArrowRight");
    await expect(handle).toBeFocused();
    await expect(page.locator("#origin")).toHaveAttribute("value", "51% 50%");

    await page.keyboard.press("Shift+ArrowDown");
    await expect(handle).toBeFocused();
    await expect(page.locator("#origin")).toHaveAttribute("value", "51% 60%");
  });

  test("fig-separator exposes separator semantics and label API", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;width:240px">
          <span>Above</span>
          <fig-separator id="separator" label="Commands"></fig-separator>
        </div>
      `;
    });

    expect(
      await page.evaluate(() => ({
        separator: Boolean(customElements.get("fig-separator")),
      })),
    ).toEqual({ separator: true });

    const separator = page.locator("#separator");
    await expect(separator).toHaveAttribute("role", "separator");
    await expect(separator).toHaveAttribute("aria-label", "Commands");
    expect(
      await separator.evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        paddingLeft: getComputedStyle(element).paddingLeft,
        ruleDisplay: getComputedStyle(element, "::before").display,
      })),
    ).toEqual({ width: 240, paddingLeft: "16px", ruleDisplay: "block" });

    await separator.evaluate((element) => {
      (element as HTMLElement & { label: string }).label = "";
    });
    await expect(separator).not.toHaveAttribute("label");
    await expect(separator).not.toHaveAttribute("aria-label");

    const vertical = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="display:flex;flex-direction:row;align-items:stretch;height:40px;width:240px">
          <span>Left</span>
          <fig-separator id="vertical" direction="vertical"></fig-separator>
          <span>Right</span>
        </div>
      `;
      const el = root.querySelector("#vertical") as HTMLElement | null;
      if (!el) throw new Error("Missing vertical separator");
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        width: Math.round(box.width),
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
      };
    });
    expect(vertical).toEqual({
      width: 1,
      paddingLeft: "0px",
      paddingRight: "0px",
    });
  });

  test("fig-menu-separator remains a backwards-compatible fig-separator alias", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="width:240px">
          <div><fig-separator id="separator" label="More"></fig-separator></div>
          <div><fig-menu-separator id="alias" label="More"></fig-menu-separator></div>
        </div>
        <fig-menu id="menu">
          <fig-button fig-menu-trigger>Actions</fig-button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
          <fig-menu-separator id="menu-alias"></fig-menu-separator>
          <fig-menu-item value="settings">Settings</fig-menu-item>
        </fig-menu>
      `;
      const separator = root.querySelector("#separator");
      const alias = root.querySelector("#alias");
      const menuAlias = root.querySelector("#menu-alias");
      const Separator = customElements.get("fig-separator");
      if (!separator || !alias || !menuAlias || !Separator) {
        throw new Error("Missing separator aliases");
      }
      const signature = (element: Element) => {
        const style = getComputedStyle(element);
        return {
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          display: style.display,
          height: style.height,
          background: style.backgroundColor,
        };
      };
      return {
        aliasIsSeparator: alias instanceof Separator,
        registered: Boolean(customElements.get("fig-menu-separator")),
        staysInHost: menuAlias.parentElement?.id === "menu",
        assignedToDefaultSlot: menuAlias.assignedSlot instanceof HTMLSlotElement &&
          !menuAlias.assignedSlot.name,
        separator: signature(separator),
        alias: signature(alias),
      };
    });

    expect(state.aliasIsSeparator).toBe(true);
    expect(state.registered).toBe(true);
    expect(state.staysInHost).toBe(true);
    expect(state.assignedToDefaultSlot).toBe(true);
    expect(state.alias).toEqual(state.separator);
  });

  test("menu trigger and items support keyboard menu semantics", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-menu id="menu">
          <fig-button fig-menu-trigger>Actions</fig-button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
          <fig-menu-item value="paste">Paste</fig-menu-item>
        </fig-menu>
      `;
    });
    await page.waitForTimeout(50);

    const trigger = page.locator("fig-button[fig-menu-trigger]");
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('fig-menu-item[value="copy"]')).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('fig-menu-item[value="paste"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("long menus page, keyboard-scroll, stay in viewport, and reconnect cleanly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 240 });
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const items = Array.from(
        { length: 24 },
        (_, index) =>
          `<fig-menu-item value="${index + 1}">Command ${index + 1}</fig-menu-item>`,
      ).join("");
      root.innerHTML = `
        <fig-menu id="long-menu" style="position:fixed;left:8px;top:8px">
          <fig-button fig-menu-trigger>Commands</fig-button>
          ${items}
          <fig-separator label="Commands"></fig-separator>
        </fig-menu>
      `;
    });

    const menu = page.locator("#long-menu");
    const trigger = menu.locator("[fig-menu-trigger]");
    const popup = menu.locator('dialog[is="fig-popup"]');
    const panel = menu.locator(".fig-menu-options");
    const up = panel.locator('[data-fig-menu-nav="start"]');
    const down = panel.locator('[data-fig-menu-nav="end"]');

    await trigger.click();
    await expect(menu).toHaveAttribute("open");
    await page.waitForTimeout(50);
    await expect(up).toHaveCSS("opacity", "0");
    await expect(down).toHaveCSS("opacity", "1");
    const chevron = await down.evaluate((button) => {
      const icon = button.querySelector("fig-icon");
      if (!icon) return null;
      const style = getComputedStyle(icon);
      const rect = icon.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        mask: style.webkitMaskImage || style.maskImage,
      };
    });
    expect(chevron?.width).toBeGreaterThan(8);
    expect(chevron?.height).toBeGreaterThan(8);
    expect(chevron?.mask && chevron.mask !== "none").toBe(true);
    const leftPadding = await menu.evaluate((element) => {
      const item = element.querySelector("fig-menu-item");
      const separator = element.querySelector("fig-separator");
      return {
        item: item ? getComputedStyle(item).paddingLeft : null,
        separator: separator ? getComputedStyle(separator).paddingLeft : null,
        separatorRule: separator
          ? getComputedStyle(separator, "::before").display
          : null,
      };
    });
    expect(leftPadding.separator).toBe(leftPadding.item);
    expect(leftPadding.separatorRule).toBe("block");

    const bounds = await popup.evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        viewportHeight: window.visualViewport?.height ?? window.innerHeight,
      };
    });
    expect(bounds.top).toBeGreaterThanOrEqual(7.5);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight - 7.5);

    await down.click();
    await expect
      .poll(() => panel.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await expect(up).toHaveCSS("opacity", "1");

    await trigger.focus();
    await page.keyboard.press("End");
    await expect(menu.locator('fig-menu-item[value="24"]')).toBeFocused();
    await expect
      .poll(() => panel.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);

    await menu.evaluate((element) => {
      const parent = element.parentElement;
      element.remove();
      parent?.appendChild(element);
    });
    await expect(menu.locator('[data-fig-menu-nav]')).toHaveCount(2);
    await expect(menu.locator(".fig-menu-options")).toHaveCount(1);
  });

  test("fig-menu slots items instead of relocating them", async ({ page }) => {
    const state = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-menu id="slotted-menu">
          <fig-button fig-menu-trigger>Actions</fig-button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
          <fig-separator></fig-separator>
          <fig-menu-item value="paste">Paste</fig-menu-item>
        </fig-menu>
      `;
      const menu = root.querySelector("#slotted-menu");
      const trigger = menu?.querySelector("[fig-menu-trigger]");
      const item = menu?.querySelector('fig-menu-item[value="copy"]');
      const extra = document.createElement("fig-menu-item");
      extra.setAttribute("value", "share");
      extra.textContent = "Share";
      menu?.appendChild(extra);
      extra.remove();
      return {
        triggerSlot: trigger?.getAttribute("slot"),
        triggerParent: trigger?.parentElement?.id,
        itemParent: item?.parentElement?.id,
        itemSlotName: item?.assignedSlot?.name ?? null,
        itemAssigned: item?.assignedSlot instanceof HTMLSlotElement,
        removedParent: extra.parentElement,
        stillQueryItem: Boolean(menu?.querySelector('fig-menu-item[value="copy"]')),
      };
    });

    expect(state.triggerSlot).toBe("trigger");
    expect(state.triggerParent).toBe("slotted-menu");
    expect(state.itemParent).toBe("slotted-menu");
    expect(state.itemSlotName).toBe("");
    expect(state.itemAssigned).toBe(true);
    expect(state.removedParent).toBeNull();
    expect(state.stillQueryItem).toBe(true);
  });

  test("fig-menu items keep their row height inside the slotted flex list", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-menu id="sized-menu">
          <fig-button fig-menu-trigger>Actions</fig-button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
          <fig-menu-item value="paste">Paste</fig-menu-item>
          <fig-separator></fig-separator>
          <fig-menu-item value="delete">Delete</fig-menu-item>
        </fig-menu>
      `;
    });

    const menu = page.locator("#sized-menu");
    await menu.locator("[fig-menu-trigger]").click();
    await expect(menu).toHaveAttribute("open");

    const sizes = await menu.evaluate((element) => {
      const item = element.querySelector("fig-menu-item");
      if (!item) return null;
      const style = getComputedStyle(item);
      return {
        height: item.getBoundingClientRect().height,
        minHeight: Number.parseFloat(style.minHeight),
        flexShrink: style.flexShrink,
      };
    });

    expect(sizes).not.toBeNull();
    expect(sizes?.flexShrink).toBe("0");
    expect(sizes?.minHeight).toBeGreaterThanOrEqual(16);
    expect(sizes?.height).toBeGreaterThanOrEqual(sizes?.minHeight ?? 16);
  });

  test("fig-menu-item in a popup list uses panel colors and keeps nested menus independent", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="version-anchor">Versions</fig-button>
        <dialog is="fig-popup" id="version-popup" title="Version history" open closedby="any" anchor="#version-anchor" position="bottom left" style="width: 16rem; max-height: 12rem;">
          <fig-content padding="none">
          <fig-separator sticky label="Today"></fig-separator>
          <fig-menu-item id="standalone-item" value="v9" subtle>
            <div>
              <h3>Changed properties</h3>
              <label>Version 9</label>
            </div>
            <fig-menu id="row-menu" position="bottom right">
              <fig-button fig-menu-trigger variant="ghost" icon aria-label="More">
                <fig-icon name="more"></fig-icon>
              </fig-button>
              <fig-menu-item value="restore">Restore this version</fig-menu-item>
            </fig-menu>
          </fig-menu-item>
          <fig-separator sticky label="Yesterday"></fig-separator>
          <fig-menu-item value="v1" subtle>Version 1</fig-menu-item>
          <fig-menu-item value="v0" subtle>Version 0</fig-menu-item>
          <fig-menu-item value="v-1" subtle>Version -1</fig-menu-item>
          <fig-menu-item value="v-2" subtle>Version -2</fig-menu-item>
          <fig-menu-item value="v-3" subtle>Version -3</fig-menu-item>
          <fig-menu-item value="v-4" subtle>Version -4</fig-menu-item>
          <fig-menu-item value="v-5" subtle>Version -5</fig-menu-item>
          <fig-menu-item value="v-6" subtle>Version -6</fig-menu-item>
          </fig-content>
        </dialog>
        <fig-menu id="menu-for-color">
          <fig-button fig-menu-trigger>Actions</fig-button>
          <fig-menu-item id="menu-item" value="copy">Copy</fig-menu-item>
        </fig-menu>
      `;
    });

    const colors = await page.evaluate(() => {
      const standalone = document.querySelector("#standalone-item");
      const menuItem = document.querySelector("#menu-item");
      if (!standalone || !menuItem) throw new Error("Missing items");
      const probe = document.createElement("span");
      document.body.append(probe);
      probe.style.color = "var(--figma-color-text)";
      const text = getComputedStyle(probe).color;
      probe.style.color = "var(--figma-color-text-menu)";
      const menuText = getComputedStyle(probe).color;
      probe.remove();
      return {
        standalone: getComputedStyle(standalone).color,
        menuItem: getComputedStyle(menuItem).color,
        text,
        menuText,
      };
    });

    expect(colors.standalone).toBe(colors.text);
    expect(colors.menuItem).toBe(colors.menuText);

    const parentClicks = await page.evaluate(async () => {
      const item = document.querySelector("#standalone-item") as HTMLElement & {
        clicks?: number;
      };
      const popup = document.querySelector("#version-popup") as HTMLElement & {
        open: boolean;
      };
      const rowMenu = document.querySelector("#row-menu") as HTMLElement & {
        open: boolean;
      };
      item.clicks = 0;
      item.addEventListener("click", () => {
        item.clicks = (item.clicks ?? 0) + 1;
      });
      const trigger = item.querySelector("[fig-menu-trigger]");
      (trigger as HTMLElement).click();
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const restore = rowMenu.querySelector('fig-menu-item[value="restore"]') as HTMLElement;
      restore.click();
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      return {
        parentClicks: item.clicks,
        popupOpen: popup.hasAttribute("open"),
        rowMenuOpen: rowMenu.hasAttribute("open"),
        rowMenuValue: rowMenu.getAttribute("value"),
      };
    });

    expect(parentClicks.parentClicks).toBe(0);
    expect(parentClicks.popupOpen).toBe(true);
    expect(parentClicks.rowMenuOpen).toBe(false);
    expect(parentClicks.rowMenuValue).toBe("restore");

    const sticky = await page.evaluate(async () => {
      const popup = document.querySelector("#version-popup");
      const content = popup?.querySelector("fig-content") as HTMLElement | null;
      const later = content?.querySelector(
        'fig-separator[label="Yesterday"]',
      ) as HTMLElement | null;
      if (!content || !later) throw new Error("Missing list");
      content.scrollTop = content.scrollHeight;
      content.dispatchEvent(new Event("scroll"));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const style = getComputedStyle(later);
      const contentTop = content.getBoundingClientRect().top;
      const sepTop = later.getBoundingClientRect().top;
      return {
        top: style.top,
        position: style.position,
        pinned: Math.abs(sepTop - contentTop) <= 2,
        overflowed: content.scrollHeight - content.clientHeight > 8,
        contentPadding: getComputedStyle(content).padding,
        stuck: later.hasAttribute("stuck"),
        ruleDisplay: getComputedStyle(later, "::before").display,
      };
    });

    expect(sticky.position).toBe("sticky");
    expect(sticky.overflowed).toBe(true);
    expect(sticky.pinned).toBe(true);
    expect(sticky.contentPadding).toBe("0px");
    expect(sticky.stuck).toBe(true);
    expect(sticky.ruleDisplay).toBe("none");
  });

  test("fig-popup title generates a header like fig-dialog", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="title-anchor">Open</fig-button>
        <dialog is="fig-popup" id="titled-popup" title="Version history" open anchor="#title-anchor">
          Body
        </dialog>
      `;
      await customElements.whenDefined("fig-popup");
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const popup = document.querySelector("#titled-popup") as HTMLElement & {
        open: boolean;
      };
      const header = popup.querySelector("fig-header[dialog-header][data-auto]");
      const heading = header?.querySelector("h3");
      const close = header?.querySelector("fig-button[close-dialog]") as HTMLElement | null;
      close?.click();
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      return {
        heading: heading?.textContent,
        hasClose: Boolean(close),
        openAfterClose: popup.open,
      };
    });

    expect(state.heading).toBe("Version history");
    expect(state.hasClose).toBe(true);
    expect(state.openAfterClose).toBe(false);
  });

  test("fill, loading, handle, color-tip, and toast expose accessible state", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <p id="fill-help">Use fill controls.</p>
        <fig-input-fill aria-label="Layer fill" aria-describedby="fill-help" value="#0D99FF"></fig-input-fill>
        <fig-spinner></fig-spinner>
        <fig-shimmer aria-label="Loading rows"><p>Placeholder</p></fig-shimmer>
        <fig-handle type="color" color="#0D99FF"></fig-handle>
        <fig-color-tip control="add"></fig-color-tip>
        <fig-layer open="false" visible="false">
          <div class="fig-layer-row"><label>Layer</label></div>
        </fig-layer>
        <dialog is="fig-toast">Saved</dialog>
      `;
    });
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => {
      const fill = document.querySelector("fig-input-fill");
      const fillPicker = fill?.querySelector("fig-fill-picker");
      const hex = fill?.querySelector("fig-input-text input");
      const opacity = fill?.querySelector("fig-input-number input");
      const handle = document.querySelector("fig-handle");
      const colorTipButton = document.querySelector("fig-color-tip fig-button");
      const layer = document.querySelector("fig-layer");
      const layerChevron = layer?.querySelector(".fig-layer-chevron");
      const toast = document.querySelector('dialog[is="fig-toast"]');
      return {
        fillRole: fill?.getAttribute("role"),
        fillPickerLabel: fillPicker?.getAttribute("aria-label"),
        hexLabel: hex?.getAttribute("aria-label"),
        opacityLabel: opacity?.getAttribute("aria-label"),
        spinnerRole: document.querySelector("fig-spinner")?.getAttribute("role"),
        spinnerLabel: document.querySelector("fig-spinner")?.getAttribute("aria-label"),
        shimmerRole: document.querySelector("fig-shimmer")?.getAttribute("role"),
        shimmerBusy: document.querySelector("fig-shimmer")?.getAttribute("aria-busy"),
        handleRole: handle?.getAttribute("role"),
        handleLabel: handle?.getAttribute("aria-label"),
        colorTipLabel: colorTipButton?.getAttribute("aria-label"),
        layerRole: layer?.getAttribute("role"),
        layerExpanded: layer?.getAttribute("aria-expanded"),
        layerHidden: layer?.getAttribute("aria-hidden"),
        layerChevronRole: layerChevron?.getAttribute("role"),
        layerChevronLabel: layerChevron?.getAttribute("aria-label"),
        toastRole: toast?.getAttribute("role"),
        toastLive: toast?.getAttribute("aria-live"),
      };
    });

    expect(state).toEqual({
      fillRole: "group",
      fillPickerLabel: "Layer fill picker",
      hexLabel: "Layer fill hex color",
      opacityLabel: "Layer fill opacity",
      spinnerRole: "status",
      spinnerLabel: "Loading",
      shimmerRole: "status",
      shimmerBusy: "true",
      handleRole: "button",
      handleLabel: "Color handle",
      colorTipLabel: "Add color stop",
      layerRole: "treeitem",
      layerExpanded: "false",
      layerHidden: "true",
      layerChevronRole: "button",
      layerChevronLabel: "Expand layer",
      toastRole: "status",
      toastLive: "polite",
    });
  });

  test("fig-toast prepends and removes a managed icon from the icon attribute", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<dialog is="fig-toast" id="icon-toast">Saved</dialog>`;
    });

    const withoutIcon = await page.evaluate(() => {
      const toast = document.querySelector("#icon-toast");
      return {
        iconCount: toast?.querySelectorAll(":scope > fig-icon[data-fig-toast-icon]")
          .length,
      };
    });
    expect(withoutIcon).toEqual({ iconCount: 0 });

    const withIcon = await page.evaluate(() => {
      const toast = document.querySelector("#icon-toast");
      toast?.setAttribute("icon", "warning");
      const icon = toast?.querySelector(":scope > fig-icon[data-fig-toast-icon]");
      return {
        firstChild: toast?.firstElementChild?.tagName.toLowerCase(),
        name: icon?.getAttribute("name"),
        size: icon?.getAttribute("size"),
        ariaHidden: icon?.getAttribute("aria-hidden"),
        iconVar: (icon as HTMLElement | null)?.style.getPropertyValue("--icon"),
      };
    });
    expect(withIcon).toEqual({
      firstChild: "fig-icon",
      name: "warning",
      size: "medium",
      ariaHidden: "true",
      iconVar: "var(--icon-24-warning)",
    });

    const renamed = await page.evaluate(() => {
      const toast = document.querySelector("#icon-toast");
      toast?.setAttribute("icon", "close");
      const icons = toast?.querySelectorAll(":scope > fig-icon[data-fig-toast-icon]");
      return {
        count: icons?.length,
        name: icons?.[0]?.getAttribute("name"),
        size: icons?.[0]?.getAttribute("size"),
        iconVar: (icons?.[0] as HTMLElement | undefined)?.style.getPropertyValue(
          "--icon",
        ),
      };
    });
    expect(renamed).toEqual({
      count: 1,
      name: "close",
      size: "medium",
      iconVar: "var(--icon-24-close)",
    });

    const cleared = await page.evaluate(() => {
      const toast = document.querySelector("#icon-toast");
      toast?.removeAttribute("icon");
      return {
        iconCount: toast?.querySelectorAll(":scope > fig-icon[data-fig-toast-icon]")
          .length,
      };
    });
    expect(cleared).toEqual({ iconCount: 0 });
  });

  test("fig-toast appends a dismiss button that hides the toast", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<dialog is="fig-toast" id="dismiss-toast" duration="0">Saved</dialog>`;
    });

    const withoutDismiss = await page.evaluate(() => {
      const toast = document.querySelector("#dismiss-toast");
      return {
        count: toast?.querySelectorAll(":scope > fig-button[data-fig-toast-dismiss]")
          .length,
      };
    });
    expect(withoutDismiss).toEqual({ count: 0 });

    const withDismiss = await page.evaluate(() => {
      const toast = document.querySelector("#dismiss-toast") as HTMLElement & {
        showToast?: () => void;
        open?: boolean;
      };
      toast?.setAttribute("dismiss", "true");
      const button = toast?.querySelector(
        ":scope > fig-button[data-fig-toast-dismiss]",
      );
      const separator = toast?.querySelector(
        ":scope > fig-separator[data-fig-toast-dismiss-separator]",
      ) as HTMLElement | null;
      const icon = button?.querySelector("fig-icon");
      toast?.showToast?.();
      return {
        lastChild: toast?.lastElementChild?.tagName.toLowerCase(),
        beforeButton: button?.previousElementSibling?.tagName.toLowerCase(),
        separatorDirection: separator?.getAttribute("direction"),
        separatorWidth: separator ? Math.round(separator.getBoundingClientRect().width) : 0,
        variant: button?.getAttribute("variant"),
        iconOnly: button?.hasAttribute("icon"),
        closeToast: button?.hasAttribute("close-toast"),
        ariaLabel: button?.getAttribute("aria-label"),
        iconName: icon?.getAttribute("name"),
        open: Boolean(toast?.open),
      };
    });
    expect(withDismiss).toEqual({
      lastChild: "fig-button",
      beforeButton: "fig-separator",
      separatorDirection: "vertical",
      separatorWidth: 1,
      variant: "ghost",
      iconOnly: true,
      closeToast: true,
      ariaLabel: "Close notification",
      iconName: "close",
      open: true,
    });

    await page.locator("#dismiss-toast fig-button[data-fig-toast-dismiss]").click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const toast = document.querySelector("#dismiss-toast") as HTMLDialogElement | null;
          return Boolean(toast?.open);
        }),
      )
      .toBe(false);

    const cleared = await page.evaluate(() => {
      const toast = document.querySelector("#dismiss-toast");
      toast?.setAttribute("dismiss", "false");
      return {
        buttonCount: toast?.querySelectorAll(
          ":scope > fig-button[data-fig-toast-dismiss]",
        ).length,
        separatorCount: toast?.querySelectorAll(
          ":scope > fig-separator[data-fig-toast-dismiss-separator]",
        ).length,
      };
    });
    expect(cleared).toEqual({ buttonCount: 0, separatorCount: 0 });
  });

  test("fig-input-fill has no host outline on hover, focus, or popup-open", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<fig-input-fill id="fill" aria-label="Layer fill" value="#0D99FF"></fig-input-fill>';
    });
    await page.waitForTimeout(50);

    const fill = page.locator("#fill");
    const outlineStyleOf = () =>
      fill.evaluate((element) => getComputedStyle(element).outlineStyle);

    expect(await outlineStyleOf()).toBe("none");

    await fill.hover();
    expect(await outlineStyleOf()).toBe("none");

    await fill.locator("fig-input-text input").focus();
    expect(await outlineStyleOf()).toBe("none");

    await fill.evaluate((element) => element.classList.add("has-popup-open"));
    expect(await outlineStyleOf()).toBe("none");
  });

  test("fig-input-fill gradient shows opacity when alpha is enabled", async ({
    page,
  }) => {
    const gradientValue =
      '{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"position":0,"color":"#667eea","opacity":100},{"position":100,"color":"#764ba2","opacity":100}]}}';

    await page.evaluate((value) => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-fill id="fill-alpha" alpha="true" value='${value}'></fig-input-fill>
        <fig-input-fill id="fill-no-alpha" alpha="false" value='${value}'></fig-input-fill>
      `;
    }, gradientValue);
    await page.waitForTimeout(100);

    await expect(
      page.locator("#fill-alpha .fig-input-fill-opacity"),
    ).toHaveCount(1);
    await expect(page.locator("#fill-alpha .fig-input-fill-label")).toHaveText(
      "Linear",
    );
    await expect(
      page.locator("#fill-no-alpha .fig-input-fill-opacity"),
    ).toHaveCount(0);

    const detail = await page.evaluate(() => {
      const fill = document.querySelector("#fill-alpha");
      if (!fill) throw new Error("Missing #fill-alpha");
      let lastDetail = null;
      fill.addEventListener("input", (event) => {
        lastDetail = event.detail;
      });
      const opacityInput = fill.querySelector(".fig-input-fill-opacity input");
      if (!(opacityInput instanceof HTMLInputElement)) {
        throw new Error("Missing opacity input");
      }
      opacityInput.value = "50";
      opacityInput.dispatchEvent(new Event("input", { bubbles: true }));
      return lastDetail;
    });

    expect(detail).toMatchObject({
      type: "gradient",
      gradient: {
        type: "linear",
        opacity: 0.5,
      },
    });
  });

  test("fig-input-fill swatch preserves gradient type but ignores radial center", async ({
    page,
  }) => {
    const backgrounds = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");

      const backgroundFor = async (type: string) => {
        const fill = document.createElement("fig-input-fill");
        fill.setAttribute(
          "value",
          JSON.stringify({
            type: "gradient",
            gradient: {
              type,
              angle: 45,
              centerX: 12,
              centerY: 88,
              stops: [
                { position: 0, color: "#FF0000", opacity: 100 },
                { position: 100, color: "#0000FF", opacity: 100 },
              ],
            },
          }),
        );
        root.append(fill);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const background = fill
          .querySelector("fig-swatch")
          ?.getAttribute("background");
        fill.remove();
        return background;
      };

      return {
        linear: await backgroundFor("linear"),
        radial: await backgroundFor("radial"),
        angular: await backgroundFor("angular"),
      };
    });

    expect(backgrounds.linear).toMatch(/^linear-gradient\(45deg,/);
    expect(backgrounds.radial).toMatch(/^radial-gradient\(circle,/);
    expect(backgrounds.radial).not.toContain("12%");
    expect(backgrounds.radial).not.toContain("88%");
    expect(backgrounds.angular).toMatch(/^conic-gradient\(from 45deg,/);
  });

  test("fig-skeleton hides descendant controls from tab focus", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <button id="before">Before</button>
        <fig-skeleton>
          <input id="hidden-input" value="Hidden">
          <button id="hidden-button">Hidden button</button>
        </fig-skeleton>
        <button id="after">After</button>
      `;
    });
    await page.waitForTimeout(100);

    await expect(page.locator("fig-skeleton")).toHaveAttribute("inert", "");
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#after")).toBeFocused();
  });

  test("draggable handles move with keyboard and emit value changes", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="position: relative; width: 200px; height: 100px;">
          <fig-handle id="keyboard-handle" drag="true" value="50% 50%"></fig-handle>
        </div>
      `;
    });
    await page.waitForTimeout(100);

    const handle = page.locator("#keyboard-handle");
    await handle.focus();
    const focusStyle = await handle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });
    expect(focusStyle).toEqual({
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineOffset: "1px",
    });

    await page.keyboard.press("ArrowRight");
    await expect(handle).toHaveAttribute("value", "51% 50%");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(handle).toHaveAttribute("value", "51% 60%");
    await page.keyboard.press("Home");
    await expect(handle).toHaveAttribute("value", "0% 0%");
  });

  test("fig-easing-curve handles are draggable and support keyboard movement", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-easing-curve
          id="curve"
          value="0.25, 0.25, 0.75, 0.75"
        ></fig-easing-curve>
      `;
    });
    await page.waitForTimeout(100);

    const handleOrder = await page.locator("#curve").evaluate((host) =>
      Array.from(host.querySelectorAll(".fig-easing-curve-handle")).map((handle) =>
        handle.getAttribute("data-handle"),
      ),
    );
    expect(handleOrder).toEqual(["2", "1"]);

    const edgeGeometry = await page.locator("#curve").evaluate((host) => {
      const svg = host.querySelector(".fig-easing-curve-svg");
      const top = host.querySelector('[data-boundary="top"]');
      const bottom = host.querySelector('[data-boundary="bottom"]');
      return {
        width: svg?.viewBox.baseVal.width ?? 0,
        height: svg?.viewBox.baseVal.height ?? 0,
        top: Number(top?.getAttribute("y1")),
        bottom: Number(bottom?.getAttribute("y1")),
        boundaryStart: Number(top?.getAttribute("x1")),
        boundaryEnd: Number(top?.getAttribute("x2")),
      };
    });
    expect(edgeGeometry.top).toBe(0);
    expect(edgeGeometry.bottom).toBe(edgeGeometry.height);
    expect(edgeGeometry.boundaryStart).toBe(0);
    expect(edgeGeometry.boundaryEnd).toBe(edgeGeometry.width);

    const firstHandle = page.locator('#curve [data-handle="1"] fig-handle');
    await expect(firstHandle).toHaveAttribute("type", "minimal");

    await firstHandle.focus();
    await page.keyboard.press("ArrowRight");

    const state = await page.locator("#curve").evaluate((host) => {
      const input = host.querySelector(".fig-easing-curve-value-input");
      return {
        value: host.value,
        inputValue: input?.getAttribute("value"),
      };
    });

    expect(state).toEqual({
      value: "0.26, 0.25, 0.75, 0.75",
      inputValue: "0.26, 0.25, 0.75, 0.75",
    });
  });

  test("fig-easing-curve shift-drag locks horizontally to the handle boundary", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-easing-curve
          id="shift-curve"
          value="0.25, 0.25, 0.75, 0.75"
        ></fig-easing-curve>
      `;
    });
    await page.waitForTimeout(100);

    const handle = page.locator('#shift-curve [data-handle="1"] fig-handle');
    const box = await handle.boundingBox();
    if (!box) throw new Error("Missing easing handle bounds");

    await page.keyboard.down("Shift");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 30,
      box.y + box.height / 2 + 40,
    );
    await page.mouse.up();
    await page.keyboard.up("Shift");

    const [x, y] = await page
      .locator("#shift-curve")
      .evaluate((host) => host.value.split(",").slice(0, 2).map(Number));
    expect(x).toBeGreaterThan(0.25);
    expect(y).toBe(0);
  });

  test("fig-easing-curve rescales overshooting curves to the preview edge", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-easing-curve
          id="overshoot-curve"
          value="0.25, 0.25, 0.75, 0.75"
        ></fig-easing-curve>
      `;
    });
    await page.waitForTimeout(100);

    const handle = page.locator(
      '#overshoot-curve [data-handle="1"] fig-handle',
    );
    const svg = page.locator("#overshoot-curve .fig-easing-curve-svg");
    const [handleBox, svgBox] = await Promise.all([
      handle.boundingBox(),
      svg.boundingBox(),
    ]);
    if (!handleBox || !svgBox) throw new Error("Missing easing geometry");

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      svgBox.y - svgBox.height,
      { steps: 5 },
    );
    await page.mouse.up();

    const state = await page.locator("#overshoot-curve").evaluate((host) => {
      const svg = host.querySelector(".fig-easing-curve-svg");
      const container = host.querySelector(".fig-easing-curve-svg-container");
      const handle = host.querySelector('[data-handle="1"]');
      const topBoundary = host.querySelector('[data-boundary="top"]');
      return {
        controlY: Number(host.value.split(",")[1]),
        containerPadding: container ? getComputedStyle(container).padding : null,
        handleY: Number(handle?.getAttribute("y")),
        handleHeight: Number(handle?.getAttribute("height")),
        previewHeight: svg?.viewBox.baseVal.height ?? 0,
        topBoundaryY: Number(topBoundary?.getAttribute("y1")),
      };
    });

    expect(state.controlY).toBeGreaterThan(1);
    expect(state.containerPadding).toBe("45px");
    expect(state.handleY).toBeLessThan(0);
    expect(state.handleY + state.handleHeight / 2).toBe(0);
    expect(state.topBoundaryY).toBeGreaterThan(state.handleY);
  });

  test("tooltip Escape dismisses and returns focus to the trigger", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip id="tooltip" action="click" text="Helpful note">
          <fig-button id="tooltip-trigger">Help</fig-button>
        </fig-tooltip>
      `;
    });
    await page.waitForTimeout(100);

    const trigger = page.locator("#tooltip-trigger");
    await trigger.focus();
    await trigger.click();
    await expect(page.locator('dialog[is="fig-popup"][data-tooltip-managed]')).toHaveCount(1);
    await expect(trigger).toHaveAttribute("aria-describedby", /.+/);
    await page.keyboard.press("Escape");
    await expect(page.locator('dialog[is="fig-popup"][data-tooltip-managed]')).toHaveCount(0);
    await expect(trigger).not.toHaveAttribute("aria-describedby");
    await expect(trigger).toBeFocused();
  });

  test("select option hover does not reopen a wrapping tooltip", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip text="Choose an option" delay="0">
          <fig-select value="one">
            <fig-select-options>
              <fig-select-option value="one">One</fig-select-option>
              <fig-select-option value="two">Two</fig-select-option>
            </fig-select-options>
          </fig-select>
        </fig-tooltip>
      `;
    });

    const select = page.locator("fig-tooltip > fig-select");
    await select.locator("fig-button.fig-select-trigger").click();
    await expect(select).toHaveAttribute("open", "");
    await select.locator('fig-select-option[value="two"]').hover();
    await page.waitForTimeout(100);

    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(0);
  });

  test("tooltips dismiss when their scroll context moves", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div id="tooltip-scrollbox" style="height:80px; overflow:auto;">
          <div style="height:220px; padding-top:20px;">
            <fig-tooltip text="Scroll dismissed" delay="0">
              <fig-button id="scroll-tooltip-trigger">Help</fig-button>
            </fig-tooltip>
          </div>
        </div>
      `;
    });
    await page.waitForTimeout(100);

    const popup = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    await page.locator("#scroll-tooltip-trigger").hover();
    await expect(popup).toHaveCount(1);
    await page.locator("#tooltip-scrollbox").evaluate((box) => {
      box.scrollTop = 80;
      box.dispatchEvent(new Event("scroll"));
    });
    await expect(popup).toHaveCount(0);
  });

  test("pending tooltips are cancelled by scroll", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div id="pending-tooltip-scrollbox" style="height:80px; overflow:auto;">
          <div style="height:220px; padding-top:20px;">
            <fig-tooltip text="Pending dismissed" delay="500">
              <fig-button id="pending-scroll-tooltip-trigger">Help</fig-button>
            </fig-tooltip>
          </div>
        </div>
      `;
    });
    await page.waitForTimeout(100);

    const popup = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    await page.locator("#pending-scroll-tooltip-trigger").hover();
    await page.locator("#pending-tooltip-scrollbox").evaluate((box) => {
      box.scrollTop = 80;
      box.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(550);
    await expect(popup).toHaveCount(0);
  });

  test("programmatic tooltips dismiss on scroll", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div id="programmatic-tooltip-scrollbox" style="height:80px; overflow:auto;">
          <div style="height:220px; padding-top:20px;">
            <button id="programmatic-tooltip-trigger" type="button">Help</button>
          </div>
        </div>
      `;
      const Tooltip = customElements.get("fig-tooltip");
      const trigger = document.querySelector("#programmatic-tooltip-trigger");
      Tooltip.show(trigger, "Programmatic dismissed", { delay: 0 });
    });

    const popup = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    await expect(popup).toHaveCount(1);
    await page.locator("#programmatic-tooltip-scrollbox").evaluate((box) => {
      box.scrollTop = 80;
      box.dispatchEvent(new Event("scroll"));
    });
    await expect(popup).toHaveCount(0);
  });

  test("show-controlled tooltips stay visible on scroll", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div id="persisted-tooltip-scrollbox" style="height:80px; overflow:auto;">
          <div style="height:220px; padding-top:20px;">
            <fig-tooltip text="Persisted tooltip" show="true">
              <fig-button id="persisted-tooltip-trigger">Help</fig-button>
            </fig-tooltip>
          </div>
        </div>
      `;
    });
    await page.waitForTimeout(100);

    const popup = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    await expect(popup).toHaveCount(1);
    await page.locator("#persisted-tooltip-scrollbox").evaluate((box) => {
      box.scrollTop = 80;
      box.dispatchEvent(new Event("scroll"));
    });
    await expect(popup).toHaveCount(1);
  });

  test("hover tooltips dismiss when a menu opens", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-menu id="overlay-menu">
          <fig-tooltip text="Actions tip" delay="0">
            <fig-button fig-menu-trigger id="menu-open-trigger">Actions</fig-button>
          </fig-tooltip>
          <fig-menu-item value="copy">Copy</fig-menu-item>
        </fig-menu>
      `;
    });
    await page.waitForTimeout(100);

    const tip = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    const trigger = page.locator("#menu-open-trigger");
    await trigger.hover();
    await expect(tip).toHaveCount(1);
    await trigger.click();
    await expect(page.locator("#overlay-menu")).toHaveAttribute("open", "");
    await expect(tip).toHaveCount(0);
  });

  test("hover tooltips dismiss when a dialog opens", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip text="Dialog tip" delay="0">
          <fig-button id="open-dialog">Open</fig-button>
        </fig-tooltip>
        <dialog id="overlay-dialog" is="fig-dialog" aria-label="Overlay">
          <fig-button close-dialog>Close</fig-button>
        </dialog>
      `;
      document.querySelector("#open-dialog")?.addEventListener("click", () => {
        document.querySelector("#overlay-dialog")?.show();
      });
    });
    await page.waitForTimeout(100);

    const tip = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    const trigger = page.locator("#open-dialog");
    await trigger.hover();
    await expect(tip).toHaveCount(1);
    await trigger.click();
    await expect(page.locator("#overlay-dialog")).toHaveAttribute("open", "");
    await expect(tip).toHaveCount(0);
  });

  test("show-controlled tooltips stay visible when a menu opens", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip text="Persisted tip" show="true">
          <fig-button id="persisted-menu-tooltip-trigger">Help</fig-button>
        </fig-tooltip>
        <fig-menu id="persisted-overlay-menu">
          <fig-button fig-menu-trigger id="persisted-menu-open">Actions</fig-button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
        </fig-menu>
      `;
    });
    await page.waitForTimeout(100);

    const tip = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    await expect(tip).toHaveCount(1);
    await page.locator("#persisted-menu-open").click();
    await expect(page.locator("#persisted-overlay-menu")).toHaveAttribute(
      "open",
      "",
    );
    await expect(tip).toHaveCount(1);
  });

  test("programmatic tooltips dismiss when a menu opens", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <button id="programmatic-menu-anchor" type="button">Help</button>
        <fig-menu id="programmatic-overlay-menu">
          <fig-button fig-menu-trigger id="programmatic-menu-open">Actions</fig-button>
          <fig-menu-item value="copy">Copy</fig-menu-item>
        </fig-menu>
      `;
      const Tooltip = customElements.get("fig-tooltip");
      Tooltip.show(
        document.querySelector("#programmatic-menu-anchor"),
        "Programmatic overlay",
        { delay: 0 },
      );
    });

    const tip = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    await expect(tip).toHaveCount(1);
    await page.locator("#programmatic-menu-open").click();
    await expect(page.locator("#programmatic-overlay-menu")).toHaveAttribute(
      "open",
      "",
    );
    await expect(tip).toHaveCount(0);
  });

  test("hover tooltips honor delay when moving between tiles", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <style>
          fig-tooltip { display: contents; }
        </style>
        <fig-chooser layout="grid" columns="2" id="delay-grid">
          <fig-choice value="a">
            <fig-tooltip text="Tile A" delay="200">
              <span class="tile">A</span>
            </fig-tooltip>
          </fig-choice>
          <fig-choice value="b">
            <fig-tooltip text="Tile B" delay="200">
              <span class="tile">B</span>
            </fig-tooltip>
          </fig-choice>
        </fig-chooser>
      `;
    });
    await page.waitForTimeout(100);

    const popup = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    const tiles = page.locator("#delay-grid .tile");

    await tiles.nth(0).hover();
    await page.waitForTimeout(80);
    await expect(popup).toHaveCount(0);
    await page.waitForTimeout(150);
    await expect(popup).toHaveCount(1);

    await tiles.nth(1).hover();
    await expect(popup).toHaveCount(1);

    await page.mouse.move(0, 0);
    await page.waitForTimeout(50);
    await tiles.nth(0).hover();
    await page.waitForTimeout(150);
    await expect(popup).toHaveCount(1);
    await tiles.nth(1).hover();
    await expect(popup).toHaveCount(1);

    await page.mouse.move(0, 0);
    await page.waitForTimeout(1100);
    await tiles.nth(1).hover();
    await page.waitForTimeout(80);
    await expect(popup).toHaveCount(0);
    await page.waitForTimeout(150);
    await expect(popup).toHaveCount(1);
  });

  test("hover tooltips dismiss when the pointer leaves an iframe", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const srcdoc = `<!DOCTYPE html><html><head><link rel="stylesheet" href="/fig.css"><script type="module" src="/fig.js"><\/script></head><body style="margin:0;padding:12px"><fig-tooltip text="Help" delay="0"><fig-button id="iframe-tooltip-trigger">Help</fig-button></fig-tooltip></body></html>`;
      root.innerHTML = `
        <dialog is="fig-dialog" open style="width:260px;padding:0;border:0">
          <iframe
            id="tooltip-iframe"
            style="width:100%;height:88px;border:0;display:block"
            srcdoc="${srcdoc.replace(/"/g, "&quot;")}"
          ></iframe>
        </dialog>
      `;
    });
    await page.waitForTimeout(300);

    const frame = page.frameLocator("#tooltip-iframe");
    const popup = frame.locator(
      'dialog[is="fig-popup"][data-tooltip-managed]',
    );
    await frame.locator("#iframe-tooltip-trigger").hover();
    await expect(popup).toHaveCount(1);

    await page.locator("#tooltip-iframe").dispatchEvent("mouseleave");
    await expect(popup).toHaveCount(0);
  });

  test("hover tooltips dismiss when the pointer leaves the document", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip text="Help" delay="0">
          <fig-button id="exit-tooltip-trigger">Help</fig-button>
        </fig-tooltip>
      `;
    });
    await page.waitForTimeout(100);

    const popup = page.locator('dialog[is="fig-popup"][data-tooltip-managed]');
    await page.locator("#exit-tooltip-trigger").hover();
    await expect(popup).toHaveCount(1);

    await page.evaluate(() => {
      document.documentElement.dispatchEvent(
        new MouseEvent("mouseleave", { bubbles: false }),
      );
    });
    await expect(popup).toHaveCount(0);
  });

  test("hover tooltips on display:contents triggers hide when moving between tiles", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <style>
          fig-tooltip { display: contents; }
        </style>
        <fig-chooser layout="grid" columns="4" id="tile-grid">
          <fig-choice value="a">
            <fig-tooltip text="Click to copy" delay="0">
              <span class="tile">A</span>
            </fig-tooltip>
          </fig-choice>
          <fig-choice value="b">
            <fig-tooltip text="Click to copy" delay="0">
              <span class="tile">B</span>
            </fig-tooltip>
          </fig-choice>
          <fig-choice value="c">
            <fig-tooltip text="Click to copy" delay="0">
              <span class="tile">C</span>
            </fig-tooltip>
          </fig-choice>
        </fig-chooser>
      `;
    });
    await page.waitForTimeout(100);

    const tiles = page.locator("#tile-grid .tile");
    await tiles.nth(0).hover();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
    await tiles.nth(1).hover();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
    await tiles.nth(2).hover();
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(1);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(50);
    await expect(
      page.locator('dialog[is="fig-popup"][data-tooltip-managed]'),
    ).toHaveCount(0);
  });

  test("tooltip keeps beak aligned when anchor is near viewport edge", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 280, height: 480 });
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="edge-anchor" icon variant="ghost" style="position:fixed;right:8px;top:48px"></fig-button>
        <dialog is="fig-popup" variant="tooltip" position="top center" offset="8 8" anchor="#edge-anchor" open>
          <span>Clear search</span>
        </dialog>
      `;
      const button = document.querySelector("#edge-anchor");
      if (button) {
        const icon = document.createElement("fig-icon");
        icon.setAttribute("name", "close");
        icon.setAttribute("size", "small");
        button.append(icon);
      }
    });
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => {
      const popup = document.querySelector(
        'dialog[is="fig-popup"][variant="tooltip"]',
      );
      const anchor = document.querySelector("#edge-anchor");
      if (!(popup instanceof HTMLDialogElement) || !(anchor instanceof HTMLElement)) {
        return null;
      }

      popup.positionPopup?.();

      const popupRect = popup.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const beakOffset = parseFloat(
        getComputedStyle(popup).getPropertyValue("--fig-popup-beak-offset"),
      );
      const beakX = popupRect.left + beakOffset;

      return {
        beakDelta: Math.abs(beakX - anchorCenterX),
        pointer: popup.getAttribute("pointer"),
        viewportMarginRight: window.innerWidth - popupRect.right,
      };
    });

    expect(state).not.toBeNull();
    expect(state?.viewportMarginRight).toBeGreaterThanOrEqual(7);
    expect(state?.viewportMarginRight).toBeLessThanOrEqual(9);
    if (state?.pointer !== "false") {
      expect(state?.beakDelta).toBeLessThan(1.5);
    }
  });

  test("fig-tooltip positions popup when using popover API", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-tooltip id="popover-tooltip" action="manual" show text="Clear search">
          <fig-button id="popover-tooltip-trigger" icon variant="ghost" aria-label="Clear search" style="position:fixed;left:50%;top:8px;transform:translateX(-50%)"></fig-button>
        </fig-tooltip>
      `;
      const button = document.querySelector("#popover-tooltip-trigger");
      if (button) {
        const icon = document.createElement("fig-icon");
        icon.setAttribute("name", "close");
        icon.setAttribute("size", "small");
        button.append(icon);
      }

      await customElements.whenDefined("fig-tooltip");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const trigger = document.querySelector("#popover-tooltip-trigger");

      const popup = document.querySelector(
        'dialog[is="fig-popup"][data-tooltip-managed]',
      );
      if (!(popup instanceof HTMLDialogElement) || !(trigger instanceof HTMLElement)) {
        return null;
      }

      popup.positionPopup?.();

      const popupRect = popup.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      return {
        left: popup.style.left,
        top: popup.style.top,
        width: popupRect.width,
        belowAnchor: popupRect.top >= triggerRect.bottom - 1,
        beakSide: popup.getAttribute("data-beak-side"),
        pointer: popup.getAttribute("pointer"),
      };
    });

    expect(state).not.toBeNull();
    expect(state?.left).not.toBe("");
    expect(state?.top).not.toBe("");
    expect(state?.width).toBeGreaterThan(0);
    expect(state?.belowAnchor || state?.beakSide === "top").toBe(true);
    expect(state?.beakSide).toBe("top");
    expect(state?.pointer).not.toBe("false");
  });

  test("tooltip flips below anchor when there is no room above", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 300, height: 400 });
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="top-anchor" icon variant="ghost" style="position:fixed;left:50%;top:8px;transform:translateX(-50%)"></fig-button>
        <dialog is="fig-popup" variant="tooltip" position="top center" offset="8 8" anchor="#top-anchor" open>
          <span>Clear search</span>
        </dialog>
      `;
      const button = document.querySelector("#top-anchor");
      if (button) {
        const icon = document.createElement("fig-icon");
        icon.setAttribute("name", "close");
        icon.setAttribute("size", "small");
        button.append(icon);
      }
    });
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => {
      const popup = document.querySelector(
        'dialog[is="fig-popup"][variant="tooltip"]',
      );
      const anchor = document.querySelector("#top-anchor");
      if (!(popup instanceof HTMLDialogElement) || !(anchor instanceof HTMLElement)) {
        return null;
      }

      popup.positionPopup?.();

      const popupRect = popup.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();

      return {
        beakSide: popup.getAttribute("data-beak-side"),
        pointer: popup.getAttribute("pointer"),
        popupTop: popupRect.top,
        anchorBottom: anchorRect.bottom,
      };
    });

    expect(state).not.toBeNull();
    expect(state?.beakSide).toBe("top");
    expect(state?.pointer).not.toBe("false");
    expect(state?.popupTop).toBeGreaterThanOrEqual((state?.anchorBottom ?? 0) + 7);
  });

  test("dialog and popup close paths restore focus", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="dialog-trigger">Open dialog</fig-button>
        <dialog id="restore-dialog" is="fig-dialog" aria-label="Example dialog">
          <fig-button close-dialog>Close dialog</fig-button>
        </dialog>
        <fig-button id="popup-trigger">Open popup</fig-button>
        <dialog id="restore-popup" is="fig-popup" anchor="#popup-trigger" aria-label="Example popup">
          <fig-button id="popup-close">Close popup</fig-button>
        </dialog>
      `;
      const dialogTrigger = document.querySelector("#dialog-trigger");
      const dialog = document.querySelector("#restore-dialog");
      dialogTrigger?.addEventListener("click", () => dialog?.show());
      const popupTrigger = document.querySelector("#popup-trigger");
      const popup = document.querySelector("#restore-popup");
      popupTrigger?.addEventListener("click", () => {
        popup.open = true;
      });
      document.querySelector("#popup-close")?.addEventListener("click", () => {
        popup.open = false;
      });
    });
    await page.waitForTimeout(100);

    const dialogTrigger = page.locator("#dialog-trigger");
    await dialogTrigger.focus();
    await dialogTrigger.click();
    await page.locator("#restore-dialog > fig-button[close-dialog]").click();
    await expect(dialogTrigger).toBeFocused();

    const popupTrigger = page.locator("#popup-trigger");
    await popupTrigger.focus();
    await popupTrigger.click();
    await expect(page.locator("#restore-popup")).toHaveAttribute("open", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator("#restore-popup")).not.toHaveAttribute("open", "true");
    await expect(popupTrigger).toBeFocused();
  });
});

test.describe("media accessibility", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-button"),
        customElements.whenDefined("fig-image"),
        customElements.whenDefined("fig-media"),
        customElements.whenDefined("fig-media-controls"),
        customElements.whenDefined("fig-slider"),
        customElements.whenDefined("fig-input-file"),
      ]);
    });
  });

  test("fig-image forwards host alt to generated and slotted images", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image id="generated-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Generated preview"></fig-image>
        <fig-image id="slotted-image" alt="Slotted preview">
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="">
        </fig-image>
      `;
    });
    await page.waitForTimeout(50);

    await expect(page.locator("#generated-image img")).toHaveAttribute(
      "alt",
      "Generated preview",
    );
    await expect(page.locator("#slotted-image img")).toHaveAttribute(
      "alt",
      "Slotted preview",
    );

    await page.locator("#slotted-image").evaluate((element) => {
      element.setAttribute("alt", "Updated slotted preview");
    });
    await expect(page.locator("#slotted-image img")).toHaveAttribute(
      "alt",
      "Updated slotted preview",
    );
  });

  test("fig-image with explicit aspect ratio fills width and lets preview shrink below default min height", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <div style="width: 40px;">
          <fig-image
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
            alt=""
            aspect-ratio="1/1"
          ></fig-image>
        </div>
      `;
    });

    await expect
      .poll(() =>
        page.locator("fig-image > fig-preview").evaluate((preview) => {
          const rect = preview.getBoundingClientRect();
          return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            minHeight: getComputedStyle(preview).minHeight,
          };
        }),
      )
      .toEqual({
        width: 40,
        height: 40,
        minHeight: "auto",
      });
  });

  test("fig-media forwards video labels and creates named controls", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-media
          type="video"
          src="data:video/mp4;base64,"
          aria-label="Clip preview"
          title="Clip title"
          controls
        ></fig-media>
      `;
    });
    await expect(page.locator("fig-media video")).toHaveAttribute(
      "aria-label",
      "Clip preview",
    );
    await expect(page.locator("fig-media video")).toHaveAttribute("title", "Clip title");
    await expect(page.locator("fig-media > fig-preview > video")).toHaveCount(1);
    await expect(page.locator("fig-media > fig-media-controls")).toHaveCount(1);
    await expect(page.locator("fig-media > fig-media-controls")).not.toHaveAttribute(
      "overlay",
      "",
    );
    await expect(page.locator("fig-media-controls")).toHaveAttribute("role", "group");
    await expect(page.locator("fig-media-controls")).toHaveAttribute(
      "aria-label",
      "Media controls",
    );
  });

  test("fig-media reuses one generated controls row from light DOM", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-media
          id="media-generated-controls"
          type="video"
          src="data:video/mp4;base64,"
          controls
        >
          <fig-media-controls data-generated data-keep="true"></fig-media-controls>
          <fig-media-controls data-generated></fig-media-controls>
        </fig-media>
      `;
    });

    await expect(
      page.locator("#media-generated-controls > fig-media-controls[data-generated]"),
    ).toHaveCount(1);
    await expect(
      page.locator("#media-generated-controls > fig-media-controls[data-generated]"),
    ).toHaveAttribute("data-keep", "true");
  });

  test("fig-image syncs generated captions from the caption attribute", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image
          id="image-caption"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          alt=""
          caption="Generated image caption"
        ></fig-image>
      `;
    });

    const caption = page.locator("#image-caption > figcaption[data-generated]");
    await expect(caption).toHaveCount(1);
    await expect(caption).toHaveText("Generated image caption");

    await page.locator("#image-caption").evaluate((host) => {
      host.setAttribute("caption", "Updated image caption");
    });
    await expect(caption).toHaveCount(1);
    await expect(caption).toHaveText("Updated image caption");

    await page.locator("#image-caption").evaluate((host) => {
      host.removeAttribute("caption");
    });
    await expect(caption).toHaveCount(0);
  });

  test("fig-video renders generated captions with controls", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-video
          id="video-caption"
          src="data:video/mp4;base64,"
          aria-label="Clip preview"
          caption="Generated video caption"
          controls
          muted
        ></fig-video>
      `;
    });

    await expect(page.locator("#video-caption > figcaption[data-generated]")).toHaveText(
      "Generated video caption",
    );
    await expect(page.locator("#video-caption > fig-media-controls")).toHaveCount(1);

    const captionBeforeControls = await page.locator("#video-caption").evaluate((host) => {
      const caption = host.querySelector("figcaption[data-generated]");
      const controls = host.querySelector("fig-media-controls");
      if (!caption || !controls) return false;
      return Boolean(
        caption.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(captionBeforeControls).toBe(true);
  });

  test("fig-video reveals uploaded video and enables controls", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-video id="video-upload" upload="true" controls="true" muted></fig-video>
      `;
    });

    const emptyState = await page.locator("#video-upload").evaluate((host) => {
      const video = host.querySelector("video");
      const controls = host.querySelector("fig-media-controls");
      return {
        videoOpacity: video ? getComputedStyle(video).opacity : null,
        controlsDisabled: controls?.hasAttribute("disabled") ?? null,
        playDisabled:
          controls?.querySelector("fig-button")?.hasAttribute("disabled") ?? null,
      };
    });
    expect(emptyState).toEqual({
      videoOpacity: "0",
      controlsDisabled: true,
      playDisabled: true,
    });

    await page.locator('#video-upload input[type="file"]').setInputFiles({
      name: "clip.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("00000000", "hex"),
    });

    await expect
      .poll(() =>
        page.locator("#video-upload").evaluate((host) => {
          const video = host.querySelector("video");
          return video ? getComputedStyle(video).opacity : null;
        }),
      )
      .toBe("1");

    const loadedState = await page.locator("#video-upload").evaluate((host) => {
      const video = host.querySelector("video");
      const controls = host.querySelector("fig-media-controls");
      return {
        videoHasSrc: Boolean(video?.getAttribute("src")),
        controlsDisabled: controls?.hasAttribute("disabled") ?? null,
        playDisabled:
          controls?.querySelector("fig-button")?.hasAttribute("disabled") ?? null,
      };
    });
    expect(loadedState).toEqual({
      videoHasSrc: true,
      controlsDisabled: false,
      playDisabled: false,
    });
  });

  test("fig-media preserves direct child captions over generated captions", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = "";

      const media = document.createElement("fig-media");
      media.id = "child-caption";
      media.setAttribute("type", "image");
      media.setAttribute(
        "src",
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      );
      media.setAttribute("alt", "");
      media.setAttribute("caption", "Generated fallback caption");

      const caption = document.createElement("figcaption");
      caption.textContent = "Authored child caption";
      media.append(caption);
      root.append(media);
    });

    await expect(page.locator("#child-caption > figcaption")).toHaveText(
      "Authored child caption",
    );
    await expect(page.locator("#child-caption > figcaption[data-generated]")).toHaveCount(0);
  });

  test("fig-media-controls play button is visible without hover", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-media-controls duration="10" time="0"></fig-media-controls>`;
    });
    await page.waitForTimeout(50);

    const box = await page
      .locator("fig-media-controls fig-button")
      .boundingBox();
    expect(box).toBeTruthy();
    expect(box?.width).toBeGreaterThan(8);
    expect(box?.height).toBeGreaterThan(8);
  });

  test("fig-media-controls names the seek slider with formatted value text", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `<fig-media-controls duration="90" time="12.3"></fig-media-controls>`;
    });
    await page.waitForTimeout(50);

    const state = await page.locator("fig-media-controls").evaluate((host) => {
      const slider = host.querySelector("fig-slider");
      const input = slider?.querySelector('input[type="range"]');
      const time = host.querySelector(".fig-media-controls-time");
      return {
        hostRole: host.getAttribute("role"),
        hostLabel: host.getAttribute("aria-label"),
        sliderStep: slider?.getAttribute("step"),
        inputStep: input?.getAttribute("step"),
        sliderLabel: input?.getAttribute("aria-label"),
        sliderValueText: input?.getAttribute("aria-valuetext"),
        timeTag: time?.tagName,
        timeText: time?.textContent,
      };
    });

    expect(state).toEqual({
      hostRole: "group",
      hostLabel: "Media controls",
      sliderStep: "1",
      inputStep: "1",
      sliderLabel: "Seek",
      sliderValueText: "00:12 of 01:30",
      timeTag: "SPAN",
      timeText: "00:12",
    });

    await page.locator("fig-media-controls").evaluate((host) => {
      host.setAttribute("duration", "120");
      host.setAttribute("time", "30");
    });
    await expect
      .poll(() =>
        page.locator("fig-media-controls fig-slider input").evaluate((input) =>
          input.getAttribute("aria-valuetext"),
        ),
      )
      .toBe("00:30 of 02:00");
  });

  test("fig-image and fig-media forward native load lifecycle events", async ({
    page,
  }) => {
    const received = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image id="event-image"></fig-image>
        <fig-media id="event-video" type="video"></fig-media>
      `;

      const image = root.querySelector("#event-image")!;
      const video = root.querySelector("#event-video")!;
      const events: Array<Record<string, unknown>> = [];
      const listen = (host: Element, type: string) => {
        host.addEventListener(
          type,
          (event) => {
            const customEvent = event as CustomEvent;
            events.push({
              host: host.id,
              type: event.type,
              targetIsHost: event.target === host,
              bubbles: event.bubbles,
              composed: event.composed,
              mediaTag: customEvent.detail?.media?.tagName,
              originalTargetTag:
                customEvent.detail?.originalEvent?.target?.tagName,
            });
          },
          { once: true },
        );
      };

      listen(image, "load");
      listen(image, "error");
      listen(video, "loadstart");
      listen(video, "loadedmetadata");
      listen(video, "canplay");
      listen(video, "waiting");
      listen(video, "error");

      const img = image.querySelector("img")!;
      const videoEl = video.querySelector("video")!;
      img.dispatchEvent(new Event("load"));
      img.dispatchEvent(new Event("error"));
      ["loadstart", "loadedmetadata", "canplay", "waiting", "error"].forEach(
        (type) => videoEl.dispatchEvent(new Event(type)),
      );

      return events;
    });

    expect(received).toEqual([
      {
        host: "event-image",
        type: "load",
        targetIsHost: true,
        bubbles: true,
        composed: true,
        mediaTag: "IMG",
        originalTargetTag: "IMG",
      },
      {
        host: "event-image",
        type: "error",
        targetIsHost: true,
        bubbles: true,
        composed: true,
        mediaTag: "IMG",
        originalTargetTag: "IMG",
      },
      ...["loadstart", "loadedmetadata", "canplay", "waiting", "error"].map(
        (type) => ({
          host: "event-video",
          type,
          targetIsHost: true,
          bubbles: true,
          composed: true,
          mediaTag: "VIDEO",
          originalTargetTag: "VIDEO",
        }),
      ),
    ]);
  });

  test("generated images show a delayed loading spinner with an opt-out", async ({
    page,
  }) => {
    let releaseRequests!: () => void;
    let markRequestsReady!: () => void;
    const requestsReady = new Promise<void>((resolve) => {
      markRequestsReady = resolve;
    });
    const requestHold = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });
    let requestCount = 0;

    await page.route("**/slow-loading-*.gif", async (route) => {
      requestCount += 1;
      if (requestCount === 2) markRequestsReady();
      await requestHold;
      await route.fulfill({
        contentType: "image/gif",
        body: Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          "base64",
        ),
      });
    });

    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image id="loading-image" src="/slow-loading-image.gif" aspect-ratio="4/3" full></fig-image>
        <fig-media id="loading-media" type="image" src="/slow-loading-media.gif" aspect-ratio="4/3" full></fig-media>
      `;
    });

    await requestsReady;
    await page.waitForTimeout(175);

    for (const selector of ["#loading-image", "#loading-media"]) {
      await expect(page.locator(selector)).toHaveAttribute("aria-busy", "true");
      const spinner = page.locator(
        `${selector} > fig-spinner[slot="overlay"][data-loading-indicator][data-generated]`,
      );
      await expect(spinner).toHaveCount(1);
      await expect(spinner).toHaveAttribute("size", "small");
      const centerOffset = await spinner.evaluate((element) => {
        const preview = element.parentElement?.querySelector("fig-preview");
        if (!preview) throw new Error("Missing fig-preview");
        const spinnerRect = element.getBoundingClientRect();
        const previewRect = preview.getBoundingClientRect();
        return {
          x:
            spinnerRect.left +
            spinnerRect.width / 2 -
            (previewRect.left + previewRect.width / 2),
          y:
            spinnerRect.top +
            spinnerRect.height / 2 -
            (previewRect.top + previewRect.height / 2),
        };
      });
      expect(Math.abs(centerOffset.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(centerOffset.y)).toBeLessThanOrEqual(1);
    }

    await page.locator("#loading-image").evaluate((element) => {
      element.setAttribute("loading-indicator", "false");
    });
    await expect(page.locator("#loading-image")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(
      page.locator(
        '#loading-image > fig-spinner[slot="overlay"][data-loading-indicator]',
      ),
    ).toHaveCount(0);

    releaseRequests();
    await expect(page.locator("#loading-media")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(
      page.locator(
        '#loading-media > fig-spinner[slot="overlay"][data-loading-indicator]',
      ),
    ).toHaveCount(0);
  });

  test("fig-button and file clear controls expose icon-only button names", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="icon-button" icon aria-label="Rotate">
          <fig-icon name="rotate"></fig-icon>
        </fig-button>
        <fig-input-file variant="overlay" filename="asset.png"></fig-input-file>
      `;
    });
    await page.waitForTimeout(50);

    const labels = await page.evaluate(() => {
      const iconButton = document.querySelector("#icon-button");
      const nativeIconButton = iconButton?.shadowRoot?.querySelector("button");
      const clearButton = document.querySelector("fig-input-file .fig-input-file-clear");
      const nativeClearButton = clearButton?.shadowRoot?.querySelector("button");
      return {
        icon: nativeIconButton?.getAttribute("aria-label"),
        clear: nativeClearButton?.getAttribute("aria-label"),
      };
    });

    expect(labels).toEqual({ icon: "Rotate", clear: "Remove" });
  });

  test("loaded media upload overlay remains visible on keyboard focus", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image
          upload
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          alt="Uploaded image preview"
        ></fig-image>
      `;
    });
    await page.waitForTimeout(50);

    const opacityBeforeFocus = await page
      .locator("fig-image > fig-preview > fig-input-file[data-generated]")
      .evaluate((element) => getComputedStyle(element).opacity);
    expect(opacityBeforeFocus).toBe("0");

    await page.locator("fig-image fig-input-file input[type=file]").focus();
    await expect
      .poll(() =>
        page
          .locator("fig-image > fig-preview > fig-input-file[data-generated]")
          .evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("1");
  });

  test("loaded video upload overlay stays hidden until hover", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-media
          type="video"
          upload
          src="data:video/mp4;base64,AAAA"
          muted
        ></fig-media>
      `;
    });

    const overlay = page.locator(
      "fig-media > fig-preview > fig-input-file[data-generated]",
    );
    await expect
      .poll(() =>
        overlay.evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("0");

    await page.locator("fig-media > fig-preview").hover();
    await expect
      .poll(() =>
        overlay.evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("1");
  });

  test("fig-image overlays slotted custom children without reparenting them", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-image
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          alt="Image preview"
        >
          <fig-input-file slot="overlay" accepts="image/*" label="Change" variant="overlay"></fig-input-file>
        </fig-image>
      `;
    });
    await page.waitForTimeout(50);

    await expect(
      page.locator("fig-image > fig-input-file[slot='overlay']"),
    ).toHaveCount(1);
    await expect(
      page.locator("fig-image > fig-preview > fig-input-file[slot='overlay']"),
    ).toHaveCount(0);

    const overlayStyle = await page
      .locator("fig-image > fig-input-file[slot='overlay']")
      .evaluate((element) => {
        const style = getComputedStyle(element);
        const hostStyle = getComputedStyle(element.parentElement as Element);
        return {
          hostDisplay: hostStyle.display,
          opacity: style.opacity,
          gridArea: style.gridArea,
          placeSelf: style.placeSelf,
        };
      });

    expect(overlayStyle).toEqual({
      hostDisplay: "grid",
      opacity: "0",
      gridArea: "media-preview",
      placeSelf: "center",
    });

    await page.locator("fig-image > fig-input-file[slot='overlay'] input[type=file]").focus();
    await expect
      .poll(() =>
        page.locator("fig-image > fig-input-file[slot='overlay']").evaluate((element) =>
          getComputedStyle(element).opacity,
        ),
      )
      .toBe("1");
  });
});
