import { describe, it, expect } from "vitest";
import { buildAgenticSchema } from "@/lib/agenticSchema";
import type { FormWithFields } from "@/lib/types";

const form: FormWithFields = {
  id: "clx123",
  title: "Rivera Foundation Scholarship 2026",
  description: "For undergraduates studying environmental science.",
  status: "published",
  accentColor: "#8B5CF6",
  agentContext: "Write warmly and honestly; value specific lived experience.",
  resource: {
    category: "Financial Aid",
    tags: ["scholarship", "environment"],
    resourceUrl: "https://rivera.org/scholarship",
    og: {
      title: "Rivera Foundation",
      description: "Environmental scholarships",
      image: "",
      siteName: "rivera.org",
    },
  },
  fields: [
    {
      id: "2",
      key: "email",
      order: 1,
      type: "email",
      label: "Contact email",
      guidance: "",
      required: true,
      options: [],
      constraints: {},
    },
    {
      id: "1",
      key: "full_name",
      order: 0,
      type: "short_text",
      label: "Full legal name",
      guidance: "As it appears on government ID.",
      required: true,
      options: [],
      constraints: {},
    },
    {
      id: "3",
      key: "grad_year",
      order: 2,
      type: "select",
      label: "Expected graduation year",
      guidance: "",
      required: true,
      options: ["2026", "2027", "2028", "2029"],
      constraints: {},
    },
  ],
};

describe("buildAgenticSchema", () => {
  const schema = buildAgenticSchema(form, "https://app.example.com");

  it("sets the protocol version", () => {
    expect(schema.protocol).toBe("agentic-form/v1");
  });

  it("sorts fields by order regardless of input order", () => {
    expect(schema.form.fields.map((f) => f.id)).toEqual(["full_name", "email", "grad_year"]);
  });

  it("includes guidance only when present", () => {
    const fullName = schema.form.fields.find((f) => f.id === "full_name")!;
    const email = schema.form.fields.find((f) => f.id === "email")!;
    expect(fullName.guidance).toBe("As it appears on government ID.");
    expect(email.guidance).toBeUndefined();
  });

  it("includes options for select-type fields", () => {
    const gradYear = schema.form.fields.find((f) => f.id === "grad_year")!;
    expect(gradYear.options).toEqual(["2026", "2027", "2028", "2029"]);
  });

  it("omits accentColor entirely (presentational only)", () => {
    expect(JSON.stringify(schema)).not.toContain("accentColor");
    expect(JSON.stringify(schema)).not.toContain("#8B5CF6");
  });

  it("surfaces form-level agent_context when set", () => {
    expect(schema.form.agent_context).toBe(
      "Write warmly and honestly; value specific lived experience."
    );
  });

  it("omits agent_context when empty", () => {
    const bare = buildAgenticSchema({ ...form, agentContext: "" }, "https://app.example.com");
    expect(bare.form.agent_context).toBeUndefined();
  });

  it("surfaces resource metadata (category, tags, resource link + OG)", () => {
    expect(schema.form.category).toBe("Financial Aid");
    expect(schema.form.tags).toEqual(["scholarship", "environment"]);
    expect(schema.form.resource).toEqual({
      url: "https://rivera.org/scholarship",
      title: "Rivera Foundation",
      description: "Environmental scholarships",
      site_name: "rivera.org",
    });
  });

  it("omits resource block when there is no resource url", () => {
    const bare = buildAgenticSchema(
      { ...form, resource: { category: "", tags: [], resourceUrl: "", og: { title: "", description: "", image: "", siteName: "" } } },
      "https://app.example.com"
    );
    expect(bare.form.resource).toBeUndefined();
    expect(bare.form.category).toBeUndefined();
    expect(bare.form.tags).toBeUndefined();
  });

  it("builds the correct submit URL", () => {
    expect(schema.submit).toEqual({
      url: "https://app.example.com/api/forms/clx123/submissions",
      method: "POST",
      content_type: "application/json",
    });
  });
});
