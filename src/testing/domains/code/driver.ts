import type { DriverState } from "../../state.js"

export class CodeTestDriver {
  constructor(private readonly state: DriverState) {}

  setFiles(files: Readonly<Record<string, string>>): void {
    for (const [path, text] of Object.entries(files)) this.state.sourceFiles.set(path, text)
  }

  clearFiles(): void {
    this.state.sourceFiles.clear()
  }
}
