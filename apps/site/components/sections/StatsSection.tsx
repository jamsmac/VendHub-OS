import { getTranslations } from "next-intl/server";
import Card from "@/components/ui/Card";

const STATS = [
  {
    emoji: "\u2615",
    dbKey: "machines_count",
    valueKey: "machinesValue",
    labelKey: "machines",
    accent: "bg-orange-50",
  },
  {
    emoji: "\uD83E\uDD64",
    dbKey: "drinks_count",
    valueKey: "drinksValue",
    labelKey: "drinks",
    accent: "bg-amber-50",
  },
  {
    emoji: "\uD83D\uDCCA",
    dbKey: "orders_count",
    valueKey: "ordersValue",
    labelKey: "orders",
    accent: "bg-emerald-50",
  },
  {
    emoji: "\u2B50",
    dbKey: "rating",
    valueKey: "ratingValue",
    labelKey: "rating",
    accent: "bg-yellow-50",
  },
] as const;

interface StatsSectionProps {
  cmsData: Record<string, string>;
}

export default async function StatsSection({ cmsData }: StatsSectionProps) {
  const t = await getTranslations("stats");
  const dbValues = cmsData;

  return (
    <section aria-label={t("ariaLabel")} className="relative -mt-8 z-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <Card key={stat.labelKey} hover className="p-6 text-center">
              <div
                className={`w-12 h-12 rounded-full ${stat.accent} flex items-center justify-center mx-auto text-2xl`}
              >
                {stat.emoji}
              </div>
              <div className="text-3xl font-bold text-espresso-dark mt-3">
                {dbValues[stat.dbKey] ?? t(stat.valueKey)}
              </div>
              <div className="text-sm text-chocolate/60 mt-1">
                {t(stat.labelKey)}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
