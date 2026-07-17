import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Zero-dependency email/password auth: scrypt password hashing + a stateless, HMAC-signed
// session cookie. No external auth library or session table needed.

export const SESSION_COOKIE = "formy_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret(): string {
  return process.env.SESSION_SECRET || "formy-dev-insecure-secret-change-in-prod";
}

// ---- password hashing (scrypt) ----

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// ---- session cookie (HMAC-signed) ----

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function signSession(userId: string, now = Date.now()): string {
  const payload = b64url(JSON.stringify({ uid: userId, exp: now + SESSION_TTL_MS }));
  const sig = b64url(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64url(createHmac("sha256", secret()).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof uid !== "string" || typeof exp !== "number" || exp < now) return null;
    return uid;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};

export function setSessionCookie(res: NextResponse, userId: string) {
  res.cookies.set(SESSION_COOKIE, signSession(userId), SESSION_COOKIE_OPTIONS);
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

// ---- current user lookup ----

export type SessionUser = { id: string; email: string };

async function userById(uid: string | null): Promise<SessionUser | null> {
  if (!uid) return null;
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, email: true } });
  return user;
}

/** For Server Components / server actions — reads the cookie via next/headers. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return userById(verifySession(store.get(SESSION_COOKIE)?.value));
}

/** For Route Handlers — reads the cookie off the request (works in tests too). */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  return userById(verifySession(request.cookies.get(SESSION_COOKIE)?.value));
}

/**
 * Authorizes a form mutation: caller must be signed in AND own the form. Returns the user + form
 * on success, or a ready-to-return NextResponse error otherwise.
 */
export async function authorizeFormOwner(
  request: NextRequest,
  formId: string
): Promise<{ user: SessionUser; form: { id: string; userId: string | null } } | { error: NextResponse }> {
  const user = await getSessionUser(request);
  if (!user) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const form = await prisma.form.findUnique({ where: { id: formId }, select: { id: true, userId: true } });
  if (!form) {
    return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }
  if (form.userId !== user.id) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user, form };
}
