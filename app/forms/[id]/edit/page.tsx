import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormWithFields } from "@/lib/forms";
import { BuilderClient } from "@/components/builder/BuilderClient";

export const dynamic = "force-dynamic";

export default async function EditFormPage({
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

  return <BuilderClient form={toFormWithFields(form)} />;
}
