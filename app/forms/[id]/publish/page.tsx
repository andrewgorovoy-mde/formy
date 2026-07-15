import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { buildAgenticSchema } from "@/lib/agenticSchema";
import { getServerAppUrl } from "@/lib/serverAppUrl";
import { CopyField } from "@/components/CopyField";
import { UnpublishButton } from "@/components/builder/UnpublishButton";

export default async function PublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form) notFound();

  const appUrl = await getServerAppUrl();
  const publicUrl = `${appUrl}/f/${form.id}`;
  const schemaUrl = `${appUrl}/api/forms/${form.id}/schema`;

  const embedSnippet = `<iframe
  src="${publicUrl}"
  data-agentic-form="v1"
  data-agentic-form-schema="${schemaUrl}"
  style="width:100%;border:none;min-height:600px">
</iframe>`;

  const schemaPreview =
    form.status === "published"
      ? JSON.stringify(buildAgenticSchema(toFormWithFields(form), appUrl), null, 2)
      : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-800"
      >
        <span aria-hidden>←</span> All forms
      </Link>
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{form.title}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {form.status === "published" ? "Live" : "Not published"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/forms/${form.id}/edit`}
            className="rounded-full border border-stone-200 px-4 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Edit
          </Link>
          {form.status === "published" && <UnpublishButton formId={form.id} />}
        </div>
      </div>

      {form.status !== "published" ? (
        <div className="rounded-lg border border-dashed border-stone-200 py-16 text-center text-stone-500">
          This form is a draft. Publish it from the builder to get a public link and embed
          snippet.
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-2 text-sm font-medium text-stone-700">Public link</h2>
            <CopyField value={publicUrl} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-stone-700">Embed snippet</h2>
            <p className="mb-2 text-sm text-stone-500">
              Paste this on any page. Agents parsing the host page discover the schema URL right
              on the iframe tag — no need to enter the iframe.
            </p>
            <CopyField value={embedSnippet} multiline />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-stone-700">Schema URL</h2>
            <CopyField value={schemaUrl} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-stone-700">How agents see this form</h2>
            <CopyField value={schemaPreview ?? ""} multiline />
          </section>
        </div>
      )}
    </main>
  );
}
