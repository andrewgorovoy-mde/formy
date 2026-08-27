import { headers } from "next/headers";
import { explicitAppUrl } from "@/lib/appUrl";

/**
 * Resolves the app's public base URL from within a Server Component (no `NextRequest` is
 * available here, unlike `getAppUrl` in `lib/appUrl.ts`, which is the Route Handler equivalent).
 */
export async function getServerAppUrl(): Promise<string> {
  const explicit = explicitAppUrl();
  if (explicit) return explicit;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
