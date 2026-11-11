import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("PropsKit", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig.css" });
  });

  test("renders core controls, nested groups, and number renderers", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const kit = figCreateProps("Appearance", {
        opacity: 75,
        width: {
          type: "number",
          control: "number",
          default: 320,
          units: "px",
        },
        offset: {
          type: "number",
          control: "slider",
          variant: "delta",
          default: 0,
        },
        sliderStepper: {
          type: "number",
          stepper: true,
          default: 50,
          step: 25,
        },
        steps: {
          type: "number",
          control: "number",
          default: 50,
          step: 25,
        },
        continuous: {
          type: "number",
          control: "number",
          stepper: false,
          default: 25,
        },
        visible: true,
        title: "Hello",
        layout: {
          _collapsed: true,
          alignment: {
            type: "options",
            default: "Center",
            options: ["Left", "Center", "Right"],
          },
        },
      });
      const root = figCreatePropsRoot({ target, panelIds: [kit.id] });
      return {
        values: kit.values,
        propertyRegistered: Boolean(customElements.get("fig-property")),
        editorOnlyRegistered: Boolean(customElements.get("fig-select")),
        markup: root.element.innerHTML,
        numberSteppers: {
          steps: root.element
            .querySelector('fig-input-number[data-propskit-path="steps"]')
            ?.querySelectorAll(".fig-steppers").length,
          continuous: root.element
            .querySelector('fig-input-number[data-propskit-path="continuous"]')
            ?.querySelectorAll(".fig-steppers").length,
        },
        sliderStepperType: root.element
          .querySelector('fig-slider[data-propskit-path="sliderStepper"]')
          ?.getAttribute("type"),
      };
    });

    expect(result.propertyRegistered).toBe(true);
    expect(result.editorOnlyRegistered).toBe(false);
    expect(result.values).toEqual({
      opacity: 75,
      width: 320,
      offset: 0,
      sliderStepper: 50,
      steps: 50,
      continuous: 25,
      visible: true,
      title: "Hello",
      layout: { alignment: "Center" },
    });
    expect(result.markup).toContain("<fig-property");
    expect(result.markup).toContain("<fig-slider");
    expect(result.markup).toContain('type="delta"');
    expect(result.markup).toContain("<fig-input-number");
    expect(result.markup).toContain("<fig-group");
    expect(result.numberSteppers).toEqual({
      steps: 1,
      continuous: 0,
    });
    expect(result.sliderStepperType).toBe("stepper");
  });

  test("maps color alpha without authoring text", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const kit = figCreateProps("Colors", {
        surface: {
          type: "color",
          default: "#F5F5F5",
        },
        overlay: {
          type: "color",
          default: "#00000080",
          alpha: true,
        },
      });
      const root = figCreatePropsRoot({
        target: document.querySelector("#fixture-root"),
        panelIds: [kit.id],
      });
      return {
        surfaceText: root.element
          .querySelector('fig-input-color[data-propskit-path="surface"]')
          ?.getAttribute("text"),
        overlayText: root.element
          .querySelector('fig-input-color[data-propskit-path="overlay"]')
          ?.getAttribute("text"),
        overlayAlpha: root.element
          .querySelector('fig-input-color[data-propskit-path="overlay"]')
          ?.hasAttribute("alpha"),
      };
    });

    expect(result).toEqual({
      surfaceText: null,
      overlayText: null,
      overlayAlpha: true,
    });
  });

  test("only makes nested groups collapsible when _collapsed is provided", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const kit = figCreateProps(null, {
        staticGroup: { value: "Static" },
        openGroup: { _collapsed: false, value: "Open" },
        closedGroup: { _collapsed: true, value: "Closed" },
      });
      const root = figCreatePropsRoot({ target, panelIds: [kit.id] });
      return Array.from(root.element.querySelectorAll("fig-group"), (group) => ({
        name: group.getAttribute("name"),
        collapsible: group.hasAttribute("collapsible"),
        open: group.getAttribute("open"),
      }));
    });

    expect(result).toEqual([
      { name: "Static Group", collapsible: false, open: null },
      { name: "Open Group", collapsible: true, open: "true" },
      { name: "Closed Group", collapsible: true, open: "false" },
    ]);
  });

  test("mounts unnamed props directly without sharing events", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const kits = [null, "", "   "].map((name, index) =>
        figCreateProps(name, { value: `Value ${index + 1}` }),
      );
      const root = figCreatePropsRoot({
        target,
        panelIds: kits.map((kit) => kit.id),
      });
      const controls = root.element.querySelectorAll(
        '[data-propskit-path="value"]',
      );
      controls[0].dispatchEvent(
        new CustomEvent("input", {
          detail: "Changed",
          bubbles: true,
        }),
      );
      return {
        childTags: Array.from(root.element.children, (element) =>
          element.tagName.toLowerCase(),
        ),
        panelCount: root.element.querySelectorAll(".propskit-panel").length,
        values: kits.map((kit) => kit.values),
      };
    });

    expect(result).toEqual({
      childTags: ["fig-property", "fig-property", "fig-property"],
      panelCount: 0,
      values: [
        { value: "Changed" },
        { value: "Value 2" },
        { value: "Value 3" },
      ],
    });
  });

  test("subscribes to live and committed changes and synchronizes updates", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const interactions: unknown[] = [];
      const snapshots: unknown[] = [];
      const changes: unknown[] = [];
      const kit = figCreateProps(
        "State",
        { opacity: [50, 0, 100, 1], enabled: true },
        {
          onInput: (path: string, value: unknown) =>
            interactions.push({ phase: "input", path, value }),
          onChange: (path: string, value: unknown) =>
            interactions.push({ phase: "change", path, value }),
        },
      );
      const root = figCreatePropsRoot({ target, panelIds: [kit.id] });
      kit.subscribe((values: unknown) => snapshots.push(values));
      kit.subscribe((records: unknown) => changes.push(records), {
        mode: "changes",
      });
      const slider = root.element.querySelector(
        '[data-propskit-path="opacity"]',
      ) as HTMLElement;
      slider.dispatchEvent(
        new CustomEvent("input", { detail: 64, bubbles: true }),
      );
      slider.dispatchEvent(
        new CustomEvent("change", { detail: 72, bubbles: true }),
      );
      kit.setValues({ enabled: false });
      const afterSet = kit.values;
      kit.resetValues();
      return {
        afterSet,
        reset: kit.values,
        interactions,
        snapshots,
        changes,
        reflected: root.element
          .querySelector('fig-switch[data-propskit-path="enabled"]')
          ?.hasAttribute("checked"),
      };
    });

    expect(result.afterSet).toEqual({ opacity: 72, enabled: false });
    expect(result.reset).toEqual({ opacity: 50, enabled: true });
    expect(result.interactions).toEqual([
      { phase: "input", path: "opacity", value: 64 },
      { phase: "change", path: "opacity", value: 72 },
    ]);
    expect(result.snapshots.length).toBeGreaterThanOrEqual(5);
    expect(result.changes.length).toBeGreaterThanOrEqual(4);
    expect(result.reflected).toBe(true);
  });

  test("renders selectable image and video options in choosers", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const actionValues: unknown[] = [];
      const kit = figCreateProps("Media", {
        emptyImage: { type: "image" },
        hero: { type: "image", default: "/one.webp" },
        gallery: {
          type: "image",
          options: [
            { value: "/one.webp", label: "One" },
            { value: "/two.webp", label: "Two" },
          ],
        },
        reel: {
          type: "video",
          options: ["/one.mp4", "/two.mp4"],
          default: "/two.mp4",
        },
        save: {
          type: "action",
          label: "Save",
          variant: "primary",
          onClick: ({ values }: { values: unknown }) =>
            actionValues.push(values),
        },
      });
      const root = figCreatePropsRoot({ target, panelIds: [kit.id] });
      (
        root.element.querySelector(
          '[data-propskit-action="save"]',
        ) as HTMLElement
      ).click();
      const gallery = root.element.querySelector(
        '[data-propskit-media-choice="gallery"]',
      ) as HTMLElement;
      const firstGalleryImage = gallery.querySelector(
        'fig-image[value="/one.webp"]',
      );
      const initialGalleryValue = gallery.getAttribute("value");
      (
        gallery.querySelector('fig-image[value="/two.webp"]') as HTMLElement
      ).click();
      const selectedGalleryValue = kit.values.gallery;
      const galleryAfterSelection = root.element.querySelector(
        '[data-propskit-media-choice="gallery"]',
      );
      const selectionPreservedMedia =
        galleryAfterSelection === gallery &&
        galleryAfterSelection?.querySelector(
          'fig-image[value="/one.webp"]',
        ) === firstGalleryImage;
      kit.setValue("gallery", "/three.webp");
      const updatedGallery = root.element.querySelector(
        '[data-propskit-media-choice="gallery"]',
      ) as HTMLElement;
      return {
        actionValues,
        chooserCount: root.element.querySelectorAll(
          ".propskit-media-chooser",
        ).length,
        galleryStructure: {
          layout: gallery.getAttribute("layout"),
          columns: gallery.getAttribute("columns"),
          overflow: gallery.getAttribute("overflow"),
          choiceElement: gallery.getAttribute("choice-element"),
          wrappedChoices: gallery.querySelectorAll("fig-choice").length,
          fits: Array.from(
            gallery.querySelectorAll(
              "fig-image:not([data-propskit-media-upload])",
            ),
            (image) => image.getAttribute("fit"),
          ),
          checkerboards: Array.from(
            gallery.querySelectorAll("fig-image"),
            (image) => image.hasAttribute("checkerboard"),
          ),
        },
        initialGalleryValue,
        selectedGalleryValue,
        selectionPreservedMedia,
        updatedGalleryValue: updatedGallery.getAttribute("value"),
        updatedGalleryChoices: updatedGallery.querySelectorAll(
          "fig-image:not([data-propskit-media-upload])",
        ).length,
        videoChoices: root.element.querySelectorAll(
          '[data-propskit-media-choice="reel"] fig-video:not([data-propskit-media-upload])',
        ).length,
        videoFits: Array.from(
          root.element.querySelectorAll(
            '[data-propskit-media-choice="reel"] fig-video:not([data-propskit-media-upload])',
          ),
          (video) => video.getAttribute("fit"),
        ),
        videoCheckerboards: Array.from(
          root.element.querySelectorAll(
            '[data-propskit-media-choice="reel"] fig-video',
          ),
          (video) => video.hasAttribute("checkerboard"),
        ),
        heroChooser: Boolean(
          root.element.querySelector(
            '[data-propskit-path="hero"] fig-chooser',
          ),
        ),
        emptyImageCheckerboard: root.element
          .querySelector(
            '[data-propskit-path="emptyImage"] fig-image',
          )
          ?.hasAttribute("checkerboard"),
        columns: {
          empty: root.element
            .querySelector('[data-propskit-media-choice="emptyImage"]')
            ?.getAttribute("columns"),
          hero: root.element
            .querySelector('[data-propskit-media-choice="hero"]')
            ?.getAttribute("columns"),
          gallery: gallery.getAttribute("columns"),
          reel: root.element
            .querySelector('[data-propskit-media-choice="reel"]')
            ?.getAttribute("columns"),
        },
        uploadTiles: {
          images: root.element.querySelectorAll(
            "fig-image[data-propskit-media-upload][upload][multiple][checkerboard]",
          ).length,
          videos: root.element.querySelectorAll(
            "fig-video[data-propskit-media-upload][upload][multiple][checkerboard]",
          ).length,
        },
        uploadModes: {
          images: Array.from(
            root.element.querySelectorAll(
              "fig-image[data-propskit-media-upload]",
            ),
            (image) => image.getAttribute("upload"),
          ),
          videos: Array.from(
            root.element.querySelectorAll(
              "fig-video[data-propskit-media-upload]",
            ),
            (video) => video.getAttribute("upload"),
          ),
        },
        sourceUploadModes: {
          images: Array.from(
            root.element.querySelectorAll(
              "fig-image[src]",
            ),
            (image) => image.getAttribute("upload"),
          ),
          videos: Array.from(
            root.element.querySelectorAll(
              "fig-video[src]",
            ),
            (video) => video.getAttribute("upload"),
          ),
        },
        uploadTilesFirst: Array.from(
          root.element.querySelectorAll("[data-propskit-media-choice]"),
          (chooser) =>
            (chooser.firstElementChild as HTMLElement)?.hasAttribute(
              "data-propskit-media-upload",
            ),
        ),
        values: kit.values,
      };
    });

    expect(result.actionValues).toHaveLength(1);
    expect(result.chooserCount).toBe(4);
    expect(result.galleryStructure).toEqual({
      layout: "grid",
      columns: "2",
      overflow: "scrollbar",
      choiceElement: "fig-image:not([data-propskit-media-upload])",
      wrappedChoices: 0,
      fits: ["cover", "cover"],
      checkerboards: [true, true, true],
    });
    expect(result.initialGalleryValue).toBe("/one.webp");
    expect(result.selectedGalleryValue).toBe("/two.webp");
    expect(result.selectionPreservedMedia).toBe(true);
    expect(result.updatedGalleryValue).toBe("/three.webp");
    expect(result.updatedGalleryChoices).toBe(3);
    expect(result.videoChoices).toBe(2);
    expect(result.videoFits).toEqual(["cover", "cover"]);
    expect(result.videoCheckerboards).toEqual([true, true, true]);
    expect(result.heroChooser).toBe(true);
    expect(result.emptyImageCheckerboard).toBe(true);
    expect(result.columns).toEqual({
      empty: "1",
      hero: "2",
      gallery: "2",
      reel: "2",
    });
    expect(result.uploadTiles).toEqual({
      images: 3,
      videos: 1,
    });
    expect(result.uploadModes).toEqual({
      images: ["icon", "icon", "icon"],
      videos: ["icon"],
    });
    expect(result.sourceUploadModes).toEqual({
      images: ["icon", "icon", "icon", "icon"],
      videos: ["icon", "icon"],
    });
    expect(result.uploadTilesFirst).toEqual([true, true, true, true]);
    expect(result.values).toEqual({
      emptyImage: "",
      hero: "/one.webp",
      gallery: "/three.webp",
      reel: "/two.mp4",
    });
  });

  test("removes cleared image and video options from choosers", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const kit = figCreateProps("Media", {
        gallery: {
          type: "image",
          options: ["/one.webp", "/two.webp"],
          default: "/one.webp",
        },
        reel: {
          type: "video",
          options: ["/one.mp4", "/two.mp4"],
          default: "/two.mp4",
        },
      });
      const root = figCreatePropsRoot({
        target: document.querySelector("#fixture-root"),
        panelIds: [kit.id],
      });
      const clearMedia = (selector: string) => {
        const input = root.element.querySelector(
          `${selector} fig-input-file[data-generated]`,
        ) as HTMLElement;
        input.dispatchEvent(
          new CustomEvent("change", {
            bubbles: true,
            detail: { cleared: true },
          }),
        );
      };

      clearMedia('fig-image[value="/two.webp"]');
      clearMedia('fig-video[value="/two.mp4"]');
      kit.setValue("gallery", "/three.webp");

      return {
        galleryValue: kit.values.gallery,
        galleryOptions: Array.from(
          root.element.querySelectorAll(
            '[data-propskit-media-choice="gallery"] fig-image[value]',
          ),
          (media) => media.getAttribute("value"),
        ),
        reelValue: kit.values.reel,
        reelOptions: Array.from(
          root.element.querySelectorAll(
            '[data-propskit-media-choice="reel"] fig-video[value]',
          ),
          (media) => media.getAttribute("value"),
        ),
      };
    });

    expect(result).toEqual({
      galleryValue: "/three.webp",
      galleryOptions: ["/one.webp", "/three.webp"],
      reelValue: "",
      reelOptions: ["/one.mp4"],
    });
  });

  test("renders audio values with fig-input-file", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const kit = figCreateProps("Audio", {
        emptyAudio: { type: "audio" },
        audioUrl: {
          type: "audio",
          default: "/audio/example.mp3",
        },
      });
      const root = figCreatePropsRoot({
        target: document.querySelector("#fixture-root"),
        panelIds: [kit.id],
      });
      const audioUrl = root.element.querySelector(
        '[data-propskit-path="audioUrl"] fig-input-file',
      ) as HTMLElement;
      const initial = {
        figAudioCount: root.element.querySelectorAll("fig-audio").length,
        inputCount: root.element.querySelectorAll("fig-input-file").length,
        url: audioUrl.getAttribute("url"),
        filename: audioUrl.getAttribute("filename"),
        preview: audioUrl.getAttribute("preview"),
        upload: audioUrl.getAttribute("upload"),
      };

      audioUrl.dispatchEvent(
        new CustomEvent("change", {
          detail: { files: null, cleared: true },
          bubbles: true,
        }),
      );
      const afterClear = kit.values.audioUrl;
      const emptyAudio = root.element.querySelector(
        '[data-propskit-path="emptyAudio"] fig-input-file',
      ) as HTMLElement;
      emptyAudio.dispatchEvent(
        new CustomEvent("change", {
          detail: {
            files: [
              new File(["audio"], "uploaded.mp3", { type: "audio/mpeg" }),
            ],
          },
          bubbles: true,
        }),
      );

      return {
        initial,
        afterClear,
        afterUpload: kit.values.emptyAudio,
      };
    });

    expect(result.initial).toEqual({
      figAudioCount: 0,
      inputCount: 2,
      url: "/audio/example.mp3",
      filename: "example.mp3",
      preview: "true",
      upload: null,
    });
    expect(result.afterClear).toBe("");
    expect(result.afterUpload).toMatch(/^blob:/);
  });

  test("keeps programmatic updates separate from input and change callbacks", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const interactions: unknown[] = [];
      const kit = figCreateProps(
        "Phases",
        { opacity: [50, 0, 100, 1] },
        {
          onInput: (path: string, value: unknown) =>
            interactions.push({ phase: "input", path, value }),
          onChange: (path: string, value: unknown) =>
            interactions.push({ phase: "change", path, value }),
        },
      );
      const root = figCreatePropsRoot({ target, panelIds: [kit.id] });

      kit.setValue("opacity", 60);
      kit.setValues({ opacity: 70 });
      kit.resetValues();
      const afterProgrammaticUpdates = [...interactions];

      const slider = root.element.querySelector(
        '[data-propskit-path="opacity"]',
      ) as HTMLElement;
      slider.dispatchEvent(
        new CustomEvent("input", { detail: 64, bubbles: true }),
      );
      slider.dispatchEvent(
        new CustomEvent("change", { detail: 72, bubbles: true }),
      );

      return {
        afterProgrammaticUpdates,
        interactions,
        values: kit.values,
      };
    });

    expect(result.afterProgrammaticUpdates).toEqual([]);
    expect(result.interactions).toEqual([
      { phase: "input", path: "opacity", value: 64 },
      { phase: "change", path: "opacity", value: 72 },
    ]);
    expect(result.values).toEqual({ opacity: 72 });
  });

  test("uses an explicit joystick unit scale with a percent-compatible default", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const kit = figCreateProps("Joystick units", {
        percent: { type: "joystick" },
        normalized: { type: "joystick", unitScale: 1 },
      });
      const root = figCreatePropsRoot({
        target: document.querySelector("#fixture-root"),
        panelIds: [kit.id],
      });
      const percent = root.element.querySelector(
        'fig-joystick[data-propskit-path="percent"]',
      ) as HTMLElement;
      const normalized = root.element.querySelector(
        'fig-joystick[data-propskit-path="normalized"]',
      ) as HTMLElement;
      const defaults = kit.values;
      const initialAttributes = [
        percent.getAttribute("value"),
        normalized.getAttribute("value"),
      ];

      percent.dispatchEvent(
        new CustomEvent("input", {
          detail: { x: 0.25, y: 0.75 },
          bubbles: true,
        }),
      );
      normalized.dispatchEvent(
        new CustomEvent("input", {
          detail: { x: 0.25, y: 0.75 },
          bubbles: true,
        }),
      );
      const afterInput = kit.values;
      kit.setValue("normalized", { x: 0.8, y: 0.2 });

      return {
        defaults,
        initialAttributes,
        afterInput,
        normalizedAttribute: normalized.getAttribute("value"),
      };
    });

    expect(result).toEqual({
      defaults: {
        percent: { x: 50, y: 50 },
        normalized: { x: 0.5, y: 0.5 },
      },
      initialAttributes: ["50% 50%", "50% 50%"],
      afterInput: {
        percent: { x: 25, y: 75 },
        normalized: { x: 0.25, y: 0.75 },
      },
      normalizedAttribute: "80% 20%",
    });
  });

  test("commits media loaded and file-add paths once through their paired handlers", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const changes: unknown[] = [];
      const kit = figCreateProps(
        "Media ordering",
        {
          hero: {
            type: "image",
            default: "/one.webp",
          },
          gallery: {
            type: "image",
            options: ["/one.webp", "/two.webp"],
          },
        },
        {
          onChange: (path: string, value: unknown) =>
            changes.push({ path, value }),
        },
      );
      const root = figCreatePropsRoot({ target, panelIds: [kit.id] });
      const media = root.element.querySelector(
        '[data-propskit-media-add="hero"]',
      ) as HTMLElement;

      media.dispatchEvent(
        new CustomEvent("loaded", {
          detail: {
            file: new File(["hero"], "hero.png", { type: "image/png" }),
          },
          bubbles: true,
        }),
      );
      media.dispatchEvent(new CustomEvent("change", { bubbles: true }));

      const add = root.element.querySelector(
        '[data-propskit-media-add="gallery"]:not([data-propskit-media-index])',
      ) as HTMLElement;
      add.dispatchEvent(
        new CustomEvent("change", {
          detail: {
            files: [
              new File(["image-1"], "added-1.png", { type: "image/png" }),
              new File(["image-2"], "added-2.png", { type: "image/png" }),
            ],
          },
          bubbles: true,
        }),
      );

      const galleryChooser = root.element.querySelector(
        '[data-propskit-media-choice="gallery"]',
      ) as HTMLElement;
      const uploadedChoices = Array.from(
        galleryChooser.querySelectorAll(
          "fig-image:not([data-propskit-media-upload])",
        ),
        (choice) => choice.getAttribute("src"),
      ).filter((src) => src?.startsWith("blob:"));
      const orderedChoices = Array.from(
        galleryChooser.querySelectorAll(
          "fig-image:not([data-propskit-media-upload])",
        ),
        (choice) => choice.getAttribute("src"),
      );
      const firstUploadedValue = kit.values.gallery;
      galleryChooser.setAttribute("value", uploadedChoices[1] as string);
      galleryChooser.dispatchEvent(
        new CustomEvent("change", {
          detail: uploadedChoices[1],
          bubbles: true,
        }),
      );

      return {
        changes,
        values: kit.values,
        heroValue: kit.values.hero,
        firstUploadedValue,
        uploadedChoices,
        orderedChoices,
        galleryChoiceCount: galleryChooser.querySelectorAll(
          "fig-image:not([data-propskit-media-upload])",
        ).length,
        galleryTileCount: galleryChooser.querySelectorAll("fig-image").length,
        galleryValue: galleryChooser.getAttribute("value"),
        galleryColumns: galleryChooser.getAttribute("columns"),
        uploadMultiple: (
          galleryChooser.querySelector(
            "[data-propskit-media-upload] input[type=file]",
          ) as HTMLInputElement
        )?.multiple,
      };
    });

    expect(result.changes).toHaveLength(3);
    expect(result.changes[0]).toMatchObject({
      path: "hero",
      value: expect.stringMatching(/^blob:/),
    });
    expect(result.changes[1]).toMatchObject({
      path: "gallery",
      value: expect.stringMatching(/^blob:/),
    });
    expect(result.changes[2]).toEqual({
      path: "gallery",
      value: result.uploadedChoices[1],
    });
    expect(result.values).toMatchObject({
      hero: result.heroValue,
      gallery: result.uploadedChoices[1],
    });
    expect(result.heroValue).toMatch(/^blob:/);
    expect(result.uploadedChoices).toHaveLength(2);
    expect(result.orderedChoices.slice(0, 2)).toEqual(result.uploadedChoices);
    expect(result.firstUploadedValue).toBe(result.uploadedChoices[0]);
    expect(result.galleryChoiceCount).toBe(4);
    expect(result.galleryTileCount).toBe(5);
    expect(result.galleryValue).toBe(result.uploadedChoices[1]);
    expect(result.galleryColumns).toBe("2");
    expect(result.uploadMultiple).toBe(true);
  });

  test("owns and revokes only the blob URLs it creates for media state", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const created: string[] = [];
      const revoked: string[] = [];
      const originalCreate = URL.createObjectURL;
      const originalRevoke = URL.revokeObjectURL;
      URL.createObjectURL = () => {
        const url = `blob:propskit-owned-${created.length + 1}`;
        created.push(url);
        return url;
      };
      URL.revokeObjectURL = (url) => revoked.push(url);
      try {
        const kit = figCreateProps("Media ownership", {
          hero: { type: "image", default: "/hero.webp" },
        });
        const root = figCreatePropsRoot({
          target: document.querySelector("#fixture-root"),
          panelIds: [kit.id],
        });
        const media = root.element.querySelector(
          '[data-propskit-media-add="hero"]',
        ) as HTMLElement;
        media.dispatchEvent(
          new CustomEvent("loaded", {
            detail: {
              file: new File(["image-1"], "hero-1.png", {
                type: "image/png",
              }),
              files: [
                new File(["image-1"], "hero-1.png", { type: "image/png" }),
                new File(["image-2"], "hero-2.png", { type: "image/png" }),
              ],
              src: "blob:component-owned",
            },
            bubbles: true,
          }),
        );
        const afterLoad = kit.values;
        const chooser = root.element.querySelector(
          '[data-propskit-media-choice="hero"]',
        ) as HTMLElement;
        chooser.setAttribute("value", created[1]);
        chooser.dispatchEvent(new CustomEvent("change", { bubbles: true }));
        const revokedAfterSelection = [...revoked];
        kit.setValue("hero", "/replacement.webp");
        const revokedAfterReplacement = [...revoked];
        root.destroy();
        kit.destroy();
        return {
          created,
          revoked,
          revokedAfterSelection,
          revokedAfterReplacement,
          afterLoad,
        };
      } finally {
        URL.createObjectURL = originalCreate;
        URL.revokeObjectURL = originalRevoke;
      }
    });

    expect(result).toEqual({
      created: ["blob:propskit-owned-1", "blob:propskit-owned-2"],
      revoked: ["blob:propskit-owned-1", "blob:propskit-owned-2"],
      revokedAfterSelection: [],
      revokedAfterReplacement: [],
      afterLoad: { hero: "blob:propskit-owned-1" },
    });
  });

  test("recovers event handling after a failed programmatic control sync", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const interactions: unknown[] = [];
      const kit = figCreateProps(
        "Echo recovery",
        { opacity: [10, 0, 100, 1] },
        {
          onInput: (path: string, value: unknown) =>
            interactions.push({ path, value }),
        },
      );
      const root = figCreatePropsRoot({ target, panelIds: [kit.id] });
      const slider = root.element.querySelector(
        'fig-slider[data-propskit-path="opacity"]',
      ) as HTMLElement;
      const setAttribute = slider.setAttribute.bind(slider);
      let injectedFailure = false;
      slider.setAttribute = (name: string, value: string) => {
        setAttribute(name, value);
        if (name === "value" && value === "20" && !injectedFailure) {
          injectedFailure = true;
          slider.dispatchEvent(
            new CustomEvent("input", { detail: 999, bubbles: true }),
          );
          throw new Error("injected sync failure");
        }
      };

      let programmaticUpdateThrew = false;
      try {
        kit.setValue("opacity", 20);
      } catch {
        programmaticUpdateThrew = true;
      }
      slider.dispatchEvent(
        new CustomEvent("input", { detail: 30, bubbles: true }),
      );

      return {
        programmaticUpdateThrew,
        interactions,
        values: kit.values,
      };
    });

    expect(result.programmaticUpdateThrew).toBe(true);
    expect(result.interactions).toEqual([{ path: "opacity", value: 30 }]);
    expect(result.values).toEqual({ opacity: 30 });
  });

  test("allows repeated controller and root destruction", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const first = figCreateProps("First destroy", { enabled: true });
      const firstRoot = figCreatePropsRoot({
        target,
        panelIds: [first.id],
      });

      first.destroy();
      first.destroy();
      firstRoot.destroy();
      firstRoot.destroy();

      const second = figCreateProps("Second destroy", { enabled: true });
      const secondRoot = figCreatePropsRoot({
        target,
        panelIds: [second.id],
      });
      secondRoot.destroy();
      secondRoot.destroy();
      second.destroy();
      second.destroy();

      first.setValue("enabled", false);
      second.resetValues();
      return {
        roots: document.querySelectorAll(".propskit-root").length,
      };
    });

    expect(result).toEqual({
      roots: 0,
    });
  });

  test("preserves unrelated panel state and behavior across registry changes", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const target = document.querySelector("#fixture-root");
      const interactions: unknown[] = [];
      const stable = figCreateProps(
        "Stable panel",
        { opacity: [10, 0, 100, 1] },
        {
          onInput: (path: string, value: unknown) =>
            interactions.push({ path, value }),
        },
      );
      const root = figCreatePropsRoot({ target });
      stable.setValue("opacity", 20);
      const stablePanel = root.element.querySelector(
        ':scope > fig-group[name="Stable panel"]',
      ) as HTMLElement;
      const stableControl = stablePanel.querySelector(
        '[data-propskit-path="opacity"]',
      );
      stablePanel.setAttribute("open", "false");

      const temporary = figCreateProps("Temporary panel", { enabled: true });
      const afterAdd = Array.from(
        root.element.querySelectorAll(":scope > fig-group"),
        (element) => element.getAttribute("name"),
      );
      const sameAfterAdd =
        stablePanel ===
          root.element.querySelector(
            ':scope > fig-group[name="Stable panel"]',
          ) &&
        stableControl ===
          root.element.querySelector(
            '[data-propskit-path="opacity"]',
          ) &&
        stablePanel.getAttribute("open") === "false";
      (
        root.element.querySelector(
          '[data-propskit-path="opacity"]',
        ) as HTMLElement
      ).dispatchEvent(
        new CustomEvent("input", { detail: 30, bubbles: true }),
      );

      temporary.destroy();
      const afterRemove = Array.from(
        root.element.querySelectorAll(":scope > fig-group"),
        (element) => element.getAttribute("name"),
      );
      const sameAfterRemove =
        stablePanel ===
          root.element.querySelector(
            ':scope > fig-group[name="Stable panel"]',
          ) &&
        stableControl ===
          root.element.querySelector(
            '[data-propskit-path="opacity"]',
          ) &&
        stablePanel.getAttribute("open") === "false";
      (
        root.element.querySelector(
          '[data-propskit-path="opacity"]',
        ) as HTMLElement
      ).dispatchEvent(
        new CustomEvent("input", { detail: 40, bubbles: true }),
      );

      return {
        afterAdd,
        afterRemove,
        sameAfterAdd,
        sameAfterRemove,
        interactions,
        values: stable.values,
      };
    });

    expect(result.afterAdd).toEqual(["Stable panel", "Temporary panel"]);
    expect(result.afterRemove).toEqual(["Stable panel"]);
    expect(result.sameAfterAdd).toBe(true);
    expect(result.sameAfterRemove).toBe(true);
    expect(result.interactions).toEqual([
      { path: "opacity", value: 30 },
      { path: "opacity", value: 40 },
    ]);
    expect(result.values).toEqual({ opacity: 40 });
  });

  test("enforces compiled paths, value shapes, media limits, and immutable config", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { figCreateProps, figCreatePropsRoot } = await import(
        "/propskit.js"
      );
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...values) => warnings.push(values.join(" "));
      try {
        const config = {
          group: {
            amount: {
              type: "number",
              default: 5,
              min: 0,
              max: 10,
            },
          },
          choice: {
            type: "options",
            default: "left",
            options: [
              { value: "left", label: "Left aligned" },
              { value: "right", label: "Right aligned" },
            ],
          },
          playlist: {
            type: "audio",
            multiple: true,
            default: [],
            maxItems: 2,
          },
        };
        const kit = figCreateProps("Strict", config);
        const root = figCreatePropsRoot({
          target: document.querySelector("#fixture-root"),
          panelIds: [kit.id],
        });

        config.group.amount.default = 9;
        kit.setValue("missing", true);
        kit.setValue("group.amount", 100);
        kit.setValue("group.amount", "invalid");
        kit.setValues({ group: "invalid" });
        kit.setValue("playlist", ["one", "two", "three"]);

        const options = root.element.querySelector(
          'fig-options[data-propskit-path="choice"]',
        ) as HTMLElement & {
          options: Array<string | { value: string; label: string }>;
        };
        return {
          values: kit.values,
          options: options.options,
          segments: Array.from(
            options.querySelectorAll("fig-segment"),
            (segment) => ({
              value: segment.getAttribute("value"),
              label: segment.textContent,
            }),
          ),
          warnings,
        };
      } finally {
        console.warn = originalWarn;
      }
    });

    expect(result.values).toEqual({
      group: { amount: 10 },
      choice: "left",
      playlist: ["one", "two"],
    });
    expect(result.options).toEqual([
      { value: "left", label: "Left aligned" },
      { value: "right", label: "Right aligned" },
    ]);
    expect(result.segments).toEqual([
      { value: "left", label: "Left aligned" },
      { value: "right", label: "Right aligned" },
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("unknown control path"),
        expect.stringContaining("must be a finite number"),
        expect.stringContaining("must be a nested object"),
        expect.stringContaining("truncated to maxItems=2"),
      ]),
    );
  });

  test("rejects invalid schemas during compilation", async ({ page }) => {
    const messages = await page.evaluate(async () => {
      const { figCreateProps } = await import("/propskit.js");
      const invalid = [
        { choice: { type: "options", options: [] } },
        { amount: [5, 10, 0, 1] },
        {
          gallery: {
            type: "image",
            multiple: true,
            default: [],
          },
        },
        { gallery: { type: "image", options: [] } },
        {
          gallery: {
            type: "video",
            options: ["/one.mp4", { value: "/one.mp4", label: "Duplicate" }],
          },
        },
        {
          playlist: {
            type: "audio",
            multiple: true,
            default: [],
            maxItems: 0,
          },
        },
        { position: { type: "joystick", unitScale: 0 } },
        { legacy: { type: "number", variant: "stepper" } },
        { amount: { type: "number", stepper: "true" } },
        {
          amount: {
            type: "number",
            control: "number",
            steppers: false,
          },
        },
      ];
      return invalid.map((config, index) => {
        try {
          figCreateProps(`Invalid ${index}`, config);
          return "";
        } catch (error) {
          return String(error);
        }
      });
    });

    expect(messages[0]).toContain("non-empty options array");
    expect(messages[1]).toContain("min must not exceed max");
    expect(messages[2]).toContain("use options for selectable media");
    expect(messages[3]).toContain("media options must be a non-empty array");
    expect(messages[4]).toContain("media option values must be unique");
    expect(messages[5]).toContain("maxItems must be a positive integer");
    expect(messages[6]).toContain(
      "unitScale must be a finite number greater than 0",
    );
    expect(messages[7]).toContain(
      "Use stepper: true instead",
    );
    expect(messages[8]).toContain("stepper must be boolean");
    expect(messages[9]).toContain(
      "use the singular stepper boolean instead",
    );
  });
});
