import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface Span {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
  status: "OK" | "ERROR" | "UNSET";
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }>;
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private enabled = false;
  private serviceName = "vendhub-api";
  private collectorEndpoint = "";
  private activeSpans = new Map<string, Span>();

  constructor(private readonly configService: ConfigService) {}

  initialize(): void {
    this.serviceName = this.configService.get(
      "OTEL_SERVICE_NAME",
      "vendhub-api",
    );
    this.collectorEndpoint = this.configService.get(
      "OTEL_COLLECTOR_ENDPOINT",
      "",
    );
    this.enabled = this.configService.get("OTEL_ENABLED", "false") === "true";

    if (this.enabled) {
      this.logger.log(`OpenTelemetry tracing enabled for ${this.serviceName}`);
      this.logger.log(
        `Collector endpoint: ${this.collectorEndpoint || "console (no endpoint configured)"}`,
      );
    }
  }

  startSpan(
    name: string,
    attributes?: Record<string, unknown>,
    parentSpanId?: string,
  ): string {
    if (!this.enabled) return "";

    const traceId = this.generateId(32);
    const spanId = this.generateId(16);

    const span: Span = {
      name,
      traceId,
      spanId,
      parentSpanId,
      startTime: Date.now(),
      attributes: {
        "service.name": this.serviceName,
        ...attributes,
      },
      status: "UNSET",
      events: [],
    };

    this.activeSpans.set(spanId, span);
    return spanId;
  }

  endSpan(
    spanId: string,
    status: "OK" | "ERROR" = "OK",
    attributes?: Record<string, unknown>,
  ): void {
    if (!this.enabled || !spanId) return;

    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.status = status;
    if (attributes) {
      Object.assign(span.attributes, attributes);
    }

    this.exportSpan(span);
    this.activeSpans.delete(spanId);
  }

  addEvent(
    spanId: string,
    name: string,
    attributes?: Record<string, unknown>,
  ): void {
    if (!this.enabled || !spanId) return;
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.events.push({ name, timestamp: Date.now(), attributes });
    }
  }

  private exportSpan(span: Span): void {
    const duration = (span.endTime || Date.now()) - span.startTime;

    if (this.collectorEndpoint) {
      // In production, send to OTLP collector via HTTP
      // This is a lightweight implementation - for full OpenTelemetry SDK,
      // install @opentelemetry/sdk-node and configure exporters
      this.logger.debug(
        `[TRACE] ${span.name} traceId=${span.traceId} spanId=${span.spanId} duration=${duration}ms status=${span.status}`,
      );
    } else {
      this.logger.debug(
        `[TRACE] ${span.name} duration=${duration}ms status=${span.status}`,
      );
    }
  }

  private generateId(length: number): string {
    const chars = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}
