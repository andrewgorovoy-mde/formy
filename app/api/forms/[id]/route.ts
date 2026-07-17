import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { replaceFormFields, toFormWithFields, type FieldInput } from "@/lib/forms";
import { authorizeFormOwner } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeFormOwner(request, id);
  if ("error" in auth) return auth.error;

  const form = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(toFormWithFields(form));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeFormOwner(request, id);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.accentColor === "string") data.accentColor = body.accentColor;
  if (typeof body.agentContext === "string") data.agentContext = body.agentContext;
  if (typeof body.category === "string") data.category = body.category;
  if (Array.isArray(body.tags)) {
    data.tags = JSON.stringify(body.tags.filter((t: unknown) => typeof t === "string"));
  }
  if (typeof body.resourceUrl === "string") data.resourceUrl = body.resourceUrl;
  if (typeof body.ogTitle === "string") data.ogTitle = body.ogTitle;
  if (typeof body.ogDescription === "string") data.ogDescription = body.ogDescription;
  if (typeof body.ogImage === "string") data.ogImage = body.ogImage;
  if (typeof body.ogSiteName === "string") data.ogSiteName = body.ogSiteName;
  if (body.status === "draft" || body.status === "published") data.status = body.status;

  if (Object.keys(data).length > 0) {
    await prisma.form.update({ where: { id }, data });
  }

  if (Array.isArray(body.fields)) {
    await replaceFormFields(id, body.fields as FieldInput[]);
  }

  const updated = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(toFormWithFields(updated!));
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeFormOwner(request, id);
  if ("error" in auth) return auth.error;
  await prisma.form.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
