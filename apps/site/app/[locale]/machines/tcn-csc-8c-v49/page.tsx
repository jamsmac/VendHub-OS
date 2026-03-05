import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Monitor,
  Snowflake,
  CreditCard,
  Box,
  ShieldCheck,
  Zap,
  Wifi,
  Building2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TCNCSC8CV49Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TCNCSC8CV49Content locale={locale} />;
}

function TCNCSC8CV49Content({ locale }: { locale: string }) {
  const t = useTranslations("machineModelSnack");

  const specs = [
    { label: t("specs.model"), value: "TCN-CSC-8C(V49)" },
    { label: t("specs.type"), value: t("specs.typeValue") },
    { label: t("specs.display"), value: t("specs.displayValue") },
    { label: t("specs.dimensions"), value: "1940 × 1042 × 890 mm" },
    { label: t("specs.weight"), value: "330 kg" },
    { label: t("specs.slots"), value: t("specs.slotsValue") },
    { label: t("specs.shelves"), value: "6" },
    { label: t("specs.capacity"), value: "~240" },
    { label: t("specs.dispense"), value: t("specs.dispenseValue") },
    { label: t("specs.temperature"), value: "+4°C ... +25°C" },
    { label: t("specs.powerCool"), value: "458 W" },
    { label: t("specs.powerNormal"), value: "60 W" },
    { label: t("specs.powerSupply"), value: "100V–240V, 50/60 Hz" },
    { label: t("specs.payment"), value: t("specs.paymentValue") },
    { label: t("specs.protocol"), value: "MDB / DEX" },
    { label: t("specs.warranty"), value: t("specs.warrantyValue") },
  ];

  const features = [
    {
      icon: <Monitor size={24} />,
      title: t("features.screen"),
      description: t("features.screenDesc"),
    },
    {
      icon: <Snowflake size={24} />,
      title: t("features.cooling"),
      description: t("features.coolingDesc"),
    },
    {
      icon: <ShieldCheck size={24} />,
      title: t("features.sensor"),
      description: t("features.sensorDesc"),
    },
    {
      icon: <CreditCard size={24} />,
      title: t("features.payment"),
      description: t("features.paymentDesc"),
    },
    {
      icon: <Wifi size={24} />,
      title: t("features.cloud"),
      description: t("features.cloudDesc"),
    },
    {
      icon: <Box size={24} />,
      title: t("features.capacity"),
      description: t("features.capacityDesc"),
    },
    {
      icon: <Building2 size={24} />,
      title: t("features.cabinet"),
      description: t("features.cabinetDesc"),
    },
    {
      icon: <Zap size={24} />,
      title: t("features.efficiency"),
      description: t("features.efficiencyDesc"),
    },
  ];

  const applications = [
    t("applications.banks"),
    t("applications.supermarkets"),
    t("applications.airports"),
    t("applications.stations"),
    t("applications.hospitals"),
    t("applications.malls"),
    t("applications.parks"),
    t("applications.offices"),
    t("applications.hotels"),
    t("applications.metro"),
    t("applications.schools"),
    t("applications.pharmacies"),
  ];

  const gallery = [
    "/images/machines/tcn-csc-8c-v49-gallery-2.jpg",
    "/images/machines/tcn-csc-8c-v49-gallery-3.jpg",
    "/images/machines/tcn-csc-8c-v49-gallery-4.jpg",
    "/images/machines/tcn-csc-8c-v49-gallery-5.jpg",
    "/images/machines/tcn-csc-8c-v49-gallery-6.jpg",
    "/images/machines/tcn-csc-8c-v49-dimensions.jpg",
    "/images/machines/tcn-csc-8c-v49-details.jpg",
    "/images/machines/tcn-csc-8c-v49-features.jpg",
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
          <Link
            href={`/${locale}/#map`}
            className="inline-flex items-center gap-2 text-sm text-espresso/60 hover:text-espresso transition-colors"
          >
            <ArrowLeft size={16} />
            {t("back")}
          </Link>
        </div>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="relative aspect-square max-w-md mx-auto md:mx-0 bg-white rounded-3xl border border-espresso/5 overflow-hidden">
              <Image
                src="/images/machines/tcn-csc-8c-v49-hero.jpg"
                alt={t("imageAlt")}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-4"
                priority
              />
            </div>

            <div>
              <div className="inline-block px-3 py-1 text-xs font-medium bg-espresso/10 text-espresso rounded-full mb-4">
                {t("badge")}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-espresso-dark mb-4">
                TCN CSC-8C(V49)
              </h1>
              <p className="text-lg text-chocolate/70 mb-6">{t("subtitle")}</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-foam rounded-xl text-sm text-chocolate">
                  <Monitor size={16} className="text-espresso" />
                  {t("quickStats.screen")}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-foam rounded-xl text-sm text-chocolate">
                  <Box size={16} className="text-espresso" />
                  {t("quickStats.capacity")}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-foam rounded-xl text-sm text-chocolate">
                  <Snowflake size={16} className="text-espresso" />
                  {t("quickStats.temperature")}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="font-display text-2xl font-bold text-espresso-dark mb-6">
            {t("descriptionTitle")}
          </h2>
          <div className="bg-white rounded-2xl border border-espresso/5 p-5 sm:p-6 space-y-4">
            <p className="text-sm sm:text-base text-chocolate/75 leading-relaxed">
              {t("descriptionShort")}
            </p>
            <p className="text-sm sm:text-base text-chocolate/70 leading-relaxed">
              {t("descriptionLong")}
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
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

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
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

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="font-display text-2xl font-bold text-espresso-dark mb-6">
            {t("applicationsTitle")}
          </h2>
          <div className="bg-white rounded-2xl border border-espresso/5 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-chocolate/70">
              {applications.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-caramel-dark shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="font-display text-2xl font-bold text-espresso-dark mb-6">
            {t("galleryTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gallery.map((src, index) => (
              <div
                key={src}
                className="relative aspect-square bg-white border border-espresso/5 rounded-2xl overflow-hidden"
              >
                <Image
                  src={src}
                  alt={`${t("galleryAltPrefix")} ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-contain p-2"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="bg-gradient-to-r from-espresso-dark to-espresso rounded-2xl p-8 text-center">
            <h3 className="font-display text-xl font-bold text-cream mb-2">
              {t("cta.title")}
            </h3>
            <p className="text-cream/70 text-sm mb-6">{t("cta.subtitle")}</p>
            <Link
              href={`/${locale}/#map`}
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
