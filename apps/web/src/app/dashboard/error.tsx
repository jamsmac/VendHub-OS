"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

/** Hardcoded fallback strings — error boundaries must never depend on i18n */
const FALLBACK = {
  title: "An error occurred",
  description:
    "Something went wrong. Please try refreshing the page or go back to the dashboard.",
  dashboard: "Dashboard",
  retry: "Retry",
};

/** Safe translation access — returns fallback if i18n is unavailable */
function useSafeTranslations() {
  try {
    const { useTranslations } = require("next-intl");
    const t = useTranslations("common");
    return {
      title: t("errorOccurred"),
      description: t("errorDescription"),
      dashboard: t("goToDashboard"),
      retry: t("retry"),
    };
  } catch {
    return FALLBACK;
  }
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const strings = useSafeTranslations();

  useEffect(() => {
    // Log to error reporting service in production
    // e.g. Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{strings.title}</h2>
          <p className="text-muted-foreground mb-6">{strings.description}</p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                {strings.dashboard}
              </Link>
            </Button>
            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {strings.retry}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
