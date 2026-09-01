import { COMMUNICATION_TEMPLATE_DEFAULTS } from "@/lib/config/defaults";
import type { CommunicationChannel } from "@/lib/config/schema";

const TEMPLATE_VARIABLE_ALLOWLIST = {
  membership_expiry: ["member_name", "membership_plan", "expiry_date", "gym_name"],
  payment_pending: ["member_name", "pending_amount", "gym_name"],
  payment_received: ["member_name", "amount", "payment_date", "payment_mode", "gym_name"],
  daily_closing: ["gym_name", "branch_name", "closing_date"],
} as const;

export type TemplateKey = keyof typeof TEMPLATE_VARIABLE_ALLOWLIST;

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/g;

export function getSupportedTemplateKeys(): TemplateKey[] {
  return Object.keys(TEMPLATE_VARIABLE_ALLOWLIST) as TemplateKey[];
}

export function getAllowedTemplateVariables(templateKey: string): string[] {
  return [...(TEMPLATE_VARIABLE_ALLOWLIST[templateKey as TemplateKey] ?? [])];
}

export function getDefaultTemplateVariables(templateKey: string, channel: CommunicationChannel): string[] {
  const defaults = (COMMUNICATION_TEMPLATE_DEFAULTS as Record<string, Record<string, { variables: readonly string[] } | undefined>>)[templateKey]?.[channel];
  return defaults ? [...defaults.variables] : [];
}

export function extractTemplatePlaceholders(content: string): string[] {
  const matches = content.matchAll(PLACEHOLDER_PATTERN);
  return Array.from(new Set(Array.from(matches, (match) => match[1])));
}

export function validateTemplateVariables(input: {
  templateKey: string;
  declaredVariables: string[];
  content: string;
}) {
  const allowed = new Set(getAllowedTemplateVariables(input.templateKey));
  if (!allowed.size) {
    return { valid: false as const, error: "Unknown template key." };
  }

  const declared = Array.from(new Set(input.declaredVariables.map((value) => value.trim()).filter(Boolean)));
  const placeholders = extractTemplatePlaceholders(input.content);

  const invalidDeclared = declared.filter((value) => !allowed.has(value));
  if (invalidDeclared.length) {
    return { valid: false as const, error: `Unsupported template variables: ${invalidDeclared.join(", ")}` };
  }

  const invalidPlaceholders = placeholders.filter((value) => !allowed.has(value));
  if (invalidPlaceholders.length) {
    return { valid: false as const, error: `Unsupported placeholders in content: ${invalidPlaceholders.join(", ")}` };
  }

  const undeclaredPlaceholders = placeholders.filter((value) => !declared.includes(value));
  if (undeclaredPlaceholders.length) {
    return { valid: false as const, error: `Add these placeholders to the variables list: ${undeclaredPlaceholders.join(", ")}` };
  }

  return {
    valid: true as const,
    variables: declared,
    placeholders,
    allowed: [...allowed],
  };
}
