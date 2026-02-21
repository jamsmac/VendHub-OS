import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Organization } from "./entities/organization.entity";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
    createdById?: string,
  ): Promise<Organization> {
    const dto = createOrganizationDto as unknown as Partial<Organization>;

    // Generate slug if not provided
    if (!dto.slug && dto.name) {
      dto.slug = await this.generateSlug(dto.name);
    }

    // Check slug uniqueness
    if (dto.slug) {
      const existingBySlug = await this.organizationRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existingBySlug) {
        throw new ConflictException(
          `Organization with slug "${dto.slug}" already exists`,
        );
      }
    }

    // Validate parent exists if specified
    if (dto.parentId) {
      const parent = await this.organizationRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent organization with ID "${dto.parentId}" not found`,
        );
      }
    }

    const organization = this.organizationRepository.create({
      ...dto,
      createdById,
    });
    return this.organizationRepository.save(organization);
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { slug } });
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    updatedById?: string,
  ): Promise<Organization> {
    const organization = await this.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const dto = updateOrganizationDto as Partial<Organization>;

    // Check slug uniqueness if being changed
    if (dto.slug && dto.slug !== organization.slug) {
      const existingBySlug = await this.organizationRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existingBySlug) {
        throw new ConflictException(
          `Organization with slug "${dto.slug}" already exists`,
        );
      }
    }

    // Validate parent if being changed
    if (dto.parentId !== undefined && dto.parentId !== organization.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException("Organization cannot be its own parent");
      }

      if (dto.parentId) {
        const parent = await this.organizationRepository.findOne({
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent organization with ID "${dto.parentId}" not found`,
          );
        }

        // Check for circular reference
        const isDesc = await this.isDescendant(dto.parentId, id);
        if (isDesc) {
          throw new BadRequestException(
            "Cannot create circular parent-child relationship",
          );
        }
      }
    }

    Object.assign(organization, dto, updatedById ? { updatedById } : {});
    return this.organizationRepository.save(organization);
  }

  async remove(id: string): Promise<void> {
    const organization = await this.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Prevent deletion if has children
    const childrenCount = await this.organizationRepository.count({
      where: { parentId: id },
    });
    if (childrenCount > 0) {
      throw new BadRequestException(
        `Cannot delete organization with ${childrenCount} child organization(s). Remove children first.`,
      );
    }

    await this.organizationRepository.softDelete(id);
  }

  // ========================================================================
  // HIERARCHY (ported from VHM24-repo)
  // ========================================================================

  async getHierarchy(rootId?: string): Promise<Organization[]> {
    if (rootId) {
      const root = await this.findById(rootId);
      if (!root) {
        throw new NotFoundException(`Organization with ID ${rootId} not found`);
      }
      return this.getDescendants(root);
    }

    const roots = await this.organizationRepository.find({
      where: { parentId: IsNull() },
      relations: ["children"],
      order: { name: "ASC" },
    });

    for (const root of roots) {
      await this.loadChildrenRecursive(root);
    }

    return roots;
  }

  async getDescendants(organization: Organization): Promise<Organization[]> {
    const descendants: Organization[] = [];
    const children = await this.organizationRepository.find({
      where: { parentId: organization.id },
    });

    for (const child of children) {
      descendants.push(child);
      const childDescendants = await this.getDescendants(child);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  async getAncestorIds(organizationId: string): Promise<string[]> {
    const ancestors: string[] = [];
    let currentOrg = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    while (currentOrg?.parentId) {
      ancestors.push(currentOrg.parentId);
      currentOrg = await this.organizationRepository.findOne({
        where: { id: currentOrg.parentId },
      });
    }

    return ancestors;
  }

  async getAccessibleOrganizationIds(
    userOrganizationId: string,
  ): Promise<string[]> {
    const organization = await this.findById(userOrganizationId);
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${userOrganizationId} not found`,
      );
    }
    const descendants = await this.getDescendants(organization);
    return [userOrganizationId, ...descendants.map((d) => d.id)];
  }

  async generateSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (await this.organizationRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async getStatistics(organizationId: string): Promise<{
    childrenCount: number;
    activeChildrenCount: number;
    totalDescendantsCount: number;
  }> {
    const organization = await this.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    const childrenCount = await this.organizationRepository.count({
      where: { parentId: organizationId },
    });

    const activeChildrenCount = await this.organizationRepository.count({
      where: { parentId: organizationId, isActive: true },
    });

    const descendants = await this.getDescendants(organization);

    return {
      childrenCount,
      activeChildrenCount,
      totalDescendantsCount: descendants.length,
    };
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private async isDescendant(
    potentialDescendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    const ancestors = await this.getAncestorIds(potentialDescendantId);
    return ancestors.includes(ancestorId);
  }

  private async loadChildrenRecursive(
    organization: Organization,
  ): Promise<void> {
    const children = await this.organizationRepository.find({
      where: { parentId: organization.id },
      order: { name: "ASC" },
    });

    organization.children = children;

    for (const child of children) {
      await this.loadChildrenRecursive(child);
    }
  }
}
