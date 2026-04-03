"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { cmsGetAll, cmsUpdate } from "@/lib/admin-api";
import { useToast } from "@/components/ui/Toast";
import ProductForm from "@/components/admin/ProductForm";
import AdminSearchToolbar from "@/components/admin/AdminSearchToolbar";
import Pagination from "@/components/admin/Pagination";
import TableSkeleton from "@/components/admin/TableSkeleton";
import type { Product } from "@/lib/types";

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const t = useTranslations("admin.products");
  const tc = useTranslations("common");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const categories = [
    { value: "", label: tc("all") },
    { value: "coffee", label: t("filters.coffee") },
    { value: "tea", label: t("filters.tea") },
    { value: "other", label: t("filters.other") },
    { value: "snack", label: t("filters.snack") },
  ];

  const fetchProducts = async () => {
    const { data, error } = await cmsGetAll<Product>("products");

    if (error) {
      showToast(t("loadError"), "error");
    } else {
      setProducts((data ?? []) as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleAvailable = async (product: Product) => {
    setTogglingId(product.id);
    const nextAvailable = !product.available;
    const { error } = await cmsUpdate("products", product.id, {
      available: nextAvailable,
    });

    if (error) {
      showToast(tc("errorOccurred"), "error");
    } else {
      showToast(nextAvailable ? t("available") : t("unavailable"), "success");
      fetchProducts();
    }

    setTogglingId(null);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      coffee: t("filters.coffee"),
      tea: t("filters.tea"),
      other: t("filters.other"),
      snack: t("filters.snack"),
    };
    return map[cat] ?? cat;
  };

  return (
    <div className="space-y-4">
      <AdminSearchToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        placeholder={t("searchPlaceholder")}
        onAdd={openCreate}
        addLabel={t("add")}
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => {
              setCategoryFilter(cat.value);
              setCurrentPage(1);
            }}
            className={[
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              categoryFilter === cat.value
                ? "bg-espresso-dark text-cream shadow-md"
                : "bg-white text-espresso/50 hover:bg-espresso/10 border border-espresso/10",
            ].join(" ")}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-espresso/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-espresso/10 bg-foam/50">
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.name")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.category")}
                </th>
                <th className="text-right px-4 py-3 font-medium text-espresso/50">
                  {t("table.price")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.rating")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.status")}
                </th>
                <th className="text-right px-4 py-3 font-medium text-espresso/50">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} columns={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-espresso/40"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-espresso/5 hover:bg-foam/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-espresso">
                      <div className="flex items-center gap-2">
                        {product.name}
                        {product.is_new && (
                          <span className="text-[10px] bg-mint/10 text-mint font-bold px-1.5 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-espresso/60">
                      {categoryLabel(product.category)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-espresso">
                      {formatPrice(product.price)} UZS
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          product.popular
                            ? "text-caramel-dark font-medium"
                            : "text-espresso/20"
                        }
                      >
                        {product.popular ? tc("yes") : tc("no")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          product.available
                            ? "bg-mint/10 text-mint"
                            : "bg-red-50 text-red-500",
                        ].join(" ")}
                      >
                        {product.available ? tc("yes") : tc("no")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          aria-label={tc("edit")}
                          className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAvailable(product)}
                          disabled={togglingId === product.id}
                          className={[
                            "p-2 transition-colors rounded-lg",
                            product.available
                              ? "text-espresso/40 hover:text-red-500 hover:bg-red-50"
                              : "text-espresso/40 hover:text-mint hover:bg-mint/10",
                            togglingId === product.id
                              ? "opacity-50 cursor-not-allowed"
                              : "",
                          ].join(" ")}
                          title={
                            product.available
                              ? t("unavailable")
                              : t("available")
                          }
                        >
                          {product.available ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={safePage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* Product Form Modal */}
      {formOpen && (
        <ProductForm
          product={editingProduct}
          onClose={() => setFormOpen(false)}
          onSaved={fetchProducts}
        />
      )}
    </div>
  );
}
