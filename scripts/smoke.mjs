#!/usr/bin/env node
// Runs the bundled CLI the way a user's shell does: no source, no test doubles.
// PRD-001 asks for this, and it is the only check that can see a build that
// imports something the bundle does not carry.
import { execFile } from "node:child_process"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const exec = promisify(execFile)
const entry = fileURLToPath(new URL("../dist/main.js", import.meta.url))
const home = await mkdtemp(join(tmpdir(), "agent-figma-smoke-"))
const env = { PATH: process.env.PATH ?? "", HOME: home, AGENT_FIGMA_CONFIG_DIR: join(home, "config") }

const run = async (args) => {
  try {
    const { stdout, stderr } = await exec(process.execPath, [entry, ...args], { env, encoding: "utf8" })
    return { code: 0, stdout, stderr }
  } catch (cause) {
    return { code: cause.code ?? 1, stdout: cause.stdout ?? "", stderr: cause.stderr ?? "" }
  }
}

const failures = []
const expect = (label, condition, detail) => {
  if (condition) return
  failures.push(`${label}: ${detail}`)
}

const version = await run(["--version"])
expect("--version exits 0", version.code === 0, `exited ${version.code}`)
expect("--version prints a version", /^\d+\.\d+\.\d+/.test(version.stdout.trim()), JSON.stringify(version.stdout))

const described = await run(["describe", "--json"])
expect("describe exits 0", described.code === 0, `exited ${described.code}`)
const catalog = described.code === 0 ? JSON.parse(described.stdout) : { ok: false }
expect("describe answers ok", catalog.ok === true, described.stdout.slice(0, 200))
expect("describe carries commands", Array.isArray(catalog.data?.commands) && catalog.data.commands.length > 0, "no commands")
expect("describe stays read-only", catalog.data?.read_only === true, "read_only is not true")

const unknown = await run(["fil", "get", "key", "--json"])
expect("an unknown command exits 2", unknown.code === 2, `exited ${unknown.code}`)
expect("an unknown command keeps stdout empty", unknown.stdout === "", JSON.stringify(unknown.stdout))
expect("an unknown command names the nearest one", unknown.stderr.includes("file get"), unknown.stderr.slice(0, 200))

const help = await run(["file", "get", "--help"])
expect("--help exits 0", help.code === 0, `exited ${help.code}`)
expect("--help prints the usage line", help.stdout.includes("agent-figma file get FILE_OR_URL"), help.stdout.slice(0, 200))

if (failures.length > 0) {
  for (const failure of failures) console.error(`smoke: ${failure}`)
  process.exit(1)
}

console.log(`smoke: the bundle answers --version, describe, --help, and refuses an unknown command.`)
