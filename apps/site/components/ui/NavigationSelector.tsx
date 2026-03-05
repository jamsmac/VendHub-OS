"use client";

import { useCallback } from "react";
import { X, Navigation, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

interface NavigationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

interface NavApp {
  key: string;
  icon: string;
  buildUrl: (lat: number, lng: number) => string;
}

const NAV_APPS: NavApp[] = [
  {
    key: "googleMaps",
    icon: "🗺️",
    buildUrl: (lat, lng) =>
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  },
  {
    key: "yandexMaps",
    icon: "🟡",
    buildUrl: (lat, lng) =>
      `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`,
  },
  {
    key: "twoGis",
    icon: "🟢",
    buildUrl: (lat, lng) => `https://2gis.ru/geo/${lng},${lat}`,
  },
  {
    key: "appleMaps",
    icon: "🍎",
    buildUrl: (lat, lng) => `http://maps.apple.com/?daddr=${lat},${lng}`,
  },
  {
    key: "waze",
    icon: "👻",
    buildUrl: (lat, lng) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  },
];

export default function NavigationSelector({
  isOpen,
  onClose,
  latitude,
  longitude,
  name,
  address,
}: NavigationSelectorProps) {
  const t = useTranslations("navigation");

  const handleNavClick = useCallback(
    (app: NavApp) => {
      const url = app.buildUrl(latitude, longitude);
      const win = window.open(url, "_blank");
      if (!win) {
        window.location.href = url;
      }
      onClose();
    },
    [latitude, longitude, onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-selector-title"
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-espresso/10">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-espresso" />
            <h3 id="nav-selector-title" className="font-medium text-chocolate">
              {t("title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="p-1 rounded-lg hover:bg-foam transition-colors"
          >
            <X size={18} className="text-chocolate/40" />
          </button>
        </div>

        {/* Destination info */}
        <div className="px-4 py-3 bg-foam/50">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-espresso mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-chocolate truncate">
                {name}
              </div>
              <div className="text-xs text-chocolate/50 truncate">
                {address}
              </div>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-chocolate/40">{t("subtitle")}</p>
        </div>

        {/* Navigation apps */}
        <div className="p-4 space-y-2">
          {NAV_APPS.map((app) => (
            <button
              key={app.key}
              type="button"
              onClick={() => handleNavClick(app)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-foam hover:bg-espresso/5 transition-colors text-left"
            >
              <span className="text-xl w-8 text-center">{app.icon}</span>
              <span className="text-sm font-medium text-chocolate">
                {t(app.key)}
              </span>
            </button>
          ))}
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-2 sm:hidden" />
      </div>
    </div>
  );
}
