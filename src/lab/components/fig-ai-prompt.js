/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/

import { HTMLElement, figLabDefineElement } from "../runtime/dom.js";

/* Presentation-only composition surface for AI prompt controls. */
class FigAiPrompt extends HTMLElement {}
figLabDefineElement("fig-ai-prompt", FigAiPrompt);
