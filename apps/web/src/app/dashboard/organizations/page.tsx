"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
} from "lucide-react";
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
import { organizationsApi } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

type OrgType = "HEADQUARTERS" | "FRANCHISE" | "BRANCH" | "OPERATOR" | "PARTNER";

type OrgStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "TERMINATED";

interface Organization {
  id: string;
  name: string;
  nameUz?: string;
  slug: string;
  logo?: string;
  description?: string;
  type: OrgType;
  status: OrgStatus;
  parentId?: string | null;
  hierarchyLevel?: number;
  hierarchyPath?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  inn?: string;
  pinfl?: string;
  mfo?: string;
  bankAccount?: string;
  bankName?: string;
  okonx?: string;
  directorName?: string;
  subscriptionTier?: string;
  createdAt: string;
}

// ── Badge configs ─────────────────────────────────────────────────────────────

const typeColors: Record<OrgType, string> = {
  HEADQUARTERS: "bg-purple-500/10 text-purple-500",
  FRANCHISE: "bg-blue-500/10 text-blue-500",
  BRANCH: "bg-cyan-500/10 text-cyan-500",
  OPERATOR: "bg-green-500/10 text-green-500",
  PARTNER: "bg-amber-500/10 text-amber-500",
};

const statusColors: Record<OrgStatus, string> = {
  ACTIVE: "bg-green-500/10 text-green-500",
  PENDING: "bg-amber-500/10 text-amber-500",
  SUSPENDED: "bg-red-500/10 text-red-500",
  TERMINATED: "bg-muted text-muted-foreground",
};

const statusIcons: Record<OrgStatus, React.ReactNode> = {
  ACTIVE: <CheckCircle2 className="w-3 h-3" />,
  PENDING: <Clock className="w-3 h-3" />,
  SUSPENDED: <Ban className="w-3 h-3" />,
  TERMINATED: <XCircle className="w-3 h-3" />,
};

const ORG_TYPES: OrgType[] = [
  "HEADQUARTERS",
  "FRANCHISE",
  "BRANCH",
  "OPERATOR",
  "PARTNER",
];

const ORG_STATUSES: OrgStatus[] = [
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "TERMINATED",
];

const organizationFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  nameUz: z.string().max(255).optional().default(""),
  slug: z.string().max(100).optional().default(""),
  description: z.string().max(1000).optional().default(""),
  type: z.enum([
    "HEADQUARTERS",
    "FRANCHISE",
    "BRANCH",
    "OPERATOR",
    "PARTNER",
  ] as const),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "TERMINATED"] as const),
  email: z
    .string()
    .email("Invalid email")
    .or(z.literal(""))
    .optional()
    .default(""),
  phone: z.string().max(20).optional().default(""),
  address: z.string().max(500).optional().default(""),
  city: z.string().max(100).optional().default(""),
  region: z.string().max(100).optional().default(""),
  inn: z.string().max(20).optional().default(""),
  mfo: z.string().max(10).optional().default(""),
  bankAccount: z.string().max(30).optional().default(""),
  bankName: z.string().max(200).optional().default(""),
  directorName: z.string().max(200).optional().default(""),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrganizationsPage() {
  const t = useTranslations("organizations");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch organizations
  const {
    data: organizations,
    isLoading,
    isError,
  } = useQuery<Organization[]>({
    queryKey: ["organizations", debouncedSearch, statusFilter, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      const res = await organizationsApi.getAll(params);
      const d = res.data;
      return Array.isArray(d) ? d : d?.data || d?.items || [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => organizationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success(t("deleted"));
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  const handleDelete = (org: Organization) => {
    if (window.confirm(t("confirmDelete", { name: org.name }))) {
      deleteMutation.mutate(org.id);
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["organizations"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  const total = organizations?.length ?? 0;
  const active =
    organizations?.filter((o) => o.status === "ACTIVE").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("createOrganization")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("createOrganization")}</DialogTitle>
            </DialogHeader>
            <OrganizationForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["organizations"] });
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
              <p className="text-2xl font-bold">{total}</p>
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
              <p className="text-2xl font-bold">{active}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsActive")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {organizations?.filter((o) => o.status === "PENDING").length ??
                  0}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("statsPending")}
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

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {statusFilter === "all"
                ? t("filterStatus")
                : t(`statuses.${statusFilter.toLowerCase()}`)}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              {t("allStatuses")}
            </DropdownMenuItem>
            {ORG_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                {t(`statuses.${s.toLowerCase()}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Building2 className="w-4 h-4 mr-2" />
              {typeFilter === "all"
                ? t("filterType")
                : t(`types.${typeFilter.toLowerCase()}`)}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")}>
              {t("allTypes")}
            </DropdownMenuItem>
            {ORG_TYPES.map((type) => (
              <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                {t(`types.${type.toLowerCase()}`)}
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
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.type")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.email")}</TableHead>
              <TableHead>{t("columns.phone")}</TableHead>
              <TableHead>{t("columns.city")}</TableHead>
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
            ) : organizations?.length ? (
              organizations.map((org) => (
                <TableRow key={org.id}>
                  {/* Name */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {org.logo ? (
                          <img
                            src={org.logo}
                            alt={org.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        {org.nameUz && (
                          <p className="text-xs text-muted-foreground">
                            {org.nameUz}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Badge className={typeColors[org.type]}>
                      {t(`types.${org.type.toLowerCase()}`)}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      className={`${statusColors[org.status]} flex items-center gap-1 w-fit`}
                    >
                      {statusIcons[org.status]}
                      {t(`statuses.${org.status.toLowerCase()}`)}
                    </Badge>
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    {org.email ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[160px]">
                          {org.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Phone */}
                  <TableCell>
                    {org.phone ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                        {org.phone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* City */}
                  <TableCell>
                    {org.city ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        {org.city}
                        {org.region && (
                          <span className="text-muted-foreground">
                            , {org.region}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Actions */}
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
                        <DropdownMenuItem onClick={() => setEditingOrg(org)}>
                          <Edit className="w-4 h-4 mr-2" />
                          {t("actionEdit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(org)}
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

      {/* Edit dialog */}
      {editingOrg && (
        <Dialog
          open={!!editingOrg}
          onOpenChange={(open) => !open && setEditingOrg(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editOrganization")}</DialogTitle>
            </DialogHeader>
            <OrganizationForm
              organization={editingOrg}
              onSuccess={() => {
                setEditingOrg(null);
                queryClient.invalidateQueries({ queryKey: ["organizations"] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function OrganizationForm({
  organization,
  onSuccess,
}: {
  organization?: Organization;
  onSuccess: () => void;
}) {
  const t = useTranslations("organizations");

  // Backend may return snake_case or camelCase depending on serialization
  const org = organization as Organization & Record<string, string | undefined>;

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: org?.name ?? "",
      nameUz: org?.nameUz ?? org?.["name_uz"] ?? "",
      slug: org?.slug ?? "",
      description: org?.description ?? "",
      type: org?.type ?? "BRANCH",
      status: org?.status ?? "PENDING",
      email: org?.email ?? "",
      phone: org?.phone ?? "",
      address: org?.address ?? "",
      city: org?.city ?? "",
      region: org?.region ?? "",
      inn: org?.inn ?? "",
      mfo: org?.mfo ?? "",
      bankAccount: org?.bankAccount ?? org?.["bank_account"] ?? "",
      bankName: org?.bankName ?? org?.["bank_name"] ?? "",
      directorName: org?.directorName ?? org?.["director_name"] ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: OrganizationFormValues) => {
      // Map camelCase frontend fields to snake_case backend DTO fields
      const payload = {
        name: data.name,
        name_uz: data.nameUz || undefined,
        slug: data.slug || undefined,
        description: data.description || undefined,
        type: data.type,
        status: data.status,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        region: data.region || undefined,
        inn: data.inn || undefined,
        mfo: data.mfo || undefined,
        bank_account: data.bankAccount || undefined,
        bank_name: data.bankName || undefined,
        director_name: data.directorName || undefined,
      };
      if (organization) {
        return organizationsApi.update(organization.id, payload);
      }
      return organizationsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(organization ? t("updated") : t("created"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("form.name")} *</label>
            <Input {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{t("form.nameUz")}</label>
            <Input {...form.register("nameUz")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("form.slug")}</label>
            <Input {...form.register("slug")} placeholder="my-organization" />
          </div>
          <div>
            <label className="text-sm font-medium">
              {t("form.directorName")}
            </label>
            <Input {...form.register("directorName")} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">{t("form.description")}</label>
          <Textarea
            {...form.register("description")}
            className="h-20 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("form.type")} *</label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`types.${type.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("form.status")} *</label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`statuses.${s.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="border-t pt-4 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("sectionContact")}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("form.email")}</label>
            <Input type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{t("form.phone")}</label>
            <Input {...form.register("phone")} placeholder="+998901234567" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">{t("form.address")}</label>
          <Input {...form.register("address")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("form.city")}</label>
            <Input {...form.register("city")} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("form.region")}</label>
            <Input {...form.register("region")} />
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="border-t pt-4 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("sectionLegal")}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("form.inn")}</label>
            <Input {...form.register("inn")} placeholder="123456789" />
          </div>
          <div>
            <label className="text-sm font-medium">{t("form.mfo")}</label>
            <Input {...form.register("mfo")} placeholder="01234" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("form.bankName")}</label>
            <Input {...form.register("bankName")} />
          </div>
          <div>
            <label className="text-sm font-medium">
              {t("form.bankAccount")}
            </label>
            <Input
              {...form.register("bankAccount")}
              placeholder="20208000000000000000"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("formSaving")
            : organization
              ? t("formUpdate")
              : t("formCreate")}
        </Button>
      </div>
    </form>
  );
}
