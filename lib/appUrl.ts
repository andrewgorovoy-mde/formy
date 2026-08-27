import { NextRequest, NextResponse } from "next/server";

/**
 * Returns `APP_URL` with any trailing slash stripped, or `null` if it isn't set. Shared by
 * `getAppUrl` below (Route Handlers) and `getServerAppUrl` in `lib/serverAppUrl.ts` (Server
 * Components) — both need the exact same env-var resolution but differ in how they derive the
 * origin when `APP_URL` is unset (one has a `NextRequest`, the other only `next/headers`), so
 * they stay separate functions rather than being merged into one.
 */
export function explicitAppUrl(): string | null {
  return process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : null;
}

/**
 * Resolves the app's public base URL from within a Route Handler. Prefers the explicit
 * `APP_URL` env var (needed behind a reverse proxy/CDN whose forwarded Host can't be trusted),
 * falling back to the request's own origin for plain local/direct deployments.
 */
export function getAppUrl(request: NextRequest): string {
  return explicitAppUrl() ?? request.nextUrl.origin;
}

// These agent-facing routes (search, schema, submissions, the well-known registry document) are
// intentionally open to any origin with no auth — see the README's "MCP Server" section for the
// rationale. Every one of them needs the same preflight response, hence corsPreflight() below.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Shared `OPTIONS` handler for the CORS-open agent-facing routes: `export const OPTIONS = corsPreflight;` */
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
