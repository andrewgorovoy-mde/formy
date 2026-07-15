"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewFormButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/forms", { method: "POST", body: JSON.stringify({}) });
      const form = await res.json();
      router.push(`/forms/${form.id}/edit`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="accent-bg rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "Creating…" : "New form"}
    </button>
  );
}
