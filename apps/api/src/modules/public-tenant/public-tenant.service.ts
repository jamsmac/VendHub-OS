import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Organization } from "../organizations/entities/organization.entity";
import { Location } from "../locations/entities/location.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Product } from "../products/entities/product.entity";

/**
 * Public Tenant Service — serves unauthenticated endpoints for the public
 * storefront. All queries require organization.publicEnabled = true AND (for
 * location routes) location.publicEnabled = true.
 *
 * Enumeration defense: any failure (missing slug, disabled flag, org/location
 * mismatch) returns the same generic 404. Never 403 — that would leak that the
 * slug exists but is private.
 */
@Injectable()
export class PublicTenantService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  private async findPublicOrg(slug: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({
      where: {
        slug,
        publicEnabled: true,
        deletedAt: IsNull(),
      },
    });
    if (!org) throw new NotFoundException();
    return org;
  }

  async getTenant(slug: string) {
    const org = await this.findPublicOrg(slug);
    return {
      slug: org.slug,
      name: org.name,
      nameUz: org.nameUz ?? null,
      logo: org.logo ?? null,
      description: org.description ?? null,
      city: org.city ?? null,
      region: org.region ?? null,
      settings: {
        timezone: org.settings?.timezone ?? "Asia/Tashkent",
        currency: org.settings?.currency ?? "UZS",
        language: org.settings?.language ?? "ru",
        branding: org.settings?.branding ?? null,
      },
    };
  }

  async getTenantMenu(slug: string) {
    const org = await this.findPublicOrg(slug);
    const products = await this.productRepo.find({
      where: {
        organizationId: org.id,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { name: "ASC" },
    });

    // Strip cost / margin fields — only expose selling price + display data
    return products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      nameUz: p.nameUz ?? null,
      description: p.description ?? null,
      category: p.category,
      categoryId: p.categoryId,
      price: Number(p.sellingPrice ?? 0),
      currency: p.currency,
      imageUrl: p.imageUrl ?? null,
      tags: p.tags ?? [],
    }));
  }

  async getTenantLocations(slug: string) {
    const org = await this.findPublicOrg(slug);
    const locations = await this.locationRepo.find({
      where: {
        organizationId: org.id,
        publicEnabled: true,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { name: "ASC" },
    });
    return locations.map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      address: l.address,
      city: l.city,
      coordinates: {
        lat: l.latitude !== null ? Number(l.latitude) : null,
        lng: l.longitude !== null ? Number(l.longitude) : null,
      },
      parentLocationId: l.parentLocationId,
    }));
  }

  async getLocation(slug: string) {
    const location = await this.locationRepo.findOne({
      where: {
        slug,
        publicEnabled: true,
        deletedAt: IsNull(),
      },
    });
    if (!location) throw new NotFoundException();

    // Cascade check: org must also be publicEnabled (defense-in-depth)
    const org = await this.orgRepo.findOne({
      where: {
        id: location.organizationId,
        publicEnabled: true,
        deletedAt: IsNull(),
      },
    });
    if (!org) throw new NotFoundException();

    const machines = await this.machineRepo.find({
      where: {
        locationId: location.id,
        deletedAt: IsNull(),
      },
      order: { machineNumber: "ASC" },
    });

    return {
      slug: location.slug,
      name: location.name,
      address: location.address,
      city: location.city,
      coordinates: {
        lat: location.latitude !== null ? Number(location.latitude) : null,
        lng: location.longitude !== null ? Number(location.longitude) : null,
      },
      organization: {
        slug: org.slug,
        name: org.name,
      },
      machines: machines.map((m) => ({
        id: m.id,
        machineNumber: m.machineNumber,
        name: m.name,
        type: m.type,
        contentModel: m.contentModel,
        gridRows: m.gridRows,
        gridCols: m.gridCols,
      })),
    };
  }
}
