"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  FileText,
  BarChart3,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  SlideOver,
  SlideOverBody,
  SlideOverFooter,
} from "@/components/ui/slide-over";
import { cn, formatNumber, formatCurrency, formatDate } from "@/lib/utils";
import {
  useCounterparties,
  useContracts,
  type DbCounterparty,
  type DbContract,
} from "@/lib/hooks";

function mapDbCounterparty(db: DbCounterparty): Counterparty {
  return {
    id: db.id,
    name: db.name,
    type: db.type ?? "supplier",
    inn: db.inn ?? "",
    contactPerson: db.contact_person ?? "",
    phone: db.phone ?? "",
    email: db.email ?? "",
    balance: db.balance,
    status: db.status,
    address: db.address ?? undefined,
    bank: db.bank ?? undefined,
    account: db.account ?? undefined,
    mfo: db.mfo ?? undefined,
    notes: db.notes ?? undefined,
  };
}

function mapDbContract(db: DbContract): Contract {
  return {
    id: db.id,
    number: db.number,
    counterpartyId: db.counterparty_id,
    counterpartyName: db.counterparty_name ?? "",
    type: (db.type as ContractType) || "supply",
    startDate: db.start_date,
    endDate: db.end_date,
    monthlyAmount: db.monthly_amount,
    status: db.status,
  };
}

// Types
type CounterpartyType =
  | "supplier"
  | "landlord"
  | "client"
  | "partner"
  | "service";
type CounterpartyStatus = "active" | "suspended";
type CounterpartyTab = "counterparties" | "contracts" | "analytics";
type ContractType =
  | "supply"
  | "rent"
  | "service"
  | "partnership"
  | "consumables";
type ContractStatus = "active" | "expiring" | "expired";

interface Counterparty {
  id: string;
  name: string;
  type: CounterpartyType;
  inn: string;
  contactPerson: string;
  phone: string;
  email: string;
  balance: number;
  status: CounterpartyStatus;
  address?: string;
  bank?: string;
  account?: string;
  mfo?: string;
  transactions?: Transaction[];
  notes?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
}

interface Contract {
  id: string;
  number: string;
  counterpartyId: string;
  counterpartyName: string;
  type: ContractType;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  status: ContractStatus;
}

interface DebtSummary {
  counterpartyName: string;
  balance: number;
  lastPaymentDate: string;
}

// Mock data
const mockCounterparties: Counterparty[] = [
  {
    id: "1",
    name: 'ООО "КофеМастер"',
    type: "supplier",
    inn: "307520145",
    contactPerson: "Рахимов А.К.",
    phone: "+998 90 123 45 67",
    email: "info@coffeemaster.uz",
    balance: -15200000,
    status: "active",
    address: "Ташкент, Чиланзарский р-н",
    bank: "Davr Bank",
    account: "1234567890",
    mfo: "00099",
    transactions: [
      {
        id: "1",
        date: "2026-02-28",
        description: "Поставка кофе",
        amount: -2500000,
      },
      { id: "2", date: "2026-02-25", description: "Платёж", amount: 1500000 },
      {
        id: "3",
        date: "2026-02-20",
        description: "Поставка сиропов",
        amount: -800000,
      },
    ],
    notes: "Основной поставщик кофейной продукции",
  },
  {
    id: "2",
    name: "ИП Алимов Р.Т.",
    type: "supplier",
    inn: "512489630",
    contactPerson: "Алимов Р.Т.",
    phone: "+998 91 234 56 78",
    email: "alimov@mail.uz",
    balance: -3400000,
    status: "active",
    address: "Ташкент, Яккасарайский р-н",
    bank: "Ipoteka Bank",
    account: "0987654321",
    mfo: "00198",
    transactions: [
      {
        id: "1",
        date: "2026-02-27",
        description: "Поставка хлебобулочных изделий",
        amount: -1200000,
      },
      { id: "2", date: "2026-02-20", description: "Платёж", amount: 800000 },
    ],
    notes: "Сезонный поставщик снэков",
  },
  {
    id: "3",
    name: 'ТЦ "Мега Чиланзар"',
    type: "landlord",
    inn: "201548796",
    contactPerson: "Юсупова Н.И.",
    phone: "+998 71 256 78 90",
    email: "rent@megachilanzar.uz",
    balance: 0,
    status: "active",
    address: "Ташкент, проспект Мустакиллика",
    bank: "Kapitalbank",
    account: "5678901234",
    mfo: "00300",
    transactions: [
      {
        id: "1",
        date: "2026-02-01",
        description: "Аренда помещения",
        amount: -4500000,
      },
    ],
    notes: "",
  },
  {
    id: "4",
    name: "KIUT University",
    type: "landlord",
    inn: "305681247",
    contactPerson: "Ибрагимов О.Д.",
    phone: "+998 71 234 00 01",
    email: "admin@kiut.uz",
    balance: -2500000,
    status: "active",
    address: "Ташкент, кампус KIUT",
    bank: "National Bank",
    account: "3456789012",
    mfo: "00050",
    transactions: [
      {
        id: "1",
        date: "2026-01-15",
        description: "Аренда помещения в кампусе",
        amount: -2000000,
      },
    ],
    notes: "Аренда места в университетском клубе",
  },
  {
    id: "5",
    name: "Necta Uzbekistan",
    type: "service",
    inn: "308741256",
    contactPerson: "Ли Д.В.",
    phone: "+998 93 345 67 89",
    email: "service@necta.uz",
    balance: 1800000,
    status: "active",
    address: "Ташкент, Юнусабадский р-н",
    bank: "ANORBANK",
    account: "2345678901",
    mfo: "00122",
    transactions: [
      {
        id: "1",
        date: "2026-02-15",
        description: "Платёж за сервис машин",
        amount: 1800000,
      },
    ],
    notes: "Обслуживание торговых автоматов",
  },
  {
    id: "6",
    name: 'ООО "CleanPro"',
    type: "supplier",
    inn: "309852147",
    contactPerson: "Каримов Б.С.",
    phone: "+998 94 456 78 90",
    email: "sales@cleanpro.uz",
    balance: -850000,
    status: "active",
    address: "Ташкент, Мирабадский р-н",
    bank: "Turon Bank",
    account: "1234567890",
    mfo: "00080",
    transactions: [
      {
        id: "1",
        date: "2026-02-28",
        description: "Поставка чистящих средств",
        amount: -850000,
      },
    ],
    notes: "Поставка расходников для уборки",
  },
  {
    id: "7",
    name: "Payme Processing",
    type: "partner",
    inn: "302159648",
    contactPerson: "Тур М.А.",
    phone: "+998 71 200 11 22",
    email: "partners@payme.uz",
    balance: 0,
    status: "active",
    address: "Ташкент, центр города",
    bank: "UzCard LLC",
    account: "9876543210",
    mfo: "00333",
    transactions: [
      {
        id: "1",
        date: "2026-02-28",
        description: "Коммиссия за переводы",
        amount: -150000,
      },
    ],
    notes: "Платёжный агент",
  },
  {
    id: "8",
    name: 'ООО "ВендСервис"',
    type: "service",
    inn: "311254789",
    contactPerson: "Петров И.С.",
    phone: "+998 95 567 89 01",
    email: "info@vendservice.uz",
    balance: -4200000,
    status: "suspended",
    address: "Ташкент, Шайхантохурский р-н",
    bank: "Orient Bank",
    account: "4567890123",
    mfo: "00155",
    transactions: [
      {
        id: "1",
        date: "2026-02-20",
        description: "Сервис и ремонт",
        amount: -2500000,
      },
      { id: "2", date: "2026-02-10", description: "Платёж", amount: 1000000 },
    ],
    notes: "Контракт приостановлен из-за неоплаты",
  },
  {
    id: "9",
    name: "Humo Arena",
    type: "landlord",
    inn: "304561298",
    contactPerson: "Назаров К.Л.",
    phone: "+998 71 211 33 44",
    email: "admin@humoarena.uz",
    balance: -1200000,
    status: "active",
    address: "Ташкент, Beslik Sports Complex",
    bank: "Central Bank",
    account: "5678901234",
    mfo: "00400",
    transactions: [
      {
        id: "1",
        date: "2026-02-01",
        description: "Аренда места в арене",
        amount: -5000000,
      },
      { id: "2", date: "2026-02-05", description: "Платёж", amount: 3800000 },
    ],
    notes: "Аренда в спортивной арене",
  },
  {
    id: "10",
    name: "IT Park Yashnabad",
    type: "landlord",
    inn: "306987412",
    contactPerson: "Мирзаев А.А.",
    phone: "+998 71 200 55 66",
    email: "admin@itpark.uz",
    balance: 0,
    status: "active",
    address: "Ташкент, IT Park Yashnabad",
    bank: "Davr Bank",
    account: "3456789012",
    mfo: "00099",
    transactions: [
      {
        id: "1",
        date: "2026-02-01",
        description: "Аренда офисного пространства",
        amount: -1500000,
      },
    ],
    notes: "Место в техпарке",
  },
];

const mockContracts: Contract[] = [
  {
    id: "1",
    number: "ДОГ-2025-001",
    counterpartyId: "1",
    counterpartyName: 'ООО "КофеМастер"',
    type: "supply",
    startDate: "2025-01-15",
    endDate: "2026-01-15",
    monthlyAmount: 18000000,
    status: "expired",
  },
  {
    id: "2",
    number: "ДОГ-2025-002",
    counterpartyId: "3",
    counterpartyName: 'ТЦ "Мега Чиланзар"',
    type: "rent",
    startDate: "2025-03-01",
    endDate: "2026-03-01",
    monthlyAmount: 4500000,
    status: "expiring",
  },
  {
    id: "3",
    number: "ДОГ-2025-003",
    counterpartyId: "4",
    counterpartyName: "KIUT University",
    type: "rent",
    startDate: "2025-06-01",
    endDate: "2026-06-01",
    monthlyAmount: 2000000,
    status: "active",
  },
  {
    id: "4",
    number: "ДОГ-2025-004",
    counterpartyId: "5",
    counterpartyName: "Necta Uzbekistan",
    type: "service",
    startDate: "2025-04-01",
    endDate: "2026-04-01",
    monthlyAmount: 3500000,
    status: "active",
  },
  {
    id: "5",
    number: "ДОГ-2025-005",
    counterpartyId: "6",
    counterpartyName: 'ООО "CleanPro"',
    type: "supply",
    startDate: "2025-07-01",
    endDate: "2026-07-01",
    monthlyAmount: 1200000,
    status: "active",
  },
  {
    id: "6",
    number: "ДОГ-2025-006",
    counterpartyId: "7",
    counterpartyName: "Payme Processing",
    type: "partnership",
    startDate: "2025-01-01",
    endDate: "2027-01-01",
    monthlyAmount: 0,
    status: "active",
  },
  {
    id: "7",
    number: "ДОГ-2025-007",
    counterpartyId: "9",
    counterpartyName: "Humo Arena",
    type: "rent",
    startDate: "2025-09-01",
    endDate: "2026-09-01",
    monthlyAmount: 5000000,
    status: "active",
  },
  {
    id: "8",
    number: "ДОГ-2025-008",
    counterpartyId: "10",
    counterpartyName: "IT Park Yashnabad",
    type: "rent",
    startDate: "2025-10-01",
    endDate: "2026-10-01",
    monthlyAmount: 1500000,
    status: "active",
  },
  {
    id: "9",
    number: "ДОГ-2026-001",
    counterpartyId: "1",
    counterpartyName: 'ООО "КофеМастер"',
    type: "supply",
    startDate: "2026-01-20",
    endDate: "2027-01-20",
    monthlyAmount: 20000000,
    status: "active",
  },
  {
    id: "10",
    number: "ДОГ-2025-009",
    counterpartyId: "2",
    counterpartyName: "ИП Алимов Р.Т.",
    type: "supply",
    startDate: "2025-05-01",
    endDate: "2026-05-01",
    monthlyAmount: 5500000,
    status: "active",
  },
  {
    id: "11",
    number: "ДОГ-2025-010",
    counterpartyId: "8",
    counterpartyName: 'ООО "ВендСервис"',
    type: "service",
    startDate: "2025-08-01",
    endDate: "2026-02-01",
    monthlyAmount: 2800000,
    status: "expired",
  },
  {
    id: "12",
    number: "ДОГ-2025-011",
    counterpartyId: "1",
    counterpartyName: 'ООО "КофеМастер"',
    type: "consumables",
    startDate: "2025-11-01",
    endDate: "2026-11-01",
    monthlyAmount: 3200000,
    status: "active",
  },
];

const typeColors: Record<CounterpartyType, { bg: string; text: string }> = {
  supplier: { bg: "bg-blue-100", text: "text-blue-700" },
  landlord: { bg: "bg-amber-100", text: "text-amber-700" },
  client: { bg: "bg-emerald-100", text: "text-emerald-700" },
  partner: { bg: "bg-purple-100", text: "text-purple-700" },
  service: { bg: "bg-cyan-100", text: "text-cyan-700" },
};

const TYPE_TRANSLATION_KEYS: Record<CounterpartyType, string> = {
  supplier: "typeSupplier",
  landlord: "typeLandlord",
  client: "typeClient",
  partner: "typePartner",
  service: "typeService",
};

const CONTRACT_TYPE_TRANSLATION_KEYS: Record<ContractType, string> = {
  supply: "contractTypeSupply",
  rent: "contractTypeRent",
  service: "contractTypeService",
  partnership: "contractTypePartnership",
  consumables: "contractTypeConsumables",
};

const CHART_COLORS = [
  "#f59e0b",
  "#d97706",
  "#92400e",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
];

// Tab configuration
const TABS = [
  {
    id: "counterparties" as const,
    labelKey: "tabCounterparties",
    icon: Building2,
  },
  { id: "contracts" as const, labelKey: "tabContracts", icon: FileText },
  { id: "analytics" as const, labelKey: "tabAnalytics", icon: BarChart3 },
];

export default function CounterpartiesPage() {
  const t = useTranslations("counterparties");
  const { data: dbCounterparties } = useCounterparties();
  const { data: dbContracts } = useContracts();
  const [activeTab, setActiveTab] = useState<CounterpartyTab>("counterparties");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCounterparty, setSelectedCounterparty] =
    useState<Counterparty | null>(null);

  // Use live data from API, fall back to mock
  const counterparties: Counterparty[] = dbCounterparties?.length
    ? (dbCounterparties as DbCounterparty[]).map(mapDbCounterparty)
    : mockCounterparties;

  const contracts: Contract[] = dbContracts?.length
    ? (dbContracts as DbContract[]).map(mapDbContract)
    : mockContracts;

  // Filtered counterparties
  const filteredCounterparties = counterparties.filter((cp) => {
    const matchesSearch =
      cp.name.toLowerCase().includes(search.toLowerCase()) ||
      cp.inn.includes(search);
    const matchesType = typeFilter === "all" || cp.type === typeFilter;
    const matchesStatus = statusFilter === "all" || cp.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Analytics data
  const totalCounterparties = counterparties.length;
  const activeContracts = contracts.filter((c) => c.status === "active").length;
  const creditorDebt = counterparties.reduce((sum, cp) => {
    if (cp.balance < 0) return sum + Math.abs(cp.balance);
    return sum;
  }, 0);
  const debtorAmount = counterparties.reduce((sum, cp) => {
    if (cp.balance > 0) return sum + cp.balance;
    return sum;
  }, 0);

  // Procurement by supplier (top 5)
  const procurementData = counterparties
    .filter((cp) => cp.type === "supplier")
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, 5)
    .map((cp) => ({
      name: cp.name.substring(0, 12),
      value: Math.abs(cp.balance),
    }));

  // Expenses by type
  const expensesByType: Record<CounterpartyType, number> = {
    supplier: 0,
    landlord: 0,
    client: 0,
    partner: 0,
    service: 0,
  };
  counterparties.forEach((cp) => {
    if (cp.balance < 0) {
      expensesByType[cp.type] += Math.abs(cp.balance);
    }
  });

  const expenseData = Object.entries(expensesByType)
    .filter(([, value]) => value > 0)
    .map(([type, value]) => ({
      name: t(TYPE_TRANSLATION_KEYS[type as CounterpartyType]),
      value,
    }));

  // Debt summary
  const debtSummary: DebtSummary[] = counterparties
    .filter((cp) => cp.balance !== 0)
    .sort((a, b) => b.balance - a.balance)
    .map((cp) => ({
      counterpartyName: cp.name,
      balance: cp.balance,
      lastPaymentDate: cp.transactions?.[0]?.date || "—",
    }));

  // Expiring contracts warning
  const expiringContracts = contracts.filter((c) => c.status === "expiring");

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-espresso">{t("pageTitle")}</h1>
          <p className="text-sm text-espresso-light mt-1">
            {t("pageSubtitle")}
          </p>
        </div>
        <Button className="gap-2 bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4" />
          {t("addCounterparty")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream/80 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5",
              activeTab === tab.id
                ? "bg-espresso hover:bg-espresso-dark shadow-sm"
                : "text-espresso-light hover:bg-espresso-50 hover:text-espresso",
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {t(tab.labelKey)}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "counterparties" && (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-espresso-light" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">{t("allTypes")}</option>
              <option value="supplier">{t("typeSupplier")}</option>
              <option value="landlord">{t("typeLandlord")}</option>
              <option value="client">{t("typeClient")}</option>
              <option value="partner">{t("typePartner")}</option>
              <option value="service">{t("typeService")}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">{t("allStatuses")}</option>
              <option value="active">{t("statusActive")}</option>
              <option value="suspended">{t("statusSuspended")}</option>
            </select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-cream/50">
                      <TableHead className="text-espresso font-semibold">
                        {t("columnName")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("columnInn")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("columnType")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("columnContactPerson")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("columnPhone")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("columnEmail")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold text-right">
                        {t("columnBalance")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("columnStatus")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold text-center">
                        {t("columnActions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCounterparties.map((cp) => {
                      const color = typeColors[cp.type];
                      return (
                        <TableRow
                          key={cp.id}
                          className="hover:bg-cream/30 cursor-pointer"
                          onClick={() => setSelectedCounterparty(cp)}
                        >
                          <TableCell className="font-medium text-espresso">
                            {cp.name}
                          </TableCell>
                          <TableCell className="text-sm text-espresso-light">
                            {cp.inn}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${color.bg} ${color.text} border-0`}
                            >
                              {t(TYPE_TRANSLATION_KEYS[cp.type])}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-espresso-light">
                            {cp.contactPerson}
                          </TableCell>
                          <TableCell className="text-sm text-espresso-light">
                            {cp.phone}
                          </TableCell>
                          <TableCell className="text-sm text-espresso-light">
                            {cp.email}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium",
                              cp.balance < 0
                                ? "text-red-600"
                                : "text-green-600",
                            )}
                          >
                            {formatCurrency(cp.balance)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cp.status === "active" ? "success" : "warning"
                              }
                            >
                              {cp.status === "active"
                                ? t("statusActive")
                                : t("statusSuspended")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-espresso-light hover:text-espresso"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCounterparty(cp);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {filteredCounterparties.length === 0 && (
            <div className="text-center py-8 text-espresso-light">
              {t("emptyState")}
            </div>
          )}
        </div>
      )}

      {activeTab === "contracts" && (
        <div className="flex flex-col gap-4">
          {/* Warning alert for expiring contracts */}
          {expiringContracts.length > 0 && (
            <Card className="border-l-4 border-l-amber-500 bg-amber-50">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">
                    {t("expiringContractsWarning", {
                      count: expiringContracts.length,
                    })}
                  </span>{" "}
                  {expiringContracts.map((c) => c.number).join(", ")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Contracts Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-cream/50">
                      <TableHead className="text-espresso font-semibold">
                        {t("contractNumber")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("contractCounterparty")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("contractType")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("contractStartDate")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("contractEndDate")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold text-right">
                        {t("contractMonthlyAmount")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("columnStatus")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id} className="hover:bg-cream/30">
                        <TableCell className="font-medium text-espresso">
                          {contract.number}
                        </TableCell>
                        <TableCell className="text-sm text-espresso-light">
                          {contract.counterpartyName}
                        </TableCell>
                        <TableCell className="text-sm text-espresso-light">
                          {t(CONTRACT_TYPE_TRANSLATION_KEYS[contract.type])}
                        </TableCell>
                        <TableCell className="text-sm text-espresso-light">
                          {formatDate(contract.startDate)}
                        </TableCell>
                        <TableCell className="text-sm text-espresso-light">
                          {formatDate(contract.endDate)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-espresso">
                          {formatCurrency(contract.monthlyAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              contract.status === "active"
                                ? "success"
                                : contract.status === "expiring"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {contract.status === "active"
                              ? t("statusActive")
                              : contract.status === "expiring"
                                ? t("contractStatusExpiring")
                                : t("contractStatusExpired")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="flex flex-col gap-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-espresso-light mb-2">
                    {t("kpiTotalCounterparties")}
                  </p>
                  <p className="text-3xl font-bold text-espresso">
                    {totalCounterparties}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-espresso-light mb-2">
                    {t("kpiActiveContracts")}
                  </p>
                  <p className="text-3xl font-bold text-espresso">
                    {activeContracts}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-espresso-light mb-2">
                    {t("kpiCreditorDebt")}
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(-creditorDebt)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-espresso-light mb-2">
                    {t("kpiDebtorAmount")}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(debtorAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            {/* Procurement Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("chartProcurementVolume")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={procurementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                    <XAxis dataKey="name" stroke="#92400e" fontSize={11} />
                    <YAxis stroke="#92400e" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#FDF8F3",
                        border: "1px solid #D4A574",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expenses by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("chartExpensesByType")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) =>
                        `${name} ${formatNumber(value / 1e6)}M`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#FDF8F3",
                        border: "1px solid #D4A574",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Debt Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("debtSummaryTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-cream/50">
                      <TableHead className="text-espresso font-semibold">
                        {t("debtCounterparty")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold text-right">
                        {t("columnBalance")}
                      </TableHead>
                      <TableHead className="text-espresso font-semibold">
                        {t("debtLastPaymentDate")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtSummary.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-cream/30">
                        <TableCell className="font-medium text-espresso">
                          {item.counterpartyName}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            item.balance < 0
                              ? "text-red-600"
                              : "text-green-600",
                          )}
                        >
                          {formatCurrency(item.balance)}
                        </TableCell>
                        <TableCell className="text-sm text-espresso-light">
                          {item.lastPaymentDate === "—"
                            ? "—"
                            : formatDate(item.lastPaymentDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SlideOver Details */}
      <SlideOver
        open={!!selectedCounterparty}
        onClose={() => setSelectedCounterparty(null)}
        title={selectedCounterparty?.name}
        subtitle={`${selectedCounterparty?.type} • ${selectedCounterparty?.inn}`}
        width="w-[480px]"
      >
        {selectedCounterparty && (
          <>
            <SlideOverBody>
              <div className="space-y-6">
                {/* Info Sections */}
                <div>
                  <h3 className="text-sm font-semibold text-espresso mb-3">
                    {t("companyInfo")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-espresso-light">
                        {t("labelStatus")}
                      </span>
                      <Badge
                        variant={
                          selectedCounterparty.status === "active"
                            ? "success"
                            : "warning"
                        }
                      >
                        {selectedCounterparty.status === "active"
                          ? t("statusActive")
                          : t("statusSuspended")}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-espresso-light">
                        {t("labelAddress")}
                      </span>
                      <span className="text-espresso font-medium">
                        {selectedCounterparty.address || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-espresso mb-3">
                    {t("contactInfo")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-espresso-light">
                        {t("labelContactPerson")}
                      </span>
                      <span className="text-espresso font-medium">
                        {selectedCounterparty.contactPerson}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-espresso-light">
                        {t("labelPhone")}
                      </span>
                      <span className="text-espresso font-medium">
                        {selectedCounterparty.phone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-espresso-light">
                        {t("labelEmail")}
                      </span>
                      <span className="text-espresso font-medium text-xs">
                        {selectedCounterparty.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-espresso mb-3">
                    {t("bankDetails")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-espresso-light">
                        {t("labelBank")}
                      </span>
                      <span className="text-espresso font-medium">
                        {selectedCounterparty.bank || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-espresso-light">
                        {t("labelAccount")}
                      </span>
                      <span className="text-espresso font-medium">
                        {selectedCounterparty.account || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-espresso-light">
                        {t("labelMfo")}
                      </span>
                      <span className="text-espresso font-medium">
                        {selectedCounterparty.mfo || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-espresso mb-3">
                    {t("recentTransactions")}
                  </h3>
                  <div className="space-y-2">
                    {selectedCounterparty.transactions
                      ?.slice(0, 5)
                      .map((tx) => (
                        <div
                          key={tx.id}
                          className="flex justify-between text-sm p-2 bg-cream/50 rounded"
                        >
                          <div>
                            <p className="text-espresso font-medium">
                              {tx.description}
                            </p>
                            <p className="text-xs text-espresso-light">
                              {formatDate(tx.date)}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "font-medium",
                              tx.amount < 0 ? "text-red-600" : "text-green-600",
                            )}
                          >
                            {formatCurrency(tx.amount)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {selectedCounterparty.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-espresso mb-2">
                      {t("notes")}
                    </h3>
                    <p className="text-sm text-espresso-light bg-cream/50 p-2 rounded">
                      {selectedCounterparty.notes}
                    </p>
                  </div>
                )}
              </div>
            </SlideOverBody>
            <SlideOverFooter>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t("edit")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("delete")}
                </Button>
              </div>
            </SlideOverFooter>
          </>
        )}
      </SlideOver>
    </div>
  );
}
