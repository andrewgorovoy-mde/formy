import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFormWithFields, toFormWithFields } from "@/lib/forms";
import { buildResponsesCsv, exportFilename } from "@/lib/csv";
import { authorizeFormOwner } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// Streams the form's responses as a CSV download (opens directly in Excel / Google Sheets).
// Private data — owner only.
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeFormOwner(request, id);
  if ("error" in auth) return auth.error;

  const form = await getFormWithFields(id);
  if (!form) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const submissions = await prisma.submission.findMany({
    where: { formId: id },
    orderBy: { createdAt: "desc" },
  });

  const formDef = toFormWithFields(form);
  const csv = buildResponsesCsv(
    formDef.fields,
    submissions.map((s) => ({
      answers: JSON.parse(s.answers),
      source: s.source,
      agentName: s.agentName,
      createdAt: s.createdAt,
    }))
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(form.title, "csv")}"`,
    },
  });
}
