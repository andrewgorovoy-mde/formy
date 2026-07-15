import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { NewFormButton } from "@/components/NewFormButton";

export default async function DashboardPage() {
  const forms = await prisma.form.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your forms</h1>
        <NewFormButton />
      </div>

      {forms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-200 py-20 text-center text-stone-500">
          No forms yet. Create your first one.
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {forms.map((form) => (
            <li key={form.id}>
              <Link
                href={`/forms/${form.id}/edit`}
                className="flex items-center gap-4 -mx-3 rounded-lg px-3 py-5 transition hover:bg-stone-50"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: form.accentColor }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-stone-900">{form.title}</p>
                  <p className="text-sm text-stone-500">
                    {form._count.submissions} response{form._count.submissions === 1 ? "" : "s"} ·
                    Updated {form.updatedAt.toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={form.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
