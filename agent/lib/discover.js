// Discovery per Agentic Form Protocol v1 (PRD §4.1). Pure string parsing —
// no DOM/browser dependency needed since the markup we control is regular.

/**
 * @param {string} html
 * @returns {{ hasMarker: boolean, inlineSchema: object | null, schemaUrl: string | null }}
 */
function parseDiscovery(html) {
  const hasMarker =
    /<meta[^>]+name=["']agentic-form["']/i.test(html) ||
    /<link[^>]+rel=["']agentic-form-schema["']/i.test(html) ||
    /type=["']application\/agentic-form\+json["']/i.test(html) ||
    /data-agentic-form(-schema)?=/i.test(html);

  let inlineSchema = null;
  const scriptMatch = html.match(
    /<script[^>]*type=["']application\/agentic-form\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (scriptMatch) {
    try {
      inlineSchema = JSON.parse(scriptMatch[1].trim());
    } catch {
      inlineSchema = null;
    }
  }

  let schemaUrl = null;

  const linkTagMatch = html.match(/<link[^>]+rel=["']agentic-form-schema["'][^>]*>/i);
  if (linkTagMatch) {
    const hrefMatch = linkTagMatch[0].match(/href=["']([^"']+)["']/i);
    if (hrefMatch) schemaUrl = hrefMatch[1];
  }

  if (!schemaUrl) {
    const dataAttrMatch = html.match(/data-agentic-form-schema=["']([^"']+)["']/i);
    if (dataAttrMatch) schemaUrl = dataAttrMatch[1];
  }

  return { hasMarker, inlineSchema, schemaUrl };
}

module.exports = { parseDiscovery };
