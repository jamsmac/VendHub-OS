import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api-production-1e7b5.up.railway.app";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("vendhub_site_token")?.value;

  if (!token) {
    return NextResponse.json({ session: null });
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ session: null });
    }

    const json = await res.json();
    const user = json.data ?? json;

    return NextResponse.json({
      session: { user: { email: user.email ?? null, ...user } },
    });
  } catch {
    return NextResponse.json({ session: null });
  }
}
