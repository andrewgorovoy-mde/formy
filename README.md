# Agentic Forms

A form builder (Next.js App Router + SQLite/Prisma) where every published form is dual-mode:
humans see a normal web form, and agents discover a machine-readable schema embedded in the
page and submit via a plain JSON POST. See `PRD.md`-equivalent spec in the project brief for
the full protocol design (discovery tags, schema endpoint, submission validation).

## Setup

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies the schema
npm run db:seed          # seeds + publishes the sample "Rivera Foundation Scholarship" form
                          # and writes demo/scholarship-site.html with the embed pointed at it
npm run dev               # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js app in development |
| `npm run build` | `prisma generate && next build` — production build |
| `npm run start` | Start the production server (after `build`) |
| `npm run start:prod` | `prisma migrate deploy && next start -H 0.0.0.0` — used by the deploy config; applies pending migrations, then starts |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed the sample scholarship form (idempotent) and regenerate `demo/scholarship-site.html` |
| `npm run registry:build` | Materialize the published-form registry to `registry/index.json` + `registry/forms/{id}.json` (see `REGISTRY_AND_MCP.md`) |
| `npm test` | Run the unit + API integration test suite (Vitest) |
| `npm run test:e2e` | Full local end-to-end proof: fresh db, seed, live server, demo agent, verifies a real HTTP submission lands with `source=agent` |
| `npm run agent -- <url>` | Run the standalone demo agent against any URL with an embedded form |
| `npm run demo:serve` | Serve `demo/scholarship-site.html` locally (zero-dependency static server) |
| `npm run mcp` | Start the MCP server (see [MCP Server](#mcp-server) below) — set `FORMY_URL` first if not pointing at `localhost:3000` |

## Demo agent — no API key required

`agent/apply.js` is a standalone script (no framework) that discovers an embedded form,
answers it from `agent/profile.json`, submits, and self-corrects once on a `422`.

- If `ANTHROPIC_API_KEY` is set, it uses the Claude API to map the profile onto the form,
  honoring each field's `guidance` and `constraints`.
- **If no key is set**, it falls back to deterministic keyword matching (`agent/lib/match.js`)
  between field ids/labels and the profile shape — this is what makes the repo runnable and
  testable with zero API key. The fallback correctly fills the seeded scholarship form end to
  end (verified in `npm test` and `npm run test:e2e`).

Try it locally:

```bash
npm run demo:serve &         # serves demo/scholarship-site.html on :4000
node agent/apply.js http://localhost:4000/
```

## MCP Server

`mcp/server.js` exposes the form registry to any [MCP](https://modelcontextprotocol.io) client
(Claude Desktop, or any other MCP-capable agent host) as three tools, so an agent can search,
inspect, and fill out forms without ever scraping a page. It's a standalone, **zero third-party
dependency** Node script — no `npm install` inside `mcp/` is needed, only Node ≥20 (for global
`fetch`) — that speaks newline-delimited JSON-RPC 2.0 over stdin/stdout (the standard MCP "stdio"
transport).

### Tools

| Tool | Input | What it does |
|---|---|---|
| `search_forms` | `{ query?, category?, tags?, limit? }` | Relevance-ranked search over every published form. Returns each match's category, tags, resource link, and the URLs to read its schema or submit to it. |
| `get_form` | `{ form_id }` (required) | Fetches the full agentic schema for one form: its fields, types, constraints, and guidance. Call this after `search_forms` to learn exactly what a form expects. |
| `submit_form` | `{ form_id, answers, agent_name?, on_behalf_of? }` (`form_id`/`answers` required) | Submits answers on behalf of a user. `answers` is a map of field id → value (field ids come from `get_form`). On a validation failure the response carries per-field error messages so the calling agent can correct and retry — the tool call itself still "succeeds"; check the response body's `error`/`fields` keys. |

All three are thin adapters over the app's own public API (`/api/forms/search`,
`/api/forms/{id}/schema`, `/api/forms/{id}/submissions`) — the MCP server does no work beyond
shaping requests and relaying responses.

### The two environment variables

Two different env vars matter here, read by two different processes — mixing them up is the most
common setup mistake:

| Variable | Read by | Meaning |
|---|---|---|
| `FORMY_URL` | the MCP server (`mcp/server.js`) | Where the MCP server sends its requests. Defaults to `http://localhost:3000`. |
| `APP_URL` | the Formy app itself (`lib/appUrl.ts`) | What public origin the app embeds in the URLs it returns (in search results, schemas, and `/.well-known/agentic-forms.json`). Falls back to the incoming request's own Host header if unset. |

**In a non-local deployment, set both to the same public origin.** If you only set `FORMY_URL`
and forget `APP_URL` on the app side, the MCP server will still reach the app fine, but the
`page`/`schema`/`submit` links it hands back to the agent may point at the wrong host (e.g. an
internal hostname behind a reverse proxy) — a confusing, hard-to-diagnose bug on first deploy.

### Run it locally

```bash
# Terminal 1 — the Formy app itself
npm run dev                                            # http://localhost:3000

# Terminal 2 — the MCP server, pointed at it
FORMY_URL=http://localhost:3000 node mcp/server.js
```

`npm run mcp` (bare `node mcp/server.js`) works too for local dev, since its default already
matches — but it does **not** set `FORMY_URL` for you, so if you're used to that shortcut,
remember to export `FORMY_URL` first when pointing at anything other than `localhost:3000`.

The process just sits reading stdin/writing stdout — it's meant to be spawned by an MCP client,
not driven by hand. To sanity-check it directly, pipe a JSON-RPC line in:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  | FORMY_URL=http://localhost:3000 node mcp/server.js
```

which should print an `initialize` result to stdout and a `[formy-mcp] ready — proxying ...`
line to stderr.

### Deploy it against a remote/production instance

1. Deploy the Formy app itself (see `DEPLOY.md` for the Railway walkthrough — the same idea
   applies to any host that can run a stateful Node process with a persistent filesystem for
   SQLite).
2. On the **app's** environment, set `APP_URL` to its public origin, e.g.
   `https://forms.example.edu`.
3. Wherever the MCP server will run — typically the same machine as the MCP client (e.g. your
   laptop running Claude Desktop), not the server hosting the app — run it with `FORMY_URL` set
   to that same public origin:
   ```bash
   FORMY_URL=https://forms.example.edu node /abs/path/to/formy/mcp/server.js
   ```
   No separate build or deploy step exists for the MCP server itself; it just needs the repo (or
   at least `mcp/`) checked out on disk and network access to `FORMY_URL`.

### Register it with an MCP client

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "formy": {
      "command": "node",
      "args": ["/abs/path/to/formy/mcp/server.js"],
      "env": { "FORMY_URL": "http://localhost:3000" }
    }
  }
}
```

For a remote deployment, keep `command`/`args` exactly as above (the MCP server always runs
locally, next to the client) and only change `FORMY_URL`'s value to the remote origin, e.g.
`"env": { "FORMY_URL": "https://forms.example.edu" }`.

**The path in `args` must be absolute.** Claude Desktop spawns the process with an unspecified
working directory, so a relative path won't reliably resolve — by far the most common first-time
mistake with stdio MCP servers in general, not just this one. Any other MCP client works the same
way: spawn `node <absolute-path-to-mcp/server.js>` with `FORMY_URL` in its environment, and speak
newline-delimited JSON-RPC 2.0 over its stdin/stdout.

### Security posture and known limits

- **No authentication, by design.** `search`, `schema` (GET), and `submissions` (POST) are
  intentionally public and CORS-open, so any agent — this MCP server, the standalone demo agent,
  or a browser-based one — can discover and use the registry with zero setup. In practice this
  means anyone who can reach `FORMY_URL` can enumerate every published form and submit to any of
  them. If your deployment needs to restrict that, you'll need to add both a server-side check
  (in the relevant `app/api/**/route.ts` handlers) and a matching header/credential in
  `mcp/lib/tools.js`'s `callApi` — neither exists today.
- **No request timeout.** Every call from the MCP server to the app is a plain `fetch` with no
  `AbortController`. A hung or unreachable `FORMY_URL` will hang the corresponding tool call
  indefinitely from the MCP server's side.
- **No retry logic at the transport layer.** (The separate demo agent in `agent/` has its own
  one-retry-on-422 loop, but that's answer-correction logic, not network retry, and doesn't apply
  to the MCP server.)

## Tests

`npm test` runs entirely without an API key:

- **Unit tests** for the validation engine, agentic-schema builder, slug generation, and every
  piece of the demo agent (discovery parsing, deterministic matching, the Claude prompt/JSON
  extraction, and the submit→422→regenerate→retry orchestration with a mocked `fetch`).
- **Integration tests** exercise the real Next.js route handlers against a real SQLite database
  (via the Prisma `better-sqlite3` driver adapter) — form CRUD, key generation, publish/draft
  gating, the agentic schema endpoint (with CORS), and submission validation, including the
  exact PRD-style `422` per-field error messages.

`npm run test:e2e` goes one level further: it spins up a real `next dev` server and the demo
static site, runs the actual `agent/apply.js` CLI as a subprocess with `ANTHROPIC_API_KEY`
unset, and asserts a real HTTP submission was recorded with `source: "agent"`.

## Agent context

Each form has an optional **agent context** block (edited at the top of the builder). It's
form-wide guidance an agent applies to *every* answer — tone, approach, and what the reviewer
values — distinct from a field's per-question `guidance`. It surfaces in the agentic schema as
`form.agent_context` and is woven into the demo agent's Claude prompt. Humans never see it.

## Data model

SQLite via Prisma (`prisma/schema.prisma`): `Form` → `Field[]` → `Submission[]`. Field `key` is
generated once from the label on creation and stays stable afterward (edits to `label` don't
change `key`), since it's the contract agents rely on for `answers` and the schema `id`. The
`Form.agentContext` and `Form.accentColor` columns are presentational/meta and, except for
`agent_context`, are not exposed in the agent schema.
