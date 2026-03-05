import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #3E2723 0%, #5D4037 50%, #795548 100%)",
        fontFamily: "sans-serif",
      }}
    >
      {/* Logo circle */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          background: "#D4A574",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 56,
          marginBottom: 32,
        }}
      >
        ☕
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "#FDF8F3",
          letterSpacing: -1,
        }}
      >
        VendHub
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 28,
          color: "#E8C9A8",
          marginTop: 12,
        }}
      >
        {t("ogSubtitle")}
      </div>

      {/* Stats line */}
      <div
        style={{
          display: "flex",
          gap: 48,
          marginTop: 40,
          fontSize: 20,
          color: "#FDF8F3",
          opacity: 0.8,
        }}
      >
        <span>☕ {t("ogStatBeverages")}</span>
        <span>📍 {t("ogStatMachines")}</span>
        <span>⭐ {t("ogStatRating")}</span>
      </div>

      {/* Domain */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          fontSize: 18,
          color: "#D4A574",
        }}
      >
        vendhub.uz
      </div>
    </div>,
    { ...size },
  );
}
