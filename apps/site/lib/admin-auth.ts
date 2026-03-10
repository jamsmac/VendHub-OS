/**
 * Admin auth for site app.
 * TODO: Migrate to VendHub API JWT auth (POST /api/v1/auth/login)
 * For now, returns null session to gracefully degrade admin features.
 */

export async function getSession() {
  // Supabase auth removed — return null until VendHub API auth is integrated
  return null;
}

export async function signIn(_email: string, _password: string) {
  throw new Error(
    "Admin auth is being migrated to VendHub API. " +
      "Please use the admin panel at /admin instead.",
  );
}

export async function signOut() {
  // No-op — session is already null
}
