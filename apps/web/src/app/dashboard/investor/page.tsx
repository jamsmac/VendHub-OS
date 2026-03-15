"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MapPin,
  Activity,
  Shield,
  Award,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Percent,
  BarChart3,
  FileText,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Coffee,
  ChevronDown,
  ChevronRight,
  Banknote,
  Scale,
  Search,
  Zap,
} from "lucide-react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useInvestorDashboard } from "@/lib/hooks";
import { useTranslations } from "next-intl";

const investorData = {
  name: "Investment Fund Alpha",
  sharePercent: 15,
  totalInvested: 500_000_000,
  currentValue: 687_500_000,
  totalReturn: 232_500_000,
  roiPercent: 46.5,
  irr: 38.2,
  paybackMonths: 14,
  totalDividends: 45_000_000,
};

const topLocations = [
  {
    name: 'TC "Navruz"',
    machines: 8,
    revenue: "45.7M",
    roi: 156,
    trend: "up" as const,
    dailyAvg: "152K",
    margin: 68.2,
  },
  {
    name: 'BC "Poytakht"',
    machines: 5,
    revenue: "38.9M",
    roi: 142,
    trend: "up" as const,
    dailyAvg: "130K",
    margin: 65.1,
  },
  {
    name: "INHA University",
    machines: 12,
    revenue: "35.4M",
    roi: 128,
    trend: "stable" as const,
    dailyAvg: "118K",
    margin: 62.4,
  },
  {
    name: "Tashkent Airport",
    machines: 6,
    revenue: "32.1M",
    roi: 118,
    trend: "up" as const,
    dailyAvg: "107K",
    margin: 58.9,
  },
  {
    name: 'TC "Mega Planet"',
    machines: 10,
    revenue: "28.5M",
    roi: 105,
    trend: "down" as const,
    dailyAvg: "95K",
    margin: 55.3,
  },
  {
    name: "Tashkent City",
    machines: 4,
    revenue: "26.8M",
    roi: 134,
    trend: "up" as const,
    dailyAvg: "89K",
    margin: 67.8,
  },
  {
    name: "IT Park",
    machines: 3,
    revenue: "22.4M",
    roi: 122,
    trend: "up" as const,
    dailyAvg: "75K",
    margin: 64.2,
  },
];

const dividends = [
  {
    period: "Q4 2025",
    date: "15.01.2026",
    amount: 15_000_000,
    status: "paid" as const,
    yield: 3.0,
  },
  {
    period: "Q3 2025",
    date: "15.10.2025",
    amount: 12_500_000,
    status: "paid" as const,
    yield: 2.5,
  },
  {
    period: "Q2 2025",
    date: "15.07.2025",
    amount: 10_000_000,
    status: "paid" as const,
    yield: 2.0,
  },
  {
    period: "Q1 2025",
    date: "15.04.2025",
    amount: 7_500_000,
    status: "paid" as const,
    yield: 1.5,
  },
  {
    period: "Q1 2026",
    date: "15.04.2026",
    amount: 18_000_000,
    status: "scheduled" as const,
    yield: 3.6,
  },
];

const documents = [
  {
    name: "Annual Report 2025",
    date: "15.01.2026",
    type: "PDF",
    size: "2.4 MB",
    category: "financial" as const,
  },
  {
    name: "Financial Model 2026",
    date: "01.02.2026",
    type: "XLSX",
    size: "1.8 MB",
    category: "financial" as const,
  },
  {
    name: "Investor Presentation Q1",
    date: "10.01.2026",
    type: "PPTX",
    size: "5.2 MB",
    category: "reports" as const,
  },
  {
    name: "Ernst & Young Audit 2025",
    date: "20.02.2026",
    type: "PDF",
    size: "3.1 MB",
    category: "legal" as const,
  },
  {
    name: "Expansion Business Plan 2026-2027",
    date: "01.03.2026",
    type: "PDF",
    size: "4.6 MB",
    category: "reports" as const,
  },
  {
    name: "Main Investor Agreement",
    date: "01.01.2025",
    type: "PDF",
    size: "0.8 MB",
    category: "legal" as const,
  },
  {
    name: "Quarterly Report Q4 2025",
    date: "28.02.2026",
    type: "PDF",
    size: "3.2 MB",
    category: "reports" as const,
  },
  {
    name: "Financial Forecast 2026-2028",
    date: "15.02.2026",
    type: "XLSX",
    size: "2.1 MB",
    category: "financial" as const,
  },
];

const fundingRounds = [
  {
    name: "Seed",
    date: "01.03.2023",
    amount: 150_000_000,
    valuation: 600_000_000,
    investors: 3,
  },
  {
    name: "Series A",
    date: "15.09.2024",
    amount: 500_000_000,
    valuation: 2_500_000_000,
    investors: 8,
  },
];

const valuationHistory = [
  { quarter: "Q1 2024", valuation: 1_200_000_000 },
  { quarter: "Q2 2024", valuation: 1_650_000_000 },
  { quarter: "Q3 2024", valuation: 2_100_000_000 },
  { quarter: "Q4 2024", valuation: 2_400_000_000 },
  { quarter: "Q1 2025", valuation: 2_650_000_000 },
  { quarter: "Q2 2025", valuation: 2_950_000_000 },
  { quarter: "Q3 2025", valuation: 3_300_000_000 },
  { quarter: "Q4 2025", valuation: 4_583_333_333 },
];

const competitors = [
  {
    name: "VendHub",
    metrics: {
      machines: 156,
      coverage: "7 districts",
      avgCheck: "12.5K",
      monthlyRev: "118M",
      nps: 72,
    },
  },
  {
    name: "CoffeePro",
    metrics: {
      machines: 89,
      coverage: "4 districts",
      avgCheck: "11.2K",
      monthlyRev: "65M",
      nps: 58,
    },
  },
  {
    name: "SnackMaster",
    metrics: {
      machines: 67,
      coverage: "3 districts",
      avgCheck: "10.8K",
      monthlyRev: "52M",
      nps: 54,
    },
  },
  {
    name: "QuickBrew",
    metrics: {
      machines: 45,
      coverage: "2 districts",
      avgCheck: "10.5K",
      monthlyRev: "38M",
      nps: 51,
    },
  },
];

const RISK_COLORS = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const fmtShort = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(0)}K`
      : `${n}`;

const tabs = [
  "overview",
  "financial",
  "operations",
  "portfolio",
  "documents",
] as const;
type TabId = (typeof tabs)[number];
const _DOC_CATEGORIES = ["all", "financial", "legal", "reports"] as const;
type DocCategory = (typeof _DOC_CATEGORIES)[number];

export default function InvestorPage() {
  const { data: dbDashboard } = useInvestorDashboard();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const t = useTranslations("investor");

  // Wire API data into investor profile (fall back to mock)
  const liveInvestorData = dbDashboard
    ? {
        name: dbDashboard.profile.name,
        sharePercent: Number(dbDashboard.profile.sharePercent),
        totalInvested: Number(dbDashboard.profile.totalInvested),
        currentValue: dbDashboard.currentValue,
        totalReturn: dbDashboard.totalReturn,
        roiPercent: dbDashboard.roiPercent,
        irr: 0,
        paybackMonths: dbDashboard.profile.paybackMonths ?? 0,
        totalDividends: dbDashboard.totalDividends,
      }
    : investorData;
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [docCategory, setDocCategory] = useState<DocCategory>("all");
  const [docSearch, setDocSearch] = useState("");

  const filteredDocs = documents.filter((doc) => {
    const matchCategory = docCategory === "all" || doc.category === docCategory;
    const matchSearch = doc.name
      .toLowerCase()
      .includes(docSearch.toLowerCase());
    return matchCategory && matchSearch;
  });

  const TAB_LABELS: Record<TabId, string> = {
    overview: t("tabs.overview"),
    financial: t("tabs.financial"),
    operations: t("tabs.operations"),
    portfolio: t("tabs.portfolio"),
    documents: t("tabs.documents"),
  };

  const kpis = [
    {
      label: t("kpis.revenueYtd"),
      value: "847.2M",
      change: "+12.5%",
      trend: "up" as const,
      target: "900M",
      icon: DollarSign,
    },
    {
      label: t("kpis.netProfit"),
      value: "534.8M",
      change: "+14.5%",
      trend: "up" as const,
      target: "550M",
      icon: TrendingUp,
    },
    {
      label: t("kpis.machines"),
      value: "156",
      change: "+9.9%",
      trend: "up" as const,
      target: "180",
      icon: Coffee,
    },
    {
      label: t("kpis.transactionsPerDay"),
      value: "4 520",
      change: "+16.2%",
      trend: "up" as const,
      target: "5 000",
      icon: Activity,
    },
    {
      label: t("kpis.customers"),
      value: "2 847",
      change: "+8.3%",
      trend: "up" as const,
      target: "3 500",
      icon: Users,
    },
    {
      label: t("kpis.avgCheck"),
      value: "12 500",
      change: "+3.1%",
      trend: "up" as const,
      target: "14 000",
      icon: Banknote,
    },
  ];

  const monthlyData = [
    {
      month: t("months.jan"),
      revenue: 78.5,
      profit: 45.2,
      costs: 33.3,
      machines: 128,
      target: 80,
    },
    {
      month: t("months.feb"),
      revenue: 82.3,
      profit: 48.7,
      costs: 33.6,
      machines: 132,
      target: 82,
    },
    {
      month: t("months.mar"),
      revenue: 89.7,
      profit: 54.3,
      costs: 35.4,
      machines: 135,
      target: 85,
    },
    {
      month: t("months.apr"),
      revenue: 86.4,
      profit: 51.8,
      costs: 34.6,
      machines: 138,
      target: 85,
    },
    {
      month: t("months.may"),
      revenue: 91.2,
      profit: 56.4,
      costs: 34.8,
      machines: 140,
      target: 90,
    },
    {
      month: t("months.jun"),
      revenue: 95.8,
      profit: 59.2,
      costs: 36.6,
      machines: 142,
      target: 92,
    },
    {
      month: t("months.jul"),
      revenue: 102.3,
      profit: 64.5,
      costs: 37.8,
      machines: 145,
      target: 98,
    },
    {
      month: t("months.aug"),
      revenue: 98.7,
      profit: 61.2,
      costs: 37.5,
      machines: 148,
      target: 98,
    },
    {
      month: t("months.sep"),
      revenue: 104.5,
      profit: 66.8,
      costs: 37.7,
      machines: 150,
      target: 102,
    },
    {
      month: t("months.oct"),
      revenue: 108.9,
      profit: 69.4,
      costs: 39.5,
      machines: 152,
      target: 105,
    },
    {
      month: t("months.nov"),
      revenue: 112.4,
      profit: 72.6,
      costs: 39.8,
      machines: 154,
      target: 108,
    },
    {
      month: t("months.dec"),
      revenue: 118.2,
      profit: 78.3,
      costs: 39.9,
      machines: 156,
      target: 115,
    },
  ];

  const assetAllocation = [
    {
      category: t("assets.vendingMachines"),
      percent: 52,
      value: 357_500_000,
      color: "#f59e0b",
    },
    {
      category: t("assets.inventory"),
      percent: 19,
      value: 130_625_000,
      color: "#3b82f6",
    },
    {
      category: t("assets.cash"),
      percent: 15,
      value: 103_125_000,
      color: "#10b981",
    },
    {
      category: t("assets.receivables"),
      percent: 8,
      value: 55_000_000,
      color: "#8b5cf6",
    },
    {
      category: t("assets.otherAssets"),
      percent: 6,
      value: 41_250_000,
      color: "#6b7280",
    },
  ];

  const milestones = [
    {
      date: "Q1 2026",
      title: t("milestones.expand200"),
      status: "in_progress" as const,
      progress: 78,
      description: t("milestones.expand200Desc"),
    },
    {
      date: "Q2 2026",
      title: t("milestones.loyaltyV2"),
      status: "in_progress" as const,
      progress: 85,
      description: t("milestones.loyaltyV2Desc"),
    },
    {
      date: "Q3 2026",
      title: t("milestones.samarkandBukhara"),
      status: "planned" as const,
      progress: 15,
      description: t("milestones.samarkandBukharaDesc"),
    },
    {
      date: "Q4 2026",
      title: t("milestones.billionRevenue"),
      status: "planned" as const,
      progress: 0,
      description: t("milestones.billionRevenueDesc"),
    },
    {
      date: "Q1 2027",
      title: t("milestones.mobileApp"),
      status: "planned" as const,
      progress: 5,
      description: t("milestones.mobileAppDesc"),
    },
    {
      date: "Q2 2027",
      title: t("milestones.franchise"),
      status: "planned" as const,
      progress: 0,
      description: t("milestones.franchiseDesc"),
    },
  ];

  const risks = [
    {
      name: t("risks.operational"),
      level: "low" as const,
      score: 2.1,
      description: t("risks.operationalDesc"),
      mitigation: t("risks.operationalMitigation"),
    },
    {
      name: t("risks.market"),
      level: "medium" as const,
      score: 4.5,
      description: t("risks.marketDesc"),
      mitigation: t("risks.marketMitigation"),
    },
    {
      name: t("risks.financial"),
      level: "low" as const,
      score: 1.8,
      description: t("risks.financialDesc"),
      mitigation: t("risks.financialMitigation"),
    },
    {
      name: t("risks.regulatory"),
      level: "low" as const,
      score: 2.3,
      description: t("risks.regulatoryDesc"),
      mitigation: t("risks.regulatoryMitigation"),
    },
    {
      name: t("risks.technological"),
      level: "low" as const,
      score: 1.5,
      description: t("risks.technologicalDesc"),
      mitigation: t("risks.technologicalMitigation"),
    },
  ];

  const RISK_LABELS = {
    low: t("riskLevels.low"),
    medium: t("riskLevels.medium"),
    high: t("riskLevels.high"),
  };

  const exitScenarios = [
    {
      name: t("exitScenarios.conservative"),
      multiple: 3.5,
      timeline: t("exitScenarios.conservativeTimeline"),
      irr: 28,
      description: t("exitScenarios.conservativeDesc"),
    },
    {
      name: t("exitScenarios.moderate"),
      multiple: 5.2,
      timeline: t("exitScenarios.moderateTimeline"),
      irr: 42,
      description: t("exitScenarios.moderateDesc"),
    },
    {
      name: t("exitScenarios.aggressive"),
      multiple: 8.0,
      timeline: t("exitScenarios.aggressiveTimeline"),
      irr: 58,
      description: t("exitScenarios.aggressiveDesc"),
    },
  ];

  const pnlData = [
    { label: t("pnl.revenue"), value: 847.2, change: 12.5, color: "#f59e0b" },
    { label: t("pnl.cogs"), value: 313.5, change: 11.2, color: "#ef4444" },
    {
      label: t("pnl.grossMargin"),
      value: 533.7,
      change: 13.1,
      color: "#10b981",
    },
    { label: t("pnl.opex"), value: 245.8, change: 8.3, color: "#f59e0b" },
    { label: t("pnl.ebitda"), value: 287.9, change: 18.4, color: "#3b82f6" },
    {
      label: t("pnl.netProfit"),
      value: 187.3,
      change: 22.1,
      color: "#10b981",
    },
  ];

  const unitEconomics = [
    {
      label: t("unitEconomics.cac"),
      value: "2 500 UZS",
      benchmark: "2 000-3 000 UZS",
      status: "good" as const,
    },
    {
      label: t("unitEconomics.ltv"),
      value: "185 000 UZS",
      benchmark: "150 000-200 000 UZS",
      status: "good" as const,
    },
    {
      label: t("unitEconomics.ltvCacRatio"),
      value: "74x",
      benchmark: ">3x",
      status: "excellent" as const,
    },
    {
      label: t("unitEconomics.paybackPeriod"),
      value: t("unitEconomics.paybackPeriodValue"),
      benchmark: t("unitEconomics.paybackPeriodBenchmark"),
      status: "good" as const,
    },
  ];

  const cashflowData = [
    { month: t("months.jan"), operating: 45.2, investing: -12.5, financing: 0 },
    { month: t("months.feb"), operating: 48.7, investing: -15.3, financing: 0 },
    { month: t("months.mar"), operating: 54.3, investing: -18.6, financing: 0 },
    { month: t("months.apr"), operating: 51.8, investing: -14.2, financing: 0 },
    { month: t("months.may"), operating: 56.4, investing: -16.8, financing: 0 },
    { month: t("months.jun"), operating: 59.2, investing: -20.5, financing: 0 },
    { month: t("months.jul"), operating: 64.5, investing: -22.3, financing: 0 },
    { month: t("months.aug"), operating: 61.2, investing: -19.7, financing: 0 },
    { month: t("months.sep"), operating: 66.8, investing: -25.4, financing: 0 },
    { month: t("months.oct"), operating: 69.4, investing: -21.8, financing: 0 },
    { month: t("months.nov"), operating: 72.6, investing: -24.6, financing: 0 },
    { month: t("months.dec"), operating: 78.3, investing: -28.5, financing: 0 },
  ];

  const districts = [
    {
      name: t("districts.yunusabad"),
      machines: 28,
      penetration: 45,
      revenue: 156.7,
      trend: "up" as const,
    },
    {
      name: t("districts.mirabad"),
      machines: 22,
      penetration: 38,
      revenue: 128.4,
      trend: "up" as const,
    },
    {
      name: t("districts.shaykhantakhur"),
      machines: 19,
      penetration: 32,
      revenue: 112.3,
      trend: "stable" as const,
    },
    {
      name: t("districts.almazar"),
      machines: 18,
      penetration: 28,
      revenue: 105.6,
      trend: "up" as const,
    },
    {
      name: t("districts.sergeli"),
      machines: 15,
      penetration: 25,
      revenue: 89.2,
      trend: "down" as const,
    },
    {
      name: t("districts.tashkent"),
      machines: 12,
      penetration: 22,
      revenue: 78.5,
      trend: "stable" as const,
    },
    {
      name: t("districts.chilanzar"),
      machines: 14,
      penetration: 20,
      revenue: 82.1,
      trend: "up" as const,
    },
    {
      name: t("districts.other"),
      machines: 28,
      penetration: 35,
      revenue: 95.2,
      trend: "stable" as const,
    },
  ];

  const capTableData = [
    { name: t("capTable.founder"), percent: 35, amount: 1_604_166_667 },
    { name: "Investment Fund Alpha", percent: 15, amount: 687_500_000 },
    {
      name: t("capTable.seriesAInvestors"),
      percent: 35,
      amount: 1_604_166_667,
    },
    { name: t("capTable.employeeOptions"), percent: 10, amount: 458_333_333 },
    { name: t("capTable.otherInvestors"), percent: 5, amount: 229_166_667 },
  ];

  const dealTerms = [
    {
      term: t("dealTerms.roundCurrency"),
      value: t("dealTerms.roundCurrencyValue"),
      icon: DollarSign,
    },
    {
      term: t("dealTerms.securityType"),
      value: t("dealTerms.securityTypeValue"),
      icon: Award,
    },
    {
      term: t("dealTerms.liquidationPreference"),
      value: t("dealTerms.liquidationPreferenceValue"),
      icon: Scale,
    },
    {
      term: t("dealTerms.boardSeats"),
      value: t("dealTerms.boardSeatsValue"),
      icon: Users,
    },
    {
      term: t("dealTerms.informationRights"),
      value: t("dealTerms.informationRightsValue"),
      icon: Eye,
    },
    {
      term: t("dealTerms.antiDilution"),
      value: t("dealTerms.antiDilutionValue"),
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-espresso-dark font-display">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-espresso-light">
              {liveInvestorData.name} · {t("share")}:{" "}
              {liveInvestorData.sharePercent}% · Payback:{" "}
              {liveInvestorData.paybackMonths} {t("months.short")}
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {t("reportPdf")}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-espresso/10 pb-1">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className={`rounded-t-lg ${activeTab === tab ? "bg-espresso hover:bg-espresso-dark" : "text-espresso-light hover:bg-espresso-50"}`}
          >
            {TAB_LABELS[tab]}
          </Button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <p className="text-xs text-espresso-light">{t("invested")}</p>
                <p className="mt-1 text-2xl font-bold text-espresso-dark">
                  {fmtShort(liveInvestorData.totalInvested)}
                </p>
                <p className="text-xs text-espresso-light">UZS</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <p className="text-xs text-espresso-light">
                  {t("currentValue")}
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {fmtShort(liveInvestorData.currentValue)}
                </p>
                <p className="text-xs text-emerald-600">
                  +{liveInvestorData.roiPercent}% ROI
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-xs text-espresso-light">
                  {t("totalReturn")}
                </p>
                <p className="mt-1 text-2xl font-bold text-espresso-dark">
                  {fmtShort(liveInvestorData.totalReturn)}
                </p>
                <p className="text-xs text-espresso-light">
                  {t("dividendsLabel")}:{" "}
                  {fmtShort(liveInvestorData.totalDividends)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <p className="text-xs text-espresso-light">IRR</p>
                <p className="mt-1 text-2xl font-bold text-espresso-dark">
                  {liveInvestorData.irr}%
                </p>
                <p className="text-xs text-emerald-600">{t("annualYield")}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("investmentRounds")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-espresso/10">
                      {[
                        t("roundHeaders.round"),
                        t("roundHeaders.date"),
                        t("roundHeaders.raised"),
                        t("roundHeaders.valuation"),
                        t("roundHeaders.investors"),
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className="px-4 py-3 text-xs font-medium text-espresso-light text-left"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fundingRounds.map((r) => (
                      <TableRow
                        key={r.name}
                        className="border-b border-espresso/5 hover:bg-espresso-50/30"
                      >
                        <TableCell className="px-4 py-3 text-sm font-bold text-espresso-dark">
                          {r.name}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-espresso-light">
                          {r.date}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-medium text-emerald-600">
                          {fmtShort(r.amount)} UZS
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-espresso-dark">
                          {fmtShort(r.valuation)} UZS
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-espresso">
                          {r.investors}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("exitScenariosTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {exitScenarios.map((s) => (
                  <div
                    key={s.name}
                    className="rounded-lg border border-espresso/10 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-espresso-dark">
                        {s.name}
                      </p>
                      <div
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          s.multiple >= 6
                            ? "bg-emerald-100 text-emerald-700"
                            : s.multiple >= 4.5
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {s.multiple}x
                      </div>
                    </div>
                    <p className="text-sm text-espresso-light">
                      {s.description}
                    </p>
                    <div className="space-y-1.5 pt-2 border-t border-espresso/10">
                      <div className="flex justify-between text-xs">
                        <span className="text-espresso-light">
                          {t("timeline")}:
                        </span>
                        <span className="font-medium text-espresso">
                          {s.timeline}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-espresso-light">IRR:</span>
                        <span className="font-medium text-emerald-600">
                          {s.irr}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-espresso-light">
                          {t("amount")}:
                        </span>
                        <span className="font-medium text-espresso-dark">
                          {fmtShort(
                            liveInvestorData.totalInvested * s.multiple,
                          )}{" "}
                          UZS
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("revenueVsTarget")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis dataKey="month" stroke="#92400e" fontSize={12} />
                  <YAxis
                    stroke="#92400e"
                    fontSize={12}
                    tickFormatter={(v) => `${v}M`}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [
                      `${Number(v ?? 0).toFixed(1)}M UZS`,
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    name={t("chartLabels.revenueFact")}
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name={t("chartLabels.target")}
                    stroke="#d97706"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-espresso-50 p-2">
                      <kpi.icon className="h-4 w-4 text-espresso" />
                    </div>
                    <div className="flex items-center gap-1">
                      {kpi.trend === "up" ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span
                        className={`text-xs font-medium ${kpi.trend === "up" ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-bold text-espresso-dark">
                    {kpi.value}{" "}
                    <span className="text-xs text-espresso-light font-normal">
                      UZS
                    </span>
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-espresso-light">{kpi.label}</p>
                    <span className="text-[10px] text-espresso-light">
                      {t("targetLabel")}: {kpi.target}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("developmentMilestones")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {milestones.map((m) => (
                  <div
                    key={m.title}
                    className="flex items-center gap-4 rounded-lg border border-espresso/10 p-4"
                  >
                    <div
                      className={`rounded-lg p-2 shrink-0 ${m.status === "in_progress" ? "bg-amber-50" : "bg-espresso-50"}`}
                    >
                      {m.status === "in_progress" ? (
                        <Clock className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Target className="h-5 w-5 text-espresso-light" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-espresso-dark">
                          {m.title}
                        </p>
                        <span className="text-xs text-espresso-light">
                          {m.date}
                        </span>
                      </div>
                      <p className="text-xs text-espresso-light mt-0.5">
                        {m.description}
                      </p>
                      {m.progress > 0 && (
                        <div className="mt-2 h-1.5 rounded-full bg-espresso-100">
                          <div
                            className={`h-full rounded-full ${m.progress >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${m.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-espresso-light shrink-0">
                      {m.progress > 0 ? `${m.progress}%` : t("planned")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "financial" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("pnlTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-espresso/10">
                      {[
                        t("pnlHeaders.indicator"),
                        t("pnlHeaders.amountMUzs"),
                        t("pnlHeaders.momChange"),
                        "%",
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className="px-4 py-3 text-xs font-medium text-espresso-light text-left"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pnlData.map((p) => (
                      <TableRow
                        key={p.label}
                        className="border-b border-espresso/5"
                      >
                        <TableCell className="px-4 py-3 text-sm font-medium text-espresso-dark">
                          {p.label}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-bold text-espresso-dark">
                          {p.value}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {p.change >= 0 ? (
                              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                            )}
                            <span
                              className={`text-xs font-medium ${p.change >= 0 ? "text-emerald-600" : "text-red-500"}`}
                            >
                              {p.change}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-1 h-1.5 rounded-full bg-espresso-100"
                              style={{
                                background:
                                  p.label === t("pnl.grossMargin") ||
                                  p.label === t("pnl.ebitda") ||
                                  p.label === t("pnl.netProfit")
                                    ? "#10b98166"
                                    : "#ef444466",
                              }}
                            />
                            <span className="text-xs font-medium text-espresso text-right w-8">
                              {p.label === t("pnl.revenue")
                                ? "100%"
                                : p.label === t("pnl.cogs")
                                  ? "37%"
                                  : p.label === t("pnl.grossMargin")
                                    ? "63%"
                                    : p.label === t("pnl.opex")
                                      ? "29%"
                                      : p.label === t("pnl.ebitda")
                                        ? "34%"
                                        : "22%"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("unitEconomicsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {unitEconomics.map((u) => (
                  <div
                    key={u.label}
                    className="rounded-lg border border-espresso/10 p-4 space-y-2"
                  >
                    <p className="text-sm font-medium text-espresso-dark">
                      {u.label}
                    </p>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-espresso-dark">
                        {u.value}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          u.status === "excellent"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {u.status === "excellent"
                          ? t("statusExcellent")
                          : t("statusGood")}
                      </span>
                    </div>
                    <p className="text-xs text-espresso-light">
                      {t("benchmark")}: {u.benchmark}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("financialIndicatorsMonthly")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis dataKey="month" stroke="#92400e" fontSize={12} />
                  <YAxis
                    stroke="#92400e"
                    fontSize={12}
                    tickFormatter={(v) => `${v}M`}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [
                      `${Number(v ?? 0).toFixed(1)}M UZS`,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name={t("chartLabels.revenue")}
                    fill="#f59e0b"
                    fillOpacity={0.15}
                    stroke="#f59e0b"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name={t("chartLabels.profit")}
                    fill="#10b981"
                    fillOpacity={0.15}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="costs"
                    name={t("chartLabels.costs")}
                    fill="#ef4444"
                    fillOpacity={0.1}
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("cashFlow")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cashflowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis dataKey="month" stroke="#92400e" fontSize={12} />
                  <YAxis
                    stroke="#92400e"
                    fontSize={12}
                    tickFormatter={(v) => `${v}M`}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [
                      `${Number(v ?? 0).toFixed(1)}M UZS`,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="operating"
                    name={t("cashFlowLabels.operating")}
                    fill="#10b981"
                    fillOpacity={0.15}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="investing"
                    name={t("cashFlowLabels.investing")}
                    fill="#ef4444"
                    fillOpacity={0.15}
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="financing"
                    name={t("cashFlowLabels.financing")}
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("dividendsTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-espresso/10">
                        {[
                          t("dividendHeaders.period"),
                          t("dividendHeaders.date"),
                          t("dividendHeaders.amount"),
                          t("dividendHeaders.yield"),
                          t("dividendHeaders.status"),
                        ].map((h) => (
                          <TableHead
                            key={h}
                            className="px-4 py-3 text-xs font-medium text-espresso-light text-left"
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dividends.map((d) => (
                        <TableRow
                          key={d.period}
                          className="border-b border-espresso/5"
                        >
                          <TableCell className="px-4 py-3 text-sm font-medium text-espresso-dark">
                            {d.period}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs text-espresso-light">
                            {d.date}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm font-medium text-emerald-600">
                            {fmtShort(d.amount)} UZS
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs text-espresso">
                            {d.yield}%
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                d.status === "paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {d.status === "paid" ? (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  {t("dividendStatus.paid")}
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" />
                                  {t("dividendStatus.scheduled")}
                                </>
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 rounded-lg bg-espresso-50 p-3 flex items-center justify-between">
                  <span className="text-xs text-espresso-light">
                    {t("totalDividendsPaid")}
                  </span>
                  <span className="text-sm font-bold text-espresso-dark">
                    {fmtShort(liveInvestorData.totalDividends)} UZS
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("networkGrowth")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                    <XAxis dataKey="month" stroke="#92400e" fontSize={12} />
                    <YAxis stroke="#92400e" fontSize={12} />
                    <Tooltip
                      formatter={(v: unknown) => [
                        `${v ?? 0} ${t("machinesUnit")}`,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="machines"
                      name={t("kpis.machines")}
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ fill: "#f59e0b", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === "operations" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("geoExpansionTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-espresso/10">
                      {[
                        t("districtHeaders.district"),
                        t("districtHeaders.machines"),
                        t("districtHeaders.penetration"),
                        t("districtHeaders.monthlyRevenue"),
                        t("districtHeaders.trend"),
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className="px-4 py-3 text-xs font-medium text-espresso-light text-left"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {districts.map((d) => (
                      <TableRow
                        key={d.name}
                        className="border-b border-espresso/5 hover:bg-espresso-50/30"
                      >
                        <TableCell className="px-4 py-3 text-sm font-medium text-espresso-dark">
                          {d.name}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-espresso">
                          {d.machines}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-1 h-1.5 rounded-full bg-espresso-100"
                              style={{
                                background:
                                  d.penetration >= 40
                                    ? "#10b981"
                                    : d.penetration >= 30
                                      ? "#f59e0b"
                                      : "#3b82f6",
                                width: "80px",
                              }}
                            />
                            <span className="text-xs font-medium text-espresso w-10">
                              {d.penetration}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-medium text-espresso-dark">
                          {fmtShort(d.revenue * 1_000_000)} UZS
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {d.trend === "up" && (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                          )}
                          {d.trend === "down" && (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          {d.trend === "stable" && (
                            <ArrowUpRight className="h-4 w-4 text-espresso-light" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-espresso-50/50 text-xs text-espresso-light">
                <p>
                  <strong>{t("total")}:</strong>{" "}
                  {districts.reduce((a, d) => a + d.machines, 0)}{" "}
                  {t("machinesUnit")},{t("avgPenetration")}:{" "}
                  {Math.round(
                    districts.reduce((a, d) => a + d.penetration, 0) /
                      districts.length,
                  )}
                  %
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("operationsKpi")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: t("opsKpis.machineUtilization"),
                    value: "78.4%",
                    target: "75-80%",
                    icon: Activity,
                    color: "text-emerald-600",
                  },
                  {
                    label: t("opsKpis.avgTransactionsPerMachineDay"),
                    value: "29",
                    target: ">25",
                    icon: BarChart3,
                    color: "text-espresso-dark",
                  },
                  {
                    label: t("opsKpis.maintenanceCost"),
                    value: "450K UZS/mo",
                    target: "<500K/mo",
                    icon: Zap,
                    color: "text-amber-600",
                  },
                  {
                    label: t("opsKpis.overflowSpeed"),
                    value: t("opsKpis.overflowSpeedValue"),
                    target: t("opsKpis.overflowSpeedTarget"),
                    icon: Clock,
                    color: "text-blue-600",
                  },
                  {
                    label: t("opsKpis.networkUptime"),
                    value: "98.7%",
                    target: ">98%",
                    icon: Shield,
                    color: "text-emerald-600",
                  },
                  {
                    label: t("opsKpis.rejectedGoods"),
                    value: "0.3%",
                    target: "<1%",
                    icon: AlertCircle,
                    color: "text-emerald-600",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-lg border border-espresso/10 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <kpi.icon className="h-5 w-5 text-espresso" />
                      <span className="text-xs text-espresso-light">
                        {t("targetLabel")}: {kpi.target}
                      </span>
                    </div>
                    <p className="text-sm text-espresso-light">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.color}`}>
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("competitiveAnalysis")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-espresso/10">
                      <TableHead className="px-4 py-3 text-xs font-medium text-espresso-light text-left">
                        {t("competitorHeaders.parameter")}
                      </TableHead>
                      {competitors.map((c) => (
                        <TableHead
                          key={c.name}
                          className="px-4 py-3 text-xs font-medium text-espresso text-center"
                        >
                          {c.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-b border-espresso/5">
                      <TableCell className="px-4 py-3 text-xs font-medium text-espresso-light">
                        {t("competitorRows.machines")}
                      </TableCell>
                      {competitors.map((c) => (
                        <TableCell
                          key={c.name}
                          className="px-4 py-3 text-sm font-bold text-espresso-dark text-center"
                        >
                          {c.metrics.machines}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="border-b border-espresso/5">
                      <TableCell className="px-4 py-3 text-xs font-medium text-espresso-light">
                        {t("competitorRows.coverage")}
                      </TableCell>
                      {competitors.map((c) => (
                        <TableCell
                          key={c.name}
                          className="px-4 py-3 text-sm text-espresso text-center"
                        >
                          {c.metrics.coverage}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="border-b border-espresso/5">
                      <TableCell className="px-4 py-3 text-xs font-medium text-espresso-light">
                        {t("competitorRows.avgCheck")}
                      </TableCell>
                      {competitors.map((c) => (
                        <TableCell
                          key={c.name}
                          className="px-4 py-3 text-sm text-espresso text-center"
                        >
                          {c.metrics.avgCheck}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="border-b border-espresso/5">
                      <TableCell className="px-4 py-3 text-xs font-medium text-espresso-light">
                        {t("competitorRows.monthlyRevenue")}
                      </TableCell>
                      {competitors.map((c) => (
                        <TableCell
                          key={c.name}
                          className="px-4 py-3 text-sm font-medium text-espresso-dark text-center"
                        >
                          {c.metrics.monthlyRev}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="px-4 py-3 text-xs font-medium text-espresso-light">
                        NPS Score
                      </TableCell>
                      {competitors.map((c) => (
                        <TableCell
                          key={c.name}
                          className="px-4 py-3 text-sm font-bold text-center"
                        >
                          <span
                            className={`${c.metrics.nps >= 70 ? "text-emerald-600" : c.metrics.nps >= 60 ? "text-amber-600" : "text-espresso-dark"}`}
                          >
                            +{c.metrics.nps}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 text-xs text-espresso-light">
                <p>
                  <strong>{t("conclusions")}:</strong>{" "}
                  {t("competitorConclusion")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("topLocationsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-espresso/10">
                      {[
                        "#",
                        t("locationHeaders.location"),
                        t("locationHeaders.machines"),
                        t("locationHeaders.revenue"),
                        "ROI",
                        t("locationHeaders.dailyAvg"),
                        t("locationHeaders.margin"),
                        t("locationHeaders.trend"),
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className="px-3 py-2.5 text-xs font-medium text-espresso-light text-left"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topLocations.map((loc, i) => (
                      <TableRow
                        key={loc.name}
                        className="border-b border-espresso/5 hover:bg-espresso-50/50"
                      >
                        <TableCell className="px-3 py-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-espresso-100 text-xs font-bold text-espresso">
                            #{i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <p className="text-sm font-medium text-espresso-dark">
                            {loc.name}
                          </p>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-espresso">
                          {loc.machines}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-sm font-medium text-espresso-dark">
                          {loc.revenue} UZS
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <span
                            className={`text-sm font-bold ${loc.roi >= 130 ? "text-emerald-600" : loc.roi >= 110 ? "text-amber-600" : "text-espresso"}`}
                          >
                            {loc.roi}%
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-xs text-espresso">
                          {loc.dailyAvg} UZS
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-xs font-medium text-espresso">
                          {loc.margin}%
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          {loc.trend === "up" && (
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                          )}
                          {loc.trend === "down" && (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          {loc.trend === "stable" && (
                            <ArrowUpRight className="h-4 w-4 text-espresso-light" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("riskAssessment")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {risks.map((r) => (
                <div
                  key={r.name}
                  className="rounded-lg border border-espresso/10 overflow-hidden"
                >
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setExpandedRisk(expandedRisk === r.name ? null : r.name)
                    }
                    className="flex w-full items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle
                        className={`h-5 w-5 ${r.level === "low" ? "text-emerald-500" : r.level === "medium" ? "text-amber-500" : "text-red-500"}`}
                      />
                      <p className="text-sm font-medium text-espresso-dark">
                        {r.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-espresso">
                        {r.score}/10
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_COLORS[r.level]}`}
                      >
                        {RISK_LABELS[r.level]}
                      </span>
                      {expandedRisk === r.name ? (
                        <ChevronDown className="h-4 w-4 text-espresso-light" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-espresso-light" />
                      )}
                    </div>
                  </Button>
                  {expandedRisk === r.name && (
                    <div className="border-t border-espresso/10 bg-espresso-50/30 px-4 py-3 space-y-1">
                      <p className="text-xs text-espresso-light">
                        <strong>{t("riskDescription")}:</strong> {r.description}
                      </p>
                      <p className="text-xs text-espresso-light">
                        <strong>{t("riskMitigation")}:</strong> {r.mitigation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "portfolio" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("valuationHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={valuationHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis dataKey="quarter" stroke="#92400e" fontSize={12} />
                  <YAxis
                    stroke="#92400e"
                    fontSize={12}
                    tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [
                      `${fmtShort(Number(v ?? 0))} UZS`,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="valuation"
                    name={t("chartLabels.valuation")}
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ fill: "#f59e0b", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-espresso-50/50 p-3 text-center">
                  <p className="text-xs text-espresso-light mb-1">
                    {t("initialValuation")}
                  </p>
                  <p className="text-sm font-bold text-espresso-dark">
                    {fmtShort(valuationHistory[0].valuation)} UZS
                  </p>
                </div>
                <div className="rounded-lg bg-espresso-50/50 p-3 text-center">
                  <p className="text-xs text-espresso-light mb-1">
                    {t("currentValuation")}
                  </p>
                  <p className="text-sm font-bold text-emerald-600">
                    {fmtShort(
                      liveInvestorData.currentValue * (4.583333 / 0.6875),
                    )}{" "}
                    UZS
                  </p>
                </div>
                <div className="rounded-lg bg-espresso-50/50 p-3 text-center">
                  <p className="text-xs text-espresso-light mb-1">
                    {t("growthForPeriod")}
                  </p>
                  <p className="text-sm font-bold text-emerald-600">
                    +
                    {Math.round(
                      ((liveInvestorData.currentValue * (4.583333 / 0.6875) -
                        valuationHistory[0].valuation) /
                        valuationHistory[0].valuation) *
                        100,
                    )}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("capTableTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={capTableData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    dataKey="percent"
                    nameKey="name"
                    label={({ percent }) => `${percent}%`}
                    labelLine={false}
                  >
                    {capTableData.map((item, i) => (
                      <Cell
                        key={i}
                        fill={
                          [
                            "#f59e0b",
                            "#3b82f6",
                            "#8b5cf6",
                            "#10b981",
                            "#6b7280",
                          ][i]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v}%`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {capTableData.map((item, i) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: [
                            "#f59e0b",
                            "#3b82f6",
                            "#8b5cf6",
                            "#10b981",
                            "#6b7280",
                          ][i],
                        }}
                      />
                      <span className="text-espresso">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-espresso-dark">
                        {item.percent}%
                      </p>
                      <p className="text-espresso-light">
                        {fmtShort(item.amount)} UZS
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("investmentTerms")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {dealTerms.map((dt) => (
                  <div
                    key={dt.term}
                    className="flex items-center justify-between rounded-lg border border-espresso/10 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-espresso-50 p-2">
                        <dt.icon className="h-4 w-4 text-espresso" />
                      </div>
                      <p className="text-sm font-medium text-espresso-dark">
                        {dt.term}
                      </p>
                    </div>
                    <p className="text-sm text-espresso text-right max-w-xs">
                      {dt.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("assetStructure")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={assetAllocation}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      dataKey="percent"
                      nameKey="category"
                      label={({ percent }) => `${percent}%`}
                      labelLine={false}
                    >
                      {assetAllocation.map((a, i) => (
                        <Cell key={i} fill={a.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string) => [`${v}%`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {assetAllocation.map((a) => (
                    <div
                      key={a.category}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: a.color }}
                        />
                        <span className="text-espresso">{a.category}</span>
                      </div>
                      <span className="font-medium text-espresso-dark">
                        {fmtShort(a.value)} UZS ({a.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("keyMetrics")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  {
                    label: t("metrics.machineUptime"),
                    value: "98.7%",
                    icon: Activity,
                    color: "text-emerald-600",
                  },
                  {
                    label: t("metrics.avgCheck"),
                    value: "12 500 UZS",
                    icon: DollarSign,
                    color: "text-espresso-dark",
                  },
                  {
                    label: t("metrics.profitMargin"),
                    value: "63.1%",
                    icon: Percent,
                    color: "text-emerald-600",
                  },
                  {
                    label: t("metrics.satisfaction"),
                    value: "4.6/5.0",
                    icon: Award,
                    color: "text-amber-600",
                  },
                  {
                    label: t("metrics.locations"),
                    value: "89",
                    icon: MapPin,
                    color: "text-espresso-dark",
                  },
                  {
                    label: "NPS Score",
                    value: "+72",
                    icon: TrendingUp,
                    color: "text-emerald-600",
                  },
                  {
                    label: "Customer LTV",
                    value: "185 000 UZS",
                    icon: Users,
                    color: "text-espresso-dark",
                  },
                  {
                    label: t("metrics.paybackPeriod"),
                    value: t("metrics.paybackPeriodValue"),
                    icon: Clock,
                    color: "text-espresso-dark",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between rounded-lg bg-espresso-50/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <m.icon className="h-4 w-4 text-espresso" />
                      <span className="text-sm text-espresso">{m.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${m.color}`}>
                      {m.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {t("documentsForInvestor")}
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t("downloadAll")}
                </Button>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-espresso-light" />
                  <Input
                    placeholder={t("searchDocuments")}
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="pl-9 text-sm border-espresso/20 focus:border-espresso"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["all", "financial", "legal", "reports"].map((cat) => (
                    <Button
                      key={cat}
                      variant={docCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDocCategory(cat as DocCategory)}
                      className={
                        docCategory === cat
                          ? "bg-espresso hover:bg-espresso-dark"
                          : "bg-espresso-50 text-espresso-dark hover:bg-espresso-100 border-0"
                      }
                    >
                      {cat === "all"
                        ? t("docCategories.all")
                        : cat === "financial"
                          ? t("docCategories.financial")
                          : cat === "legal"
                            ? t("docCategories.legal")
                            : t("docCategories.reports")}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between rounded-lg border border-espresso/10 p-4 hover:bg-espresso-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="rounded-lg bg-espresso-50 p-2 shrink-0">
                        <FileText className="h-5 w-5 text-espresso" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-espresso-dark truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-espresso-light">
                          {doc.date} · {doc.type} · {doc.size}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0 ml-2"
                      >
                        {doc.category === "financial"
                          ? t("docBadges.finance")
                          : doc.category === "legal"
                            ? t("docBadges.legal")
                            : t("docBadges.report")}
                      </Badge>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {t("preview")}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-3.5 w-3.5" />
                        {t("download")}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-espresso-light/30 mb-2" />
                  <p className="text-sm text-espresso-light">
                    {t("noDocumentsFound")}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-espresso/10">
              <p className="text-xs text-espresso-light">
                <strong>{t("totalDocuments")}:</strong> {documents.length} ·{" "}
                <strong>{t("inCategory")}:</strong> {filteredDocs.length}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
