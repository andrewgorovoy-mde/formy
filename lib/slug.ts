// Field `key`s are generated once from the label and never regenerated on edit — they're the
// stable contract agent submissions rely on (an agent's `answers` object is keyed by them), so
// relabeling a field must not change its key.

export function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "field";
}

/** Given a desired base key and the set of keys already in use, return a unique key. */
export function dedupeKey(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}
