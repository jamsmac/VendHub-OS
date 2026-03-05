"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { localized } from "@/lib/localize";
import { getProductPresentation } from "@/lib/productPresentation";
import { useProductsData } from "@/lib/useProductsData";
import { useModal } from "@/lib/modal-context";
import { CATEGORY_EMOJI, CATEGORY_GRADIENT } from "@/lib/categoryStyles";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Pill from "@/components/ui/Pill";
import PriceTag from "@/components/ui/PriceTag";
import Button from "@/components/ui/Button";

type CategoryFilter = "all" | "coffee" | "tea" | "other" | "snack";
type TempFilter = "all" | "hot" | "cold";

export default function MenuSection() {
  const { openProductModal } = useModal();
  const { products } = useProductsData();
  const t = useTranslations("menu");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [tempFilter, setTempFilter] = useState<TempFilter>("all");

  const availableProducts = products.filter((p) => p.available);
  const allCount = availableProducts.length;
  const coffeeCount = availableProducts.filter(
    (p) => p.category === "coffee",
  ).length;
  const teaCount = availableProducts.filter((p) => p.category === "tea").length;
  const otherCount = availableProducts.filter(
    (p) => p.category === "other",
  ).length;
  const snackCount = availableProducts.filter(
    (p) => p.category === "snack",
  ).length;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.available) return false;
      // Category filter
      if (categoryFilter !== "all" && p.category !== categoryFilter)
        return false;
      // Temperature filter
      if (tempFilter !== "all") {
        if (p.temperature !== tempFilter && p.temperature !== "both")
          return false;
      }
      return true;
    });
  }, [products, categoryFilter, tempFilter]);

  const totalCount = availableProducts.length;
  const filteredCount = filteredProducts.length;
  const isFiltered = categoryFilter !== "all" || tempFilter !== "all";

  const subtitle = isFiltered
    ? t("itemsOf", { filtered: filteredCount, total: totalCount })
    : t("items", { count: filteredCount });

  const resetFilters = () => {
    setCategoryFilter("all");
    setTempFilter("all");
  };

  return (
    <section id="menu" className="section-padding bg-foam">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title={t("title")} subtitle={subtitle} />

        {/* Category filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide justify-center flex-wrap">
          <Pill
            icon={"\uD83C\uDF7D\uFE0F"}
            label={t("categories.all")}
            count={allCount}
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
          />
          <Pill
            icon={"\u2615"}
            label={t("categories.coffee")}
            count={coffeeCount}
            active={categoryFilter === "coffee"}
            onClick={() => setCategoryFilter("coffee")}
          />
          <Pill
            icon={"\uD83C\uDF75"}
            label={t("categories.tea")}
            count={teaCount}
            active={categoryFilter === "tea"}
            onClick={() => setCategoryFilter("tea")}
          />
          <Pill
            icon={"\uD83C\uDF6B"}
            label={t("categories.other")}
            count={otherCount}
            active={categoryFilter === "other"}
            onClick={() => setCategoryFilter("other")}
          />
          <Pill
            icon={"\uD83E\uDD50"}
            label={t("categories.snack")}
            count={snackCount}
            active={categoryFilter === "snack"}
            onClick={() => setCategoryFilter("snack")}
          />
        </div>

        {/* Temperature filter */}
        <div className="flex gap-2 mb-8 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => setTempFilter("all")}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              tempFilter === "all"
                ? "bg-espresso-dark text-cream shadow-md"
                : "bg-white text-espresso/50 hover:bg-espresso/10",
            ].join(" ")}
          >
            {t("temperature.all")}
          </button>
          <button
            type="button"
            onClick={() => setTempFilter("hot")}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              tempFilter === "hot"
                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md"
                : "bg-white text-espresso/50 hover:bg-espresso/10",
            ].join(" ")}
          >
            {t("temperature.hot")}
          </button>
          <button
            type="button"
            onClick={() => setTempFilter("cold")}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              tempFilter === "cold"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md"
                : "bg-white text-espresso/50 hover:bg-espresso/10",
            ].join(" ")}
          >
            {t("temperature.cold")}
          </button>
        </div>

        {/* Product grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const gradient =
                CATEGORY_GRADIENT[product.category] ??
                "from-gray-100 to-gray-50";
              const presentation = getProductPresentation(product);
              const emoji =
                presentation.fallbackEmoji ??
                CATEGORY_EMOJI[product.category] ??
                "\u2615";
              const productName = localized(product, "name", locale);
              const productDesc = localized(product, "description", locale);
              const caloriesText =
                presentation.caloriesKcal !== null
                  ? `${presentation.caloriesKcal} ${tc("kcal")}`
                  : null;
              const cardSubtitle =
                productDesc && caloriesText
                  ? `${productDesc} · ${caloriesText}`
                  : productDesc || caloriesText;

              return (
                <Card
                  key={product.id}
                  hover
                  onClick={
                    product.available
                      ? () => openProductModal(product)
                      : undefined
                  }
                >
                  {/* Image area */}
                  <div
                    className={`relative aspect-square bg-gradient-to-b ${gradient} flex items-center justify-center rounded-t-xl ${!product.available ? "grayscale" : ""}`}
                  >
                    {presentation.imageSrc ? (
                      <Image
                        src={presentation.imageSrc}
                        alt={productName}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <span
                        className="text-5xl"
                        role="img"
                        aria-label={productName}
                      >
                        {emoji}
                      </span>
                    )}

                    {/* Top-left badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.discount_percent && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-500 text-white">
                          -{product.discount_percent}%
                        </span>
                      )}
                      {!product.available && (
                        <Badge variant="unavailable">
                          {t("card.unavailable")}
                        </Badge>
                      )}
                    </div>

                    {/* Top-right badge */}
                    {product.is_new && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="new">{t("card.new")}</Badge>
                      </div>
                    )}

                    {/* Bottom-left: temperature */}
                    {(product.temperature === "hot" ||
                      product.temperature === "cold") && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant={product.temperature}>
                          {product.temperature === "hot"
                            ? t("card.hot")
                            : t("card.cold")}
                        </Badge>
                      </div>
                    )}

                    {/* Bottom-right: rating */}
                    <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium text-chocolate">
                      {"\u2B50"} {product.rating}
                    </span>
                  </div>

                  {/* Info area */}
                  <div className="p-3">
                    <div className="font-medium text-chocolate text-sm line-clamp-1">
                      {productName}
                    </div>
                    {cardSubtitle && (
                      <p className="text-xs text-chocolate/50 line-clamp-1 mt-0.5">
                        {cardSubtitle}
                      </p>
                    )}
                    <div className="mt-1">
                      <PriceTag price={product.price} className="text-sm" />
                    </div>
                    <div
                      className={[
                        "text-xs mt-2 font-medium",
                        product.available
                          ? "text-espresso"
                          : "text-chocolate/30",
                      ].join(" ")}
                    >
                      {product.available
                        ? t("card.clickDetails")
                        : t("card.comingSoon")}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16">
            <Search
              size={48}
              className="mx-auto opacity-30 text-chocolate mb-3"
            />
            <p className="text-chocolate/60 font-medium">{t("empty.title")}</p>
            <p className="text-chocolate/40 text-sm mt-1 mb-4">
              {t("empty.subtitle")}
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              {t("empty.reset")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
