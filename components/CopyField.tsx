"use client";

import { useState } from "react";

export function CopyField({ value, multiline }: { value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative rounded-lg border border-stone-200 bg-stone-50">
      {multiline ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all p-4 pr-16 font-mono text-xs text-stone-700">
          {value}
        </pre>
      ) : (
        <div className="overflow-x-auto p-4 pr-16 font-mono text-sm text-stone-700 whitespace-nowrap">
          {value}
        </div>
      )}
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
