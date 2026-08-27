import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

// Public. Verifies email/password and sets the signed session cookie on success.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic message + a hash check on the miss path to avoid leaking which emails exist.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const res = NextResponse.json({ id: user.id, email: user.email }, { status: 200 });
  setSessionCookie(res, user.id);
  return res;
}
