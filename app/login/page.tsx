import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in · Formy",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { mode } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <AuthForm initialMode={mode === "signup" ? "signup" : "login"} />
    </main>
  );
}
