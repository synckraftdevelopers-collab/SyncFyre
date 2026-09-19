import Link from "next/link";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

/**
 * Shared sortable-column-header pattern for server-rendered pages that
 * build a plain <table> (as opposed to the client-side @tanstack/react-table
 * setup used by components/members/members-register-table.tsx).
 *
 * Sorting here is URL-driven (?sort=<column>&dir=asc|desc) rather than
 * client state, so it works inside async Server Components with zero added
 * client JS: clicking a header is just a <Link> to the same page with a
 * different query string. Each page's data-fetching query reads
 * searchParams.sort / searchParams.dir and applies a matching
 * .order(dbColumn, { ascending }) — see readSort() below for the small
 * bit of shared parsing logic every page uses to do that safely.
 */

export type SortDir = "asc" | "desc";

/** Builds the href a column header should link to (toggles asc/desc, or
 * starts at "asc" the first time a different column is clicked). Every
 * other existing query param (filters, search, page, etc.) is preserved. */
export function sortHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  column: string,
  currentSort: string | undefined,
  currentDir: SortDir | undefined,
  paramNames: { sort: string; dir: string } = { sort: "sort", dir: "dir" },
): string {
  const nextDir: SortDir = currentSort === column && currentDir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && key !== paramNames.sort && key !== paramNames.dir) params.set(key, value);
  }
  params.set(paramNames.sort, column);
  params.set(paramNames.dir, nextDir);
  return `${basePath}?${params.toString()}`;
}

/** Reads a sort column + direction from a page's searchParams, restricted to
 * a known set of sortable column keys, so an unrecognized value never
 * reaches a raw .order() call. Returns sort: undefined when nothing valid
 * was requested, so callers can fall back to their existing default order.
 * `paramNames` lets a page that already uses `sort`/`dir` for something else
 * (e.g. the Subscriptions page's expired-view date toggle) pick different
 * query param names to avoid colliding with it. */
export function readSort<TColumn extends string>(
  sp: Record<string, string | undefined>,
  allowedColumns: readonly TColumn[],
  paramNames: { sort: string; dir: string } = { sort: "sort", dir: "dir" },
): { sort: TColumn | undefined; dir: SortDir } {
  const sort = allowedColumns.find((c) => c === sp[paramNames.sort]);
  const dir: SortDir = sp[paramNames.dir] === "desc" ? "desc" : "asc";
  return { sort, dir };
}

export function SortableTh({
  label,
  column,
  basePath,
  searchParams,
  currentSort,
  currentDir,
  align = "left",
  className,
  paramNames,
}: {
  label: string;
  column: string;
  basePath: string;
  searchParams: Record<string, string | undefined>;
  currentSort?: string;
  currentDir?: SortDir;
  align?: "left" | "right";
  className?: string;
  paramNames?: { sort: string; dir: string };
}) {
  const isActive = currentSort === column;
  const Icon = isActive ? (currentDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={
        className ??
        `px-4 py-3 font-medium text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`
      }
    >
      <Link
        href={sortHref(basePath, searchParams, column, currentSort, currentDir, paramNames)}
        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        <Icon className={`size-3.5 ${isActive ? "" : "opacity-40"}`} />
      </Link>
    </th>
  );
}
