import { readdir, readFile, stat } from "node:fs/promises"
import { extname, join } from "node:path"
import type { SourceCode, SourceCodeRead, SourceFile } from "../../ports/SourceCode.js"

const readable = new Set([
  ".astro", ".css", ".html", ".js", ".jsx", ".less", ".mjs", ".sass", ".scss",
  ".svelte", ".ts", ".tsx", ".vue"
])

const skipped = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", ".turbo"])

const MAX_BYTES = 4_000_000

export class FileSourceCode implements SourceCode {
  async read(paths: readonly string[]): Promise<SourceCodeRead> {
    const found: SourceFile[] = []
    const missed: string[] = []
    let budget = MAX_BYTES
    for (const path of paths) {
      const collected = await this.collect(path, missed)
      for (const candidate of collected) {
        if (budget <= 0) {
          missed.push(`${candidate}: not read, the 4 MB budget was already spent`)
          continue
        }
        const text = await readFile(candidate, "utf8").catch(() => undefined)
        if (text === undefined) {
          missed.push(`${candidate}: could not be read`)
          continue
        }
        budget -= Buffer.byteLength(text)
        found.push({ path: candidate, text })
      }
    }
    return { files: found, skipped: missed }
  }

  private async collect(path: string, missed: string[]): Promise<readonly string[]> {
    const info = await stat(path).catch(() => undefined)
    if (info === undefined) {
      missed.push(`${path}: no such file or directory`)
      return []
    }
    if (info.isFile()) return [path]
    if (!info.isDirectory()) return []
    return this.walk(path, missed)
  }

  private async walk(directory: string, missed: string[]): Promise<readonly string[]> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
    const nested = await Promise.all(entries.map(async (entry) => {
      if (skipped.has(entry.name)) return []
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return this.walk(path, missed)
      return readable.has(extname(entry.name)) ? [path] : []
    }))
    return nested.flat()
  }
}
