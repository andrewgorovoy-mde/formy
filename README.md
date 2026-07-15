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
| `npm run dev` | Start the Next.js app |
| `npm run db:seed` | Seed the sample scholarship form (idempotent) and regenerate `demo/scholarship-site.html` |
| `npm test` | Run the unit + API integration test suite (Vitest) |
| `npm run test:e2e` | Full local end-to-end proof: fresh db, seed, live server, demo agent, verifies a real HTTP submission lands with `source=agent` |
| `npm run agent -- <url>` | Run the standalone demo agent against any URL with an embedded form |
| `npm run demo:serve` | Serve `demo/scholarship-site.html` locally (zero-dependency static server) |

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
