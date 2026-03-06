/**
 * Swagger Auth Middleware
 *
 * Protects Swagger UI (/docs) in production — only users with "owner" role
 * can access the API documentation.
 *
 * Flow:
 * 1. Check for `swagger_session` cookie on the API domain
 * 2. If missing, check for `?token=xxx` query parameter
 * 3. Verify JWT, ensure role === "owner"
 * 4. Set `swagger_session` cookie so subsequent requests don't need the query param
 * 5. Redirect to /docs (strip the token from URL)
 *
 * The admin panel links to: `${API_URL}/docs/auth?token=${accessToken}`
 * which validates and redirects to /docs with a session cookie.
 */

import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { Logger } from "@nestjs/common";

const logger = new Logger("SwaggerAuth");

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  sessionId?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Creates Express middleware that protects Swagger routes.
 * Must be applied BEFORE SwaggerModule.setup().
 */
export function createSwaggerAuthMiddleware(jwtSecret: string, cookieSecret?: string) {
  const COOKIE_NAME = "swagger_session";
  const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours

  return (req: Request, res: Response, next: NextFunction) => {
    // ── 1. Auth endpoint: /docs/auth?token=xxx ──────────────────
    // This is the entry point from the admin panel.
    if (req.path === "/docs/auth") {
      const token = req.query.token as string | undefined;
      if (!token) {
        return res.status(401).json({
          statusCode: 401,
          message: "Token required. Access Swagger from the admin panel.",
        });
      }

      const payload = verifyOwnerToken(token, jwtSecret);
      if (!payload) {
        return res.status(403).json({
          statusCode: 403,
          message: "Access denied. Only owners can view API documentation.",
        });
      }

      // Set session cookie on the API domain
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: COOKIE_MAX_AGE * 1000, // ms
        path: "/docs",
      });

      logger.log(`✅ Swagger access granted to owner: ${payload.email}`);

      // Redirect to /docs (clean URL without token)
      return res.redirect("/docs");
    }

    // ── 2. Check session cookie for all /docs/* requests ────────
    const sessionToken = req.cookies?.[COOKIE_NAME];
    if (sessionToken) {
      const payload = verifyOwnerToken(sessionToken, jwtSecret);
      if (payload) {
        return next(); // Valid session — allow access
      }
      // Expired or invalid cookie — clear it
      res.clearCookie(COOKIE_NAME, { path: "/docs" });
    }

    // ── 3. Check Authorization header (for programmatic access) ─
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = verifyOwnerToken(token, jwtSecret);
      if (payload) {
        return next();
      }
    }

    // ── 4. Check query parameter (fallback) ─────────────────────
    const queryToken = req.query.token as string | undefined;
    if (queryToken) {
      const payload = verifyOwnerToken(queryToken, jwtSecret);
      if (payload) {
        // Set cookie for future requests and redirect to clean URL
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie(COOKIE_NAME, queryToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          maxAge: COOKIE_MAX_AGE * 1000,
          path: "/docs",
        });
        return res.redirect(req.path);
      }
    }

    // ── 5. Unauthorized — return helpful error page ─────────────
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VendHub API Docs — Access Denied</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #1a1a2e;
              color: #e0e0e0;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 { color: #e94560; font-size: 1.5rem; }
            p { color: #a0a0b0; margin: 0.5rem 0; }
            a {
              display: inline-block;
              margin-top: 1.5rem;
              padding: 0.75rem 2rem;
              background: #e94560;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
            }
            a:hover { background: #c73a52; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔒 Доступ ограничен</h1>
            <p>API документация доступна только для владельцев (owner).</p>
            <p>Войдите через админ-панель VendHub.</p>
            <a href="${process.env.FRONTEND_URL || "https://admin.vendhub.uz"}/dashboard">
              Перейти в админ-панель
            </a>
          </div>
        </body>
      </html>
    `);
  };
}

/**
 * Verifies JWT token and checks that the user has "owner" role.
 * Returns the payload if valid, null otherwise.
 */
function verifyOwnerToken(token: string, secret: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, secret) as JwtPayload;

    if (payload.role !== "owner") {
      logger.warn(
        `⛔ Swagger access denied: role="${payload.role}" email="${payload.email}"`,
      );
      return null;
    }

    return payload;
  } catch (error) {
    // Token expired or invalid — silent fail
    return null;
  }
}
