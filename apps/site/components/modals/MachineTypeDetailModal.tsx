"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  FileText,
  Ruler,
  Scale,
  Monitor,
  LayoutGrid,
  Thermometer,
  CreditCard,
  Wifi,
  Lightbulb,
  Cpu,
  Zap,
  Box,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { MachineTypeDetail } from "@/lib/types";
import type { ReactNode } from "react";

interface MachineTypeDetailModalProps {
  machineType: MachineTypeDetail;
  onClose: () => void;
}

function getSpecIcon(label: string): ReactNode {
  const lower = label.toLowerCase();
  if (lower.includes("модель") || lower.includes("model"))
    return <FileText size={18} />;
  if (lower.includes("размер") || lower.includes("dimension"))
    return <Ruler size={18} />;
  if (lower.includes("вес") || lower.includes("weight"))
    return <Scale size={18} />;
  if (
    lower.includes("дисплей") ||
    lower.includes("экран") ||
    lower.includes("display")
  )
    return <Monitor size={18} />;
  if (
    lower.includes("слот") ||
    lower.includes("ячей") ||
    lower.includes("отсек")
  )
    return <LayoutGrid size={18} />;
  if (lower.includes("температур")) return <Thermometer size={18} />;
  if (lower.includes("оплат") || lower.includes("payment"))
    return <CreditCard size={18} />;
  if (lower.includes("связь") || lower.includes("connect"))
    return <Wifi size={18} />;
  if (lower.includes("подсветк") || lower.includes("light"))
    return <Lightbulb size={18} />;
  if (lower === "по" || lower.includes("software") || lower.includes("програм"))
    return <Cpu size={18} />;
  if (
    lower.includes("мощност") ||
    lower.includes("питан") ||
    lower.includes("power")
  )
    return <Zap size={18} />;
  return <Box size={18} />;
}

export default function MachineTypeDetailModal({
  machineType,
  onClose,
}: MachineTypeDetailModalProps) {
  const t = useTranslations("machines.detail");

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape]);

  const heroSrc =
    machineType.hero_image_url || "/images/machines/coffee-machine.webp";
  const specs = machineType.specs || [];
  const advantages = machineType.advantages || [];
  const gallery = machineType.gallery_images || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="machine-type-detail-title"
      className="fixed inset-0 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-espresso-dark/60 backdrop-blur-md" />

      {/* Scrollable content */}
      <div
        className="relative flex-1 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="fixed top-4 right-4 z-[60] w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-espresso/60 hover:text-espresso hover:bg-white transition-all"
        >
          <X size={20} />
        </button>

        {/* Hero section */}
        <div className="relative w-full max-w-4xl mx-auto mt-6 sm:mt-10 px-4">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-foam">
            <div className="relative aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/3] max-h-[70vh]">
              <Image
                src={heroSrc}
                alt={machineType.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 896px"
                className="object-contain bg-white"
                priority
              />
            </div>
            {/* Title overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-espresso-dark/90 via-espresso-dark/60 to-transparent px-5 sm:px-8 pt-16 pb-5 sm:pb-6">
              <h2
                id="machine-type-detail-title"
                className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg"
              >
                {machineType.name}
              </h2>
              {machineType.model_name && (
                <p className="text-white/70 text-sm mt-1">
                  {machineType.model_name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10">
          {/* Description card */}
          {machineType.description && (
            <div className="mt-5 bg-white/95 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-white/20">
              <p className="text-sm sm:text-base text-chocolate/80 leading-relaxed">
                {machineType.description}
              </p>
            </div>
          )}

          {/* Specs grid */}
          {specs.length > 0 && (
            <div className="mt-5">
              <h3 className="text-lg font-bold text-white mb-3 px-1 drop-shadow">
                {t("specs")}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {specs.map((spec, i) => (
                  <div
                    key={i}
                    className="bg-white/95 backdrop-blur-sm rounded-xl p-3.5 shadow-md border border-white/20 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-caramel-dark">
                        {getSpecIcon(spec.label)}
                      </span>
                      <span className="text-xs font-medium text-espresso/60 uppercase tracking-wide">
                        {spec.label}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-espresso leading-snug">
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advantages */}
          {advantages.length > 0 && (
            <div className="mt-5">
              <h3 className="text-lg font-bold text-white mb-3 px-1 drop-shadow">
                {t("advantages")}
              </h3>
              <div className="space-y-3">
                {advantages.map((adv, i) => (
                  <div
                    key={i}
                    className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-md border border-white/20 flex gap-4 items-start"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-caramel to-caramel-dark text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-espresso">
                        {adv.title}
                      </div>
                      <div className="text-sm text-chocolate/60 mt-0.5 leading-relaxed">
                        {adv.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="mt-5">
              <h3 className="text-lg font-bold text-white mb-3 px-1 drop-shadow">
                {t("gallery")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gallery.map((url, i) => (
                  <div
                    key={i}
                    className="relative rounded-2xl overflow-hidden shadow-lg bg-white"
                  >
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={url}
                        alt={`${machineType.name} - ${i + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 448px"
                        className="object-contain"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close button at bottom */}
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 text-sm font-medium text-white bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/25 transition-all"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
