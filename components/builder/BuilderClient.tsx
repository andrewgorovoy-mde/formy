"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FormWithFields } from "@/lib/types";
import { QuestionBlock, type DraftField } from "./QuestionBlock";
import { AccentPicker } from "./AccentPicker";
import { StatusBadge } from "@/components/StatusBadge";

// The form editor: title/description/accent, agent-context, resource & discovery metadata, and
// the field list (add/reorder/edit/delete via QuestionBlock). Fields are edited as local
// "drafts" (see DraftField in QuestionBlock.tsx) and only reach the server on Save, via a single
// PATCH that also replaces the field list — see the PATCH handler in
// app/api/forms/[id]/route.ts for how new vs. existing fields are reconciled by id.

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

const cardClass =
  "rounded-2xl border border-stone-200 bg-white shadow-sm transition";

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
  const [settingsOpen, setSettingsOpen] = useState(
    Boolean(form.resource.category || form.resource.resourceUrl || form.agentContext)
  );
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

  // Debounced autosave: 1.2s after the last edit, like Google Forms. Skips the initial mount.
  const snapshot = JSON.stringify({
    title, description, accentColor, agentContext, category, tags, resourceUrl, og, fields,
  });
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setStatus("saving");
    const t = setTimeout(() => {
      void save();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  function updateField(index: number, next: DraftField) {
    setFields((prev) => prev.map((f, i) => (i === index ? next : f)));
  }
  function deleteField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }
  function duplicateField(index: number) {
    setFields((prev) => {
      const copy: DraftField = {
        ...prev[index],
        clientId: `tmp_${Math.random().toString(36).slice(2)}`,
        id: undefined,
        key: undefined,
        options: [...prev[index].options],
        constraints: { ...prev[index].constraints },
      };
      const next = prev.slice();
      next.splice(index + 1, 0, copy);
      return next;
    });
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
  function addField() {
    setFields((prev) => [...prev, newField()]);
  }

  async function handlePublish() {
    await save({ status: "published" });
    router.push(`/forms/${form.id}/publish`);
  }

  const savedLabel =
    status === "saving" ? "Saving…" : status === "saved" ? "All changes saved" : "";

  return (
    <div style={{ "--accent": accentColor } as React.CSSProperties}>
      {/* App bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#FAFAF9]/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              aria-label="All forms"
            >
              ←
            </Link>
            <span className="truncate text-sm font-medium text-stone-700">{title || "Untitled form"}</span>
            <StatusBadge status={form.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-stone-400 sm:inline">{savedLabel}</span>
            <AccentPicker value={accentColor} onChange={setAccentColor} />
            <div className="mx-1 h-5 w-px bg-stone-200" />
            <Link
              href={`/forms/${form.id}/responses`}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            >
              Responses
            </Link>
            <Link
              href={`/f/${form.id}?preview=1`}
              className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 sm:inline"
            >
              Preview
            </Link>
            <button
              type="button"
              onClick={handlePublish}
              className="accent-bg rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              {form.status === "published" ? "Update" : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {/* Title card with accent header */}
        <div className={`${cardClass} overflow-hidden`}>
          <div className="h-2.5 w-full accent-bg" />
          <div className="px-6 pb-6 pt-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled form"
              className="w-full border-b border-transparent bg-transparent pb-1 text-2xl font-bold tracking-tight text-stone-900 placeholder-stone-300 focus:border-stone-200 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Form description"
              rows={2}
              className="mt-3 w-full resize-none border-b border-transparent bg-transparent pb-1 text-sm text-stone-500 placeholder-stone-300 focus:border-stone-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Discovery / agent settings (collapsible) */}
        <div className={`${cardClass} mt-4`}>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-stone-700">
              <span className="accent-text">✦</span> Discovery &amp; agent settings
            </span>
            <span className="text-stone-400">{settingsOpen ? "▲" : "▼"}</span>
          </button>
          {settingsOpen && (
            <div className="space-y-5 border-t border-stone-100 px-6 py-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              <div>
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
                    className="shrink-0 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
                  >
                    {fetchingOg ? "Fetching…" : "Fetch info"}
                  </button>
                </div>
                {(og.title || og.description || og.image) && (
                  <div className="mt-3 flex gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                    {og.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={og.image} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
                    )}
                    <div className="min-w-0">
                      {og.siteName && (
                        <p className="truncate text-[11px] uppercase tracking-wide text-stone-400">
                          {og.siteName}
                        </p>
                      )}
                      <p className="truncate text-sm font-medium text-stone-800">
                        {og.title || resourceUrl}
                      </p>
                      {og.description && (
                        <p className="line-clamp-2 text-xs text-stone-500">{og.description}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <span className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                  Agent context
                  <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] normal-case text-stone-400">
                    hidden from humans
                  </span>
                </span>
                <textarea
                  value={agentContext}
                  onChange={(e) => setAgentContext(e.target.value)}
                  placeholder="e.g. Write in a warm, first-person voice. We value concrete lived experience over polish, and honesty over buzzwords."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 placeholder-stone-300 focus:outline-none accent-ring"
                />
              </div>
            </div>
          )}
        </div>

        {/* Question cards */}
        <div className="mt-4 space-y-4">
          {fields.map((field, index) => (
            <QuestionBlock
              key={field.clientId}
              field={field}
              index={index}
              total={fields.length}
              onChange={(next) => updateField(index, next)}
              onDelete={() => deleteField(index)}
              onDuplicate={() => duplicateField(index)}
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

        {fields.length === 0 && (
          <div className={`${cardClass} mt-4 border-dashed py-12 text-center text-sm text-stone-400`}>
            No questions yet.
          </div>
        )}

        <button
          type="button"
          onClick={addField}
          className={`${cardClass} mt-4 flex w-full items-center justify-center gap-2 py-4 text-sm font-semibold text-stone-600 hover:border-stone-300 hover:text-stone-900`}
        >
          <span className="accent-text text-lg leading-none">＋</span> Add question
        </button>
      </main>
    </div>
  );
}
