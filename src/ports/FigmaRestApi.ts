import type { FigmaGetInput, FigmaGetResult } from "../domain/figma.js"

export interface FigmaRestApi {
  readonly get: (input: FigmaGetInput) => Promise<FigmaGetResult>
}
