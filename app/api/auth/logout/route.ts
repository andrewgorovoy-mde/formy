import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

// Public (no-op if already signed out). Clears the session cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
