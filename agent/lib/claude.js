// LLM-backed answer mapping via the Claude API (direct fetch, no SDK — this
// is a standalone script). Only used when ANTHROPIC_API_KEY is set.

const DEFAULT_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function buildPrompt(schema, profile, fieldIds) {
  const fields = schema.form.fields.filter((f) => !fieldIds || fieldIds.includes(f.id));
  const lines = [
    "You are an autonomous agent filling out a web form on behalf of a user.",
    "Use the user's profile below to answer each question as well as a thoughtful human applicant would.",
    "Follow each field's `guidance` closely — it tells you what a good answer looks like.",
    "Respect every field's `type`, `options`, and `constraints` exactly.",
  ];

  // Form-level context (tone/approach the form creator wants) applies to every answer.
  if (schema.form.agent_context) {
    lines.push(
      "",
      "The form creator provided this overall guidance for how to answer — apply it to every field:",
      schema.form.agent_context
    );
  }

  lines.push(
    "",
    "Form:",
    JSON.stringify({ title: schema.form.title, description: schema.form.description }, null, 2),
    "",
    "Fields to answer:",
    JSON.stringify(fields, null, 2),
    "",
    "User profile:",
    JSON.stringify(profile, null, 2),
    "",
    "Respond with ONLY a single JSON object mapping each field id to its answer.",
    "For multi_select fields, use a JSON array of strings. For boolean fields, use true or false.",
    "Do not include any explanation, markdown formatting, or code fences — just the raw JSON object."
  );
  return lines.join("\n");
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON object found in Claude response: ${text}`);
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {object} opts.schema
 * @param {object} opts.profile
 * @param {string[]} [opts.fieldIds]
 * @param {string} [opts.model]
 * @param {typeof fetch} [opts.fetchImpl]
 */
async function claudeAnswers({ apiKey, schema, profile, fieldIds, model, fetchImpl }) {
  const doFetch = fetchImpl || fetch;
  const prompt = buildPrompt(schema, profile, fieldIds);

  const res = await doFetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = (data.content || []).map((block) => block.text || "").join("");
  return extractJson(text);
}

module.exports = { claudeAnswers, buildPrompt, extractJson, DEFAULT_MODEL };
