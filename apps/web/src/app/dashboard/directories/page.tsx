"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { directoriesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Database,
  Globe,
  Building2,
  Filter,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

type ApiError = Error & {
  response?: { data?: { message?: string | string[] } };
};

type DirectoryType = "MANUAL" | "EXTERNAL" | "PARAM" | "TEMPLATE";
type DirectoryScope = "HQ" | "ORGANIZATION" | "LOCATION";

interface Directory {
  id: string;
  name: string;
  slug: string;
  type: DirectoryType;
  scope: DirectoryScope;
  description?: string;
  isSystem: boolean;
  recordCount?: number;
  createdAt: string;
  updatedAt: string;
}

const TYPE_KEYS: Record<DirectoryType, string> = {
  MANUAL: "type_manual",
  EXTERNAL: "type_external",
  PARAM: "type_param",
  TEMPLATE: "type_template",
};

const SCOPE_KEYS: Record<DirectoryScope, string> = {
  HQ: "scope_hq",
  ORGANIZATION: "scope_organization",
  LOCATION: "scope_location",
};

export default function DirectoriesPage() {
  const t = useTranslations("directories");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state for create dialog
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    type: "MANUAL" as DirectoryType,
    scope: "HQ" as DirectoryScope,
    description: "",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch directories
  const { data: directories, isLoading } = useQuery({
    queryKey: ["directories", debouncedSearch, scopeFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (scopeFilter !== "all") params.append("scope", scopeFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);

      const response = await directoriesApi.getAll(Object.fromEntries(params));
      return (response.data?.data ?? response.data) as Directory[];
    },
  });

  // Create directory mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => directoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directories"] });
      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        slug: "",
        type: "MANUAL",
        scope: "HQ",
        description: "",
      });
      toast.success(t("createSuccess"));
    },
    onError: (error: ApiError) => {
      const message =
        error.response?.data?.message || error.message || t("createError");
      toast.error(Array.isArray(message) ? message[0] : message);
    },
  });

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: directories?.length || 0,
      system: directories?.filter((d) => d.isSystem).length || 0,
      custom: directories?.filter((d) => !d.isSystem).length || 0,
      external: directories?.filter((d) => d.type === "EXTERNAL").length || 0,
    }),
    [directories],
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDirectoryClick = (id: string) => {
    router.push(`/dashboard/directories/${id}`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addDirectory")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("statsTotal")}
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("statsSystem")}
            </CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("statsCustom")}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.custom}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("statsExternal")}
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.external}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t("filterScope")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allScopes")}</SelectItem>
                  <SelectItem value="HQ">{t("scope_hq")}</SelectItem>
                  <SelectItem value="ORGANIZATION">
                    {t("scope_organization")}
                  </SelectItem>
                  <SelectItem value="LOCATION">
                    {t("scope_location")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Database className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t("filterType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  <SelectItem value="MANUAL">{t("type_manual")}</SelectItem>
                  <SelectItem value="EXTERNAL">{t("type_external")}</SelectItem>
                  <SelectItem value="PARAM">{t("type_param")}</SelectItem>
                  <SelectItem value="TEMPLATE">{t("type_template")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : directories && directories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {directories.map((directory) => (
            <Card
              key={directory.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleDirectoryClick(directory.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{directory.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {directory.slug}
                    </p>
                  </div>
                  {directory.isSystem && (
                    <Badge variant="outline" className="ml-2">
                      <Settings2 className="mr-1 h-3 w-3" />
                      {t("systemBadge")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {directory.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {directory.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">
                      {t(TYPE_KEYS[directory.type])}
                    </Badge>
                    <Badge variant="secondary">
                      {t(SCOPE_KEYS[directory.scope])}
                    </Badge>
                    {directory.recordCount !== undefined && (
                      <Badge variant="outline">
                        {t("recordCount", { count: directory.recordCount })}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("notFound")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("notFoundHint")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Directory Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setFormData({
              name: "",
              slug: "",
              type: "MANUAL",
              scope: "HQ",
              description: "",
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t("formName")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("formNamePlaceholder")}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="slug">{t("formSlug")}</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="example-directory"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">{t("formType")}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: DirectoryType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">{t("type_manual")}</SelectItem>
                    <SelectItem value="EXTERNAL">
                      {t("type_external")}
                    </SelectItem>
                    <SelectItem value="PARAM">{t("type_param")}</SelectItem>
                    <SelectItem value="TEMPLATE">
                      {t("type_template")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="scope">{t("formScope")}</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value: DirectoryScope) =>
                    setFormData({ ...formData, scope: value })
                  }
                >
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HQ">{t("scope_hq")}</SelectItem>
                    <SelectItem value="ORGANIZATION">
                      {t("scope_organization")}
                    </SelectItem>
                    <SelectItem value="LOCATION">
                      {t("scope_location")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">{t("formDescription")}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("formDescriptionPlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                {t("cancelBtn")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t("creating") : t("createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
