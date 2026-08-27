"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useClickOutside } from "@/components/hooks/useClickOutside";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-300"
        aria-label="Account"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          <div className="truncate border-b border-stone-100 px-3 py-2 text-xs text-stone-500">{email}</div>
          <button
            onClick={signOut}
            className="w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
