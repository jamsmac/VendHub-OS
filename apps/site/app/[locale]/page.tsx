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
import { supabase } from "@/lib/supabase";
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
  const [
    cmsResult,
    partnersResult,
    machinesResult,
    machineTypesResult,
    promosResult,
    modelsResult,
  ] = await Promise.all([
    supabase.from("site_content").select("section, key, value"),
    supabase
      .from("partners")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from("machines").select("*").order("name"),
    supabase
      .from("machine_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("partnership_models")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  // Group all CMS content by section
  const allCms: Record<string, Record<string, string>> = {};
  const cmsRows = cmsResult.data?.length ? cmsResult.data : fallbackContent;
  for (const item of cmsRows) {
    if (!allCms[item.section]) allCms[item.section] = {};
    allCms[item.section][item.key] = item.value;
  }
  const statsCmsData = allCms["stats"] ?? {};
  // Dynamic machine count — override CMS value with real count
  const machineCount = machinesResult.data?.length ?? 0;
  if (machineCount > 0) {
    statsCmsData["machines_count"] = machineCount.toString();
  }
  const partnerList = (
    partnersResult.data?.length ? partnersResult.data : fallbackPartners
  ) as Partner[];
  const machineList = (
    machinesResult.data?.length ? machinesResult.data : fallbackMachines
  ) as Machine[];
  const machineTypeList = (machineTypesResult.data ??
    []) as MachineTypeDetail[];
  const promoList = (
    promosResult.data?.length ? promosResult.data : fallbackPromotions
  ) as Promotion[];
  const modelList = (
    modelsResult.data?.length ? modelsResult.data : fallbackModels
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
