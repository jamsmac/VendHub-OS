import request from "supertest";
import { HttpStatus, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createControllerTestApp } from "../../common/test-utils/controller-test.helper";
import { SiteCmsPublicController } from "./site-cms-public.controller";
import { SiteCmsService } from "./site-cms.service";

describe("SiteCmsPublicController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      SiteCmsPublicController,
      SiteCmsService,
      ["findByCollection", "create"],
      [
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue("a0000000-0000-0000-0000-000000000001"),
          },
        },
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /client/public/partners ──────────────────────────────

  it("GET /client/public/partners returns 200 with array (no auth required)", async () => {
    const partners = [
      { id: "p1", name: "Partner A", is_active: true },
      { id: "p2", name: "Partner B", is_active: true },
    ];
    mockService.findByCollection.mockResolvedValue(partners);

    const res = await request(app.getHttpServer())
      .get("/client/public/partners")
      .expect(HttpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(mockService.findByCollection).toHaveBeenCalledWith(
      "a0000000-0000-0000-0000-000000000001",
      "partners",
      { isActive: true },
    );
  });

  it("GET /client/public/partners returns empty array when no partners", async () => {
    mockService.findByCollection.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get("/client/public/partners")
      .expect(HttpStatus.OK);

    expect(res.body).toEqual([]);
  });

  // ── GET /client/public/machine-types ─────────────────────────

  it("GET /client/public/machine-types returns 200 with array (no auth required)", async () => {
    const types = [{ id: "t1", name: "Coffee Machine", is_active: true }];
    mockService.findByCollection.mockResolvedValue(types);

    const res = await request(app.getHttpServer())
      .get("/client/public/machine-types")
      .expect(HttpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(mockService.findByCollection).toHaveBeenCalledWith(
      "a0000000-0000-0000-0000-000000000001",
      "machine_types",
      { isActive: true },
    );
  });

  it("GET /client/public/machine-types returns empty array when none exist", async () => {
    mockService.findByCollection.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get("/client/public/machine-types")
      .expect(HttpStatus.OK);

    expect(res.body).toEqual([]);
  });

  // ── GET /client/public/site-cms/:collection ──────────────────

  it("GET /client/public/site-cms/products returns 200 with array", async () => {
    const products = [
      { id: "prod1", name: "Espresso", price: 15000, is_active: true },
      { id: "prod2", name: "Latte", price: 20000, is_active: true },
    ];
    mockService.findByCollection.mockResolvedValue(products);

    const res = await request(app.getHttpServer())
      .get("/client/public/site-cms/products")
      .expect(HttpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(mockService.findByCollection).toHaveBeenCalledWith(
      "a0000000-0000-0000-0000-000000000001",
      "products",
      { isActive: true },
    );
  });

  it("GET /client/public/site-cms/promotions returns 200", async () => {
    mockService.findByCollection.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get("/client/public/site-cms/promotions")
      .expect(HttpStatus.OK);

    expect(mockService.findByCollection).toHaveBeenCalledWith(
      "a0000000-0000-0000-0000-000000000001",
      "promotions",
      { isActive: true },
    );
  });

  it("GET /client/public/site-cms/unknown_collection returns 404", async () => {
    mockService.findByCollection.mockRejectedValue(
      new NotFoundException("Unknown collection: unknown_collection"),
    );

    await request(app.getHttpServer())
      .get("/client/public/site-cms/unknown_collection")
      .expect(HttpStatus.NOT_FOUND);
  });

  // ── POST /client/public/cooperation-requests ─────────────────

  it("POST /client/public/cooperation-requests returns 201 with valid data", async () => {
    const created = {
      id: "cr1",
      model: "franchise",
      name: "Aziz",
      phone: "+998901234567",
      comment: null,
      status: "new",
    };
    mockService.create.mockResolvedValue(created);

    const res = await request(app.getHttpServer())
      .post("/client/public/cooperation-requests")
      .send({
        model: "franchise",
        name: "Aziz",
        phone: "+998901234567",
      })
      .expect(HttpStatus.CREATED);

    expect(res.body).toEqual(created);
    expect(mockService.create).toHaveBeenCalledWith(
      "a0000000-0000-0000-0000-000000000001",
      "cooperation_requests",
      {
        data: {
          model: "franchise",
          name: "Aziz",
          phone: "+998901234567",
          comment: null,
          status: "new",
          admin_notes: null,
        },
      },
    );
  });

  it("POST /client/public/cooperation-requests with optional comment", async () => {
    mockService.create.mockResolvedValue({ id: "cr2" });

    await request(app.getHttpServer())
      .post("/client/public/cooperation-requests")
      .send({
        model: "rent",
        name: "Jasur",
        phone: "+998991112233",
        comment: "Interested in renting 5 machines",
      })
      .expect(HttpStatus.CREATED);

    expect(mockService.create).toHaveBeenCalledWith(
      "a0000000-0000-0000-0000-000000000001",
      "cooperation_requests",
      {
        data: {
          model: "rent",
          name: "Jasur",
          phone: "+998991112233",
          comment: "Interested in renting 5 machines",
          status: "new",
          admin_notes: null,
        },
      },
    );
  });

  it("POST /client/public/cooperation-requests with missing model returns 400", async () => {
    await request(app.getHttpServer())
      .post("/client/public/cooperation-requests")
      .send({
        name: "Aziz",
        phone: "+998901234567",
      })
      .expect(HttpStatus.BAD_REQUEST);

    expect(mockService.create).not.toHaveBeenCalled();
  });

  it("POST /client/public/cooperation-requests with missing name returns 400", async () => {
    await request(app.getHttpServer())
      .post("/client/public/cooperation-requests")
      .send({
        model: "franchise",
        phone: "+998901234567",
      })
      .expect(HttpStatus.BAD_REQUEST);

    expect(mockService.create).not.toHaveBeenCalled();
  });

  it("POST /client/public/cooperation-requests with missing phone returns 400", async () => {
    await request(app.getHttpServer())
      .post("/client/public/cooperation-requests")
      .send({
        model: "franchise",
        name: "Aziz",
      })
      .expect(HttpStatus.BAD_REQUEST);

    expect(mockService.create).not.toHaveBeenCalled();
  });

  it("POST /client/public/cooperation-requests with empty body returns 400", async () => {
    await request(app.getHttpServer())
      .post("/client/public/cooperation-requests")
      .send({})
      .expect(HttpStatus.BAD_REQUEST);

    expect(mockService.create).not.toHaveBeenCalled();
  });

  it("POST /client/public/cooperation-requests rejects non-whitelisted fields", async () => {
    await request(app.getHttpServer())
      .post("/client/public/cooperation-requests")
      .send({
        model: "franchise",
        name: "Aziz",
        phone: "+998901234567",
        status: "approved",
        admin_notes: "hacked",
      })
      .expect(HttpStatus.BAD_REQUEST);

    expect(mockService.create).not.toHaveBeenCalled();
  });
});
