import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { ResponsesTable, type SubmissionRow } from "@/components/responses/ResponsesTable";

export const dynamic = "force-dynamic";

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const form = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form || form.userId !== user.id) notFound();

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
  const agentCount = rows.filter((r) => r.source === "agent").length;

  return (
    <>
      <TopBar
        userEmail={user.email}
        right={
          <nav className="flex items-center gap-1 text-sm">
            <Link href={`/forms/${form.id}/edit`} className="rounded-full px-3 py-1.5 font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800">
              Edit
            </Link>
            <Link href={`/forms/${form.id}/publish`} className="rounded-full px-3 py-1.5 font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800">
              Share
            </Link>
            <span className="rounded-full bg-violet-100 px-3 py-1.5 font-medium text-violet-700">Responses</span>
          </nav>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{form.title}</h1>
            <p className="mt-1 text-sm text-stone-500">
              {submissions.length} response{submissions.length === 1 ? "" : "s"}
              {agentCount > 0 && <> · {agentCount} from agents</>}
            </p>
          </div>
          {submissions.length > 0 && (
            <a
              href={`/api/forms/${form.id}/responses/export?format=csv`}
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download CSV
            </a>
          )}
        </div>

        <ResponsesTable fields={formDef.fields} submissions={rows} />
      </main>
    </>
  );
}
