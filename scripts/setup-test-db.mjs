#!/usr/bin/env node
// Prepares a clean tests/tmp/test.db for the vitest suite by applying the
// migration SQL directly via the sqlite3 CLI (fast, and avoids depending on
// dev.db containing only schema with no leftover rows). Falls back to
// `prisma migrate deploy` if the sqlite3 CLI isn't available.

import { existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TEST_DIR = path.join(ROOT, "tests", "tmp");
const TEST_DB = path.join(TEST_DIR, "test.db");
const MIGRATIONS_DIR = path.join(ROOT, "prisma", "migrations");

mkdirSync(TEST_DIR, { recursive: true });
rmSync(TEST_DB, { force: true });

function hasSqlite3Cli() {
  try {
    execSync("which sqlite3", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (hasSqlite3Cli() && existsSync(MIGRATIONS_DIR)) {
  const migrationDirs = readdirSync(MIGRATIONS_DIR)
    .filter((dir) => existsSync(path.join(MIGRATIONS_DIR, dir, "migration.sql")))
    .sort();
  for (const dir of migrationDirs) {
    const sqlPath = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    execSync(`sqlite3 "${TEST_DB}" < "${sqlPath}"`, { cwd: ROOT, stdio: "inherit", shell: "/bin/bash" });
  }
  console.log(`Prepared tests/tmp/test.db from ${migrationDirs.length} migration(s) via sqlite3 CLI`);
} else {
  console.log("sqlite3 CLI not found — running migrations via the Prisma schema engine");
  execSync("npx prisma migrate deploy", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB}` },
  });
}
