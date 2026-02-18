/**
 * Monitoring Module DTOs
 *
 * Validation and Swagger documentation for monitoring endpoints.
 * Covers metrics queries, metric recording, health check responses,
 * and alert configuration for system monitoring.
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  IsUUID,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Type, Transform } from "class-transformer";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Types of metrics collected by the monitoring service
 */
export enum MetricType {
  COUNTER = "counter",
  HISTOGRAM = "histogram",
  GAUGE = "gauge",
}

/**
 * Named metrics available in the system
 */
export enum MetricName {
  HTTP_REQUESTS_TOTAL = "http_requests_total",
  HTTP_REQUEST_DURATION = "http_request_duration_seconds",
  ACTIVE_CONNECTIONS = "active_connections",
  DB_QUERY_DURATION = "database_query_duration_seconds",
  QUEUE_JOBS_TOTAL = "queue_jobs_total",
  QUEUE_JOBS_FAILED = "queue_jobs_failed",
  MACHINE_TELEMETRY_EVENTS = "machine_telemetry_events",
  PROCESS_UPTIME = "process_uptime_seconds",
  NODEJS_HEAP_USED = "nodejs_heap_used_bytes",
  NODEJS_HEAP_TOTAL = "nodejs_heap_total_bytes",
  NODEJS_RSS = "nodejs_rss_bytes",
  NODEJS_EXTERNAL = "nodejs_external_bytes",
}

/**
 * HTTP methods tracked by the monitoring system
 */
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
  OPTIONS = "OPTIONS",
  HEAD = "HEAD",
}

/**
 * Database query types tracked for duration histograms
 */
export enum DbQueryType {
  SELECT = "SELECT",
  INSERT = "INSERT",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

/**
 * Queue job status
 */
export enum QueueJobStatus {
  COMPLETED = "completed",
  FAILED = "failed",
  ACTIVE = "active",
  WAITING = "waiting",
  DELAYED = "delayed",
}

/**
 * Telemetry event types from vending machines
 */
export enum TelemetryEventType {
  TEMPERATURE = "temperature",
  SALES = "sales",
  ERROR = "error",
  STATUS = "status",
  INVENTORY = "inventory",
  PAYMENT = "payment",
  DOOR = "door",
  POWER = "power",
}

/**
 * Monitoring alert severity levels
 */
export enum MonitoringAlertSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

/**
 * Alert channel types
 */
export enum AlertChannelType {
  IN_APP = "in_app",
  EMAIL = "email",
  TELEGRAM = "telegram",
  SMS = "sms",
  WEBHOOK = "webhook",
}

/**
 * Metrics output format
 */
export enum MetricsFormat {
  PROMETHEUS = "prometheus",
  JSON = "json",
}

// ============================================================================
// METRICS QUERY DTOs
// ============================================================================

/**
 * Query parameters for the /metrics endpoint
 */
export class QueryMetricsDto {
  @ApiPropertyOptional({
    description: "Output format for metrics",
    enum: MetricsFormat,
    default: MetricsFormat.PROMETHEUS,
    example: MetricsFormat.PROMETHEUS,
  })
  @IsOptional()
  @IsEnum(MetricsFormat)
  format?: MetricsFormat = MetricsFormat.PROMETHEUS;

  @ApiPropertyOptional({
    description: "Filter by specific metric name",
    enum: MetricName,
    example: MetricName.HTTP_REQUESTS_TOTAL,
  })
  @IsOptional()
  @IsEnum(MetricName)
  metric_name?: MetricName;

  @ApiPropertyOptional({
    description: "Filter by metric type",
    enum: MetricType,
    example: MetricType.COUNTER,
  })
  @IsOptional()
  @IsEnum(MetricType)
  metric_type?: MetricType;

  @ApiPropertyOptional({
    description: "Include Node.js process metrics",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  include_process_metrics?: boolean = true;
}

/**
 * Query parameters for the /health endpoint
 */
export class QueryHealthDto {
  @ApiPropertyOptional({
    description: "Include detailed memory breakdown",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  include_memory?: boolean = true;

  @ApiPropertyOptional({
    description: "Include HTTP statistics",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  include_http?: boolean = true;

  @ApiPropertyOptional({
    description: "Include queue statistics",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  include_queue?: boolean = true;

  @ApiPropertyOptional({
    description: "Include telemetry statistics",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  include_telemetry?: boolean = true;

  @ApiPropertyOptional({
    description: "Include Node.js runtime info",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  include_node?: boolean = true;
}

// ============================================================================
// METRIC RECORDING DTOs (for programmatic/internal use)
// ============================================================================

/**
 * DTO for recording an HTTP request metric
 */
export class RecordHttpRequestDto {
  @ApiProperty({
    description: "HTTP method",
    enum: HttpMethod,
    example: HttpMethod.GET,
  })
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @ApiProperty({
    description: "Request route path",
    example: "/api/v1/machines",
  })
  @IsString()
  @MaxLength(500)
  route: string;

  @ApiProperty({
    description: "HTTP response status code",
    example: 200,
  })
  @IsInt()
  @Min(100)
  @Max(599)
  status_code: number;

  @ApiPropertyOptional({
    description: "Request duration in seconds",
    example: 0.05,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration_seconds?: number;
}

/**
 * DTO for recording a database query metric
 */
export class RecordDbQueryDto {
  @ApiProperty({
    description: "Database query type",
    enum: DbQueryType,
    example: DbQueryType.SELECT,
  })
  @IsEnum(DbQueryType)
  query_type: DbQueryType;

  @ApiProperty({
    description: "Query duration in seconds",
    example: 0.005,
  })
  @IsNumber()
  @Min(0)
  duration_seconds: number;
}

/**
 * DTO for recording a queue job metric
 */
export class RecordQueueJobDto {
  @ApiProperty({
    description: "Queue name",
    example: "email",
  })
  @IsString()
  @MaxLength(100)
  queue_name: string;

  @ApiProperty({
    description: "Job status",
    enum: QueueJobStatus,
    example: QueueJobStatus.COMPLETED,
  })
  @IsEnum(QueueJobStatus)
  status: QueueJobStatus;
}

/**
 * DTO for recording a machine telemetry event
 */
export class RecordTelemetryEventDto {
  @ApiProperty({
    description: "Telemetry event type",
    enum: TelemetryEventType,
    example: TelemetryEventType.TEMPERATURE,
  })
  @IsEnum(TelemetryEventType)
  event_type: TelemetryEventType;

  @ApiProperty({
    description: "Machine ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsString()
  @MaxLength(255)
  machine_id: string;
}

/**
 * DTO for setting the active connections gauge
 */
export class SetActiveConnectionsDto {
  @ApiProperty({
    description: "Number of active connections",
    example: 42,
  })
  @IsInt()
  @Min(0)
  count: number;
}

// ============================================================================
// ALERT CONFIGURATION DTOs
// ============================================================================

/**
 * DTO for creating a monitoring alert threshold
 */
export class CreateMonitoringAlertDto {
  @ApiProperty({
    description: "Alert name",
    example: "High error rate",
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: "Alert description",
    example: "Triggered when HTTP 5xx rate exceeds threshold",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: "Metric to monitor",
    enum: MetricName,
    example: MetricName.HTTP_REQUESTS_TOTAL,
  })
  @IsEnum(MetricName)
  metric_name: MetricName;

  @ApiProperty({
    description: "Threshold value to trigger alert",
    example: 100,
  })
  @IsNumber()
  threshold_value: number;

  @ApiPropertyOptional({
    description: "Upper threshold for range-based alerts",
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  threshold_max?: number;

  @ApiProperty({
    description: "Alert severity",
    enum: MonitoringAlertSeverity,
    default: MonitoringAlertSeverity.WARNING,
    example: MonitoringAlertSeverity.WARNING,
  })
  @IsEnum(MonitoringAlertSeverity)
  @IsOptional()
  severity?: MonitoringAlertSeverity = MonitoringAlertSeverity.WARNING;

  @ApiPropertyOptional({
    description: "Evaluation interval in seconds",
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  evaluation_interval_seconds?: number = 60;

  @ApiPropertyOptional({
    description: "Number of consecutive breaches before firing",
    example: 3,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  consecutive_breaches?: number = 1;

  @ApiPropertyOptional({
    description: "Cooldown period between alerts in minutes",
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  cooldown_minutes?: number = 15;

  @ApiPropertyOptional({
    description: "Notification channels",
    enum: AlertChannelType,
    isArray: true,
    default: [AlertChannelType.IN_APP],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AlertChannelType, { each: true })
  notify_channels?: AlertChannelType[] = [AlertChannelType.IN_APP];

  @ApiPropertyOptional({
    description: "User IDs to notify",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  notify_user_ids?: string[];

  @ApiPropertyOptional({
    description: "Label filters (e.g., route, method) as key-value pairs",
    example: { method: "POST", route: "/api/v1/payments" },
  })
  @IsOptional()
  label_filters?: Record<string, string>;

  @ApiPropertyOptional({
    description: "Is the alert active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}

/**
 * DTO for updating a monitoring alert (all fields optional)
 */
export class UpdateMonitoringAlertDto {
  @ApiPropertyOptional({ description: "Alert name" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: "Alert description" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: "Metric to monitor",
    enum: MetricName,
  })
  @IsOptional()
  @IsEnum(MetricName)
  metric_name?: MetricName;

  @ApiPropertyOptional({
    description: "Threshold value to trigger alert",
  })
  @IsOptional()
  @IsNumber()
  threshold_value?: number;

  @ApiPropertyOptional({
    description: "Upper threshold for range-based alerts",
  })
  @IsOptional()
  @IsNumber()
  threshold_max?: number;

  @ApiPropertyOptional({
    description: "Alert severity",
    enum: MonitoringAlertSeverity,
  })
  @IsOptional()
  @IsEnum(MonitoringAlertSeverity)
  severity?: MonitoringAlertSeverity;

  @ApiPropertyOptional({
    description: "Evaluation interval in seconds",
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  evaluation_interval_seconds?: number;

  @ApiPropertyOptional({
    description: "Number of consecutive breaches before firing",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  consecutive_breaches?: number;

  @ApiPropertyOptional({
    description: "Cooldown period between alerts in minutes",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  cooldown_minutes?: number;

  @ApiPropertyOptional({
    description: "Notification channels",
    enum: AlertChannelType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AlertChannelType, { each: true })
  notify_channels?: AlertChannelType[];

  @ApiPropertyOptional({
    description: "User IDs to notify",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  notify_user_ids?: string[];

  @ApiPropertyOptional({
    description: "Label filters as key-value pairs",
  })
  @IsOptional()
  label_filters?: Record<string, string>;

  @ApiPropertyOptional({
    description: "Is the alert active",
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/**
 * Query parameters for listing monitoring alerts
 */
export class QueryMonitoringAlertsDto {
  @ApiPropertyOptional({
    description: "Filter by metric name",
    enum: MetricName,
  })
  @IsOptional()
  @IsEnum(MetricName)
  metric_name?: MetricName;

  @ApiPropertyOptional({
    description: "Filter by severity",
    enum: MonitoringAlertSeverity,
  })
  @IsOptional()
  @IsEnum(MonitoringAlertSeverity)
  severity?: MonitoringAlertSeverity;

  @ApiPropertyOptional({
    description: "Only active alerts",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  active_only?: boolean = true;

  @ApiPropertyOptional({
    description: "Search by name",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ============================================================================
// RESPONSE DTOs (for Swagger documentation)
// ============================================================================

/**
 * Memory usage in the health check response
 */
export class MemoryUsageResponseDto {
  @ApiProperty({ description: "Heap used (formatted)", example: "45.23 MB" })
  heap_used: string;

  @ApiProperty({ description: "Heap total (formatted)", example: "64.00 MB" })
  heap_total: string;

  @ApiProperty({
    description: "Resident set size (formatted)",
    example: "98.12 MB",
  })
  rss: string;

  @ApiProperty({
    description: "External memory (formatted)",
    example: "2.10 MB",
  })
  external: string;

  @ApiProperty({ description: "Raw heap used in bytes", example: 47435776 })
  heap_used_raw: number;

  @ApiProperty({ description: "Raw heap total in bytes", example: 67108864 })
  heap_total_raw: number;
}

/**
 * Uptime information in the health check response
 */
export class UptimeResponseDto {
  @ApiProperty({ description: "Uptime in seconds", example: 3661 })
  seconds: number;

  @ApiProperty({ description: "Formatted uptime string", example: "1h 1m 1s" })
  formatted: string;
}

/**
 * HTTP statistics in the health check response
 */
export class HttpStatsResponseDto {
  @ApiProperty({ description: "Total HTTP requests processed", example: 1523 })
  total_requests: number;

  @ApiProperty({
    description: "Average request duration in seconds",
    example: 0.045,
  })
  avg_duration_seconds: number;

  @ApiProperty({ description: "Number of active connections", example: 12 })
  active_connections: number;
}

/**
 * Queue statistics in the health check response
 */
export class QueueStatsResponseDto {
  @ApiProperty({ description: "Total queue jobs processed", example: 542 })
  total_jobs: number;

  @ApiProperty({ description: "Total failed queue jobs", example: 3 })
  failed_jobs: number;
}

/**
 * Telemetry statistics in the health check response
 */
export class TelemetryStatsResponseDto {
  @ApiProperty({
    description: "Total telemetry events received",
    example: 8921,
  })
  total_events: number;
}

/**
 * Node.js runtime information in the health check response
 */
export class NodeInfoResponseDto {
  @ApiProperty({ description: "Node.js version", example: "v20.11.0" })
  version: string;

  @ApiProperty({ description: "Operating system platform", example: "linux" })
  platform: string;

  @ApiProperty({ description: "Process ID", example: 12345 })
  pid: number;
}

/**
 * Full health check response DTO
 */
export class HealthCheckResponseDto {
  @ApiProperty({
    description: "Overall health status",
    example: "healthy",
  })
  status: string;

  @ApiProperty({
    description: "ISO 8601 timestamp",
    example: "2025-06-15T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Process uptime information",
    type: UptimeResponseDto,
  })
  uptime: UptimeResponseDto;

  @ApiProperty({
    description: "Memory usage statistics",
    type: MemoryUsageResponseDto,
  })
  memory: MemoryUsageResponseDto;

  @ApiProperty({
    description: "HTTP request statistics",
    type: HttpStatsResponseDto,
  })
  http: HttpStatsResponseDto;

  @ApiProperty({
    description: "Queue job statistics",
    type: QueueStatsResponseDto,
  })
  queue: QueueStatsResponseDto;

  @ApiProperty({
    description: "Telemetry event statistics",
    type: TelemetryStatsResponseDto,
  })
  telemetry: TelemetryStatsResponseDto;

  @ApiProperty({
    description: "Node.js runtime information",
    type: NodeInfoResponseDto,
  })
  node: NodeInfoResponseDto;
}

/**
 * Response for Prometheus metrics endpoint
 */
export class MetricsResponseDto {
  @ApiProperty({
    description: "Prometheus text exposition format metrics",
    example:
      '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",route="/api/v1/machines",status_code="200"} 42\n',
  })
  metrics: string;
}

// ============================================================================
// METRICS HISTORY / TIME RANGE QUERY DTOs
// ============================================================================

/**
 * Query parameters for fetching metrics over a time range
 */
export class QueryMetricsHistoryDto {
  @ApiProperty({
    description: "Metric name to query",
    enum: MetricName,
    example: MetricName.HTTP_REQUESTS_TOTAL,
  })
  @IsEnum(MetricName)
  metric_name: MetricName;

  @ApiProperty({
    description: "Start date for the query range (ISO 8601)",
    example: "2025-06-01T00:00:00.000Z",
  })
  @IsDateString()
  date_from: string;

  @ApiProperty({
    description: "End date for the query range (ISO 8601)",
    example: "2025-06-30T23:59:59.999Z",
  })
  @IsDateString()
  date_to: string;

  @ApiPropertyOptional({
    description: "Filter by specific label key-value pair (e.g., method=GET)",
    example: "method=GET",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label_filter?: string;

  @ApiPropertyOptional({
    description: "Aggregation interval in seconds",
    example: 300,
    default: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(86400)
  interval_seconds?: number = 60;

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

/**
 * Individual metric data point in a time series
 */
export class MetricDataPointDto {
  @ApiProperty({
    description: "Timestamp of the data point (ISO 8601)",
    example: "2025-06-15T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Metric value at this point",
    example: 42.5,
  })
  value: number;

  @ApiPropertyOptional({
    description: "Labels associated with this data point",
    example: { method: "GET", route: "/api/v1/machines", status_code: "200" },
  })
  labels?: Record<string, string>;
}

/**
 * Paginated response for metrics history
 */
export class MetricsHistoryResponseDto {
  @ApiProperty({
    description: "Metric name",
    enum: MetricName,
  })
  metric_name: MetricName;

  @ApiProperty({
    description: "Metric type",
    enum: MetricType,
  })
  metric_type: MetricType;

  @ApiProperty({
    description: "Time series data points",
    type: [MetricDataPointDto],
  })
  data_points: MetricDataPointDto[];

  @ApiProperty({ description: "Total number of data points", example: 1440 })
  total: number;

  @ApiProperty({ description: "Current page number", example: 1 })
  page: number;

  @ApiProperty({ description: "Items per page", example: 100 })
  limit: number;

  @ApiProperty({ description: "Total number of pages", example: 15 })
  total_pages: number;
}
