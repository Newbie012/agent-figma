import { readFileSync } from "node:fs"
import { defineConfig } from "rolldown"

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"))

export default defineConfig({
  input: "src/main.ts",
  platform: "node",
  transform: {
    define: {
      __CLI_VERSION__: JSON.stringify(version),
    },
  },
  output: {
    file: "dist/main.js",
    format: "esm",
    codeSplitting: false,
  },
})
