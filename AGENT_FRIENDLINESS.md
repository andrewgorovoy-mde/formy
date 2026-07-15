# Making forms agent-friendly

An agent only uses the machine path if it can *discover* it at the layer it operates on.
A single embedded `<script>` schema isn't enough — a computer-use agent driving screenshots
never sees the DOM. So discovery is offered at every layer:

| Layer | Who it reaches | Signal |
|---|---|---|
| **Rendered pixels** | Computer-use / screenshot agents | Visible "🤖 Agent?" bar on the public form stating a machine path exists + the schema URL |
| **HTTP headers** | fetch/curl/crawler agents (no DOM) | `Link: <schema>; rel="agentic-form-schema"` and `X-Agentic-Form` headers on `/f/{id}` (via `middleware.ts`) |
| **DOM discovery tags** | Agents that know the protocol | `<meta>`, `<link>`, `<script type="application/agentic-form+json">` in the page head |
| **Semantic HTML** | Agents that read the DOM but not our protocol | inputs carry `name`/`id` = schema field key, `required`, `autocomplete`, label `for=` association, `role`/`aria` on option groups |
| **Domain index** | Agents landing anywhere on the origin | `/.well-known/agentic-forms.json` lists every published form's page, schema, and submit URL |
| **Form-level intent** | LLM-backed agents answering *well* | `form.agent_context` in the schema (tone/approach the creator wants) |

The demo agent (`agent/apply.js`) prefers the cheapest path: it reads the `Link` header first
and fetches the schema without ever parsing the page body, then falls back to DOM discovery.

## Not yet built (next strategic step)
An **MCP server** exposing each form as a callable tool is the highest-leverage next move: an
MCP-equipped agent would see forms in its tool catalog and never need to discover them from a
page at all.
