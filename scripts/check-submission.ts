// Helper invoked by scripts/e2e.mjs via `tsx` (the generated Prisma client
// is TypeScript-only, so this can't be dynamically imported from plain node).
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main() {
  const submissionId = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl,
  });
  const prisma = new PrismaClient({ adapter });
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  await prisma.$disconnect();
  console.log(JSON.stringify(submission));
}

main();
