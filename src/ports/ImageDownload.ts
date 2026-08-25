export interface ImageSaved {
  readonly bytes: number
}

export interface ImageDownload {
  /** Fetches a rendered image Figma has already produced and writes it where the caller asked. */
  readonly save: (url: string, path: string) => Promise<ImageSaved>
}
