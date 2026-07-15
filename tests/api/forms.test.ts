import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as listForms, POST as createForm } from "@/app/api/forms/route";
import { GET as getForm, PATCH as patchForm } from "@/app/api/forms/[id]/route";
import { GET as getSchema } from "@/app/api/forms/[id]/schema/route";
import {
  GET as listSubmissions,
  POST as createSubmission,
} from "@/app/api/forms/[id]/submissions/route";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function withId(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("forms + submissions API", () => {
  beforeAll(async () => {
    await prisma.submission.deleteMany();
    await prisma.field.deleteMany();
    await prisma.form.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a draft form via POST /api/forms", async () => {
    const res = await createForm(jsonRequest("http://localhost/api/forms", "POST", { title: "Scholarship" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("draft");
    expect(body.title).toBe("Scholarship");
  });

  it("lists forms via GET /api/forms", async () => {
    const res = await listForms();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  describe("full lifecycle: create -> add fields -> publish -> schema -> submit", () => {
    let formId: string;

    it("creates the form", async () => {
      const res = await createForm(jsonRequest("http://localhost/api/forms", "POST", {}));
      const body = await res.json();
      formId = body.id;
      expect(formId).toBeTruthy();
    });

    it("adds fields via PATCH, auto-generating stable keys", async () => {
      const res = await patchForm(
        jsonRequest(`http://localhost/api/forms/${formId}`, "PATCH", {
          title: "Rivera Foundation Scholarship 2026",
          description: "For undergraduates studying environmental science.",
          fields: [
            { type: "short_text", label: "Full legal name", required: true, guidance: "As it appears on ID." },
            { type: "email", label: "Contact email", required: true },
            { type: "number", label: "Current GPA", required: true, constraints: { min: 0, max: 4 } },
            {
              type: "select",
              label: "Expected graduation year",
              required: true,
              options: ["2026", "2027", "2028", "2029"],
            },
            {
              type: "long_text",
              label: "Why do you deserve this scholarship?",
              required: true,
              constraints: { min_length: 20, max_length: 2500 },
            },
          ],
        }),
        withId(formId)
      );
      const body = await res.json();
      expect(body.fields).toHaveLength(5);
      expect(body.fields[0].key).toBe("full_legal_name");
      expect(body.fields[1].key).toBe("contact_email");
    });

    it("is not visible in the schema endpoint while a draft", async () => {
      const res = await getSchema(
        new NextRequest(`http://localhost/api/forms/${formId}/schema`),
        withId(formId)
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 from GET /f/[id]-equivalent submissions endpoint while a draft", async () => {
      const res = await createSubmission(
        jsonRequest(`http://localhost/api/forms/${formId}/submissions`, "POST", { answers: {} }),
        withId(formId)
      );
      expect(res.status).toBe(404);
    });

    it("publishes the form", async () => {
      const res = await patchForm(
        jsonRequest(`http://localhost/api/forms/${formId}`, "PATCH", { status: "published" }),
        withId(formId)
      );
      const body = await res.json();
      expect(body.status).toBe("published");
    });

    it("exposes the agentic schema once published, with CORS headers", async () => {
      const res = await getSchema(
        new NextRequest(`http://localhost/api/forms/${formId}/schema`),
        withId(formId)
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      const body = await res.json();
      expect(body.protocol).toBe("agentic-form/v1");
      expect(body.form.fields).toHaveLength(5);
      expect(body.submit.url).toBe(`http://localhost:3000/api/forms/${formId}/submissions`);
    });

    it("rejects an invalid submission with 422 and per-field errors", async () => {
      const res = await createSubmission(
        jsonRequest(`http://localhost/api/forms/${formId}/submissions`, "POST", {
          answers: {
            full_legal_name: "Drew Gorovoy",
            contact_email: "not-an-email",
            current_gpa: 3.8,
            expected_graduation_year: "2027",
            why_do_you_deserve_this_scholarship: "too short",
          },
        }),
        withId(formId)
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBe("validation_failed");
      expect(body.fields.contact_email).toMatch(/valid email/);
      expect(body.fields.why_do_you_deserve_this_scholarship).toMatch(/min_length/);
    });

    it("accepts a valid human submission (no agent block) and records source=human", async () => {
      const res = await createSubmission(
        jsonRequest(`http://localhost/api/forms/${formId}/submissions`, "POST", {
          answers: {
            full_legal_name: "Drew Gorovoy",
            contact_email: "agorovoy24@gmail.com",
            current_gpa: 3.8,
            expected_graduation_year: "2027",
            why_do_you_deserve_this_scholarship: "This is a sufficiently long essay response.",
          },
        }),
        withId(formId)
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe("received");
      expect(body.form_id).toBe(formId);
    });

    it("accepts a valid agent submission and records source=agent", async () => {
      const res = await createSubmission(
        jsonRequest(`http://localhost/api/forms/${formId}/submissions`, "POST", {
          answers: {
            full_legal_name: "Drew Gorovoy",
            contact_email: "agorovoy24@gmail.com",
            current_gpa: 3.8,
            expected_graduation_year: "2027",
            why_do_you_deserve_this_scholarship: "This is a sufficiently long essay response.",
          },
          agent: { name: "scholarship-scout/0.1", on_behalf_of: "agorovoy24@gmail.com" },
        }),
        withId(formId)
      );
      expect(res.status).toBe(201);
    });

    it("lists submissions with correct source badges", async () => {
      const res = await listSubmissions(new NextRequest(`http://localhost/api/forms/${formId}/submissions`), withId(formId));
      const body = await res.json();
      expect(body).toHaveLength(2);
      const sources = body.map((s: { source: string }) => s.source).sort();
      expect(sources).toEqual(["agent", "human"]);
      const agentSub = body.find((s: { source: string }) => s.source === "agent");
      expect(agentSub.agentName).toBe("scholarship-scout/0.1");
    });

    it("rejects unknown field ids", async () => {
      const res = await createSubmission(
        jsonRequest(`http://localhost/api/forms/${formId}/submissions`, "POST", {
          answers: { not_a_real_field: "x" },
        }),
        withId(formId)
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.fields.not_a_real_field).toBe("unknown field");
    });
  });

  it("404s GET /api/forms/[id] for a missing form", async () => {
    const res = await getForm(new NextRequest("http://localhost/api/forms/nope"), withId("nope"));
    expect(res.status).toBe(404);
  });
});
