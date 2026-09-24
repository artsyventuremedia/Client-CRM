export interface ListQueryConfig {
  /** Prisma field names searched with a case-insensitive "contains" OR match. */
  searchFields: string[];
  /** Prisma field name to filter on (usually a status enum). */
  filterField?: string;
  /** Valid values for `filterField`; anything else in the querystring is ignored. */
  filterValues?: readonly string[];
  /** Map of sort key (used in `?sort=`) to Prisma field name. */
  sortFields: Record<string, string>;
  /** Sort key used when `?sort=` is absent or invalid. */
  defaultSort: string;
  /** Sort direction used when `?dir=` is absent or invalid. */
  defaultDir?: "asc" | "desc";
  pageSize?: number;
}

export interface ParsedListQuery {
  where: Record<string, unknown>;
  orderBy: Record<string, "asc" | "desc">;
  skip: number;
  take: number;
  page: number;
  pageSize: number;
  q: string;
  filter: string;
  sort: string;
  dir: "asc" | "desc";
}

export type SearchParamsLike = Record<string, string | string[] | undefined>;

function param(sp: SearchParamsLike, key: string): string {
  const v = sp[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export function parseListSearchParams(sp: SearchParamsLike, config: ListQueryConfig): ParsedListQuery {
  const q = param(sp, "q").trim();
  const filter = param(sp, "filter");
  const sortKey = param(sp, "sort") || config.defaultSort;
  const sort = config.sortFields[sortKey] ? sortKey : config.defaultSort;
  const dirParam = param(sp, "dir");
  const dir: "asc" | "desc" = dirParam === "asc" || dirParam === "desc" ? dirParam : (config.defaultDir ?? "desc");
  const page = Math.max(1, Number(param(sp, "page")) || 1);
  const pageSize = config.pageSize ?? 20;

  const where: Record<string, unknown> = {};
  if (q && config.searchFields.length > 0) {
    where.OR = config.searchFields.map((field) => ({ [field]: { contains: q, mode: "insensitive" as const } }));
  }
  if (config.filterField && filter && (config.filterValues?.includes(filter) ?? false)) {
    where[config.filterField] = filter;
  }

  return {
    where,
    orderBy: { [config.sortFields[sort]]: dir },
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize,
    q,
    filter,
    sort,
    dir,
  };
}
