import { describe, it, expect } from "vitest";
import { parseOg, fallbackOg, fetchOg } from "@/lib/og";

const html = `<!DOCTYPE html><html><head>
  <title>Tutoring Center — State College</title>
  <meta property="og:title" content="Free Drop-in Tutoring" />
  <meta property="og:description" content="Peer tutoring for math &amp; science, no appointment needed." />
  <meta property="og:image" content="https://cdn.college.edu/tutoring.png" />
  <meta property="og:site_name" content="State College" />
</head><body></body></html>`;

describe("parseOg", () => {
  it("extracts OG title, description, image, and site name", () => {
    const og = parseOg(html, "https://college.edu/tutoring");
    expect(og.title).toBe("Free Drop-in Tutoring");
    expect(og.description).toBe("Peer tutoring for math & science, no appointment needed.");
    expect(og.image).toBe("https://cdn.college.edu/tutoring.png");
    expect(og.siteName).toBe("State College");
  });

  it("falls back to <title> and hostname when OG tags are absent", () => {
    const bare = `<html><head><title>Career Services</title></head><body></body></html>`;
    const og = parseOg(bare, "https://www.college.edu/careers");
    expect(og.title).toBe("Career Services");
    expect(og.siteName).toBe("college.edu");
  });

  it("handles reversed attribute order (content before property)", () => {
    const reversed = `<meta content="Reversed" property="og:title">`;
    expect(parseOg(reversed, "https://x.com").title).toBe("Reversed");
  });
});

describe("fallbackOg", () => {
  it("derives a usable card from just the URL", () => {
    expect(fallbackOg("https://www.example.edu/aid")).toEqual({
      url: "https://www.example.edu/aid",
      title: "example.edu",
      description: "",
      image: "",
      siteName: "example.edu",
    });
  });
});

describe("fetchOg", () => {
  it("never throws — returns fallback on network failure", async () => {
    const failing = async () => {
      throw new Error("ENOTFOUND");
    };
    const og = await fetchOg("https://down.example.com/x", failing as unknown as typeof fetch);
    expect(og.siteName).toBe("down.example.com");
  });

  it("parses a successful fetch", async () => {
    const ok = async () => ({ ok: true, text: async () => html }) as unknown as Response;
    const og = await fetchOg("https://college.edu/tutoring", ok as unknown as typeof fetch);
    expect(og.title).toBe("Free Drop-in Tutoring");
  });
});
