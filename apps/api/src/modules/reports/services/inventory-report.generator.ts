/**
 * Inventory Report Generator (Ingredients)
 * Calculates ingredient consumption across machines, months, and days
 * Split from vendhub-report-generator.service.ts
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  IngredientConsumptionSummaryDto,
  VENDHUB_INGREDIENTS,
} from "../dto/vendhub-report.dto";
import { TransactionData } from "./report-generator.types";
import { ReportGeneratorUtils } from "./report-generator.utils";

@Injectable()
export class InventoryReportGenerator {
  private readonly logger = new Logger(InventoryReportGenerator.name);

  buildIngredientSummary(
    transactions: TransactionData[],
  ): IngredientConsumptionSummaryDto[] {
    const ingredientTotals = new Map<string, number>();

    for (const t of transactions) {
      if (t.ingredients) {
        for (const [code, amount] of Object.entries(t.ingredients)) {
          ingredientTotals.set(
            code,
            (ingredientTotals.get(code) || 0) + (amount as number),
          );
        }
      }
    }

    return Object.entries(VENDHUB_INGREDIENTS).map(([code, info]) => {
      const consumption = ingredientTotals.get(code) || 0;
      const cost = consumption * info.pricePerUnit;

      return {
        ingredientCode: code,
        ingredientName: info.name,
        unit: info.unit,
        pricePerUnit: info.pricePerUnit,
        totalConsumption: consumption,
        packagesUsed: 0, // Would need package size info
        totalCost: Math.round(cost),
      };
    });
  }

  buildIngredientByMonths(
    transactions: TransactionData[],
  ): Array<{
    month: string;
    ingredients: Record<string, number>;
    totalCost: number;
  }> {
    const monthlyData = new Map<string, Record<string, number>>();

    for (const t of transactions) {
      const monthKey = ReportGeneratorUtils.getMonthKey(t.createdAt);

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {});
      }

      if (t.ingredients) {
        const data = monthlyData.get(monthKey)!;
        for (const [code, amount] of Object.entries(t.ingredients)) {
          data[code] = (data[code] || 0) + (amount as number);
        }
      }
    }

    return Array.from(monthlyData.entries())
      .map(([month, ingredients]) => ({
        month,
        ingredients,
        totalCost: Object.entries(ingredients).reduce((sum, [code, amount]) => {
          const info = Object.entries(VENDHUB_INGREDIENTS).find(
            ([c]) => c === code,
          )?.[1];
          return sum + (info ? amount * info.pricePerUnit : 0);
        }, 0),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  buildIngredientByMachines(transactions: TransactionData[]): Array<{
    machineId: string;
    machineCode: string;
    address: string;
    ingredients: Record<string, number>;
    totalCost: number;
  }> {
    const machineData = new Map<
      string,
      { code: string; address: string; ingredients: Record<string, number> }
    >();

    for (const t of transactions) {
      if (!machineData.has(t.machineId)) {
        machineData.set(t.machineId, {
          code: t.machineCode,
          address: t.machineAddress,
          ingredients: {},
        });
      }

      if (t.ingredients) {
        const data = machineData.get(t.machineId)!;
        for (const [code, amount] of Object.entries(t.ingredients)) {
          data.ingredients[code] =
            (data.ingredients[code] || 0) + (amount as number);
        }
      }
    }

    return Array.from(machineData.entries()).map(([machineId, data]) => ({
      machineId,
      machineCode: data.code,
      address: data.address,
      ingredients: data.ingredients,
      totalCost: Object.entries(data.ingredients).reduce(
        (sum, [code, amount]) => {
          const info = Object.entries(VENDHUB_INGREDIENTS).find(
            ([c]) => c === code,
          )?.[1];
          return sum + (info ? amount * info.pricePerUnit : 0);
        },
        0,
      ),
    }));
  }

  buildIngredientByDays(
    transactions: TransactionData[],
  ): Array<Record<string, Record<string, number>>> {
    const dailyData = new Map<string, Record<string, number>>();

    for (const t of transactions) {
      const dateKey = ReportGeneratorUtils.getDateKey(t.createdAt);

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {});
      }

      if (t.ingredients) {
        const data = dailyData.get(dateKey)!;
        for (const [code, amount] of Object.entries(t.ingredients)) {
          data[code] = (data[code] || 0) + (amount as number);
        }
      }
    }

    return Array.from(dailyData.entries())
      .map(([date, ingredients]) => ({ [date]: ingredients }))
      .sort((a, b) => {
        const aKey = Object.keys(a)[0];
        const bKey = Object.keys(b)[0];
        return aKey.localeCompare(bKey);
      });
  }
}
