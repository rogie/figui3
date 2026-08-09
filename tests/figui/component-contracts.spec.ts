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

  test("registers fig-select and renders easing presets without fig-lab", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
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

test.describe("AI lab styling components", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await Promise.all([
        customElements.whenDefined("fig-ai-prompt"),
        customElements.whenDefined("fig-chat-message"),
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
        fillPicker: customElements.get("fig-fill-picker"),
      };

      await import("/fig.js?duplicate-registration=1");
      await import("/fig-lab.js?duplicate-registration=1");
      await import("/fig-editor.js?duplicate-registration=1");

      return {
        button: before.button === customElements.get("fig-button"),
        switch: before.switch === customElements.get("propskit-switch"),
        fillPicker:
          before.fillPicker === customElements.get("fig-fill-picker"),
      };
    });

    expect(result).toEqual({
      button: true,
      switch: true,
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

test.describe("propskit default sizes", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await Promise.all(
        [
          "propskit-switch",
          "propskit-color",
          "propskit-select",
          "propskit-text",
          "propskit-number",
          "propskit-slider",
        ].map((tag) => customElements.whenDefined(tag)),
      );
    });
  });

  test("omitted size matches explicit large styling", async ({ page }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const fixtures: Record<string, string> = {
        "propskit-switch": 'label="Enabled"',
        "propskit-color": 'label="Fill" value="#0D99FF"',
        "propskit-select": 'label="Mode" value="A" options="A,B"',
        "propskit-text": 'label="Name" value="Layer"',
        "propskit-number": 'label="Width" value="24"',
        "propskit-slider": 'label="Opacity" value="50" min="0" max="100"',
      };
      root.innerHTML = Object.entries(fixtures)
        .flatMap(([tag, attrs]) => [
          `<${tag} data-size-case="default" ${attrs}></${tag}>`,
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
        if (!defaultElement || !largeElement) {
          throw new Error(`Missing ${tag} size fixtures`);
        }
        return {
          tag,
          defaultStyle: signature(defaultElement),
          largeStyle: signature(largeElement),
        };
      });

      return {
        styles,
        numberForwardsSize: root
          .querySelector('propskit-number[size="large"] fig-input-number')
          ?.hasAttribute("size"),
        rightSpacing: {
          text: getComputedStyle(
            root.querySelector(
              'propskit-text[data-size-case="large"] fig-input-text',
            )!,
          ).marginRight,
          number: getComputedStyle(
            root.querySelector(
              'propskit-number[data-size-case="large"] fig-input-number',
            )!,
          ).marginRight,
          select: getComputedStyle(
            root.querySelector(
              'propskit-select[data-size-case="large"] fig-select',
            )!,
          ).paddingRight,
        },
      };
    });

    for (const entry of result.styles) {
      expect(entry.defaultStyle, entry.tag).toEqual(entry.largeStyle);
      expect(entry.defaultStyle.paddingTop, entry.tag).toBe("4px");
      expect(entry.defaultStyle.paddingBottom, entry.tag).toBe("4px");
      expect(entry.defaultStyle.height, entry.tag).toBe("40px");
    }
    expect(result.numberForwardsSize).toBe(false);
    expect(result.rightSpacing.text).toBe(result.rightSpacing.number);
    expect(result.rightSpacing.text).toBe(result.rightSpacing.select);
  });
});

test.describe("propskit-color", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-color");
    });
  });

  test("composes and forwards color attributes, events, and focus", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML =
        '<propskit-color label="Fill" value="#0D99FF" alpha="true"></propskit-color>';
    });

    const control = page.locator("propskit-color");
    const field = control.locator("fig-field");
    const colorInput = control.locator("fig-input-color");
    await expect(control.locator("fig-field > label")).toHaveText("Fill");
    await expect(colorInput).toHaveAttribute("value", "#0D99FF");
    await expect(colorInput).toHaveAttribute("alpha", "true");
    await expect(colorInput).toHaveAttribute("text", "true");
    await expect(colorInput.locator("fig-swatch")).toHaveCount(1);
    await expect(colorInput.locator("fig-input-text input")).toHaveValue("0D99FF");
    expect(
      await colorInput
        .locator("fig-input-text input")
        .evaluate((element) => getComputedStyle(element).fieldSizing),
    ).toBe("fixed");
    const hexInput = colorInput.locator("fig-input-text input");
    await colorInput.evaluate((element) => element.setAttribute("value", "#111111"));
    const numericWidth = (await hexInput.boundingBox())?.width;
    await colorInput.evaluate((element) => element.setAttribute("value", "#FFFFFF"));
    const alphaWidth = (await hexInput.boundingBox())?.width;
    expect(alphaWidth).toBe(numericWidth);
    const opacityInput = colorInput.locator("fig-input-number input");
    expect(
      await opacityInput.evaluate((element) => getComputedStyle(element).fieldSizing),
    ).toBe("fixed");
    const opacityWidth = (await opacityInput.boundingBox())?.width;
    await opacityInput.evaluate((element) => {
      (element as HTMLInputElement).value = "1";
    });
    expect((await opacityInput.boundingBox())?.width).toBe(opacityWidth);

    const fieldBox = await field.boundingBox();
    const labelBox = await control.locator("fig-field > label").boundingBox();
    const inputBox = await colorInput.boundingBox();
    expect(inputBox?.height).toBe(fieldBox?.height);
    expect(inputBox?.x).toBeGreaterThanOrEqual(
      (labelBox?.x ?? 0) + (labelBox?.width ?? 0) + 7,
    );
    expect(
      Math.abs(
        (inputBox?.x ?? 0) +
          (inputBox?.width ?? 0) -
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
      const inner = element.querySelector("fig-input-color");
      inner?.setAttribute("value", "#FF00FF");
      inner?.dispatchEvent(
        new CustomEvent("input", {
          detail: { color: "#FF00FF", alpha: 1 },
          bubbles: true,
        }),
      );
      return received;
    });

    expect(events).toEqual([
      { type: "input", detail: { color: "#FF00FF", alpha: 1 } },
    ]);
    await expect(control).toHaveAttribute("value", "#FF00FF");
    await control.evaluate((element) => (element as HTMLElement).focus());
    await expect(colorInput.locator("fig-input-text input")).toBeFocused();
    expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle))
      .toBe("none");
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

test.describe("propskit-select", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
      await customElements.whenDefined("propskit-select");
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

test.describe("fig-select viewport edge repositioning", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.evaluate(async () => {
      await import("/fig-lab.js");
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
    const labelBox = await control.locator("fig-field > label").boundingBox();
    const constrainedInputBox = await textInput.boundingBox();
    expect(constrainedInputBox?.x).toBeGreaterThanOrEqual(
      (labelBox?.x ?? 0) + (labelBox?.width ?? 0) + 7,
    );
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
    await expect(page.locator("propskit-color fig-input-text input")).toBeFocused();

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
      `;
    });

    const padding = await page.evaluate(() => {
      const read = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        const style = getComputedStyle(element);
        return {
          left: style.paddingLeft,
          right: style.paddingRight,
        };
      };
      return {
        default: read("#content-default"),
        padded: read("#content-padded"),
        disabled: read("#content-padding-false"),
      };
    });

    expect(padding.default).toEqual({ left: "0px", right: "0px" });
    expect(padding.padded).toEqual({ left: "16px", right: "16px" });
    expect(padding.disabled).toEqual({ left: "0px", right: "0px" });
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

        const directText = card.querySelector(
          ":scope > .fig-card-text[data-generated]",
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
            directText?.querySelector(":scope > .fig-card-label[data-generated]"),
          ),
          labelTag: directText?.querySelector(".fig-card-label")?.tagName,
          textTag: directText?.tagName,
          labelIsLast: card.lastElementChild === directText,
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
        textTag: "DIV",
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
        textTag: "DIV",
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
        textTag: "DIV",
        labelIsLast: true,
        directMedia: 1,
      },
    ]);
  });

  test("fig-card generates a direct image and label text without a media wrapper", async ({
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
        ></fig-card>
      `;
      await new Promise(requestAnimationFrame);
      const card = root.querySelector("fig-card")!;
      const link = card.querySelector(":scope > .fig-card-link");
      const image = link?.querySelector(
        ":scope > fig-image[data-generated]",
      );
      const text = link?.querySelector(
        ":scope > .fig-card-text[data-generated]",
      );
      return {
        mediaWrappers: card.querySelectorAll(".fig-card-media").length,
        imageIsDirect: image?.parentElement === link,
        textIsDirect: text?.parentElement === link,
        textTag: text?.tagName,
        labelTag: text?.querySelector(".fig-card-label")?.tagName,
        sublabelTag: text?.querySelector(".fig-card-sublabel")?.tagName,
        gap: getComputedStyle(card).gap,
      };
    });

    expect(state).toEqual({
      mediaWrappers: 0,
      imageIsDirect: true,
      textIsDirect: true,
      textTag: "DIV",
      labelTag: "LABEL",
      sublabelTag: "LABEL",
      gap: "4px",
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
          <fig-swatch background="#0D99FF"></fig-swatch>
        </fig-fill-picker>
      `;
    });
    await page.waitForTimeout(100);

    await expect(page.locator("#picker fig-swatch")).toHaveAttribute(
      "aria-label",
      "Open Layer fill",
    );
    await page.locator("#picker fig-swatch").focus();
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

    const firstHandle = page.locator('#curve [data-handle="1"] fig-handle');

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

  test("fig-easing-curve rescales to keep overshooting handles inside the preview", async ({
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
      const handle = host.querySelector('[data-handle="1"]');
      const topBoundary = host.querySelector('[data-boundary="top"]');
      return {
        controlY: Number(host.value.split(",")[1]),
        handleY: Number(handle?.getAttribute("y")),
        handleHeight: Number(handle?.getAttribute("height")),
        previewHeight: svg?.viewBox.baseVal.height ?? 0,
        topBoundaryY: Number(topBoundary?.getAttribute("y1")),
      };
    });

    expect(state.controlY).toBeGreaterThan(1);
    expect(state.handleY).toBeGreaterThanOrEqual(0);
    expect(state.handleY + state.handleHeight).toBeLessThanOrEqual(
      state.previewHeight,
    );
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
