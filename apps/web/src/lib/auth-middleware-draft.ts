import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side middleware for auth protection.
 * Redirects unauthenticated users away from /dashboard routes.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/auth", "/auth/reset-password", "/auth/verify"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // Static assets and API routes — skip
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for auth token in httpOnly cookie (set by backend) or Authorization header
  const accessToken =
    request.cookies.get("vendhub_access_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  const hasToken = !!accessToken;

  // Unauthenticated users trying to access protected routes
  if (!hasToken && !isPublicPath && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users trying to access auth pages — redirect to dashboard
  if (hasToken && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set("X-Request-Id", crypto.randomUUID());

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
