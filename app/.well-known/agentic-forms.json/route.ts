import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppUrl, CORS_HEADERS } from "@/lib/appUrl";

// Domain-level discovery index (per the Agentic Form Protocol). An agent that lands anywhere on
// this origin can fetch /.well-known/agentic-forms.json to enumerate every published form and
// its schema URL — no page scraping required.
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request);
  const forms = await prisma.form.findMany({
    where: { status: "published" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      tags: true,
      resourceUrl: true,
      ogSiteName: true,
    },
  });

  return NextResponse.json(
    {
      protocol: "agentic-form/v1",
      search: `${appUrl}/api/forms/search`,
      forms: forms.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        category: f.category || undefined,
        tags: JSON.parse(f.tags || "[]"),
        resourceUrl: f.resourceUrl || undefined,
        siteName: f.ogSiteName || undefined,
        page: `${appUrl}/f/${f.id}`,
        schema: `${appUrl}/api/forms/${f.id}/schema`,
        submit: `${appUrl}/api/forms/${f.id}/submissions`,
      })),
    },
    { headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
