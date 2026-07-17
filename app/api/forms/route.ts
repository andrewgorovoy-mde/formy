import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// Lists the signed-in user's own forms (used by client-side callers). Public discovery uses
// /api/forms/search instead.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const forms = await prisma.form.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return NextResponse.json(
    forms.map((f) => ({
      id: f.id,
      title: f.title,
      status: f.status,
      accentColor: f.accentColor,
      responseCount: f._count.submissions,
      updatedAt: f.updatedAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const form = await prisma.form.create({
    data: {
      userId: user.id,
      title: typeof body.title === "string" && body.title.trim() ? body.title : "Untitled form",
      description: typeof body.description === "string" ? body.description : "",
    },
  });
  return NextResponse.json(form, { status: 201 });
}
