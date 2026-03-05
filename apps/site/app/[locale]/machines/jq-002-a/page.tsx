import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Monitor,
  Snowflake,
  ShieldCheck,
  CreditCard,
  Coffee,
  Gauge,
  Box,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function JQ002APage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <JQ002AContent />;
}

function JQ002AContent() {
  const t = useTranslations("machineModel");

  const specs = [
    { label: t("specs.model"), value: "JQ-002-A" },
    { label: t("specs.dimensions"), value: "730 × 730 × 1960 mm" },
    { label: t("specs.weight"), value: "~240 kg" },
    { label: t("specs.display"), value: t("specs.displayValue") },
    { label: t("specs.cupCapacity"), value: t("specs.cupCapacityValue") },
    { label: t("specs.beverages"), value: t("specs.beveragesValue") },
    { label: t("specs.canisters"), value: t("specs.canistersValue") },
    { label: t("specs.iceMaker"), value: t("specs.iceMakerValue") },
    { label: t("specs.payment"), value: t("specs.paymentValue") },
    { label: t("specs.power"), value: "220V / 50Hz" },
  ];

  const features = [
    {
      icon: <Monitor size={24} />,
      title: t("features.display"),
      description: t("features.displayDesc"),
    },
    {
      icon: <Snowflake size={24} />,
      title: t("features.iceMaker"),
      description: t("features.iceMakerDesc"),
    },
    {
      icon: <ShieldCheck size={24} />,
      title: t("features.uv"),
      description: t("features.uvDesc"),
    },
    {
      icon: <CreditCard size={24} />,
      title: t("features.payment"),
      description: t("features.paymentDesc"),
    },
    {
      icon: <Coffee size={24} />,
      title: t("features.beverages"),
      description: t("features.beveragesDesc"),
    },
    {
      icon: <Gauge size={24} />,
      title: t("features.capacity"),
      description: t("features.capacityDesc"),
    },
    {
      icon: <Box size={24} />,
      title: t("features.ownCup"),
      description: t("features.ownCupDesc"),
    },
    {
      icon: <Zap size={24} />,
      title: t("features.promo"),
      description: t("features.promoDesc"),
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Back navigation */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
          <Link
            href="/#map"
            className="inline-flex items-center gap-2 text-sm text-espresso/60 hover:text-espresso transition-colors"
          >
            <ArrowLeft size={16} />
            {t("back")}
          </Link>
        </div>

        {/* Hero section with machine image */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Image */}
            <div className="relative aspect-[3/4] max-w-sm mx-auto md:mx-0 bg-gradient-to-b from-foam to-cream rounded-3xl overflow-hidden">
              <Image
                src="/images/machines/jq-002-a-hero.webp"
                alt={t("imageAlt")}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-4"
                priority
              />
            </div>

            {/* Title & brief */}
            <div>
              <div className="inline-block px-3 py-1 text-xs font-medium bg-espresso/10 text-espresso rounded-full mb-4">
                {t("badge")}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-espresso-dark mb-4">
                JQ-002-A
              </h1>
              <p className="text-lg text-chocolate/70 mb-6">{t("subtitle")}</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-foam rounded-xl text-sm text-chocolate">
                  <Coffee size={16} className="text-espresso" />
                  {t("quickStats.beverages")}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-foam rounded-xl text-sm text-chocolate">
                  <Snowflake size={16} className="text-espresso" />
                  {t("quickStats.iceMaker")}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-foam rounded-xl text-sm text-chocolate">
                  <Monitor size={16} className="text-espresso" />
                  {t("quickStats.display")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Specs table */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="font-display text-2xl font-bold text-espresso-dark mb-6">
            {t("specsTitle")}
          </h2>
          <div className="bg-white rounded-2xl border border-espresso/5 overflow-hidden">
            {specs.map((spec, i) => (
              <div
                key={spec.label}
                className={[
                  "flex justify-between items-start px-5 py-4",
                  i < specs.length - 1 ? "border-b border-espresso/5" : "",
                ].join(" ")}
              >
                <span className="text-sm font-medium text-chocolate shrink-0 mr-4">
                  {spec.label}
                </span>
                <span className="text-sm text-chocolate/70 text-right">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Features grid */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="font-display text-2xl font-bold text-espresso-dark mb-6">
            {t("featuresTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-espresso/5 p-5 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-espresso/5 flex items-center justify-center text-espresso mb-3">
                  {feature.icon}
                </div>
                <h3 className="font-medium text-chocolate text-sm mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-chocolate/50">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="bg-gradient-to-r from-espresso-dark to-espresso rounded-2xl p-8 text-center">
            <h3 className="font-display text-xl font-bold text-cream mb-2">
              {t("cta.title")}
            </h3>
            <p className="text-cream/70 text-sm mb-6">{t("cta.subtitle")}</p>
            <Link
              href="/#map"
              className="inline-flex items-center gap-2 px-6 py-3 bg-caramel-dark text-white rounded-xl font-medium text-sm hover:bg-caramel transition-colors"
            >
              {t("cta.button")}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
