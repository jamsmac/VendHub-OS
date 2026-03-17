"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Wallet,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Eye,
  Receipt,
} from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { collectionsApi } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface Collection {
  id: string;
  collectionNumber: string;
  status: "collected" | "received" | "cancelled";
  source: "realtime" | "manual_history" | "excel_import";
  amount?: number;
  collectedAt: string;
  receivedAt?: string;
  notes?: string;
  machine?: {
    id: string;
    name: string;
    machineNumber: string;
  };
  operator?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  createdAt: string;
}

interface CollectionStats {
  totalCollections: number;
  totalAmount: number;
  pendingCount: number;
  receivedCount: number;
  todayAmount: number;
  todayCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const statusConfig: Record<
  string,
  {
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  collected: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    icon: Clock,
  },
  received: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: CheckCircle2,
  },
  cancelled: { color: "text-red-600", bgColor: "bg-red-100", icon: XCircle },
};

const statusLabels: Record<string, string> = {
  collected: "Collected",
  received: "Received",
  cancelled: "Cancelled",
};

// ============================================================================
// Page Component
// ============================================================================

export default function CollectionsPage() {
  const t = useTranslations("collections");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");

  // ── Data Fetching ──────────────────────────────────────

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await collectionsApi.getAll(params);
      return (res.data?.data ||
        res.data?.items ||
        res.data ||
        []) as Collection[];
    },
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["collections-stats"],
    queryFn: async () => {
      const res = await collectionsApi.getStats();
      return (res.data ?? {}) as CollectionStats;
    },
    staleTime: 60_000,
  });

  const receiveMutation = useMutation({
    mutationFn: async ({
      id,
      amount,
      notes,
    }: {
      id: string;
      amount: number;
      notes?: string;
    }) => {
      await collectionsApi.receive(id, { amount, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collections-stats"] });
      toast.success("Collection received successfully");
      setReceiveDialogOpen(false);
      setSelectedCollection(null);
      setReceiveAmount("");
      setReceiveNotes("");
    },
    onError: () => {
      toast.error("Failed to receive collection");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await collectionsApi.cancel(id, { notes: "Cancelled from dashboard" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collections-stats"] });
      toast.success("Collection cancelled");
    },
    onError: () => {
      toast.error("Failed to cancel collection");
    },
  });

  // ── Filtering ──────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!collections) return [];
    if (!search) return collections;
    const q = search.toLowerCase();
    return collections.filter(
      (c) =>
        c.collectionNumber?.toLowerCase().includes(q) ||
        c.machine?.name?.toLowerCase().includes(q) ||
        c.machine?.machineNumber?.toLowerCase().includes(q) ||
        c.operator?.firstName?.toLowerCase().includes(q),
    );
  }, [collections, search]);

  // ── Handlers ───────────────────────────────────────────

  const handleReceive = (collection: Collection) => {
    setSelectedCollection(collection);
    setReceiveDialogOpen(true);
  };

  const handleSubmitReceive = () => {
    if (!selectedCollection || !receiveAmount) return;
    receiveMutation.mutate({
      id: selectedCollection.id,
      amount: parseFloat(receiveAmount),
      notes: receiveNotes || undefined,
    });
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalCollections") || "Total Collections"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalCollections ?? "—"}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalAmount") || "Total Amount"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalAmount ? formatPrice(stats.totalAmount) : "—"}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("pendingReceive") || "Pending Receive"}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats?.pendingCount ?? "—"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("todayAmount") || "Today"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.todayAmount ? formatPrice(stats.todayAmount) : "—"}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-blue-500" />
            </div>
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
          {["all", "collected", "received", "cancelled"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? tCommon("all") || "All" : statusLabels[s] || s}
            </Button>
          ))}
        </div>
      </div>

      {/* Collections List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wallet className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{t("noCollections") || "No collections found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((collection) => {
            const config =
              statusConfig[collection.status] ?? statusConfig.collected;
            const StatusIcon = config.icon;

            return (
              <Card
                key={collection.id}
                className="hover:shadow-sm transition-shadow"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <StatusIcon className={`h-5 w-5 ${config.color}`} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {collection.collectionNumber ||
                              `#${collection.id.slice(0, 8)}`}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
                          >
                            {statusLabels[collection.status]}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {collection.machine?.name ||
                            collection.machine?.machineNumber ||
                            "—"}{" "}
                          · {formatDate(collection.collectedAt)}
                          {collection.operator &&
                            ` · ${collection.operator?.firstName} ${collection.operator?.lastName || ""}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {collection.amount != null && (
                        <span className="font-semibold text-lg">
                          {formatPrice(collection.amount)}
                        </span>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            {tCommon("view") || "View"}
                          </DropdownMenuItem>
                          {collection.status === "collected" && (
                            <DropdownMenuItem
                              onClick={() => handleReceive(collection)}
                            >
                              <Receipt className="mr-2 h-4 w-4" />
                              {t("receive") || "Receive"}
                            </DropdownMenuItem>
                          )}
                          {collection.status === "collected" && (
                            <DropdownMenuItem
                              onClick={() =>
                                cancelMutation.mutate(collection.id)
                              }
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              {tCommon("cancel") || "Cancel"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receive Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("receiveCollection") || "Receive Collection"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("machine") || "Machine"}
              </p>
              <p className="font-medium">
                {selectedCollection?.machine?.name ||
                  selectedCollection?.machine?.machineNumber ||
                  "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("collectedAt") || "Collected at"}
              </p>
              <p className="font-medium">
                {selectedCollection?.collectedAt
                  ? formatDate(selectedCollection.collectedAt)
                  : "—"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("amount") || "Amount"} (UZS) *
              </label>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("notes") || "Notes"}
              </label>
              <Input
                placeholder={t("notesPlaceholder") || "Optional notes..."}
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReceiveDialogOpen(false)}
            >
              {tCommon("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleSubmitReceive}
              disabled={!receiveAmount || receiveMutation.isPending}
            >
              {receiveMutation.isPending
                ? tCommon("loading") || "Loading..."
                : t("confirmReceive") || "Confirm Receive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
