/**
 * Financial Report Generator (Structure B)
 * Generates financial analytics: revenue, costs, profit margins
 * Split from vendhub-report-generator.service.ts
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  PaymentResourceType,
  VendHubReportStructureA,
  VendHubReportStructureB,
  StructureBSummaryDto,
  MonthlyFinancialDto,
  DailyFinancialDto,
  MachineFinancialDto,
  ProductFinancialDto,
  VERIFICATION_RULES,
} from "../dto/vendhub-report.dto";
import { TransactionData } from "./report-generator.types";
import { ReportGeneratorUtils } from "./report-generator.utils";
import { SalesReportGenerator } from "./sales-report.generator";
import { InventoryReportGenerator } from "./inventory-report.generator";

@Injectable()
export class FinancialReportGenerator {
  private readonly logger = new Logger(FinancialReportGenerator.name);

  constructor(
    private readonly salesGenerator: SalesReportGenerator,
    private readonly inventoryGenerator: InventoryReportGenerator,
  ) {}

  /**
   * Generate Structure B: Financial Analytics
   */
  async generateStructureB(
    transactions: TransactionData[],
    dateFrom: Date,
    dateTo: Date,
  ): Promise<VendHubReportStructureB> {
    this.logger.log("Generating Structure B (Financial Analytics)");

    // Filter delivered transactions for ingredient calculations
    const deliveredTransactions = transactions.filter((t) =>
      VERIFICATION_RULES.INGREDIENT_FILTER.includes(t.brewStatus),
    );

    return {
      summary: this.buildStructureBSummary(transactions, dateFrom, dateTo),
      byMonths: this.buildMonthlyFinancial(transactions),
      byDays: this.buildDailyFinancial(transactions),
      byMachines: this.buildMachineFinancial(transactions),
      byProducts: this.buildProductFinancial(transactions),

      ingredients: {
        summary: this.inventoryGenerator.buildIngredientSummary(
          deliveredTransactions,
        ),
        byMonths: this.inventoryGenerator.buildIngredientByMonths(
          deliveredTransactions,
        ),
        byMachines: this.inventoryGenerator.buildIngredientByMachines(
          deliveredTransactions,
        ),
        byDays: this.inventoryGenerator.buildIngredientByDays(
          deliveredTransactions,
        ),
      },

      qrReconciliation: this.salesGenerator.buildQRReconciliation(transactions),
      deliveryFailures: this.buildDeliveryFailures(transactions),
      priceHistory: [],
      purchases: [],
    };
  }

  /**
   * Generate combined analytics for FULL structure
   */
  generateAnalytics(
    transactions: TransactionData[],
    structureA: VendHubReportStructureA,
    structureB: VendHubReportStructureB,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    // Top products
    const topProducts = structureB.byProducts.slice(0, 10).map((p) => ({
      name: p.productName,
      revenue: p.revenue,
      count: p.orderCount,
    }));

    // Top machines
    const topMachines = structureB.byMachines.slice(0, 10).map((m) => ({
      code: m.machineCode,
      address: m.address,
      revenue: m.revenue,
    }));

    // Trends (comparing first and last month if available)
    const months = structureB.byMonths;
    let revenueGrowth = 0;
    let orderGrowth = 0;
    let marginTrend = 0;

    if (months.length >= 2) {
      const first = months[0];
      const last = months[months.length - 1];

      revenueGrowth =
        first.revenue > 0
          ? Math.round(
              ((last.revenue - first.revenue) / first.revenue) * 10000,
            ) / 100
          : 0;
      orderGrowth =
        first.orderCount > 0
          ? Math.round(
              ((last.orderCount - first.orderCount) / first.orderCount) * 10000,
            ) / 100
          : 0;
      marginTrend = last.marginPercent - first.marginPercent;
    }

    // Alerts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alerts: any[] = [];

    // Check QR reconciliation
    for (const qr of structureA.qrReconciliation) {
      if (qr.status === "CRITICAL") {
        alerts.push({
          type: "qr_discrepancy",
          severity: "critical",
          message: `Критическое расхождение QR в ${qr.month}: ${qr.differencePercent}%`,
          data: qr,
        });
      } else if (qr.status === "WARNING") {
        alerts.push({
          type: "qr_discrepancy",
          severity: "warning",
          message: `Расхождение QR в ${qr.month}: ${qr.differencePercent}%`,
          data: qr,
        });
      }
    }

    // Check high failure rate
    const failureRate =
      structureB.summary.orders.total > 0
        ? structureB.summary.orders.failed / structureB.summary.orders.total
        : 0;
    if (failureRate > 0.05) {
      alerts.push({
        type: "high_failure_rate",
        severity: failureRate > 0.1 ? "critical" : "warning",
        message: `Высокий процент сбоев: ${Math.round(failureRate * 100)}%`,
        data: { failureRate, failed: structureB.summary.orders.failed },
      });
    }

    // Check margin decline
    if (marginTrend < -5) {
      alerts.push({
        type: "margin_decline",
        severity: marginTrend < -10 ? "critical" : "warning",
        message: `Снижение маржи: ${marginTrend.toFixed(1)}%`,
        data: { marginTrend },
      });
    }

    return {
      topProducts,
      topMachines,
      trends: {
        revenueGrowth,
        orderGrowth,
        marginTrend,
      },
      alerts,
    };
  }

  private buildStructureBSummary(
    transactions: TransactionData[],
    dateFrom: Date,
    dateTo: Date,
  ): StructureBSummaryDto {
    const dayCount = Math.ceil(
      (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24),
    );
    const paidTransactions = transactions.filter(
      (t) => t.paymentStatus === "Оплачено",
    );

    const totalOrders = paidTransactions.length;
    const successfulOrders = paidTransactions.filter((t) =>
      VERIFICATION_RULES.INGREDIENT_FILTER.includes(t.brewStatus),
    ).length;
    const failedOrders = totalOrders - successfulOrders;

    const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
    const costOfGoods = paidTransactions.reduce(
      (sum, t) => sum + (t.costOfGoods || 0),
      0,
    );
    const grossProfit = totalRevenue - costOfGoods;

    // By payment type
    const byPaymentType = [];
    const paymentTypes = [
      PaymentResourceType.CASH,
      PaymentResourceType.VIP,
      PaymentResourceType.TEST,
      PaymentResourceType.QR,
      PaymentResourceType.CREDIT,
    ];
    for (const pt of paymentTypes) {
      const filtered = paidTransactions.filter((t) => t.paymentType === pt);
      if (filtered.length > 0) {
        byPaymentType.push({
          type: pt,
          orderCount: filtered.length,
          totalAmount: filtered.reduce((sum, t) => sum + t.amount, 0),
        });
      }
    }

    return {
      period: { from: dateFrom, to: dateTo, dayCount },
      orders: {
        total: totalOrders,
        successful: successfulOrders,
        failed: failedOrders,
        successRate:
          totalOrders > 0
            ? Math.round((successfulOrders / totalOrders) * 10000) / 100
            : 0,
      },
      finance: {
        totalRevenue,
        costOfGoods,
        grossProfit,
        marginPercent:
          totalRevenue > 0
            ? Math.round((grossProfit / totalRevenue) * 10000) / 100
            : 0,
        averageCheck:
          totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        ordersPerDay:
          dayCount > 0 ? Math.round((totalOrders / dayCount) * 100) / 100 : 0,
      },
      byPaymentType,
    };
  }

  private buildMonthlyFinancial(
    transactions: TransactionData[],
  ): MonthlyFinancialDto[] {
    const monthlyData = new Map<string, MonthlyFinancialDto>();

    for (const t of transactions) {
      const monthKey = ReportGeneratorUtils.getMonthKey(t.createdAt);

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          monthName: ReportGeneratorUtils.getMonthName(t.createdAt),
          dayCount: ReportGeneratorUtils.getDaysInMonth(t.createdAt),
          orderCount: 0,
          successfulCount: 0,
          failedCount: 0,
          revenue: 0,
          costOfGoods: 0,
          profit: 0,
          marginPercent: 0,
          averageCheck: 0,
          ordersPerDay: 0,
        });
      }

      const data = monthlyData.get(monthKey)!;
      data.orderCount++;
      data.revenue += t.amount;
      data.costOfGoods += t.costOfGoods || 0;

      if (VERIFICATION_RULES.INGREDIENT_FILTER.includes(t.brewStatus)) {
        data.successfulCount++;
      } else {
        data.failedCount++;
      }
    }

    // Calculate derived metrics
    for (const data of monthlyData.values()) {
      data.profit = data.revenue - data.costOfGoods;
      data.marginPercent =
        data.revenue > 0
          ? Math.round((data.profit / data.revenue) * 10000) / 100
          : 0;
      data.averageCheck =
        data.orderCount > 0 ? Math.round(data.revenue / data.orderCount) : 0;
      data.ordersPerDay =
        data.dayCount > 0
          ? Math.round((data.orderCount / data.dayCount) * 100) / 100
          : 0;
    }

    return Array.from(monthlyData.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }

  private buildDailyFinancial(
    transactions: TransactionData[],
  ): DailyFinancialDto[] {
    const weekdayNames = [
      "Воскресенье",
      "Понедельник",
      "Вторник",
      "Среда",
      "Четверг",
      "Пятница",
      "Суббота",
    ];
    const dailyData = new Map<string, DailyFinancialDto>();

    for (const t of transactions) {
      const dateKey = ReportGeneratorUtils.getDateKey(t.createdAt);

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          dayOfWeek: weekdayNames[t.createdAt.getDay()],
          orderCount: 0,
          successfulCount: 0,
          failedCount: 0,
          revenue: 0,
          costOfGoods: 0,
          profit: 0,
          marginPercent: 0,
          averageCheck: 0,
        });
      }

      const data = dailyData.get(dateKey)!;
      data.orderCount++;
      data.revenue += t.amount;
      data.costOfGoods += t.costOfGoods || 0;

      if (VERIFICATION_RULES.INGREDIENT_FILTER.includes(t.brewStatus)) {
        data.successfulCount++;
      } else {
        data.failedCount++;
      }
    }

    // Calculate derived metrics
    for (const data of dailyData.values()) {
      data.profit = data.revenue - data.costOfGoods;
      data.marginPercent =
        data.revenue > 0
          ? Math.round((data.profit / data.revenue) * 10000) / 100
          : 0;
      data.averageCheck =
        data.orderCount > 0 ? Math.round(data.revenue / data.orderCount) : 0;
    }

    return Array.from(dailyData.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  private buildMachineFinancial(
    transactions: TransactionData[],
  ): MachineFinancialDto[] {
    const machineData = new Map<string, MachineFinancialDto>();
    let totalRevenue = 0;

    for (const t of transactions) {
      totalRevenue += t.amount;

      if (!machineData.has(t.machineId)) {
        machineData.set(t.machineId, {
          machineId: t.machineId,
          machineCode: t.machineCode,
          address: t.machineAddress,
          orderCount: 0,
          successfulCount: 0,
          failedCount: 0,
          revenue: 0,
          costOfGoods: 0,
          profit: 0,
          marginPercent: 0,
          revenuePercent: 0,
        });
      }

      const data = machineData.get(t.machineId)!;
      data.orderCount++;
      data.revenue += t.amount;
      data.costOfGoods += t.costOfGoods || 0;

      if (VERIFICATION_RULES.INGREDIENT_FILTER.includes(t.brewStatus)) {
        data.successfulCount++;
      } else {
        data.failedCount++;
      }
    }

    // Calculate derived metrics
    for (const data of machineData.values()) {
      data.profit = data.revenue - data.costOfGoods;
      data.marginPercent =
        data.revenue > 0
          ? Math.round((data.profit / data.revenue) * 10000) / 100
          : 0;
      data.revenuePercent =
        totalRevenue > 0
          ? Math.round((data.revenue / totalRevenue) * 10000) / 100
          : 0;
    }

    return Array.from(machineData.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
  }

  private buildProductFinancial(
    transactions: TransactionData[],
  ): ProductFinancialDto[] {
    const productData = new Map<string, ProductFinancialDto>();
    let totalRevenue = 0;

    for (const t of transactions) {
      totalRevenue += t.amount;

      if (!productData.has(t.productId)) {
        productData.set(t.productId, {
          productId: t.productId,
          productName: t.productName,
          category: t.productCategory,
          orderCount: 0,
          revenue: 0,
          costPerUnit: 0,
          costOfGoods: 0,
          profit: 0,
          marginPercent: 0,
          revenuePercent: 0,
        });
      }

      const data = productData.get(t.productId)!;
      data.orderCount++;
      data.revenue += t.amount;
      data.costOfGoods += t.costOfGoods || 0;
    }

    // Calculate derived metrics
    for (const data of productData.values()) {
      data.costPerUnit =
        data.orderCount > 0
          ? Math.round(data.costOfGoods / data.orderCount)
          : 0;
      data.profit = data.revenue - data.costOfGoods;
      data.marginPercent =
        data.revenue > 0
          ? Math.round((data.profit / data.revenue) * 10000) / 100
          : 0;
      data.revenuePercent =
        totalRevenue > 0
          ? Math.round((data.revenue / totalRevenue) * 10000) / 100
          : 0;
    }

    return Array.from(productData.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildDeliveryFailures(transactions: TransactionData[]): any[] {
    return transactions
      .filter(
        (t) => !VERIFICATION_RULES.INGREDIENT_FILTER.includes(t.brewStatus),
      )
      .map((t) => ({
        date: ReportGeneratorUtils.getDateKey(t.createdAt),
        time: t.createdAt.toTimeString().substring(0, 8),
        machineId: t.machineId,
        machineCode: t.machineCode,
        address: t.machineAddress,
        productName: t.productName,
        flavor: "",
        price: t.amount,
        paymentType: t.paymentType,
        status: t.brewStatus,
      }));
  }
}
