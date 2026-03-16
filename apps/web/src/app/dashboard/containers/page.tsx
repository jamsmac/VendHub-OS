"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Box, Search, Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { containersApi } from "@/lib/api";

interface Container {
  id: string;
  name: string;
  containerNumber: string;
  type: string;
  status: "active" | "empty" | "maintenance" | "disabled";
  currentLevel?: number;
  maxCapacity?: number;
  productName?: string;
  machine?: {
    id: string;
    name: string;
    machineNumber: string;
  };
  lastRefillAt?: string;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; bgColor: string }> = {
  active: { color: "text-green-600", bgColor: "bg-green-100" },
  empty: { color: "text-red-600", bgColor: "bg-red-100" },
  maintenance: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  disabled: { color: "text-gray-600", bgColor: "bg-gray-100" },
};

export default function ContainersPage() {
  const t = useTranslations("containers");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: containers, isLoading } = useQuery({
    queryKey: ["containers", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await containersApi.getAll(params);
      return (res.data?.data ||
        res.data?.items ||
        res.data ||
        []) as Container[];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    if (!containers) return [];
    if (!search) return containers;
    const q = search.toLowerCase();
    return containers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.containerNumber?.toLowerCase().includes(q) ||
        c.machine?.name?.toLowerCase().includes(q) ||
        c.productName?.toLowerCase().includes(q),
    );
  }, [containers, search]);

  const statusCounts = useMemo(() => {
    if (!containers) return { active: 0, empty: 0, maintenance: 0, total: 0 };
    return {
      active: containers.filter((c) => c.status === "active").length,
      empty: containers.filter((c) => c.status === "empty").length,
      maintenance: containers.filter((c) => c.status === "maintenance").length,
      total: containers.length,
    };
  }, [containers]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{statusCounts.total}</p>
            <p className="text-sm text-muted-foreground">
              {t("total") || "Total"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {statusCounts.active}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("active") || "Active"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-600">
              {statusCounts.empty}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("empty") || "Empty"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {statusCounts.maintenance}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("maintenance") || "Maintenance"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search") || "Search..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "active", "empty", "maintenance"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? tCommon("all") || "All" : s}
            </Button>
          ))}
        </div>
      </div>

      {/* Container List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Box className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{t("noContainers") || "No containers found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((container) => {
            const config =
              statusConfig[container.status] ?? statusConfig.active;
            const fillPercent =
              container.maxCapacity && container.currentLevel
                ? Math.round(
                    (container.currentLevel / container.maxCapacity) * 100,
                  )
                : null;

            return (
              <Card
                key={container.id}
                className="hover:shadow-sm transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{container.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {container.containerNumber}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}
                    >
                      {container.status}
                    </span>
                  </div>

                  {container.productName && (
                    <p className="text-sm mb-2">
                      <Coffee className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      {container.productName}
                    </p>
                  )}

                  {container.machine && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {container.machine.machineNumber} —{" "}
                      {container.machine.name}
                    </p>
                  )}

                  {fillPercent != null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{t("level") || "Level"}</span>
                        <span>{fillPercent}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            fillPercent < 20
                              ? "bg-red-500"
                              : fillPercent < 50
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
