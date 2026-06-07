import type { PerfBudget } from "./perf-helpers";

export const runtimeBudgets = {
  definitionsReady: {
    median: 80,
    max: 180,
    longTasks: 1,
    note: "Full component definition readiness should not make the fixture feel blocked.",
  },
  bulkUpgrade: {
    median: 180,
    max: 400,
    longTasks: 2,
    note: "Dense property panels should upgrade without nonlinear lifecycle cost.",
  },
  mountUnmount: {
    median: 260,
    max: 360,
    longTasks: 1,
    note: "Repeated component churn should not duplicate listeners or observers.",
  },
  mountUnmountFamily: {
    median: 240,
    max: 340,
    longTasks: 1,
    note: "A single component family should tolerate repeated mount/unmount cycles.",
  },
  popupReposition: {
    median: 160,
    max: 240,
    longTasks: 1,
    note: "Frame-settled anchored popups should reposition without visible lag.",
  },
  popupRepositionPath: {
    median: 30,
    max: 70,
    longTasks: 1,
    note: "A single popup placement subpath should stay responsive without layout stalls.",
  },
  sliderScrub: {
    median: 70,
    max: 160,
    longTasks: 1,
    note: "Slider scrubbing should keep high-frequency input responsive.",
  },
  gradientDrag: {
    median: 220,
    max: 320,
    longTasks: 1,
    note: "Frame-settled gradient handles and color tips should remain responsive while dragging.",
  },
  gradientDragPath: {
    median: 30,
    max: 60,
    longTasks: 1,
    note: "A single gradient drag subpath should stay responsive without layout stalls.",
  },
  colorFillSync: {
    median: 240,
    max: 360,
    longTasks: 2,
    note: "Frame-settled color/fill public attribute paths should sync without visible stalls.",
  },
  pickerOpen: {
    median: 240,
    max: 360,
    longTasks: 2,
    note: "Color/fill picker lazy UI should open without a noticeable stall.",
  },
  colorFillSyncPath: {
    median: 30,
    max: 60,
    longTasks: 1,
    note: "A single color/fill public attribute path should sync without repeated subtree rebuilds.",
  },
} satisfies Record<string, PerfBudget>;

export const renderBudgets = {
  densePanelLayout: {
    median: 140,
    max: 320,
    longTasks: 1,
    note: "Dense property panels should lay out within one responsive interaction.",
  },
  shimmerToggle: {
    median: 650,
    max: 900,
    longTasks: 30,
    note: "Shimmer and skeleton loading states should not overwork large subtrees.",
  },
  sliderPaint: {
    median: 320,
    max: 420,
    longTasks: 1,
    note: "Frame-settled slider visual variants should update without paint spikes.",
  },
  sliderStyleUpdate: {
    median: 30,
    max: 60,
    longTasks: 1,
    note: "A single slider variant should handle many synchronous value updates without layout stalls.",
  },
  overlayOpen: {
    median: 180,
    max: 260,
    longTasks: 1,
    note: "Frame-settled dialog, popup, and tooltip elevation should render promptly.",
  },
  overlayOpenPath: {
    median: 35,
    max: 70,
    longTasks: 1,
    note: "A single overlay open/close path should render without layout or paint stalls.",
  },
  themeFlip: {
    median: 160,
    max: 360,
    longTasks: 2,
    note: "Theme and color-scheme changes should not stall dense plugin panels.",
  },
  hasSelectorChurn: {
    median: 260,
    max: 360,
    longTasks: 1,
    note: "Frame-settled :has() selector paths should tolerate repeated public state changes.",
  },
  hasSelectorPath: {
    median: 30,
    max: 60,
    longTasks: 1,
    note: "One targeted :has() selector path should tolerate many synchronous state changes.",
  },
} satisfies Record<string, PerfBudget>;
