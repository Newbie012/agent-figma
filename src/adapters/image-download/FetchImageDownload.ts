import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { FigmaApiFailed } from "../../domain/errors.js"
import type { ImageDownload, ImageSaved } from "../../ports/ImageDownload.js"

const FETCH_MS = 30_000

export class FetchImageDownload implements ImageDownload {
  async save(url: string, path: string): Promise<ImageSaved> {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_MS) })
    if (!response.ok) {
      throw new FigmaApiFailed({ message: `The render could not be fetched: ${response.status}`, path: url })
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
    return { bytes: bytes.byteLength }
  }
}
