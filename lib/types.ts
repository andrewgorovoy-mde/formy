import type { FieldType } from "@/lib/fieldTypes";

export type Constraints = {
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
};

export type FieldDef = {
  id: string;
  key: string;
  order: number;
  type: FieldType;
  label: string;
  guidance: string;
  required: boolean;
  options: string[];
  constraints: Constraints;
};

export type ResourceMeta = {
  category: string;
  tags: string[];
  resourceUrl: string;
  og: {
    title: string;
    description: string;
    image: string;
    siteName: string;
  };
};

export type FormWithFields = {
  id: string;
  title: string;
  description: string;
  status: string;
  accentColor: string;
  agentContext: string;
  resource: ResourceMeta;
  fields: FieldDef[];
};

export function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function parseConstraints(raw: string): Constraints {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Constraints;
    return {};
  } catch {
    return {};
  }
}
