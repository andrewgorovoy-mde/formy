import { NextRequest, NextResponse } from "next/server";

// Advertises the agentic-form schema at the HTTP layer for agents that fetch the page as raw
// HTTP (curl/fetch) and never render or parse the DOM. RFC 8288 Link header + a simple flag
// header point them straight at the machine-readable schema.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const match = request.nextUrl.pathname.match(/^\/f\/([^/]+)$/);
  if (match) {
    const formId = match[1];
    const schemaUrl = `${request.nextUrl.origin}/api/forms/${formId}/schema`;
    response.headers.set("Link", `<${schemaUrl}>; rel="agentic-form-schema"; type="application/json"`);
    response.headers.set("X-Agentic-Form", "v1");
    response.headers.set("X-Agentic-Form-Schema", schemaUrl);
  }

  return response;
}

export const config = {
  matcher: "/f/:id",
};
