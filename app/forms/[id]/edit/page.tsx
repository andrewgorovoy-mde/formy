import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { getCurrentUser } from "@/lib/auth";
import { BuilderClient } from "@/components/builder/BuilderClient";

export const dynamic = "force-dynamic";

export default async function EditFormPage({
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

  return <BuilderClient form={toFormWithFields(form)} />;
}
