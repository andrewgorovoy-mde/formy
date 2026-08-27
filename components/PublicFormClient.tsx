"use client";

import { useState } from "react";
import Link from "next/link";
import type { FormWithFields } from "@/lib/types";

// The human-facing rendering of a published form (POSTs to the same /api/forms/{id}/submissions
// endpoint an agent would use — see submissions/route.ts). Field markup carries the discovery
// hooks described in AGENT_FRIENDLINESS.md (name/id = field key, required, autocomplete) so an
// agent reading the DOM directly, without the JSON schema, can still fill it in correctly.
type AnswerValue = string | number | boolean | string[] | undefined;

// Slim banner shown only when the form is opened in preview mode (?preview=1) from the builder,
// giving the creator a clear way back. Real respondents never see it.
function PreviewBanner({ formId }: { formId: string }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-stone-900 px-4 py-2 text-center text-sm text-white">
      <span>👁 Preview — this is how respondents see your form.</span>
      <Link
        href={`/forms/${formId}/edit`}
        className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium transition hover:bg-white/25"
      >
        ✕ Exit preview
      </Link>
    </div>
  );
}

export function PublicFormClient({
  form,
  schemaUrl,
  preview = false,
}: {
  form: FormWithFields;
  schemaUrl: string;
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setAnswer(key: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch(`/api/forms/${form.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.status === 201) {
        setSubmitted(true);
        return;
      }
      const body = await res.json();
      setErrors(body.fields ?? {});
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ "--accent": form.accentColor } as React.CSSProperties}>
        {preview && <PreviewBanner formId={form.id} />}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <div className="accent-text mb-4 text-5xl">✓</div>
          <h1 className="text-2xl font-bold text-stone-900">Thanks — you&rsquo;re all set.</h1>
          <p className="mt-2 text-stone-500">Your response to &ldquo;{form.title}&rdquo; was received.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ "--accent": form.accentColor } as React.CSSProperties}>
      {preview && <PreviewBanner formId={form.id} />}
      <AgentBar schemaUrl={schemaUrl} />
      <div
        className="h-[120px] w-full"
        style={{ background: `linear-gradient(to bottom, ${form.accentColor}33, transparent)` }}
      />
      <main className="mx-auto -mt-16 w-full max-w-xl px-6 pb-24">
        {(form.resource.category || form.resource.tags.length > 0) && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {form.resource.category && (
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                {form.resource.category}
              </span>
            )}
            {form.resource.tags.map((tag) => (
              <span key={tag} className="text-xs text-stone-400">
                #{tag}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">{form.title}</h1>
        {form.description && <p className="mt-2 text-base text-stone-500">{form.description}</p>}

        {form.resource.resourceUrl && (
          <a
            href={form.resource.resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex gap-3 rounded-lg border border-stone-200 bg-white p-3 transition hover:border-stone-300"
          >
            {form.resource.og.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.resource.og.image}
                alt=""
                className="h-14 w-14 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-wide text-stone-400">
                {form.resource.og.siteName || new URL(form.resource.resourceUrl).hostname}
              </p>
              <p className="truncate text-sm font-medium text-stone-800">
                {form.resource.og.title || form.resource.resourceUrl}
              </p>
              {form.resource.og.description && (
                <p className="line-clamp-2 text-xs text-stone-500">
                  {form.resource.og.description}
                </p>
              )}
            </div>
          </a>
        )}

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">
          {form.fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className="block text-base font-medium text-stone-800">
                {field.label}
                {field.required && <span className="accent-text ml-1">*</span>}
              </label>
              {field.guidance && <p className="mt-0.5 text-sm text-stone-400">{field.guidance}</p>}
              <div className="mt-2">
                <FieldInput field={field} value={answers[field.key]} onChange={setAnswer} />
              </div>
              {errors[field.key] && (
                <p className="mt-1 text-sm text-red-500">{errors[field.key]}</p>
              )}
            </div>
          ))}

          {errors._form && <p className="text-sm text-red-500">{errors._form}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="accent-bg w-full rounded-full py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      </main>
    </div>
  );
}

// A visible, self-describing affordance for AI agents. Screenshot-driven agents (computer use)
// never inspect the DOM discovery tags, so this tells them, in plain language they can read off
// the rendered page, that a machine-submission path exists and exactly how to use it.
function AgentBar({ schemaUrl }: { schemaUrl: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      data-agentic-form="v1"
      data-agentic-form-schema={schemaUrl}
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-stone-100 bg-stone-50 px-4 py-2 text-center text-xs text-stone-500"
    >
      <span aria-hidden>🤖</span>
      <span>
        <span className="font-medium text-stone-600">Agent?</span> You don&rsquo;t have to fill
        this out — <span className="font-medium text-stone-600">GET</span> this form&rsquo;s JSON
        schema and POST your answers instead.
      </span>
      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-stone-600 ring-1 ring-stone-200">
        {schemaUrl}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(schemaUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="rounded px-1.5 py-0.5 font-medium text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

// Maps a field to a standard HTML autocomplete token where one applies, so browser agents and
// autofill both recognize the field's intent. Returns undefined when nothing standard fits.
function autoCompleteFor(field: FormWithFields["fields"][number]): string | undefined {
  if (field.type === "email") return "email";
  const label = field.label.toLowerCase();
  if (field.type === "short_text") {
    if (label.includes("full") && label.includes("name")) return "name";
    if (label.includes("name")) return "name";
    if (label.includes("phone")) return "tel";
  }
  return undefined;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormWithFields["fields"][number];
  value: AnswerValue;
  onChange: (key: string, value: AnswerValue) => void;
}) {
  const baseClass =
    "w-full border-0 border-b border-stone-200 bg-transparent px-0 py-2 text-stone-900 placeholder-stone-300 focus:outline-none accent-ring";
  // Shared attributes that make each control identifiable to agents reading the DOM: the `name`
  // and `id` are the schema field key, so a DOM->schema mapping is 1:1.
  const common = {
    name: field.key,
    id: field.key,
    required: field.required,
    "aria-required": field.required,
    autoComplete: autoCompleteFor(field),
  };

  switch (field.type) {
    case "long_text":
      return (
        <textarea
          {...common}
          className={baseClass}
          rows={5}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    case "email":
      return (
        <input
          {...common}
          type="email"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    case "number":
      return (
        <input
          {...common}
          type="number"
          className={baseClass}
          value={value === undefined ? "" : (value as number)}
          onChange={(e) => onChange(field.key, e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          {...common}
          type="date"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    case "select":
      return (
        <select
          {...common}
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="" disabled>
            Select…
          </option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "multi_select": {
      const selected = (value as string[]) ?? [];
      return (
        <div
          role="group"
          aria-label={field.label}
          data-field-key={field.key}
          className="flex flex-wrap gap-2"
        >
          {field.options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                role="checkbox"
                aria-checked={active}
                onClick={() =>
                  onChange(
                    field.key,
                    active ? selected.filter((v) => v !== opt) : [...selected, opt]
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "accent-bg border-transparent text-white"
                    : "border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    case "boolean":
      return (
        <div role="group" aria-label={field.label} data-field-key={field.key} className="flex gap-3">
          {[
            { label: "Yes", val: true },
            { label: "No", val: false },
          ].map((opt) => (
            <button
              type="button"
              key={opt.label}
              role="radio"
              aria-checked={value === opt.val}
              onClick={() => onChange(field.key, opt.val)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                value === opt.val
                  ? "accent-bg border-transparent text-white"
                  : "border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    case "short_text":
    default:
      return (
        <input
          {...common}
          type="text"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
  }
}
