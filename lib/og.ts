// Open Graph / HTML metadata extraction. Pure parser (no network) so it can be unit-tested;
// the fetch wrapper below layers network + graceful fallback on top.

export type OgData = {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
};

function metaContent(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const match = html.match(re);
    if (match && match[1]) return decodeEntities(match[1].trim());
  }
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

/** Builds regexes matching a <meta> tag by property/name, in either attribute order. */
function metaPatterns(key: string, kind: "property" | "name"): RegExp[] {
  const k = key.replace(/[:]/g, "\\:");
  return [
    new RegExp(`<meta[^>]+${kind}=["']${k}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${kind}=["']${k}["']`, "i"),
  ];
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Parse OG/twitter/standard metadata out of an HTML document for a known URL. */
export function parseOg(html: string, url: string): OgData {
  const title =
    metaContent(html, [...metaPatterns("og:title", "property"), ...metaPatterns("twitter:title", "name")]) ||
    decodeEntities((html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim());

  const description = metaContent(html, [
    ...metaPatterns("og:description", "property"),
    ...metaPatterns("twitter:description", "name"),
    ...metaPatterns("description", "name"),
  ]);

  const image = metaContent(html, [
    ...metaPatterns("og:image", "property"),
    ...metaPatterns("twitter:image", "name"),
  ]);

  const siteName =
    metaContent(html, metaPatterns("og:site_name", "property")) || hostnameOf(url);

  return { url, title, description, image, siteName };
}

/** Minimal fallback when a page can't be fetched — still yields a usable resource card. */
export function fallbackOg(url: string): OgData {
  const host = hostnameOf(url);
  return { url, title: host, description: "", image: "", siteName: host };
}

/**
 * Fetch a URL and extract its metadata. Never throws — on any failure returns fallbackOg so a
 * resource link is always at least minimally described. fetchImpl is injectable for tests.
 */
export async function fetchOg(url: string, fetchImpl?: typeof fetch): Promise<OgData> {
  const doFetch = fetchImpl || fetch;
  try {
    const res = await doFetch(url, {
      headers: { "User-Agent": "FormyBot/0.1 (+resource-indexer)", Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return fallbackOg(url);
    const html = await res.text();
    const og = parseOg(html, url);
    // Ensure at least a site name / title survives.
    if (!og.title) og.title = og.siteName;
    return og;
  } catch {
    return fallbackOg(url);
  }
}
