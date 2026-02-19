"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Edit,
  CheckCircle2,
  XCircle,
  Tag,
  Package,
  CreditCard,
  FileText,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { referencesApi } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GoodsClassifier {
  id: string;
  code: string;
  name: string;
  group?: string;
  parentCode?: string;
  isActive: boolean;
}

interface IkpuCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface VatRate {
  id: string;
  code: string;
  name: string;
  rate: number;
  isActive: boolean;
  sortOrder?: number;
}

interface PackageType {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface PaymentProvider {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  commissionPercent?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ActiveBadge({
  isActive,
  t,
}: {
  isActive: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return isActive ? (
    <Badge className="bg-green-500/10 text-green-500 gap-1">
      <CheckCircle2 className="w-3 h-3" />
      {t("active")}
    </Badge>
  ) : (
    <Badge className="bg-red-500/10 text-red-500 gap-1">
      <XCircle className="w-3 h-3" />
      {t("inactive")}
    </Badge>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={cols}>
            <Skeleton className="h-10 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({
  cols,
  icon: Icon,
  label,
}: {
  cols: number;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center py-10">
        <Icon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-muted-foreground">{label}</p>
      </TableCell>
    </TableRow>
  );
}

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ReferencesPage() {
  const t = useTranslations("references");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="mxik">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="mxik" className="gap-1.5">
            <Tag className="w-4 h-4" />
            {t("tabs.goodsClassifiers")}
          </TabsTrigger>
          <TabsTrigger value="ikpu" className="gap-1.5">
            <FileText className="w-4 h-4" />
            {t("tabs.ikpuCodes")}
          </TabsTrigger>
          <TabsTrigger value="vat" className="gap-1.5">
            <Percent className="w-4 h-4" />
            {t("tabs.vatRates")}
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-1.5">
            <Package className="w-4 h-4" />
            {t("tabs.packageTypes")}
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5">
            <CreditCard className="w-4 h-4" />
            {t("tabs.paymentProviders")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mxik" className="mt-4">
          <MxikTab />
        </TabsContent>
        <TabsContent value="ikpu" className="mt-4">
          <IkpuTab />
        </TabsContent>
        <TabsContent value="vat" className="mt-4">
          <VatTab />
        </TabsContent>
        <TabsContent value="packages" className="mt-4">
          <PackagesTab />
        </TabsContent>
        <TabsContent value="providers" className="mt-4">
          <ProvidersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab 1: MXIK (Goods Classifiers) ────────────────────────────────────────

function MxikTab() {
  const t = useTranslations("references");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<GoodsClassifier | undefined>();

  const { data, isLoading } = useQuery<GoodsClassifier[]>({
    queryKey: ["references", "goods-classifiers", debouncedSearch],
    queryFn: () =>
      referencesApi.getGoodsClassifiers(
        debouncedSearch ? { search: debouncedSearch } : undefined,
      ),
  });

  const openCreate = () => {
    setSelected(undefined);
    setDialogOpen(true);
  };

  const openEdit = (item: GoodsClassifier) => {
    setSelected(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("createItem")}
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.group")}</TableHead>
              <TableHead>{t("columns.parentCode")}</TableHead>
              <TableHead>{t("columns.active")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton cols={6} />
            ) : data?.length ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.group ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {item.parentCode ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge isActive={item.isActive} t={t} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                      aria-label={t("editItem")}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <EmptyRow cols={6} icon={Tag} label={t("noData")} />
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? t("editItem") : t("createItem")}
            </DialogTitle>
          </DialogHeader>
          <MxikForm
            item={selected}
            onSuccess={() => {
              setDialogOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["references", "goods-classifiers"],
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MxikForm({
  item,
  onSuccess,
}: {
  item?: GoodsClassifier;
  onSuccess: () => void;
}) {
  const t = useTranslations("references");
  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    group: item?.group ?? "",
    parentCode: item?.parentCode ?? "",
    isActive: item?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      item
        ? referencesApi.updateGoodsClassifier(item.id, data)
        : referencesApi.createGoodsClassifier(data),
    onSuccess: () => {
      toast.success(item ? t("messages.updated") : t("messages.created"));
      onSuccess();
    },
    onError: () => toast.error(t("messages.error")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("fields.code")}</Label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("fields.group")}</Label>
          <Input
            value={form.group}
            onChange={(e) => setForm({ ...form, group: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.name")}</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.parentCode")}</Label>
        <Input
          value={form.parentCode}
          onChange={(e) => setForm({ ...form, parentCode: e.target.value })}
          placeholder={t("fields.parentCodePlaceholder")}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="mxik-active"
          checked={form.isActive}
          onCheckedChange={(v) => setForm({ ...form, isActive: v })}
        />
        <Label htmlFor="mxik-active">{t("fields.isActive")}</Label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("fields.saving")
            : item
              ? t("fields.update")
              : t("fields.create")}
        </Button>
      </div>
    </form>
  );
}

// ─── Tab 2: IKPU Tax Codes ───────────────────────────────────────────────────

function IkpuTab() {
  const t = useTranslations("references");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<IkpuCode | undefined>();

  const { data, isLoading } = useQuery<IkpuCode[]>({
    queryKey: ["references", "ikpu-codes", debouncedSearch],
    queryFn: () =>
      referencesApi.getIkpuCodes(
        debouncedSearch ? { search: debouncedSearch } : undefined,
      ),
  });

  const openCreate = () => {
    setSelected(undefined);
    setDialogOpen(true);
  };

  const openEdit = (item: IkpuCode) => {
    setSelected(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("createItem")}
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.description")}</TableHead>
              <TableHead>{t("columns.active")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton cols={5} />
            ) : data?.length ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {item.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge isActive={item.isActive} t={t} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                      aria-label={t("editItem")}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <EmptyRow cols={5} icon={FileText} label={t("noData")} />
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? t("editItem") : t("createItem")}
            </DialogTitle>
          </DialogHeader>
          <IkpuForm
            item={selected}
            onSuccess={() => {
              setDialogOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["references", "ikpu-codes"],
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IkpuForm({
  item,
  onSuccess,
}: {
  item?: IkpuCode;
  onSuccess: () => void;
}) {
  const t = useTranslations("references");
  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    isActive: item?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      item
        ? referencesApi.updateIkpuCode(item.id, data)
        : referencesApi.createIkpuCode(data),
    onSuccess: () => {
      toast.success(item ? t("messages.updated") : t("messages.created"));
      onSuccess();
    },
    onError: () => toast.error(t("messages.error")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label>{t("fields.code")}</Label>
        <Input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.name")}</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.description")}</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="h-20 resize-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="ikpu-active"
          checked={form.isActive}
          onCheckedChange={(v) => setForm({ ...form, isActive: v })}
        />
        <Label htmlFor="ikpu-active">{t("fields.isActive")}</Label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("fields.saving")
            : item
              ? t("fields.update")
              : t("fields.create")}
        </Button>
      </div>
    </form>
  );
}

// ─── Tab 3: VAT Rates ────────────────────────────────────────────────────────

function VatTab() {
  const t = useTranslations("references");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<VatRate | undefined>();

  const { data, isLoading } = useQuery<VatRate[]>({
    queryKey: ["references", "vat-rates", debouncedSearch],
    queryFn: () =>
      referencesApi.getVatRates(
        debouncedSearch ? { search: debouncedSearch } : undefined,
      ),
  });

  const openCreate = () => {
    setSelected(undefined);
    setDialogOpen(true);
  };

  const openEdit = (item: VatRate) => {
    setSelected(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("createItem")}
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.rate")}</TableHead>
              <TableHead>{t("columns.sortOrder")}</TableHead>
              <TableHead>{t("columns.active")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton cols={6} />
            ) : data?.length ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{item.rate}%</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.sortOrder ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge isActive={item.isActive} t={t} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                      aria-label={t("editItem")}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <EmptyRow cols={6} icon={Percent} label={t("noData")} />
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? t("editItem") : t("createItem")}
            </DialogTitle>
          </DialogHeader>
          <VatForm
            item={selected}
            onSuccess={() => {
              setDialogOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["references", "vat-rates"],
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VatForm({
  item,
  onSuccess,
}: {
  item?: VatRate;
  onSuccess: () => void;
}) {
  const t = useTranslations("references");
  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    rate: item?.rate ?? 0,
    sortOrder: item?.sortOrder ?? 0,
    isActive: item?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      item
        ? referencesApi.updateVatRate(item.id, data)
        : referencesApi.createVatRate(data),
    onSuccess: () => {
      toast.success(item ? t("messages.updated") : t("messages.created"));
      onSuccess();
    },
    onError: () => toast.error(t("messages.error")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("fields.code")}</Label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("fields.rate")}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={form.rate}
            onChange={(e) =>
              setForm({ ...form, rate: parseFloat(e.target.value) || 0 })
            }
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.name")}</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.sortOrder")}</Label>
        <Input
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={(e) =>
            setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="vat-active"
          checked={form.isActive}
          onCheckedChange={(v) => setForm({ ...form, isActive: v })}
        />
        <Label htmlFor="vat-active">{t("fields.isActive")}</Label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("fields.saving")
            : item
              ? t("fields.update")
              : t("fields.create")}
        </Button>
      </div>
    </form>
  );
}

// ─── Tab 4: Package Types ────────────────────────────────────────────────────

function PackagesTab() {
  const t = useTranslations("references");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PackageType | undefined>();

  const { data, isLoading } = useQuery<PackageType[]>({
    queryKey: ["references", "package-types", debouncedSearch],
    queryFn: () =>
      referencesApi.getPackageTypes(
        debouncedSearch ? { search: debouncedSearch } : undefined,
      ),
  });

  const openCreate = () => {
    setSelected(undefined);
    setDialogOpen(true);
  };

  const openEdit = (item: PackageType) => {
    setSelected(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("createItem")}
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.description")}</TableHead>
              <TableHead>{t("columns.active")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton cols={5} />
            ) : data?.length ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {item.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge isActive={item.isActive} t={t} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                      aria-label={t("editItem")}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <EmptyRow cols={5} icon={Package} label={t("noData")} />
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? t("editItem") : t("createItem")}
            </DialogTitle>
          </DialogHeader>
          <PackageForm
            item={selected}
            onSuccess={() => {
              setDialogOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["references", "package-types"],
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageForm({
  item,
  onSuccess,
}: {
  item?: PackageType;
  onSuccess: () => void;
}) {
  const t = useTranslations("references");
  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    isActive: item?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      item
        ? referencesApi.updatePackageType(item.id, data)
        : referencesApi.createPackageType(data),
    onSuccess: () => {
      toast.success(item ? t("messages.updated") : t("messages.created"));
      onSuccess();
    },
    onError: () => toast.error(t("messages.error")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label>{t("fields.code")}</Label>
        <Input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.name")}</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.description")}</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="h-20 resize-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="pkg-active"
          checked={form.isActive}
          onCheckedChange={(v) => setForm({ ...form, isActive: v })}
        />
        <Label htmlFor="pkg-active">{t("fields.isActive")}</Label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("fields.saving")
            : item
              ? t("fields.update")
              : t("fields.create")}
        </Button>
      </div>
    </form>
  );
}

// ─── Tab 5: Payment Providers ────────────────────────────────────────────────

function ProvidersTab() {
  const t = useTranslations("references");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PaymentProvider | undefined>();

  const { data, isLoading } = useQuery<PaymentProvider[]>({
    queryKey: ["references", "payment-providers", debouncedSearch],
    queryFn: () =>
      referencesApi.getPaymentProviders(
        debouncedSearch ? { search: debouncedSearch } : undefined,
      ),
  });

  const openCreate = () => {
    setSelected(undefined);
    setDialogOpen(true);
  };

  const openEdit = (item: PaymentProvider) => {
    setSelected(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("createItem")}
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.type")}</TableHead>
              <TableHead>{t("columns.commission")}</TableHead>
              <TableHead>{t("columns.active")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton cols={6} />
            ) : data?.length ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.commissionPercent != null
                      ? `${item.commissionPercent}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge isActive={item.isActive} t={t} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                      aria-label={t("editItem")}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <EmptyRow cols={6} icon={CreditCard} label={t("noData")} />
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? t("editItem") : t("createItem")}
            </DialogTitle>
          </DialogHeader>
          <ProviderForm
            item={selected}
            onSuccess={() => {
              setDialogOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["references", "payment-providers"],
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProviderForm({
  item,
  onSuccess,
}: {
  item?: PaymentProvider;
  onSuccess: () => void;
}) {
  const t = useTranslations("references");
  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    type: item?.type ?? "",
    commissionPercent: item?.commissionPercent ?? 0,
    isActive: item?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      item
        ? referencesApi.updatePaymentProvider(item.id, data)
        : referencesApi.createPaymentProvider(data),
    onSuccess: () => {
      toast.success(item ? t("messages.updated") : t("messages.created"));
      onSuccess();
    },
    onError: () => toast.error(t("messages.error")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("fields.code")}</Label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("fields.type")}</Label>
          <Input
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            placeholder={t("fields.typePlaceholder")}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.name")}</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.commission")}</Label>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={form.commissionPercent}
          onChange={(e) =>
            setForm({
              ...form,
              commissionPercent: parseFloat(e.target.value) || 0,
            })
          }
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="provider-active"
          checked={form.isActive}
          onCheckedChange={(v) => setForm({ ...form, isActive: v })}
        />
        <Label htmlFor="provider-active">{t("fields.isActive")}</Label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("fields.saving")
            : item
              ? t("fields.update")
              : t("fields.create")}
        </Button>
      </div>
    </form>
  );
}
