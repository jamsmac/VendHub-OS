import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api-production-1e7b5.up.railway.app";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || "Login failed" },
        { status: res.status },
      );
    }

    // The API returns { data: { accessToken, refreshToken, user } }
    const data = json.data ?? json;
    const { accessToken, refreshToken, user } = data;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No token in response" },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ user });

    response.cookies.set("vendhub_site_token", accessToken, COOKIE_OPTS);
    if (refreshToken) {
      response.cookies.set("vendhub_site_refresh", refreshToken, {
        ...COOKIE_OPTS,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
