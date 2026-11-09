export interface AsyncOperationResource {
  dispose(): void;
  forget(): void;
}

export interface AsyncOperation {
  isCurrent(): boolean;
  own(cleanup: () => void | Promise<void>): AsyncOperationResource;
}

export declare class AsyncOperationOwner {
  readonly disposed: boolean;
  begin(): AsyncOperation;
  cancel(): void;
  dispose(): void;
}
