import { Coffee, MapPin, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Card from "@/components/ui/Card";

const ACTIONS = [
  {
    icon: Coffee,
    iconBg: "bg-espresso text-white",
    titleKey: "catalog",
    descKey: "catalogDesc",
    href: "#menu",
    hoverBorder: "hover:border-espresso/25",
  },
  {
    icon: MapPin,
    iconBg: "bg-caramel text-white",
    titleKey: "machines",
    descKey: "machinesDesc",
    href: "#map",
    hoverBorder: "hover:border-caramel/40",
  },
] as const;

export default async function QuickActions() {
  const t = await getTranslations("quickActions");

  return (
    <section
      aria-label={t("ariaLabel")}
      className="max-w-3xl mx-auto mt-12 px-4"
    >
      <div className="grid grid-cols-2 gap-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <a key={action.titleKey} href={action.href} className="block">
              <Card hover className={`p-5 ${action.hoverBorder}`}>
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-full ${action.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-chocolate">
                      {t(action.titleKey)}
                    </div>
                    <div className="text-sm text-chocolate/60">
                      {t(action.descKey)}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-chocolate/30 shrink-0"
                  />
                </div>
              </Card>
            </a>
          );
        })}
      </div>
    </section>
  );
}
