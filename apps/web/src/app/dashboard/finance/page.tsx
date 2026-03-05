"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useFinanceTransactions,
  useFinanceStats,
  useCreateFinanceTransaction,
  useUpdateFinanceTransaction,
  useDeleteFinanceTransaction,
} from "@/lib/hooks";
import {
  tabs,
  dateRanges,
  TabNavigation,
  DateRangeFilter,
  OverviewTab,
  PNLTab,
  CashFlowTab,
  TransactionsTab,
  InvoicesTab,
  PaymentsTab,
  ReconciliationTab,
  FiscalizationTab,
  BudgetTab,
  ReportsTab,
  TransactionFormModal,
  type TabId,
} from "./components";

// ═══ Data (Mock Data) ═══

const financialSummary = {
  totalRevenue: 847_250_000,
  totalExpenses: 312_450_000,
  netProfit: 534_800_000,
  pendingPayments: 45_670_000,
  cashOnHand: 125_340_000,
  accountsReceivable: 67_890_000,
  revenueGrowth: 12.5,
  expenseGrowth: -3.2,
  profitMargin: 63.1,
};

const revenueByDay = [
  { date: "24.02", income: 7_800_000, expense: 2_900_000 },
  { date: "25.02", income: 6_500_000, expense: 3_100_000 },
  { date: "26.02", income: 8_200_000, expense: 2_700_000 },
  { date: "27.02", income: 7_100_000, expense: 4_500_000 },
  { date: "28.02", income: 9_300_000, expense: 3_200_000 },
  { date: "01.03", income: 8_700_000, expense: 2_800_000 },
  { date: "02.03", income: 10_100_000, expense: 3_500_000 },
];

const profitTrend = [
  {
    month: "Сен",
    revenue: 520_000_000,
    expenses: 210_000_000,
    profit: 310_000_000,
  },
  {
    month: "Окт",
    revenue: 580_000_000,
    expenses: 230_000_000,
    profit: 350_000_000,
  },
  {
    month: "Ноя",
    revenue: 640_000_000,
    expenses: 250_000_000,
    profit: 390_000_000,
  },
  {
    month: "Дек",
    revenue: 720_000_000,
    expenses: 280_000_000,
    profit: 440_000_000,
  },
  {
    month: "Янв",
    revenue: 780_000_000,
    expenses: 300_000_000,
    profit: 480_000_000,
  },
  {
    month: "Фев",
    revenue: 847_000_000,
    expenses: 312_000_000,
    profit: 535_000_000,
  },
];

const pAndLData = [
  {
    month: "Янв",
    revenue: 780_000_000,
    cogs: 312_000_000,
    grossProfit: 468_000_000,
    opex: 145_000_000,
    ebitda: 323_000_000,
    depreciation: 25_000_000,
    netProfit: 298_000_000,
    momChange: 0,
    yoyChange: 8.5,
    margin: 38.2,
  },
  {
    month: "Фев",
    revenue: 847_000_000,
    cogs: 325_000_000,
    grossProfit: 522_000_000,
    opex: 152_000_000,
    ebitda: 370_000_000,
    depreciation: 25_000_000,
    netProfit: 345_000_000,
    momChange: 15.8,
    yoyChange: 12.3,
    margin: 40.7,
  },
];

const cashFlowData = [
  {
    month: "01.03",
    operating: 8_450_000,
    investing: -1_200_000,
    cumulative: 125_340_000,
  },
  {
    month: "02.03",
    operating: 9_200_000,
    investing: -500_000,
    cumulative: 134_040_000,
  },
  {
    month: "03.03",
    operating: 7_800_000,
    investing: -2_100_000,
    cumulative: 139_740_000,
  },
  {
    month: "04.03",
    operating: 8_900_000,
    investing: 0,
    cumulative: 148_640_000,
  },
  {
    month: "05.03",
    operating: 10_100_000,
    investing: -3_500_000,
    cumulative: 155_240_000,
  },
  {
    month: "06.03",
    operating: 9_500_000,
    investing: -800_000,
    cumulative: 163_940_000,
  },
  {
    month: "07.03",
    operating: 8_700_000,
    investing: 0,
    cumulative: 177_640_000,
  },
];

const expenseCategories = [
  { name: "Закупки", amount: 156_780_000, percent: 50.2, color: "#3b82f6" },
  { name: "Зарплата", amount: 67_500_000, percent: 21.6, color: "#10b981" },
  { name: "Аренда", amount: 45_000_000, percent: 14.4, color: "#f59e0b" },
  { name: "Обслуживание", amount: 23_450_000, percent: 7.5, color: "#8b5cf6" },
  { name: "Транспорт", amount: 12_340_000, percent: 3.9, color: "#06b6d4" },
  { name: "Прочее", amount: 7_380_000, percent: 2.4, color: "#6b7280" },
];

const paymentMethodBreakdown = [
  { name: "Наличные", value: 245_000_000, percent: 28.9, color: "#10b981" },
  { name: "Payme", value: 189_000_000, percent: 22.3, color: "#06b6d4" },
  { name: "Click", value: 156_000_000, percent: 18.4, color: "#3b82f6" },
  { name: "UZCARD", value: 124_000_000, percent: 14.6, color: "#0ea5e9" },
  { name: "Uzum", value: 89_000_000, percent: 10.5, color: "#8b5cf6" },
  { name: "HUMO", value: 34_250_000, percent: 4.0, color: "#06b6d4" },
  { name: "Бонусы", value: 10_000_000, percent: 1.2, color: "#ec4899" },
];

const dailyTransactionVolume = [
  { date: "25.02", volume: 8_900_000 },
  { date: "26.02", volume: 9_200_000 },
  { date: "27.02", volume: 7_450_000 },
  { date: "28.02", volume: 10_100_000 },
  { date: "01.03", volume: 10_600_000 },
  { date: "02.03", volume: 11_200_000 },
  { date: "03.03", volume: 12_450_000 },
];

const invoices = [
  {
    id: "INV-2026-0089",
    date: "01.03.2026",
    dueDate: "01.04.2026",
    counterparty: "Coca-Cola Uzbekistan",
    type: "incoming" as const,
    amount: 8_750_000,
    status: "pending" as const,
    items: 12,
    description: "Поставка напитков — март",
  },
  {
    id: "INV-2026-0088",
    date: "25.02.2026",
    dueDate: "25.03.2026",
    counterparty: "Nestle Uzbekistan",
    type: "incoming" as const,
    amount: 6_340_000,
    status: "pending" as const,
    items: 8,
    description: "Снеки и конфеты",
  },
  {
    id: "INV-2026-0087",
    date: "20.02.2026",
    dueDate: "20.03.2026",
    counterparty: "ООО Технопарк",
    type: "outgoing" as const,
    amount: 4_500_000,
    status: "overdue" as const,
    items: 1,
    description: "Аренда серверов — Q1",
  },
  {
    id: "INV-2026-0086",
    date: "18.02.2026",
    dueDate: "18.03.2026",
    counterparty: "Pepsi Uzbekistan",
    type: "incoming" as const,
    amount: 5_670_000,
    status: "paid" as const,
    items: 6,
    description: "Напитки — партия 12",
  },
  {
    id: "INV-2026-0085",
    date: "15.02.2026",
    dueDate: "15.03.2026",
    counterparty: "ТЦ Навруз",
    type: "outgoing" as const,
    amount: 5_500_000,
    status: "paid" as const,
    items: 1,
    description: "Аренда — март",
  },
  {
    id: "INV-2026-0084",
    date: "10.02.2026",
    dueDate: "10.03.2026",
    counterparty: "ООО Арома-Кофе",
    type: "incoming" as const,
    amount: 3_200_000,
    status: "paid" as const,
    items: 4,
    description: "Кофейные зёрна",
  },
];

function generateTransactions() {
  const categories = [
    {
      cat: "Продажи",
      type: "income" as const,
      desc: (i: number) =>
        `Инкассация VM-${String(i * 3 + 1).padStart(3, "0")} — VM-${String(i * 3 + 15).padStart(3, "0")}`,
    },
    {
      cat: "Безналичные",
      type: "income" as const,
      desc: () => "Payme транзакции",
    },
    {
      cat: "Безналичные",
      type: "income" as const,
      desc: () => "Click транзакции",
    },
    {
      cat: "Безналичные",
      type: "income" as const,
      desc: () => "Uzum транзакции",
    },
    {
      cat: "Закупки",
      type: "expense" as const,
      desc: () => "Пополнение запасов — напитки",
    },
    {
      cat: "Обслуживание",
      type: "expense" as const,
      desc: (i: number) => `Ремонт VM-${String(i + 10).padStart(3, "0")}`,
    },
    {
      cat: "Зарплата",
      type: "expense" as const,
      desc: () => "Аванс — март 2026",
    },
    {
      cat: "Аренда",
      type: "expense" as const,
      desc: () => "Аренда точек — март",
    },
    {
      cat: "Транспорт",
      type: "expense" as const,
      desc: () => "Логистика — доставка",
    },
    {
      cat: "Безналичные",
      type: "income" as const,
      desc: () => "HUMO транзакции",
    },
  ];
  const payments = [
    "cash",
    "payme",
    "click",
    "uzum",
    "transfer",
    "humo",
    "uzcard",
    "bonus",
  ];
  const statuses: ("completed" | "pending" | "failed")[] = [
    "completed",
    "completed",
    "completed",
    "completed",
    "pending",
    "failed",
  ];
  const amounts = [
    4_567_000, 2_340_000, 1_890_000, 8_750_000, 450_000, 15_000_000, 12_500_000,
    5_230_000, 780_000, 3_210_000, 6_450_000, 1_120_000, 9_800_000, 2_560_000,
    4_100_000,
  ];

  return Array.from({ length: 25 }, (_, i) => {
    const tmpl = categories[i % categories.length];
    const day = 28 - Math.floor(i / 3);
    const hour = 9 + (i % 12);
    const min = (i * 17) % 60;
    return {
      id: `TXN-${String(i + 1).padStart(3, "0")}`,
      date: `${day > 0 ? String(day).padStart(2, "0") : "01"}.02.2026 ${hour}:${String(min).padStart(2, "0")}`,
      type: tmpl.type,
      category: tmpl.cat,
      description: tmpl.desc(i),
      amount: amounts[i % amounts.length],
      payment: payments[i % payments.length],
      status: statuses[i % statuses.length],
      ref: `${tmpl.type === "income" ? "INC" : "EXP"}-2026-${String(i + 1).padStart(4, "0")}`,
      collector:
        tmpl.type === "income" && tmpl.cat === "Продажи"
          ? ["Азиз Каримов", "Бахтиёр Усмонов", "Равшан Мирзаев"][i % 3]
          : undefined,
    };
  });
}

const transactions = generateTransactions();

const paymentSystems = [
  {
    id: "cash",
    name: "Наличные",
    balance: 45_670_000,
    pending: 0,
    todayVolume: 4_567_000,
    txCount: 287,
    status: "active" as const,
  },
  {
    id: "payme",
    name: "Payme",
    balance: 12_450_000,
    pending: 890_000,
    todayVolume: 2_340_000,
    txCount: 156,
    status: "active" as const,
  },
  {
    id: "click",
    name: "Click",
    balance: 8_970_000,
    pending: 450_000,
    todayVolume: 1_890_000,
    txCount: 98,
    status: "active" as const,
  },
  {
    id: "uzum",
    name: "Uzum Bank",
    balance: 5_340_000,
    pending: 120_000,
    todayVolume: 890_000,
    txCount: 45,
    status: "active" as const,
  },
  {
    id: "humo",
    name: "HUMO",
    balance: 7_890_000,
    pending: 340_000,
    todayVolume: 1_230_000,
    txCount: 67,
    status: "active" as const,
  },
  {
    id: "uzcard",
    name: "UZCARD",
    balance: 9_120_000,
    pending: 560_000,
    todayVolume: 1_560_000,
    txCount: 89,
    status: "active" as const,
  },
];

const reconciliationItems = [
  {
    id: 1,
    source: "Payme",
    date: "01.03.2026",
    systemAmount: 2_340_000,
    actualAmount: 2_340_000,
    status: "matched" as const,
    difference: 0,
  },
  {
    id: 2,
    source: "Click",
    date: "01.03.2026",
    systemAmount: 1_890_000,
    actualAmount: 1_890_000,
    status: "matched" as const,
    difference: 0,
  },
  {
    id: 3,
    source: "Инкассация",
    date: "28.02.2026",
    systemAmount: 4_567_000,
    actualAmount: 4_520_000,
    status: "discrepancy" as const,
    difference: -47_000,
  },
  {
    id: 4,
    source: "Uzum",
    date: "28.02.2026",
    systemAmount: 890_000,
    actualAmount: 890_000,
    status: "matched" as const,
    difference: 0,
  },
  {
    id: 5,
    source: "Инкассация",
    date: "27.02.2026",
    systemAmount: 5_230_000,
    actualAmount: 5_230_000,
    status: "matched" as const,
    difference: 0,
  },
  {
    id: 6,
    source: "HUMO",
    date: "27.02.2026",
    systemAmount: 1_230_000,
    actualAmount: 1_200_000,
    status: "discrepancy" as const,
    difference: -30_000,
  },
  {
    id: 7,
    source: "UZCARD",
    date: "26.02.2026",
    systemAmount: 1_560_000,
    actualAmount: 1_560_000,
    status: "matched" as const,
    difference: 0,
  },
  {
    id: 8,
    source: "Click",
    date: "26.02.2026",
    systemAmount: 1_450_000,
    actualAmount: 1_450_000,
    status: "matched" as const,
    difference: 0,
  },
];

const fiscalData = {
  provider: "Multikassa",
  status: "active" as const,
  terminalId: "MK-2026-001",
  lastReceipt: "02.03.2026 14:32:15",
  todayReceipts: 287,
  todayAmount: 18_450_000,
  monthReceipts: 8_456,
  monthAmount: 547_230_000,
};

const fiscalReportData = [
  {
    date: "01.03",
    issued: 287,
    successful: 285,
    failed: 2,
    amount: 18_450_000,
    nds: 1_689_545,
  },
  {
    date: "02.03",
    issued: 301,
    successful: 300,
    failed: 1,
    amount: 19_200_000,
    nds: 1_760_000,
  },
  {
    date: "03.03",
    issued: 298,
    successful: 298,
    failed: 0,
    amount: 18_900_000,
    nds: 1_732_727,
  },
];

const budgetData = [
  {
    category: "Закупки напитков",
    budget: 180_000_000,
    actual: 156_780_000,
    variance: 23_220_000,
    utilization: 87.1,
  },
  {
    category: "Зарплата",
    budget: 75_000_000,
    actual: 67_500_000,
    variance: 7_500_000,
    utilization: 90,
  },
  {
    category: "Аренда",
    budget: 45_000_000,
    actual: 45_000_000,
    variance: 0,
    utilization: 100,
  },
  {
    category: "Обслуживание",
    budget: 30_000_000,
    actual: 23_450_000,
    variance: 6_550_000,
    utilization: 78.2,
  },
  {
    category: "Маркетинг",
    budget: 20_000_000,
    actual: 18_900_000,
    variance: 1_100_000,
    utilization: 94.5,
  },
  {
    category: "Логистика",
    budget: 15_000_000,
    actual: 12_340_000,
    variance: 2_660_000,
    utilization: 82.3,
  },
];

// ═══ Main Page ═══

export default function FinancePage() {
  const { data: _dbTransactions } = useFinanceTransactions();
  const { data: _dbFinStats } = useFinanceStats();
  const createTransaction = useCreateFinanceTransaction();
  const _updateTransaction = useUpdateFinanceTransaction();
  const _deleteTransaction = useDeleteFinanceTransaction();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeRange, setActiveRange] = useState("Месяц");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [txPage, setTxPage] = useState(1);
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  // Filtering
  const filteredTx = transactions.filter((tx) => {
    const matchSearch =
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  const txPerPage = 10;
  const txTotalPages = Math.ceil(filteredTx.length / txPerPage);
  const txSlice = filteredTx.slice(
    (txPage - 1) * txPerPage,
    txPage * txPerPage,
  );

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceFilter === "all") return true;
    if (invoiceFilter === "incoming") return inv.type === "incoming";
    if (invoiceFilter === "outgoing") return inv.type === "outgoing";
    return inv.status === invoiceFilter;
  });

  const matchedCount = reconciliationItems.filter(
    (r) => r.status === "matched",
  ).length;
  const discrepancyCount = reconciliationItems.filter(
    (r) => r.status === "discrepancy",
  ).length;
  const totalDifference = reconciliationItems.reduce(
    (s, r) => s + r.difference,
    0,
  );

  const totalBudget = budgetData.reduce((s, b) => s + b.budget, 0);
  const totalActual = budgetData.reduce((s, b) => s + b.actual, 0);
  const totalVariance = totalBudget - totalActual;
  const avgUtilization = (
    budgetData.reduce((s, b) => s + b.utilization, 0) / budgetData.length
  ).toFixed(1);

  const totalOperating = cashFlowData.reduce((s, c) => s + c.operating, 0);
  const totalInvesting = cashFlowData.reduce((s, c) => s + c.investing, 0);
  const currentCash = cashFlowData[cashFlowData.length - 1]?.cumulative || 0;
  const monthlyBurn = Math.abs(totalInvesting);
  const runwayMonths =
    currentCash > 0 ? (currentCash / (monthlyBurn || 1)).toFixed(1) : "∞";

  const refundRate = 0.8;
  const totalTransactionValue = paymentMethodBreakdown.reduce(
    (s, p) => s + p.value,
    0,
  );

  const totalFiscalReceipts = fiscalReportData.reduce(
    (s, f) => s + f.issued,
    0,
  );
  const totalFiscalSuccessful = fiscalReportData.reduce(
    (s, f) => s + f.successful,
    0,
  );
  const totalFiscalFailed = fiscalReportData.reduce((s, f) => s + f.failed, 0);
  const totalTaxAmount = fiscalReportData.reduce((s, f) => s + f.nds, 0);

  const handleCreateTransaction = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createTransaction.mutateAsync({
        type: formData.get("type") as "income" | "expense" | "transfer",
        category: formData.get("category") as string,
        description: formData.get("description") as string,
        amount: parseFloat(formData.get("amount") as string),
        counterparty_id: formData.get("counterparty_id") as string | null,
        counterparty_name: formData.get("counterparty_name") as string | null,
        payment_method: formData.get("payment_method") as string | null,
        machine_id: formData.get("machine_id") as string | null,
        status: "completed",
      });
      setShowTransactionForm(false);
    } catch (error) {
      console.error("Failed to create transaction:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-espresso-dark font-display">
            Финансы
          </h1>
          <p className="mt-1 text-sm text-espresso-light">
            Выручка, платежи, сверки, Multikassa, P&L, Cash Flow
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
          <Button
            className="gap-2 bg-espresso hover:bg-espresso-dark"
            onClick={() => setShowTransactionForm(true)}
            disabled={createTransaction.isPending}
          >
            <Plus className="h-4 w-4" />
            {createTransaction.isPending ? "Создание..." : "Транзакция"}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          <DateRangeFilter
            ranges={dateRanges}
            activeRange={activeRange}
            onRangeChange={setActiveRange}
          />
          <OverviewTab
            financialSummary={financialSummary}
            revenueByDay={revenueByDay}
            expenseCategories={expenseCategories}
            profitTrend={profitTrend}
            fiscalData={fiscalData}
          />
        </>
      )}

      {/* P&L Tab */}
      {activeTab === "pnl" && <PNLTab pAndLData={pAndLData} />}

      {/* Cash Flow Tab */}
      {activeTab === "cashflow" && (
        <CashFlowTab
          cashFlowData={cashFlowData}
          currentCash={currentCash}
          totalOperating={totalOperating}
          totalInvesting={totalInvesting}
          monthlyBurn={monthlyBurn}
          runwayMonths={runwayMonths}
        />
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <TransactionsTab
          paymentMethodBreakdown={paymentMethodBreakdown}
          dailyTransactionVolume={dailyTransactionVolume}
          transactions={transactions}
          filteredTx={filteredTx}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setTxPage(1);
          }}
          typeFilter={typeFilter}
          onTypeFilterChange={(value) => {
            setTypeFilter(value);
            setTxPage(1);
          }}
          txPage={txPage}
          onPageChange={setTxPage}
          txSlice={txSlice}
          txTotalPages={txTotalPages}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          totalTransactionValue={totalTransactionValue}
          refundRate={refundRate}
        />
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <InvoicesTab
          filteredInvoices={filteredInvoices}
          invoiceFilter={invoiceFilter}
          onFilterChange={setInvoiceFilter}
        />
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <PaymentsTab
          paymentSystems={paymentSystems}
          expandedPayment={expandedPayment}
          onExpandChange={setExpandedPayment}
        />
      )}

      {/* Reconciliation Tab */}
      {activeTab === "reconciliation" && (
        <ReconciliationTab
          reconciliationItems={reconciliationItems}
          matchedCount={matchedCount}
          discrepancyCount={discrepancyCount}
          totalDifference={totalDifference}
        />
      )}

      {/* Fiscalization Tab */}
      {activeTab === "fiscalization" && (
        <FiscalizationTab
          fiscalData={fiscalData}
          fiscalReportData={fiscalReportData}
          totalFiscalReceipts={totalFiscalReceipts}
          totalFiscalSuccessful={totalFiscalSuccessful}
          totalFiscalFailed={totalFiscalFailed}
          totalTaxAmount={totalTaxAmount}
        />
      )}

      {/* Budget Tab */}
      {activeTab === "budget" && (
        <BudgetTab
          budgetData={budgetData}
          totalBudget={totalBudget}
          totalActual={totalActual}
          totalVariance={totalVariance}
          avgUtilization={avgUtilization}
        />
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && <ReportsTab />}

      {/* Transaction Form Modal */}
      <TransactionFormModal
        isOpen={showTransactionForm}
        onClose={() => setShowTransactionForm(false)}
        onSubmit={handleCreateTransaction}
        isPending={createTransaction.isPending}
        error={createTransaction.error}
      />
    </div>
  );
}
