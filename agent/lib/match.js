// Deterministic keyword-based answer mapping. Used when ANTHROPIC_API_KEY is
// not set, so the demo agent (and its tests) run without any API key.

function bestOption(options, candidates) {
  const lowerOptions = options.map((o) => String(o).toLowerCase());
  for (const candidate of candidates) {
    const idx = lowerOptions.indexOf(String(candidate).toLowerCase());
    if (idx !== -1) return options[idx];
  }
  return undefined;
}

function firstEssay(profile) {
  const bank = profile.essay_bank || {};
  const values = Object.values(bank).filter((v) => typeof v === "string" && v.trim());
  return values[0];
}

/**
 * Best-effort mapping of a single field to a profile value, or undefined if
 * no rule matches. Field: { id, type, label, options, constraints }.
 */
function matchField(field, profile) {
  const haystack = `${field.id} ${field.label}`.toLowerCase();
  const identity = profile.identity || {};
  const education = profile.education || {};
  const interests = profile.interests || [];

  const has = (...words) => words.some((w) => haystack.includes(w));

  if (has("email")) return identity.email;

  if (has("phone")) return identity.phone;

  if (has("name") && !has("major", "area")) return identity.full_name;

  if (has("gpa", "grade point")) {
    const num = typeof education.gpa === "number" ? education.gpa : Number(education.gpa);
    return Number.isNaN(num) ? undefined : num;
  }

  if (has("grad") && (has("year") || field.type === "select")) {
    const year = education.graduation_year;
    if (year === undefined) return undefined;
    if (field.type === "number") return Number(year);
    if (field.type === "select") return bestOption(field.options || [], [year]) ?? String(year);
    return String(year);
  }

  if (has("major", "field of study", "concentration")) return education.major;

  if (has("area", "interest", "focus", "topic")) {
    if (field.type === "multi_select") {
      const options = field.options || [];
      const matched = options.filter((opt) =>
        interests.some((i) => String(i).toLowerCase() === String(opt).toLowerCase())
      );
      return matched.length ? matched : undefined;
    }
    if (field.type === "select") {
      return bestOption(field.options || [], interests);
    }
    return interests.join(", ");
  }

  if (has("essay", "statement", "why do you", "why should", "personal")) {
    return firstEssay(profile);
  }

  if (field.type === "boolean") {
    return true;
  }

  return undefined;
}

/**
 * @param {object} schema agentic-form/v1 schema (the `.form` shape, i.e. schema.form)
 * @param {object} profile applicant profile.json contents
 * @param {string[]} [fieldIds] restrict mapping to these field ids only
 */
function deterministicAnswers(schema, profile, fieldIds) {
  const fields = schema.form.fields.filter((f) => !fieldIds || fieldIds.includes(f.id));
  const answers = {};
  for (const field of fields) {
    const value = matchField(field, profile);
    if (value !== undefined) answers[field.id] = value;
  }
  return answers;
}

module.exports = { deterministicAnswers, matchField };
