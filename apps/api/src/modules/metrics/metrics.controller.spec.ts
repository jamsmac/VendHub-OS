import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import * as promClient from "prom-client";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";
import { ConfigService } from "@nestjs/config";

describe("MetricsController", () => {
  let app: INestApplication;
  let metricsService: MetricsService;
  let configService: ConfigService;

  async function createApp(metricsToken?: string) {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        MetricsService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "METRICS_TOKEN") return metricsToken;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    metricsService = module.get(MetricsService);
  }

  afterEach(async () => {
    if (app) await app.close();
    // Clear all registries to avoid "metric already registered" in next test
    promClient.register.clear();
  });

  describe("without METRICS_TOKEN configured", () => {
    beforeEach(() => createApp());

    it("GET /metrics returns 200 with Prometheus format", async () => {
      const res = await request(app.getHttpServer())
        .get("/metrics")
        .expect(200);

      expect(res.text).toBeDefined();
      expect(res.headers["content-type"]).toContain("text/plain");
    });
  });

  describe("with METRICS_TOKEN configured", () => {
    const TOKEN = "test-secret-token";

    beforeEach(() => createApp(TOKEN));

    it("rejects request without token", async () => {
      await request(app.getHttpServer()).get("/metrics").expect(401);
    });

    it("accepts request with valid token in header", async () => {
      await request(app.getHttpServer())
        .get("/metrics")
        .set("x-metrics-token", TOKEN)
        .expect(200);
    });

    it("accepts request with valid token in query", async () => {
      await request(app.getHttpServer())
        .get(`/metrics?token=${TOKEN}`)
        .expect(200);
    });

    it("rejects request with invalid token", async () => {
      await request(app.getHttpServer())
        .get("/metrics")
        .set("x-metrics-token", "wrong-token")
        .expect(401);
    });
  });
});
