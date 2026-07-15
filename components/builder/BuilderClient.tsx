"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FormWithFields } from "@/lib/types";
import { QuestionBlock, type DraftField } from "./QuestionBlock";
import { AccentPicker } from "./AccentPicker";

function toDraft(fields: FormWithFields["fields"]): DraftField[] {
  return fields.map((f) => ({
    clientId: f.id,
    id: f.id,
    key: f.key,
    type: f.type,
    label: f.label,
    guidance: f.guidance,
    required: f.required,
    options: f.options,
    constraints: f.constraints,
  }));
}

function newField(): DraftField {
  return {
    clientId: `tmp_${Math.random().toString(36).slice(2)}`,
    type: "short_text",
    label: "",
    guidance: "",
    required: false,
    options: [],
    constraints: {},
  };
}

export function BuilderClient({ form }: { form: FormWithFields }) {
  const router = useRouter();
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description);
  const [accentColor, setAccentColor] = useState(form.accentColor);
  const [agentContext, setAgentContext] = useState(form.agentContext);
  const [category, setCategory] = useState(form.resource.category);
  const [tags, setTags] = useState(form.resource.tags.join(", "));
  const [resourceUrl, setResourceUrl] = useState(form.resource.resourceUrl);
  const [og, setOg] = useState(form.resource.og);
  const [fetchingOg, setFetchingOg] = useState(false);
  const [fields, setFields] = useState<DraftField[]>(toDraft(form.fields));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const dragIndex = useRef<number | null>(null);

  async function fetchOgPreview() {
    if (!resourceUrl.trim()) return;
    setFetchingOg(true);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(resourceUrl.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setOg({
          title: data.title ?? "",
          description: data.description ?? "",
          image: data.image ?? "",
          siteName: data.siteName ?? "",
        });
      }
    } finally {
      setFetchingOg(false);
    }
  }

  async function save(overrides?: { status?: "draft" | "published" }) {
    setStatus("saving");
    const res = await fetch(`/api/forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        accentColor,
        agentContext,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        resourceUrl,
        ogTitle: og.title,
        ogDescription: og.description,
        ogImage: og.image,
        ogSiteName: og.siteName,
        ...(overrides ?? {}),
        fields: fields.map((f) => ({
          id: f.id,
          type: f.type,
          label: f.label || "Untitled question",
          guidance: f.guidance,
          required: f.required,
          options: f.options.filter((o) => o.trim() !== ""),
          constraints: f.constraints,
        })),
      }),
    });
    setStatus("saved");
    return res.json();
  }

  function updateField(index: number, next: DraftField) {
    setFields((prev) => prev.map((f, i) => (i === index ? next : f)));
  }

  function deleteField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const next = prev.slice();
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function reorder(from: number, to: number) {
    setFields((prev) => {
      if (from === to) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handlePublish() {
    await save({ status: "published" });
    router.push(`/forms/${form.id}/publish`);
  }

  return (
    <main
      className="mx-auto w-full max-w-2xl flex-1 px-6 py-16"
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      <div
        className="mb-10 flex items-center justify-between border-b border-stone-100 pb-6 text-sm text-stone-500"
      >
        <div className="flex items-center gap-5">
          <Link href="/" className="font-medium text-stone-500 hover:text-stone-800">
            ← All forms
          </Link>
          <AccentPicker value={accentColor} onChange={setAccentColor} />
          <Link href={`/forms/${form.id}/responses`} className="hover:text-stone-700">
            Responses
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}</span>
          <button
            type="button"
            onClick={() => save()}
            className="rounded-full border border-stone-200 px-4 py-1.5 font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="accent-bg rounded-full px-4 py-1.5 font-medium text-white transition hover:opacity-90"
          >
            Publish
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Form title"
        className="w-full border-none bg-transparent text-3xl font-bold tracking-tight text-stone-900 placeholder-stone-300 focus:outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a description…"
        rows={2}
        className="mt-2 w-full resize-none border-none bg-transparent text-base text-stone-500 placeholder-stone-300 focus:outline-none"
      />

      <div className="mt-8 rounded-xl border border-dashed border-stone-200 bg-white/50 p-4">
        <div className="flex items-center gap-2">
          <span className="accent-text text-sm">✦</span>
          <h2 className="text-sm font-medium text-stone-700">Agent context</h2>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-400">
            Optional
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-400">
          Form-wide guidance agents apply to every answer — tone, approach, and what you value.
          Humans never see this.
        </p>
        <textarea
          value={agentContext}
          onChange={(e) => setAgentContext(e.target.value)}
          placeholder="e.g. Write in a warm, first-person voice. We value concrete lived experience over polish, and honesty over buzzwords. When unsure, keep answers concise rather than padding."
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 placeholder-stone-300 focus:outline-none accent-ring"
        />
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-stone-200 bg-white/50 p-4">
        <div className="flex items-center gap-2">
          <span className="accent-text text-sm">🔗</span>
          <h2 className="text-sm font-medium text-stone-700">Resource &amp; discovery</h2>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-400">
            Makes this form findable
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-400">
          Classify this resource and link its source site. Agents use this to find the right form
          for a student&rsquo;s need.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Category
            </span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Academic Support"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder-stone-300 focus:outline-none accent-ring"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Tags <span className="normal-case text-stone-300">(comma-separated)</span>
            </span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tutoring, math, drop-in"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder-stone-300 focus:outline-none accent-ring"
            />
          </label>
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
            Resource link
          </span>
          <div className="flex gap-2">
            <input
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://college.edu/tutoring-center"
              className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder-stone-300 focus:outline-none accent-ring"
            />
            <button
              type="button"
              onClick={fetchOgPreview}
              disabled={fetchingOg || !resourceUrl.trim()}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
            >
              {fetchingOg ? "Fetching…" : "Fetch info"}
            </button>
          </div>

          {(og.title || og.description || og.image) && (
            <div className="mt-3 flex gap-3 rounded-lg border border-stone-200 bg-white p-3">
              {og.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={og.image}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded object-cover"
                />
              )}
              <div className="min-w-0">
                {og.siteName && (
                  <p className="truncate text-[11px] uppercase tracking-wide text-stone-400">
                    {og.siteName}
                  </p>
                )}
                <p className="truncate text-sm font-medium text-stone-800">{og.title || resourceUrl}</p>
                {og.description && (
                  <p className="line-clamp-2 text-xs text-stone-500">{og.description}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-1">
        {fields.map((field, index) => (
          <QuestionBlock
            key={field.clientId}
            field={field}
            index={index}
            total={fields.length}
            onChange={(next) => updateField(index, next)}
            onDelete={() => deleteField(index)}
            onMove={(dir) => moveField(index, dir)}
            dragHandlers={{
              draggable: true,
              onDragStart: () => {
                dragIndex.current = index;
              },
              onDragOver: (e) => e.preventDefault(),
              onDrop: () => {
                if (dragIndex.current !== null) reorder(dragIndex.current, index);
                dragIndex.current = null;
              },
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setFields((prev) => [...prev, newField()])}
        className="accent-text mt-6 text-sm font-medium hover:opacity-80"
      >
        + Add question
      </button>
    </main>
  );
}
