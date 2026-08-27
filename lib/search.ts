import type { FormWithFields } from "@/lib/types";

// Structured relevance search over the registry of forms. Consensus-style: a query yields
// ranked, structured results with a score and the terms that matched — not opaque ordering.

export type SearchResult = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  resourceUrl: string;
  siteName: string;
  score: number;
  matchedTerms: string[];
};

export type SearchQuery = {
  q?: string;
  category?: string;
  tags?: string[];
  limit?: number;
};

// Field weights — a term in the title matters more than one buried in field guidance.
const WEIGHTS = {
  title: 6,
  tags: 5,
  category: 5,
  ogTitle: 4,
  description: 3,
  ogDescription: 2,
  fieldLabel: 2,
  fieldGuidance: 1,
} as const;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

const STOP = new Set([
  "the", "and", "for", "with", "you", "your", "are", "how", "can", "any", "get",
  "need", "want", "looking", "someone", "some", "please", "just", "really", "help",
  "have", "has", "that", "this", "who", "where", "what", "there", "about", "would",
]);

// Lightweight stem-ish match: exact, or a shared prefix of >=4 chars in either direction
// (so "stressed"~"stress", "tutoring"~"tutor", "counselor"~"counseling" all match). This is a
// cheap approximation — true synonymy (e.g. "anxious"~"nervous") needs semantic search.
function termHits(haystack: string, term: string): number {
  if (!haystack) return 0;
  const tokens = tokenize(haystack);
  return tokens.filter((t) => {
    if (t === term) return true;
    const minLen = Math.min(t.length, term.length);
    return minLen >= 4 && (t.startsWith(term) || term.startsWith(t));
  }).length;
}

/** Score one form against the query terms, returning score + which terms matched anywhere. */
export function scoreForm(form: FormWithFields, terms: string[]): { score: number; matched: string[] } {
  const zones: Array<[string, number]> = [
    [form.title, WEIGHTS.title],
    [form.resource.tags.join(" "), WEIGHTS.tags],
    [form.resource.category, WEIGHTS.category],
    [form.resource.og.title, WEIGHTS.ogTitle],
    [form.description, WEIGHTS.description],
    [form.resource.og.description, WEIGHTS.ogDescription],
    [form.fields.map((f) => f.label).join(" "), WEIGHTS.fieldLabel],
    [form.fields.map((f) => f.guidance).join(" "), WEIGHTS.fieldGuidance],
  ];

  let score = 0;
  const matched = new Set<string>();
  for (const term of terms) {
    for (const [text, weight] of zones) {
      const hits = termHits(text, term);
      if (hits > 0) {
        score += hits * weight;
        matched.add(term);
      }
    }
  }
  return { score, matched: [...matched] };
}

export function searchForms(forms: FormWithFields[], query: SearchQuery): SearchResult[] {
  const rawTerms = tokenize(query.q ?? "");
  const terms = rawTerms.filter((t) => !STOP.has(t));
  const wantTags = (query.tags ?? []).map((t) => t.toLowerCase());
  const wantCategory = query.category?.toLowerCase();

  const scored = forms
    .filter((form) => {
      if (wantCategory && form.resource.category.toLowerCase() !== wantCategory) return false;
      if (wantTags.length > 0) {
        const formTags = form.resource.tags.map((t) => t.toLowerCase());
        if (!wantTags.every((t) => formTags.includes(t))) return false;
      }
      return true;
    })
    .map((form) => {
      // With no query terms (pure category/tag browse), every filtered form is relevant.
      const { score, matched } = terms.length ? scoreForm(form, terms) : { score: 1, matched: [] };
      return { form, score, matched };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.form.title.localeCompare(b.form.title));

  const limit = query.limit && query.limit > 0 ? query.limit : 20;
  return scored.slice(0, limit).map(({ form, score, matched }) => ({
    id: form.id,
    title: form.title,
    description: form.description,
    category: form.resource.category,
    tags: form.resource.tags,
    resourceUrl: form.resource.resourceUrl,
    siteName: form.resource.og.siteName,
    score,
    matchedTerms: matched,
  }));
}
