import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { basename, extname } from "node:path"

const packageMode = process.argv.includes("--package")
const files = packageMode
  ? JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], { encoding: "utf8" }))[0].files.map((file) => file.path)
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
  const content = readFileSync(file)
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
