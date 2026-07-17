// Single source of truth for the SQLite database URL, used by both the Prisma CLI config
// (migrations) and the runtime client so they always target the same file.
//
// Resolution order:
//   1. DATABASE_URL if explicitly set (local dev via .env, tests, or a manual Railway override)
//   2. On Railway with an attached volume: a file inside the volume mount, so data persists
//      across deploys — no env var required, and works regardless of the chosen mount path
//   3. Local fallback: ./dev.db
export function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return `file:${process.env.RAILWAY_VOLUME_MOUNT_PATH}/prod.db`;
  }
  return "file:./dev.db";
}

/** Strips the `file:` scheme for drivers/adapters that want a bare filesystem path. */
export function sqliteFilePath(url: string): string {
  return url.startsWith("file:") ? url.slice("file:".length) : url;
}
