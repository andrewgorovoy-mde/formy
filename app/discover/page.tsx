import Link from "next/link";
import type { Metadata } from "next";
import { DiscoverClient } from "@/components/discover/DiscoverClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover resources · Formy",
  description: "Search across campus resources and intake forms.",
};

export default function DiscoverPage() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#FAFAF9]/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-6">
          <Link href="/discover" className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-sm text-white">
              F
            </span>
            Formy Resources
          </Link>
          <Link href="/" className="text-sm font-medium text-stone-500 hover:text-stone-800">
            Manage forms →
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <DiscoverClient />
      </main>
    </>
  );
}
