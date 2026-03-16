"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { TrendingUp, Route, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface TripAnalytics {
  totalTrips: number;
  totalDistance: number;
  totalDuration: number;
  avgStopsPerTrip: number;
  avgDistancePerTrip: number;
  anomaliesCount: number;
  topDrivers?: Array<{
    name: string;
    tripsCount: number;
    totalDistance: number;
  }>;
  topRoutes?: Array<{
    name: string;
    tripsCount: number;
    avgDuration: number;
  }>;
}

export default function TripAnalyticsPage() {
  const t = useTranslations("tripAnalytics");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["trip-analytics"],
    queryFn: async () => {
      const res = await api.get("/trip-analytics/summary");
      return (res.data ?? {}) as TripAnalytics;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalTrips") || "Total Trips"}
                </p>
                <p className="text-2xl font-bold">
                  {analytics?.totalTrips ?? "—"}
                </p>
              </div>
              <Route className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalDistance") || "Total Distance"}
                </p>
                <p className="text-2xl font-bold">
                  {analytics?.totalDistance
                    ? `${(analytics.totalDistance / 1000).toFixed(0)} km`
                    : "—"}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("avgStops") || "Avg Stops/Trip"}
                </p>
                <p className="text-2xl font-bold">
                  {analytics?.avgStopsPerTrip?.toFixed(1) ?? "—"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("anomalies") || "Anomalies"}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics?.anomaliesCount ?? "—"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("topDrivers") || "Top Drivers"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.topDrivers?.length ? (
              <div className="space-y-3">
                {analytics.topDrivers.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {i + 1}. {d.name}
                    </span>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">
                        {d.tripsCount} trips
                      </span>
                      <span className="font-medium">
                        {(d.totalDistance / 1000).toFixed(0)} km
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                {t("noData") || "No data"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("topRoutes") || "Top Routes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.topRoutes?.length ? (
              <div className="space-y-3">
                {analytics.topRoutes.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {i + 1}. {r.name}
                    </span>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">
                        {r.tripsCount} trips
                      </span>
                      <span className="font-medium">
                        {r.avgDuration} min avg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                {t("noData") || "No data"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
