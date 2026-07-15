#!/usr/bin/env node
// Standalone demo agent (PRD §9). Given a URL and agent/profile.json, it
// discovers an embedded Agentic Form, answers it from the profile, submits,
// and self-corrects once on a 422 before printing the confirmation.

const path = require("node:path");
const fs = require("node:fs");
const { parseDiscovery } = require("./lib/discover");
const { deterministicAnswers } = require("./lib/match");
const { claudeAnswers } = require("./lib/claude");
const { submitWithRetry } = require("./lib/submit");

function loadProfile(profilePath) {
  const raw = fs.readFileSync(profilePath, "utf8");
  return JSON.parse(raw);
}

// Parses the RFC 8288 Link header for a rel="agentic-form-schema" target.
function schemaUrlFromHeaders(res) {
  const direct = res.headers.get("x-agentic-form-schema");
  if (direct) return direct;
  const link = res.headers.get("link");
  if (link) {
    const match = link.match(/<([^>]+)>\s*;[^,]*rel="agentic-form-schema"/i);
    if (match) return match[1];
  }
  return null;
}

async function discoverSchema(url, fetchImpl, log) {
  const doFetch = fetchImpl || fetch;
  const res = await doFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  // 1) HTTP-layer discovery — works even without rendering or parsing the page.
  const headerSchemaUrl = schemaUrlFromHeaders(res);
  if (headerSchemaUrl) {
    if (log) log("Discovered schema via HTTP Link header (no DOM parsing needed).");
    const resolved = new URL(headerSchemaUrl, url).toString();
    const schemaRes = await doFetch(resolved);
    if (!schemaRes.ok) throw new Error(`Failed to fetch schema ${resolved}: ${schemaRes.status}`);
    return schemaRes.json();
  }

  // 2) DOM discovery — inline schema or a schema URL in the page markup.
  const html = await res.text();
  const { hasMarker, inlineSchema, schemaUrl } = parseDiscovery(html);
  if (!hasMarker && !inlineSchema && !schemaUrl) {
    throw new Error(`No agentic-form discovery markers found at ${url}`);
  }

  if (inlineSchema) return inlineSchema;

  if (!schemaUrl) throw new Error(`Discovery marker found but no schema URL at ${url}`);
  const resolvedUrl = new URL(schemaUrl, url).toString();
  const schemaRes = await doFetch(resolvedUrl);
  if (!schemaRes.ok) throw new Error(`Failed to fetch schema ${resolvedUrl}: ${schemaRes.status}`);
  return schemaRes.json();
}

function makeAnswerFn({ apiKey, fetchImpl, log }) {
  if (apiKey) {
    log(`Using Claude API for answer mapping (model: ${process.env.ANTHROPIC_MODEL || "claude-sonnet-5"})`);
    return (schema, profile, fieldIds) =>
      claudeAnswers({ apiKey, schema, profile, fieldIds, fetchImpl });
  }
  log("No ANTHROPIC_API_KEY set — falling back to deterministic keyword matching.");
  return async (schema, profile, fieldIds) => deterministicAnswers(schema, profile, fieldIds);
}

async function run({ url, profilePath, apiKey, fetchImpl, log }) {
  if (!url) throw new Error("Usage: node agent/apply.js <url> [--profile path/to/profile.json]");

  log(`Fetching ${url}…`);
  const schema = await discoverSchema(url, fetchImpl, log);
  log(`Discovered form: "${schema.form.title}" (${schema.form.fields.length} fields)`);

  const profile = loadProfile(profilePath);
  const answerFn = makeAnswerFn({ apiKey, fetchImpl, log });

  const agentMeta = {
    name: "scholarship-scout/0.1",
    on_behalf_of: profile.identity && profile.identity.email,
  };

  const result = await submitWithRetry({ schema, profile, answerFn, agentMeta, fetchImpl, log });

  if (result.ok) {
    log(`Submitted successfully after ${result.attempts} attempt(s).`);
    console.log(JSON.stringify(result.body, null, 2));
    return result;
  }

  log(`Submission failed after ${result.attempts} attempt(s).`);
  console.error(JSON.stringify(result.body, null, 2));
  return result;
}

function parseArgs(argv) {
  const [, , url, ...rest] = argv;
  let profilePath = path.join(__dirname, "profile.json");
  const flagIndex = rest.indexOf("--profile");
  if (flagIndex !== -1 && rest[flagIndex + 1]) {
    profilePath = path.resolve(rest[flagIndex + 1]);
  }
  return { url, profilePath };
}

if (require.main === module) {
  const { url, profilePath } = parseArgs(process.argv);
  run({
    url,
    profilePath,
    apiKey: process.env.ANTHROPIC_API_KEY,
    log: (msg) => console.log(`[agent] ${msg}`),
  })
    .then((result) => {
      process.exit(result.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error(`[agent] Error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { run, discoverSchema, makeAnswerFn, parseArgs, schemaUrlFromHeaders };
