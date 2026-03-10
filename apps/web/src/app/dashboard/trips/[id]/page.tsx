"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Square,
  ClipboardList,
  Car,
  Ruler,
  Timer,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tripsApi } from "@/lib/api";
import Link from "next/link";
import { formatTime, formatDateTime } from "@/lib/utils";

interface _TripDetail {
  id: string;
  status: "planned" | "active" | "completed" | "cancelled";
  taskType?: string;
  employee?: { id: string; firstName: string; lastName?: string };
  vehicle?: { id: string; licensePlate?: string; model?: string };
  route?: { id: string; name: string };
  startedAt?: string;
  endedAt?: string;
  distanceKm?: number;
  durationMinutes?: number;
  startOdometer?: number;
  endOdometer?: number;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
}

interface TripStop {
  id: string;
  sequenceNumber: number;
  status: "pending" | "arrived" | "completed" | "skipped";
  machine?: { id: string; name: string; address?: string };
  arrivedAt?: string;
  departedAt?: string;
}

interface TripAnomaly {
  id: string;
  type: "route_deviation" | "long_stop" | "missed_stop" | "speed_violation";
  severity: "low" | "medium" | "high";
  description?: string;
  resolved: boolean;
  resolvedAt?: string;
  detectedAt: string;
}

interface TripTask {
  id: string;
  task?: { id: string; taskNumber: string; taskType: string; status: string };
  completedAt?: string;
  notes?: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-96" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const t = useTranslations("tripDetail");

  const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string }
  > = {
    planned: {
      label: t("status_planned"),
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    active: {
      label: t("status_active"),
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    completed: {
      label: t("status_completed"),
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    cancelled: {
      label: t("status_cancelled"),
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  };

  const stopStatusConfig: Record<
    string,
    { label: string; color: string; bgColor: string }
  > = {
    pending: {
      label: t("stopStatus_pending"),
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    arrived: {
      label: t("stopStatus_arrived"),
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    completed: {
      label: t("stopStatus_completed"),
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    skipped: {
      label: t("stopStatus_skipped"),
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  };

  const anomalyTypeConfig: Record<string, string> = {
    route_deviation: t("anomaly_route_deviation"),
    long_stop: t("anomaly_long_stop"),
    missed_stop: t("anomaly_missed_stop"),
    speed_violation: t("anomaly_speed_violation"),
  };

  const severityConfig: Record<
    string,
    { label: string; color: string; bgColor: string }
  > = {
    low: {
      label: t("severity_low"),
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    medium: {
      label: t("severity_medium"),
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    high: {
      label: t("severity_high"),
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  };

  const {
    data: trip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["trips", id],
    queryFn: () => tripsApi.getById(id).then((res) => res.data),
  });

  const { data: stops } = useQuery({
    queryKey: ["trips", id, "stops"],
    queryFn: () => tripsApi.getStops(id).then((res) => res.data),
    enabled: !!trip,
  });

  const { data: anomalies } = useQuery({
    queryKey: ["trips", id, "anomalies"],
    queryFn: () => tripsApi.getAnomalies(id).then((res) => res.data),
    enabled: !!trip,
  });

  const { data: tasks } = useQuery({
    queryKey: ["trips", id, "tasks"],
    queryFn: () => tripsApi.getTasks(id).then((res) => res.data),
    enabled: !!trip,
  });

  const endMutation = useMutation({
    mutationFn: () => tripsApi.end(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", id] });
      toast.success(t("toast_tripEnded"));
    },
    onError: () => toast.error(t("toast_endError")),
  });

  const cancelMutation = useMutation({
    mutationFn: () => tripsApi.cancel(id, { reason: t("cancelledByAdmin") }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", id] });
      toast.success(t("toast_tripCancelled"));
    },
    onError: () => toast.error(t("toast_cancelError")),
  });

  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadTripError")}</p>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["trips", id] })
            }
          >
            {t("retry")}
          </Button>
          <Link href="/dashboard/trips">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToTrips")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">{t("tripNotFound")}</p>
        <Link href="/dashboard/trips">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToTrips")}
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[trip.status] || statusConfig.planned;
  const stopList: TripStop[] = Array.isArray(stops) ? stops : [];
  const anomalyList: TripAnomaly[] = Array.isArray(anomalies) ? anomalies : [];
  const taskList: TripTask[] = Array.isArray(tasks) ? tasks : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/trips">
            <Button variant="ghost" size="sm" aria-label={t("backToTrips")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{t("title")}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}
              >
                {status.label}
              </span>
            </div>
            <p className="text-muted-foreground">
              {trip.employee
                ? `${trip.employee.firstName} ${trip.employee.lastName || ""}`
                : t("noDriver")}
              {trip.route ? ` — ${trip.route.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {trip.status === "active" && (
            <>
              <Button
                variant="outline"
                disabled={endMutation.isPending}
                onClick={() =>
                  setConfirmState({
                    title: t("confirmEnd"),
                    action: () => endMutation.mutate(),
                  })
                }
              >
                <Square className="h-4 w-4 mr-2" />
                {endMutation.isPending ? t("ending") : t("end")}
              </Button>
              <Button
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() =>
                  setConfirmState({
                    title: t("confirmCancel"),
                    action: () => cancelMutation.mutate(),
                  })
                }
              >
                <XCircle className="h-4 w-4 mr-2" />
                {cancelMutation.isPending ? t("cancelling") : t("cancel")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t("tabInfo")}</TabsTrigger>
          <TabsTrigger value="stops">
            {t("tabStops", { count: stopList.length })}
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            {t("tabAnomalies", { count: anomalyList.length })}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            {t("tabTasks", { count: taskList.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("mainInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("driver")}
                  </span>
                  <span className="text-sm font-medium">
                    {trip.employee
                      ? `${trip.employee.firstName} ${trip.employee.lastName || ""}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("route")}
                  </span>
                  <span className="text-sm font-medium">
                    {trip.route?.name || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("vehicle")}
                  </span>
                  <span className="text-sm font-medium">
                    {trip.vehicle
                      ? `${trip.vehicle.model || ""} ${trip.vehicle.licensePlate || ""}`.trim()
                      : "—"}
                  </span>
                </div>
                {trip.taskType && (
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t("type")}
                    </span>
                    <span className="text-sm font-medium">{trip.taskType}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("timeAndDistance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("startTime")}
                  </span>
                  <span className="text-sm font-medium">
                    {trip.startedAt ? formatDateTime(trip.startedAt) : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("endTime")}
                  </span>
                  <span className="text-sm font-medium">
                    {trip.endedAt ? formatDateTime(trip.endedAt) : "—"}
                  </span>
                </div>
                {trip.distanceKm != null && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t("distance")}
                    </span>
                    <span className="text-sm font-medium">
                      {t("distanceKm", { value: trip.distanceKm.toFixed(1) })}
                    </span>
                  </div>
                )}
                {trip.durationMinutes != null && (
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t("duration")}
                    </span>
                    <span className="text-sm font-medium">
                      {t("durationValue", {
                        hours: Math.floor(trip.durationMinutes / 60),
                        minutes: trip.durationMinutes % 60,
                      })}
                    </span>
                  </div>
                )}
                {trip.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      {t("notes")}
                    </p>
                    <p className="text-sm">{trip.notes}</p>
                  </div>
                )}
                {trip.cancelReason && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-red-500">{t("cancelReason")}</p>
                    <p className="text-sm">{trip.cancelReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stops" className="space-y-4">
          {stopList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("noStops")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {stopList.map((stop, index) => {
                const ss =
                  stopStatusConfig[stop.status] || stopStatusConfig.pending;
                return (
                  <Card key={stop.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                          {stop.sequenceNumber || index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {stop.machine?.name ||
                                t("stopN", {
                                  n: stop.sequenceNumber || index + 1,
                                })}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${ss.bgColor} ${ss.color}`}
                            >
                              {ss.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            {stop.machine?.address && (
                              <span>{stop.machine.address}</span>
                            )}
                            {stop.arrivedAt && (
                              <span>
                                {t("arrival")} {formatTime(stop.arrivedAt)}
                              </span>
                            )}
                            {stop.departedAt && (
                              <span>
                                {t("departure")} {formatTime(stop.departedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          {anomalyList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">{t("noAnomalies")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {anomalyList.map((anomaly) => {
                const sev =
                  severityConfig[anomaly.severity] || severityConfig.low;
                return (
                  <Card
                    key={anomaly.id}
                    className={anomaly.resolved ? "opacity-60" : ""}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle
                          className={`h-5 w-5 ${anomaly.resolved ? "text-muted-foreground" : "text-red-500"}`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {anomalyTypeConfig[anomaly.type] || anomaly.type}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${sev.bgColor} ${sev.color}`}
                            >
                              {sev.label}
                            </span>
                            {anomaly.resolved && (
                              <Badge
                                variant="outline"
                                className="text-green-600"
                              >
                                {t("resolved")}
                              </Badge>
                            )}
                          </div>
                          {anomaly.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {anomaly.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(anomaly.detectedAt).toLocaleString(
                              "ru-RU",
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {taskList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("noTasks")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {taskList.map((tripTask) => (
                <Card key={tripTask.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">
                            {tripTask.task
                              ? `#${tripTask.task.taskNumber} — ${tripTask.task.taskType}`
                              : t("task")}
                          </span>
                          {tripTask.task && (
                            <p className="text-sm text-muted-foreground">
                              {t("taskStatus")} {tripTask.task.status}
                            </p>
                          )}
                        </div>
                      </div>
                      {tripTask.completedAt ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t("taskCompleted")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          {t("taskPending")}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title ?? ""}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
