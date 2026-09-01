export type ResolverSource = "branch" | "tenant" | "legacy" | "default";

export type ResolverLayer<T> = {
  value: T;
  source: ResolverSource;
};

export function resolveConfigValue<T>(input: {
  branch?: T | null;
  tenant?: T | null;
  legacy?: T | null;
  canonical?: T | null;
  defaultValue: T;
}) {
  if (input.branch != null) return { value: input.branch, source: "branch" as const };
  if (input.tenant != null) return { value: input.tenant, source: "tenant" as const };
  if (input.legacy != null) return { value: input.legacy, source: "legacy" as const };
  if (input.canonical != null) return { value: input.canonical, source: "legacy" as const };
  return { value: input.defaultValue, source: "default" as const };
}

export function preferBranchThenGlobal<T>(input: { branch?: T | null; global?: T | null }) {
  if (input.branch != null) return input.branch;
  if (input.global != null) return input.global;
  return null;
}
