"use client";

import { useState } from "react";
import { Copy, ChevronDown, ChevronUp, Zap, Tag, Gift } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { localized, localizedArray } from "@/lib/localize";
import type { Promotion } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

export default function PromotionsTab({
  promotions,
}: {
  promotions: Promotion[];
}) {
  const { showToast } = useToast();
  const t = useTranslations("promotions");
  const locale = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activePromos = promotions
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function copyPromoCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      showToast(t("copied"), "success");
    } catch (_error: unknown) {
      // Fallback for older browsers / insecure contexts
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) {
          showToast(t("copied"), "success");
        }
      } catch {
        // Both methods failed — silently ignore
      }
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activePromos.map((promo) => {
          const promoTitle = localized(promo, "title", locale);
          const promoBadge = localized(promo, "badge", locale);
          const promoDesc = localized(promo, "description", locale);
          const promoConditions = localizedArray(promo, "conditions", locale);
          const promoInstruction = localized(
            promo,
            "action_instruction",
            locale,
          );

          return (
            <Card key={promo.id} className="overflow-hidden">
              {/* Gradient top strip */}
              <div className={`h-2 bg-gradient-to-r ${promo.gradient}`} />

              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Badge variant="promo">{promoBadge}</Badge>
                  {promo.valid_until && (
                    <span className="text-xs text-chocolate/40">
                      {t("validUntil", { date: formatDate(promo.valid_until) })}
                    </span>
                  )}
                </div>

                <h3 className="font-display text-xl font-bold text-espresso-dark mb-2">
                  {promoTitle}
                </h3>

                <p className="text-sm text-chocolate/60 mb-4">{promoDesc}</p>

                {promo.visibility_type === "action_required" ? (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/50 rounded-xl px-4 py-3 mb-4">
                    <Zap size={18} className="text-amber-500 shrink-0" />
                    <span className="text-sm text-amber-700">
                      {promoInstruction}
                    </span>
                  </div>
                ) : promo.promo_code ? (
                  <button
                    type="button"
                    onClick={() => copyPromoCode(promo.promo_code!)}
                    className="flex items-center gap-2 bg-foam border border-espresso/10 rounded-xl px-4 py-2.5 mb-4 w-full group hover:border-caramel transition-colors"
                  >
                    <code className="font-mono font-bold text-espresso tracking-wider flex-1 text-left">
                      {promo.promo_code}
                    </code>
                    <Copy
                      size={16}
                      className="text-espresso/40 group-hover:text-caramel transition-colors shrink-0"
                    />
                  </button>
                ) : null}

                {/* Expandable conditions */}
                <button
                  type="button"
                  onClick={() => toggleExpand(promo.id)}
                  className="flex items-center gap-1 text-sm text-espresso/50 hover:text-espresso transition-colors"
                >
                  {t("conditions")}
                  {expandedId === promo.id ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>

                {expandedId === promo.id && (
                  <ul className="mt-3 space-y-1.5 animate-fadeIn">
                    {promoConditions.map((cond, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-chocolate/60"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-caramel shrink-0" />
                        {cond}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* How promo codes work */}
      <Card className="mt-10 p-6 sm:p-8">
        <h3 className="font-display text-lg font-bold text-espresso-dark mb-6 text-center">
          {t("howToUse")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-caramel/10 flex items-center justify-center mb-3">
              <Tag size={24} className="text-caramel" />
            </div>
            <p className="text-sm font-medium text-chocolate">
              {t("steps.copy")}
            </p>
            <p className="text-xs text-chocolate/50 mt-1">
              {t("steps.copyDesc")}
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-mint/10 flex items-center justify-center mb-3">
              <Zap size={24} className="text-mint" />
            </div>
            <p className="text-sm font-medium text-chocolate">
              {t("steps.enter")}
            </p>
            <p className="text-xs text-chocolate/50 mt-1">
              {t("steps.enterDesc")}
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
              <Gift size={24} className="text-purple-500" />
            </div>
            <p className="text-sm font-medium text-chocolate">
              {t("steps.discount")}
            </p>
            <p className="text-xs text-chocolate/50 mt-1">
              {t("steps.discountDesc")}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
