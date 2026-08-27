import type { FieldDef } from "@/lib/types";

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
  /** Answers coerced to their canonical types (numbers as numbers, etc), keyed by field key. */
  normalized: Record<string, unknown>;
};

/** Deliberately permissive (no full RFC 5322 check) — good enough to catch typos without rejecting valid addresses. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function validateAnswers(
  fields: FieldDef[],
  answers: unknown
): ValidationResult {
  const errors: Record<string, string> = {};
  const normalized: Record<string, unknown> = {};

  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    return { valid: false, errors: { _form: "answers must be an object" }, normalized };
  }

  const answersObj = answers as Record<string, unknown>;
  const fieldsByKey = new Map(fields.map((f) => [f.key, f]));

  for (const key of Object.keys(answersObj)) {
    if (!fieldsByKey.has(key)) {
      errors[key] = "unknown field";
    }
  }

  for (const field of fields) {
    const raw = answersObj[field.key];

    if (isEmpty(raw)) {
      if (field.required) {
        errors[field.key] = "required";
      }
      continue;
    }

    switch (field.type) {
      case "short_text":
      case "long_text": {
        if (typeof raw !== "string") {
          errors[field.key] = "must be a string";
          break;
        }
        const { min_length, max_length } = field.constraints;
        if (typeof min_length === "number" && raw.length < min_length) {
          errors[field.key] = `min_length ${min_length} not met (got ${raw.length})`;
          break;
        }
        if (typeof max_length === "number" && raw.length > max_length) {
          errors[field.key] = `max_length ${max_length} exceeded (got ${raw.length})`;
          break;
        }
        normalized[field.key] = raw;
        break;
      }
      case "email": {
        if (typeof raw !== "string" || !EMAIL_RE.test(raw)) {
          errors[field.key] = "must be a valid email address";
          break;
        }
        normalized[field.key] = raw;
        break;
      }
      case "number": {
        const num = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
        if (typeof num !== "number" || Number.isNaN(num)) {
          errors[field.key] = "must be a number";
          break;
        }
        const { min, max } = field.constraints;
        if (
          (typeof min === "number" && num < min) ||
          (typeof max === "number" && num > max)
        ) {
          const lo = typeof min === "number" ? min : "-inf";
          const hi = typeof max === "number" ? max : "inf";
          errors[field.key] = `must be a number between ${lo} and ${hi}`;
          break;
        }
        normalized[field.key] = num;
        break;
      }
      case "date": {
        if (typeof raw !== "string" || !DATE_RE.test(raw) || Number.isNaN(Date.parse(raw))) {
          errors[field.key] = "must be an ISO 8601 date (YYYY-MM-DD)";
          break;
        }
        normalized[field.key] = raw;
        break;
      }
      case "select": {
        if (typeof raw !== "string" || !field.options.includes(raw)) {
          errors[field.key] = `must be one of: ${field.options.join(", ")}`;
          break;
        }
        normalized[field.key] = raw;
        break;
      }
      case "multi_select": {
        if (!Array.isArray(raw) || !raw.every((v) => typeof v === "string")) {
          errors[field.key] = "must be an array of strings";
          break;
        }
        const invalid = raw.filter((v) => !field.options.includes(v));
        if (invalid.length > 0) {
          errors[field.key] = `invalid options: ${invalid.join(", ")}`;
          break;
        }
        normalized[field.key] = raw;
        break;
      }
      case "boolean": {
        if (typeof raw !== "boolean") {
          errors[field.key] = "must be a boolean";
          break;
        }
        normalized[field.key] = raw;
        break;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, normalized };
}
