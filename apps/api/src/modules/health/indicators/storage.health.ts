import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";

/**
 * Health indicator for MinIO/S3 storage connectivity.
 * Attempts a lightweight HeadBucket call to verify the storage backend is reachable.
 */
@Injectable()
export class StorageHealthIndicator extends HealthIndicator {
  private readonly endpoint: string | undefined;
  private readonly bucket: string | undefined;
  private readonly accessKey: string | undefined;
  private readonly useSSL: boolean;

  constructor(private readonly configService: ConfigService) {
    super();
    this.endpoint = configService.get<string>("STORAGE_ENDPOINT");
    this.bucket = configService.get<string>("STORAGE_BUCKET");
    this.accessKey = configService.get<string>("STORAGE_ACCESS_KEY");
    this.useSSL =
      configService.get<string>("STORAGE_USE_SSL", "false") === "true";
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.endpoint || !this.accessKey) {
      return this.getStatus(key, true, {
        status: "not_configured",
        message: "Storage not configured",
      });
    }

    const startTime = Date.now();
    const protocol = this.useSSL ? "https" : "http";
    const url = `${protocol}://${this.endpoint}/${this.bucket || ""}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const responseTime = Date.now() - startTime;

      // MinIO returns 200, 403 (valid but no auth), or 404 (bucket missing).
      // Any HTTP response means the service is reachable.
      const isUp = response.status < 500;

      if (!isUp) {
        throw new Error(`Storage returned status ${response.status}`);
      }

      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        endpoint: this.endpoint,
        bucket: this.bucket,
        reachable: true,
      });
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;

      throw new HealthCheckError(
        "Storage check failed",
        this.getStatus(key, false, {
          responseTime: `${responseTime}ms`,
          endpoint: this.endpoint,
          reachable: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}
