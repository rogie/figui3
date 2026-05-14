#!/usr/bin/env node
/**
 * Run Vite without requiring a global `npm` on PATH.
 * Usage from repo root: node playground/dev.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const playgroundDir = path.dirname(fileURLToPath(import.meta.url));
const viteCli = path.join(playgroundDir, "node_modules", "vite", "bin", "vite.js");

const child = spawn(process.execPath, [viteCli], {
  cwd: playgroundDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
