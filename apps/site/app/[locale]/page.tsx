import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";
import QuickActions from "@/components/sections/QuickActions";
import PopularProducts from "@/components/sections/PopularProducts";
import PromoBanner from "@/components/sections/PromoBanner";
import WhyVendHub from "@/components/sections/WhyVendHub";
import MachinesSection from "@/components/sections/MachinesSection";
import MenuSection from "@/components/sections/MenuSection";
import BenefitsSection from "@/components/sections/BenefitsSection";
import LoyaltyTab from "@/components/benefits/LoyaltyTab";
import PartnerSection from "@/components/sections/PartnerSection";
import AboutSection from "@/components/sections/AboutSection";
import {
  fetchPublicPromotions,
  fetchPublicStats,
  fetchPublicContent,
  fetchPublicPartners,
  fetchPublicMachineTypes,
  fetchPublicSiteCms,
} from "@/lib/api-client";
import {
  partners as fallbackPartners,
  machines as fallbackMachines,
  promotions as fallbackPromotions,
  siteContent as fallbackContent,
  partnershipModels as fallbackModels,
} from "@/lib/data";
import type {
  Partner,
  Machine,
  MachineTypeDetail,
  Promotion,
  PartnershipModel,
} from "@/lib/types";

export default async function Home() {
  // Fetch from VendHub API (with ISR caching) + static data fallbacks
  const [
    apiStats,
    apiPromotions,
    apiContent,
    apiPartners,
    apiMachines,
    apiMachineTypes,
    apiPromos,
    apiModels,
  ] = await Promise.all([
    fetchPublicStats(),
    fetchPublicPromotions(),
    fetchPublicContent(),
    fetchPublicPartners(),
    fetchPublicSiteCms("machines"),
    fetchPublicMachineTypes(),
    fetchPublicSiteCms("promotions"),
    fetchPublicSiteCms("partnership_models"),
  ]);

  // Build CMS data — prefer API, fall back to static data
  const allCms: Record<string, Record<string, string>> = {};
  if (apiContent && Object.keys(apiContent).length > 0) {
    // API returns grouped content: { hero: [...], stats: [...], about: [...] }
    for (const [section, articles] of Object.entries(apiContent)) {
      if (!allCms[section]) allCms[section] = {};
      for (const article of articles) {
        allCms[section][article.slug] = article.content;
      }
    }
  } else {
    // Fallback to static data
    for (const item of fallbackContent) {
      if (!allCms[item.section]) allCms[item.section] = {};
      allCms[item.section][item.key] = item.value;
    }
  }

  const statsCmsData = allCms["stats"] ?? {};

  // Override stats with real API data if available
  if (apiStats) {
    statsCmsData["machines_count"] = apiStats.totalMachines.toString();
    statsCmsData["products_count"] = apiStats.totalProducts.toString();
    statsCmsData["orders_count"] = apiStats.totalOrders.toString();
    statsCmsData["avg_rating"] = apiStats.avgRating.toString();
  } else {
    const machineCount = apiMachines.length;
    if (machineCount > 0) {
      statsCmsData["machines_count"] = machineCount.toString();
    }
  }

  const partnerList = (
    apiPartners.length > 0 ? apiPartners : fallbackPartners
  ) as Partner[];
  const machineList = (
    apiMachines.length > 0 ? apiMachines : fallbackMachines
  ) as Machine[];
  const machineTypeList = apiMachineTypes as unknown as MachineTypeDetail[];

  // Promotions: prefer API, fall back to CMS, fall back to static
  const apiPromosMapped: Promotion[] = (apiPromotions ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    description: p.description ?? "",
    discount_type: p.discountType,
    discount_value: p.discountValue,
    min_order_amount: p.minOrderAmount ?? 0,
    valid_from: p.validFrom,
    valid_until: p.validUntil,
    is_active: true,
    sort_order: 0,
  })) as unknown as Promotion[];

  const promoList =
    apiPromosMapped.length > 0
      ? apiPromosMapped
      : ((apiPromos.length > 0
          ? apiPromos
          : fallbackPromotions) as Promotion[]);

  const modelList = (
    apiModels.length > 0 ? apiModels : fallbackModels
  ) as PartnershipModel[];

  return (
    <>
      <Header />
      <main id="main" className="min-h-screen bg-cream">
        <HeroSection />
        <StatsSection cmsData={statsCmsData} />
        <QuickActions />
        <PopularProducts />
        <PromoBanner promo={promoList[0] ?? null} />
        <WhyVendHub />

        <MachinesSection
          initialMachines={machineList}
          initialMachineTypes={machineTypeList}
        />
        <MenuSection />

        <BenefitsSection loyaltyTab={<LoyaltyTab />} promotions={promoList} />
        <PartnerSection partners={partnerList} models={modelList} />
        <AboutSection />
      </main>
      <Footer />
    </>
  );
}
