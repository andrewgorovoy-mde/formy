"use client";

import { useState } from "react";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  GUIDANCE_PLACEHOLDERS,
  type FieldType,
  typeHasLengthConstraints,
  typeHasOptions,
  typeHasRangeConstraints,
} from "@/lib/fieldTypes";
import type { Constraints } from "@/lib/types";

export type DraftField = {
  clientId: string;
  id?: string;
  key?: string;
  type: FieldType;
  label: string;
  guidance: string;
  required: boolean;
  options: string[];
  constraints: Constraints;
};

export function QuestionBlock({
  field,
  index,
  total,
  onChange,
  onDelete,
  onMove,
  dragHandlers,
}: {
  field: DraftField;
  index: number;
  total: number;
  onChange: (next: DraftField) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  dragHandlers: {
    draggable: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
  };
}) {
  const [focused, setFocused] = useState(false);

  function update(patch: Partial<DraftField>) {
    onChange({ ...field, ...patch });
  }

  function updateConstraints(patch: Partial<Constraints>) {
    onChange({ ...field, constraints: { ...field.constraints, ...patch } });
  }

  return (
    <div
      className="group relative rounded-lg border border-transparent px-4 py-4 -mx-4 transition hover:border-stone-100 hover:bg-stone-50/60 focus-within:border-stone-100 focus-within:bg-stone-50/60"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
      draggable={dragHandlers.draggable}
      onDragStart={dragHandlers.onDragStart}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
    >
      <div
        className={`mb-2 flex items-center justify-between text-xs text-stone-400 transition-opacity ${
          focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="cursor-grab select-none" title="Drag to reorder">
            ⠿
          </span>
          <span className="font-mono">{field.key ?? "new field"}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <select
            value={field.type}
            onChange={(e) => update({ type: e.target.value as FieldType })}
            className="rounded border-none bg-transparent text-xs text-stone-500 focus:outline-none"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => update({ required: e.target.checked })}
            />
            Required
          </label>
          <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-600">
            Delete
          </button>
        </div>
      </div>

      <input
        value={field.label}
        onChange={(e) => update({ label: e.target.value })}
        placeholder="Question label"
        className="w-full border-none bg-transparent text-base font-medium text-stone-900 placeholder-stone-300 focus:outline-none"
      />
      {field.required && <span className="accent-text ml-0.5 align-top text-sm">*</span>}

      {typeHasOptions(field.type) && (
        <OptionsEditor
          options={field.options}
          onChange={(options) => update({ options })}
        />
      )}

      {typeHasRangeConstraints(field.type) && (
        <div className="mt-3 flex items-center gap-4 text-xs text-stone-400">
          <span className="uppercase tracking-wide">Limits (optional)</span>
          <label className="flex items-center gap-1.5 text-stone-500">
            Min
            <input
              type="number"
              placeholder="none"
              value={field.constraints.min ?? ""}
              onChange={(e) =>
                updateConstraints({ min: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              className="w-20 rounded border border-stone-200 bg-transparent px-1.5 py-0.5 placeholder-stone-300"
            />
          </label>
          <label className="flex items-center gap-1.5 text-stone-500">
            Max
            <input
              type="number"
              placeholder="none"
              value={field.constraints.max ?? ""}
              onChange={(e) =>
                updateConstraints({ max: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              className="w-20 rounded border border-stone-200 bg-transparent px-1.5 py-0.5 placeholder-stone-300"
            />
          </label>
        </div>
      )}

      {typeHasLengthConstraints(field.type) && (
        <div className="mt-3 flex items-center gap-4 text-xs text-stone-400">
          <span className="uppercase tracking-wide">Length (optional)</span>
          <label className="flex items-center gap-1.5 text-stone-500">
            Min
            <input
              type="number"
              placeholder="none"
              value={field.constraints.min_length ?? ""}
              onChange={(e) =>
                updateConstraints({
                  min_length: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className="w-20 rounded border border-stone-200 bg-transparent px-1.5 py-0.5 placeholder-stone-300"
            />
          </label>
          <label className="flex items-center gap-1.5 text-stone-500">
            Max
            <input
              type="number"
              placeholder="none"
              value={field.constraints.max_length ?? ""}
              onChange={(e) =>
                updateConstraints({
                  max_length: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className="w-20 rounded border border-stone-200 bg-transparent px-1.5 py-0.5 placeholder-stone-300"
            />
          </label>
        </div>
      )}

      <div
        className={`mt-3 transition-opacity ${focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
          Guidance for agents
        </label>
        <textarea
          value={field.guidance}
          onChange={(e) => update({ guidance: e.target.value })}
          placeholder={GUIDANCE_PLACEHOLDERS[field.type]}
          rows={2}
          className="w-full resize-none rounded border border-dashed border-stone-200 bg-white/60 px-2 py-1.5 text-sm text-stone-600 placeholder-stone-400 focus:outline-none accent-ring"
        />
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  return (
    <div className="mt-2 space-y-1.5">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sm text-stone-300">{i + 1}.</span>
          <input
            value={opt}
            onChange={(e) => {
              const next = options.slice();
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 border-b border-stone-200 bg-transparent px-1 py-0.5 text-sm text-stone-700 focus:outline-none accent-ring"
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="text-xs text-stone-300 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, ""])}
        className="accent-text text-sm hover:opacity-80"
      >
        + Add option
      </button>
    </div>
  );
}
