import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { handleMessage } = require("../../mcp/lib/handlers");

const apiBase = "http://formy.test";

function jsonRes(status: number, body: unknown) {
  return { status, text: async () => JSON.stringify(body) } as unknown as Response;
}

describe("MCP handlers", () => {
  it("responds to initialize with protocol version and tool capability", async () => {
    const res = await handleMessage(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { apiBase }
    );
    expect(res.result.protocolVersion).toBe("2024-11-05");
    expect(res.result.capabilities.tools).toBeDefined();
    expect(res.result.serverInfo.name).toBe("formy");
  });

  it("lists the three registry tools", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, { apiBase });
    const names = res.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(["search_forms", "get_form", "submit_form"]);
  });

  it("returns null (no response) for the initialized notification", async () => {
    const res = await handleMessage(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { apiBase }
    );
    expect(res).toBeNull();
  });

  it("search_forms calls the search API and returns its JSON as text content", async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      return jsonRes(200, { count: 1, results: [{ id: "tutoring", title: "Tutoring" }] });
    };
    const res = await handleMessage(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "search_forms", arguments: { query: "math tutoring", limit: 5 } },
      },
      { apiBase, fetchImpl }
    );
    expect(calls[0]).toContain("/api/forms/search?");
    expect(calls[0]).toContain("q=math+tutoring");
    expect(calls[0]).toContain("limit=5");
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.results[0].id).toBe("tutoring");
    expect(res.result.isError).toBeUndefined();
  });

  it("submit_form POSTs an agent-attributed submission", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl = async (url: string, init: RequestInit) => {
      captured = { url, init };
      return jsonRes(201, { submission_id: "sub_1", status: "received" });
    };
    const res = await handleMessage(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "submit_form",
          arguments: { form_id: "f1", answers: { name: "Drew" }, agent_name: "campus-scout/1" },
        },
      },
      { apiBase, fetchImpl }
    );
    expect(captured!.url).toBe("http://formy.test/api/forms/f1/submissions");
    expect(captured!.init.method).toBe("POST");
    const sent = JSON.parse(captured!.init.body as string);
    expect(sent.answers).toEqual({ name: "Drew" });
    expect(sent.agent.name).toBe("campus-scout/1");
    expect(JSON.parse(res.result.content[0].text).submission_id).toBe("sub_1");
  });

  it("reports a tool error as isError content, not a JSON-RPC error", async () => {
    const res = await handleMessage(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "get_form", arguments: {} },
      },
      { apiBase }
    );
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toMatch(/form_id is required/);
  });

  it("returns method-not-found for unknown methods", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 6, method: "bogus/method" }, { apiBase });
    expect(res.error.code).toBe(-32601);
  });
});
