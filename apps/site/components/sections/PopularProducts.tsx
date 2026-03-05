"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { localized } from "@/lib/localize";
import { getProductPresentation } from "@/lib/productPresentation";
import { useProductsData } from "@/lib/useProductsData";
import { useModal } from "@/lib/modal-context";
import { CATEGORY_EMOJI, CATEGORY_GRADIENT } from "@/lib/categoryStyles";
import Card from "@/components/ui/Card";
import PriceTag from "@/components/ui/PriceTag";
import SectionHeader from "@/components/ui/SectionHeader";

export default function PopularProducts() {
  const t = useTranslations("popularProducts");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { products } = useProductsData();
  const { openProductModal } = useModal();
  const popularProducts = useMemo(
    () => products.filter((p) => p.popular && p.available).slice(0, 4),
    [products],
  );

  return (
    <section className="mt-16 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeader title={t("title")} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {popularProducts.map((product) => {
            const presentation = getProductPresentation(product);
            const emoji =
              presentation.fallbackEmoji ??
              CATEGORY_EMOJI[product.category] ??
              "\u2615";
            const caloriesText =
              presentation.caloriesKcal !== null
                ? `${presentation.caloriesKcal} ${tc("kcal")}`
                : null;

            const productName = localized(product, "name", locale);

            return (
              <Card
                key={product.id}
                hover
                className="overflow-hidden"
                onClick={() => openProductModal(product)}
              >
                {/* Image area */}
                <div
                  className={`relative bg-gradient-to-b ${CATEGORY_GRADIENT[product.category] ?? "from-gray-100 to-gray-50"} h-32 flex items-center justify-center`}
                >
                  {presentation.imageSrc ? (
                    <Image
                      src={presentation.imageSrc}
                      alt={productName}
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover"
                      loading="eager"
                    />
                  ) : (
                    <span
                      className="text-4xl"
                      role="img"
                      aria-label={productName}
                    >
                      {emoji}
                    </span>
                  )}

                  {/* Rating badge */}
                  <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium text-chocolate">
                    \u2B50 {product.rating}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="font-medium text-chocolate truncate">
                    {productName}
                  </div>
                  {caloriesText && (
                    <div className="text-xs text-chocolate/50 mt-0.5">
                      {caloriesText}
                    </div>
                  )}
                  <PriceTag price={product.price} className="text-sm mt-1" />
                  <div className="text-espresso text-sm mt-2 font-medium">
                    {t("clickDetails")}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
