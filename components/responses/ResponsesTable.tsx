"use client";

import { useState } from "react";
import { SourceBadge } from "@/components/SourceBadge";
import type { FieldDef } from "@/lib/types";

export type SubmissionRow = {
  id: string;
  answers: Record<string, unknown>;
  source: string;
  agentName: string | null;
  agentOnBehalf: string | null;
  createdAt: string;
};

function formatAnswer(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function ResponsesTable({
  fields,
  submissions,
}: {
  fields: FieldDef[];
  submissions: SubmissionRow[];
}) {
  const [selected, setSelected] = useState<SubmissionRow | null>(null);

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-200 py-20 text-center text-stone-500">
        No responses yet.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-lg border border-stone-100">
        <table className="min-w-full divide-y divide-stone-100 text-sm">
          <thead>
            <tr className="text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              {fields.map((f) => (
                <th key={f.key} className="whitespace-nowrap px-4 py-3">
                  {f.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3">Submitted at</th>
              <th className="whitespace-nowrap px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {submissions.map((sub) => (
              <tr
                key={sub.id}
                onClick={() => setSelected(sub)}
                className="cursor-pointer transition hover:bg-stone-50"
              >
                {fields.map((f) => (
                  <td key={f.key} className="max-w-[220px] truncate px-4 py-3 text-stone-700">
                    {formatAnswer(sub.answers[f.key])}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-stone-500">
                  {new Date(sub.createdAt).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <SourceBadge source={sub.source} agentName={sub.agentName} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setSelected(null)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <SourceBadge source={selected.source} agentName={selected.agentName} />
              <button
                onClick={() => setSelected(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>
            {selected.source === "agent" && (selected.agentName || selected.agentOnBehalf) && (
              <div className="mb-6 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
                {selected.agentName && <div>Agent: {selected.agentName}</div>}
                {selected.agentOnBehalf && <div>On behalf of: {selected.agentOnBehalf}</div>}
              </div>
            )}
            <dl className="space-y-5">
              {fields.map((f) => (
                <div key={f.key}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    {f.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-stone-800">
                    {formatAnswer(selected.answers[f.key])}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-xs text-stone-400">
              Submitted {new Date(selected.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
