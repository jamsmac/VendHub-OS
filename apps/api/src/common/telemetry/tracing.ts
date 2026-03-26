/**
 * OpenTelemetry Tracing Configuration
 *
 * Provides distributed tracing for the VendHub API.
 * Enable by setting OTEL_ENABLED=true and OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * This file should be imported at the very top of main.ts (before NestJS bootstrap)
 * when tracing is enabled:
 *
 *   if (process.env.OTEL_ENABLED === 'true') {
 *     require('./common/telemetry/tracing');
 *   }
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

const isEnabled = process.env.OTEL_ENABLED === "true";

if (isEnabled) {
  const exporterEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces";

  const exporter = new OTLPTraceExporter({
    url: exporterEndpoint,
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "vendhub-api",
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "1.0.0",
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
    instrumentations: [
      getNodeAutoInstrumentations({
        // Instrument HTTP, Express, and database clients
        "@opentelemetry/instrumentation-http": { enabled: true },
        "@opentelemetry/instrumentation-express": { enabled: true },
        "@opentelemetry/instrumentation-pg": { enabled: true },
        "@opentelemetry/instrumentation-redis-4": { enabled: true },
        "@opentelemetry/instrumentation-ioredis": { enabled: true },
        // Disable noisy instrumentations
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-net": { enabled: false },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk.shutdown().catch(console.error);
  });

  console.log(
    `[OpenTelemetry] Tracing enabled → ${exporterEndpoint}`,
  );
}

export { isEnabled as tracingEnabled };
