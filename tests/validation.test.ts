import { describe, it, expect } from "vitest";
import { validateAnswers } from "@/lib/validation";
import type { FieldDef } from "@/lib/types";

function field(overrides: Partial<FieldDef>): FieldDef {
  return {
    id: "f1",
    key: "field_key",
    order: 0,
    type: "short_text",
    label: "Label",
    guidance: "",
    required: false,
    options: [],
    constraints: {},
    ...overrides,
  };
}

// Mirrors the scholarship form from PRD §4.2.
const scholarshipFields: FieldDef[] = [
  field({ id: "1", key: "full_name", type: "short_text", label: "Full legal name", required: true }),
  field({ id: "2", key: "email", type: "email", label: "Contact email", required: true }),
  field({
    id: "3",
    key: "gpa",
    type: "number",
    label: "Current GPA",
    required: true,
    constraints: { min: 0, max: 4.0 },
  }),
  field({
    id: "4",
    key: "grad_year",
    type: "select",
    label: "Expected graduation year",
    required: true,
    options: ["2026", "2027", "2028", "2029"],
  }),
  field({
    id: "5",
    key: "areas",
    type: "multi_select",
    label: "Areas of study",
    required: false,
    options: ["Climate", "Conservation", "Policy", "Energy"],
  }),
  field({
    id: "6",
    key: "essay",
    type: "long_text",
    label: "Why do you deserve this scholarship?",
    required: true,
    constraints: { min_length: 20, max_length: 2500 },
  }),
];

const validAnswers = {
  full_name: "Jane Okafor",
  email: "jane.okafor@example.com",
  gpa: 3.8,
  grad_year: "2027",
  areas: ["Climate", "Policy"],
  essay: "This is a sufficiently long essay about why I deserve this scholarship.",
};

describe("validateAnswers", () => {
  it("accepts a fully valid submission", () => {
    const result = validateAnswers(scholarshipFields, validAnswers);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.normalized.full_name).toBe("Jane Okafor");
    expect(result.normalized.gpa).toBe(3.8);
  });

  it("omits missing optional fields from normalized output", () => {
    const { areas, ...rest } = validAnswers;
    void areas;
    const result = validateAnswers(scholarshipFields, rest);
    expect(result.valid).toBe(true);
    expect(result.normalized.areas).toBeUndefined();
  });

  it("flags missing required fields", () => {
    const { full_name, ...rest } = validAnswers;
    void full_name;
    const result = validateAnswers(scholarshipFields, rest);
    expect(result.valid).toBe(false);
    expect(result.errors.full_name).toBe("required");
  });

  it("rejects unknown field ids", () => {
    const result = validateAnswers(scholarshipFields, { ...validAnswers, hometown: "Boston" });
    expect(result.valid).toBe(false);
    expect(result.errors.hometown).toBe("unknown field");
  });

  it("rejects invalid email format", () => {
    const result = validateAnswers(scholarshipFields, { ...validAnswers, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toMatch(/valid email/);
  });

  it("enforces number range constraints", () => {
    const result = validateAnswers(scholarshipFields, { ...validAnswers, gpa: 4.5 });
    expect(result.valid).toBe(false);
    expect(result.errors.gpa).toMatch(/between 0 and 4/);
  });

  it("rejects non-numeric gpa", () => {
    const result = validateAnswers(scholarshipFields, { ...validAnswers, gpa: "high" });
    expect(result.valid).toBe(false);
    expect(result.errors.gpa).toBe("must be a number");
  });

  it("enforces select options", () => {
    const result = validateAnswers(scholarshipFields, { ...validAnswers, grad_year: "2099" });
    expect(result.valid).toBe(false);
    expect(result.errors.grad_year).toMatch(/must be one of/);
  });

  it("enforces multi_select option membership", () => {
    const result = validateAnswers(scholarshipFields, { ...validAnswers, areas: ["Climate", "Bogus"] });
    expect(result.valid).toBe(false);
    expect(result.errors.areas).toMatch(/invalid options: Bogus/);
  });

  it("enforces min_length with the exact PRD-style message", () => {
    const result = validateAnswers(scholarshipFields, { ...validAnswers, essay: "too short" });
    expect(result.valid).toBe(false);
    expect(result.errors.essay).toBe(`min_length 20 not met (got 9)`);
  });

  it("enforces max_length", () => {
    const result = validateAnswers(scholarshipFields, {
      ...validAnswers,
      essay: "x".repeat(2600),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.essay).toMatch(/max_length 2500 exceeded/);
  });

  it("validates ISO date fields", () => {
    const dateFields = [field({ key: "start_date", type: "date", required: true })];
    expect(validateAnswers(dateFields, { start_date: "2026-07-15" }).valid).toBe(true);
    expect(validateAnswers(dateFields, { start_date: "07/15/2026" }).valid).toBe(false);
  });

  it("validates boolean fields strictly", () => {
    const boolFields = [field({ key: "agree", type: "boolean", required: true })];
    expect(validateAnswers(boolFields, { agree: true }).valid).toBe(true);
    expect(validateAnswers(boolFields, { agree: "true" }).valid).toBe(false);
  });

  it("rejects a non-object answers payload", () => {
    const result = validateAnswers(scholarshipFields, "nope");
    expect(result.valid).toBe(false);
    expect(result.errors._form).toBeDefined();
  });
});
