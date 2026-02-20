import { Test, TestingModule } from '@nestjs/testing';

import { MonitoringService } from './monitoring.service';

// ============================================================================
// TESTS
// ============================================================================

describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringService],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // incrementHttpRequests
  // ==========================================================================

  describe('incrementHttpRequests', () => {
    it('should increment counter for a new route', () => {
      service.incrementHttpRequests('GET', '/api/v1/machines', 200);

      const metrics = service.getMetrics();
      expect(metrics).toContain('http_requests_total{method="GET",route="/api/v1/machines",status_code="200"} 1');
    });

    it('should increment existing counter', () => {
      service.incrementHttpRequests('GET', '/api/v1/machines', 200);
      service.incrementHttpRequests('GET', '/api/v1/machines', 200);

      const metrics = service.getMetrics();
      expect(metrics).toContain('http_requests_total{method="GET",route="/api/v1/machines",status_code="200"} 2');
    });

    it('should track different routes separately', () => {
      service.incrementHttpRequests('GET', '/api/v1/machines', 200);
      service.incrementHttpRequests('POST', '/api/v1/machines', 201);
      service.incrementHttpRequests('GET', '/api/v1/products', 200);

      const metrics = service.getMetrics();
      expect(metrics).toContain('method="GET",route="/api/v1/machines",status_code="200"');
      expect(metrics).toContain('method="POST",route="/api/v1/machines",status_code="201"');
      expect(metrics).toContain('method="GET",route="/api/v1/products",status_code="200"');
    });

    it('should track different status codes separately', () => {
      service.incrementHttpRequests('GET', '/api/v1/machines', 200);
      service.incrementHttpRequests('GET', '/api/v1/machines', 404);
      service.incrementHttpRequests('GET', '/api/v1/machines', 500);

      const metrics = service.getMetrics();
      expect(metrics).toContain('status_code="200"');
      expect(metrics).toContain('status_code="404"');
      expect(metrics).toContain('status_code="500"');
    });
  });

  // ==========================================================================
  // observeHttpDuration
  // ==========================================================================

  describe('observeHttpDuration', () => {
    it('should record HTTP request duration', () => {
      service.observeHttpDuration('GET', '/api/v1/machines', 0.05);

      const metrics = service.getMetrics();
      expect(metrics).toContain('http_request_duration_seconds_sum{method="GET",route="/api/v1/machines"}');
      expect(metrics).toContain('http_request_duration_seconds_count{method="GET",route="/api/v1/machines"} 1');
    });

    it('should accumulate sum and count for multiple observations', () => {
      service.observeHttpDuration('GET', '/api/v1/test', 0.1);
      service.observeHttpDuration('GET', '/api/v1/test', 0.2);
      service.observeHttpDuration('GET', '/api/v1/test', 0.3);

      const metrics = service.getMetrics();
      expect(metrics).toContain('http_request_duration_seconds_count{method="GET",route="/api/v1/test"} 3');
      // Sum should be 0.6
      expect(metrics).toMatch(/http_request_duration_seconds_sum\{method="GET",route="\/api\/v1\/test"\} 0\.6/);
    });

    it('should populate histogram buckets correctly', () => {
      // Duration of 0.05 should increment buckets 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
      service.observeHttpDuration('GET', '/test', 0.05);

      const metrics = service.getMetrics();
      // le="0.025" should be 0 (0.05 > 0.025)
      expect(metrics).toContain('le="0.025"} 0');
      // le="0.05" should be 1
      expect(metrics).toContain('le="0.05"} 1');
      // le="0.1" should be 1
      expect(metrics).toContain('le="0.1"} 1');
    });
  });

  // ==========================================================================
  // setActiveConnections
  // ==========================================================================

  describe('setActiveConnections', () => {
    it('should set the gauge value', () => {
      service.setActiveConnections(42);

      const metrics = service.getMetrics();
      expect(metrics).toContain('active_connections 42');
    });

    it('should overwrite previous value', () => {
      service.setActiveConnections(10);
      service.setActiveConnections(5);

      const metrics = service.getMetrics();
      expect(metrics).toContain('active_connections 5');
      expect(metrics).not.toContain('active_connections 10');
    });

    it('should handle zero value', () => {
      service.setActiveConnections(100);
      service.setActiveConnections(0);

      const metrics = service.getMetrics();
      expect(metrics).toContain('active_connections 0');
    });
  });

  // ==========================================================================
  // observeDbQueryDuration
  // ==========================================================================

  describe('observeDbQueryDuration', () => {
    it('should record database query duration', () => {
      service.observeDbQueryDuration('SELECT', 0.005);

      const metrics = service.getMetrics();
      expect(metrics).toContain('database_query_duration_seconds_sum{query_type="SELECT"}');
      expect(metrics).toContain('database_query_duration_seconds_count{query_type="SELECT"} 1');
    });

    it('should track different query types separately', () => {
      service.observeDbQueryDuration('SELECT', 0.01);
      service.observeDbQueryDuration('INSERT', 0.02);
      service.observeDbQueryDuration('UPDATE', 0.03);

      const metrics = service.getMetrics();
      expect(metrics).toContain('query_type="SELECT"');
      expect(metrics).toContain('query_type="INSERT"');
      expect(metrics).toContain('query_type="UPDATE"');
    });
  });

  // ==========================================================================
  // incrementQueueJobs
  // ==========================================================================

  describe('incrementQueueJobs', () => {
    it('should increment queue jobs counter', () => {
      service.incrementQueueJobs('email', 'completed');

      const metrics = service.getMetrics();
      expect(metrics).toContain('queue_jobs_total{queue_name="email",status="completed"} 1');
    });

    it('should also increment failed counter when status is failed', () => {
      service.incrementQueueJobs('email', 'failed');

      const metrics = service.getMetrics();
      expect(metrics).toContain('queue_jobs_total{queue_name="email",status="failed"} 1');
      expect(metrics).toContain('queue_jobs_failed{queue_name="email"} 1');
    });

    it('should not increment failed counter for non-failed status', () => {
      service.incrementQueueJobs('email', 'completed');

      const metrics = service.getMetrics();
      expect(metrics).not.toContain('queue_jobs_failed{queue_name="email"}');
    });

    it('should accumulate failed counts', () => {
      service.incrementQueueJobs('notifications', 'failed');
      service.incrementQueueJobs('notifications', 'failed');
      service.incrementQueueJobs('notifications', 'failed');

      const metrics = service.getMetrics();
      expect(metrics).toContain('queue_jobs_failed{queue_name="notifications"} 3');
    });
  });

  // ==========================================================================
  // incrementTelemetryEvents
  // ==========================================================================

  describe('incrementTelemetryEvents', () => {
    it('should increment telemetry events counter', () => {
      service.incrementTelemetryEvents('temperature', 'machine-001');

      const metrics = service.getMetrics();
      expect(metrics).toContain('machine_telemetry_events{event_type="temperature",machine_id="machine-001"} 1');
    });

    it('should track different event types for same machine', () => {
      service.incrementTelemetryEvents('temperature', 'machine-001');
      service.incrementTelemetryEvents('sales', 'machine-001');
      service.incrementTelemetryEvents('error', 'machine-001');

      const metrics = service.getMetrics();
      expect(metrics).toContain('event_type="temperature"');
      expect(metrics).toContain('event_type="sales"');
      expect(metrics).toContain('event_type="error"');
    });
  });

  // ==========================================================================
  // getMetrics
  // ==========================================================================

  describe('getMetrics', () => {
    it('should return Prometheus text exposition format', () => {
      const metrics = service.getMetrics();

      expect(metrics).toContain('# HELP http_requests_total');
      expect(metrics).toContain('# TYPE http_requests_total counter');
      expect(metrics).toContain('# HELP http_request_duration_seconds');
      expect(metrics).toContain('# TYPE http_request_duration_seconds histogram');
      expect(metrics).toContain('# HELP active_connections');
      expect(metrics).toContain('# TYPE active_connections gauge');
      expect(metrics).toContain('# HELP process_uptime_seconds');
      expect(metrics).toContain('# TYPE process_uptime_seconds gauge');
      expect(metrics).toContain('# HELP nodejs_heap_used_bytes');
      expect(metrics).toContain('# HELP nodejs_rss_bytes');
    });

    it('should include process uptime', () => {
      const metrics = service.getMetrics();

      // Should have a positive uptime value
      const match = metrics.match(/process_uptime_seconds (\d+\.\d+)/);
      expect(match).toBeTruthy();
      expect(parseFloat(match![1])).toBeGreaterThanOrEqual(0);
    });

    it('should include Node.js memory metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics).toMatch(/nodejs_heap_used_bytes \d+/);
      expect(metrics).toMatch(/nodejs_heap_total_bytes \d+/);
      expect(metrics).toMatch(/nodejs_rss_bytes \d+/);
      expect(metrics).toMatch(/nodejs_external_bytes \d+/);
    });

    it('should end with newline', () => {
      const metrics = service.getMetrics();
      expect(metrics.endsWith('\n')).toBe(true);
    });
  });

  // ==========================================================================
  // getHealthMetrics
  // ==========================================================================

  describe('getHealthMetrics', () => {
    it('should return health check JSON', () => {
      const health = service.getHealthMetrics();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeDefined();
      expect(health.uptime.seconds).toBeGreaterThanOrEqual(0);
      expect(health.uptime.formatted).toBeDefined();
      expect(health.memory).toBeDefined();
      expect(health.http).toBeDefined();
      expect(health.queue).toBeDefined();
      expect(health.telemetry).toBeDefined();
      expect(health.node).toBeDefined();
    });

    it('should include Node.js version and platform', () => {
      const health = service.getHealthMetrics();

      expect(health.node.version).toBe(process.version);
      expect(health.node.platform).toBe(process.platform);
      expect(health.node.pid).toBe(process.pid);
    });

    it('should aggregate HTTP request totals', () => {
      service.incrementHttpRequests('GET', '/a', 200);
      service.incrementHttpRequests('GET', '/b', 200);
      service.incrementHttpRequests('POST', '/c', 201);

      const health = service.getHealthMetrics();

      expect(health.http.totalRequests).toBe(3);
    });

    it('should calculate average request duration', () => {
      service.observeHttpDuration('GET', '/a', 0.1);
      service.observeHttpDuration('GET', '/a', 0.3);

      const health = service.getHealthMetrics();

      // Average should be 0.2
      expect(health.http.avgDurationSeconds).toBe(0.2);
    });

    it('should report active connections', () => {
      service.setActiveConnections(15);

      const health = service.getHealthMetrics();

      expect(health.http.activeConnections).toBe(15);
    });

    it('should aggregate queue job totals', () => {
      service.incrementQueueJobs('email', 'completed');
      service.incrementQueueJobs('email', 'completed');
      service.incrementQueueJobs('email', 'failed');
      service.incrementQueueJobs('sms', 'completed');

      const health = service.getHealthMetrics();

      expect(health.queue.totalJobs).toBe(4);
      expect(health.queue.failedJobs).toBe(1);
    });

    it('should aggregate telemetry event totals', () => {
      service.incrementTelemetryEvents('temperature', 'm1');
      service.incrementTelemetryEvents('sales', 'm2');
      service.incrementTelemetryEvents('error', 'm1');

      const health = service.getHealthMetrics();

      expect(health.telemetry.totalEvents).toBe(3);
    });

    it('should return formatted memory values', () => {
      const health = service.getHealthMetrics();

      expect(health.memory.heapUsed).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(health.memory.heapTotal).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(health.memory.rss).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(health.memory.heapUsedRaw).toBeGreaterThan(0);
      expect(health.memory.heapTotalRaw).toBeGreaterThan(0);
    });

    it('should return formatted uptime', () => {
      const health = service.getHealthMetrics();

      // Should contain at least seconds component
      expect(health.uptime.formatted).toMatch(/\d+s/);
    });

    it('should return zero avgDuration when no requests recorded', () => {
      const health = service.getHealthMetrics();

      expect(health.http.avgDurationSeconds).toBe(0);
    });
  });
});
