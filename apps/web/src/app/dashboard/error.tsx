'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          <h2 className="text-xl font-semibold mb-2">Произошла ошибка</h2>
          <p className="text-muted-foreground mb-6">
            Что-то пошло не так при загрузке страницы. Попробуйте обновить или вернуться на главную.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                На главную
              </Link>
            </Button>
            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Повторить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
