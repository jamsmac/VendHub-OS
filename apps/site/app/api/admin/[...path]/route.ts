import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api-production-1e7b5.up.railway.app";

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = request.cookies.get("vendhub_site_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const apiPath = path.join("/");
  const url = new URL(`${API_BASE}/api/v1/${apiPath}`);

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = JSON.stringify(await request.json());
      headers["Content-Type"] = "application/json";
    } catch {
      // No body
    }
  }

  try {
    const res = await fetch(url.toString(), {
      method: request.method,
      headers,
      body,
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }

    return new NextResponse(await res.text(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "API proxy error" }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
