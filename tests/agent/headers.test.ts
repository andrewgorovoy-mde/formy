import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { schemaUrlFromHeaders, discoverSchema } = require("../../agent/apply");

function headers(map: Record<string, string>) {
  return { get: (k: string) => map[k.toLowerCase()] ?? null };
}

describe("schemaUrlFromHeaders", () => {
  it("reads the direct X-Agentic-Form-Schema header", () => {
    const res = { headers: headers({ "x-agentic-form-schema": "https://x/api/forms/a/schema" }) };
    expect(schemaUrlFromHeaders(res)).toBe("https://x/api/forms/a/schema");
  });

  it("parses the RFC 8288 Link header", () => {
    const res = {
      headers: headers({
        link: '<https://x/api/forms/a/schema>; rel="agentic-form-schema"; type="application/json"',
      }),
    };
    expect(schemaUrlFromHeaders(res)).toBe("https://x/api/forms/a/schema");
  });

  it("returns null when no agentic headers are present", () => {
    expect(schemaUrlFromHeaders({ headers: headers({}) })).toBeNull();
  });
});

describe("discoverSchema via HTTP headers (no DOM parsing)", () => {
  it("fetches the schema from the Link header without ever reading the page body", async () => {
    const schema = { protocol: "agentic-form/v1", form: { title: "T", fields: [] } };
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      if (url === "https://host/f/a") {
        return {
          ok: true,
          headers: headers({ "x-agentic-form-schema": "https://host/api/forms/a/schema" }),
          text: async () => {
            throw new Error("should not read body when header discovery succeeds");
          },
        };
      }
      return { ok: true, headers: headers({}), json: async () => schema };
    };

    const result = await discoverSchema("https://host/f/a", fetchImpl);
    expect(result).toEqual(schema);
    expect(calls).toEqual(["https://host/f/a", "https://host/api/forms/a/schema"]);
  });
});
