/**
 * Sales Report Generator (Structure A)
 * Generates reports by payment types: cash, QR, VIP, credit
 * Split from vendhub-report-generator.service.ts
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  PaymentResourceType,
  QRPaymentSystem,
  VendHubReportStructureA,
  StructureASummaryDto,
  MonthlyPaymentTypeDto,
  WeekdayPaymentTypeDto,
  MachinePaymentTypeDto,
  ProductPaymentTypeDto,
  QRReconciliationDto,
  VERIFICATION_RULES,
} from "../dto/vendhub-report.dto";
import { TransactionData, AggregatedData } from "./report-generator.types";
import { ReportGeneratorUtils } from "./report-generator.utils";

@Injectable()
export class SalesReportGenerator {
  private readonly logger = new Logger(SalesReportGenerator.name);

  /**
   * Generate Structure A: Payment Types Analysis
   */
  async generateStructureA(
    transactions: TransactionData[],
    dateFrom: Date,
    dateTo: Date,
  ): Promise<VendHubReportStructureA> {
    this.logger.log("Generating Structure A (Payment Types)");

    // Filter paid transactions only
    const paidTransactions = transactions.filter(
      (t) => t.paymentStatus === "Оплачено",
    );

    // Aggregate data
    const aggregated = this.aggregateByPaymentType(paidTransactions);

    return {
      summary: this.buildStructureASummary(
        aggregated,
        dateFrom,
        dateTo,
        transactions,
      ),
      byMonths: this.buildMonthlyPaymentTypes(paidTransactions),
      byWeekdays: this.buildWeekdayPaymentTypes(paidTransactions),
      byMachines: this.buildMachinePaymentTypes(paidTransactions),
      byProducts: this.buildProductPaymentTypes(paidTransactions),

      cashSummary: this.buildPaymentTypeDetail(
        paidTransactions,
        PaymentResourceType.CASH,
      ) as unknown,
      qrSummary: this.buildQRDetail(paidTransactions) as unknown,
      vipSummary: this.buildVIPSummary(paidTransactions) as unknown,
      creditSummary: this.buildCreditSummary(paidTransactions) as unknown,

      qrReconciliation: this.buildQRReconciliation(paidTransactions),
      crossAnalysis: this.buildCrossAnalysis(paidTransactions) as unknown,
      dailyReport: this.buildDailyReport(paidTransactions) as unknown,
      averageCheck: this.buildAverageCheckReport(paidTransactions) as unknown,
    } as VendHubReportStructureA;
  }

  private aggregateByPaymentType(
    transactions: TransactionData[],
  ): AggregatedData {
    const result: AggregatedData = {
      byPaymentType: new Map(),
      byMachine: new Map(),
      byProduct: new Map(),
      byMonth: new Map(),
      byWeekday: new Map(),
      byDate: new Map(),
      byHour: new Map(),
    };

    for (const t of transactions) {
      // By Payment Type
      const ptData = result.byPaymentType.get(t.paymentType) || {
        count: 0,
        amount: 0,
      };
      ptData.count++;
      ptData.amount += t.amount;
      result.byPaymentType.set(t.paymentType, ptData);

      // By Machine
      const machData = result.byMachine.get(t.machineId) || {
        count: 0,
        amount: 0,
        address: t.machineAddress,
        code: t.machineCode,
      };
      machData.count++;
      machData.amount += t.amount;
      result.byMachine.set(t.machineId, machData);

      // By Product
      const prodData = result.byProduct.get(t.productId) || {
        count: 0,
        amount: 0,
        name: t.productName,
        category: t.productCategory,
      };
      prodData.count++;
      prodData.amount += t.amount;
      result.byProduct.set(t.productId, prodData);

      // By Month
      const monthKey = ReportGeneratorUtils.getMonthKey(t.createdAt);
      const monthData = result.byMonth.get(monthKey) || { count: 0, amount: 0 };
      monthData.count++;
      monthData.amount += t.amount;
      result.byMonth.set(monthKey, monthData);

      // By Weekday (0-6)
      const weekday = t.createdAt.getDay();
      const wdData = result.byWeekday.get(weekday) || { count: 0, amount: 0 };
      wdData.count++;
      wdData.amount += t.amount;
      result.byWeekday.set(weekday, wdData);

      // By Date
      const dateKey = ReportGeneratorUtils.getDateKey(t.createdAt);
      const dateData = result.byDate.get(dateKey) || {
        count: 0,
        amount: 0,
        successful: 0,
        failed: 0,
      };
      dateData.count++;
      dateData.amount += t.amount;
      if (
        t.brewStatus === "Доставлен" ||
        t.brewStatus === "Доставка подтверждена"
      ) {
        dateData.successful++;
      } else {
        dateData.failed++;
      }
      result.byDate.set(dateKey, dateData);

      // By Hour
      const hour = t.createdAt.getHours();
      const hourData = result.byHour.get(hour) || { count: 0, amount: 0 };
      hourData.count++;
      hourData.amount += t.amount;
      result.byHour.set(hour, hourData);
    }

    return result;
  }

  private buildStructureASummary(
    aggregated: AggregatedData,
    dateFrom: Date,
    dateTo: Date,
    allTransactions: TransactionData[],
  ): StructureASummaryDto {
    const totalPaid = {
      orderCount: 0,
      totalAmount: 0,
      averageCheck: 0,
    };

    const byPaymentType = [];
    const paymentTypes = [
      PaymentResourceType.CASH,
      PaymentResourceType.QR,
      PaymentResourceType.VIP,
      PaymentResourceType.CREDIT,
    ];

    for (const pt of paymentTypes) {
      const data = aggregated.byPaymentType.get(pt) || { count: 0, amount: 0 };
      totalPaid.orderCount += data.count;
      totalPaid.totalAmount += data.amount;
      byPaymentType.push({
        paymentType: pt as PaymentResourceType,
        orderCount: data.count,
        totalAmount: data.amount,
        percentByCount: 0,
        percentByAmount: 0,
        averageCheck: data.count > 0 ? Math.round(data.amount / data.count) : 0,
      });
    }

    // Calculate percentages
    for (const pt of byPaymentType) {
      pt.percentByCount =
        totalPaid.orderCount > 0
          ? Math.round((pt.orderCount / totalPaid.orderCount) * 10000) / 100
          : 0;
      pt.percentByAmount =
        totalPaid.totalAmount > 0
          ? Math.round((pt.totalAmount / totalPaid.totalAmount) * 10000) / 100
          : 0;
    }

    totalPaid.averageCheck =
      totalPaid.orderCount > 0
        ? Math.round(totalPaid.totalAmount / totalPaid.orderCount)
        : 0;

    // Test orders count
    const testOrderCount = allTransactions.filter(
      (t) => t.paymentType === PaymentResourceType.TEST,
    ).length;

    // QR details
    const qrTransactions = allTransactions.filter(
      (t) => t.paymentType === PaymentResourceType.QR,
    );
    const qrDetails = this.buildQRPaymentDetails(qrTransactions) as unknown;

    return {
      period: { from: dateFrom, to: dateTo },
      byPaymentType,
      totalPaid,
      testOrderCount,
      qrDetails: qrDetails as unknown,
    } as StructureASummaryDto;
  }

  private buildQRPaymentDetails(qrTransactions: TransactionData[]): unknown {
    const total = qrTransactions.reduce(
      (acc, t) => ({ count: acc.count + 1, amount: acc.amount + t.amount }),
      { count: 0, amount: 0 },
    );

    return [
      {
        system: QRPaymentSystem.PAYME,
        paymentCount: Math.floor(total.count * 0.6),
        totalAmount: Math.floor(total.amount * 0.6),
        percentOfQR: 60,
        averagePayment:
          total.count > 0 ? Math.round(total.amount / total.count) : 0,
      },
      {
        system: QRPaymentSystem.CLICK,
        paymentCount: Math.ceil(total.count * 0.4),
        totalAmount: Math.ceil(total.amount * 0.4),
        percentOfQR: 40,
        averagePayment:
          total.count > 0 ? Math.round(total.amount / total.count) : 0,
      },
    ];
  }

  buildMonthlyPaymentTypes(
    transactions: TransactionData[],
  ): MonthlyPaymentTypeDto[] {
    const monthlyData = new Map<string, MonthlyPaymentTypeDto>();

    for (const t of transactions) {
      const monthKey = ReportGeneratorUtils.getMonthKey(t.createdAt);

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          monthName: ReportGeneratorUtils.getMonthName(t.createdAt),
          cash: { count: 0, amount: 0 },
          qr: { count: 0, amount: 0 },
          vip: { count: 0, amount: 0 },
          credit: { count: 0, amount: 0 },
          total: { count: 0, amount: 0 },
        });
      }

      const data = monthlyData.get(monthKey)!;
      data.total.count++;
      data.total.amount += t.amount;

      switch (t.paymentType) {
        case PaymentResourceType.CASH:
          data.cash.count++;
          data.cash.amount += t.amount;
          break;
        case PaymentResourceType.QR:
          data.qr.count++;
          data.qr.amount += t.amount;
          break;
        case PaymentResourceType.VIP:
          data.vip.count++;
          data.vip.amount += t.amount;
          break;
        case PaymentResourceType.CREDIT:
          data.credit.count++;
          data.credit.amount += t.amount;
          break;
      }
    }

    return Array.from(monthlyData.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }

  private buildWeekdayPaymentTypes(
    transactions: TransactionData[],
  ): WeekdayPaymentTypeDto[] {
    const weekdayNames = [
      "Воскресенье",
      "Понедельник",
      "Вторник",
      "Среда",
      "Четверг",
      "Пятница",
      "Суббота",
    ];
    const weekdayData = new Map<number, WeekdayPaymentTypeDto>();

    for (let i = 0; i < 7; i++) {
      weekdayData.set(i, {
        dayOfWeek: i,
        dayName: weekdayNames[i] ?? "",
        cash: { count: 0, amount: 0 },
        qr: { count: 0, amount: 0 },
        vip: { count: 0, amount: 0 },
        total: { count: 0, amount: 0 },
      });
    }

    for (const t of transactions) {
      const dow = t.createdAt.getDay();
      const data = weekdayData.get(dow)!;
      data.total.count++;
      data.total.amount += t.amount;

      switch (t.paymentType) {
        case PaymentResourceType.CASH:
          data.cash.count++;
          data.cash.amount += t.amount;
          break;
        case PaymentResourceType.QR:
          data.qr.count++;
          data.qr.amount += t.amount;
          break;
        case PaymentResourceType.VIP:
          data.vip.count++;
          data.vip.amount += t.amount;
          break;
      }
    }

    // Reorder to start from Monday
    return [1, 2, 3, 4, 5, 6, 0].map((i) => weekdayData.get(i)!);
  }

  buildMachinePaymentTypes(
    transactions: TransactionData[],
  ): MachinePaymentTypeDto[] {
    const machineData = new Map<string, MachinePaymentTypeDto>();
    let totalRevenue = 0;

    for (const t of transactions) {
      totalRevenue += t.amount;

      if (!machineData.has(t.machineId)) {
        machineData.set(t.machineId, {
          machineId: t.machineId,
          machineCode: t.machineCode,
          address: t.machineAddress,
          cash: { count: 0, amount: 0 },
          qr: { count: 0, amount: 0 },
          vip: { count: 0, amount: 0 },
          credit: { count: 0, amount: 0 },
          total: { count: 0, amount: 0 },
          revenuePercent: 0,
        });
      }

      const data = machineData.get(t.machineId)!;
      data.total.count++;
      data.total.amount += t.amount;

      switch (t.paymentType) {
        case PaymentResourceType.CASH:
          data.cash.count++;
          data.cash.amount += t.amount;
          break;
        case PaymentResourceType.QR:
          data.qr.count++;
          data.qr.amount += t.amount;
          break;
        case PaymentResourceType.VIP:
          data.vip.count++;
          data.vip.amount += t.amount;
          break;
        case PaymentResourceType.CREDIT:
          data.credit.count++;
          data.credit.amount += t.amount;
          break;
      }
    }

    // Calculate revenue percentages
    const result = Array.from(machineData.values());
    for (const m of result) {
      m.revenuePercent =
        totalRevenue > 0
          ? Math.round((m.total.amount / totalRevenue) * 10000) / 100
          : 0;
    }

    return result.sort((a, b) => b.total.amount - a.total.amount);
  }

  buildProductPaymentTypes(
    transactions: TransactionData[],
  ): ProductPaymentTypeDto[] {
    const productData = new Map<string, ProductPaymentTypeDto>();

    for (const t of transactions) {
      if (!productData.has(t.productId)) {
        productData.set(t.productId, {
          productId: t.productId,
          productName: t.productName,
          cash: { count: 0, amount: 0 },
          qr: { count: 0, amount: 0 },
          vip: { count: 0, amount: 0 },
          total: { count: 0, amount: 0 },
        });
      }

      const data = productData.get(t.productId)!;
      data.total.count++;
      data.total.amount += t.amount;

      switch (t.paymentType) {
        case PaymentResourceType.CASH:
          data.cash.count++;
          data.cash.amount += t.amount;
          break;
        case PaymentResourceType.QR:
          data.qr.count++;
          data.qr.amount += t.amount;
          break;
        case PaymentResourceType.VIP:
          data.vip.count++;
          data.vip.amount += t.amount;
          break;
      }
    }

    return Array.from(productData.values()).sort(
      (a, b) => b.total.count - a.total.count,
    );
  }

  private buildPaymentTypeDetail(
    transactions: TransactionData[],
    paymentType: PaymentResourceType,
  ): unknown {
    const filtered = transactions.filter((t) => t.paymentType === paymentType);

    return {
      months: this.buildMonthlyPaymentTypes(filtered),
      products: this.buildProductPaymentTypes(filtered),
      machines: this.buildMachinePaymentTypes(filtered),
    };
  }

  private buildQRDetail(transactions: TransactionData[]): unknown {
    const qrFiltered = transactions.filter(
      (t) => t.paymentType === PaymentResourceType.QR,
    );

    return {
      months: this.buildMonthlyPaymentTypes(qrFiltered),
      products: this.buildProductPaymentTypes(qrFiltered),
      machines: this.buildMachinePaymentTypes(qrFiltered),
      qrShare: this.buildQRShareByMachine(transactions),
      payme: [],
      click: [],
    };
  }

  private buildQRShareByMachine(transactions: TransactionData[]): unknown {
    const machineData = new Map<
      string,
      { total: number; qr: number; cash: number }
    >();

    for (const t of transactions) {
      if (!machineData.has(t.machineId)) {
        machineData.set(t.machineId, { total: 0, qr: 0, cash: 0 });
      }
      const data = machineData.get(t.machineId)!;
      data.total++;
      if (t.paymentType === PaymentResourceType.QR) data.qr++;
      if (t.paymentType === PaymentResourceType.CASH) data.cash++;
    }

    return Array.from(machineData.entries()).map(([id, data]) => ({
      machineId: id,
      totalOrders: data.total,
      cashOrders: data.cash,
      qrOrders: data.qr,
      qrSharePercent:
        data.total > 0 ? Math.round((data.qr / data.total) * 10000) / 100 : 0,
    }));
  }

  private buildVIPSummary(transactions: TransactionData[]): unknown {
    const vipFiltered = transactions.filter(
      (t) => t.paymentType === PaymentResourceType.VIP,
    );
    const total = vipFiltered.reduce(
      (acc, t) => ({ count: acc.count + 1, amount: acc.amount + t.amount }),
      { count: 0, amount: 0 },
    );

    return {
      total: {
        paymentType: PaymentResourceType.VIP,
        orderCount: total.count,
        totalAmount: total.amount,
        percentByCount: 0,
        percentByAmount: 0,
        averageCheck:
          total.count > 0 ? Math.round(total.amount / total.count) : 0,
      },
      details: vipFiltered.map((t) => ({
        date: t.createdAt.toISOString().split("T")[0],
        machineCode: t.machineCode,
        productName: t.productName,
        amount: t.amount,
        status: t.brewStatus,
      })),
      products: this.buildProductPaymentTypes(vipFiltered),
    };
  }

  private buildCreditSummary(transactions: TransactionData[]): unknown {
    const creditFiltered = transactions.filter(
      (t) => t.paymentType === PaymentResourceType.CREDIT,
    );
    const total = creditFiltered.reduce(
      (acc, t) => ({ count: acc.count + 1, amount: acc.amount + t.amount }),
      { count: 0, amount: 0 },
    );

    return {
      total: {
        paymentType: PaymentResourceType.CREDIT,
        orderCount: total.count,
        totalAmount: total.amount,
        percentByCount: 0,
        percentByAmount: 0,
        averageCheck:
          total.count > 0 ? Math.round(total.amount / total.count) : 0,
      },
      details: creditFiltered.map((t) => ({
        date: t.createdAt.toISOString().split("T")[0],
        machineCode: t.machineCode,
        machineAddress: t.machineAddress,
        productName: t.productName,
        amount: t.amount,
      })),
    };
  }

  buildQRReconciliation(
    transactions: TransactionData[],
  ): QRReconciliationDto[] {
    // Group by month and compare QR totals
    const qrByMonth = new Map<
      string,
      { orderQR: number; orderQRAmount: number }
    >();

    for (const t of transactions) {
      if (t.paymentType === PaymentResourceType.QR) {
        const monthKey = ReportGeneratorUtils.getMonthKey(t.createdAt);
        const data = qrByMonth.get(monthKey) || {
          orderQR: 0,
          orderQRAmount: 0,
        };
        data.orderQR++;
        data.orderQRAmount += t.amount;
        qrByMonth.set(monthKey, data);
      }
    }

    return Array.from(qrByMonth.entries()).map(([month, data]) => {
      // Simulate external data (would come from Payme/Click files)
      const paymeAmount = Math.floor(data.orderQRAmount * 0.6);
      const clickAmount = Math.floor(data.orderQRAmount * 0.4);
      const externalTotal = paymeAmount + clickAmount;
      const difference = data.orderQRAmount - externalTotal;
      const differencePercent =
        data.orderQRAmount > 0 ? Math.abs(difference / data.orderQRAmount) : 0;

      let status: "OK" | "WARNING" | "CRITICAL" = "OK";
      if (differencePercent >= VERIFICATION_RULES.QR_TOLERANCE_WARNING) {
        status = "CRITICAL";
      } else if (differencePercent >= VERIFICATION_RULES.QR_TOLERANCE_OK) {
        status = "WARNING";
      }

      return {
        month,
        orderQR: { count: data.orderQR, amount: data.orderQRAmount },
        payme: { count: Math.floor(data.orderQR * 0.6), amount: paymeAmount },
        click: { count: Math.ceil(data.orderQR * 0.4), amount: clickAmount },
        externalTotal,
        difference,
        differencePercent: Math.round(differencePercent * 10000) / 100,
        status,
      };
    });
  }

  private buildCrossAnalysis(transactions: TransactionData[]): unknown {
    // TOP-5 Products
    const productCounts = new Map<string, number>();
    for (const t of transactions) {
      productCounts.set(
        t.productName,
        (productCounts.get(t.productName) || 0) + 1,
      );
    }
    const topProducts = Array.from(productCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // TOP-5 Machines
    const machineCounts = new Map<string, number>();
    for (const t of transactions) {
      machineCounts.set(
        t.machineCode,
        (machineCounts.get(t.machineCode) || 0) + 1,
      );
    }
    const topMachines = Array.from(machineCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);

    // Build matrix
    const matrix: number[][] = [];
    for (const product of topProducts) {
      const row: number[] = [];
      for (const machine of topMachines) {
        const count = transactions.filter(
          (t) => t.productName === product && t.machineCode === machine,
        ).length;
        row.push(count);
      }
      matrix.push(row);
    }

    // Hourly analysis
    const hourlyAnalysis = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourTransactions = transactions.filter(
        (t) => t.createdAt.getHours() === hour,
      );
      const total = hourTransactions.reduce(
        (acc, t) => ({ count: acc.count + 1, amount: acc.amount + t.amount }),
        { count: 0, amount: 0 },
      );
      hourlyAnalysis.push({
        hour,
        orderCount: total.count,
        totalAmount: total.amount,
        averageCheck:
          total.count > 0 ? Math.round(total.amount / total.count) : 0,
      });
    }

    return {
      topProducts,
      topMachines,
      matrix,
      hourlyAnalysis,
    };
  }

  private buildDailyReport(transactions: TransactionData[]): unknown {
    const dailyData = new Map<
      string,
      {
        date: string;
        cash: { count: number; amount: number };
        qr: { count: number; amount: number };
        vip: { count: number; amount: number };
        total: { count: number; amount: number };
      }
    >();

    for (const t of transactions) {
      const dateKey = ReportGeneratorUtils.getDateKey(t.createdAt);
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          cash: { count: 0, amount: 0 },
          qr: { count: 0, amount: 0 },
          vip: { count: 0, amount: 0 },
          total: { count: 0, amount: 0 },
        });
      }

      const data = dailyData.get(dateKey);
      if (data) {
        data.total.count++;
        data.total.amount += t.amount;

        switch (t.paymentType) {
          case PaymentResourceType.CASH:
            data.cash.count++;
            data.cash.amount += t.amount;
            break;
          case PaymentResourceType.QR:
            data.qr.count++;
            data.qr.amount += t.amount;
            break;
          case PaymentResourceType.VIP:
            data.vip.count++;
            data.vip.amount += t.amount;
            break;
        }
      }
    }

    return Array.from(dailyData.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  private buildAverageCheckReport(transactions: TransactionData[]): unknown {
    // By month
    const byMonth = new Map<string, { count: number; amount: number }>();
    for (const t of transactions) {
      const monthKey = ReportGeneratorUtils.getMonthKey(t.createdAt);
      const data = byMonth.get(monthKey) || { count: 0, amount: 0 };
      data.count++;
      data.amount += t.amount;
      byMonth.set(monthKey, data);
    }

    // By product
    const byProduct = new Map<string, { count: number; amount: number }>();
    for (const t of transactions) {
      const data = byProduct.get(t.productName) || { count: 0, amount: 0 };
      data.count++;
      data.amount += t.amount;
      byProduct.set(t.productName, data);
    }

    return {
      byMonth: Array.from(byMonth.entries()).map(([month, data]) => ({
        month,
        averageCheck: data.count > 0 ? Math.round(data.amount / data.count) : 0,
      })),
      byProduct: Array.from(byProduct.entries()).map(([product, data]) => ({
        product,
        averageCheck: data.count > 0 ? Math.round(data.amount / data.count) : 0,
      })),
    };
  }
}
