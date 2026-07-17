# Deploying Formy to Railway

Formy is a stateful full-stack app (Next.js + SQLite via Prisma). Railway runs it as a
persistent server with a real filesystem, so the SQLite database works as-is — it just needs to
live on a **persistent volume** so it survives redeploys.

The repo is already configured for this (`railway.json`, build/start scripts). The steps below
are the parts that need your Railway account.

## One-time setup

1. **Create the project**
   - Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** →
     select `andrewgorovoy-mde/formy`.
   - Railway auto-detects Next.js (Nixpacks) and reads `railway.json` for the build/start commands.

2. **Add a persistent volume** (this is the critical step — without it the DB resets on every deploy)
   - In the service → **Settings → Volumes → New Volume**.
   - Any mount path works (e.g. **`/data`**). The app auto-detects the volume's location via
     Railway's `RAILWAY_VOLUME_MOUNT_PATH` and stores the database as `prod.db` inside it — no
     env var required.

3. **Environment variables** (service → **Variables**) — all optional
   - `DATABASE_URL` — only set this to *override* the auto-detected volume path (e.g.
     `file:/data/prod.db`). Leave it unset and the app derives it from the volume mount.
   - `APP_URL` = your Railway public URL — only if you want absolute URLs in the agentic
     schema / registry hard-pinned; otherwise the app derives them from the request, which is
     correct on Railway.

4. **Deploy.** Railway will:
   - build: `npm run build` → `prisma generate && next build`
   - start: `npx prisma migrate deploy` (creates `/data/prod.db` + applies migrations on first
     boot, idempotent after) → `next start`

5. **Generate a domain**: service → **Settings → Networking → Generate Domain**.

## Optional: seed demo data

A fresh production DB has no forms. To load the sample scholarship form + campus resources,
run once from Railway's service shell (or a one-off command):

```bash
DATABASE_URL=file:/data/prod.db APP_URL=$APP_URL npm run db:seed
```

## How writes stay safe

All form/submission writes go to `prod.db` inside the mounted volume (path auto-detected from
`RAILWAY_VOLUME_MOUNT_PATH`), which persists across deploys and restarts. Both `prisma migrate
deploy` (at start) and the running app resolve the same path via `lib/databaseUrl.ts`, so they
always agree. Redeploying ships new code but keeps the data.

## Notes / gotchas

- **Don't remove the volume** — deleting it deletes the database.
- `better-sqlite3` is a native module; Railway's Linux build compiles/prebuilds it automatically.
- `prisma migrate deploy` only applies *pending* migrations, so it's safe to run on every boot.
- Single instance only: file-SQLite doesn't support multiple concurrent writer instances. If you
  later scale horizontally, that's the point to move to Postgres (Supabase/Neon) — the Prisma
  models stay the same, only the datasource/adapter changes.
