# Formy as a searchable resource registry (Consensus-style)

Every published form is stored as a **structured, indexable resource record** so an AI agent can
query the registry and retrieve the right form for a need — the way `consensus.app`'s MCP lets an
agent query peer-reviewed papers. The motivating use case: a campus has resources scattered across
dozens of sites; a student's agent asks "where do I get free calculus tutoring?" and gets the
exact intake form back.

## What makes a form a searchable resource

Each form carries registry metadata (edited in the builder's **Resource & discovery** panel):

- `category` — e.g. "Academic Support", "Mental Health", "Financial Aid"
- `tags[]` — topic keywords (also used for synonym coverage in search)
- `resourceUrl` + Open Graph metadata (`ogTitle`, `ogDescription`, `ogImage`, `ogSiteName`) —
  the canonical link to the source site, fetched via the **Fetch info** button (`GET /api/og`)

All of this is exposed to agents in the form's schema (`form.category`, `form.tags`,
`form.resource`) and is what the search ranks over.

## Three ways an agent can query the registry

1. **Search API** — `GET /api/forms/search?q=...&category=...&tags=a,b&limit=N`
   Returns relevance-ranked, structured results: `{ id, title, description, category, tags,
   resourceUrl, siteName, score, matchedTerms, page, schema, submit }`.

2. **`/.well-known/agentic-forms.json`** — the whole published registry in one document, with a
   `search` URL and per-form metadata. An agent landing on the origin can enumerate everything.

3. **MCP server** (`mcp/server.js`) — the primary agent interface: `search_forms`, `get_form`,
   `submit_form` over stdio JSON-RPC. See the README's **[MCP Server](README.md#mcp-server)**
   section for the full setup, deployment, and security-posture guide — kept there rather than
   duplicated here so the two don't drift.

## The registry as a repo of files

`npm run registry:build` materializes the DB into a git-committable structured repo:

- `registry/index.json` — searchable summary of every published form
- `registry/forms/{id}.json` — full record (metadata + resource + agentic schema)

This is the "clone-and-grep" artifact an external pipeline or agent can consume directly, in
addition to the live API.

## Search: how it ranks (and its limits)

`lib/search.ts` scores each form by weighted keyword hits — title (×6) > tags/category (×5) >
OG title (×4) > description (×3) > field labels (×2) > guidance (×1) — with light prefix-stemming
(`stressed`~`stress`, `tutoring`~`tutor`) and stopword filtering. Results carry a `score` and the
`matchedTerms`, so ranking is transparent, not opaque.

This is **lexical** search: it matches words, not meaning, so it relies on good tags for synonym
coverage (`anxious`~`anxiety` needs both as tags). **The clear next step is semantic search** —
embed each form's metadata and the query, rank by vector similarity. That's what Consensus actually
uses, and it removes the tag-vocabulary dependency. The current structured records already contain
exactly the text you'd embed.
