import { readFileSync } from "fs";
import { join } from "path";
import { HiconParserService } from "./hicon-parser.service";

describe("HiconParserService", () => {
  let service: HiconParserService;

  beforeEach(() => {
    service = new HiconParserService();
  });

  it("parses a minimal HICON CSV with BOM", () => {
    const csv =
      "\uFEFFProductID,Commodity code,Product name,Pay by cash,Quantity,Profit,Proportion,Total amount,Total quantity\r\n" +
      "499,499,Fanta Classic CAN 250ml\t,10000.00,1,0.00,25.00,10000.00,1,\r\n";
    const result = service.parse(csv);
    expect(result.headers[0]).toBe("ProductID");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.productName).toContain("Fanta");
    expect(result.rows[0]!.quantity).toBe(1);
    expect(result.rows[0]!.totalAmount).toBe(10000);
    expect(result.rows[0]!.unitPrice).toBe(10000);
  });

  it("skips service rows: Total footer, empty product, 其他 without ProductID", () => {
    const csv =
      "ProductID,a,Product name,Pay,Qty,Profit,Proportion,Total amount,Total quantity\n" +
      ",0,其他,10000.00,1,0.00,25.00,10000.00,1,\n" +
      "499,499,Fanta,10000.00,1,0.00,25.00,10000.00,1,\n" +
      "Total,,,40000.00,4,0.00,100.00,40000.00,4,\n";
    const result = service.parse(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.productName).toBe("Fanta");
    expect(result.skippedServiceRows).toBe(2);
  });

  it("handles the real HICON fixture", () => {
    const fixture = readFileSync(
      join(
        __dirname,
        "../../../../../..",
        "docs",
        "inventory-platform",
        "Product_name2026-4-21_15_34_44.csv",
      ),
      "utf-8",
    );
    const result = service.parse(fixture);
    // Fixture: header + 1 "其他" service row + 3 product rows + Total footer
    expect(result.rows.length).toBe(3);
    expect(result.skippedServiceRows).toBeGreaterThanOrEqual(2);
    const names = result.rows.map((r) => r.productName);
    expect(names.some((n) => n.includes("FuseTea"))).toBe(true);
    expect(names.some((n) => n.includes("Fanta"))).toBe(true);
    expect(names.some((n) => n.includes("CocaCola"))).toBe(true);
  });

  it("returns empty result for single-line or empty input", () => {
    expect(service.parse("").rows).toHaveLength(0);
    expect(service.parse("ProductID,only\n").rows).toHaveLength(0);
  });

  it("computes unit price from total/qty when Pay by cash missing", () => {
    const csv =
      "ProductID,code,Product name,Pay,Qty,Profit,Proportion,Total amount,Total quantity\n" +
      "1,1,Thing,0,5,0,25,25000,5,\n";
    const result = service.parse(csv);
    expect(result.rows[0]!.unitPrice).toBe(5000);
  });
});
