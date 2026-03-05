"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import Pill from "@/components/ui/Pill";
import PromotionsTab from "@/components/benefits/PromotionsTab";
import type { Promotion } from "@/lib/types";

type Tab = "promos" | "loyalty";

export default function BenefitsSection({
  loyaltyTab,
  promotions,
}: {
  loyaltyTab: ReactNode;
  promotions: Promotion[];
}) {
  const t = useTranslations("benefits");
  const [activeTab, setActiveTab] = useState<Tab>("promos");

  return (
    <section id="benefits" className="section-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />

        {/* Tab switcher */}
        <div
          role="tablist"
          className="flex items-center justify-center gap-3 mb-10"
        >
          <Pill
            label={t("tabs.promotions")}
            active={activeTab === "promos"}
            onClick={() => setActiveTab("promos")}
            role="tab"
            ariaSelected={activeTab === "promos"}
          />
          <Pill
            label={t("tabs.bonuses")}
            active={activeTab === "loyalty"}
            onClick={() => setActiveTab("loyalty")}
            role="tab"
            ariaSelected={activeTab === "loyalty"}
          />
        </div>

        <div role="tabpanel">
          {activeTab === "promos" ? (
            <PromotionsTab promotions={promotions} />
          ) : (
            loyaltyTab
          )}
        </div>
      </div>
    </section>
  );
}
