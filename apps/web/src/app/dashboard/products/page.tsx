"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FlaskConical,
  Leaf,
  Clock,
  Thermometer,
  CupSoda,
  ChevronRight,
  Layers,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { productsApi } from "@/lib/api";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  name: string;
  nameUz?: string;
  sku: string;
  category: string;
  price: number;
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  status: "active" | "low_stock" | "out_of_stock";
  isIngredient: boolean;
  unitOfMeasure: string;
  imageUrl?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
}

interface Recipe {
  id: string;
  name: string;
  nameUz?: string;
  typeCode: string;
  isActive: boolean;
  preparationTimeSeconds?: number;
  temperatureCelsius?: number;
  servingSizeMl?: number;
  totalCost: number;
  product?: { id: string; name: string; imageUrl?: string };
  ingredients?: RecipeIngredient[];
}

interface RecipeIngredient {
  id: string;
  quantity: number;
  unitOfMeasure: string;
  sortOrder: number;
  isOptional: boolean;
  ingredient?: { id: string; name: string; sku: string };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const categories = [
  { key: "All", label: "Все" },
  { key: "Beverages", label: "Напитки" },
  { key: "Snacks", label: "Снэки" },
  { key: "Energy", label: "Энергетики" },
  { key: "Dairy", label: "Молочные" },
  { key: "Other", label: "Другое" },
];

const ingredientCategories = [
  { key: "All", label: "Все" },
  { key: "coffee_beans", label: "Кофе (зёрна)" },
  { key: "coffee_instant", label: "Кофе (растворимый)" },
  { key: "tea", label: "Чай" },
  { key: "chocolate", label: "Шоколад" },
  { key: "milk", label: "Молоко" },
  { key: "sugar", label: "Сахар" },
  { key: "cream", label: "Сливки" },
  { key: "syrup", label: "Сироп" },
  { key: "water", label: "Вода" },
  { key: "cups", label: "Стаканчики" },
  { key: "other", label: "Другое" },
];

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: "В наличии",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  low_stock: {
    label: "Мало",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  out_of_stock: {
    label: "Нет в наличии",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

const recipeTypeLabels: Record<string, { label: string; color: string }> = {
  primary: { label: "Основной", color: "bg-blue-100 text-blue-700" },
  alternative: {
    label: "Альтернативный",
    color: "bg-purple-100 text-purple-700",
  },
  promotional: { label: "Промо", color: "bg-orange-100 text-orange-700" },
  test: { label: "Тестовый", color: "bg-gray-100 text-gray-700" },
};

const unitLabels: Record<string, string> = {
  g: "г",
  kg: "кг",
  ml: "мл",
  l: "л",
  pcs: "шт",
  pack: "уп",
  box: "кор",
  portion: "порц",
  cup: "стак",
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("uz-UZ").format(price) + " сум";
};

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds} сек`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min} мин ${sec} сек` : `${min} мин`;
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Продукты</h1>
        <p className="text-muted-foreground">
          Управление каталогом продуктов, рецептами и ингредиентами
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Продукты
          </TabsTrigger>
          <TabsTrigger value="recipes" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Рецепты
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="gap-2">
            <Leaf className="h-4 w-4" />
            Ингредиенты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="recipes">
          <RecipesTab />
        </TabsContent>

        <TabsContent value="ingredients">
          <IngredientsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// PRODUCTS TAB (existing functionality)
// ============================================================================

function ProductsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: products,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["products", debouncedSearch, selectedCategory],
    queryFn: () =>
      productsApi
        .getAll({
          search: debouncedSearch,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          type: "product", // only sellable products, not ingredients
        })
        .then((res) => res.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Продукт удалён");
    },
    onError: () => {
      toast.error("Не удалось удалить продукт");
    },
  });

  const stats = useMemo(
    () => ({
      total: products?.length || 0,
      inStock:
        products?.filter((p: Product) => p.status === "active").length || 0,
      lowStock:
        products?.filter((p: Product) => p.status === "low_stock").length || 0,
      outOfStock:
        products?.filter((p: Product) => p.status === "out_of_stock").length ||
        0,
    }),
    [products],
  );

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">
          Не удалось загрузить продукты
        </p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["products"] })
          }
        >
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Link href="/dashboard/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить продукт
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">В наличии</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.inStock}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Мало</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.lowStock}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Нет в наличии</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.outOfStock}
                </p>
              </div>
              <Package className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или артикулу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : products?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Продукты не найдены</p>
            <p className="text-muted-foreground mb-4">
              Добавьте первый продукт в каталог
            </p>
            <Link href="/dashboard/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить продукт
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Продукт
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Артикул
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Цена
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Остаток
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products?.map((product: Product) => {
                    const status =
                      statusConfig[product.status] || statusConfig.active;
                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {formatPrice(product.sellingPrice || product.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label="Действия"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/dashboard/products/${product.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Просмотр
                                </DropdownMenuItem>
                              </Link>
                              <Link
                                href={`/dashboard/products/${product.id}/edit`}
                              >
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Редактировать
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setConfirmState({
                                    title: "Удалить продукт?",
                                    action: () =>
                                      deleteMutation.mutate(product.id),
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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

// ============================================================================
// RECIPES TAB
// ============================================================================

function RecipesTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Get all products first, then fetch recipes for each
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "with-recipes"],
    queryFn: () =>
      productsApi.getAll({ limit: 500 }).then((res) => res.data.data),
  });

  // Fetch recipes for all products (aggregated)
  const { data: allRecipes, isLoading: recipesLoading } = useQuery({
    queryKey: ["all-recipes", products?.map((p: Product) => p.id)],
    queryFn: async () => {
      if (!products || products.length === 0) return [];
      const recipePromises = products
        .filter((p: Product) => !p.isIngredient)
        .map(async (p: Product) => {
          try {
            const res = await productsApi.getRecipes(p.id);
            const recipes = res.data.data || res.data || [];
            return recipes.map((r: Recipe) => ({
              ...r,
              product: { id: p.id, name: p.name, imageUrl: p.imageUrl },
            }));
          } catch {
            return [];
          }
        });
      const results = await Promise.all(recipePromises);
      return results.flat();
    },
    enabled: !!products && products.length > 0,
  });

  const isLoading = productsLoading || recipesLoading;

  const filteredRecipes = useMemo(() => {
    if (!allRecipes) return [];
    if (!debouncedSearch) return allRecipes;
    const q = debouncedSearch.toLowerCase();
    return allRecipes.filter(
      (r: Recipe) =>
        r.name?.toLowerCase().includes(q) ||
        r.product?.name?.toLowerCase().includes(q),
    );
  }, [allRecipes, debouncedSearch]);

  // Selected recipe detail
  const selectedRecipeData = useMemo(
    () => filteredRecipes.find((r: Recipe) => r.id === selectedRecipe),
    [filteredRecipes, selectedRecipe],
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего рецептов</p>
                <p className="text-2xl font-bold">{allRecipes?.length || 0}</p>
              </div>
              <FlaskConical className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных</p>
                <p className="text-2xl font-bold text-green-600">
                  {allRecipes?.filter((r: Recipe) => r.isActive).length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Продуктов с рецептами
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Set(allRecipes?.map((r: Recipe) => r.product?.id))
                    .size || 0}
                </p>
              </div>
              <Layers className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по рецепту или продукту..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Recipes list */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Рецепты не найдены</p>
            <p className="text-muted-foreground mb-4">
              Рецепты создаются на странице продукта
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Рецепт
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Продукт
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Тип
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Время
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Объём
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Себест.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecipes.map((recipe: Recipe) => {
                    const typeInfo =
                      recipeTypeLabels[recipe.typeCode] ||
                      recipeTypeLabels.primary;
                    return (
                      <tr
                        key={recipe.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRecipe(recipe.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              <FlaskConical className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-medium">{recipe.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {recipe.product?.name || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}
                          >
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {recipe.preparationTimeSeconds
                            ? formatTime(recipe.preparationTimeSeconds)
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {recipe.servingSizeMl
                            ? `${recipe.servingSizeMl} мл`
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {recipe.totalCost > 0
                            ? formatPrice(recipe.totalCost)
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              recipe.isActive
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {recipe.isActive ? "Активен" : "Неактивен"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipe Detail Dialog */}
      <Dialog
        open={!!selectedRecipe}
        onOpenChange={(open) => {
          if (!open) setSelectedRecipe(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-blue-600" />
              {selectedRecipeData?.name || "Рецепт"}
            </DialogTitle>
          </DialogHeader>

          {selectedRecipeData && (
            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Продукт</p>
                  <p className="font-medium">
                    {selectedRecipeData.product?.name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Тип</p>
                  <Badge variant="secondary">
                    {recipeTypeLabels[selectedRecipeData.typeCode]?.label ||
                      selectedRecipeData.typeCode}
                  </Badge>
                </div>
                {selectedRecipeData.preparationTimeSeconds && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Время</p>
                      <p className="font-medium">
                        {formatTime(selectedRecipeData.preparationTimeSeconds)}
                      </p>
                    </div>
                  </div>
                )}
                {selectedRecipeData.temperatureCelsius && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Температура</p>
                      <p className="font-medium">
                        {selectedRecipeData.temperatureCelsius}°C
                      </p>
                    </div>
                  </div>
                )}
                {selectedRecipeData.servingSizeMl && (
                  <div className="flex items-center gap-2">
                    <CupSoda className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Объём порции</p>
                      <p className="font-medium">
                        {selectedRecipeData.servingSizeMl} мл
                      </p>
                    </div>
                  </div>
                )}
                {selectedRecipeData.totalCost > 0 && (
                  <div>
                    <p className="text-muted-foreground">Себестоимость</p>
                    <p className="font-medium">
                      {formatPrice(selectedRecipeData.totalCost)}
                    </p>
                  </div>
                )}
              </div>

              {/* Ingredients list */}
              {selectedRecipeData.ingredients &&
                selectedRecipeData.ingredients.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Ингредиенты</h4>
                    <div className="border rounded-lg divide-y">
                      {selectedRecipeData.ingredients
                        .sort(
                          (a: RecipeIngredient, b: RecipeIngredient) =>
                            a.sortOrder - b.sortOrder,
                        )
                        .map((ing: RecipeIngredient) => (
                          <div
                            key={ing.id}
                            className="flex items-center justify-between px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Leaf className="h-3.5 w-3.5 text-green-600" />
                              <span>
                                {ing.ingredient?.name || "Ингредиент"}
                              </span>
                              {ing.isOptional && (
                                <Badge variant="outline" className="text-xs">
                                  опц.
                                </Badge>
                              )}
                            </div>
                            <span className="text-muted-foreground">
                              {ing.quantity}{" "}
                              {unitLabels[ing.unitOfMeasure] ||
                                ing.unitOfMeasure}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            {selectedRecipeData?.product?.id && (
              <Link
                href={`/dashboard/products/${selectedRecipeData.product.id}`}
              >
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Открыть продукт
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// ============================================================================
// INGREDIENTS TAB
// ============================================================================

function IngredientsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: ingredients,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ingredients", debouncedSearch, selectedCategory],
    queryFn: () =>
      productsApi
        .getAll({
          search: debouncedSearch,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          type: "ingredient",
        })
        .then((res) => res.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      toast.success("Ингредиент удалён");
    },
    onError: () => {
      toast.error("Не удалось удалить ингредиент");
    },
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">
          Не удалось загрузить ингредиенты
        </p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["ingredients"] })
          }
        >
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Link href="/dashboard/products/new?type=ingredient">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить ингредиент
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Всего ингредиентов
                </p>
                <p className="text-2xl font-bold">{ingredients?.length || 0}</p>
              </div>
              <Leaf className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных</p>
                <p className="text-2xl font-bold text-green-600">
                  {ingredients?.filter((i: Product) => i.status === "active")
                    .length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Заканчиваются</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {ingredients?.filter((i: Product) => i.status === "low_stock")
                    .length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или артикулу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ingredientCategories.slice(0, 6).map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Ещё...
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ingredientCategories.slice(6).map((cat) => (
                <DropdownMenuItem
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ingredients Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : ingredients?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Leaf className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Ингредиенты не найдены</p>
            <p className="text-muted-foreground mb-4">
              Добавьте первый ингредиент
            </p>
            <Link href="/dashboard/products/new?type=ingredient">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить ингредиент
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ингредиент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Артикул
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ед. изм.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Закупка
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Мин. остаток
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ingredients?.map((item: Product) => {
                    const status =
                      statusConfig[item.status] || statusConfig.active;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center">
                              <Leaf className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <span className="font-medium">{item.name}</span>
                              {item.nameUz && (
                                <p className="text-xs text-muted-foreground">
                                  {item.nameUz}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {item.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {unitLabels[item.unitOfMeasure] || item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {item.purchasePrice
                            ? formatPrice(item.purchasePrice)
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {item.minStockLevel || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label="Действия"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/dashboard/products/${item.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Просмотр
                                </DropdownMenuItem>
                              </Link>
                              <Link
                                href={`/dashboard/products/${item.id}/edit`}
                              >
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Редактировать
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setConfirmState({
                                    title: "Удалить ингредиент?",
                                    action: () =>
                                      deleteMutation.mutate(item.id),
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
