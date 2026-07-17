"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function FormCardMenu({ formId, title }: { formId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function duplicate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/forms/${formId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) router.push(`/forms/${data.id}/edit`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete “${title}”? This also deletes its responses and can’t be undone.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/forms/${formId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Form actions"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={busy}
        className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
          <button
            className={item}
            onClick={(e) => {
              e.preventDefault();
              router.push(`/forms/${formId}/edit`);
            }}
          >
            ✏️ Edit
          </button>
          <button
            className={item}
            onClick={(e) => {
              e.preventDefault();
              router.push(`/forms/${formId}/responses`);
            }}
          >
            📊 Responses
          </button>
          <button className={item} onClick={(e) => { e.preventDefault(); duplicate(); }}>
            📋 Duplicate
          </button>
          <div className="my-1 border-t border-stone-100" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={(e) => { e.preventDefault(); remove(); }}
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
