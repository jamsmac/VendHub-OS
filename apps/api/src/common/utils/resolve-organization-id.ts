/**
 * Resolve the effective organizationId for a request.
 * OWNER role can override with dto.organizationId; all other roles use their own.
 */
export function resolveOrganizationId(
  user: { role: string; organizationId: string },
  dtoOrganizationId?: string,
): string {
  if (user.role === "owner" && dtoOrganizationId) {
    return dtoOrganizationId;
  }
  return user.organizationId;
}
