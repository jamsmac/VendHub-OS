jest.mock("@nestjs/axios", () => ({
  HttpService: class HttpService {},
  HttpModule: class HttpModule {},
}));

import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { GeoController } from "./geo.controller";
import { GeoService } from "./geo.service";

describe("GeoController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      GeoController,
      GeoService,
      [
        "autocompleteAddress",
        "geocodeAddress",
        "reverseGeocode",
        "findNearbyMachines",
        "getMachinesInBounds",
        "getDirections",
        "getStaticMapUrl",
        "calculateDistance",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Public endpoints (no auth needed) ----

  it("GET /geo/autocomplete returns 200 without auth", async () => {
    mockService.autocompleteAddress.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/geo/autocomplete?input=Tashkent")
      .expect(HttpStatus.OK);
  });

  it("POST /geo/geocode returns 200 without auth", async () => {
    mockService.geocodeAddress.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post("/geo/geocode")
      .send({ address: "Tashkent" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /geo/reverse-geocode returns 201 without auth", async () => {
    mockService.reverseGeocode.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post("/geo/reverse-geocode")
      .send({ lat: 41.2995, lng: 69.2401 })
      .expect(HttpStatus.CREATED);
  });

  // ---- Authenticated endpoints require auth ----

  it("GET /geo/nearby-machines returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/geo/nearby-machines?latitude=41.2995&longitude=69.2401")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("GET /geo/nearby-machines returns 200 with auth", async () => {
    mockService.findNearbyMachines.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/geo/nearby-machines?latitude=41.2995&longitude=69.2401")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /geo/machines-in-bounds returns 200 with auth", async () => {
    mockService.getMachinesInBounds.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(
        "/geo/machines-in-bounds?neLat=41.35&neLng=69.30&swLat=41.25&swLng=69.20",
      )
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /geo/directions returns 200 with auth", async () => {
    mockService.getDirections.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(
        "/geo/directions?originLat=41.29&originLng=69.24&destLat=41.30&destLng=69.25",
      )
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /geo/static-map returns 200 with valid coordinates", async () => {
    mockService.getStaticMapUrl.mockReturnValue("https://maps.example.com/map");
    await request(app.getHttpServer())
      .get("/geo/static-map?lat=41.2995&lng=69.2401")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /geo/distance returns 201 with auth", async () => {
    mockService.calculateDistance.mockReturnValue(1500);
    await request(app.getHttpServer())
      .post("/geo/distance")
      .set("Authorization", "Bearer admin-token")
      .send({
        from: { lat: 41.29, lng: 69.24 },
        to: { lat: 41.3, lng: 69.25 },
      })
      .expect(HttpStatus.CREATED);
  });

  // ---- All roles allowed on authenticated endpoints ----

  it("allows viewer on GET /geo/nearby-machines", async () => {
    mockService.findNearbyMachines.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/geo/nearby-machines?latitude=41.2995&longitude=69.2401")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });
});
