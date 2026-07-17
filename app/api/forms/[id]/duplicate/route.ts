import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// Duplicates a form (metadata + all fields) as a new draft. Submissions are not copied. Field
// keys are preserved verbatim — they're local to the new form, so there's no collision risk.
export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const source = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!source) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const copy = await prisma.form.create({
    data: {
      title: `${source.title} (copy)`,
      description: source.description,
      status: "draft",
      accentColor: source.accentColor,
      agentContext: source.agentContext,
      category: source.category,
      tags: source.tags,
      resourceUrl: source.resourceUrl,
      ogTitle: source.ogTitle,
      ogDescription: source.ogDescription,
      ogImage: source.ogImage,
      ogSiteName: source.ogSiteName,
      fields: {
        create: source.fields.map((f) => ({
          order: f.order,
          key: f.key,
          type: f.type,
          label: f.label,
          guidance: f.guidance,
          required: f.required,
          options: f.options,
          constraints: f.constraints,
        })),
      },
    },
  });

  return NextResponse.json({ id: copy.id }, { status: 201 });
}
