import { describe, it, expect } from "vitest";
import { slugify, dedupeKey } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and underscores", () => {
    expect(slugify("Full legal name")).toBe("full_legal_name");
  });

  it("strips punctuation", () => {
    expect(slugify("What's your GPA?")).toBe("what_s_your_gpa");
  });

  it("trims leading/trailing separators", () => {
    expect(slugify("  Email!! ")).toBe("email");
  });

  it("falls back to 'field' for empty input", () => {
    expect(slugify("???")).toBe("field");
    expect(slugify("")).toBe("field");
  });
});

describe("dedupeKey", () => {
  it("returns base key when unused", () => {
    expect(dedupeKey("email", new Set())).toBe("email");
  });

  it("appends incrementing suffix on collision", () => {
    expect(dedupeKey("email", new Set(["email"]))).toBe("email_2");
    expect(dedupeKey("email", new Set(["email", "email_2"]))).toBe("email_3");
  });
});
