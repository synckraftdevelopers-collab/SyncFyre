import { isMissingSchemaError } from "./schema";

type SelectResult<T> = {
  data: T | null;
  error: { code?: string | null; message?: string | null } | null;
};

/**
 * Runs a Supabase read with the most complete column list first. If a
 * migration adding a new column hasn't been applied to this database yet,
 * Postgres/PostgREST reports it as a "column does not exist" / schema-cache
 * error — this retries with a narrower column list instead of letting that
 * take down the whole query. Used so a pending migration degrades a feature
 * (e.g. plans render without their plan_type) instead of breaking something
 * as basic as "list the active membership plans".
 *
 * `columnVariants` must be ordered from most to least complete.
 */
export async function selectWithSchemaFallback<T>(
  select: (columns: string) => PromiseLike<SelectResult<T>>,
  columnVariants: readonly string[],
): Promise<SelectResult<T>> {
  let lastResult = await select(columnVariants[0]);
  if (!lastResult.error || !isMissingSchemaError(lastResult.error)) return lastResult;

  for (let index = 1; index < columnVariants.length; index += 1) {
    const result = await select(columnVariants[index]);
    if (!result.error || !isMissingSchemaError(result.error)) return result;
    lastResult = result;
  }

  return lastResult;
}
