import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    pool: "forks",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/testing/**",
        "src/main.ts",
        "src/adapters/live.ts",
        "src/adapters/keychain/MacOSSecurityKeychainSecrets.ts"
      ],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 80,
        lines: 80
      }
    }
  }
})
