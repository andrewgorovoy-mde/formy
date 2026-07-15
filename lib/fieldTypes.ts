export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "number",
  "date",
  "select",
  "multi_select",
  "boolean",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  number: "Number",
  date: "Date",
  select: "Select",
  multi_select: "Multi-select",
  boolean: "Yes / No",
};

export function isFieldType(value: string): value is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(value);
}

export function typeHasOptions(type: FieldType): boolean {
  return type === "select" || type === "multi_select";
}

export function typeHasLengthConstraints(type: FieldType): boolean {
  return type === "short_text" || type === "long_text";
}

export function typeHasRangeConstraints(type: FieldType): boolean {
  return type === "number";
}

// Example agent-guidance shown as placeholder text per field type, so creators
// see what a useful hint looks like without it polluting the saved data.
export const GUIDANCE_PLACEHOLDERS: Record<FieldType, string> = {
  short_text: "e.g. Use the applicant's full legal name as it appears on ID.",
  long_text:
    "e.g. 150–300 words. Favor specific personal experience over generic ambition; write in first person.",
  email: "e.g. Use the applicant's primary contact email.",
  number: "e.g. Report the current cumulative GPA on a 4.0 scale.",
  date: "e.g. Use ISO format (YYYY-MM-DD); this is the expected start date.",
  select: "e.g. Pick the option that best matches the applicant's situation.",
  multi_select: "e.g. Select every area that genuinely applies — don't pad the list.",
  boolean: "e.g. Answer yes only if the applicant clearly meets this criterion.",
};
