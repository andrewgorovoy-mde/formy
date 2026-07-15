import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { searchForms } from "@/lib/search";
import { getAppUrl, CORS_HEADERS } from "@/lib/appUrl";

// Structured relevance search across the registry of published forms. This is the "Consensus for
// campus resources" query surface: an agent (or the MCP server) sends a query and gets back
// ranked, structured results — each with the resource link, category, tags, score, and the URLs
// needed to fetch the full schema or submit.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? undefined;
  const category = params.get("category") ?? undefined;
  const tags = params.get("tags")
    ? params.get("tags")!.split(",").map((t) => t.trim()).filter(Boolean)
    : undefined;
  const limitRaw = params.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const rows = await prisma.form.findMany({
    where: { status: "published" },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  const forms = rows.map(toFormWithFields);

  const results = searchForms(forms, { q, category, tags, limit });
  const appUrl = getAppUrl(request);

  return NextResponse.json(
    {
      protocol: "agentic-form/v1",
      query: { q: q ?? null, category: category ?? null, tags: tags ?? null },
      count: results.length,
      results: results.map((r) => ({
        ...r,
        page: `${appUrl}/f/${r.id}`,
        schema: `${appUrl}/api/forms/${r.id}/schema`,
        submit: `${appUrl}/api/forms/${r.id}/submissions`,
      })),
    },
    { headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
