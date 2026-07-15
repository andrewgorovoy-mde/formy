// Orchestrates POST -> (on 422) targeted regenerate -> retry once, per PRD §4.3 / §9.

async function postSubmission(submit, answers, agentMeta, fetchImpl) {
  const doFetch = fetchImpl || fetch;
  const res = await doFetch(submit.url, {
    method: submit.method || "POST",
    headers: { "Content-Type": submit.content_type || "application/json" },
    body: JSON.stringify({ answers, agent: agentMeta }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * @param {object} opts
 * @param {object} opts.schema agentic-form/v1 schema
 * @param {object} opts.profile
 * @param {(schema: object, profile: object, fieldIds?: string[]) => Promise<object>} opts.answerFn
 * @param {object} opts.agentMeta { name, on_behalf_of }
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {(msg: string) => void} [opts.log]
 */
async function submitWithRetry({ schema, profile, answerFn, agentMeta, fetchImpl, log }) {
  const logFn = log || (() => {});

  const answers = await answerFn(schema, profile);
  logFn(`Submitting ${Object.keys(answers).length} answers…`);
  let result = await postSubmission(schema.submit, answers, agentMeta, fetchImpl);

  if (result.status === 201) {
    return { ok: true, attempts: 1, body: result.body, answers };
  }

  if (result.status !== 422) {
    return { ok: false, attempts: 1, body: result.body, answers };
  }

  const errors = result.body.fields || {};
  logFn(`Validation failed on: ${Object.keys(errors).join(", ")}`);
  const failingIds = Object.keys(errors).filter((id) => id !== "_form");

  if (failingIds.length === 0) {
    return { ok: false, attempts: 1, body: result.body, answers };
  }

  logFn(`Regenerating answers for: ${failingIds.join(", ")}`);
  const patch = await answerFn(schema, profile, failingIds);
  const retryAnswers = { ...answers, ...patch };
  result = await postSubmission(schema.submit, retryAnswers, agentMeta, fetchImpl);

  return {
    ok: result.status === 201,
    attempts: 2,
    body: result.body,
    answers: retryAnswers,
  };
}

module.exports = { submitWithRetry, postSubmission };
