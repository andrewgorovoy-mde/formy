import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { validateAnswers } from "@/lib/validation";
import { CORS_HEADERS } from "@/lib/appUrl";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const submissions = await prisma.submission.findMany({
    where: { formId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    submissions.map((s) => ({
      id: s.id,
      answers: JSON.parse(s.answers),
      source: s.source,
      agentName: s.agentName,
      agentOnBehalf: s.agentOnBehalf,
      createdAt: s.createdAt,
    }))
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const form = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  if (!form || form.status !== "published") {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "validation_failed", fields: { _form: "request body must be JSON" } },
      { status: 422, headers: CORS_HEADERS }
    );
  }

  const formDef = toFormWithFields(form);
  const result = validateAnswers(formDef.fields, body.answers);

  if (!result.valid) {
    return NextResponse.json(
      { error: "validation_failed", fields: result.errors },
      { status: 422, headers: CORS_HEADERS }
    );
  }

  const agent = body.agent && typeof body.agent === "object" ? body.agent : null;
  const submission = await prisma.submission.create({
    data: {
      formId: id,
      answers: JSON.stringify(result.normalized),
      source: agent ? "agent" : "human",
      agentName: agent && typeof agent.name === "string" ? agent.name : null,
      agentOnBehalf: agent && typeof agent.on_behalf_of === "string" ? agent.on_behalf_of : null,
    },
  });

  return NextResponse.json(
    { submission_id: submission.id, status: "received", form_id: id },
    { status: 201, headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
