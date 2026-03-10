"use client";

import { useState } from "react";
import {
  Eye,
  ExternalLink,
  Monitor,
  Plus,
  Search,
  Edit2,
  Clock,
  Image,
  Save,
  X,
  Star,
  Hash,
  MapPin,
  Phone,
  FileText,
  Handshake,
  BarChart3,
  Target,
  Building2,
  Truck,
  ChevronDown,
  ChevronRight,
  Zap,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Lock,
  Zap as ZapIcon,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  useWebsiteConfig,
  useBulkUpdateWebsiteConfig,
} from "@/lib/hooks/use-website-config";

// ═══ Types ═══

type TabId = "content" | "partnership" | "analytics" | "seo" | "settings";

interface ContentField {
  key: string;
  label: string;
  value: string;
  saved: boolean;
  isLong?: boolean;
  hint?: string;
  charLimit?: number;
}

interface ContentSection {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  fields: ContentField[];
  isExpanded?: boolean;
  lastUpdated?: string;
  editedBy?: string;
  versions?: { date: string; user: string }[];
}

interface Partner {
  id: string;
  name: string;
  type: "location" | "supplier" | "service";
  status: "active" | "pending" | "expired";
  contact: string;
  phone: string;
  since: string;
  machines?: number;
  revenue?: number;
  contractStart?: string;
  contractEnd?: string;
  commission?: number;
  notes?: string;
}

interface PagePerformance {
  path: string;
  visitors: number;
  avgTime: string;
  bounce: number;
  conversions: number;
}

interface KeywordRanking {
  keyword: string;
  position: number;
  change: number;
  searchVolume: number;
  difficulty: number;
}

// ═══ Content Sections Data ═══

const CONTENT_SECTIONS: ContentSection[] = [
  {
    id: "hero",
    name: "Hero",
    icon: Zap,
    description: "Главный баннер",
    lastUpdated: "2026-02-28",
    editedBy: "Jamshid",
    versions: [
      { date: "2026-02-28 14:30", user: "Jamshid" },
      { date: "2026-02-25 10:15", user: "Admin" },
      { date: "2026-02-20 09:45", user: "Jamshid" },
    ],
    fields: [
      {
        key: "hero_title",
        label: "Заголовок",
        value: "Кофе, который вас разбудит",
        saved: true,
        charLimit: 80,
      },
      {
        key: "hero_subtitle",
        label: "Подзаголовок",
        value: "Премиальный кофе из автоматов VendHub. Свежий. Горячий. 24/7.",
        saved: true,
        isLong: true,
        charLimit: 200,
      },
      {
        key: "hero_image",
        label: "Фоновое изображение",
        value: "/hero-bg.jpg",
        saved: true,
      },
    ],
  },
  {
    id: "features",
    name: "Возможности",
    icon: Star,
    description: "Основные преимущества",
    lastUpdated: "2026-02-26",
    editedBy: "Admin",
    versions: [
      { date: "2026-02-26 11:20", user: "Admin" },
      { date: "2026-02-22 16:00", user: "Jamshid" },
    ],
    fields: [
      {
        key: "feat_title",
        label: "Заголовок",
        value: "Почему VendHub?",
        saved: true,
        charLimit: 60,
      },
      {
        key: "feat_count",
        label: "Кол-во особенностей",
        value: "4",
        saved: true,
      },
    ],
  },
  {
    id: "products",
    name: "Товары",
    icon: Hash,
    description: "22 напитка и снэки",
    lastUpdated: "2026-02-28",
    editedBy: "Jamshid",
    versions: [
      { date: "2026-02-28 13:00", user: "Jamshid" },
      { date: "2026-02-15 10:30", user: "Admin" },
    ],
    fields: [
      {
        key: "prod_title",
        label: "Заголовок",
        value: "Наше меню",
        saved: true,
        charLimit: 60,
      },
      {
        key: "prod_desc",
        label: "Описание",
        value: "22 премиальных напитков и закусок на любой вкус",
        saved: true,
        isLong: true,
        charLimit: 200,
      },
      {
        key: "prod_featured",
        label: "Избранные (кол-во)",
        value: "4",
        saved: true,
      },
    ],
  },
  {
    id: "locations",
    name: "Локации",
    icon: MapPin,
    description: "Где нас найти",
    lastUpdated: "2026-02-15",
    editedBy: "Admin",
    versions: [{ date: "2026-02-15 13:20", user: "Admin" }],
    fields: [
      {
        key: "loc_title",
        label: "Заголовок",
        value: "Где нас найти",
        saved: true,
      },
      {
        key: "loc_text",
        label: "Описание",
        value: "Наши автоматы расположены в самых посещаемых местах Ташкента",
        saved: true,
        charLimit: 200,
      },
    ],
  },
  {
    id: "contacts",
    name: "Контакты",
    icon: Phone,
    description: "Контактная информация",
    lastUpdated: "2026-02-15",
    editedBy: "Jamshid",
    versions: [{ date: "2026-02-15 13:20", user: "Jamshid" }],
    fields: [
      {
        key: "phone",
        label: "Телефон",
        value: "+998 71 200 39 99",
        saved: true,
      },
      { key: "email", label: "Email", value: "info@vendhub.uz", saved: true },
      {
        key: "telegram",
        label: "Telegram",
        value: "@vendhub_support",
        saved: true,
      },
      {
        key: "address",
        label: "Адрес",
        value: "Ташкент, ул. Мустакиллик 59, офис 402",
        saved: true,
      },
    ],
  },
  {
    id: "seo",
    name: "SEO",
    icon: Search,
    description: "Meta-теги и OpenGraph",
    lastUpdated: "2026-02-28",
    editedBy: "Admin",
    versions: [
      { date: "2026-02-28 09:00", user: "Admin" },
      { date: "2026-02-20 15:40", user: "Jamshid" },
    ],
    fields: [
      {
        key: "meta_title",
        label: "Meta Title",
        value: "VendHub — кофейные автоматы в Ташкенте | Свежий кофе 24/7",
        saved: true,
        charLimit: 60,
      },
      {
        key: "meta_desc",
        label: "Meta Description",
        value:
          "Премиальный кофе из автоматов VendHub. 22 напитка, 16 точек по Ташкенту. Оплата Payme, Click, UZUM, наличные.",
        saved: true,
        charLimit: 160,
      },
      {
        key: "og_image",
        label: "OG Image",
        value: "/og-vendhub.jpg",
        saved: true,
      },
    ],
  },
];

// ═══ Partners Data ═══

const PARTNERS: Partner[] = [
  {
    id: "1",
    name: "ТЦ Мега Планет",
    type: "location",
    status: "active",
    contact: "Алишер Х.",
    phone: "+998 90 123 45 67",
    since: "2025-08-15",
    machines: 2,
    revenue: 4_500_000,
    contractStart: "2025-08-15",
    contractEnd: "2027-08-14",
    commission: 15,
    notes: "ТЦ в центре Ташкента, высокая посещаемость",
  },
  {
    id: "2",
    name: "IT Park Tashkent",
    type: "location",
    status: "active",
    contact: "Бахтиёр М.",
    phone: "+998 91 234 56 78",
    since: "2025-09-01",
    machines: 1,
    revenue: 2_800_000,
    contractStart: "2025-09-01",
    contractEnd: "2027-09-01",
    commission: 20,
  },
  {
    id: "3",
    name: "ИНХА Университет",
    type: "location",
    status: "active",
    contact: "Шахзод К.",
    phone: "+998 93 345 67 89",
    since: "2025-10-10",
    machines: 1,
    revenue: 1_900_000,
    contractStart: "2025-10-10",
    contractEnd: "2026-10-09",
    commission: 12,
  },
  {
    id: "4",
    name: "ТРЦ Samarqand Darvoza",
    type: "location",
    status: "active",
    contact: "Нодира А.",
    phone: "+998 94 456 78 90",
    since: "2025-11-20",
    machines: 1,
    revenue: 2_100_000,
    contractStart: "2025-11-20",
    contractEnd: "2027-11-19",
    commission: 18,
  },
  {
    id: "5",
    name: "Westminster University",
    type: "location",
    status: "pending",
    contact: "John S.",
    phone: "+998 95 567 89 01",
    since: "2026-01-15",
    machines: 0,
    revenue: 0,
    contractStart: "2026-03-01",
    contractEnd: "2027-02-28",
    commission: 15,
  },
  {
    id: "6",
    name: "Necta (Evoca Group)",
    type: "supplier",
    status: "active",
    contact: "Marco R.",
    phone: "+39 035 606 111",
    since: "2025-06-01",
    machines: 0,
    revenue: 0,
  },
  {
    id: "7",
    name: "Lavazza",
    type: "supplier",
    status: "active",
    contact: "Дмитрий В.",
    phone: "+998 90 987 65 43",
    since: "2025-07-01",
    machines: 0,
    revenue: 0,
  },
  {
    id: "8",
    name: "ТехноСервис",
    type: "service",
    status: "active",
    contact: "Фарход И.",
    phone: "+998 91 876 54 32",
    since: "2025-08-01",
    machines: 0,
    revenue: 0,
  },
];

const PARTNER_TYPE_CONFIG = {
  location: {
    label: "Локация",
    color: "bg-blue-100 text-blue-700",
    icon: MapPin,
  },
  supplier: {
    label: "Поставщик",
    color: "bg-emerald-100 text-emerald-700",
    icon: Truck,
  },
  service: {
    label: "Сервис",
    color: "bg-purple-100 text-purple-700",
    icon: Building2,
  },
};

const STATUS_CONFIG = {
  active: { label: "Активен", badge: "success" as const },
  pending: { label: "Ожидание", badge: "warning" as const },
  expired: { label: "Истёк", badge: "destructive" as const },
};

// ═══ Analytics Data ═══

const DAILY_VISITORS = [
  { day: "Вт 17", visitors: 320 },
  { day: "Ср 18", visitors: 380 },
  { day: "Чт 19", visitors: 350 },
  { day: "Пт 20", visitors: 520 },
  { day: "Сб 21", visitors: 680 },
  { day: "Вс 22", visitors: 620 },
  { day: "Пн 23", visitors: 450 },
  { day: "Вт 24", visitors: 390 },
  { day: "Ср 25", visitors: 410 },
  { day: "Чт 26", visitors: 480 },
  { day: "Пт 27", visitors: 590 },
  { day: "Сб 28", visitors: 710 },
  { day: "Вс 01", visitors: 640 },
  { day: "Пн 02", visitors: 420 },
];

const TRAFFIC_SOURCES = [
  { name: "Поиск", value: 45, color: "#f59e0b" },
  { name: "Telegram", value: 25, color: "#3b82f6" },
  { name: "Прямой", value: 18, color: "#10b981" },
  { name: "Соцсети", value: 12, color: "#8b5cf6" },
];

const DEVICE_DATA = [
  { name: "Desktop", value: 58, color: "#f59e0b" },
  { name: "Mobile", value: 35, color: "#3b82f6" },
  { name: "Tablet", value: 7, color: "#10b981" },
];

const GEO_TOP_CITIES = [
  { city: "Мирабадский", visitors: 680, color: "#f59e0b" },
  { city: "Чилончар", visitors: 520, color: "#3b82f6" },
  { city: "Юнусабадский", visitors: 450, color: "#10b981" },
  { city: "Ташкентский", visitors: 380, color: "#8b5cf6" },
  { city: "Сергеливский", visitors: 290, color: "#ef4444" },
];

const PAGE_PERFORMANCE: PagePerformance[] = [
  {
    path: "Главная (/)",
    visitors: 5200,
    avgTime: "1:42",
    bounce: 32,
    conversions: 15,
  },
  {
    path: "Меню (/menu)",
    visitors: 3800,
    avgTime: "2:15",
    bounce: 25,
    conversions: 12,
  },
  {
    path: "Локации (/locations)",
    visitors: 2400,
    avgTime: "1:58",
    bounce: 28,
    conversions: 8,
  },
  {
    path: "О нас (/about)",
    visitors: 1100,
    avgTime: "1:20",
    bounce: 45,
    conversions: 3,
  },
  {
    path: "Партнёрство (/partnership)",
    visitors: 680,
    avgTime: "3:05",
    bounce: 18,
    conversions: 8,
  },
];

const KEYWORD_RANKINGS: KeywordRanking[] = [
  {
    keyword: "кофейные автоматы Ташкент",
    position: 3,
    change: 1,
    searchVolume: 2400,
    difficulty: 65,
  },
  {
    keyword: "вендинг кофе",
    position: 5,
    change: -1,
    searchVolume: 1800,
    difficulty: 58,
  },
  {
    keyword: "кофе автомат",
    position: 2,
    change: 0,
    searchVolume: 3200,
    difficulty: 72,
  },
  {
    keyword: "VendHub",
    position: 1,
    change: 0,
    searchVolume: 500,
    difficulty: 15,
  },
  {
    keyword: "купить кофе на работу",
    position: 8,
    change: 2,
    searchVolume: 1200,
    difficulty: 42,
  },
  {
    keyword: "вендинг Узбекистан",
    position: 12,
    change: -2,
    searchVolume: 900,
    difficulty: 55,
  },
  {
    keyword: "кофе автомат Узбекистан",
    position: 4,
    change: 1,
    searchVolume: 1500,
    difficulty: 68,
  },
  {
    keyword: "горячие напитки автомат",
    position: 6,
    change: 0,
    searchVolume: 2100,
    difficulty: 48,
  },
  {
    keyword: "вендинг оборудование",
    position: 9,
    change: 1,
    searchVolume: 800,
    difficulty: 62,
  },
  {
    keyword: "кофейные машины",
    position: 11,
    change: -1,
    searchVolume: 950,
    difficulty: 55,
  },
];

const GSC_STATS = {
  impressions: 24_500,
  clicks: 1_850,
  ctr: 7.5,
  avgPosition: 4.2,
};

const REDIRECT_RULES = [
  { id: "1", from: "/old-menu", to: "/menu", status: "active", hits: 1250 },
  {
    id: "2",
    from: "/promo-2025",
    to: "/promotions",
    status: "active",
    hits: 380,
  },
  { id: "3", from: "/about-us", to: "/about", status: "active", hits: 95 },
];

// fmt is now imported as formatNumber from "@/lib/utils"

// ═══ Tab: Content ═══

function ContentTab() {
  // Fetch website config from API
  const { data: configData } = useWebsiteConfig();
  const bulkUpdate = useBulkUpdateWebsiteConfig();

  // Merge API config values into content sections
  const configMap = new Map<string, string>();
  if (Array.isArray(configData)) {
    for (const c of configData as Array<{ key: string; value: string }>) {
      configMap.set(c.key, c.value);
    }
  }

  const initialSections = CONTENT_SECTIONS.map((sec) => ({
    ...sec,
    fields: sec.fields.map((f) => {
      const apiValue = configMap.get(f.key);
      return apiValue !== undefined
        ? { ...f, value: apiValue, saved: true }
        : f;
    }),
  }));

  const [sections, setSections] = useState(initialSections);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["hero"]));
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(
    null,
  );

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const unsavedCount = sections.reduce(
    (s, sec) => s + sec.fields.filter((f) => !f.saved).length,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-espresso-light">
            {sections.length} секций ·{" "}
            {sections.reduce((s, sec) => s + sec.fields.length, 0)} полей
          </p>
          {unsavedCount > 0 && (
            <p className="text-xs text-amber-600 font-medium">
              {unsavedCount} несохранённых изменений
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Eye className="h-4 w-4" />
            Превью
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <ExternalLink className="h-4 w-4" />
            vendhub.uz
          </Button>
          {unsavedCount > 0 && (
            <Button
              size="sm"
              className="gap-1 bg-espresso hover:bg-espresso-dark"
              disabled={bulkUpdate.isPending}
              onClick={() => {
                const unsavedFields = sections.flatMap((sec) =>
                  sec.fields
                    .filter((f) => !f.saved)
                    .map((f) => ({
                      key: f.key,
                      value: f.value,
                      section: sec.id,
                    })),
                );
                bulkUpdate.mutate(unsavedFields, {
                  onSuccess: () => {
                    setSections((prev) =>
                      prev.map((sec) => ({
                        ...sec,
                        fields: sec.fields.map((f) => ({
                          ...f,
                          saved: true,
                        })),
                      })),
                    );
                  },
                });
              }}
            >
              <Save className="h-4 w-4" />
              {bulkUpdate.isPending
                ? "Сохранение..."
                : `Опубликовать все (${unsavedCount})`}
            </Button>
          )}
        </div>
      </div>

      {sections.map((sec) => {
        const Icon = sec.icon;
        const isExpanded = expanded.has(sec.id);
        const showHistory = showVersionHistory === sec.id;
        return (
          <Card key={sec.id}>
            <Button
              variant="ghost"
              onClick={() => toggle(sec.id)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="rounded-lg bg-espresso-50 p-2">
                  <Icon className="h-4 w-4 text-espresso" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-espresso-dark">
                    {sec.name}
                  </h3>
                  <p className="text-xs text-espresso-light">
                    {sec.description}
                  </p>
                  {sec.lastUpdated && (
                    <p className="text-[10px] text-espresso-light mt-0.5">
                      Обновлено {sec.lastUpdated}
                      {sec.editedBy ? ` • ${sec.editedBy}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-espresso-light">
                  {sec.fields.length}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-espresso-light" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-espresso-light" />
                )}
              </div>
            </Button>
            {isExpanded && (
              <CardContent className="border-t border-espresso/10 pt-4 space-y-4">
                {showHistory && sec.versions && (
                  <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-blue-900">
                        История версий
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowVersionHistory(null)}
                        className="h-6 w-6 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {sec.versions.map((v, i) => (
                        <div
                          key={i}
                          className="text-[11px] text-blue-700 flex items-center gap-2 py-1"
                        >
                          <Clock className="h-3 w-3" />
                          <span>{v.date}</span>
                          <span className="text-blue-600">— {v.user}</span>
                          {i === 0 && (
                            <Badge variant="default" className="text-[9px]">
                              Текущая
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {sec.fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-espresso-dark">
                          {field.label}
                        </label>
                        {field.charLimit && (
                          <span
                            className={cn(
                              "text-[10px]",
                              field.value.length > field.charLimit * 0.8
                                ? "text-amber-600 font-medium"
                                : "text-espresso-light",
                            )}
                          >
                            {field.value.length}/{field.charLimit}
                          </span>
                        )}
                      </div>
                      {field.isLong ? (
                        <Textarea
                          value={field.value}
                          readOnly
                          className="text-sm resize-none bg-espresso-50"
                          rows={3}
                        />
                      ) : (
                        <Input
                          value={field.value}
                          readOnly
                          className="text-sm bg-espresso-50"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-espresso/10">
                  {sec.versions && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() =>
                        setShowVersionHistory(showHistory ? null : sec.id)
                      }
                    >
                      <Clock className="h-3.5 w-3.5" />
                      История
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="gap-1 bg-espresso hover:bg-espresso-dark"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Редактировать
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ═══ Tab: SEO ═══

function SeoTab() {
  const [seoPages, _setSeoPages] = useState([
    {
      path: "/",
      title: "VendHub — кофейные автоматы в Ташкенте | Свежий кофе 24/7",
      description:
        "Премиальный кофе из автоматов VendHub. 22 напитка, 16 точек по Ташкенту.",
      ogImage: "/og-home.jpg",
    },
    {
      path: "/menu",
      title: "Меню VendHub — все напитки и закуски",
      description:
        "Полное меню с 22 премиальными напитками и закусками. Состав, цены, калории.",
      ogImage: "/og-menu.jpg",
    },
    {
      path: "/locations",
      title: "Локации VendHub в Ташкенте — все адреса",
      description:
        "Найдите ближайший автомат VendHub. Интерактивная карта всех 16 точек.",
      ogImage: "/og-locations.jpg",
    },
  ]);

  return (
    <div className="space-y-4">
      {/* Google Search Console Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-[10px] text-amber-600 uppercase tracking-wide">
              Показы
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {formatNumber(GSC_STATS.impressions)}
            </p>
            <p className="text-[10px] text-amber-600 mt-1">Последние 28 дней</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-[10px] text-blue-600 uppercase tracking-wide">
              Клики
            </p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {formatNumber(GSC_STATS.clicks)}
            </p>
            <p className="text-[10px] text-blue-600 mt-1">
              Из органического поиска
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50">
          <CardContent className="pt-4">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wide">
              CTR
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {GSC_STATS.ctr}%
            </p>
            <p className="text-[10px] text-emerald-600 mt-1">
              Конверсия кликов
            </p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="pt-4">
            <p className="text-[10px] text-purple-600 uppercase tracking-wide">
              Позиция
            </p>
            <p className="text-2xl font-bold text-purple-700 mt-1">
              {GSC_STATS.avgPosition.toFixed(1)}
            </p>
            <p className="text-[10px] text-purple-600 mt-1">В среднем в топ</p>
          </CardContent>
        </Card>
      </div>

      {/* SEO Pages */}
      <div className="space-y-3">
        {seoPages.map((page, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="mb-4 pb-3 border-b border-espresso/10">
                <p className="text-xs font-semibold text-espresso-dark mb-1">
                  Путь страницы
                </p>
                <code className="text-sm text-amber-600 font-mono">
                  {page.path}
                </code>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-espresso-dark mb-1">
                    Meta Title
                  </p>
                  <div className="bg-espresso-50 p-2 rounded text-xs text-espresso-dark">
                    {page.title}
                  </div>
                  <p className="text-[9px] text-espresso-light mt-1">
                    {page.title.length}/60 символов
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-espresso-dark mb-1">
                    Meta Description
                  </p>
                  <div className="bg-espresso-50 p-2 rounded text-xs text-espresso-dark">
                    {page.description}
                  </div>
                  <p className="text-[9px] text-espresso-light mt-1">
                    {page.description.length}/160 символов
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-espresso-dark mb-1">
                    Open Graph Preview
                  </p>
                  <div className="border border-espresso/20 rounded p-2 bg-white">
                    <div className="bg-espresso-50 rounded h-24 flex items-center justify-center mb-2">
                      <Image className="h-8 w-8 text-espresso-light" />
                    </div>
                    <p className="text-xs font-semibold text-espresso-dark">
                      {page.title}
                    </p>
                    <p className="text-[11px] text-espresso-light">
                      {page.description}
                    </p>
                    <p className="text-[9px] text-amber-600 mt-1">
                      vendhub.uz{page.path}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full mt-3 gap-1 bg-espresso hover:bg-espresso-dark"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Редактировать SEO
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sitemap & Robots */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Индексирование</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-espresso-dark">Sitemap</p>
              <p className="text-xs text-espresso-light">
                vendhub.uz/sitemap.xml
              </p>
            </div>
            <Badge variant="success">Актуален</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-espresso-dark">
                Robots.txt
              </p>
              <p className="text-xs text-espresso-light">
                vendhub.uz/robots.txt
              </p>
            </div>
            <Badge variant="success">Активен</Badge>
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            Пересоздать sitemap
          </Button>
        </CardContent>
      </Card>

      {/* Keyword Rankings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Позиции ключевых слов (топ 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {KEYWORD_RANKINGS.map((kw, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded hover:bg-espresso-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-espresso-dark truncate">
                    {kw.keyword}
                  </p>
                  <p className="text-xs text-espresso-light">
                    {formatNumber(kw.searchVolume)} объём поиска • Сложность{" "}
                    {kw.difficulty}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-espresso-dark w-12 text-right">
                    #{kw.position}
                  </span>
                  {kw.change > 0 && (
                    <div className="flex items-center gap-0.5 text-xs text-emerald-600">
                      <ArrowUp className="h-3 w-3" />
                      {kw.change}
                    </div>
                  )}
                  {kw.change < 0 && (
                    <div className="flex items-center gap-0.5 text-xs text-red-600">
                      <ArrowDown className="h-3 w-3" />
                      {Math.abs(kw.change)}
                    </div>
                  )}
                  {kw.change === 0 && (
                    <span className="text-xs text-espresso-light">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ Tab: Аналитика ═══

function AnalyticsTab() {
  return (
    <div className="space-y-4">
      {/* Visitors by Day */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Посетители (14 дней)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={DAILY_VISITORS}>
              <CartesianGrid stroke="#f3e8d0" />
              <XAxis dataKey="day" stroke="#92400e" fontSize={11} />
              <YAxis stroke="#92400e" fontSize={11} />
              <Tooltip formatter={(v: unknown) => [String(v), "Посетители"]} />
              <Area
                type="monotone"
                dataKey="visitors"
                fill="#f59e0b"
                stroke="#d97706"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Traffic Sources & Device Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Источники трафика</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={TRAFFIC_SOURCES}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {TRAFFIC_SOURCES.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => String(v) + "%"} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Устройства</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEVICE_DATA.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-espresso-dark">{d.name}</p>
                    <p className="text-sm font-semibold text-espresso-dark">
                      {d.value}%
                    </p>
                  </div>
                  <div className="h-2 bg-espresso-50 rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${d.value}%`, backgroundColor: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Топ страницы (5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PAGE_PERFORMANCE.map((p, i) => (
              <div
                key={i}
                className="p-2 rounded hover:bg-espresso-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium text-espresso-dark">
                    {p.path}
                  </p>
                  <Badge variant="default">{p.conversions} конв.</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-espresso-light">
                  <p>Просмотров: {formatNumber(p.visitors)}</p>
                  <p>Отскок: {p.bounce}%</p>
                  <p>Время: {p.avgTime}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Geography */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">География (топ 5 районов)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={GEO_TOP_CITIES}>
              <CartesianGrid stroke="#f3e8d0" />
              <XAxis dataKey="city" stroke="#92400e" fontSize={11} />
              <YAxis stroke="#92400e" fontSize={11} />
              <Tooltip />
              <Bar dataKey="visitors" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ Tab: Настройки ═══

function SettingsTab() {
  return (
    <div className="space-y-4">
      {/* Domain Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Домен</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-espresso-50 rounded-lg border border-espresso/20">
            <p className="text-xs text-espresso-light mb-1">Основной домен</p>
            <p className="text-lg font-semibold text-espresso-dark">
              vendhub.uz
            </p>
          </div>
          <div className="p-3 bg-espresso-50 rounded-lg border border-espresso/20">
            <p className="text-xs text-espresso-light mb-1">
              Статус регистрации
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-espresso-dark">
                Активен до 15.03.2027
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1">
            <Edit2 className="h-3.5 w-3.5" />
            Управлять доменом
          </Button>
        </CardContent>
      </Card>

      {/* SSL Certificate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">SSL/TLS Сертификат</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-start gap-2">
            <Lock className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-900">
                Let's Encrypt
              </p>
              <p className="text-xs text-emerald-700">
                Сертификат действителен и автоматически обновляется
              </p>
              <p className="text-[10px] text-emerald-600 mt-1">
                Истекает: 15.06.2026
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CDN Cache */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">CDN и кеш</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Cloudflare CDN
            </p>
            <p className="text-xs text-blue-700">
              Кеш активирован для всех статических ресурсов
            </p>
            <p className="text-[10px] text-blue-600 mt-2">
              Время жизни кеша: 24 часа (можно очистить)
            </p>
          </div>
          <Button
            size="sm"
            className="w-full gap-1 bg-blue-600 hover:bg-blue-700"
          >
            <ZapIcon className="h-3.5 w-3.5" />
            Очистить кеш CDN
          </Button>
        </CardContent>
      </Card>

      {/* Redirect Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Правила переадресации (3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {REDIRECT_RULES.map((rule) => (
            <div
              key={rule.id}
              className="p-2 rounded bg-espresso-50 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-espresso-dark">
                  {rule.from} → {rule.to}
                </p>
                <p className="text-[10px] text-espresso-light">
                  {formatNumber(rule.hits)} переходов
                </p>
              </div>
              <Badge variant="success">
                {rule.status === "active" ? "Активно" : "Отключено"}
              </Badge>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full gap-1 mt-2">
            <Plus className="h-3.5 w-3.5" />
            Добавить правило
          </Button>
        </CardContent>
      </Card>

      {/* Custom Scripts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Скрипты аналитики</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-900">
                  Google Analytics 4
                </p>
                <code className="text-[10px] text-emerald-700 font-mono">
                  G-XXXXXXXXXX
                </code>
              </div>
            </div>
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-900">
                  Yandex Metrica
                </p>
                <code className="text-[10px] text-emerald-700 font-mono">
                  123456789
                </code>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1">
            <Edit2 className="h-3.5 w-3.5" />
            Редактировать скрипты
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ Partnership Tab ═══

function PartnershipTab() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [page, setPage] = useState(1);

  const filtered = PARTNERS.filter((p) => {
    const matchType = typeFilter === "all" || p.type === typeFilter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const paginatedPartners = filtered.slice((page - 1) * 5, page * 5);
  const totalPages = Math.ceil(filtered.length / 5);

  const locationPartners = PARTNERS.filter((p) => p.type === "location");
  const totalMachines = locationPartners.reduce(
    (s, p) => s + (p.machines ?? 0),
    0,
  );
  const totalRevenue = locationPartners.reduce(
    (s, p) => s + (p.revenue ?? 0),
    0,
  );

  const revenueByPartner = locationPartners
    .filter((p) => (p.revenue ?? 0) > 0)
    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
    .slice(0, 5)
    .map((p) => ({
      name: p.name.split(" ")[0],
      revenue: (p.revenue ?? 0) / 1_000_000,
    }));

  const typeDistribution = [
    { name: "Локации", value: locationPartners.length, color: "#f59e0b" },
    {
      name: "Поставщики",
      value: PARTNERS.filter((p) => p.type === "supplier").length,
      color: "#10b981",
    },
    {
      name: "Сервис",
      value: PARTNERS.filter((p) => p.type === "service").length,
      color: "#8b5cf6",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-[10px] text-blue-600 uppercase tracking-wide">
            Партнёров
          </p>
          <p className="text-xl font-bold text-blue-700">{PARTNERS.length}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-[10px] text-emerald-600 uppercase tracking-wide">
            Локации
          </p>
          <p className="text-xl font-bold text-emerald-700">
            {locationPartners.length}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-[10px] text-amber-600 uppercase tracking-wide">
            Автоматов
          </p>
          <p className="text-xl font-bold text-amber-700">{totalMachines}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3">
          <p className="text-[10px] text-purple-600 uppercase tracking-wide">
            Выручка/мес
          </p>
          <p className="text-xl font-bold text-purple-700">
            {formatNumber(totalRevenue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Выручка по партнёрам (топ 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByPartner}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                <XAxis dataKey="name" stroke="#92400e" fontSize={11} />
                <YAxis stroke="#92400e" fontSize={10} />
                <Tooltip
                  formatter={(v: unknown) => `${(v as number).toFixed(1)}M UZS`}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Типы партнёров</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                  fontSize={11}
                >
                  {typeDistribution.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-light" />
          <Input
            placeholder="Поиск партнёра..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {[
            { id: "all", label: "Все" },
            { id: "location", label: "Локации" },
            { id: "supplier", label: "Поставщики" },
            { id: "service", label: "Сервис" },
          ].map((f) => (
            <Button
              key={f.id}
              variant={typeFilter === f.id ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setTypeFilter(f.id);
                setPage(1);
              }}
              className={
                typeFilter === f.id
                  ? "bg-espresso hover:bg-espresso-dark"
                  : "text-espresso-light hover:bg-espresso-50"
              }
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button size="sm" className="gap-1 bg-espresso hover:bg-espresso-dark">
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {selectedPartner && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-espresso-dark">
                  {selectedPartner.name}
                </h3>
                <p className="text-xs text-espresso-light mt-0.5">
                  Контакт: {selectedPartner.contact}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPartner(null)}
                className="h-8 w-8 text-espresso-light hover:text-espresso"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-espresso-light">Статус</p>
                <Badge variant={STATUS_CONFIG[selectedPartner.status].badge}>
                  {STATUS_CONFIG[selectedPartner.status].label}
                </Badge>
              </div>
              {selectedPartner.contractStart && (
                <div>
                  <p className="text-[10px] text-espresso-light">Договор</p>
                  <p className="text-xs text-espresso-dark">
                    {new Date(selectedPartner.contractStart).toLocaleDateString(
                      "ru-RU",
                    )}{" "}
                    — {formatDate(selectedPartner.contractEnd || "")}
                  </p>
                </div>
              )}
              {selectedPartner.commission && (
                <div>
                  <p className="text-[10px] text-espresso-light">Комиссия</p>
                  <p className="text-xs font-medium text-espresso-dark">
                    {selectedPartner.commission}%
                  </p>
                </div>
              )}
              {selectedPartner.revenue && selectedPartner.revenue > 0 && (
                <div>
                  <p className="text-[10px] text-espresso-light">Выручка</p>
                  <p className="text-xs font-medium text-emerald-600">
                    {formatNumber(selectedPartner.revenue)} UZS
                  </p>
                </div>
              )}
            </div>
            {selectedPartner.notes && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-[10px] text-espresso-light mb-1">
                  Примечания
                </p>
                <p className="text-xs text-espresso-dark">
                  {selectedPartner.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader className="border-b border-espresso/10 bg-espresso-50">
                <TableRow>
                  <TableHead className="px-4 py-2 text-left text-xs font-semibold text-espresso-dark">
                    Партнёр
                  </TableHead>
                  <TableHead className="px-4 py-2 text-left text-xs font-semibold text-espresso-dark">
                    Тип
                  </TableHead>
                  <TableHead className="px-4 py-2 text-left text-xs font-semibold text-espresso-dark">
                    Статус
                  </TableHead>
                  <TableHead className="px-4 py-2 text-left text-xs font-semibold text-espresso-dark">
                    Контакт
                  </TableHead>
                  <TableHead className="px-4 py-2 text-right text-xs font-semibold text-espresso-dark">
                    Действия
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPartners.map((p) => (
                  <TableRow
                    key={p.id}
                    className="border-b border-espresso/10 hover:bg-espresso-50/50"
                  >
                    <TableCell className="px-4 py-2">
                      <p className="text-xs font-medium text-espresso-dark">
                        {p.name}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {PARTNER_TYPE_CONFIG[p.type].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge
                        variant={STATUS_CONFIG[p.status].badge}
                        className="text-[10px]"
                      >
                        {STATUS_CONFIG[p.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <p className="text-xs text-espresso-light">{p.phone}</p>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPartner(p)}
                        className="h-6 w-6 p-0"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-espresso-light">
            Страница {page} из {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Main Component ═══

export default function WebsitePage() {
  const [activeTab, setActiveTab] = useState<TabId>("content");

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: "content", label: "Контент", icon: FileText },
    { id: "partnership", label: "Партнёрство", icon: Handshake },
    { id: "analytics", label: "Аналитика", icon: BarChart3 },
    { id: "seo", label: "SEO", icon: Target },
    { id: "settings", label: "Настройки", icon: Monitor },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-espresso-dark">
          Сайт VendHub
        </h1>
        <p className="text-sm text-espresso-light mt-1">
          Управление контентом, аналитикой и настройками vendhub.uz
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-espresso/10 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap flex items-center gap-2 rounded-none border-b-2 ${
                isActive
                  ? "border-espresso text-espresso-dark bg-espresso-50"
                  : "border-transparent text-espresso-light hover:text-espresso-dark hover:bg-espresso-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "content" && <ContentTab />}
      {activeTab === "partnership" && <PartnershipTab />}
      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "seo" && <SeoTab />}
      {activeTab === "settings" && <SettingsTab />}
    </div>
  );
}
