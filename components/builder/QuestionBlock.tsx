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

// One editable field row in the builder: type/label/guidance/required + type-specific controls
// (options for select types, length/range constraints for text/number). `DraftField` mirrors
// `FieldDef` (lib/types.ts) but `id`/`key` are optional since a newly added field has neither
// until it's saved — see `newField()` in BuilderClient.tsx.
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

const TYPE_ICON: Record<FieldType, string> = {
  short_text: "≡",
  long_text: "¶",
  email: "@",
  number: "#",
  date: "📅",
  select: "◉",
  multi_select: "☑",
  boolean: "◐",
};

export function QuestionBlock({
  field,
  index,
  total,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
  dragHandlers,
}: {
  field: DraftField;
  index: number;
  total: number;
  onChange: (next: DraftField) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  dragHandlers: {
    draggable: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
  };
}) {
  const [active, setActive] = useState(false);

  function update(patch: Partial<DraftField>) {
    onChange({ ...field, ...patch });
  }
  function updateConstraints(patch: Partial<Constraints>) {
    onChange({ ...field, constraints: { ...field.constraints, ...patch } });
  }

  return (
    <div
      className={`group relative rounded-2xl border bg-white shadow-sm transition ${
        active ? "border-l-4 accent-border" : "border-stone-200"
      }`}
      onFocus={() => setActive(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(false);
      }}
      draggable={dragHandlers.draggable}
      onDragStart={dragHandlers.onDragStart}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
    >
      {/* drag handle */}
      <div
        className="flex cursor-grab items-center justify-center py-1 text-stone-300 opacity-0 transition group-hover:opacity-100"
        title="Drag to reorder"
      >
        <span className="select-none tracking-[0.2em]">⠿⠿</span>
      </div>

      <div className="px-5 pb-2">
        <div className="flex items-start gap-3">
          <input
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Question"
            className="min-w-0 flex-1 border-b border-stone-100 bg-stone-50/60 px-3 py-2 text-base font-medium text-stone-900 placeholder-stone-400 focus:border-stone-300 focus:bg-white focus:outline-none"
          />
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-stone-200 px-2 py-1.5">
            <span className="text-stone-400">{TYPE_ICON[field.type]}</span>
            <select
              value={field.type}
              onChange={(e) => update({ type: e.target.value as FieldType })}
              className="bg-transparent text-sm text-stone-600 focus:outline-none"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {typeHasOptions(field.type) && (
          <OptionsEditor
            type={field.type}
            options={field.options}
            onChange={(options) => update({ options })}
          />
        )}

        {typeHasRangeConstraints(field.type) && (
          <ConstraintRow
            label="Value limits"
            minValue={field.constraints.min}
            maxValue={field.constraints.max}
            onMin={(min) => updateConstraints({ min })}
            onMax={(max) => updateConstraints({ max })}
          />
        )}

        {typeHasLengthConstraints(field.type) && (
          <ConstraintRow
            label="Length limits"
            minValue={field.constraints.min_length}
            maxValue={field.constraints.max_length}
            onMin={(min_length) => updateConstraints({ min_length })}
            onMax={(max_length) => updateConstraints({ max_length })}
          />
        )}

        <div className="mt-3">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">
            <span className="accent-text">✦</span> Guidance for agents
          </label>
          <textarea
            value={field.guidance}
            onChange={(e) => update({ guidance: e.target.value })}
            placeholder={GUIDANCE_PLACEHOLDERS[field.type]}
            rows={2}
            className="w-full resize-none rounded-lg border border-dashed border-stone-200 bg-stone-50/60 px-3 py-2 text-sm text-stone-600 placeholder-stone-400 focus:border-solid focus:bg-white focus:outline-none accent-ring"
          />
        </div>
      </div>

      {/* footer toolbar */}
      <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2">
        <div className="flex items-center gap-1">
          <IconButton title="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </IconButton>
          <IconButton title="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            ↓
          </IconButton>
          <IconButton title="Duplicate" onClick={onDuplicate}>
            ⧉
          </IconButton>
          <IconButton title="Delete" onClick={onDelete} danger>
            🗑
          </IconButton>
        </div>
        <div className="flex items-center gap-3">
          {field.key && <span className="hidden font-mono text-[11px] text-stone-300 sm:inline">{field.key}</span>}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600">
            Required
            <button
              type="button"
              role="switch"
              aria-checked={field.required}
              onClick={() => update({ required: !field.required })}
              className={`relative h-5 w-9 rounded-full transition ${field.required ? "accent-bg" : "bg-stone-200"}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  field.required ? "left-4" : "left-0.5"
                }`}
              />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition disabled:opacity-30 ${
        danger ? "text-stone-400 hover:bg-red-50 hover:text-red-600" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      }`}
    >
      {children}
    </button>
  );
}

function ConstraintRow({
  label,
  minValue,
  maxValue,
  onMin,
  onMax,
}: {
  label: string;
  minValue?: number;
  maxValue?: number;
  onMin: (v: number | undefined) => void;
  onMax: (v: number | undefined) => void;
}) {
  const parse = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div className="mt-3 flex items-center gap-3 text-xs text-stone-400">
      <span className="uppercase tracking-wide">{label}</span>
      <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px]">optional</span>
      <label className="flex items-center gap-1.5 text-stone-500">
        Min
        <input
          type="number"
          placeholder="—"
          value={minValue ?? ""}
          onChange={(e) => onMin(parse(e.target.value))}
          className="w-20 rounded-md border border-stone-200 bg-white px-1.5 py-0.5 placeholder-stone-300 focus:outline-none accent-ring"
        />
      </label>
      <label className="flex items-center gap-1.5 text-stone-500">
        Max
        <input
          type="number"
          placeholder="—"
          value={maxValue ?? ""}
          onChange={(e) => onMax(parse(e.target.value))}
          className="w-20 rounded-md border border-stone-200 bg-white px-1.5 py-0.5 placeholder-stone-300 focus:outline-none accent-ring"
        />
      </label>
    </div>
  );
}

function OptionsEditor({
  type,
  options,
  onChange,
}: {
  type: FieldType;
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const marker = type === "multi_select" ? "☐" : "○";
  return (
    <div className="mt-3 space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-stone-300">{marker}</span>
          <input
            value={opt}
            onChange={(e) => {
              const next = options.slice();
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={`Option ${i + 1}`}
            className="flex-1 border-b border-stone-100 bg-transparent px-1 py-1 text-sm text-stone-700 placeholder-stone-300 focus:border-stone-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="flex h-6 w-6 items-center justify-center rounded text-stone-300 hover:bg-stone-100 hover:text-red-500"
            title="Remove option"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, ""])}
        className="flex items-center gap-2 pl-6 text-sm text-stone-400 hover:text-stone-700"
      >
        <span className="accent-text">＋</span> Add option
      </button>
    </div>
  );
}
