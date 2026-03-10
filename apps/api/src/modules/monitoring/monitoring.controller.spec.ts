import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import { MonitoringController } from "./monitoring.controller";
import { MonitoringService } from "./monitoring.service";

/**
 * MonitoringController uses @Public() + MetricsKeyGuard (checks METRICS_API_KEY).
 * We set up a custom test app since the standard helper's auth guards would
 * interfere with the @Public() + custom guard pattern.
 */
describe("MonitoringController", () => {
  let app: INestApplication;
  let mockService: Record<string, jest.Mock>;

  const METRICS_KEY = "test-metrics-api-key-1234";

  beforeAll(async () => {
    mockService = {
      getMetrics: jest.fn().mockReturnValue("# HELP uptime\nuptime 123\n"),
      getHealthMetrics: jest.fn().mockReturnValue({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: { seconds: 100, formatted: "1m 40s" },
        memory: {},
        http: {},
        queue: {},
        telemetry: {},
        node: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        { provide: MonitoringService, useValue: mockService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "METRICS_API_KEY") return METRICS_KEY;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // GET /monitoring/metrics
  // =========================================================================

  it("GET /monitoring/metrics returns 200 with valid API key", async () => {
    await request(app.getHttpServer())
      .get("/monitoring/metrics")
      .set("Authorization", `Bearer ${METRICS_KEY}`)
      .expect(HttpStatus.OK);
    expect(mockService.getMetrics).toHaveBeenCalled();
  });

  it("GET /monitoring/metrics returns 403 without API key", async () => {
    await request(app.getHttpServer())
      .get("/monitoring/metrics")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /monitoring/metrics returns 403 with invalid API key", async () => {
    await request(app.getHttpServer())
      .get("/monitoring/metrics")
      .set("Authorization", "Bearer wrong-key")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // GET /monitoring/health
  // =========================================================================

  it("GET /monitoring/health returns 200 with valid API key", async () => {
    await request(app.getHttpServer())
      .get("/monitoring/health")
      .set("Authorization", `Bearer ${METRICS_KEY}`)
      .expect(HttpStatus.OK);
    expect(mockService.getHealthMetrics).toHaveBeenCalled();
  });

  it("GET /monitoring/health returns 403 without API key", async () => {
    await request(app.getHttpServer())
      .get("/monitoring/health")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /monitoring/health returns correct body shape", async () => {
    const res = await request(app.getHttpServer())
      .get("/monitoring/health")
      .set("Authorization", `Bearer ${METRICS_KEY}`)
      .expect(HttpStatus.OK);
    expect(res.body).toHaveProperty("status", "healthy");
  });
});
