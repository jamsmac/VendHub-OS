import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

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
        throw new Error('Database connection not initialized');
      }

      // Execute simple query
      await this.dataSource.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      // Get connection pool stats if available
      const poolInfo = this.getPoolInfo();

      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        connected: true,
        ...poolInfo,
      });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, {
          responseTime: `${responseTime}ms`,
          connected: false,
          error: error.message,
        }),
      );
    }
  }

  private getPoolInfo(): Record<string, any> {
    try {
      // TypeORM with pg driver pool stats
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
