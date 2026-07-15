import type { FormWithFields } from "@/lib/types";

export function buildAgenticSchema(form: FormWithFields, appUrl: string) {
  return {
    protocol: "agentic-form/v1",
    form: {
      id: form.id,
      title: form.title,
      description: form.description,
      // Form-level guidance an agent should apply across every answer (tone, approach, what the
      // reviewer values). Distinct from a field's per-question `guidance`. Omitted when empty.
      ...(form.agentContext ? { agent_context: form.agentContext } : {}),
      // Resource/registry metadata: what this form is about and where it lives, so an agent that
      // found it via search knows its category, topic tags, and canonical link.
      ...(form.resource.category ? { category: form.resource.category } : {}),
      ...(form.resource.tags.length ? { tags: form.resource.tags } : {}),
      ...(form.resource.resourceUrl
        ? {
            resource: {
              url: form.resource.resourceUrl,
              ...(form.resource.og.title ? { title: form.resource.og.title } : {}),
              ...(form.resource.og.description
                ? { description: form.resource.og.description }
                : {}),
              ...(form.resource.og.siteName ? { site_name: form.resource.og.siteName } : {}),
            },
          }
        : {}),
      fields: form.fields
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((f) => {
          const field: Record<string, unknown> = {
            id: f.key,
            type: f.type,
            label: f.label,
            required: f.required,
          };
          if (f.guidance) field.guidance = f.guidance;
          if (f.type === "select" || f.type === "multi_select") {
            field.options = f.options;
          }
          const constraintEntries = Object.entries(f.constraints).filter(
            ([, v]) => v !== undefined && v !== null
          );
          if (constraintEntries.length > 0) {
            field.constraints = Object.fromEntries(constraintEntries);
          }
          return field;
        }),
    },
    submit: {
      url: `${appUrl}/api/forms/${form.id}/submissions`,
      method: "POST",
      content_type: "application/json",
    },
  };
}
