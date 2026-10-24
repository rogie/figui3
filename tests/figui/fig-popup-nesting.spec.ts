import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-popup nested light dismissal", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
  });

  test("keeps a parent open while interacting with its portaled gradient popup", async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(async () => {
      await customElements.whenDefined("fig-popup-gradient");
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <button id="parent-anchor">Open parent</button>
        <button id="outside" style="position:fixed;right:8px;bottom:8px">Outside</button>
        <dialog
          id="parent-popup"
          is="fig-popup"
          anchor="#parent-anchor"
          closedby="any"
        >
          <fig-input-gradient
            id="gradient"
            edit="picker"
            value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#14AE5C","opacity":100}]}}'
          ></fig-input-gradient>
        </dialog>
      `;
      (root.querySelector("#parent-popup") as HTMLElement & {
        open: boolean;
      }).open = true;
    });

    const parent = page.locator("#parent-popup");
    const gradient = page.locator("#gradient");
    await gradient.locator("fig-swatch").click();

    const child = page.locator('dialog[is="fig-popup-gradient"]');
    await expect(child).toHaveAttribute("open", "true");
    await child.locator(".fig-fill-picker-gradient-rotate").click();
    await expect(parent).toHaveAttribute("open", "true");
    await expect(child).toHaveAttribute("open", "true");

    await child.evaluate((popup: HTMLElement & { open: boolean }) => {
      popup.open = false;
    });
    await expect(child).not.toHaveAttribute("open");
    await expect(parent).toHaveAttribute("open", "true");

    await gradient.locator("fig-swatch").click();
    await page.locator("#outside").click();
    await expect(child).not.toHaveAttribute("open");
    await expect(parent).not.toHaveAttribute("open");
  });

  test("supports a recursive chain of anchored popups in the overlay root", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <button id="root-anchor" style="position:fixed;left:80px;top:80px">Open root</button>
        <button id="outside" style="position:fixed;right:8px;bottom:8px">Outside</button>
        <dialog id="root-popup" is="fig-popup" anchor="#root-anchor" position="bottom left" offset="0 8" closedby="any">
          <button id="child-anchor">Open child</button>
        </dialog>
      `;

      const overlayRoot =
        document.querySelector("[data-figui-overlay-root]") ??
        document.body.appendChild(document.createElement("div"));
      overlayRoot.setAttribute("data-figui-overlay-root", "");

      const createPopup = (id: string, anchor: Element, content: string) => {
        const popup = document.createElement("dialog", {
          is: "fig-popup",
        }) as HTMLDialogElement & { anchor: Element };
        popup.id = id;
        popup.setAttribute("is", "fig-popup");
        popup.setAttribute("closedby", "any");
        popup.setAttribute("popover", "manual");
        popup.setAttribute("position", "bottom left");
        popup.setAttribute("offset", "0 8");
        popup.anchor = anchor;
        popup.innerHTML = content;
        overlayRoot.append(popup);
        return popup;
      };

      const rootPopup = root.querySelector("#root-popup") as HTMLElement & {
        open: boolean;
      };
      rootPopup.open = true;
      const child = createPopup(
        "child-popup",
        root.querySelector("#child-anchor")!,
        '<button id="grandchild-anchor">Open grandchild</button>',
      );
      child.open = true;
      const grandchild = createPopup(
        "grandchild-popup",
        child.querySelector("#grandchild-anchor")!,
        '<button id="grandchild-action">Interact</button>',
      );
      grandchild.open = true;
    });

    const root = page.locator("#root-popup");
    const child = page.locator("#child-popup");
    const grandchild = page.locator("#grandchild-popup");

    await page.locator("#grandchild-action").dispatchEvent("pointerdown");
    await page.locator("#grandchild-action").dispatchEvent("pointerup");
    await page.locator("#grandchild-action").dispatchEvent("click");
    await expect(root).toHaveAttribute("open", "true");
    await expect(child).toHaveAttribute("open", "true");
    await expect(grandchild).toHaveAttribute("open", "true");

    await grandchild.evaluate((popup: HTMLElement & { open: boolean }) => {
      popup.open = false;
    });
    await expect(grandchild).not.toHaveAttribute("open");
    await expect(child).toHaveAttribute("open", "true");
    await expect(root).toHaveAttribute("open", "true");

    await page.locator("#outside").click();
    await expect(child).not.toHaveAttribute("open");
    await expect(root).not.toHaveAttribute("open");
  });

  test("preserves standalone closedby modes", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <button id="anchor">Anchor</button>
        <button id="outside" style="position:fixed;right:8px;bottom:8px">Outside</button>
        <dialog id="any" is="fig-popup" anchor="#anchor" closedby="any">Any</dialog>
        <dialog id="request" is="fig-popup" anchor="#anchor" closedby="closerequest">Request</dialog>
        <dialog id="none" is="fig-popup" anchor="#anchor" closedby="none">None</dialog>
      `;
    });

    const outside = page.locator("#outside");
    const any = page.locator("#any");
    const request = page.locator("#request");
    const none = page.locator("#none");

    await any.evaluate((popup: HTMLElement & { open: boolean }) => {
      popup.open = true;
    });
    await outside.click();
    await expect(any).not.toHaveAttribute("open");

    await request.evaluate((popup: HTMLElement & { open: boolean }) => {
      popup.open = true;
    });
    await outside.click();
    await expect(request).toHaveAttribute("open", "true");
    await page.keyboard.press("Escape");
    await expect(request).not.toHaveAttribute("open");

    await none.evaluate((popup: HTMLElement & { open: boolean }) => {
      popup.open = true;
    });
    await outside.click();
    await page.keyboard.press("Escape");
    await expect(none).toHaveAttribute("open", "true");
  });
});
