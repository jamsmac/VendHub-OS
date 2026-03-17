"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Route,
  ArrowLeft,
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Zap,
  Play,
  CheckCircle2,
  Edit,
  Ruler,
  Clock,
  Coffee,
  AlertTriangle,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { routesApi } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface _RouteDetail {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "inactive";
  totalDistanceKm?: number;
  estimatedDurationMinutes?: number;
  createdAt: string;
}

interface RouteStop {
  id: string;
  sequenceNumber: number;
  machine?: { id: string; name: string; address?: string };
  estimatedArrivalMinutes?: number;
  estimatedDurationMinutes?: number;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("routeDetail");
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [newStopMachineId, setNewStopMachineId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);

  const {
    data: route,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["routes", id],
    queryFn: () => routesApi.getById(id).then((res) => res.data),
  });

  const { data: stops } = useQuery({
    queryKey: ["routes", id, "stops"],
    queryFn: () => routesApi.getStops(id).then((res) => res.data),
    enabled: !!route,
  });

  const updateMutation = useMutation({
    mutationFn: (data: unknown) =>
      routesApi.update(id, data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", id] });
      setIsEditing(false);
      toast.success(t("toastRouteUpdated"));
    },
    onError: () => {
      toast.error(t("toastRouteUpdateError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => routesApi.delete(id),
    onSuccess: () => {
      toast.success(t("toastRouteDeleted"));
      router.push("/dashboard/routes");
    },
    onError: () => {
      toast.error(t("toastRouteDeleteError"));
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: () => routesApi.optimize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", id] });
      queryClient.invalidateQueries({ queryKey: ["routes", id, "stops"] });
      toast.success(t("toastRouteOptimized"));
    },
    onError: () => {
      toast.error(t("toastRouteOptimizeError"));
    },
  });

  const startMutation = useMutation({
    mutationFn: () => routesApi.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", id] });
      toast.success(t("toastRouteActivated"));
    },
    onError: () => {
      toast.error(t("toastRouteActivateError"));
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => routesApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", id] });
      toast.success(t("toastRouteCompleted"));
    },
    onError: () => {
      toast.error(t("toastRouteCompleteError"));
    },
  });

  const addStopMutation = useMutation({
    mutationFn: (data: unknown) =>
      routesApi.addStop(id, data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", id, "stops"] });
      setIsAddStopOpen(false);
      setNewStopMachineId("");
      toast.success(t("toastStopAdded"));
    },
    onError: () => {
      toast.error(t("toastStopAddError"));
    },
  });

  const removeStopMutation = useMutation({
    mutationFn: (stopId: string) => routesApi.removeStop(id, stopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", id, "stops"] });
      toast.success(t("toastStopRemoved"));
    },
    onError: () => {
      toast.error(t("toastStopRemoveError"));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (data: unknown) =>
      routesApi.reorderStops(id, data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", id, "stops"] });
      toast.success(t("toastOrderUpdated"));
    },
    onError: () => {
      toast.error(t("toastOrderUpdateError"));
    },
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadingError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadRouteError")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["routes", id] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Route className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">{t("routeNotFound")}</p>
        <Link href="/dashboard/routes">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToRoutes")}
          </Button>
        </Link>
      </div>
    );
  }

  const statusKey = route.status || "draft";
  const statusColorMap: Record<string, { color: string; bgColor: string }> = {
    draft: { color: "text-muted-foreground", bgColor: "bg-muted" },
    active: { color: "text-green-600", bgColor: "bg-green-100" },
    inactive: { color: "text-red-600", bgColor: "bg-red-100" },
  };
  const statusColors = statusColorMap[statusKey] || statusColorMap.draft;
  const stopList: RouteStop[] = Array.isArray(stops) ? stops : [];

  const handleMoveStop = (stopIndex: number, direction: "up" | "down") => {
    const newOrder = stopList.map((s) => s.id);
    const swapIndex = direction === "up" ? stopIndex - 1 : stopIndex + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[stopIndex], newOrder[swapIndex]] = [
      newOrder[swapIndex],
      newOrder[stopIndex],
    ];
    reorderMutation.mutate({ stopIds: newOrder });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/routes">
            <Button variant="ghost" size="sm" aria-label={t("backToRoutes")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-64"
                    aria-label={t("routeNameLabel")}
                  />
                  <Button
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ name: editName })}
                  >
                    {updateMutation.isPending ? t("saving") : t("save")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold">{route.name}</h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("editNameLabel")}
                    onClick={() => {
                      setEditName(route.name);
                      setIsEditing(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${statusColors.bgColor} ${statusColors.color}`}
              >
                {t(`status_${statusKey}`)}
              </span>
            </div>
            {route.description && (
              <p className="text-muted-foreground">{route.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {route.status === "draft" && (
            <Button
              variant="outline"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              <Play className="h-4 w-4 mr-2" />
              {startMutation.isPending ? t("activating") : t("activate")}
            </Button>
          )}
          {route.status === "active" && (
            <Button
              variant="outline"
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {completeMutation.isPending ? t("completing") : t("complete")}
            </Button>
          )}
          <Button
            variant="outline"
            disabled={optimizeMutation.isPending}
            onClick={() => optimizeMutation.mutate()}
          >
            <Zap className="h-4 w-4 mr-2" />
            {optimizeMutation.isPending ? t("optimizing") : t("optimize")}
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              setConfirmState({
                title: t("confirmDeleteRoute"),
                action: () => deleteMutation.mutate(),
              });
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteMutation.isPending ? t("deleting") : t("delete")}
          </Button>
        </div>
      </div>

      {/* Route Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("stopsCount")}
                </p>
                <p className="text-xl font-bold">{stopList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {route.totalDistanceKm != null && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("distance")}
                  </p>
                  <p className="text-xl font-bold">
                    {t("distanceValue", {
                      km: route.totalDistanceKm.toFixed(1),
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {route.estimatedDurationMinutes != null && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("time")}</p>
                  <p className="text-xl font-bold">
                    {t("timeValue", {
                      hours: Math.floor(route.estimatedDurationMinutes / 60),
                      minutes: route.estimatedDurationMinutes % 60,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stops */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("stops")}</CardTitle>
            <Dialog open={isAddStopOpen} onOpenChange={setIsAddStopOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addStop")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("addStop")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      {t("machineId")}
                    </label>
                    <Input
                      placeholder={t("machineIdPlaceholder")}
                      value={newStopMachineId}
                      onChange={(e) => setNewStopMachineId(e.target.value)}
                      aria-label={t("machineId")}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      addStopMutation.mutate({
                        machineId: newStopMachineId,
                        sequenceNumber: stopList.length + 1,
                      })
                    }
                    disabled={!newStopMachineId || addStopMutation.isPending}
                  >
                    {addStopMutation.isPending ? t("adding") : t("add")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {stopList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p>{t("noStops")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stopList.map((stop, index) => (
                <div
                  key={stop.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold shrink-0">
                    {stop.sequenceNumber || index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {stop.machine?.name ||
                          t("stopNumber", {
                            num: stop.sequenceNumber || index + 1,
                          })}
                      </span>
                    </div>
                    {stop.machine?.address && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {stop.machine?.address}
                      </p>
                    )}
                    {stop.estimatedArrivalMinutes != null && (
                      <p className="text-xs text-muted-foreground">
                        {t("estimatedMinutes", {
                          min: stop.estimatedArrivalMinutes,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("moveUp")}
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => handleMoveStop(index, "up")}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("moveDown")}
                      disabled={
                        index === stopList.length - 1 ||
                        reorderMutation.isPending
                      }
                      onClick={() => handleMoveStop(index, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("removeStop")}
                      className="text-destructive hover:text-destructive"
                      disabled={removeStopMutation.isPending}
                      onClick={() => {
                        setConfirmState({
                          title: t("confirmDeleteStop"),
                          action: () => removeStopMutation.mutate(stop.id),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
