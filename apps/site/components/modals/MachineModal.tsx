"use client";

import { useState } from "react";
import Image from "next/image";
import { Navigation } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PriceTag from "@/components/ui/PriceTag";
import NavigationSelector from "@/components/ui/NavigationSelector";
import { getProductPresentation } from "@/lib/productPresentation";
import { useProductsData } from "@/lib/useProductsData";
import { useModal } from "@/lib/modal-context";
import { CATEGORY_EMOJI } from "@/lib/categoryStyles";
import { localized } from "@/lib/localize";
import type { Machine } from "@/lib/types";

interface MachineModalProps {
  machine: Machine;
  onClose: () => void;
  distance?: string | null;
}

export default function MachineModal({
  machine,
  onClose,
  distance,
}: MachineModalProps) {
  const t = useTranslations("machineModal");
  const locale = useLocale();
  const { products } = useProductsData();
  const { openProductModal } = useModal();
  const [showNavSelector, setShowNavSelector] = useState(false);
  const sampleProducts = products.filter((p) => p.available).slice(0, 6);
  const machineAddress = localized(machine, "address", locale);
  const hasCoords = machine.latitude != null && machine.longitude != null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      className="max-w-md overflow-hidden"
      ariaLabel={machine.name}
    >
      {/* Machine image */}
      {machine.image_url && (
        <div className="relative h-48 bg-foam">
          <Image
            src={machine.image_url}
            alt={machine.name}
            fill
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="p-5">
        <h3 className="font-display text-xl font-bold text-espresso-dark">
          {machine.name}
        </h3>
        <p className="text-sm text-chocolate/60 mt-1">{machineAddress}</p>
        {machine.floor && (
          <p className="text-sm text-chocolate/60">
            {t("floor", { floor: machine.floor })}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <Badge
            variant={
              machine.status === "online" ? "status-online" : "status-offline"
            }
          >
            {machine.status === "online" ? t("online") : t("offline")}
          </Badge>
          <span className="text-sm text-chocolate/60">{machine.hours}</span>
          <span className="text-sm text-chocolate/60">
            {"\u2B50"} {machine.rating} ({machine.review_count})
          </span>
        </div>
      </div>

      {/* Products grid */}
      <div className="p-5 border-t border-espresso/10">
        <h4 className="font-medium text-chocolate mb-3">{t("menu")}</h4>
        <div className="grid grid-cols-2 gap-3">
          {sampleProducts.map((product) => {
            const presentation = getProductPresentation(product);
            const productName = localized(product, "name", locale);

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => openProductModal(product)}
                className="bg-foam rounded-xl p-3 flex items-center gap-2"
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0">
                  {presentation.imageSrc ? (
                    <Image
                      src={presentation.imageSrc}
                      alt={productName}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xl">
                      {CATEGORY_EMOJI[product.category] ?? "\u2615"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-chocolate truncate">
                    {productName}
                  </div>
                  <PriceTag price={product.price} className="text-xs" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 border-t border-espresso/10 space-y-3">
        {distance && (
          <p className="text-center text-sm text-chocolate/50">
            {t("distance", { distance })}
          </p>
        )}
        {hasCoords && (
          <button
            type="button"
            onClick={() => setShowNavSelector(true)}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-espresso font-medium hover:bg-foam rounded-xl transition-colors"
          >
            <Navigation size={16} />
            {t("buildRoute")}
          </button>
        )}
        <Button variant="caramel" className="w-full">
          {t("orderInApp")}
        </Button>
      </div>

      {hasCoords && (
        <NavigationSelector
          isOpen={showNavSelector}
          onClose={() => setShowNavSelector(false)}
          latitude={machine.latitude!}
          longitude={machine.longitude!}
          name={machine.name}
          address={machineAddress}
        />
      )}
    </Modal>
  );
}
