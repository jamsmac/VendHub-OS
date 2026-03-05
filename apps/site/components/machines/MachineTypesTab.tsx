"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/Badge";
import type { Machine, MachineTypeDetail } from "@/lib/types";
import MachineTypeDetailModal from "@/components/modals/MachineTypeDetailModal";
import { MACHINE_TYPE_META, type MachineType } from "@/lib/machineTypeMeta";

const MACHINE_DETAIL_ROUTES: Partial<Record<MachineType, string>> = {
  coffee: "/machines/jq-002-a",
  snack: "/machines/tcn-csc-8c-v49",
  cold: "/machines/js-001-a01",
};

interface MachineTypesTabProps {
  machineTypes: MachineTypeDetail[];
  machines: Machine[];
}

export default function MachineTypesTab({
  machineTypes,
  machines,
}: MachineTypesTabProps) {
  const t = useTranslations("machines");
  const locale = useLocale();
  const [expandedAccordion, setExpandedAccordion] = useState<number>(0);
  const [detailType, setDetailType] = useState<MachineTypeDetail | null>(null);

  const toggleAccordion = (index: number) => {
    setExpandedAccordion(expandedAccordion === index ? -1 : index);
  };

  return (
    <>
      <div className="space-y-4 max-w-3xl mx-auto">
        {machineTypes.map((mt, index) => {
          const fallback = MACHINE_TYPE_META[mt.slug as MachineType];
          const thumbSrc = mt.hero_image_url || fallback?.imageSrc;
          const machineCount = machines.filter(
            (m) => m.type === mt.slug,
          ).length;
          const previewSpecs = (mt.specs || []).slice(0, 4);
          const detailsHref = MACHINE_DETAIL_ROUTES[mt.slug as MachineType];
          const hasDetails =
            Boolean(detailsHref) ||
            (mt.specs || []).length > 0 ||
            (mt.advantages || []).length > 0 ||
            (mt.gallery_images || []).length > 0 ||
            Boolean(mt.description);

          return (
            <div
              key={mt.id}
              className="bg-white rounded-2xl border border-espresso/5 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleAccordion(index)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl bg-foam border border-espresso/10 overflow-hidden shrink-0">
                    {thumbSrc ? (
                      <Image
                        src={thumbSrc}
                        alt={mt.name}
                        fill
                        sizes="48px"
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-lg">
                        {fallback?.emoji ?? "\u2615"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-chocolate">{mt.name}</h3>
                    <p className="text-sm text-chocolate/50">
                      {mt.model_name ?? ""}
                      {mt.model_name && machineCount > 0 ? " · " : ""}
                      {machineCount > 0
                        ? t("types.count", { count: machineCount })
                        : ""}
                    </p>
                  </div>
                  {mt.badge && (
                    <Badge variant="new" className="ml-2">
                      {mt.badge}
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  size={20}
                  className={[
                    "text-chocolate/30 transition-transform duration-300",
                    expandedAccordion === index ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
              {expandedAccordion === index && (
                <div className="px-5 pb-5 animate-expand overflow-hidden">
                  <div className="border-t border-espresso/5 pt-4 space-y-3 text-sm text-chocolate/70">
                    {previewSpecs.length > 0 ? (
                      <>
                        {previewSpecs.map((spec, si) => (
                          <div key={si}>
                            <span className="font-medium text-chocolate">
                              {spec.label}
                            </span>{" "}
                            {spec.value}
                          </div>
                        ))}
                        {hasDetails && (
                          <div className="pt-2">
                            {detailsHref ? (
                              <Link
                                href={`/${locale}${detailsHref}`}
                                className="inline-block text-sm font-medium text-espresso hover:text-espresso-dark transition-colors"
                              >
                                {t("types.viewDetails")}
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDetailType(mt)}
                                className="inline-block text-sm font-medium text-espresso hover:text-espresso-dark transition-colors"
                              >
                                {t("types.viewDetails")}
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-chocolate/50">
                        {t("types.infoSoon")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {detailType && (
        <MachineTypeDetailModal
          machineType={detailType}
          onClose={() => setDetailType(null)}
        />
      )}
    </>
  );
}
