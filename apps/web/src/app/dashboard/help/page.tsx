"use client";

import { useState, useMemo } from "react";
import {
  HelpCircle,
  MessageCircle,
  Search,
  ChevronRight,
  Phone,
  Mail,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  Target,
  TrendingUp,
  Zap,
  BookOpen,
  Users,
  BarChart3,
  Star,
  ArrowRight,
  Lightbulb,
  RefreshCw,
  X,
  Plus,
  MessageSquare,
  Paperclip,
  Eye,
  Calendar,
  GraduationCap,
  AlertTriangle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Rocket,
  Route,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCmsArticles } from "@/lib/hooks/use-cms";
import type { CmsArticle } from "@/lib/hooks/use-cms";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/utils";

// ============= FAQ DATA STRUCTURE (keys for i18n) =============
const faqCategories = [
  { key: "general", icon: PlayCircle, color: "bg-blue-50 text-blue-600" },
  { key: "machines", icon: Target, color: "bg-amber-50 text-amber-600" },
  {
    key: "payments",
    icon: TrendingUp,
    color: "bg-emerald-50 text-emerald-600",
  },
  { key: "loyalty", icon: Star, color: "bg-purple-50 text-purple-600" },
  { key: "techSupport", icon: Zap, color: "bg-orange-50 text-orange-600" },
] as const;

const faqQuestionsMeta = {
  general: [
    { views: 342, relatedArticleKeys: ["planogramGuide"] },
    { views: 256, relatedArticleKeys: ["quickStart"] },
    { views: 189, relatedArticleKeys: [] },
    { views: 145, relatedArticleKeys: [] },
    { views: 98, relatedArticleKeys: [] },
  ],
  machines: [
    { views: 523, relatedArticleKeys: ["planogramGuide", "maintenanceGuide"] },
    { views: 267, relatedArticleKeys: ["planogramGuide"] },
    { views: 198, relatedArticleKeys: [] },
    { views: 312, relatedArticleKeys: [] },
    { views: 156, relatedArticleKeys: ["maintenanceGuide"] },
    { views: 234, relatedArticleKeys: [] },
  ],
  payments: [
    { views: 287, relatedArticleKeys: [] },
    { views: 176, relatedArticleKeys: [] },
    { views: 134, relatedArticleKeys: [] },
    { views: 89, relatedArticleKeys: [] },
  ],
  loyalty: [
    { views: 445, relatedArticleKeys: ["loyalty2"] },
    { views: 234, relatedArticleKeys: [] },
    { views: 178, relatedArticleKeys: ["loyalty2"] },
    { views: 156, relatedArticleKeys: [] },
  ],
  techSupport: [
    { views: 356, relatedArticleKeys: [] },
    { views: 245, relatedArticleKeys: [] },
    { views: 167, relatedArticleKeys: ["integration1c"] },
    { views: 89, relatedArticleKeys: ["apiV1"] },
    { views: 167, relatedArticleKeys: [] },
  ],
} as const;

// ============= KNOWLEDGE BASE CATEGORIES =============
const knowledgeBaseCategories = [
  {
    id: 1,
    key: "gettingStarted",
    icon: PlayCircle,
    count: 5,
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: 2,
    key: "machinesEquipment",
    icon: Target,
    count: 8,
    color: "bg-amber-50 text-amber-600",
  },
  {
    id: 3,
    key: "productsRecipes",
    icon: Lightbulb,
    count: 6,
    color: "bg-green-50 text-green-600",
  },
  {
    id: 4,
    key: "financeReports",
    icon: BarChart3,
    count: 7,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 5,
    key: "customerLoyalty",
    icon: Star,
    count: 4,
    color: "bg-purple-50 text-purple-600",
  },
  {
    id: 6,
    key: "administration",
    icon: Users,
    count: 5,
    color: "bg-pink-50 text-pink-600",
  },
];

// ============= VIDEO TUTORIALS =============
const videoTutorials = [
  { id: 1, key: "connectMachine", views: 1234 },
  { id: 2, key: "planogramRecipes", views: 856 },
  { id: 3, key: "reportsAnalytics", views: 672 },
  { id: 4, key: "teamAccess", views: 543 },
  { id: 5, key: "integrationsApi", views: 421 },
  { id: 6, key: "loyaltyMarketing", views: 789 },
];

// ============= LEARNING PATHS =============
const learningPaths = [
  { id: 1, key: "beginner", progress: 0, completed: 0, total: 5 },
  { id: 2, key: "operator", progress: 30, completed: 3, total: 10 },
  { id: 3, key: "administrator", progress: 0, completed: 0, total: 15 },
];

// ============= WALKTHROUGHS =============
const walkthroughs = [
  { id: 1, key: "dashboardOverview" },
  { id: 2, key: "firstMachine" },
  { id: 3, key: "productsRecipes" },
];

// ============= ENHANCED SUPPORT TICKETS (8 total) =============
const supportTickets = [
  {
    id: "TKT-2026-0089",
    key: "tkt0089",
    status: "open" as const,
    priority: "high" as const,
    created: "01.03.2026",
    messages: 3,
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0088",
    key: "tkt0088",
    status: "open" as const,
    priority: "high" as const,
    created: "01.03.2026",
    messages: 1,
    slaStatus: "at_risk" as const,
  },
  {
    id: "TKT-2026-0087",
    key: "tkt0087",
    status: "in_progress" as const,
    priority: "medium" as const,
    created: "28.02.2026",
    messages: 5,
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0085",
    key: "tkt0085",
    status: "in_progress" as const,
    priority: "medium" as const,
    created: "27.02.2026",
    messages: 8,
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0082",
    key: "tkt0082",
    status: "resolved" as const,
    priority: "low" as const,
    created: "25.02.2026",
    messages: 4,
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0079",
    key: "tkt0079",
    status: "resolved" as const,
    priority: "low" as const,
    created: "22.02.2026",
    messages: 2,
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0076",
    key: "tkt0076",
    status: "open" as const,
    priority: "high" as const,
    created: "01.03.2026",
    messages: 2,
    slaStatus: "breached" as const,
  },
  {
    id: "TKT-2026-0072",
    key: "tkt0072",
    status: "in_progress" as const,
    priority: "medium" as const,
    created: "28.02.2026",
    messages: 6,
    slaStatus: "on_track" as const,
  },
];

const TICKET_STATUS = {
  open: {
    key: "open" as const,
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  in_progress: {
    key: "inProgress" as const,
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  resolved: {
    key: "resolved" as const,
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
  closed: {
    key: "closed" as const,
    color: "bg-slate-100 text-slate-700",
    icon: X,
  },
};

const PRIORITY_COLORS = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-blue-50 text-blue-600",
};

const SLA_STATUS = {
  on_track: {
    key: "onTrack" as const,
    color: "bg-emerald-50 text-emerald-600",
    icon: CheckCircle,
  },
  at_risk: {
    key: "atRisk" as const,
    color: "bg-amber-50 text-amber-600",
    icon: AlertTriangle,
  },
  breached: {
    key: "breached" as const,
    color: "bg-red-50 text-red-600",
    icon: AlertCircle,
  },
};

type ChangelogType = "feature" | "bugfix" | "improvement";

// ============= SYSTEM STATUS SERVICES =============
const systemServices = [
  {
    id: 1,
    key: "apiService",
    status: "operational" as const,
    uptime: "99.98%",
    responseTime: "145ms",
  },
  {
    id: 2,
    key: "paymentSystems",
    status: "operational" as const,
    uptime: "99.95%",
    responseTime: "234ms",
  },
  {
    id: 3,
    key: "telemetry",
    status: "degraded" as const,
    uptime: "98.50%",
    responseTime: "567ms",
  },
  {
    id: 4,
    key: "landingSite",
    status: "operational" as const,
    uptime: "99.99%",
    responseTime: "98ms",
  },
];

// ============= CHANGELOG (8 entries) =============
const changelogEntries = [
  {
    version: "2.4.0",
    date: "01.03.2026",
    changeCount: 3,
    type: "feature" as ChangelogType,
  },
  {
    version: "2.3.8",
    date: "25.02.2026",
    changeCount: 2,
    type: "bugfix" as ChangelogType,
  },
  {
    version: "2.3.7",
    date: "20.02.2026",
    changeCount: 2,
    type: "feature" as ChangelogType,
  },
  {
    version: "2.3.6",
    date: "15.02.2026",
    changeCount: 2,
    type: "bugfix" as ChangelogType,
  },
  {
    version: "2.3.5",
    date: "10.02.2026",
    changeCount: 2,
    type: "feature" as ChangelogType,
  },
  {
    version: "2.3.4",
    date: "05.02.2026",
    changeCount: 2,
    type: "bugfix" as ChangelogType,
  },
  {
    version: "2.3.3",
    date: "01.02.2026",
    changeCount: 2,
    type: "feature" as ChangelogType,
  },
  {
    version: "2.3.2",
    date: "25.01.2026",
    changeCount: 2,
    type: "bugfix" as ChangelogType,
  },
];

// ============= POPULAR KNOWLEDGE BASE ARTICLES =============
const knowledgeBase = [
  {
    id: 1,
    key: "planogramGuide",
    reads: 523,
    updated: "28.02.2026",
    type: "article",
  },
  { id: 2, key: "apiV1", reads: 312, updated: "25.02.2026", type: "article" },
  {
    id: 3,
    key: "integration1c",
    reads: 287,
    updated: "22.02.2026",
    type: "article",
  },
  {
    id: 4,
    key: "costOptimization",
    reads: 456,
    updated: "20.02.2026",
    type: "article",
  },
  {
    id: 5,
    key: "loyalty2",
    reads: 678,
    updated: "18.02.2026",
    type: "article",
  },
  {
    id: 6,
    key: "maintenanceGuide",
    reads: 234,
    updated: "15.02.2026",
    type: "video",
  },
  {
    id: 7,
    key: "quickStart",
    reads: 789,
    updated: "10.02.2026",
    type: "article",
  },
  {
    id: 8,
    key: "notificationsVideo",
    reads: 145,
    updated: "05.02.2026",
    type: "video",
  },
];

// ============= CONTACT INFO =============
const contactChannels = [
  { id: 1, key: "email", value: "support@vendhub.uz", icon: Mail },
  { id: 2, key: "phone", value: "+998 71 200 39 99", icon: Phone },
  { id: 3, key: "telegram", value: "@vendhub_support", icon: MessageSquare },
];

export default function HelpPage() {
  const t = useTranslations("help");

  // Fetch published CMS articles for the knowledge base tab
  const { data: cmsArticlesRaw } = useCmsArticles({
    limit: 50,
    isPublished: true,
  });
  const cmsArticles = (
    Array.isArray(cmsArticlesRaw) ? cmsArticlesRaw : cmsArticlesRaw?.data || []
  ) as CmsArticle[];

  const [activeTab, setActiveTab] = useState<
    "faq" | "training" | "support" | "knowledge" | "changelog"
  >("faq");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [faqCategory, setFaqCategory] = useState("all");
  const [faqHelpful, setFaqHelpful] = useState<Record<string, boolean | null>>(
    {},
  );
  const [supportSearch, setSupportSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: "",
    file: null,
  });
  const [changelogFilter, setChangelogFilter] = useState<
    "all" | "feature" | "bugfix" | "improvement"
  >("all");

  // Build FAQ data with translations
  const faqData = useMemo(() => {
    return faqCategories.map((cat) => {
      const questions = faqQuestionsMeta[cat.key].map((meta, idx) => ({
        q: t(`faq.${cat.key}.${idx}.question`),
        a: t(`faq.${cat.key}.${idx}.answer`),
        views: meta.views,
        relatedArticles: meta.relatedArticleKeys.map((k) =>
          t(`articles.${k}.title`),
        ),
      }));
      return {
        category: t(`faqCategories.${cat.key}`),
        categoryKey: cat.key,
        icon: cat.icon,
        color: cat.color,
        questions,
      };
    });
  }, [t]);

  // Get top 5 FAQ by views
  const topFaqs = useMemo(() => {
    return faqData
      .flatMap((cat) =>
        cat.questions.map((q) => ({ ...q, category: cat.category })),
      )
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [faqData]);

  // Filter FAQ by category
  const filteredFaq = useMemo(() => {
    if (faqCategory === "all") return faqData;
    return faqData.filter((cat) => cat.categoryKey === faqCategory);
  }, [faqCategory, faqData]);

  // Filter support tickets
  const filteredTickets = useMemo(() => {
    return supportTickets.filter(
      (ticket) =>
        t(`tickets.${ticket.key}.subject`)
          .toLowerCase()
          .includes(supportSearch.toLowerCase()) ||
        ticket.id.toLowerCase().includes(supportSearch.toLowerCase()),
    );
  }, [supportSearch, t]);

  // Get recently updated articles
  const recentlyUpdated = useMemo(() => {
    return [...knowledgeBase]
      .sort(
        (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
      )
      .slice(0, 5);
  }, []);

  // Filter changelog
  const filteredChangelog = useMemo(() => {
    if (changelogFilter === "all") return changelogEntries;
    return changelogEntries.filter((item) => item.type === changelogFilter);
  }, [changelogFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-display font-bold text-amber-900">
              {t("title")}
            </h1>
          </div>
          <p className="text-amber-700 text-lg">{t("subtitle")}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white rounded-lg p-1 shadow-sm border border-amber-200 overflow-x-auto">
          {[
            { id: "faq" as const, label: t("tabs.faq"), icon: Lightbulb },
            {
              id: "knowledge" as const,
              label: t("tabs.knowledge"),
              icon: BookOpen,
            },
            {
              id: "training" as const,
              label: t("tabs.training"),
              icon: GraduationCap,
            },
            {
              id: "support" as const,
              label: t("tabs.support"),
              icon: MessageCircle,
            },
            {
              id: "changelog" as const,
              label: t("tabs.changelog"),
              icon: RefreshCw,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={`gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-espresso text-white shadow-md hover:bg-espresso/90 hover:text-white"
                    : "text-espresso-light hover:bg-amber-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* ============= FAQ TAB ============= */}
        {activeTab === "faq" && (
          <div className="space-y-8">
            {/* Popular Questions Section */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-4">
                {t("popularQuestions")}
              </h2>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {topFaqs.map((faq, idx) => (
                    <Card
                      key={idx}
                      className="flex-shrink-0 w-80 bg-white border-2 border-amber-200 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3 mb-3">
                          <Eye className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-espresso-dark text-sm line-clamp-2">
                              {faq.q}
                            </h3>
                            <p className="text-xs text-espresso-light mt-1">
                              {faq.views} {t("views")}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className="text-xs bg-amber-100 text-amber-800"
                        >
                          {faq.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <h3 className="text-sm font-semibold text-espresso-dark mb-3">
                {t("categories")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: t("allCategories") },
                  ...faqData.map((cat) => ({
                    key: cat.categoryKey,
                    label: cat.category,
                  })),
                ].map((cat) => (
                  <Button
                    key={cat.key}
                    variant={faqCategory === cat.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFaqCategory(cat.key)}
                    className={`rounded-full ${
                      faqCategory === cat.key
                        ? "bg-espresso shadow-md hover:bg-espresso/90"
                        : "border-2 border-amber-200 text-espresso-light hover:bg-amber-50"
                    }`}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* FAQ Items */}
            <div className="space-y-4">
              {filteredFaq.map((cat, catIdx) => (
                <div key={catIdx}>
                  <div className="flex items-center gap-3 mb-3">
                    <cat.icon
                      className={`w-6 h-6 ${cat.color.split(" ")[1]}`}
                    />
                    <h3 className="text-lg font-semibold text-espresso-dark">
                      {cat.category}
                    </h3>
                  </div>
                  <div className="space-y-3 pl-9">
                    {cat.questions.map((faq, qIdx) => {
                      const faqKey = `${catIdx}-${qIdx}`;
                      return (
                        <Card
                          key={qIdx}
                          className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all"
                        >
                          <CardContent className="pt-6">
                            <Button
                              variant="ghost"
                              onClick={() =>
                                setExpandedFaq(
                                  expandedFaq === faqKey ? null : faqKey,
                                )
                              }
                              className="w-full justify-start text-left h-auto p-0 hover:bg-transparent"
                            >
                              <div className="flex items-start justify-between gap-4 w-full">
                                <h4 className="font-semibold text-espresso-dark pr-4 whitespace-normal">
                                  {faq.q}
                                </h4>
                                <ChevronRight
                                  className={`w-5 h-5 text-amber-600 flex-shrink-0 transition-transform ${expandedFaq === faqKey ? "rotate-90" : ""}`}
                                />
                              </div>
                            </Button>

                            {expandedFaq === faqKey && (
                              <div className="mt-4 pt-4 border-t-2 border-amber-100">
                                <p className="text-espresso-light mb-4">
                                  {faq.a}
                                </p>

                                {/* Related Articles */}
                                {faq.relatedArticles &&
                                  faq.relatedArticles.length > 0 && (
                                    <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                                      <p className="text-xs font-semibold text-espresso-dark mb-2">
                                        {t("relatedArticles")}
                                      </p>
                                      <ul className="text-xs space-y-1">
                                        {faq.relatedArticles.map(
                                          (article, idx) => (
                                            <li
                                              key={idx}
                                              className="flex items-center gap-2 text-amber-600 hover:text-amber-700 cursor-pointer"
                                            >
                                              <ArrowRight className="w-3 h-3" />
                                              {article}
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  )}

                                {/* Was this helpful */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-espresso-light">
                                    {t("wasHelpful")}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setFaqHelpful({
                                        ...faqHelpful,
                                        [faqKey]: true,
                                      })
                                    }
                                    className={`h-auto px-3 py-1 text-xs ${
                                      faqHelpful[faqKey] === true
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-gray-100 text-gray-600 hover:bg-emerald-50"
                                    }`}
                                  >
                                    <ThumbsUp className="w-3 h-3 mr-1" />{" "}
                                    {t("yes")}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setFaqHelpful({
                                        ...faqHelpful,
                                        [faqKey]: false,
                                      })
                                    }
                                    className={`h-auto px-3 py-1 text-xs ${
                                      faqHelpful[faqKey] === false
                                        ? "bg-red-100 text-red-700 hover:bg-red-100"
                                        : "bg-gray-100 text-gray-600 hover:bg-red-50"
                                    }`}
                                  >
                                    <ThumbsDown className="w-3 h-3 mr-1" />{" "}
                                    {t("no")}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============= KNOWLEDGE BASE TAB ============= */}
        {activeTab === "knowledge" && (
          <div className="space-y-8">
            {/* Knowledge Base Categories */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-6">
                {t("knowledgeBase")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {knowledgeBaseCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Card
                      key={cat.id}
                      className="bg-white border-2 border-amber-200 hover:shadow-lg transition-all cursor-pointer hover:border-amber-400"
                    >
                      <CardContent className="pt-6">
                        <div
                          className={`w-12 h-12 rounded-lg ${cat.color} flex items-center justify-center mb-3`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-espresso-dark mb-1">
                          {t(`kbCategories.${cat.key}`)}
                        </h3>
                        <p className="text-sm text-espresso-light">
                          {cat.count} {t("articlesCount")}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Popular Articles */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                {t("topArticles")}
              </h3>
              <div className="space-y-3">
                {knowledgeBase.slice(0, 5).map((article) => (
                  <Card
                    key={article.id}
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all hover:shadow-md"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-espresso-dark mb-2">
                            {t(`articles.${article.key}.title`)}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-espresso-light">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" /> {article.reads}{" "}
                              {t("views")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />{" "}
                              {t(`articles.${article.key}.duration`)}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className="text-xs bg-amber-100 text-amber-800 flex-shrink-0"
                        >
                          {t(`articles.${article.key}.category`)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CMS Articles (dynamic, from API) */}
            {cmsArticles.length > 0 && (
              <div>
                <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                  {t("cmsArticles", { defaultValue: "Articles" })}
                </h3>
                <div className="space-y-3">
                  {cmsArticles.map((article) => (
                    <Card
                      key={article.id}
                      className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all hover:shadow-md cursor-pointer"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-espresso-dark mb-1">
                              {article.title}
                            </h4>
                            {article.metaDescription && (
                              <p className="text-sm text-espresso-light mb-2 line-clamp-2">
                                {article.metaDescription}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-espresso-light">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(
                                  article.publishedAt || article.createdAt,
                                )}
                              </span>
                              {article.tags && article.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {article.tags.slice(0, 3).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {article.category && (
                            <Badge
                              variant="default"
                              className="text-xs bg-amber-100 text-amber-800 flex-shrink-0"
                            >
                              {article.category}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Updates */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                {t("recentUpdates")}
              </h3>
              <div className="space-y-3">
                {recentlyUpdated.map((article) => (
                  <Card
                    key={article.id}
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-espresso-dark flex-1">
                          {t(`articles.${article.key}.title`)}
                        </h4>
                        <span className="text-xs text-espresso-light">
                          {article.updated}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============= TRAINING TAB ============= */}
        {activeTab === "training" && (
          <div className="space-y-8">
            {/* Video Tutorials */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-6">
                {t("videoTutorials")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoTutorials.map((video) => (
                  <Card
                    key={video.id}
                    className="bg-white border-2 border-amber-200 hover:shadow-lg transition-all overflow-hidden group cursor-pointer"
                  >
                    <div className="aspect-video bg-gradient-to-br from-amber-200 to-orange-300 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-espresso-dark mb-2 line-clamp-2">
                        {t(`videos.${video.key}.title`)}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-espresso-light mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />{" "}
                          {t(`videos.${video.key}.duration`)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" /> {video.views}
                        </span>
                      </div>
                      <Badge
                        variant="info"
                        className="text-xs bg-blue-100 text-blue-800"
                      >
                        {t(`videos.${video.key}.difficulty`)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Learning Paths */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-6">
                {t("learningPaths")}
              </h3>
              <div className="space-y-4">
                {learningPaths.map((path) => (
                  <Card
                    key={path.id}
                    className="bg-white border-2 border-amber-200 hover:shadow-md transition-all"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-espresso-dark mb-1">
                            {t(`paths.${path.key}.name`)}
                          </h4>
                          <p className="text-sm text-espresso-light mb-3">
                            {t(`paths.${path.key}.description`)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-espresso-light">
                            <span>
                              {t("modulesProgress", {
                                completed: path.completed,
                                total: path.total,
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-2xl font-bold text-amber-600">
                            {path.progress}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all"
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Interactive Walkthroughs */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                {t("interactiveWalkthroughs")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {walkthroughs.map((walkthrough) => (
                  <Card
                    key={walkthrough.id}
                    className="bg-white border-2 border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Route className="w-6 h-6 text-amber-600" />
                        <h4 className="font-semibold text-espresso-dark flex-1">
                          {t(`walkthroughs.${walkthrough.key}.title`)}
                        </h4>
                      </div>
                      <p className="text-sm text-espresso-light mb-3">
                        {t(`walkthroughs.${walkthrough.key}.description`)}
                      </p>
                      <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                        <Rocket className="w-4 h-4 mr-2" />{" "}
                        {t("startWalkthrough")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============= SUPPORT TAB ============= */}
        {activeTab === "support" && (
          <div className="space-y-8">
            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-4">
                {t("contactChannels")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {contactChannels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <Card
                      key={channel.id}
                      className="bg-white border-2 border-amber-200 hover:shadow-lg transition-all"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-amber-600" />
                          </div>
                          <h3 className="font-semibold text-espresso-dark">
                            {t(`contact.${channel.key}.type`)}
                          </h3>
                        </div>
                        <p className="text-sm text-espresso-light mb-2">
                          {t(`contact.${channel.key}.description`)}
                        </p>
                        <p className="font-medium text-amber-600">
                          {channel.value}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* New Ticket Button */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-espresso-dark">
                  {t("yourTickets")}
                </h2>
                <Button
                  onClick={() => setNewTicketOpen(!newTicketOpen)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" /> {t("createTicket")}
                </Button>
              </div>

              {/* New Ticket Form */}
              {newTicketOpen && (
                <Card className="bg-white border-2 border-amber-300 mb-6">
                  <CardHeader>
                    <CardTitle className="text-amber-900">
                      {t("newTicketTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-espresso-dark mb-2">
                        {t("ticketSubject")}
                      </label>
                      <Input
                        placeholder={t("ticketSubjectPlaceholder")}
                        value={newTicketForm.subject}
                        onChange={(e) =>
                          setNewTicketForm({
                            ...newTicketForm,
                            subject: e.target.value,
                          })
                        }
                        className="border-2 border-amber-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-espresso-dark mb-2">
                          {t("ticketCategory")}
                        </label>
                        <select
                          value={newTicketForm.category}
                          onChange={(e) =>
                            setNewTicketForm({
                              ...newTicketForm,
                              category: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg text-espresso-dark"
                        >
                          <option value="">{t("selectCategory")}</option>
                          <option value="technical">
                            {t("ticketCategories.technical")}
                          </option>
                          <option value="bug">
                            {t("ticketCategories.bug")}
                          </option>
                          <option value="finance">
                            {t("ticketCategories.finance")}
                          </option>
                          <option value="training">
                            {t("ticketCategories.training")}
                          </option>
                          <option value="feature">
                            {t("ticketCategories.feature")}
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-espresso-dark mb-2">
                          {t("ticketPriority")}
                        </label>
                        <select
                          value={newTicketForm.priority}
                          onChange={(e) =>
                            setNewTicketForm({
                              ...newTicketForm,
                              priority: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg text-espresso-dark"
                        >
                          <option value="low">{t("priority.low")}</option>
                          <option value="medium">{t("priority.medium")}</option>
                          <option value="high">{t("priority.high")}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-espresso-dark mb-2">
                        {t("ticketDescription")}
                      </label>
                      <textarea
                        placeholder={t("ticketDescriptionPlaceholder")}
                        value={newTicketForm.description}
                        onChange={(e) =>
                          setNewTicketForm({
                            ...newTicketForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg text-espresso-dark h-24 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-espresso-dark mb-2">
                        {t("attachFile")}
                      </label>
                      <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center cursor-pointer hover:bg-amber-50 transition-all">
                        <Paperclip className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                        <p className="text-sm text-espresso-light">
                          {t("dragOrClick")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                        <Send className="w-4 h-4 mr-2" /> {t("submitTicket")}
                      </Button>
                      <Button
                        onClick={() => setNewTicketOpen(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        {t("cancelBtn")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tickets Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-amber-600" />
                <Input
                  placeholder={t("searchTickets")}
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                  className="pl-10 border-2 border-amber-200"
                />
              </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const StatusIcon = TICKET_STATUS[ticket.status].icon;
                const SlaIcon = SLA_STATUS[ticket.slaStatus].icon;
                return (
                  <Card
                    key={ticket.id}
                    onClick={() =>
                      setSelectedTicket(
                        selectedTicket === ticket.id ? null : ticket.id,
                      )
                    }
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all cursor-pointer"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-amber-600">
                              {ticket.id}
                            </span>
                            <h3 className="font-semibold text-espresso-dark flex-1">
                              {t(`tickets.${ticket.key}.subject`)}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-espresso-light">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" /> {t("created")}:{" "}
                              {ticket.created}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />{" "}
                              {t(`tickets.${ticket.key}.lastUpdate`)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`w-5 h-5 ${TICKET_STATUS[ticket.status].color.split(" ")[1]}`}
                            />
                            <Badge
                              variant="default"
                              className={`${TICKET_STATUS[ticket.status].color} text-xs`}
                            >
                              {t(
                                `ticketStatus.${TICKET_STATUS[ticket.status].key}`,
                              )}
                            </Badge>
                          </div>
                          <Badge
                            variant="default"
                            className={`${PRIORITY_COLORS[ticket.priority]} text-xs`}
                          >
                            {t(`priority.${ticket.priority}`)}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <SlaIcon
                              className={`w-4 h-4 ${SLA_STATUS[ticket.slaStatus].color.split(" ")[1]}`}
                            />
                            <span className="text-xs text-espresso-light">
                              {t(
                                `slaStatus.${SLA_STATUS[ticket.slaStatus].key}`,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedTicket === ticket.id && (
                        <div className="mt-4 pt-4 border-t-2 border-amber-100">
                          <p className="text-sm text-espresso-light mb-3">
                            <span className="font-semibold text-espresso-dark">
                              {t("categoryLabel")}:
                            </span>{" "}
                            {t(`tickets.${ticket.key}.category`)}
                          </p>
                          <p className="text-sm text-espresso-light mb-3">
                            <span className="font-semibold text-espresso-dark">
                              {t("assignedTo")}:
                            </span>{" "}
                            {t(`tickets.${ticket.key}.assignee`)}
                          </p>
                          <p className="text-sm text-espresso-light mb-4">
                            <span className="font-semibold text-espresso-dark">
                              {t("messagesCount")}:
                            </span>{" "}
                            {ticket.messages}
                          </p>
                          <Button className="bg-amber-600 hover:bg-amber-700 text-white w-full">
                            <MessageSquare className="w-4 h-4 mr-2" />{" "}
                            {t("viewDetails")}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* System Status */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                {t("systemStatus")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemServices.map((service) => {
                  const statusColor =
                    service.status === "operational"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600";
                  const statusIcon =
                    service.status === "operational" ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    );
                  return (
                    <Card
                      key={service.id}
                      className="bg-white border-2 border-amber-100 hover:shadow-md transition-all"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-espresso-dark">
                            {t(`services.${service.key}`)}
                          </h4>
                          <div
                            className={`px-3 py-1 rounded-full ${statusColor} text-xs font-medium flex items-center gap-2`}
                          >
                            {statusIcon}
                            {service.status === "operational"
                              ? t("operational")
                              : t("issues")}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-espresso-light">
                          <p>
                            Uptime:{" "}
                            <span className="text-emerald-600 font-semibold">
                              {service.uptime}
                            </span>
                          </p>
                          <p>
                            {t("responseTime")}:{" "}
                            <span className="text-espresso-dark font-semibold">
                              {service.responseTime}
                            </span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============= CHANGELOG TAB ============= */}
        {activeTab === "changelog" && (
          <div className="space-y-8">
            {/* Changelog Filter */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-4">
                {t("changeHistory")}
              </h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { id: "all" as const, label: t("changelogFilter.all") },
                  {
                    id: "feature" as const,
                    label: t("changelogFilter.features"),
                  },
                  {
                    id: "bugfix" as const,
                    label: t("changelogFilter.bugfixes"),
                  },
                  {
                    id: "improvement" as const,
                    label: t("changelogFilter.improvements"),
                  },
                ].map((filter) => (
                  <Button
                    key={filter.id}
                    variant={
                      changelogFilter === filter.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setChangelogFilter(filter.id)}
                    className={`rounded-full ${
                      changelogFilter === filter.id
                        ? "bg-espresso shadow-md hover:bg-espresso/90"
                        : "border-2 border-amber-200 text-espresso-light hover:bg-amber-50"
                    }`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Changelog Entries */}
            <div className="space-y-4">
              {filteredChangelog.map((entry, idx) => {
                const typeConfig = {
                  feature: {
                    badge: "success",
                    icon: Sparkles,
                    labelKey: "changelogType.feature",
                  },
                  bugfix: {
                    badge: "destructive" as const,
                    icon: AlertCircle,
                    labelKey: "changelogType.bugfix",
                  },
                  improvement: {
                    badge: "info" as const,
                    icon: TrendingUp,
                    labelKey: "changelogType.improvement",
                  },
                } as const;
                const type = typeConfig[entry.type];
                const TypeIcon = type.icon;
                return (
                  <Card
                    key={idx}
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 pt-1">
                          <TypeIcon
                            className={`w-5 h-5 ${type.badge === "success" ? "text-emerald-600" : type.badge === "destructive" ? "text-red-600" : "text-blue-600"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-espresso-dark">
                              v{entry.version}
                            </h3>
                            <span className="text-xs text-espresso-light">
                              {entry.date}
                            </span>
                            <Badge
                              variant={type.badge}
                              className={`text-xs ${
                                type.badge === "success"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : type.badge === "destructive"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {t(type.labelKey)}
                            </Badge>
                          </div>
                          <ul className="space-y-1">
                            {Array.from({ length: entry.changeCount }).map(
                              (_, changeIdx) => (
                                <li
                                  key={changeIdx}
                                  className="text-sm text-espresso-light flex items-start gap-2"
                                >
                                  <ArrowRight className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                  {t(
                                    `changelog.v${entry.version.replace(/\./g, "_")}.${changeIdx}`,
                                  )}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
