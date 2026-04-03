/**
 * Admin API client for site CMS.
 *
 * All calls go through the Next.js proxy at /api/admin/...
 * which attaches the JWT cookie as a Bearer token.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

async function adminFetch<T = Json>(
  path: string,
  opts?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`/api/admin/${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...opts?.headers,
      },
    });

    if (res.status === 401) {
      // Session expired — redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
      return { data: null, error: "Unauthorized" };
    }

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: json.message ?? json.error ?? "Request failed",
      };
    }

    // TransformInterceptor wraps in { success, data, timestamp }
    const payload = json.data ?? json;
    return { data: payload as T, error: null };
  } catch {
    return { data: null, error: "Network error" };
  }
}

// ─── Collection-based helpers ──────────────────────────────────────────

/** List all items in a site CMS collection */
export async function cmsGetAll<T = Json>(collection: string) {
  return adminFetch<T[]>(`site-cms/${collection}`);
}

/** Count items in a site CMS collection */
export async function cmsCount(collection: string, isActive?: boolean) {
  const params = isActive !== undefined ? `?isActive=${isActive}` : "";
  return adminFetch<{ count: number }>(`site-cms/${collection}/count${params}`);
}

/** Get a single site CMS item by ID */
export async function cmsGetById<T = Json>(collection: string, id: string) {
  return adminFetch<T>(`site-cms/${collection}/${id}`);
}

/** Create a site CMS item */
export async function cmsCreate<T = Json>(collection: string, payload: Json) {
  return adminFetch<T>(`site-cms/${collection}`, {
    method: "POST",
    body: JSON.stringify({
      data: payload,
      sortOrder: payload.sort_order ?? 0,
      isActive: payload.is_active ?? true,
    }),
  });
}

/** Update a site CMS item (merges data) */
export async function cmsUpdate<T = Json>(
  collection: string,
  id: string,
  payload: Json,
) {
  return adminFetch<T>(`site-cms/${collection}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: payload,
      sortOrder: payload.sort_order,
      isActive: payload.is_active,
    }),
  });
}

/** Soft-delete a site CMS item */
export async function cmsDelete(collection: string, id: string) {
  return adminFetch(`site-cms/${collection}/${id}`, {
    method: "DELETE",
  });
}
