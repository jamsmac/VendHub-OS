"use client";

import { useEffect } from "react";

/**
 * Global Error Boundary for Next.js App Router.
 *
 * This catches errors in the ROOT LAYOUT itself (providers, fonts, intl).
 * Unlike error.tsx, this MUST render its own <html>/<body> because
 * the root layout is unavailable when this component renders.
 *
 * IMPORTANT: Cannot use any providers (next-intl, theme, etc.) here
 * because they may be the source of the error.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("GlobalError boundary caught:", error);
    }

    // TODO: Send to error reporting service (Sentry, etc.)
    // reportError({ error, componentStack: error.digest });
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#f8fafc",
          color: "#1e293b",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "28rem",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            {/* Error icon */}
            <div
              style={{
                margin: "0 auto 1rem",
                display: "flex",
                width: "4rem",
                height: "4rem",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Произошла непредвиденная ошибка
            </h2>

            <p
              style={{
                color: "#64748b",
                marginBottom: "1.5rem",
                fontSize: "0.875rem",
                lineHeight: 1.5,
              }}
            >
              Приложение столкнулось с критической ошибкой. Попробуйте обновить
              страницу или вернуться на главную.
            </p>

            {/* Error digest for support */}
            {error.digest && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginBottom: "1rem",
                  fontFamily: "monospace",
                }}
              >
                Код ошибки: {error.digest}
              </p>
            )}

            {/* Dev-only error details */}
            {process.env.NODE_ENV === "development" && (
              <details
                style={{
                  marginBottom: "1.5rem",
                  textAlign: "left",
                  backgroundColor: "#fef2f2",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    color: "#dc2626",
                    fontWeight: 500,
                  }}
                >
                  Детали ошибки (dev)
                </summary>
                <pre
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.7rem",
                    color: "#991b1b",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                  }}
                >
                  {error.message}
                  {"\n\n"}
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <a
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.5rem 1rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  backgroundColor: "#ffffff",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                На главную
              </a>
              <button
                onClick={() => reset()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: "#2563eb",
                  cursor: "pointer",
                }}
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
