"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthForm({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold tracking-tight text-stone-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white">F</span>
        Formy
      </Link>
      <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {isSignup ? "Build agent-discoverable forms in minutes." : "Sign in to manage your forms."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 placeholder-stone-300 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Password</span>
            <input
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 placeholder-stone-300 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-500 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-50"
          >
            {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-stone-500">
          {isSignup ? "Already have an account?" : "New to Formy?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setError("");
            }}
            className="font-medium text-violet-600 hover:text-violet-700"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
      <p className="mt-4 text-center text-xs text-stone-400">
        Looking for resources?{" "}
        <Link href="/discover" className="underline underline-offset-2 hover:text-stone-600">
          Browse the directory
        </Link>
      </p>
    </div>
  );
}
