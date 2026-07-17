import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

describe("password hashing", () => {
  it("verifies a matching password", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", stored)).toBe(false);
  });

  it("produces a different hash each time (random salt)", () => {
    const a = hashPassword("same password");
    const b = hashPassword("same password");
    expect(a).not.toBe(b);
    expect(verifyPassword("same password", a)).toBe(true);
    expect(verifyPassword("same password", b)).toBe(true);
  });

  it("rejects malformed stored values gracefully", () => {
    expect(verifyPassword("anything", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});

describe("session cookie signing", () => {
  it("round-trips a valid session", () => {
    const token = signSession("user_123");
    expect(verifySession(token)).toBe("user_123");
  });

  it("rejects a tampered payload", () => {
    const token = signSession("user_123");
    const [payload, sig] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ uid: "user_999", exp: Date.now() + 100000 })).toString(
      "base64url"
    );
    expect(verifySession(`${tamperedPayload}.${sig}`)).toBeNull();
    void payload;
  });

  it("rejects a tampered signature", () => {
    const token = signSession("user_123");
    const [payload] = token.split(".");
    expect(verifySession(`${payload}.deadbeef`)).toBeNull();
  });

  it("rejects an expired session", () => {
    const issuedAt = Date.now() - 40 * 24 * 60 * 60 * 1000; // 40 days ago, TTL is 30
    const token = signSession("user_123", issuedAt);
    expect(verifySession(token)).toBeNull();
  });

  it("rejects garbage tokens without throwing", () => {
    expect(verifySession("not-a-token")).toBeNull();
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession("")).toBeNull();
  });
});
