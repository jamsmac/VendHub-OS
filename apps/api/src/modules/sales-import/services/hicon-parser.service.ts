import { Injectable } from "@nestjs/common";

export interface ParsedHiconRow {
  productName: string;
  quantity: number;
  totalAmount: number;
  unitPrice: number;
  rawRow: readonly string[];
}

export interface ParsedHiconFile {
  headers: readonly string[];
  rows: ParsedHiconRow[];
  skippedServiceRows: number;
}

/**
 * HICON columns (0-indexed):
 *   0: ProductID
 *   1: Commodity code
 *   2: Product name  ← main match key
 *   3: Pay by cash   ← unit price
 *   4: Quantity
 *   5: Profit
 *   6: Proportion
 *   7: Total amount  ← preferred for revenue
 *   8: Total quantity
 *
 * HICON dialect: simple comma-split (no quoting observed). UTF-8 with BOM.
 * Trailing tabs, trailing commas, and a "Total" footer row are common.
 */
@Injectable()
export class HiconParserService {
  parse(csvRaw: string): ParsedHiconFile {
    const cleaned = csvRaw.replace(/^\ufeff/, "");
    const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2)
      return { headers: [], rows: [], skippedServiceRows: 0 };

    const headers = lines[0]!.split(",").map((h) => h.trim());
    const rows: ParsedHiconRow[] = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i]!;
      const cols = rawLine.split(",").map((c) => c.trim());
      if (cols.length < 8) {
        skipped++;
        continue;
      }
      const productId = cols[0] ?? "";
      const productName = cols[2] ?? "";

      // Skip service rows
      if (!productName) {
        skipped++;
        continue;
      }
      if (/^(total|итого)$/i.test(productId)) {
        skipped++;
        continue;
      }
      // "其他" = Chinese "other" — HICON emits it for untracked sales
      if (productName === "其他" && !productId) {
        skipped++;
        continue;
      }

      const qtyParsed = parseFloat(cols[4] ?? "1");
      const qty = Math.max(
        1,
        Math.round(Number.isFinite(qtyParsed) ? qtyParsed : 1),
      );
      const totalAmountParsed = parseFloat(cols[7] ?? "0");
      const totalAmount = Number.isFinite(totalAmountParsed)
        ? totalAmountParsed
        : 0;
      const unitPriceParsed = parseFloat(cols[3] ?? "0");
      const unitPriceRaw = Number.isFinite(unitPriceParsed)
        ? unitPriceParsed
        : 0;
      const unitPrice =
        unitPriceRaw > 0 ? unitPriceRaw : qty > 0 ? totalAmount / qty : 0;

      rows.push({
        productName,
        quantity: qty,
        totalAmount,
        unitPrice,
        rawRow: Object.freeze([...cols]),
      });
    }

    return { headers, rows, skippedServiceRows: skipped };
  }
}
