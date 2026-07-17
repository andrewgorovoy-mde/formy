import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { buildAgenticSchema } from "@/lib/agenticSchema";
import { getServerAppUrl } from "@/lib/serverAppUrl";
import { embedJson } from "@/lib/embedJson";
import { PublicFormClient } from "@/components/PublicFormClient";

async function loadPublishedForm(id: string, allowDraft = false) {
  const form = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form) return null;
  if (form.status !== "published" && !allowDraft) return null;
  return form;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const form = await loadPublishedForm(id);
  if (!form) return {};
  return {
    title: form.title,
    description: form.description,
    other: {
      "agentic-form": "v1",
    },
  };
}

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { id } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";
  const form = await loadPublishedForm(id, isPreview);
  if (!form) notFound();

  const appUrl = await getServerAppUrl();
  const formDef = toFormWithFields(form);
  const schema = buildAgenticSchema(formDef, appUrl);
  const schemaUrl = `${appUrl}/api/forms/${form.id}/schema`;

  return (
    <>
      <link rel="agentic-form-schema" href={schemaUrl} />
      <script
        type="application/agentic-form+json"
        dangerouslySetInnerHTML={{ __html: embedJson(schema) }}
      />
      <PublicFormClient form={formDef} schemaUrl={schemaUrl} preview={isPreview} />
    </>
  );
}
