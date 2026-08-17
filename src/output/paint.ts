export type PaintName = "bold" | "cyan" | "dim" | "green" | "red" | "yellow"

const codes: Record<PaintName, readonly [number, number]> = {
  bold: [1, 22], cyan: [36, 39], dim: [2, 22], green: [32, 39], red: [31, 39], yellow: [33, 39]
}

export type Paint = (name: PaintName, value: string) => string

const ESC = "\u001b"

export const painter = (color: boolean): Paint => (name, value) =>
  color ? `${ESC}[${codes[name][0]}m${value}${ESC}[${codes[name][1]}m` : value

// Colour is for a person at a terminal who did not ask for it plain. NO_COLOR is
// the convention every other CLI on their machine already honours.
export const wantsColor = (options: {
  readonly stdoutIsTty?: boolean
  readonly noColorFlag?: boolean
  readonly env?: Readonly<Record<string, string | undefined>>
}): boolean =>
  options.stdoutIsTty === true &&
  options.noColorFlag !== true &&
  (options.env?.["NO_COLOR"] ?? "") === ""
