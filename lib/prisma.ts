import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { resolveDatabaseUrl, sqliteFilePath } from "@/lib/databaseUrl";

// Cache the client on `globalThis` in development: Next.js's dev server hot-reloads modules on
// every file save, which would otherwise construct a fresh PrismaClient (and a fresh SQLite
// connection) per reload. Skipped in production, where the module is only ever loaded once.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaBetterSqlite3({
  url: sqliteFilePath(resolveDatabaseUrl()),
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
