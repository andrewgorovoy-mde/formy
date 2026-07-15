import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseDiscovery } = require("../../agent/lib/discover");

describe("parseDiscovery", () => {
  it("extracts an inline schema from the script tag", () => {
    const html = `<html><head>
      <meta name="agentic-form" content="v1">
      <link rel="agentic-form-schema" href="/api/forms/abc/schema">
      <script type="application/agentic-form+json">{"protocol":"agentic-form/v1","form":{"id":"abc"}}</script>
    </head><body></body></html>`;
    const result = parseDiscovery(html);
    expect(result.hasMarker).toBe(true);
    expect(result.inlineSchema).toEqual({ protocol: "agentic-form/v1", form: { id: "abc" } });
    expect(result.schemaUrl).toBe("/api/forms/abc/schema");
  });

  it("extracts the schema URL from a data-agentic-form-schema attribute on an embed iframe", () => {
    const html = `<html><body>
      <iframe
        src="https://app.example.com/f/abc"
        data-agentic-form="v1"
        data-agentic-form-schema="https://app.example.com/api/forms/abc/schema"
        style="width:100%;border:none;min-height:600px">
      </iframe>
    </body></html>`;
    const result = parseDiscovery(html);
    expect(result.hasMarker).toBe(true);
    expect(result.inlineSchema).toBeNull();
    expect(result.schemaUrl).toBe("https://app.example.com/api/forms/abc/schema");
  });

  it("reports no marker for an unrelated page", () => {
    const result = parseDiscovery("<html><body><h1>Just a page</h1></body></html>");
    expect(result.hasMarker).toBe(false);
    expect(result.inlineSchema).toBeNull();
    expect(result.schemaUrl).toBeNull();
  });
});
