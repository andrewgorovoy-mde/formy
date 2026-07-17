"use client";

import { useEffect, useRef, useState } from "react";

type Result = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  resourceUrl: string;
  siteName: string;
  score: number;
  matchedTerms: string[];
  page: string;
};

const ACCENTS: Record<string, string> = {
  "Academic Support": "#0EA5E9",
  "Mental Health": "#EC4899",
  "Financial Aid": "#F59E0B",
  "Career Services": "#8B5CF6",
};
function accentFor(category: string) {
  return ACCENTS[category] ?? "#8B5CF6";
}

export function DiscoverClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const seededCategories = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);

    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/forms/search?${params.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results ?? []);
          // Seed the category filter list once from the full unfiltered set.
          if (!seededCategories.current && !query.trim() && !category) {
            const cats = Array.from(
              new Set((data.results ?? []).map((r: Result) => r.category).filter(Boolean))
            ).sort() as string[];
            setCategories(cats);
            seededCategories.current = true;
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query, category]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-24">
      {/* Hero + search */}
      <div className="pt-14 pb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Find the right campus resource
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-stone-500">
          Search across every resource and intake form in one place — tutoring, counseling,
          financial aid, and more.
        </p>
        <div className="relative mx-auto mt-6 max-w-xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
            🔍
          </span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. free math tutoring, someone to talk to, emergency grant…"
            className="w-full rounded-full border border-stone-200 bg-white py-3.5 pl-11 pr-4 text-stone-900 shadow-sm placeholder-stone-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setCategory(null)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                category === null ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? null : c)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  category === c ? "text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
                }`}
                style={category === c ? { backgroundColor: accentFor(c) } : undefined}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between text-sm text-stone-400">
        <span>
          {loading ? "Searching…" : `${results.length} result${results.length === 1 ? "" : "s"}`}
          {query.trim() && !loading ? ` for “${query.trim()}”` : ""}
        </span>
      </div>

      {!loading && results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white/50 py-16 text-center text-stone-500">
          No resources matched. Try a different phrase.
        </div>
      ) : (
        <ul className="space-y-3">
          {results.map((r) => (
            <li
              key={r.id}
              className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow-md"
            >
              <div className="flex">
                <div className="w-1.5 shrink-0" style={{ backgroundColor: accentFor(r.category) }} />
                <div className="min-w-0 flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {r.category && (
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{ backgroundColor: accentFor(r.category) }}
                        >
                          {r.category}
                        </span>
                      )}
                      <h2 className="mt-1.5 text-lg font-semibold text-stone-900">{r.title}</h2>
                    </div>
                    <a
                      href={r.page}
                      className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
                    >
                      Open →
                    </a>
                  </div>
                  {r.description && <p className="mt-1.5 text-sm text-stone-600">{r.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
                    {r.resourceUrl && (
                      <a
                        href={r.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
                      >
                        🔗 {r.siteName || "Source"}
                      </a>
                    )}
                    {r.tags.slice(0, 5).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
