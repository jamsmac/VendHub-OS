import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  /**
   * Check heap memory usage
   */
  checkHeap(key: string, maxHeapBytes: number): HealthIndicatorResult {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const usagePercent = (heapUsed / heapTotal) * 100;

    const isHealthy = heapUsed < maxHeapBytes;

    const details = {
      heapUsed: this.formatBytes(heapUsed),
      heapTotal: this.formatBytes(heapTotal),
      heapLimit: this.formatBytes(maxHeapBytes),
      usagePercent: `${usagePercent.toFixed(2)}%`,
    };

    if (isHealthy) {
      return this.getStatus(key, true, details);
    }

    throw new HealthCheckError(
      `Heap memory usage exceeded: ${this.formatBytes(heapUsed)} > ${this.formatBytes(maxHeapBytes)}`,
      this.getStatus(key, false, details),
    );
  }

  /**
   * Check RSS memory usage
   */
  checkRSS(key: string, maxRssBytes: number): HealthIndicatorResult {
    const memoryUsage = process.memoryUsage();
    const rss = memoryUsage.rss;

    const isHealthy = rss < maxRssBytes;

    const details = {
      rss: this.formatBytes(rss),
      rssLimit: this.formatBytes(maxRssBytes),
      external: this.formatBytes(memoryUsage.external),
      arrayBuffers: this.formatBytes(memoryUsage.arrayBuffers),
    };

    if (isHealthy) {
      return this.getStatus(key, true, details);
    }

    throw new HealthCheckError(
      `RSS memory usage exceeded: ${this.formatBytes(rss)} > ${this.formatBytes(maxRssBytes)}`,
      this.getStatus(key, false, details),
    );
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
