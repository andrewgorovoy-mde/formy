import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";
import { GET as listForms, POST as createForm } from "@/app/api/forms/route";
import { GET as getForm, PATCH as patchForm, DELETE as deleteForm } from "@/app/api/forms/[id]/route";
import { GET as getSchema } from "@/app/api/forms/[id]/schema/route";
import {
  GET as listSubmissions,
  POST as createSubmission,
} from "@/app/api/forms/[id]/submissions/route";

let authCookie: string;
let otherAuthCookie: string;

function jsonRequest(url: string, method: string, body?: unknown, cookie = authCookie) {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: `${SESSION_COOKIE}=${cookie}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function authedGet(url: string, cookie = authCookie) {
  return new NextRequest(url, {
    headers: cookie ? { Cookie: `${SESSION_COOKIE}=${cookie}` } : {},
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
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { email: "owner@example.com", passwordHash: hashPassword("password123") },
    });
    authCookie = signSession(user.id);

    const otherUser = await prisma.user.create({
      data: { email: "other@example.com", passwordHash: hashPassword("password123") },
    });
    otherAuthCookie = signSession(otherUser.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requires auth to create a form", async () => {
    const res = await createForm(jsonRequest("http://localhost/api/forms", "POST", { title: "Nope" }, ""));
    expect(res.status).toBe(401);
  });

  it("creates a draft form owned by the caller via POST /api/forms", async () => {
    const res = await createForm(jsonRequest("http://localhost/api/forms", "POST", { title: "Scholarship" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("draft");
    expect(body.title).toBe("Scholarship");
    expect(body.userId).toBeTruthy();
  });

  it("lists only the caller's own forms via GET /api/forms", async () => {
    const res = await listForms(authedGet("http://localhost/api/forms"));
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const otherRes = await listForms(authedGet("http://localhost/api/forms", otherAuthCookie));
    const otherBody = await otherRes.json();
    expect(otherBody).toHaveLength(0);
  });

  describe("full lifecycle: create -> add fields -> publish -> schema -> submit", () => {
    let formId: string;

    it("creates the form", async () => {
      const res = await createForm(jsonRequest("http://localhost/api/forms", "POST", {}));
      const body = await res.json();
      formId = body.id;
      expect(formId).toBeTruthy();
    });

    it("a different signed-in user cannot read or edit the form", async () => {
      const getRes = await getForm(authedGet(`http://localhost/api/forms/${formId}`, otherAuthCookie), withId(formId));
      expect(getRes.status).toBe(403);
      const patchRes = await patchForm(
        jsonRequest(`http://localhost/api/forms/${formId}`, "PATCH", { title: "Hijacked" }, otherAuthCookie),
        withId(formId)
      );
      expect(patchRes.status).toBe(403);
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

    it("is not visible in the schema endpoint while a draft (public route, no auth needed)", async () => {
      const res = await getSchema(
        new NextRequest(`http://localhost/api/forms/${formId}/schema`),
        withId(formId)
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 from the public submissions endpoint while a draft", async () => {
      const res = await createSubmission(
        jsonRequest(`http://localhost/api/forms/${formId}/submissions`, "POST", { answers: {} }, ""),
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

    it("exposes the agentic schema once published, with CORS headers (public, no auth)", async () => {
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

    it("rejects an invalid submission with 422 and per-field errors (public, no auth)", async () => {
      const res = await createSubmission(
        jsonRequest(
          `http://localhost/api/forms/${formId}/submissions`,
          "POST",
          {
            answers: {
              full_legal_name: "Jane Okafor",
              contact_email: "not-an-email",
              current_gpa: 3.8,
              expected_graduation_year: "2027",
              why_do_you_deserve_this_scholarship: "too short",
            },
          },
          ""
        ),
        withId(formId)
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBe("validation_failed");
      expect(body.fields.contact_email).toMatch(/valid email/);
      expect(body.fields.why_do_you_deserve_this_scholarship).toMatch(/min_length/);
    });

    it("accepts a valid human submission (no agent block, no auth) and records source=human", async () => {
      const res = await createSubmission(
        jsonRequest(
          `http://localhost/api/forms/${formId}/submissions`,
          "POST",
          {
            answers: {
              full_legal_name: "Jane Okafor",
              contact_email: "jane.okafor@example.com",
              current_gpa: 3.8,
              expected_graduation_year: "2027",
              why_do_you_deserve_this_scholarship: "This is a sufficiently long essay response.",
            },
          },
          ""
        ),
        withId(formId)
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe("received");
      expect(body.form_id).toBe(formId);
    });

    it("accepts a valid agent submission (no auth) and records source=agent", async () => {
      const res = await createSubmission(
        jsonRequest(
          `http://localhost/api/forms/${formId}/submissions`,
          "POST",
          {
            answers: {
              full_legal_name: "Jane Okafor",
              contact_email: "jane.okafor@example.com",
              current_gpa: 3.8,
              expected_graduation_year: "2027",
              why_do_you_deserve_this_scholarship: "This is a sufficiently long essay response.",
            },
            agent: { name: "scholarship-scout/0.1", on_behalf_of: "jane.okafor@example.com" },
          },
          ""
        ),
        withId(formId)
      );
      expect(res.status).toBe(201);
    });

    it("requires auth to list submissions, and only the owner may see them", async () => {
      const anon = await listSubmissions(new NextRequest(`http://localhost/api/forms/${formId}/submissions`), withId(formId));
      expect(anon.status).toBe(401);

      const stranger = await listSubmissions(
        authedGet(`http://localhost/api/forms/${formId}/submissions`, otherAuthCookie),
        withId(formId)
      );
      expect(stranger.status).toBe(403);

      const res = await listSubmissions(authedGet(`http://localhost/api/forms/${formId}/submissions`), withId(formId));
      const body = await res.json();
      expect(body).toHaveLength(2);
      const sources = body.map((s: { source: string }) => s.source).sort();
      expect(sources).toEqual(["agent", "human"]);
      const agentSub = body.find((s: { source: string }) => s.source === "agent");
      expect(agentSub.agentName).toBe("scholarship-scout/0.1");
    });

    it("rejects unknown field ids (public route, no auth)", async () => {
      const res = await createSubmission(
        jsonRequest(
          `http://localhost/api/forms/${formId}/submissions`,
          "POST",
          { answers: { not_a_real_field: "x" } },
          ""
        ),
        withId(formId)
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.fields.not_a_real_field).toBe("unknown field");
    });

    it("a different signed-in user cannot delete the form", async () => {
      const res = await deleteForm(authedGet(`http://localhost/api/forms/${formId}`, otherAuthCookie), withId(formId));
      expect(res.status).toBe(403);
    });
  });

  it("404s GET /api/forms/[id] for a missing form (as an authed user)", async () => {
    const res = await getForm(authedGet("http://localhost/api/forms/nope"), withId("nope"));
    expect(res.status).toBe(404);
  });

  it("401s GET /api/forms/[id] for an unauthenticated caller", async () => {
    const res = await getForm(authedGet("http://localhost/api/forms/nope", ""), withId("nope"));
    expect(res.status).toBe(401);
  });
});
