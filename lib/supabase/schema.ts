type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
};

const SCHEMA_ERROR_CODES = new Set(["42703", "42P01", "PGRST200", "PGRST201", "PGRST204", "PGRST205"]);

export function isMissingSchemaError(error: SupabaseLikeError | null | undefined) {
  if (!error) return false;
  if (error.code && SCHEMA_ERROR_CODES.has(error.code)) return true;

  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("column") ||
    message.includes("relation") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("not exist")
  );
}
