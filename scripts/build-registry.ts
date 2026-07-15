// Materializes the registry of published forms as a structured, git-committable repo of JSON:
//   registry/index.json        — searchable summary of every published form
//   registry/forms/{id}.json   — full structured record (metadata + resource + agentic schema)
//
// This is the "highly structured, easily indexable" artifact an agent (or a data pipeline) can
// clone and grep directly, in addition to the live search API. Run: npm run registry:build

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";
import { toFormWithFields } from "../lib/forms";
import { buildAgenticSchema } from "../lib/agenticSchema";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const ROOT = join(__dirname, "..");
const REGISTRY_DIR = join(ROOT, "registry");
const FORMS_DIR = join(REGISTRY_DIR, "forms");

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({
  url: databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const rows = await prisma.form.findMany({
    where: { status: "published" },
    include: { fields: { orderBy: { order: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  rmSync(FORMS_DIR, { recursive: true, force: true });
  mkdirSync(FORMS_DIR, { recursive: true });

  const index = rows.map((row) => {
    const form = toFormWithFields(row);
    const schema = buildAgenticSchema(form, APP_URL);

    const record = {
      id: form.id,
      title: form.title,
      description: form.description,
      category: form.resource.category,
      tags: form.resource.tags,
      resource: {
        url: form.resource.resourceUrl,
        ...form.resource.og,
      },
      urls: {
        page: `${APP_URL}/f/${form.id}`,
        schema: `${APP_URL}/api/forms/${form.id}/schema`,
        submit: `${APP_URL}/api/forms/${form.id}/submissions`,
      },
      fields: schema.form.fields,
      updatedAt: row.updatedAt.toISOString(),
    };
    writeFileSync(join(FORMS_DIR, `${form.id}.json`), JSON.stringify(record, null, 2));

    return {
      id: form.id,
      title: form.title,
      description: form.description,
      category: form.resource.category,
      tags: form.resource.tags,
      resourceUrl: form.resource.resourceUrl,
      siteName: form.resource.og.siteName,
      record: `forms/${form.id}.json`,
    };
  });

  writeFileSync(
    join(REGISTRY_DIR, "index.json"),
    JSON.stringify(
      {
        protocol: "agentic-form/v1",
        generatedFrom: APP_URL,
        count: index.length,
        forms: index,
      },
      null,
      2
    )
  );

  console.log(`Registry built: ${index.length} form(s) -> registry/index.json + registry/forms/*.json`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
