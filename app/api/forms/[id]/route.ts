import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFormWithFields, replaceFormFields, toFormWithFields, type FieldInput } from "@/lib/forms";
import { authorizeFormOwner } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// String fields a PATCH may update as-is; anything else (tags, status) needs its own coercion
// below, so it's handled separately rather than through this whitelist.
const STRING_FIELDS = [
  "title",
  "description",
  "accentColor",
  "agentContext",
  "category",
  "resourceUrl",
  "ogTitle",
  "ogDescription",
  "ogImage",
  "ogSiteName",
] as const;

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeFormOwner(request, id);
  if ("error" in auth) return auth.error;

  const form = await getFormWithFields(id);
  if (!form) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(toFormWithFields(form));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeFormOwner(request, id);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  for (const field of STRING_FIELDS) {
    if (typeof body[field] === "string") data[field] = body[field];
  }
  if (Array.isArray(body.tags)) {
    data.tags = JSON.stringify(body.tags.filter((t: unknown) => typeof t === "string"));
  }
  if (body.status === "draft" || body.status === "published") data.status = body.status;

  if (Object.keys(data).length > 0) {
    await prisma.form.update({ where: { id }, data });
  }

  if (Array.isArray(body.fields)) {
    await replaceFormFields(id, body.fields as FieldInput[]);
  }

  // Re-fetch rather than assume the update above still applies: the row could have been deleted
  // by a concurrent request between the update and this read.
  const updated = await getFormWithFields(id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(toFormWithFields(updated));
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeFormOwner(request, id);
  if ("error" in auth) return auth.error;
  await prisma.form.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
