/**
 * Strip BaseEntity and sensitive fields from an update payload.
 * Prevents mass assignment of system-managed fields (id, timestamps, audit fields, organizationId).
 */

const PROTECTED_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "createdById",
  "updatedById",
  "organizationId",
]);

export function stripProtectedFields<T extends Record<string, unknown>>(
  data: T,
): Omit<
  T,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "createdById"
  | "updatedById"
  | "organizationId"
> {
  const result = { ...data };
  for (const field of PROTECTED_FIELDS) {
    delete result[field];
  }
  return result as Omit<
    T,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
    | "createdById"
    | "updatedById"
    | "organizationId"
  >;
}
