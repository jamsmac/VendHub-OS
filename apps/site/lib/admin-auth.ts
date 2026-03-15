/**
 * Site admin auth — graceful no-op.
 *
 * The site CMS admin reads static data via the supabase adapter (lib/supabase.ts).
 * Full admin operations (with auth) are in apps/web at the main dashboard.
 * If site CMS needs live auth, wire to POST /api/v1/auth/login.
 */

export async function getSession() {
  return null;
}

export async function signIn(_email: string, _password: string) {
  throw new Error(
    "Admin authentication is available at the main dashboard (apps/web).",
  );
}

export async function signOut() {
  // No-op
}
