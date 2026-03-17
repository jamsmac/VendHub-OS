/**
 * Safely apply orderBy to a QueryBuilder — prevents SQL injection via sortBy.
 * Only allows whitelisted column names; falls back to default if input is invalid.
 */
import { SelectQueryBuilder, ObjectLiteral } from "typeorm";

export function safeOrderBy<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  sortBy: string | undefined,
  sortOrder: "ASC" | "DESC" | undefined,
  allowedColumns: readonly string[],
  defaultColumn = "createdAt",
  defaultOrder: "ASC" | "DESC" = "DESC",
): SelectQueryBuilder<T> {
  const column = allowedColumns.includes(sortBy ?? "")
    ? sortBy!
    : defaultColumn;
  const order =
    sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : defaultOrder;
  return qb.orderBy(`${alias}.${column}`, order);
}
