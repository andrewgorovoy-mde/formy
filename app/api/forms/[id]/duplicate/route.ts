import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeFormOwner } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// Duplicates a form (metadata + all fields) as a new draft owned by the caller. Submissions are
// not copied. Field keys are preserved verbatim — they're local to the new form, so no collision.
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeFormOwner(request, id);
  if ("error" in auth) return auth.error;

  const source = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!source) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const copy = await prisma.form.create({
    data: {
      userId: auth.user.id,
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
