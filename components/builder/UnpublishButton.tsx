"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UnpublishButton({ formId }: { formId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch(`/api/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      router.push(`/forms/${formId}/edit`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-full border border-stone-200 px-4 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
    >
      {loading ? "Unpublishing…" : "Unpublish"}
    </button>
  );
}
