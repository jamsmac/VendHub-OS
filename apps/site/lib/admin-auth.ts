/**
 * Site admin auth — delegates to VendHub API via Next.js proxy routes.
 */

export interface AdminSession {
  user: { email: string | null; id?: string; role?: string };
}

export async function getSession(): Promise<AdminSession | null> {
  try {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return null;
    const json = await res.json();
    return json.session ?? null;
  } catch {
    return null;
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: Record<string, unknown> }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(json.error ?? "Login failed");
  }

  return res.json();
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
