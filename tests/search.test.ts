import { describe, it, expect } from "vitest";
import { searchForms, scoreForm, tokenize } from "@/lib/search";
import type { FormWithFields } from "@/lib/types";

function resource(overrides: Partial<FormWithFields>): FormWithFields {
  return {
    id: "id",
    title: "",
    description: "",
    status: "published",
    accentColor: "#000",
    agentContext: "",
    resource: {
      category: "",
      tags: [],
      resourceUrl: "",
      og: { title: "", description: "", image: "", siteName: "" },
    },
    fields: [],
    ...overrides,
  };
}

const forms: FormWithFields[] = [
  resource({
    id: "tutoring",
    title: "Free Drop-in Math Tutoring",
    description: "Peer tutoring for calculus and statistics.",
    resource: {
      category: "Academic Support",
      tags: ["tutoring", "math"],
      resourceUrl: "https://college.edu/tutoring",
      og: { title: "Tutoring Center", description: "", image: "", siteName: "college.edu" },
    },
  }),
  resource({
    id: "counseling",
    title: "Counseling & Mental Health Intake",
    description: "Book a confidential appointment with a counselor.",
    resource: {
      category: "Mental Health",
      tags: ["counseling", "wellness"],
      resourceUrl: "https://college.edu/caps",
      og: { title: "CAPS", description: "", image: "", siteName: "college.edu" },
    },
  }),
  resource({
    id: "aid",
    title: "Emergency Financial Aid Request",
    description: "Short-term grants for students facing hardship.",
    resource: {
      category: "Financial Aid",
      tags: ["grants", "emergency"],
      resourceUrl: "",
      og: { title: "", description: "", image: "", siteName: "" },
    },
  }),
];

describe("tokenize", () => {
  it("lowercases and drops single chars / punctuation", () => {
    expect(tokenize("Free Math & CS-101!")).toEqual(["free", "math", "cs", "101"]);
  });
});

describe("searchForms", () => {
  it("ranks the topically relevant form first", () => {
    const results = searchForms(forms, { q: "math tutoring help" });
    expect(results[0].id).toBe("tutoring");
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].matchedTerms).toContain("tutoring");
  });

  it("finds mental-health resources by natural-language query", () => {
    const results = searchForms(forms, { q: "I need to talk to a counselor" });
    expect(results[0].id).toBe("counseling");
  });

  it("returns nothing for an unrelated query", () => {
    expect(searchForms(forms, { q: "parking permit garage" })).toHaveLength(0);
  });

  it("filters by category", () => {
    const results = searchForms(forms, { category: "Financial Aid" });
    expect(results.map((r) => r.id)).toEqual(["aid"]);
  });

  it("filters by tag (all tags must match)", () => {
    expect(searchForms(forms, { tags: ["counseling"] }).map((r) => r.id)).toEqual(["counseling"]);
    expect(searchForms(forms, { tags: ["counseling", "math"] })).toHaveLength(0);
  });

  it("respects the limit", () => {
    // empty query with no filters -> all forms are relevant (browse mode)
    expect(searchForms(forms, { limit: 2 })).toHaveLength(2);
  });

  it("weights title matches above field/description matches", () => {
    const titleMatch = scoreForm(forms[0], ["math"]).score;
    const descOnly = scoreForm(
      resource({ title: "Something", description: "math appears only here" }),
      ["math"]
    ).score;
    expect(titleMatch).toBeGreaterThan(descOnly);
  });
});
