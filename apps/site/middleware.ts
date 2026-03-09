import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || "vendhub.uz";
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || "admin.vendhub.uz";

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0];

  // Local development — skip domain routing, just handle locale
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return intlMiddleware(request);
  }

  const { pathname } = request.nextUrl;

  // Admin subdomain → force /admin paths
  if (hostname === ADMIN_DOMAIN) {
    if (
      !pathname.startsWith("/admin") &&
      !pathname.match(/^\/(ru|uz|en)\/admin/)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return intlMiddleware(request);
  }

  // Main site domain → block /admin paths
  if (hostname === SITE_DOMAIN || hostname === `www.${SITE_DOMAIN}`) {
    if (
      pathname.startsWith("/admin") ||
      pathname.match(/^\/(ru|uz|en)\/admin/)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return intlMiddleware(request);
  }

  // Unknown hosts — block admin paths by default
  if (pathname.startsWith("/admin") || pathname.match(/^\/(ru|uz|en)\/admin/)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|sitemap\\.xml|robots\\.txt|images/).*)",
  ],
};
