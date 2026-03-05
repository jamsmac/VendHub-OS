import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { localized } from "@/lib/localize";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { Machine } from "@/lib/types";
import { MACHINE_TYPE_META, type MachineType } from "@/lib/machineTypeMeta";

interface MachineCardProps {
  machine: Machine;
  distFormatted: string | null;
  onClick: () => void;
}

export default function MachineCard({
  machine,
  distFormatted,
  onClick,
}: MachineCardProps) {
  const t = useTranslations("machines");
  const locale = useLocale();
  const typeMeta = MACHINE_TYPE_META[machine.type as MachineType];
  const machineAddress = localized(machine, "address", locale);

  return (
    <Card hover onClick={onClick}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-xl bg-foam border border-espresso/10 overflow-hidden shrink-0">
              {machine.image_url ? (
                <Image
                  src={machine.image_url}
                  alt={machine.name}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : typeMeta?.imageSrc ? (
                <Image
                  src={typeMeta.imageSrc}
                  alt={t(`typeAlt.${machine.type}`)}
                  fill
                  sizes="44px"
                  className="object-contain p-1"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-lg">
                  {typeMeta?.emoji ?? "\u2615"}
                </span>
              )}
            </div>
            <h3 className="font-medium text-chocolate truncate">
              {machine.name}
            </h3>
          </div>
          <Badge
            variant={
              machine.status === "online" ? "status-online" : "status-offline"
            }
            className="shrink-0 ml-2"
          >
            {machine.status === "online" ? t("card.online") : t("card.offline")}
          </Badge>
        </div>

        {machine.has_promotion && (
          <div className="mb-2">
            <Badge variant="promo">{t("card.promotion")}</Badge>
          </div>
        )}

        <p className="text-sm text-chocolate/60 mb-3">{machineAddress}</p>

        {/* Stats row */}
        <div className="text-xs text-chocolate/50 mb-4">
          {"\u2B50"} {machine.rating} ({machine.review_count}) {"\u00B7"}{" "}
          {machine.product_count} {t("card.items")} {"\u00B7"} {machine.hours}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-espresso font-medium">
            {t("card.openLocation")}
          </div>
          {distFormatted && (
            <span className="text-xs text-chocolate/40 bg-foam px-2 py-0.5 rounded-full">
              {t("card.distance", { distance: distFormatted })}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
