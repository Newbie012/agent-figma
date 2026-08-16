import { readFile, readdir } from "node:fs/promises"
import { dirname, join, normalize, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { commandMetadata } from "../../src/cli/metadata.js"

const root = fileURLToPath(new URL("../../", import.meta.url))
const docsRoot = join(root, "docs")

const markdownFiles = async (dir: string): Promise<readonly string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const found = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return markdownFiles(path)
    return entry.name.endsWith(".md") ? [path] : []
  }))
  return found.flat()
}

const localLinks = (markdown: string): readonly string[] =>
  [...markdown.matchAll(/\]\((?!https?:|mailto:)([^)#]+)(?:#[^)]*)?\)/g)].map((match) => match[1] ?? "")

describe("docs folder", () => {
  it("is the documentation the repository ships, with no site left to build", async () => {
    const [rootPackage, workspace, index] = await Promise.all([
      readFile(join(root, "package.json"), "utf8"),
      readFile(join(root, "pnpm-workspace.yaml"), "utf8"),
      readFile(join(docsRoot, "README.md"), "utf8")
    ])
    const manifest = JSON.parse(rootPackage) as { scripts: Record<string, string>; files: readonly string[] }

    expect(Object.keys(manifest.scripts).filter((name) => name.startsWith("docs:"))).toEqual(["docs:check", "docs:write"])
    expect(manifest.scripts["release:check"]).not.toContain("docs:build")
    expect(manifest.files).toContain("docs")
    expect(workspace).not.toContain('- "docs"')
    expect(index).toContain("[Commands](./reference/commands.md)")
  })

  it("resolves every link it makes to another page", async () => {
    const files = await markdownFiles(docsRoot)
    const broken: string[] = []

    for (const file of files) {
      const markdown = await readFile(file, "utf8")
      for (const link of localLinks(markdown)) {
        const target = normalize(join(dirname(file), link))
        const reachable = await readFile(target, "utf8").then(() => true, () => false)
        if (!reachable) broken.push(`${relative(root, file)} -> ${link}`)
      }
    }

    expect(broken).toEqual([])
  })

  it("documents every command the catalog exposes", async () => {
    const reference = await readFile(join(docsRoot, "reference", "commands.md"), "utf8")
    const missing = commandMetadata
      .map((command) => command.path.join(" "))
      .filter((name) => !reference.includes(`agent-figma ${name}`))

    expect(missing).toEqual([])
  })
})
