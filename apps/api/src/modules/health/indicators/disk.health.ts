import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DiskHealthOptions {
  thresholdPercent: number;
  path: string;
}

@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  /**
   * Check disk storage usage
   */
  async checkStorage(
    key: string,
    options: DiskHealthOptions,
  ): Promise<HealthIndicatorResult> {
    const { thresholdPercent, path } = options;

    try {
      const diskInfo = await this.getDiskInfo(path);

      const usedPercent = diskInfo.usedPercent;
      const isHealthy = usedPercent < thresholdPercent * 100;

      const details = {
        path,
        total: this.formatBytes(diskInfo.total),
        used: this.formatBytes(diskInfo.used),
        available: this.formatBytes(diskInfo.available),
        usedPercent: `${usedPercent.toFixed(2)}%`,
        threshold: `${(thresholdPercent * 100).toFixed(0)}%`,
      };

      if (isHealthy) {
        return this.getStatus(key, true, details);
      }

      throw new HealthCheckError(
        `Disk usage exceeded threshold: ${usedPercent.toFixed(2)}% > ${(thresholdPercent * 100).toFixed(0)}%`,
        this.getStatus(key, false, details),
      );
    } catch (error: any) {
      if (error instanceof HealthCheckError) {
        throw error;
      }

      throw new HealthCheckError(
        `Disk check failed: ${error.message}`,
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  private async getDiskInfo(
    path: string,
  ): Promise<{
    total: number;
    used: number;
    available: number;
    usedPercent: number;
  }> {
    try {
      // Try using df command (Unix/Linux)
      const { stdout } = await execAsync(`df -B1 "${path}" | tail -1`);
      const parts = stdout.split(/\s+/);

      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const available = parseInt(parts[3], 10);
      const usedPercent = (used / total) * 100;

      return { total, used, available, usedPercent };
    } catch {
      // Fallback: use Node.js fs.statfs (Node 18+)
      try {
        const stats = await fs.promises.statfs(path);

        const total = stats.blocks * stats.bsize;
        const available = stats.bavail * stats.bsize;
        const used = total - available;
        const usedPercent = (used / total) * 100;

        return { total, used, available, usedPercent };
      } catch (statError: any) {
        throw new Error(`Cannot determine disk usage: ${statError.message}`);
      }
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
