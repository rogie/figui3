export type ComponentKind = "autonomous" | "customized-built-in";

export type ContractAction =
  | {
      type: "set-native-value";
      selector: string;
      value: string;
      nativeEvent: "input" | "change";
    }
  | {
      type: "click";
      selector: string;
    };

export interface PropertyContract {
  name: string;
  property: string;
  value: string | number | boolean;
  expected: string | number | boolean;
}

export interface AttributeContract {
  name: string;
  attribute: string;
  value: string;
  expected?: string;
}

export interface EventContract {
  name: string;
  event: string;
  action: ContractAction;
  expectedDetail?: unknown;
}

export interface ComponentContract {
  tag: string;
  title: string;
  group: "data" | "input" | "media" | "overlay" | "layout" | "display";
  kind?: ComponentKind;
  selector?: string;
  markup: string;
  properties?: PropertyContract[];
  attributes?: AttributeContract[];
  events?: EventContract[];
}

export const componentContracts: ComponentContract[] = [
  {
    tag: "fig-button",
    title: "Button",
    group: "input",
    markup: `<fig-button>Button</fig-button>`,
    attributes: [{ name: "disabled", attribute: "disabled", value: "" }],
  },
  {
    tag: "fig-dropdown",
    title: "Dropdown",
    group: "input",
    markup: `<fig-dropdown value="two"><option value="one">One</option><option value="two">Two</option></fig-dropdown>`,
    properties: [{ name: "value property", property: "value", value: "one", expected: "one" }],
  },
  {
    tag: "fig-tooltip",
    title: "Tooltip",
    group: "overlay",
    markup: `<fig-tooltip text="Tooltip text"><fig-button>Hover</fig-button></fig-tooltip>`,
    attributes: [{ name: "text", attribute: "text", value: "Updated tip" }],
  },
  {
    tag: "fig-truncate",
    title: "Truncate",
    group: "display",
    markup: `<fig-truncate>This is a long string of text</fig-truncate>`,
    attributes: [{ name: "tail", attribute: "tail", value: "true" }],
  },
  {
    tag: "fig-dialog",
    title: "Dialog",
    group: "overlay",
    kind: "customized-built-in",
    selector: `dialog[is="fig-dialog"]`,
    markup: `<dialog is="fig-dialog"><fig-header>Dialog</fig-header><fig-content>Body</fig-content></dialog>`,
    attributes: [{ name: "position", attribute: "position", value: "center center" }],
  },
  {
    tag: "fig-popup",
    title: "Popup",
    group: "overlay",
    kind: "customized-built-in",
    selector: `dialog[is="fig-popup"]`,
    markup: `<dialog is="fig-popup"><fig-content>Popup</fig-content></dialog>`,
    attributes: [{ name: "position", attribute: "position", value: "bottom left" }],
  },
  {
    tag: "fig-tab",
    title: "Tab",
    group: "input",
    markup: `<fig-tab value="one">One</fig-tab>`,
    attributes: [{ name: "selected", attribute: "selected", value: "" }],
  },
  {
    tag: "fig-tabs",
    title: "Tabs",
    group: "input",
    markup: `<fig-tabs value="one"><fig-tab value="one">One</fig-tab><fig-tab value="two">Two</fig-tab></fig-tabs>`,
    properties: [{ name: "value property", property: "value", value: "two", expected: "two" }],
  },
  {
    tag: "fig-segment",
    title: "Segment",
    group: "input",
    markup: `<fig-segment value="left">Left</fig-segment>`,
    attributes: [{ name: "selected", attribute: "selected", value: "" }],
  },
  {
    tag: "fig-segmented-control",
    title: "Segmented Control",
    group: "input",
    markup: `<fig-segmented-control value="left"><fig-segment value="left">Left</fig-segment><fig-segment value="right">Right</fig-segment></fig-segmented-control>`,
    properties: [{ name: "value property", property: "value", value: "right", expected: "right" }],
    events: [
      {
        name: "segment click emits change",
        event: "change",
        action: { type: "click", selector: `fig-segment[value="right"]` },
        expectedDetail: "right",
      },
    ],
  },
  {
    tag: "fig-options",
    title: "Options",
    group: "input",
    markup: `<fig-options options="Small,Medium,Large" value="Medium"></fig-options>`,
    properties: [{ name: "value property", property: "value", value: "Large", expected: "Large" }],
  },
  {
    tag: "fig-slider",
    title: "Slider",
    group: "data",
    markup: `<fig-slider value="25" min="0" max="100" text="true"></fig-slider>`,
    properties: [{ name: "value property", property: "value", value: "42", expected: "42" }],
    events: [
      {
        name: "range input emits value",
        event: "input",
        action: {
          type: "set-native-value",
          selector: `input[type="range"]`,
          value: "75",
          nativeEvent: "input",
        },
        expectedDetail: "75",
      },
    ],
  },
  {
    tag: "fig-input-text",
    title: "Text Input",
    group: "data",
    markup: `<fig-input-text value="Hello"></fig-input-text>`,
    properties: [{ name: "value property", property: "value", value: "World", expected: "World" }],
    events: [
      {
        name: "native change emits value",
        event: "change",
        action: { type: "set-native-value", selector: "input", value: "Changed", nativeEvent: "change" },
        expectedDetail: "Changed",
      },
    ],
  },
  {
    tag: "fig-input-number",
    title: "Number Input",
    group: "data",
    markup: `<fig-input-number value="12" min="0" max="100" step="1"></fig-input-number>`,
    properties: [{ name: "value property", property: "value", value: 24, expected: 24 }],
  },
  {
    tag: "fig-avatar",
    title: "Avatar",
    group: "display",
    markup: `<fig-avatar name="Rogie"></fig-avatar>`,
    attributes: [{ name: "name", attribute: "name", value: "FigUI" }],
  },
  {
    tag: "fig-field",
    title: "Field",
    group: "layout",
    markup: `<fig-field><label>Name</label><fig-input-text value="Value"></fig-input-text></fig-field>`,
    attributes: [{ name: "direction", attribute: "direction", value: "horizontal" }],
  },
  {
    tag: "fig-input-color",
    title: "Color Input",
    group: "data",
    markup: `<fig-input-color value="#0D99FF" text="true"></fig-input-color>`,
    properties: [{ name: "value property", property: "value", value: "#FF0000", expected: "#FF0000" }],
  },
  {
    tag: "fig-input-fill",
    title: "Fill Input",
    group: "data",
    markup: `<fig-input-fill value='{"type":"solid","color":"#0D99FF"}'></fig-input-fill>`,
    attributes: [{ name: "mode", attribute: "mode", value: "solid" }],
  },
  {
    tag: "fig-input-palette",
    title: "Palette Input",
    group: "data",
    markup: `<fig-input-palette value='["#0D99FF","#14AE5C"]'></fig-input-palette>`,
    attributes: [{ name: "open", attribute: "open", value: "" }],
  },
  {
    tag: "fig-input-gradient",
    title: "Gradient Input",
    group: "data",
    markup: `<fig-input-gradient value='{"type":"gradient","gradient":{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#FF00BF","opacity":100}]}}'></fig-input-gradient>`,
    attributes: [{ name: "mode", attribute: "mode", value: "tip" }],
  },
  {
    tag: "fig-checkbox",
    title: "Checkbox",
    group: "input",
    markup: `<fig-checkbox label="Enabled" value="yes"></fig-checkbox>`,
    properties: [{ name: "checked property", property: "checked", value: true, expected: true }],
    events: [
      {
        name: "click emits checked detail",
        event: "change",
        action: { type: "click", selector: "input" },
        expectedDetail: { checked: true, value: "yes" },
      },
    ],
  },
  {
    tag: "fig-radio",
    title: "Radio",
    group: "input",
    markup: `<fig-radio label="Option" value="one" name="radio-test"></fig-radio>`,
    properties: [{ name: "checked property", property: "checked", value: true, expected: true }],
  },
  {
    tag: "fig-switch",
    title: "Switch",
    group: "input",
    markup: `<fig-switch label="Enabled" value="on"></fig-switch>`,
    properties: [{ name: "checked property", property: "checked", value: true, expected: true }],
  },
  {
    tag: "fig-toast",
    title: "Toast",
    group: "overlay",
    kind: "customized-built-in",
    selector: `dialog[is="fig-toast"]`,
    markup: `<dialog is="fig-toast">Saved</dialog>`,
    attributes: [{ name: "theme", attribute: "theme", value: "brand" }],
  },
  {
    tag: "fig-combo-input",
    title: "Combo Input",
    group: "data",
    markup: `<fig-combo-input value="Small" options="Small,Medium,Large"></fig-combo-input>`,
    properties: [{ name: "value property", property: "value", value: "Medium", expected: "Medium" }],
  },
  {
    tag: "fig-swatch",
    title: "Swatch",
    group: "display",
    markup: `<fig-swatch background="#14AE5C"></fig-swatch>`,
    attributes: [{ name: "selected", attribute: "selected", value: "" }],
  },
  {
    tag: "fig-media",
    title: "Media",
    group: "media",
    markup: `<fig-media type="image" src="https://picsum.photos/320/180.webp?random=1" fit="cover" size="auto" checkerboard="true"></fig-media>`,
    attributes: [{ name: "fit", attribute: "fit", value: "contain" }],
  },
  {
    tag: "fig-image",
    title: "Image",
    group: "media",
    markup: `<fig-image src="https://picsum.photos/320/180.webp?random=2" fit="cover" size="auto" checkerboard="true"></fig-image>`,
    attributes: [{ name: "fit", attribute: "fit", value: "contain" }],
  },
  {
    tag: "fig-video",
    title: "Video",
    group: "media",
    markup: `<fig-video poster="https://picsum.photos/320/180.webp?random=3" muted fit="cover" size="auto" checkerboard="true"></fig-video>`,
    attributes: [{ name: "fit", attribute: "fit", value: "contain" }],
  },
  {
    tag: "fig-media-controls",
    title: "Media Controls",
    group: "media",
    markup: `<fig-media-controls duration="120" time="30"></fig-media-controls>`,
    attributes: [{ name: "playing", attribute: "playing", value: "" }],
  },
  {
    tag: "fig-input-file",
    title: "File Input",
    group: "input",
    markup: `<fig-input-file label="Upload" accepts="image/*"></fig-input-file>`,
    attributes: [{ name: "disabled", attribute: "disabled", value: "" }],
  },
  {
    tag: "fig-easing-curve",
    title: "Easing Curve",
    group: "data",
    markup: `<fig-easing-curve value="ease-in-out"></fig-easing-curve>`,
    attributes: [{ name: "precision", attribute: "precision", value: "2" }],
  },
  {
    tag: "fig-3d-rotate",
    title: "3D Rotate",
    group: "data",
    markup: `<fig-3d-rotate value='{"x":0,"y":0}'></fig-3d-rotate>`,
    attributes: [{ name: "fields", attribute: "fields", value: "x,y" }],
  },
  {
    tag: "fig-origin-grid",
    title: "Origin Grid",
    group: "data",
    markup: `<fig-origin-grid value="50% 50%" fields="true"></fig-origin-grid>`,
    attributes: [{ name: "drag", attribute: "drag", value: "true" }],
  },
  {
    tag: "fig-joystick",
    title: "Joystick",
    group: "data",
    markup: `<fig-joystick value="50% 50%" axis-labels="X Y"></fig-joystick>`,
    attributes: [{ name: "fields", attribute: "fields", value: "x,y" }],
  },
  {
    tag: "fig-shimmer",
    title: "Shimmer",
    group: "display",
    markup: `<fig-shimmer style="width: 160px; height: 24px"></fig-shimmer>`,
    attributes: [{ name: "duration", attribute: "duration", value: "2" }],
  },
  {
    tag: "fig-skeleton",
    title: "Skeleton",
    group: "display",
    markup: `<fig-skeleton><fig-field><label>Name</label><fig-input-text value="Loading"></fig-input-text></fig-field></fig-skeleton>`,
    attributes: [{ name: "duration", attribute: "duration", value: "2" }],
  },
  {
    tag: "fig-layer",
    title: "Layer",
    group: "layout",
    markup: `<fig-layer><div class="fig-layer-row"><label>Layer</label></div></fig-layer>`,
    attributes: [{ name: "selected", attribute: "selected", value: "true" }],
  },
  {
    tag: "fig-group",
    title: "Group",
    group: "layout",
    markup: `<fig-group name="Group"><fig-field><label>Opacity</label><fig-slider value="50"></fig-slider></fig-field></fig-group>`,
    attributes: [{ name: "open", attribute: "open", value: "" }],
  },
  {
    tag: "fig-header",
    title: "Header",
    group: "layout",
    markup: `<fig-header>Header</fig-header>`,
    attributes: [{ name: "borderless", attribute: "borderless", value: "" }],
  },
  { tag: "fig-footer", title: "Footer", group: "layout", markup: `<fig-footer>Footer</fig-footer>` },
  { tag: "fig-spinner", title: "Spinner", group: "display", markup: `<fig-spinner></fig-spinner>` },
  {
    tag: "fig-preview",
    title: "Preview",
    group: "display",
    markup: `<fig-preview checkerboard><img src="https://picsum.photos/320/180.webp?random=4" alt=""></fig-preview>`,
    attributes: [{ name: "fit", attribute: "fit", value: "contain" }],
  },
  {
    tag: "fig-icon",
    title: "Icon",
    group: "display",
    markup: `<fig-icon name="search"></fig-icon>`,
    attributes: [{ name: "size", attribute: "size", value: "small" }],
  },
  { tag: "fig-content", title: "Content", group: "layout", markup: `<fig-content>Content</fig-content>` },
  {
    tag: "fig-tab-content",
    title: "Tab Content",
    group: "layout",
    markup: `<fig-tab-content>Tab content</fig-tab-content>`,
  },
  {
    tag: "fig-button-combo",
    title: "Button Combo",
    group: "layout",
    markup: `<fig-button-combo><fig-button>One</fig-button><fig-button>Two</fig-button></fig-button-combo>`,
  },
  {
    tag: "fig-input-combo",
    title: "Input Combo",
    group: "layout",
    markup: `<fig-input-combo><fig-input-text value="A"></fig-input-text><fig-button>Go</fig-button></fig-input-combo>`,
  },
  {
    tag: "fig-color-tip",
    title: "Color Tip",
    group: "data",
    markup: `<fig-color-tip value="#0D99FF"></fig-color-tip>`,
    properties: [{ name: "value property", property: "value", value: "#FF0000", expected: "#FF0000" }],
  },
  {
    tag: "fig-choice",
    title: "Choice",
    group: "input",
    markup: `<fig-choice value="choice-a"><label>Choice</label></fig-choice>`,
    attributes: [{ name: "selected", attribute: "selected", value: "" }],
  },
  {
    tag: "fig-chooser",
    title: "Chooser",
    group: "input",
    markup: `<fig-chooser value="a"><fig-choice value="a" selected>A</fig-choice><fig-choice value="b">B</fig-choice></fig-chooser>`,
    properties: [{ name: "value property", property: "value", value: "b", expected: "b" }],
  },
  {
    tag: "fig-handle",
    title: "Handle",
    group: "input",
    markup: `<div style="position:relative;width:120px;height:80px"><fig-handle value="50% 50%" drag="true"></fig-handle></div>`,
    attributes: [{ name: "selected", attribute: "selected", value: "" }],
  },
  {
    tag: "fig-menu-item",
    title: "Menu Item",
    group: "input",
    markup: `<fig-menu-item>Item</fig-menu-item>`,
    attributes: [{ name: "disabled", attribute: "disabled", value: "" }],
  },
  {
    tag: "fig-menu-separator",
    title: "Menu Separator",
    group: "display",
    markup: `<fig-menu-separator></fig-menu-separator>`,
  },
  {
    tag: "fig-menu",
    title: "Menu",
    group: "overlay",
    markup: `<fig-menu><fig-button slot="trigger">Menu</fig-button><fig-menu-item>Item</fig-menu-item><fig-menu-separator></fig-menu-separator><fig-menu-item>Other</fig-menu-item></fig-menu>`,
    attributes: [{ name: "open", attribute: "open", value: "" }],
  },
];

export const componentGroups = Array.from(
  new Set(componentContracts.map((contract) => contract.group)),
);
