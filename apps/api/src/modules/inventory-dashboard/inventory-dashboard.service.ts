import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

interface ValueRow {
  total_value: string | null;
  total_units: string | null;
}

interface TopProductRow {
  id: string;
  name: string;
  qty: string;
  value: string;
}

interface MovementRow {
  movement_type: string;
  count: string;
}

/**
 * Inventory Dashboard aggregate endpoint (Sprint G5).
 *
 * Returns a consolidated snapshot:
 *   - total inventory value (sum of on-hand qty × product.purchase_price)
 *   - total units
 *   - top 5 products by inventory value
 *   - 24h stock movement counts grouped by movement_type
 *
 * All queries strictly filter by organization_id (tenant isolation).
 */
@Injectable()
export class InventoryDashboardService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getDashboard(organizationId: string) {
    const valueRows = await this.dataSource.query<ValueRow[]>(
      `SELECT
         COALESCE(SUM(b.quantity * p.purchase_price), 0) AS total_value,
         COALESCE(SUM(b.quantity), 0) AS total_units
       FROM inventory_balances b
       INNER JOIN products p ON p.id = b.product_id
       WHERE b.organization_id = $1
         AND p.deleted_at IS NULL`,
      [organizationId],
    );
    const valueRow = valueRows[0];

    const topProducts = await this.dataSource.query<TopProductRow[]>(
      `SELECT
         p.id,
         p.name,
         SUM(b.quantity) AS qty,
         SUM(b.quantity * p.purchase_price) AS value
       FROM inventory_balances b
       INNER JOIN products p ON p.id = b.product_id
       WHERE b.organization_id = $1
         AND p.deleted_at IS NULL
       GROUP BY p.id, p.name
       ORDER BY value DESC NULLS LAST
       LIMIT 5`,
      [organizationId],
    );

    const recentMovements = await this.dataSource.query<MovementRow[]>(
      `SELECT
         movement_type,
         COUNT(*) AS count
       FROM stock_movements
       WHERE organization_id = $1
         AND at > NOW() - INTERVAL '24 hours'
       GROUP BY movement_type`,
      [organizationId],
    );

    return {
      totalValue: Number(valueRow?.total_value ?? 0),
      totalUnits: Number(valueRow?.total_units ?? 0),
      topProducts: topProducts.map((r) => ({
        id: r.id,
        name: r.name,
        qty: Number(r.qty),
        value: Number(r.value),
      })),
      recentMovementsByType: recentMovements.reduce<Record<string, number>>(
        (acc, r) => {
          acc[r.movement_type] = Number(r.count);
          return acc;
        },
        {},
      ),
    };
  }
}
