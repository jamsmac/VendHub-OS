"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Package,
  TrendingUp,
  Building2,
  Gift,
  Coffee,
  Star,
  Send,
  Phone,
  Smartphone,
  MessageCircle,
  Share2,
  Flame,
  Trophy,
  Cake,
  Coins,
  UserPlus,
  ShoppingCart,
  Briefcase,
  Heart,
  Zap,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import PartnerForm from "@/components/partner/PartnerForm";
import { COLOR_SCHEMES } from "@/lib/data";
import type { Partner, PartnershipModel } from "@/lib/types";

const ICON_MAP: Record<string, LucideIcon> = {
  MapPin,
  Package,
  TrendingUp,
  Building2,
  Gift,
  Coffee,
  Star,
  Send,
  Phone,
  Smartphone,
  MessageCircle,
  Share2,
  Flame,
  Trophy,
  Cake,
  Coins,
  UserPlus,
  ShoppingCart,
  Briefcase,
  Heart,
  Zap,
};

interface PartnerSectionProps {
  partners: Partner[];
  models: PartnershipModel[];
}

export default function PartnerSection({
  partners,
  models,
}: PartnerSectionProps) {
  const t = useTranslations("partner");
  const locale = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <section id="partner" className="section-padding bg-foam">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />

        {/* Model cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {models.map((model) => {
            const Icon = ICON_MAP[model.icon] ?? Gift;
            const scheme =
              COLOR_SCHEMES[model.color_scheme] ?? COLOR_SCHEMES.mint;
            const isExpanded = expandedId === model.key;
            const title =
              locale === "uz" && model.title_uz ? model.title_uz : model.title;
            const description =
              locale === "uz" && model.description_uz
                ? model.description_uz
                : model.description;
            const benefits =
              locale === "uz" && model.benefits_uz?.length
                ? model.benefits_uz
                : model.benefits;
            return (
              <Card key={model.id} hover className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${scheme.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={24} className={scheme.text} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-bold text-espresso-dark">
                      {title}
                    </h3>
                    <p className="text-sm text-chocolate/60 mt-1">
                      {description}
                    </p>

                    {benefits.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(model.key)}
                        className="flex items-center gap-1 text-sm text-caramel hover:text-caramel-dark transition-colors mt-3"
                      >
                        {t("moreInfo")}
                        {isExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>
                    )}

                    {isExpanded && (
                      <ul className="mt-3 space-y-2 animate-fadeIn">
                        {benefits.map((detail: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-chocolate/60"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-mint shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Partner Form */}
        <div className="max-w-lg mx-auto mb-14">
          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold text-espresso-dark mb-6 text-center">
              {t("leaveRequest")}
            </h3>
            <PartnerForm models={models} />
          </Card>
        </div>

        {/* Partners — trust */}
        <div>
          <h3 className="font-display text-lg font-bold text-espresso-dark mb-6 text-center">
            {t("trustedBy")}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {partners.map((partner) => {
              const content = (
                <Card className="px-6 py-4" hover={!!partner.website_url}>
                  {partner.logo_url ? (
                    <div className="relative h-8 w-24">
                      <Image
                        src={partner.logo_url}
                        alt={partner.name}
                        fill
                        sizes="96px"
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-espresso">
                      {partner.name}
                    </span>
                  )}
                </Card>
              );

              if (partner.website_url) {
                return (
                  <a
                    key={partner.id}
                    href={partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={partner.description ?? partner.name}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div key={partner.id} title={partner.description ?? undefined}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
