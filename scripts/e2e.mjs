#!/usr/bin/env node
// End-to-end proof of PRD §3 success criteria 1-4, run entirely locally with
// no ANTHROPIC_API_KEY: seeds a published scholarship form, serves the demo
// host page, points the standalone agent at it, and asserts a real HTTP
// submission lands with source=agent.
//
// Usage: node scripts/e2e.mjs

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const APP_PORT = process.env.E2E_APP_PORT || "4310";
const DEMO_PORT = process.env.E2E_DEMO_PORT || "4311";
const DB_PATH = path.join(ROOT, "tests", "tmp", "e2e.db");
const APP_URL = `http://localhost:${APP_PORT}`;
const DEMO_URL = `http://localhost:${DEMO_PORT}/`;

const children = [];

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: "inherit", ...opts });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`))));
  });
}

function runCapture(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const child = spawn(cmd, args, { cwd: ROOT, ...opts });
    child.stdout.on("data", (d) => {
      process.stdout.write(d);
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("exit", (code) => resolve({ code, stdout }));
    child.on("error", reject);
  });
}

function spawnServer(cmd, args, opts, readyCheckUrl) {
  const child = spawn(cmd, args, { cwd: ROOT, stdio: "inherit", ...opts });
  children.push(child);
  return waitForUrl(readyCheckUrl);
}

async function waitForUrl(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {
      // not up yet
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function cleanup() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

async function main() {
  const dbUrl = `file:${DB_PATH}`;
  const env = { ...process.env, DATABASE_URL: dbUrl };

  console.log("== 1/5 Applying migrations to a fresh e2e database ==");
  await run("npx", ["prisma", "migrate", "deploy"], { env });

  console.log("== 2/5 Seeding the published scholarship form ==");
  await run("npx", ["tsx", "prisma/seed.ts"], { env: { ...env, APP_URL } });

  console.log("== 3/5 Starting the Next.js app and demo host page ==");
  await spawnServer("npx", ["next", "dev", "-p", APP_PORT], { env }, APP_URL);
  await spawnServer("node", ["demo/serve.js"], { env: { ...env, DEMO_PORT } }, DEMO_URL);

  console.log("== 4/5 Running the demo agent against the demo host page (no API key) ==");
  const agentEnv = { ...env };
  delete agentEnv.ANTHROPIC_API_KEY;
  const { code, stdout } = await runCapture("node", ["agent/apply.js", DEMO_URL], { env: agentEnv });
  if (code !== 0) throw new Error("agent/apply.js exited non-zero");

  const jsonStart = stdout.indexOf("{");
  const confirmation = JSON.parse(stdout.slice(jsonStart));
  if (!confirmation.submission_id) throw new Error("No submission_id in agent output");
  console.log(`Agent confirmed submission: ${confirmation.submission_id}`);

  console.log("== 5/5 Verifying the submission is recorded with source=agent ==");
  const { stdout: checkOut } = await runCapture(
    "npx",
    ["tsx", "scripts/check-submission.ts", confirmation.submission_id],
    { env }
  );
  const submission = JSON.parse(checkOut.trim().split("\n").pop());

  if (!submission) throw new Error("Submission not found in database");
  if (submission.source !== "agent") throw new Error(`Expected source=agent, got ${submission.source}`);
  if (submission.agentName !== "scholarship-scout/0.1") throw new Error("Unexpected agent name");

  console.log("\nE2E PASS: zero-human-input agent submission verified end-to-end.");
}

main()
  .then(() => {
    cleanup();
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nE2E FAIL:", err.message);
    cleanup();
    process.exit(1);
  });
