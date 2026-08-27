import { NextRequest, NextResponse } from "next/server";
import { getFormWithFields, toFormWithFields } from "@/lib/forms";
import { buildAgenticSchema } from "@/lib/agenticSchema";
import { getAppUrl, CORS_HEADERS, corsPreflight } from "@/lib/appUrl";

type Params = { params: Promise<{ id: string }> };

// Public, CORS-open. The machine-readable form an agent (or the MCP server's `get_form` tool)
// fetches to learn what to answer and where to submit. 404s on drafts — only published forms
// are exposed.
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const form = await getFormWithFields(id);

  if (!form || form.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS_HEADERS });
  }

  const schema = buildAgenticSchema(toFormWithFields(form), getAppUrl(request));
  return NextResponse.json(schema, { headers: CORS_HEADERS });
}

export const OPTIONS = corsPreflight;
