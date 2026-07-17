import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { NewFormButton } from "@/components/NewFormButton";
import { TopBar } from "@/components/TopBar";
import { FormCardMenu } from "@/components/dashboard/FormCardMenu";

// Render per-request rather than prerendering at build time: this page reads the database, which
// on a fresh deploy doesn't exist until `prisma migrate deploy` runs at server start.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const forms = await prisma.form.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { submissions: true, fields: true } } },
  });

  return (
    <>
      <TopBar
        userEmail={user.email}
        right={
          <div className="flex items-center gap-2">
            <Link
              href="/discover"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            >
              Discover
            </Link>
            <NewFormButton />
          </div>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Your forms</h1>
            <p className="mt-1 text-sm text-stone-500">
              {forms.length} form{forms.length === 1 ? "" : "s"} · agent-discoverable resources
            </p>
          </div>
        </div>

        {forms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white/50 py-24 text-center">
            <p className="text-stone-500">No forms yet.</p>
            <div className="mt-4 flex justify-center">
              <NewFormButton />
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <li
                key={form.id}
                className="group relative rounded-2xl border border-stone-200 bg-white transition hover:border-stone-300 hover:shadow-md"
              >
                <div
                  className="h-1.5 w-full rounded-t-2xl"
                  style={{ backgroundColor: form.accentColor }}
                />
                {/* Menu sits above the card Link (sibling, absolutely positioned) so its clicks
                    don't trigger navigation and we avoid nesting interactive elements. */}
                <div className="absolute right-3 top-4 z-10">
                  <FormCardMenu formId={form.id} title={form.title || "Untitled form"} />
                </div>
                <Link href={`/forms/${form.id}/edit`} className="block px-5 pb-4 pt-4">
                  <h2 className="line-clamp-2 min-h-[2.5rem] pr-8 text-base font-semibold text-stone-900">
                    {form.title || "Untitled form"}
                  </h2>
                  {form.category && (
                    <span className="mt-1 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                      {form.category}
                    </span>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <StatusBadge status={form.status} />
                    <span className="text-xs text-stone-400">
                      {form._count.submissions} response{form._count.submissions === 1 ? "" : "s"}
                    </span>
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-stone-100 px-5 py-2.5 text-xs text-stone-400">
                  <span>{form._count.fields} question{form._count.fields === 1 ? "" : "s"}</span>
                  <span>Updated {form.updatedAt.toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
