"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { X, Star, MapPin } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import PriceTag from "@/components/ui/PriceTag";
import { getProductPresentation } from "@/lib/productPresentation";
import { formatPrice } from "@/lib/utils";
import { CATEGORY_EMOJI, CATEGORY_GRADIENT } from "@/lib/categoryStyles";
import { localized, localizedOptionName } from "@/lib/localize";
import type { Product, ProductOption } from "@/lib/types";

/* ── Rating CTA sub-component ─────────────────────────────────────────── */

function RatingCTA({
  price,
  selectedOptionName,
  onClose,
}: {
  price: number;
  selectedOptionName: string;
  onClose: () => void;
}) {
  const t = useTranslations("productModal");
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = (star: number) => {
    setRating(star);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="border-t border-espresso/10 p-5 text-center space-y-3">
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={20}
              className={
                s <= rating
                  ? "text-amber-400 fill-amber-400"
                  : "text-espresso/20"
              }
            />
          ))}
        </div>
        <p className="text-sm font-medium text-espresso-dark">
          {t("ratingThanks")}
        </p>
        <a
          href="#map"
          onClick={onClose}
          className="inline-flex items-center gap-2 bg-caramel-dark hover:bg-caramel text-white rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
        >
          <MapPin size={16} />
          {t("findNearest")}
        </a>
        <p className="text-xs text-chocolate/40">{formatPrice(price)} UZS</p>
      </div>
    );
  }

  return (
    <div className="border-t border-espresso/10 p-5">
      <p className="text-sm text-chocolate/60 mb-3">{selectedOptionName}</p>
      <p className="text-xs text-chocolate/40 mb-2">{t("ratePrompt")}</p>
      <div className="flex items-center justify-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} ${star === 1 ? t("starSingular") : t("starPlural")}`}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleRate(star)}
            className="p-1 transition-transform hover:scale-125"
          >
            <Star
              size={28}
              className={
                star <= (hoveredStar || rating)
                  ? "text-amber-400 fill-amber-400 transition-colors"
                  : "text-espresso/20 transition-colors"
              }
            />
          </button>
        ))}
      </div>
      <div className="text-center">
        <span className="text-sm font-semibold text-espresso-dark">
          {formatPrice(price)} UZS
        </span>
      </div>
    </div>
  );
}

/* ── Main modal ──────────────────────────────────────────────────────── */

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const t = useTranslations("productModal");
  const tc = useTranslations("common");
  const locale = useLocale();
  const productName = localized(product, "name", locale);
  const productDesc = localized(product, "description", locale);

  const hotOptions = useMemo(
    () => product.options.filter((o) => o.temperature === "hot"),
    [product.options],
  );
  const coldOptions = useMemo(
    () => product.options.filter((o) => o.temperature === "cold"),
    [product.options],
  );

  const fallbackOption: ProductOption = {
    name: productName,
    price: 0,
    temperature: product.temperature === "cold" ? "cold" : "hot",
  };

  const [selectedOption, setSelectedOption] = useState<ProductOption>(
    product.options[0] ?? fallbackOption,
  );

  const finalPrice = product.price + selectedOption.price;
  const detailDesc = localized(product, "detail_description", locale);

  const gradient =
    CATEGORY_GRADIENT[product.category] ?? "from-gray-100 to-gray-50";
  const presentation = getProductPresentation(product);
  const emoji =
    presentation.fallbackEmoji ?? CATEGORY_EMOJI[product.category] ?? "\u2615";
  const caloriesText =
    presentation.caloriesKcal !== null
      ? `${presentation.caloriesKcal} ${tc("kcal")}`
      : null;
  const descriptionText =
    productDesc && caloriesText
      ? `${productDesc} · ${caloriesText}`
      : productDesc || caloriesText;

  return (
    <Modal
      isOpen
      onClose={onClose}
      className="max-w-md overflow-hidden"
      ariaLabel={productName}
    >
      {/* Image area */}
      <div
        className={`relative aspect-[4/3] bg-gradient-to-b ${gradient} flex items-center justify-center rounded-t-2xl`}
      >
        {presentation.imageSrc ? (
          <Image
            src={presentation.imageSrc}
            alt={productName}
            fill
            sizes="(min-width: 768px) 448px, 100vw"
            className="object-cover"
          />
        ) : (
          <span className="text-6xl" role="img" aria-label={productName}>
            {emoji}
          </span>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("close")}
          className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 text-chocolate/60 hover:text-chocolate transition-colors"
        >
          <X size={20} />
        </button>

        {/* Temperature badge */}
        {(product.temperature === "hot" || product.temperature === "cold") && (
          <div className="absolute bottom-3 left-3">
            <Badge variant={product.temperature}>
              {product.temperature === "hot" ? t("tempHot") : t("tempCold")}
            </Badge>
          </div>
        )}

        {/* Rating badge */}
        <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-chocolate">
          {"\u2B50"} {product.rating}
        </span>
      </div>

      {/* Info section */}
      <div className="p-5">
        <h3 className="font-display text-xl uppercase font-bold text-espresso-dark">
          {productName}
        </h3>
        {descriptionText && (
          <p className="text-sm text-chocolate/60 mt-1">{descriptionText}</p>
        )}
        {detailDesc && (
          <p className="text-sm text-chocolate/40 mt-2 leading-relaxed">
            {detailDesc}
          </p>
        )}
        <div className="mt-2">
          <PriceTag price={finalPrice} className="text-lg" />
        </div>
      </div>

      {/* Stats row */}
      <div className="border-y border-espresso/10 py-3 grid grid-cols-3 text-center text-xs text-chocolate/60">
        <div>
          {"\u2615"} {t("options", { count: product.options.length })}
        </div>
        <div>
          {"\uD83D\uDD25"} {caloriesText ?? "—"}
        </div>
        <div>
          {product.temperature === "both"
            ? `\uD83D\uDD25/\uD83E\uDDCA ${t("tempBoth")}`
            : product.temperature === "hot"
              ? `\uD83D\uDD25 ${t("tempHot")}`
              : product.temperature === "cold"
                ? `\uD83E\uDDCA ${t("tempCold")}`
                : t("tempNone")}
        </div>
      </div>

      {/* Options section */}
      {(hotOptions.length > 0 || coldOptions.length > 0) && (
        <div className="p-5 space-y-4">
          {hotOptions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-chocolate mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2" />
                {t("hot")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {hotOptions.map((opt, i) => (
                  <button
                    key={`hot-${i}`}
                    type="button"
                    aria-pressed={selectedOption === opt}
                    onClick={() => setSelectedOption(opt)}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      selectedOption === opt
                        ? "bg-espresso-dark text-cream shadow-md"
                        : "bg-foam text-espresso/50 hover:bg-espresso/10",
                    ].join(" ")}
                  >
                    {localizedOptionName(opt.name, locale)}
                    {opt.price > 0 && (
                      <span className="ml-1 opacity-70">
                        {t("surcharge", { price: formatPrice(opt.price) })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {coldOptions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-chocolate mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />
                {t("cold")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {coldOptions.map((opt, i) => (
                  <button
                    key={`cold-${i}`}
                    type="button"
                    aria-pressed={selectedOption === opt}
                    onClick={() => setSelectedOption(opt)}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      selectedOption === opt
                        ? "bg-espresso-dark text-cream shadow-md"
                        : "bg-foam text-espresso/50 hover:bg-espresso/10",
                    ].join(" ")}
                  >
                    {localizedOptionName(opt.name, locale)}
                    {opt.price > 0 && (
                      <span className="ml-1 opacity-70">
                        {t("surcharge", { price: formatPrice(opt.price) })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA — Rating + Find Machine */}
      <RatingCTA
        price={finalPrice}
        selectedOptionName={localizedOptionName(selectedOption.name, locale)}
        onClose={onClose}
      />
    </Modal>
  );
}
