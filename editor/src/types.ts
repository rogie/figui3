export interface EditorNode {
  tagName: string;
  attributes: Record<string, string>;
  children?: EditorNode[];
}

export interface MountOptions {
  target?: string | HTMLElement;
  cssUrl?: string;
  figJsUrl?: string;
}

export interface FigUIEditorAPI {
  mount: (options?: MountOptions) => Promise<void>;
  unmount: () => void;
  setNode: (node: EditorNode | null) => void;
}
