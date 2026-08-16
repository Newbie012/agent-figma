export interface SourceFile {
  readonly path: string
  readonly text: string
}

export interface SourceCodeRead {
  readonly files: readonly SourceFile[]
  readonly skipped: readonly string[]
}

export interface SourceCode {
  /** Reads the paths the caller named, walking a directory one level of nesting at a time.
   *  Nothing outside those paths is read, and nothing read here ever leaves the process. */
  readonly read: (paths: readonly string[]) => Promise<SourceCodeRead>
}
