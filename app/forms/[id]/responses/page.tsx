import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { ResponsesTable, type SubmissionRow } from "@/components/responses/ResponsesTable";

export default async function ResponsesPage({
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

  const submissions = await prisma.submission.findMany({
    where: { formId: id },
    orderBy: { createdAt: "desc" },
  });

  const rows: SubmissionRow[] = submissions.map((s) => ({
    id: s.id,
    answers: JSON.parse(s.answers),
    source: s.source,
    agentName: s.agentName,
    agentOnBehalf: s.agentOnBehalf,
    createdAt: s.createdAt.toISOString(),
  }));

  const formDef = toFormWithFields(form);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-800"
      >
        <span aria-hidden>←</span> All forms
      </Link>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{form.title}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {submissions.length} response{submissions.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/forms/${form.id}/edit`}
            className="rounded-full border border-stone-200 px-4 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Edit
          </Link>
          <Link
            href={`/forms/${form.id}/publish`}
            className="rounded-full border border-stone-200 px-4 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Publish
          </Link>
        </div>
      </div>

      <ResponsesTable fields={formDef.fields} submissions={rows} />
    </main>
  );
}
