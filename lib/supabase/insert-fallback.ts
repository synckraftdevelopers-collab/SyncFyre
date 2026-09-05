import { isMissingSchemaError } from "./schema";

type InsertResult<T> = {
  data: T | null;
  error: { code?: string | null; message?: string | null } | null;
};

function omitKeys(payload: Record<string, unknown>, keys: readonly string[]) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!keys.includes(key)) next[key] = value;
  }
  return next;
}

export async function insertWithSchemaFallback<T>(
  insert: (payload: Record<string, unknown>) => unknown,
  payload: Record<string, unknown>,
  fallbackKeySets: readonly (readonly string[])[] = [],
): Promise<InsertResult<T>> {
  const variants: Record<string, unknown>[] = [payload];
  let current = payload;

  for (const keys of fallbackKeySets) {
    current = omitKeys(current, keys);
    variants.push(current);
  }

  let lastResult = (await insert(variants[0])) as InsertResult<T>;
  if (!lastResult.error || !isMissingSchemaError(lastResult.error)) return lastResult;

  for (let index = 1; index < variants.length; index += 1) {
    const result = (await insert(variants[index])) as InsertResult<T>;
    if (!result.error || !isMissingSchemaError(result.error)) return result;
    lastResult = result;
  }

  return lastResult;
}
