import { getTranslations } from "next-intl/server";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

const REASONS = [
  {
    emoji: "\u2615",
    titleKey: "drinks",
    descKey: "drinksDesc",
    accent: "bg-amber-100",
  },
  {
    emoji: "\uD83D\uDCCD",
    titleKey: "machines",
    descKey: "machinesDesc",
    accent: "bg-blue-100",
  },
  {
    emoji: "\uD83C\uDF81",
    titleKey: "loyalty",
    descKey: "loyaltyDesc",
    accent: "bg-purple-100",
  },
  {
    emoji: "\u26A1",
    titleKey: "order",
    descKey: "orderDesc",
    accent: "bg-yellow-100",
  },
] as const;

export default async function WhyVendHub() {
  const t = await getTranslations("whyVendHub");

  return (
    <section className="mt-16 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeader title={t("title")} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REASONS.map((reason) => (
            <Card key={reason.titleKey} hover className="p-6">
              <div
                className={`w-12 h-12 rounded-xl ${reason.accent} flex items-center justify-center text-2xl`}
              >
                {reason.emoji}
              </div>
              <h3 className="font-bold text-chocolate mt-4">
                {t(reason.titleKey)}
              </h3>
              <p className="text-sm text-chocolate/60 mt-2">
                {t(reason.descKey)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
