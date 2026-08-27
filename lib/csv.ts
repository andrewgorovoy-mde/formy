import type { FieldDef } from "@/lib/types";

// Without this, Excel (which sniffs encoding rather than assuming UTF-8) renders accented
// characters as mojibake. Named + escaped rather than a bare literal since the character itself
// is invisible in a diff/editor and easy to accidentally strip.
const UTF8_BOM = "\uFEFF";

export type ExportSubmission = {
  answers: Record<string, unknown>;
  source: string;
  agentName: string | null;
  createdAt: string | Date;
};

/** RFC 4180 field escaping: quote when the value contains comma, quote, or newline. */
export function csvCell(value: unknown): string {
  let s: string;
  if (value === undefined || value === null) s = "";
  else if (Array.isArray(value)) s = value.join("; ");
  else if (typeof value === "boolean") s = value ? "Yes" : "No";
  else s = String(value);

  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * Builds a CSV of responses: one column per field (by label), plus Source, Agent, and
 * Submitted-at columns. Excel and Sheets both open this directly.
 */
export function buildResponsesCsv(fields: FieldDef[], submissions: ExportSubmission[]): string {
  const header = [...fields.map((f) => f.label), "Source", "Agent", "Submitted at"];
  const rows = submissions.map((s) =>
    csvRow([
      ...fields.map((f) => s.answers[f.key]),
      s.source,
      s.agentName ?? "",
      new Date(s.createdAt).toISOString(),
    ])
  );
  // Prepend a UTF-8 BOM so Excel reads accented characters correctly.
  return UTF8_BOM + [csvRow(header), ...rows].join("\r\n") + "\r\n";
}

/** Safe filename slug from a form title. */
export function exportFilename(title: string, ext: string): string {
  const base = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "responses";
  return `${base}-responses.${ext}`;
}
