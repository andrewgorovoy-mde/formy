import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as search } from "@/app/api/forms/search/route";
import { GET as wellKnown } from "@/app/.well-known/agentic-forms.json/route";

async function seedResource(data: {
  title: string;
  description: string;
  category: string;
  tags: string[];
  resourceUrl: string;
}) {
  return prisma.form.create({
    data: {
      title: data.title,
      description: data.description,
      status: "published",
      category: data.category,
      tags: JSON.stringify(data.tags),
      resourceUrl: data.resourceUrl,
      ogSiteName: "example.edu",
    },
  });
}

describe("registry search API", () => {
  beforeAll(async () => {
    await prisma.submission.deleteMany();
    await prisma.field.deleteMany();
    await prisma.form.deleteMany();
    await seedResource({
      title: "Free Drop-in Math Tutoring",
      description: "Peer tutoring for calculus and statistics.",
      category: "Academic Support",
      tags: ["tutoring", "math"],
      resourceUrl: "https://example.edu/tutoring",
    });
    await seedResource({
      title: "Counseling & Mental Health Intake",
      description: "Confidential counseling appointments.",
      category: "Mental Health",
      tags: ["counseling", "wellness"],
      resourceUrl: "https://example.edu/caps",
    });
    // A draft resource that must never appear in results.
    await prisma.form.create({
      data: { title: "Secret draft resource tutoring", status: "draft", category: "Academic Support" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ranks the relevant published form first and returns structured URLs", async () => {
    const res = await search(new NextRequest("http://localhost/api/forms/search?q=math+tutoring"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.protocol).toBe("agentic-form/v1");
    expect(body.results[0].title).toBe("Free Drop-in Math Tutoring");
    expect(body.results[0].score).toBeGreaterThan(0);
    expect(body.results[0].schema).toMatch(/\/api\/forms\/.+\/schema$/);
    expect(body.results[0].submit).toMatch(/\/submissions$/);
  });

  it("never returns draft forms", async () => {
    const res = await search(new NextRequest("http://localhost/api/forms/search?q=tutoring"));
    const body = await res.json();
    expect(body.results.some((r: { title: string }) => r.title.includes("draft"))).toBe(false);
  });

  it("filters by category", async () => {
    const res = await search(new NextRequest("http://localhost/api/forms/search?category=Mental+Health"));
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].category).toBe("Mental Health");
  });

  it("well-known index lists published resources with metadata + a search url", async () => {
    const res = await wellKnown(new NextRequest("http://localhost/.well-known/agentic-forms.json"));
    const body = await res.json();
    expect(body.search).toMatch(/\/api\/forms\/search$/);
    const titles = body.forms.map((f: { title: string }) => f.title);
    expect(titles).toContain("Free Drop-in Math Tutoring");
    expect(titles).not.toContain("Secret draft resource tutoring");
    const tutoring = body.forms.find((f: { title: string }) => f.title.includes("Tutoring"));
    expect(tutoring.tags).toContain("tutoring");
  });
});
