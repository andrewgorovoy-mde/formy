// Tool definitions and execution for the Formy MCP server. Kept separate from the stdio
// transport so the logic is unit-testable with an injected fetch. Each tool is a thin, typed
// adapter over the Formy HTTP API — search the registry, read a form's schema, submit answers.

const TOOLS = [
  {
    name: "search_forms",
    description:
      "Search the registry of published forms/resources by relevance. Use this to find the right form for a need (e.g. a student looking for 'free math tutoring'). Returns ranked results with each form's category, tags, resource link, and the URLs to read its schema or submit to it.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text search query, e.g. 'mental health counseling'" },
        category: { type: "string", description: "Optional exact category filter, e.g. 'Academic Support'" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags that must all be present",
        },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_form",
    description:
      "Fetch the full machine-readable schema for one form by id: its fields, types, constraints, per-field and form-level guidance, and its resource metadata. Call this after search_forms to learn exactly what a form expects before submitting.",
    inputSchema: {
      type: "object",
      properties: {
        form_id: { type: "string", description: "The form id from a search result" },
      },
      required: ["form_id"],
    },
  },
  {
    name: "submit_form",
    description:
      "Submit answers to a form on behalf of a user. answers is an object keyed by field id (from get_form). The submission is validated server-side; on a validation error the per-field messages are returned so you can correct and retry.",
    inputSchema: {
      type: "object",
      properties: {
        form_id: { type: "string" },
        answers: { type: "object", description: "Map of field id -> answer value" },
        agent_name: { type: "string", description: "Identifier for the acting agent" },
        on_behalf_of: { type: "string", description: "Who the submission is for (e.g. an email)" },
      },
      required: ["form_id", "answers"],
    },
  },
];

// Sends no auth header and no request timeout: the Formy routes this proxies to are
// intentionally public/CORS-open (see README's "MCP Server" section), so no credential is
// needed today, but that also means a hung or unreachable `apiBase` will hang the calling
// tools/call indefinitely — there's no AbortController here. A non-JSON response body (e.g. an
// HTML error page from a misconfigured proxy) is returned as `{ raw: text }` rather than thrown.
async function callApi(apiBase, path, init, fetchImpl) {
  const doFetch = fetchImpl || fetch;
  const res = await doFetch(`${apiBase}${path}`, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function runTool(name, args, { apiBase, fetchImpl }) {
  args = args || {};
  switch (name) {
    case "search_forms": {
      const params = new URLSearchParams();
      if (args.query) params.set("q", args.query);
      if (args.category) params.set("category", args.category);
      if (Array.isArray(args.tags) && args.tags.length) params.set("tags", args.tags.join(","));
      if (args.limit) params.set("limit", String(args.limit));
      const { body } = await callApi(apiBase, `/api/forms/search?${params.toString()}`, undefined, fetchImpl);
      return body;
    }
    case "get_form": {
      if (!args.form_id) throw new Error("form_id is required");
      const { status, body } = await callApi(
        apiBase,
        `/api/forms/${encodeURIComponent(args.form_id)}/schema`,
        undefined,
        fetchImpl
      );
      if (status === 404) throw new Error(`Form not found or not published: ${args.form_id}`);
      return body;
    }
    case "submit_form": {
      if (!args.form_id) throw new Error("form_id is required");
      const payload = {
        answers: args.answers || {},
        agent: {
          name: args.agent_name || "formy-mcp/0.1",
          on_behalf_of: args.on_behalf_of,
        },
      };
      const { body } = await callApi(
        apiBase,
        `/api/forms/${encodeURIComponent(args.form_id)}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        fetchImpl
      );
      return body;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

module.exports = { TOOLS, runTool };
