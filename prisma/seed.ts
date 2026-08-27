import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({
  url: databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl,
});
const prisma = new PrismaClient({ adapter });
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// Keys match the worked example in PRD §4.2 exactly.
const SCHOLARSHIP_FIELDS = [
  {
    key: "full_name",
    label: "Full legal name",
    type: "short_text",
    required: true,
    guidance: "As it appears on government ID.",
  },
  {
    key: "email",
    label: "Contact email",
    type: "email",
    required: true,
    guidance: "",
  },
  {
    key: "gpa",
    label: "Current GPA",
    type: "number",
    required: true,
    guidance: "",
    constraints: { min: 0, max: 4.0 },
  },
  {
    key: "grad_year",
    label: "Expected graduation year",
    type: "select",
    required: true,
    guidance: "",
    options: ["2026", "2027", "2028", "2029"],
  },
  {
    key: "areas",
    label: "Areas of study",
    type: "multi_select",
    required: false,
    guidance: "",
    options: ["Climate", "Conservation", "Policy", "Energy"],
  },
  {
    key: "essay",
    label: "Why do you deserve this scholarship?",
    type: "long_text",
    required: true,
    guidance:
      "150–300 words. Judges value specific personal experience over generic ambition.",
    constraints: { min_length: 400, max_length: 2500 },
  },
];

function writeDemoSite(formId: string) {
  const publicUrl = `${APP_URL}/f/${formId}`;
  const schemaUrl = `${APP_URL}/api/forms/${formId}/schema`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Rivera Foundation for Environmental Leadership</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 840px; margin: 0 auto; padding: 48px 24px; color: #1c1917; }
    header { border-bottom: 1px solid #e7e5e4; padding-bottom: 24px; margin-bottom: 40px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    p.lead { color: #57534e; font-size: 16px; }
    nav a { margin-right: 20px; color: #10B981; text-decoration: none; font-weight: 500; }
    section { margin-top: 40px; }
    h2 { font-size: 20px; }
    iframe { margin-top: 24px; }
  </style>
</head>
<body>
  <header>
    <nav><a href="#about">About</a><a href="#apply">Apply</a></nav>
    <h1>Rivera Foundation for Environmental Leadership</h1>
    <p class="lead">Supporting the next generation of environmental scientists and policy leaders.</p>
  </header>

  <section id="about">
    <h2>2026 Scholarship</h2>
    <p>
      Each year the Rivera Foundation awards a scholarship to an undergraduate studying
      environmental science. Applications are reviewed on a rolling basis.
    </p>
  </section>

  <section id="apply">
    <h2>Apply now</h2>
    <p>Complete the application below. It takes about 10 minutes.</p>
    <iframe
      src="${publicUrl}"
      data-agentic-form="v1"
      data-agentic-form-schema="${schemaUrl}"
      style="width:100%;border:none;min-height:900px">
    </iframe>
  </section>
</body>
</html>
`;
  writeFileSync(join(__dirname, "..", "demo", "scholarship-site.html"), html);
}

async function main() {
  const existing = await prisma.form.findFirst({
    where: { title: "Rivera Foundation Scholarship 2026" },
  });
  if (existing) {
    console.log(`Seed form already exists: ${existing.id}`);
    // Backfill resource metadata on older seeds and ensure campus resources exist.
    await prisma.form.update({
      where: { id: existing.id },
      data: {
        category: "Financial Aid",
        tags: JSON.stringify(["scholarship", "environment", "undergraduate"]),
        resourceUrl: "https://example.edu/rivera-scholarship",
        ogTitle: "Rivera Foundation Scholarship",
        ogDescription: "Annual scholarship for undergraduates in environmental science.",
        ogSiteName: "example.edu",
      },
    });
    writeDemoSite(existing.id);
    await seedCampusResources();
    console.log(`Wrote demo/scholarship-site.html`);
    return;
  }

  const form = await prisma.form.create({
    data: {
      title: "Rivera Foundation Scholarship 2026",
      description: "For undergraduates studying environmental science.",
      status: "published",
      accentColor: "#10B981",
      agentContext:
        "Write in a warm, first-person voice. Our reviewers value concrete lived experience and specific detail over polished ambition or buzzwords. Be honest and specific; when unsure, keep the answer concise rather than padding it.",
      category: "Financial Aid",
      tags: JSON.stringify(["scholarship", "environment", "undergraduate"]),
      resourceUrl: "https://example.edu/rivera-scholarship",
      ogTitle: "Rivera Foundation Scholarship",
      ogDescription: "Annual scholarship for undergraduates in environmental science.",
      ogSiteName: "example.edu",
    },
  });

  await prisma.field.createMany({
    data: SCHOLARSHIP_FIELDS.map((f, index) => ({
      formId: form.id,
      order: index,
      key: f.key,
      type: f.type,
      label: f.label,
      guidance: f.guidance ?? "",
      required: f.required ?? false,
      options: JSON.stringify("options" in f ? f.options : []),
      constraints: JSON.stringify("constraints" in f ? f.constraints : {}),
    })),
  });

  writeDemoSite(form.id);
  await seedCampusResources();

  console.log(`Seeded published form: ${form.id}`);
  console.log(`Public URL:  ${APP_URL}/f/${form.id}`);
  console.log(`Schema URL:  ${APP_URL}/api/forms/${form.id}/schema`);
  console.log(`Wrote demo/scholarship-site.html`);
}

// A small spread of campus resources so the registry search has something to rank. Each is a
// lightweight one-field intake so the demo stays focused on discovery, not form-filling.
const CAMPUS_RESOURCES = [
  {
    title: "Free Drop-in Math & Science Tutoring",
    description:
      "Peer tutoring for calculus, chemistry, physics, and statistics. No appointment needed.",
    category: "Academic Support",
    tags: ["tutoring", "math", "calculus", "science", "chemistry", "physics", "homework", "study", "drop-in"],
    resourceUrl: "https://example.edu/tutoring-center",
    ogSiteName: "example.edu",
    accentColor: "#0EA5E9",
    field: { key: "topic", label: "What subject do you need help with?", type: "short_text" },
  },
  {
    title: "Counseling & Psychological Services Intake",
    description:
      "Confidential mental-health support: counseling, therapy, and help with anxiety, stress, and depression.",
    category: "Mental Health",
    tags: ["counseling", "counselor", "therapy", "anxious", "anxiety", "stress", "stressed", "depression", "wellness", "mental", "confidential", "support"],
    resourceUrl: "https://example.edu/caps",
    ogSiteName: "example.edu",
    accentColor: "#EC4899",
    field: { key: "reason", label: "Briefly, what would you like support with?", type: "long_text" },
  },
  {
    title: "Emergency Financial Aid Request",
    description:
      "Short-term emergency grants for students facing unexpected financial hardship, rent, or food insecurity.",
    category: "Financial Aid",
    tags: ["emergency", "grants", "money", "rent", "food", "hardship", "financial"],
    resourceUrl: "https://example.edu/emergency-aid",
    ogSiteName: "example.edu",
    accentColor: "#F59E0B",
    field: { key: "situation", label: "Describe your situation", type: "long_text" },
  },
  {
    title: "Career Services — Resume Review Booking",
    description:
      "Book a one-on-one resume, cover-letter, and interview-prep review with a career advisor.",
    category: "Career Services",
    tags: ["career", "resume", "cover letter", "interview", "internship", "jobs", "advising"],
    resourceUrl: "https://example.edu/career-services",
    ogSiteName: "example.edu",
    accentColor: "#8B5CF6", // matches DEFAULT_ACCENT in lib/colors.ts
    field: { key: "goal", label: "What role or industry are you targeting?", type: "short_text" },
  },
];

async function seedCampusResources() {
  for (const r of CAMPUS_RESOURCES) {
    const existing = await prisma.form.findFirst({ where: { title: r.title } });
    if (existing) {
      // Refresh classification/resource metadata so re-seeding picks up richer tags.
      await prisma.form.update({
        where: { id: existing.id },
        data: {
          description: r.description,
          category: r.category,
          tags: JSON.stringify(r.tags),
          resourceUrl: r.resourceUrl,
          ogTitle: r.title,
          ogDescription: r.description,
          ogSiteName: r.ogSiteName,
        },
      });
      continue;
    }
    const created = await prisma.form.create({
      data: {
        title: r.title,
        description: r.description,
        status: "published",
        accentColor: r.accentColor,
        category: r.category,
        tags: JSON.stringify(r.tags),
        resourceUrl: r.resourceUrl,
        ogTitle: r.title,
        ogDescription: r.description,
        ogSiteName: r.ogSiteName,
      },
    });
    await prisma.field.create({
      data: {
        formId: created.id,
        order: 0,
        key: r.field.key,
        type: r.field.type,
        label: r.field.label,
        required: true,
        options: "[]",
        constraints: "{}",
      },
    });
  }
  console.log(`Seeded ${CAMPUS_RESOURCES.length} campus resource forms`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
