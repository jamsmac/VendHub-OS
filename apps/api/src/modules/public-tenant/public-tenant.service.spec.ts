import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { PublicTenantService } from "./public-tenant.service";
import { Organization } from "../organizations/entities/organization.entity";
import { Location } from "../locations/entities/location.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Product } from "../products/entities/product.entity";

describe("PublicTenantService", () => {
  let service: PublicTenantService;
  let orgRepo: { findOne: jest.Mock };
  let locationRepo: { findOne: jest.Mock; find: jest.Mock };
  let machineRepo: { find: jest.Mock };
  let productRepo: { find: jest.Mock };

  const ORG_ID = "a0000000-0000-0000-0000-000000000001";
  const LOCATION_ID = "l0000000-0000-0000-0000-000000000001";

  const makeOrg = (overrides?: Partial<Organization>): Organization =>
    ({
      id: ORG_ID,
      slug: "globerent",
      name: "Globerent",
      nameUz: null,
      logo: null,
      description: null,
      city: "Tashkent",
      region: null,
      publicEnabled: true,
      settings: {
        timezone: "Asia/Tashkent",
        currency: "UZS",
        language: "ru",
      },
      deletedAt: null,
      ...overrides,
    }) as unknown as Organization;

  const makeLocation = (overrides?: Partial<Location>): Location =>
    ({
      id: LOCATION_ID,
      organizationId: ORG_ID,
      slug: "business-center-1",
      name: "Business Center 1",
      code: "LOC-TAS-001",
      address: { fullAddress: "Tashkent, Amir Temur 1" },
      city: "Tashkent",
      latitude: 41.311,
      longitude: 69.279,
      publicEnabled: true,
      isActive: true,
      parentLocationId: null,
      deletedAt: null,
      ...overrides,
    }) as unknown as Location;

  beforeEach(async () => {
    orgRepo = { findOne: jest.fn() };
    locationRepo = { findOne: jest.fn(), find: jest.fn() };
    machineRepo = { find: jest.fn() };
    productRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicTenantService,
        { provide: getRepositoryToken(Organization), useValue: orgRepo },
        { provide: getRepositoryToken(Location), useValue: locationRepo },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get<PublicTenantService>(PublicTenantService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getTenant", () => {
    it("returns tenant data for valid public slug", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg());

      const result = await service.getTenant("globerent");
      expect(result.slug).toBe("globerent");
      expect(result.name).toBe("Globerent");
      expect(result.settings.timezone).toBe("Asia/Tashkent");
    });

    it("throws 404 NotFoundException for nonexistent slug (enumeration defense)", async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(service.getTenant("missing")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws 404 NotFoundException when publicEnabled=false (same as missing)", async () => {
      // Repo query already filters publicEnabled=true, so returns null
      orgRepo.findOne.mockResolvedValue(null);
      await expect(service.getTenant("private-org")).rejects.toThrow(
        NotFoundException,
      );
      expect(orgRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          slug: "private-org",
          publicEnabled: true,
        }),
      });
    });
  });

  describe("getTenantMenu", () => {
    it("returns products without cost/margin fields", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg());
      productRepo.find.mockResolvedValue([
        {
          id: "p1",
          sku: "ESP-001",
          name: "Espresso",
          nameUz: null,
          description: null,
          category: "drinks",
          categoryId: null,
          sellingPrice: 15000,
          purchasePrice: 5000, // should NOT appear in output
          currency: "UZS",
          imageUrl: null,
          tags: [],
        },
      ]);

      const result = await service.getTenantMenu("globerent");
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty("purchasePrice");
      expect(result[0]).not.toHaveProperty("costPrice");
      expect(result[0].price).toBe(15000);
      expect(result[0].name).toBe("Espresso");
    });

    it("throws 404 for nonexistent/non-public org", async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(service.getTenantMenu("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getTenantLocations", () => {
    it("returns public locations with coordinates", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg());
      locationRepo.find.mockResolvedValue([makeLocation()]);

      const result = await service.getTenantLocations("globerent");
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("business-center-1");
      expect(result[0].coordinates).toEqual({ lat: 41.311, lng: 69.279 });
      expect(locationRepo.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: ORG_ID,
          publicEnabled: true,
          isActive: true,
        }),
        order: { name: "ASC" },
      });
    });

    it("throws 404 for nonexistent/non-public org", async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(service.getTenantLocations("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getLocation", () => {
    it("returns location with machines when org is also public", async () => {
      locationRepo.findOne.mockResolvedValue(makeLocation());
      orgRepo.findOne.mockResolvedValue(makeOrg());
      machineRepo.find.mockResolvedValue([
        {
          id: "m1",
          machineNumber: "M-001",
          name: "Coffee 1",
          type: "coffee",
          contentModel: "slots",
          gridRows: 4,
          gridCols: 6,
        },
      ]);

      const result = await service.getLocation("business-center-1");
      expect(result.slug).toBe("business-center-1");
      expect(result.machines).toHaveLength(1);
      expect(result.machines[0].gridRows).toBe(4);
      expect(result.organization.slug).toBe("globerent");
    });

    it("throws 404 for missing location", async () => {
      locationRepo.findOne.mockResolvedValue(null);
      await expect(service.getLocation("nope")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws 404 when location public but org private (cascade check)", async () => {
      locationRepo.findOne.mockResolvedValue(makeLocation());
      orgRepo.findOne.mockResolvedValue(null); // org not public
      await expect(service.getLocation("business-center-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
