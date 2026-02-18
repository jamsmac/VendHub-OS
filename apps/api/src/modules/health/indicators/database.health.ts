import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { DataSource } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Check if connection is established
      if (!this.dataSource.isInitialized) {
        throw new Error("Database connection not initialized");
      }

      // Execute simple query
      await this.dataSource.query("SELECT 1");

      const responseTime = Date.now() - startTime;

      // Get connection pool stats if available
      const poolInfo = this.getPoolInfo();

      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        connected: true,
        ...poolInfo,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      throw new HealthCheckError(
        "Database check failed",
        this.getStatus(key, false, {
          responseTime: `${responseTime}ms`,
          connected: false,
          error: error.message,
        }),
      );
    }
  }

  private getPoolInfo(): Record<string, unknown> {
    try {
      // TypeORM with pg driver pool stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const driver = this.dataSource.driver as any;

      if (driver?.pool) {
        return {
          pool: {
            total: driver.pool.totalCount,
            idle: driver.pool.idleCount,
            waiting: driver.pool.waitingCount,
          },
        };
      }

      return {};
    } catch {
      return {};
    }
  }
}
