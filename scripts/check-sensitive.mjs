import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, extname } from "node:path"

const packageMode = process.argv.includes("--package")

// The tarball is built by `pnpm publish`, and pnpm and npm disagree about
// package.json `files`: npm honours an anchored path, pnpm matches every
// README.md at any depth. Asking npm what ships answered for the wrong tool, and
// 0.1.0-alpha.0 and alpha.1 both shipped a test file because of it. Pack with
// pnpm, and read the tarball rather than a plan.
const packedFiles = () => {
  const packed = execFileSync("pnpm", ["pack", "--pack-destination", tmpdir(), "--silent"], { encoding: "utf8" }).trim().split("\n").at(-1)
  if (packed === undefined) throw new Error("pnpm pack printed no tarball path")
  try {
    return execFileSync("tar", ["tzf", packed], { encoding: "utf8" })
      .split("\n")
      .filter((line) => line.length > 0 && !line.endsWith("/"))
      .map((line) => line.replace(/^package\//, ""))
  } finally {
    rmSync(packed, { force: true })
  }
}

const files = packageMode
  ? packedFiles()
  : execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
      .toString("utf8")
      .split("\0")
      .filter(Boolean)

const forbiddenFiles = [
  { name: "environment file", test: (file) => basename(file).startsWith(".env") && basename(file) !== ".env.example" },
  { name: "npm credentials", test: (file) => basename(file) === ".npmrc" },
  { name: "Vercel project metadata", test: (file) => file.split("/").includes(".vercel") },
  { name: "private key material", test: (file) => [".key", ".pem", ".p12", ".pfx"].includes(extname(file).toLowerCase()) }
]

const contentRules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["Figma token", /\bfig[door]_[A-Za-z0-9_-]{16,}\b/],
  ["Vercel OIDC token", /\bVERCEL_OIDC_TOKEN\s*=/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
  ["absolute macOS home path", /\/Users\/[^/\s]+\//],
  ["absolute Linux home path", /\/home\/[^/\s]+\//]
]

const findings = []
for (const file of files) {
  for (const rule of forbiddenFiles) {
    if (rule.test(file)) findings.push(`${file}: ${rule.name}`)
  }
  if (!packageMode && file === "scripts/check-sensitive.mjs") continue
  // git lists a tracked file that has been deleted but not yet staged. Scanning
  // is not the place to fail on that.
  const content = existsSync(file) ? readFileSync(file) : undefined
  if (content === undefined) continue
  if (content.includes(0)) continue
  const text = content.toString("utf8")
  for (const [name, pattern] of contentRules) {
    if (pattern.test(text)) findings.push(`${file}: ${name}`)
  }
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []
  for (const email of emails) {
    if (!email.endsWith("@example.com") && !email.endsWith("@users.noreply.github.com")) {
      findings.push(`${file}: non-example email address`)
    }
  }
}

// A bare name in package.json `files` matches at any depth, which is how
// tests/docs and five nested README files reached 0.1.0-alpha.0. The allowlist
// below is what the package is meant to contain; anything else is a leak.
const shippable = [
  /^package\.json$/,
  /^(?:README|CHANGELOG|LICENSE)(?:\.md)?$/,
  /^dist\/[^/]+\.js$/,
  /^docs\//,
  /^skills\//,
  /^\.agents\/cli-api\.md$/
]

if (packageMode) {
  for (const file of files) {
    if (!shippable.some((pattern) => pattern.test(file))) {
      findings.push(`${file}: not something this package ships`)
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(`Sensitive-data check failed:\n${[...new Set(findings)].map((finding) => `- ${finding}`).join("\n")}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Sensitive-data check passed (${files.length} ${packageMode ? "package" : "repository"} files).\n`)
}
