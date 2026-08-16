import type { FigmaGetResult } from "../../../domain/figma.js"
import type { DriverState } from "../../state.js"

export class FigmaTestDriver {
  constructor(private readonly state: DriverState) {}

  overrideGet(options: {
    readonly path: string
    readonly query?: Readonly<Record<string, string>>
    readonly data: unknown
    readonly headers?: FigmaGetResult["headers"]
  }): void {
    const stub = {
      path: options.path,
      ...(options.query === undefined ? {} : { query: options.query }),
      result: { data: options.data, headers: options.headers ?? {} }
    }
    const index = this.state.figmaStubs.findIndex((item) =>
      item.path === stub.path && JSON.stringify(item.query ?? {}) === JSON.stringify(stub.query ?? {})
    )
    if (index >= 0) this.state.figmaStubs[index] = stub
    else this.state.figmaStubs.push(stub)
  }

  listCalls() {
    return this.state.figmaCalls
  }
}
