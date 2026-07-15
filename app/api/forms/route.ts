import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const forms = await prisma.form.findMany({
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
  const body = await request.json().catch(() => ({}));
  const form = await prisma.form.create({
    data: {
      title: typeof body.title === "string" && body.title.trim() ? body.title : "Untitled form",
      description: typeof body.description === "string" ? body.description : "",
    },
  });
  return NextResponse.json(form, { status: 201 });
}
