import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { buildAgenticSchema } from "@/lib/agenticSchema";
import { getAppUrl, CORS_HEADERS } from "@/lib/appUrl";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const form = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  if (!form || form.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS_HEADERS });
  }

  const schema = buildAgenticSchema(toFormWithFields(form), getAppUrl(request));
  return NextResponse.json(schema, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
