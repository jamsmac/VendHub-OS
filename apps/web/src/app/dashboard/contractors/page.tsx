"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Star,
  FileText,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { contractorsApi } from "@/lib/api";

interface Contractor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  type: "repair" | "supply" | "logistics" | "cleaning" | "other";
  status: "active" | "inactive" | "pending";
  rating: number;
  contractNumber?: string;
  contractEndDate?: string;
  totalOrders: number;
  totalSpent: number;
  address?: string;
  notes?: string;
  createdAt: string;
}

const typeKeys: Record<string, string> = {
  repair: "type_repair",
  supply: "type_supply",
  logistics: "type_logistics",
  cleaning: "type_cleaning",
  other: "type_other",
};

const typeColors: Record<string, string> = {
  repair: "bg-blue-500/10 text-blue-500",
  supply: "bg-green-500/10 text-green-500",
  logistics: "bg-purple-500/10 text-purple-500",
  cleaning: "bg-amber-500/10 text-amber-500",
  other: "bg-muted text-muted-foreground",
};

const statusKeys: Record<string, string> = {
  active: "status_active",
  inactive: "status_inactive",
  pending: "status_pending",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  inactive: "bg-red-500/10 text-red-500",
  pending: "bg-amber-500/10 text-amber-500",
};

export default function ContractorsPage() {
  const t = useTranslations("contractors");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch contractors
  const {
    data: contractors,
    isLoading,
    isError,
  } = useQuery<Contractor[]>({
    queryKey: ["contractors", debouncedSearch, statusFilter, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      const res = await contractorsApi.getAll(params);
      return res.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await contractorsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      toast.success(t("deleted"));
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  const stats = useMemo(
    () => ({
      total: contractors?.length || 0,
      active: contractors?.filter((c) => c.status === "active").length || 0,
      totalSpent: contractors?.reduce((sum, c) => sum + c.totalSpent, 0) || 0,
    }),
    [contractors],
  );

  const formatMoney = formatCurrency;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["contractors"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("addContractor")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("newContractor")}</DialogTitle>
            </DialogHeader>
            <ContractorForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["contractors"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">{t("statsTotal")}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsActive")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatMoney(stats.totalSpent)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("totalExpenses")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {t("filterStatus")}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              {t("allStatuses")}
            </DropdownMenuItem>
            {Object.entries(statusKeys).map(([value, key]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setStatusFilter(value)}
              >
                {t(key)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Building2 className="w-4 h-4 mr-2" />
              {t("filterType")}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")}>
              {t("allTypes")}
            </DropdownMenuItem>
            {Object.entries(typeKeys).map(([value, key]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setTypeFilter(value)}
              >
                {t(key)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colContractor")}</TableHead>
              <TableHead>{t("colType")}</TableHead>
              <TableHead>{t("colContactPerson")}</TableHead>
              <TableHead>{t("colRating")}</TableHead>
              <TableHead>{t("colOrders")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : contractors?.length ? (
              contractors.map((contractor) => (
                <TableRow key={contractor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{contractor.name}</p>
                        {contractor.contractNumber && (
                          <p className="text-sm text-muted-foreground">
                            {t("contractNumberPrefix")}
                            {contractor.contractNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={typeColors[contractor.type]}>
                      {t(typeKeys[contractor.type])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{contractor.contactPerson}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {contractor.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < contractor.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted"
                          }`}
                        />
                      ))}
                      <span className="text-sm ml-1">
                        {contractor.rating.toFixed(1)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{contractor.totalOrders}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(contractor.totalSpent)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[contractor.status]}>
                      {t(statusKeys[contractor.status])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("actionsLabel")}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          {t("actionEdit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          {t("actionContract")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(contractor.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("actionDelete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("notFound")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Contractor Form Component
function ContractorForm({
  contractor,
  onSuccess,
}: {
  contractor?: Contractor;
  onSuccess: () => void;
}) {
  const t = useTranslations("contractors");
  const [formData, setFormData] = useState({
    name: contractor?.name || "",
    contactPerson: contractor?.contactPerson || "",
    email: contractor?.email || "",
    phone: contractor?.phone || "",
    type: contractor?.type || "repair",
    contractNumber: contractor?.contractNumber || "",
    contractEndDate: contractor?.contractEndDate || "",
    address: contractor?.address || "",
    notes: contractor?.notes || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Map frontend fields → backend DTO (CreateContractorDto / UpdateContractorDto)
      const payload = {
        companyName: data.name,
        contactPerson: data.contactPerson || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        serviceType: data.type,
        contractNumber: data.contractNumber || undefined,
        contractEnd: data.contractEndDate || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
      };
      if (contractor) {
        return contractorsApi.update(contractor.id, payload);
      }
      return contractorsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(contractor ? t("updated") : t("added"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("formCompanyName")}</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">
            {t("formContactPerson")}
          </label>
          <Input
            value={formData.contactPerson}
            onChange={(e) =>
              setFormData({ ...formData, contactPerson: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("formServiceType")}</label>
          <Select
            value={formData.type}
            onValueChange={(value: string) =>
              setFormData({ ...formData, type: value as Contractor["type"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("formServiceTypePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeKeys).map(([value, key]) => (
                <SelectItem key={value} value={value}>
                  {t(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("formEmail")}</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("formPhone")}</label>
          <Input
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">
            {t("formContractNumber")}
          </label>
          <Input
            value={formData.contractNumber}
            onChange={(e) =>
              setFormData({ ...formData, contractNumber: e.target.value })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">
            {t("formContractEndDate")}
          </label>
          <Input
            type="date"
            value={formData.contractEndDate}
            onChange={(e) =>
              setFormData({ ...formData, contractEndDate: e.target.value })
            }
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">{t("formAddress")}</label>
        <Input
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("formNotes")}</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="h-20 resize-none"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("formSaving")
            : contractor
              ? t("formUpdate")
              : t("formAdd")}
        </Button>
      </div>
    </form>
  );
}
