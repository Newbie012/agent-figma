export type UpgradeRoute = "brew" | "npm" | "bun" | "binary" | "source"

export interface UpgradePlan {
  readonly route: UpgradeRoute
  readonly command: string
  readonly argv: readonly string[]
  readonly runnable: boolean
  readonly reason?: string
}

export const PACKAGE = "@eliya-oss/agent-figma"

// Publishing is what sets the dist-tag, and the OIDC credential authenticates
// nothing but the publish, so there is one tag and the publish keeps it current.
// The version says `-alpha.N`; the tag is plumbing.
export const TAG = "latest"

export const TAP = "Newbie012/tap/agent-figma"

const RELEASES = "https://github.com/Newbie012/agent-figma/releases/latest"

const cellar = /[/\\]Cellar[/\\]agent-figma[/\\]/
const compiled = /^[/\\]\$bunfs[/\\]/
const installed = /node_modules[/\\]@eliya-oss[/\\]agent-figma/
const bunGlobal = /[/\\]\.bun[/\\]install[/\\]global[/\\]/

// Where the running module sits says who put it there, which says who can
// replace it. Guessing wrong is recoverable: AGENT_FIGMA_UPGRADE_ROUTE overrides.
export const routeOf = (executablePath: string, modulePath: string): UpgradeRoute => {
  if (cellar.test(executablePath) || cellar.test(modulePath)) return "brew"
  if (compiled.test(modulePath) || compiled.test(executablePath)) return "binary"
  if (!installed.test(modulePath)) return "source"
  return bunGlobal.test(modulePath) ? "bun" : "npm"
}

const ROUTES: readonly UpgradeRoute[] = ["brew", "npm", "bun", "binary", "source"]

export const asRoute = (named: string | undefined): UpgradeRoute | undefined =>
  ROUTES.find((route) => route === named)

const checkoutOf = (modulePath: string): string =>
  modulePath.replace(/[/\\](?:src|dist)[/\\].*$/, "").replace(/[/\\](?:src|dist)$/, "")

const assetOf = (): string => `agent-figma-${process.platform}-${process.arch}`

export const planFor = (route: UpgradeRoute, modulePath: string): UpgradePlan => {
  if (route === "brew") {
    return { route, command: `brew upgrade ${TAP}`, argv: ["brew", "upgrade", TAP], runnable: true }
  }
  if (route === "binary") {
    const asset = assetOf()
    return {
      route,
      command: `curl -fsSL ${RELEASES}/download/${asset}.tar.gz | tar -xzO ${asset} > "$(command -v agent-figma)" && chmod +x "$(command -v agent-figma)"`,
      argv: [],
      runnable: false,
      reason: "A running binary cannot rewrite itself."
    }
  }
  if (route === "npm") {
    return { route, command: `npm install -g ${PACKAGE}`, argv: ["npm", "install", "-g", PACKAGE], runnable: true }
  }
  if (route === "bun") {
    return { route, command: `bun add -g ${PACKAGE}`, argv: ["bun", "add", "-g", PACKAGE], runnable: true }
  }
  return {
    route,
    command: `git -C ${checkoutOf(modulePath)} pull && pnpm install && pnpm build`,
    argv: [],
    runnable: false,
    reason: "This is a checkout, and a checkout is not the CLI's to pull."
  }
}

const numbersIn = (text: string): readonly number[] =>
  (text.match(/\d+/g) ?? []).map((digits) => Number(digits))

const compare = (left: readonly number[], right: readonly number[]): number => {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const one = left[index]
    const other = right[index]
    if (one === undefined) return -1
    if (other === undefined) return 1
    if (one !== other) return one < other ? -1 : 1
  }
  return 0
}

const partsOf = (version: string): { core: readonly number[]; pre: readonly number[] } => {
  const [core = "", ...rest] = version.split("-")
  return { core: numbersIn(core), pre: numbersIn(rest.join("-")) }
}

export const newer = (candidate: string, held: string): boolean => {
  const one = partsOf(candidate)
  const other = partsOf(held)
  const cores = compare(one.core, other.core)
  if (cores !== 0) return cores > 0
  if (one.pre.length === 0 && other.pre.length > 0) return true
  if (one.pre.length > 0 && other.pre.length === 0) return false
  return compare(one.pre, other.pre) > 0
}

export interface UpgradeFinding {
  readonly route: UpgradeRoute
  readonly current: string
  readonly latest?: string
  readonly upToDate?: boolean
  readonly command: string
  readonly runnable: boolean
  readonly reason?: string
}

export const findingFor = (
  plan: UpgradePlan,
  current: string,
  latest: string | undefined
): UpgradeFinding => ({
  route: plan.route,
  current,
  ...(latest === undefined ? {} : { latest, upToDate: !newer(latest, current) }),
  command: plan.command,
  runnable: plan.runnable,
  ...(plan.reason === undefined ? {} : { reason: plan.reason })
})

export const willUpgrade = (finding: UpgradeFinding, check: boolean): boolean =>
  !check && finding.runnable && finding.upToDate !== true

// The skill ships beside the binary and is installed by something else, so an
// upgrade that only moved the binary leaves half the install behind.
export const SAY_SKILL_TOO = "Run `npx skills update agent-figma` to bring the skill up with it."

// A person who typed `upgrade` wants one fact: what happened. The command it ran
// is the second, because they asked what was done on their machine.
export const sayDone = (finding: UpgradeFinding, ran: boolean): string => {
  if (finding.upToDate === true) return `agent-figma ${finding.current} is the newest published build.`
  if (!finding.runnable) return `${finding.reason ?? ""}\nRun this instead:\n  ${finding.command}`.trim()
  if (!ran) return `That did not work. Run it yourself:\n  ${finding.command}`
  if (finding.latest === undefined) return `Upgraded. The registry never answered, so the version cannot be named here; run agent-figma --version.\n${SAY_SKILL_TOO}`
  return `agent-figma ${finding.latest} is installed.\n${SAY_SKILL_TOO}`
}

export const sayChecked = (finding: UpgradeFinding): string => {
  if (finding.upToDate === true) return `agent-figma ${finding.current} is the newest published build.`
  if (finding.latest === undefined) return `agent-figma ${finding.current} is installed. The registry did not answer, so whether it is current is unknown.\n  ${finding.command}`
  return `agent-figma ${finding.latest} is out, and ${finding.current} is installed.\n  ${finding.command}`
}

const DAY_MS = 86_400_000

export const NOTE =
  "agent-figma keeps this file so it asks the registry for the newest version at most once a day, and never while you are waiting on a command. `told` is the version it has already mentioned once. Delete the file and it is written again. Set AGENT_FIGMA_NO_UPGRADE_CHECK to stop the check and the hint entirely."

/** A version worth mentioning is newer than this one and has not been mentioned before. */
export const hintFor = (check: { readonly latest?: string; readonly told?: string }, current: string): string | undefined => {
  const { latest } = check
  if (latest === undefined || latest === check.told || !newer(latest, current)) return undefined
  return `agent-figma ${latest} is out · agent-figma upgrade`
}

export const isStale = (check: { readonly checkedAt?: string }, now: number): boolean =>
  check.checkedAt === undefined || now - Date.parse(check.checkedAt) > DAY_MS
