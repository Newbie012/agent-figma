import type { DriverState, ImageSave } from "../../state.js"

export class ImageTestDriver {
  constructor(private readonly state: DriverState) {}

  setBytes(url: string, bytes: number): void {
    this.state.imageBytes.set(url, bytes)
  }

  listSaves(): readonly ImageSave[] {
    return this.state.imageSaves
  }
}
