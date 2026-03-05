import {
  Coffee,
  Cake,
  UserPlus,
  ShoppingCart,
  Gift,
  Star,
  Send,
  Phone,
  Smartphone,
  MessageCircle,
  Share2,
  Flame,
  Trophy,
  Coins,
  Check,
  X,
} from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import {
  loyaltyTiers as fallbackTiers,
  bonusActions as fallbackBonusActions,
  loyaltyPrivileges as fallbackPrivileges,
} from "@/lib/data";
import type { LoyaltyTier, BonusAction, LoyaltyPrivilege } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { localized } from "@/lib/localize";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  Coffee,
  Cake,
  UserPlus,
  ShoppingCart,
  Gift,
  Star,
  Send,
  Phone,
  Smartphone,
  MessageCircle,
  Share2,
  Flame,
  Trophy,
  Coins,
};

function DynamicIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[name] || Gift;
  return <Icon size={size} className={className} />;
}

export default async function LoyaltyTab() {
  const t = await getTranslations("loyalty");
  const locale = await getLocale();

  // Fetch all data in parallel
  const [tiersRes, actionsRes, privsRes] = await Promise.all([
    supabase.from("loyalty_tiers").select("*").order("sort_order"),
    supabase
      .from("bonus_actions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("loyalty_privileges")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const sortedTiers = (
    tiersRes.data?.length ? (tiersRes.data as LoyaltyTier[]) : fallbackTiers
  ).sort((a, b) => a.sort_order - b.sort_order);

  const allActions = actionsRes.data?.length
    ? (actionsRes.data as BonusAction[])
    : fallbackBonusActions;
  const earnActions = allActions.filter((a) => a.type === "earn");
  const spendActions = allActions.filter((a) => a.type === "spend");

  const activePrivileges = privsRes.data?.length
    ? (privsRes.data as LoyaltyPrivilege[])
    : fallbackPrivileges;

  return (
    <div>
      {/* Overview line */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-10">
        <span className="text-sm sm:text-base text-chocolate/70 bg-foam rounded-full px-4 py-2">
          {t("overview.pointValue")}
        </span>
        <span className="text-sm sm:text-base text-chocolate/70 bg-foam rounded-full px-4 py-2">
          {t("overview.cashback")}
        </span>
        <span className="text-sm sm:text-base text-chocolate/70 bg-foam rounded-full px-4 py-2">
          {t("overview.levels")}
        </span>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {sortedTiers.map((tier, idx) => (
          <Card
            key={tier.id}
            hover
            className={[
              "p-5 text-center relative",
              idx === 0 ? "ring-2 ring-caramel" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {idx === 0 && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-caramel text-white text-xs font-medium px-3 py-1 rounded-full">
                {t("tier.current")}
              </span>
            )}
            <div className="text-4xl mb-2">{tier.emoji}</div>
            <h4 className="font-display font-bold text-espresso-dark">
              {tier.level}
            </h4>
            <p className="text-xs text-chocolate/50 mt-1">
              {t("tier.from", { threshold: formatPrice(tier.threshold) })}
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium text-espresso">
                {t("tier.discount", { percent: tier.discount_percent })}
              </p>
              <p className="text-sm text-chocolate/60">
                {t("tier.cashback", { percent: tier.cashback_percent })}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Privileges — mobile cards */}
      {activePrivileges.length > 0 && (
        <div className="sm:hidden mb-12 space-y-4">
          <h3 className="font-display text-lg font-bold text-espresso-dark mb-4 text-center">
            {t("privileges.title")}
          </h3>
          {sortedTiers.map((tier) => (
            <Card key={tier.id} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{tier.emoji}</span>
                <h4 className="font-medium text-espresso-dark">{tier.level}</h4>
              </div>
              <div className="space-y-2">
                {activePrivileges.map((priv) => {
                  const val = tier.privileges[priv.key];
                  return (
                    <div
                      key={priv.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-chocolate/70">
                        {localized(priv, "label", locale)}
                      </span>
                      {typeof val === "number" ? (
                        val > 0 ? (
                          <span className="text-espresso font-medium">
                            {formatPrice(val)}
                          </span>
                        ) : (
                          <X size={14} className="text-gray-300" />
                        )
                      ) : val ? (
                        <Check size={14} className="text-mint" />
                      ) : (
                        <X size={14} className="text-gray-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Privileges — desktop table */}
      {activePrivileges.length > 0 && (
        <Card className="mb-12 hidden sm:block">
          <div className="p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-espresso-dark mb-4">
              {t("privileges.title")}
            </h3>
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">{t("privileges.title")}</caption>
            <thead>
              <tr className="border-t border-espresso/5">
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-chocolate/50 font-medium"
                >
                  {t("privileges.header")}
                </th>
                {sortedTiers.map((tier) => (
                  <th
                    key={tier.id}
                    scope="col"
                    className="text-center px-3 py-3 text-chocolate/70 font-medium"
                  >
                    {tier.emoji} {tier.level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activePrivileges.map((priv) => (
                <tr
                  key={priv.id}
                  className="border-t border-espresso/5 hover:bg-foam/50 transition-colors"
                >
                  <td className="px-5 py-3 text-chocolate/70">
                    {localized(priv, "label", locale)}
                  </td>
                  {sortedTiers.map((tier) => {
                    const val = tier.privileges[priv.key];
                    return (
                      <td key={tier.id} className="text-center px-3 py-3">
                        {typeof val === "number" ? (
                          val > 0 ? (
                            <span className="text-espresso font-medium">
                              {formatPrice(val)}
                            </span>
                          ) : (
                            <X size={16} className="text-gray-300 mx-auto" />
                          )
                        ) : val ? (
                          <Check size={16} className="text-mint mx-auto" />
                        ) : (
                          <X size={16} className="text-gray-300 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* How to earn points */}
      {earnActions.length > 0 && (
        <div className="mb-12">
          <h3 className="font-display text-lg font-bold text-espresso-dark mb-6 text-center">
            {t("earn.title")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {earnActions.map((action) => (
              <Card
                key={action.id}
                hover
                className="p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center shrink-0">
                  <DynamicIcon
                    name={action.icon}
                    size={20}
                    className="text-mint"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-chocolate">
                    {localized(action, "title", locale)}
                  </p>
                  {action.description && (
                    <p className="text-xs text-chocolate/50">
                      {localized(action, "description", locale)}
                    </p>
                  )}
                </div>
                {action.points_amount && (
                  <span className="text-xs font-bold text-mint bg-mint/10 px-2.5 py-1 rounded-full shrink-0">
                    {action.points_amount}
                  </span>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* How to spend points */}
      {spendActions.length > 0 && (
        <div className="mb-12">
          <h3 className="font-display text-lg font-bold text-espresso-dark mb-6 text-center">
            {t("spend.title")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {spendActions.map((action) => (
              <Card key={action.id} hover className="p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-caramel/10 flex items-center justify-center mx-auto mb-3">
                  <DynamicIcon
                    name={action.icon}
                    size={24}
                    className="text-caramel"
                  />
                </div>
                <p className="font-medium text-chocolate">
                  {localized(action, "title", locale)}
                </p>
                {action.description && (
                  <p className="text-xs text-chocolate/50 mt-1">
                    {localized(action, "description", locale)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Card className="p-6 sm:p-8 text-center bg-gradient-to-r from-espresso to-espresso-light text-white border-none">
        <Send size={32} className="mx-auto mb-3 opacity-80" />
        <h3 className="font-display text-xl font-bold mb-2">
          {t("cta.title")}
        </h3>
        <p className="text-white/70 mb-5 text-sm">{t("cta.subtitle")}</p>
        <Button variant="caramel" href="https://t.me/vendhub_bot">
          {t("cta.button")}
        </Button>
      </Card>
    </div>
  );
}
