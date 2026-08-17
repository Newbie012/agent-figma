export type UpgradeRoute = "npm" | "bun" | "source"

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

const installed = /node_modules[/\\]@eliya-oss[/\\]agent-figma/
const bunGlobal = /[/\\]\.bun[/\\]install[/\\]global[/\\]/

// Where the running module sits says who put it there, which says who can
// replace it. Guessing wrong is recoverable: AGENT_FIGMA_UPGRADE_ROUTE overrides.
export const routeOf = (modulePath: string): UpgradeRoute => {
  if (!installed.test(modulePath)) return "source"
  return bunGlobal.test(modulePath) ? "bun" : "npm"
}

export const asRoute = (named: string | undefined): UpgradeRoute | undefined =>
  named === "npm" || named === "bun" || named === "source" ? named : undefined

const checkoutOf = (modulePath: string): string =>
  modulePath.replace(/[/\\](?:src|dist)[/\\].*$/, "").replace(/[/\\](?:src|dist)$/, "")

export const planFor = (route: UpgradeRoute, modulePath: string): UpgradePlan => {
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

// A person who typed `upgrade` wants one fact: what happened. The command it ran
// is the second, because they asked what was done on their machine.
export const sayDone = (finding: UpgradeFinding, ran: boolean): string => {
  if (finding.upToDate === true) return `agent-figma ${finding.current} is the newest published build.`
  if (!finding.runnable) return `${finding.reason ?? ""}\nRun this instead:\n  ${finding.command}`.trim()
  if (!ran) return `That did not work. Run it yourself:\n  ${finding.command}`
  if (finding.latest === undefined) return `Upgraded. The registry never answered, so the version cannot be named here; run agent-figma --version.`
  return `agent-figma ${finding.latest} is installed.`
}

export const sayChecked = (finding: UpgradeFinding): string => {
  if (finding.upToDate === true) return `agent-figma ${finding.current} is the newest published build.`
  if (finding.latest === undefined) return `agent-figma ${finding.current} is installed. The registry did not answer, so whether it is current is unknown.\n  ${finding.command}`
  return `agent-figma ${finding.latest} is out, and ${finding.current} is installed.\n  ${finding.command}`
}
