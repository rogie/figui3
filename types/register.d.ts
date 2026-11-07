export interface FigRegistrationOptions {
  editor?: boolean;
  lab?: boolean;
}

export function registerFigUI(): Promise<void>;
export function registerFigEditor(): Promise<void>;
export function registerFigLab(): Promise<void>;
export function register(options?: FigRegistrationOptions): Promise<void>;
