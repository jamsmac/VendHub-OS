"use client";

import { useState, useMemo } from "react";
import { Search, X, LocateFixed, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { localized } from "@/lib/localize";
import { useModal } from "@/lib/modal-context";
import type { Machine } from "@/lib/types";
import { useGeolocation } from "@/lib/useGeolocation";
import { sortByDistance, formatDistance } from "@/lib/geo";
import type { MachineWithDistance } from "@/lib/geo";
import type { MachineTypeDetail } from "@/lib/types";
import { MACHINE_TYPE_META } from "@/lib/machineTypeMeta";
import SectionHeader from "@/components/ui/SectionHeader";
import Pill from "@/components/ui/Pill";
import LeafletMap from "@/components/map/DynamicMap";
import MachineCard from "@/components/machines/MachineCard";
import MachineTypesTab from "@/components/machines/MachineTypesTab";

type Tab = "map" | "types";
type StatusFilter = "all" | "online" | "promo";
type TypeFilter = "all" | "coffee" | "snack" | "cold";

interface MachinesSectionProps {
  initialMachines: Machine[];
  initialMachineTypes: MachineTypeDetail[];
}

export default function MachinesSection({
  initialMachines,
  initialMachineTypes,
}: MachinesSectionProps) {
  const { openMachineModal } = useModal();
  const t = useTranslations("machines");
  const locale = useLocale();
  const geo = useGeolocation();
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortNearest, setSortNearest] = useState(false);
  const machines = initialMachines;
  const machineTypes = initialMachineTypes;

  const fallbackMachineTypes = useMemo<MachineTypeDetail[]>(
    () => [
      {
        id: "fallback-coffee",
        slug: "coffee",
        name: t("types.coffeeMachine"),
        model_name: "JQ-002-A",
        description: "",
        hero_image_url: MACHINE_TYPE_META.coffee.imageSrc,
        specs: [
          { label: t("types.dimensions"), value: t("types.dimensionsValue") },
          { label: t("types.display"), value: t("types.displayValue") },
          { label: t("types.payment"), value: t("types.paymentValue") },
          { label: t("types.features"), value: t("types.featuresValue") },
        ],
        advantages: [],
        gallery_images: [],
        is_active: true,
        badge: null,
        sort_order: 1,
        created_at: "",
        updated_at: "",
      },
      {
        id: "fallback-snack",
        slug: "snack",
        name: t("types.snackMachine"),
        model_name: "TCN CSC-8C(V49)",
        description: "",
        hero_image_url: MACHINE_TYPE_META.snack.imageSrc,
        specs: [
          {
            label: t("types.dimensions"),
            value: t("types.snackDimensionsValue"),
          },
          { label: t("types.display"), value: t("types.snackDisplayValue") },
          { label: t("types.payment"), value: t("types.snackPaymentValue") },
          { label: t("types.features"), value: t("types.snackFeaturesValue") },
        ],
        advantages: [],
        gallery_images: [],
        is_active: true,
        badge: null,
        sort_order: 2,
        created_at: "",
        updated_at: "",
      },
      {
        id: "fallback-cold",
        slug: "cold",
        name: t("types.coldDrinks"),
        model_name: "JS-001-A01",
        description: "",
        hero_image_url: MACHINE_TYPE_META.cold.imageSrc,
        specs: [
          {
            label: t("types.dimensions"),
            value: t("types.coldDimensionsValue"),
          },
          { label: t("types.display"), value: t("types.coldDisplayValue") },
          { label: t("types.payment"), value: t("types.coldPaymentValue") },
          { label: t("types.features"), value: t("types.coldFeaturesValue") },
        ],
        advantages: [],
        gallery_images: [],
        is_active: true,
        badge: null,
        sort_order: 3,
        created_at: "",
        updated_at: "",
      },
    ],
    [t],
  );

  const resolvedMachineTypes = useMemo(() => {
    const bySlug = new Map<string, MachineTypeDetail>();

    fallbackMachineTypes.forEach((mt) => bySlug.set(mt.slug, mt));

    machineTypes.forEach((mt) => {
      const base = bySlug.get(mt.slug);

      bySlug.set(mt.slug, {
        ...(base ?? mt),
        ...mt,
        model_name: mt.model_name ?? base?.model_name ?? null,
        hero_image_url: mt.hero_image_url ?? base?.hero_image_url ?? null,
        specs: mt.specs?.length ? mt.specs : (base?.specs ?? []),
        advantages: mt.advantages?.length
          ? mt.advantages
          : (base?.advantages ?? []),
        gallery_images: mt.gallery_images?.length
          ? mt.gallery_images
          : (base?.gallery_images ?? []),
      });
    });

    return Array.from(bySlug.values()).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
  }, [fallbackMachineTypes, machineTypes]);

  const hasLocation = geo.latitude != null && geo.longitude != null;
  const userLocation = useMemo(
    () => (hasLocation ? { lat: geo.latitude!, lng: geo.longitude! } : null),
    [hasLocation, geo.latitude, geo.longitude],
  );

  const totalCount = machines.length;
  const onlineCount = machines.filter((m) => m.status === "online").length;
  const promoCount = machines.filter((m) => m.has_promotion).length;
  const coffeeCount = machines.filter((m) => m.type === "coffee").length;
  const snackCount = machines.filter((m) => m.type === "snack").length;
  const coldCount = machines.filter((m) => m.type === "cold").length;

  const filteredMachines: MachineWithDistance[] = useMemo(() => {
    const result = machines.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const addr = localized(m, "address", locale);
        if (
          !m.name.toLowerCase().includes(q) &&
          !addr.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter === "online" && m.status !== "online") return false;
      if (statusFilter === "promo" && !m.has_promotion) return false;
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      return true;
    });

    if (sortNearest && userLocation) {
      return sortByDistance(result, userLocation.lat, userLocation.lng);
    }

    return result as MachineWithDistance[];
  }, [
    machines,
    searchQuery,
    statusFilter,
    typeFilter,
    userLocation,
    sortNearest,
    locale,
  ]);

  return (
    <section id="map" className="section-padding relative z-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t("title")}
          subtitle={t("onlineCount", {
            online: onlineCount,
            total: totalCount,
          })}
        />

        {/* Tab switcher */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={[
              "px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              activeTab === "map"
                ? "bg-espresso-dark text-cream shadow-md"
                : "bg-foam text-espresso/50 hover:bg-espresso/10",
            ].join(" ")}
          >
            {t("tabs.map")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("types")}
            className={[
              "px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              activeTab === "types"
                ? "bg-espresso-dark text-cream shadow-md"
                : "bg-foam text-espresso/50 hover:bg-espresso/10",
            ].join(" ")}
          >
            {t("tabs.types")}
          </button>
        </div>

        {activeTab === "map" && (
          <>
            {/* Search + geolocation */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso/30"
                />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-foam border border-espresso/10 pl-11 pr-10 py-3 text-sm text-chocolate placeholder:text-espresso/30 focus:outline-none focus:border-espresso/30 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t("clearSearch")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-espresso/30 hover:text-espresso/60 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  geo.requestLocation();
                  setSortNearest(true);
                }}
                disabled={geo.loading}
                className={[
                  "shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border",
                  hasLocation
                    ? "bg-espresso-dark text-cream border-espresso-dark"
                    : "bg-foam text-espresso/70 border-espresso/10 hover:border-espresso/30",
                ].join(" ")}
                title={t("myLocation")}
              >
                {geo.loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <LocateFixed size={18} />
                )}
                <span className="hidden sm:inline">{t("myLocation")}</span>
              </button>
            </div>
            {geo.error && (
              <p className="text-sm text-red-500 mb-4">{t("locationError")}</p>
            )}

            {/* Status filter pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              <Pill
                label={t("filters.all")}
                count={totalCount}
                active={statusFilter === "all" && !sortNearest}
                onClick={() => {
                  setStatusFilter("all");
                  setSortNearest(false);
                }}
              />
              {hasLocation && (
                <Pill
                  icon={<LocateFixed size={14} />}
                  label={t("nearest")}
                  active={sortNearest}
                  onClick={() => setSortNearest(!sortNearest)}
                />
              )}
              <Pill
                label={t("filters.online")}
                count={onlineCount}
                active={statusFilter === "online"}
                onClick={() => setStatusFilter("online")}
              />
              <Pill
                label={t("filters.promotion")}
                count={promoCount}
                active={statusFilter === "promo"}
                onClick={() => setStatusFilter("promo")}
              />
            </div>

            {/* Type filter pills */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              <Pill
                icon={"\u2615"}
                label={t("filters.coffee")}
                count={coffeeCount}
                active={typeFilter === "coffee" || typeFilter === "all"}
                onClick={() =>
                  setTypeFilter(typeFilter === "coffee" ? "all" : "coffee")
                }
              />
              {snackCount > 0 && (
                <Pill
                  icon={"\uD83C\uDF6A"}
                  label={t("filters.snack")}
                  count={snackCount}
                  active={typeFilter === "snack"}
                  onClick={() =>
                    setTypeFilter(typeFilter === "snack" ? "all" : "snack")
                  }
                />
              )}
              {coldCount > 0 && (
                <Pill
                  icon={"\uD83E\uDDCA"}
                  label={t("filters.cold")}
                  count={coldCount}
                  active={typeFilter === "cold"}
                  onClick={() =>
                    setTypeFilter(typeFilter === "cold" ? "all" : "cold")
                  }
                />
              )}
            </div>

            {/* Map */}
            <LeafletMap
              machines={filteredMachines}
              onMachineClick={(machine) => {
                const m = machine as MachineWithDistance;
                const dist =
                  m.distance != null
                    ? formatDistance(m.distance, locale)
                    : null;
                openMachineModal(machine, dist);
              }}
              userLocation={userLocation}
            />

            {/* Machine cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMachines.map((machine) => {
                const dist = (machine as MachineWithDistance).distance;
                const distFormatted =
                  dist != null ? formatDistance(dist, locale) : null;

                return (
                  <MachineCard
                    key={machine.id}
                    machine={machine}
                    distFormatted={distFormatted}
                    onClick={() => openMachineModal(machine, distFormatted)}
                  />
                );
              })}
            </div>

            {filteredMachines.length === 0 && (
              <div className="text-center py-12">
                <Search
                  size={48}
                  className="mx-auto opacity-30 text-chocolate mb-3"
                />
                <p className="text-chocolate/60 font-medium">
                  {t("empty.title")}
                </p>
                <p className="text-chocolate/40 text-sm mt-1">
                  {t("empty.subtitle")}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "types" && (
          <MachineTypesTab
            machineTypes={resolvedMachineTypes}
            machines={machines}
          />
        )}
      </div>
    </section>
  );
}
