import { NextRequest, NextResponse } from "next/server";
import { fetchOg, fallbackOg } from "@/lib/og";
import { CORS_HEADERS } from "@/lib/appUrl";

// Fetches Open Graph metadata for a URL so the builder can preview a resource link and store a
// rich, indexable record. Used by the "fetch info" button in the builder.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400, headers: CORS_HEADERS });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400, headers: CORS_HEADERS });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json(
      { error: "url must be http(s)" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const og = await fetchOg(url).catch(() => fallbackOg(url));
  return NextResponse.json(og, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
