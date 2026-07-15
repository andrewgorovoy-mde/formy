import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { extractJson, buildPrompt } = require("../../agent/lib/claude");

describe("extractJson", () => {
  it("parses raw JSON", () => {
    expect(extractJson('{"email":"a@b.com"}')).toEqual({ email: "a@b.com" });
  });

  it("strips a ```json code fence", () => {
    const text = '```json\n{"email":"a@b.com","gpa":3.8}\n```';
    expect(extractJson(text)).toEqual({ email: "a@b.com", gpa: 3.8 });
  });

  it("strips surrounding prose", () => {
    const text = 'Sure, here is the answer:\n{"email":"a@b.com"}\nLet me know if you need changes.';
    expect(extractJson(text)).toEqual({ email: "a@b.com" });
  });

  it("throws when no JSON object is present", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("buildPrompt", () => {
  it("includes the field guidance and the profile so the model can honor both", () => {
    const schema = {
      form: {
        title: "Scholarship",
        description: "desc",
        fields: [{ id: "essay", type: "long_text", label: "Essay", guidance: "Be specific." }],
      },
    };
    const profile = { identity: { full_name: "Drew" } };
    const prompt = buildPrompt(schema, profile);
    expect(prompt).toContain("Be specific.");
    expect(prompt).toContain("Drew");
    expect(prompt).toContain("ONLY a single JSON object");
  });

  it("restricts the fields payload to the requested field ids", () => {
    const schema = {
      form: {
        title: "T",
        description: "",
        fields: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      },
    };
    const prompt = buildPrompt(schema, {}, ["b"]);
    expect(prompt).not.toContain('"id": "a"');
    expect(prompt).toContain('"id": "b"');
  });
});
