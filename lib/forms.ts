import { prisma } from "@/lib/prisma";
import { parseConstraints, parseOptions, type FieldDef, type FormWithFields } from "@/lib/types";
import { isFieldType, type FieldType } from "@/lib/fieldTypes";
import { dedupeKey, slugify } from "@/lib/slug";

type FieldRow = {
  id: string;
  formId: string;
  order: number;
  key: string;
  type: string;
  label: string;
  guidance: string;
  required: boolean;
  options: string;
  constraints: string;
};

export function toFieldDef(row: FieldRow): FieldDef {
  return {
    id: row.id,
    key: row.key,
    order: row.order,
    type: isFieldType(row.type) ? row.type : "short_text",
    label: row.label,
    guidance: row.guidance,
    required: row.required,
    options: parseOptions(row.options),
    constraints: parseConstraints(row.constraints),
  };
}

export function toFormWithFields(row: {
  id: string;
  title: string;
  description: string;
  status: string;
  accentColor: string;
  agentContext: string;
  category: string;
  tags: string;
  resourceUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogSiteName: string;
  fields: FieldRow[];
}): FormWithFields {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    accentColor: row.accentColor,
    agentContext: row.agentContext,
    resource: {
      category: row.category,
      tags: parseOptions(row.tags),
      resourceUrl: row.resourceUrl,
      og: {
        title: row.ogTitle,
        description: row.ogDescription,
        image: row.ogImage,
        siteName: row.ogSiteName,
      },
    },
    fields: row.fields.map(toFieldDef).sort((a, b) => a.order - b.order),
  };
}

export type FieldInput = {
  id?: string;
  type: string;
  label: string;
  guidance?: string;
  required?: boolean;
  options?: string[];
  constraints?: Record<string, number | undefined>;
};

/**
 * Reconciles an incoming ordered list of field inputs against a form's existing fields:
 * new fields (no id) get a freshly slugified, deduped key; existing fields keep their key
 * even if the label changed, since the key is the stable contract with agent submissions.
 */
export async function replaceFormFields(formId: string, incoming: FieldInput[]) {
  const existing = await prisma.field.findMany({ where: { formId } });
  const existingById = new Map(existing.map((f) => [f.id, f]));
  const usedKeys = new Set(existing.map((f) => f.key));
  const keepIds = new Set<string>();

  const updates: ReturnType<typeof prisma.field.update>[] = [];
  const creates: ReturnType<typeof prisma.field.create>[] = [];

  incoming.forEach((f, index) => {
    const type: FieldType = isFieldType(f.type) ? f.type : "short_text";
    const options = JSON.stringify(f.options ?? []);
    const constraints = JSON.stringify(f.constraints ?? {});
    const current = f.id ? existingById.get(f.id) : undefined;

    if (current) {
      keepIds.add(current.id);
      updates.push(
        prisma.field.update({
          where: { id: current.id },
          data: {
            order: index,
            type,
            label: f.label,
            guidance: f.guidance ?? "",
            required: f.required ?? false,
            options,
            constraints,
          },
        })
      );
    } else {
      const base = slugify(f.label);
      const key = dedupeKey(base, usedKeys);
      usedKeys.add(key);
      creates.push(
        prisma.field.create({
          data: {
            formId,
            order: index,
            key,
            type,
            label: f.label,
            guidance: f.guidance ?? "",
            required: f.required ?? false,
            options,
            constraints,
          },
        })
      );
    }
  });

  const toDelete = existing.filter((f) => !keepIds.has(f.id)).map((f) => f.id);

  await prisma.$transaction([
    ...(toDelete.length ? [prisma.field.deleteMany({ where: { id: { in: toDelete } } })] : []),
    ...updates,
    ...creates,
  ]);
}
