#!/usr/bin/env node
import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { createLiveServices } from "./adapters/live.js"
import { executeCli } from "./application/execute.js"

const program = Effect.promise(async () => {
  const result = await executeCli(process.argv.slice(2), createLiveServices(), {
    stdoutIsTty: process.stdout.isTTY === true,
    env: process.env
  })
  if (result.stdout.length > 0) process.stdout.write(result.stdout)
  if (result.stderr.length > 0) process.stderr.write(result.stderr)
  process.exitCode = result.exitCode
})

NodeRuntime.runMain(program, { disableErrorReporting: true })
