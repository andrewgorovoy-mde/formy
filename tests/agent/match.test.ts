import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { deterministicAnswers } = require("../../agent/lib/match");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const profile = require("../../agent/profile.json");

const scholarshipSchema = {
  form: {
    id: "clx123",
    title: "Rivera Foundation Scholarship 2026",
    fields: [
      { id: "full_name", type: "short_text", label: "Full legal name", required: true },
      { id: "email", type: "email", label: "Contact email", required: true },
      { id: "gpa", type: "number", label: "Current GPA", required: true, constraints: { min: 0, max: 4 } },
      {
        id: "grad_year",
        type: "select",
        label: "Expected graduation year",
        required: true,
        options: ["2026", "2027", "2028", "2029"],
      },
      {
        id: "areas",
        type: "multi_select",
        label: "Areas of study",
        required: false,
        options: ["Climate", "Conservation", "Policy", "Energy"],
      },
      {
        id: "essay",
        type: "long_text",
        label: "Why do you deserve this scholarship?",
        required: true,
        constraints: { min_length: 400, max_length: 2500 },
      },
    ],
  },
};

describe("deterministicAnswers", () => {
  it("maps the full scholarship form from profile.json with no LLM call", () => {
    const answers = deterministicAnswers(scholarshipSchema, profile);
    expect(answers.full_name).toBe("Drew Gorovoy");
    expect(answers.email).toBe("agorovoy24@gmail.com");
    expect(answers.gpa).toBe(3.8);
    expect(answers.grad_year).toBe("2027");
    expect(answers.areas).toEqual(["Climate", "Policy"]);
    expect(typeof answers.essay).toBe("string");
    expect(answers.essay.length).toBeGreaterThanOrEqual(400);
  });

  it("restricts mapping to the requested field ids (for targeted 422 regeneration)", () => {
    const answers = deterministicAnswers(scholarshipSchema, profile, ["email", "gpa"]);
    expect(Object.keys(answers).sort()).toEqual(["email", "gpa"]);
  });

  it("only includes multi_select values present in the field's options", () => {
    const narrowSchema = {
      form: {
        fields: [
          {
            id: "areas",
            type: "multi_select",
            label: "Areas of study",
            options: ["Conservation", "Energy"],
          },
        ],
      },
    };
    const answers = deterministicAnswers(narrowSchema, profile);
    // profile interests are Climate/Policy, neither is in this field's options
    expect(answers.areas).toBeUndefined();
  });
});
