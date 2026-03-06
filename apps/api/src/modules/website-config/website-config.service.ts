/**
 * Website Config Service
 *
 * Manages website configuration settings organized by section.
 * CRUD operations with multi-tenant filtering.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import {
  WebsiteConfig,
  WebsiteConfigSection,
} from "./entities/website-config.entity";
import {
  CreateWebsiteConfigDto,
  UpdateWebsiteConfigDto,
  BulkUpdateWebsiteConfigDto,
} from "./dto/website-config.dto";

@Injectable()
export class WebsiteConfigService {
  private readonly logger = new Logger(WebsiteConfigService.name);

  constructor(
    @InjectRepository(WebsiteConfig)
    private readonly configRepository: Repository<WebsiteConfig>,
  ) {}

  /**
   * Get all website configs for an organization
   */
  async getAll(organizationId: string): Promise<WebsiteConfig[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    return this.configRepository.find({
      where: { organizationId, deletedAt: IsNull() },
      order: { section: "ASC", key: "ASC" },
    });
  }

  /**
   * Get configs by section for an organization
   */
  async getBySection(
    organizationId: string,
    section: WebsiteConfigSection,
  ): Promise<WebsiteConfig[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    return this.configRepository.find({
      where: { organizationId, section, deletedAt: IsNull() },
      order: { key: "ASC" },
    });
  }

  /**
   * Get a single config by organization and key
   */
  async getByKey(organizationId: string, key: string): Promise<WebsiteConfig> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const config = await this.configRepository.findOne({
      where: { organizationId, key, deletedAt: IsNull() },
    });

    if (!config) {
      throw new NotFoundException(`Website config with key "${key}" not found`);
    }

    return config;
  }

  /**
   * Create a new config
   */
  async create(
    organizationId: string,
    dto: CreateWebsiteConfigDto,
    updatedBy: string,
  ): Promise<WebsiteConfig> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    // Check if key already exists
    const existing = await this.configRepository.findOne({
      where: { organizationId, key: dto.key, deletedAt: IsNull() },
    });

    if (existing) {
      throw new BadRequestException(
        `Config key "${dto.key}" already exists for this organization`,
      );
    }

    const config = this.configRepository.create({
      organizationId,
      ...dto,
      section: dto.section || WebsiteConfigSection.GENERAL,
      updatedBy,
    });

    return this.configRepository.save(config);
  }

  /**
   * Update a config by key
   */
  async updateByKey(
    organizationId: string,
    key: string,
    dto: UpdateWebsiteConfigDto,
    updatedBy: string,
  ): Promise<WebsiteConfig> {
    const config = await this.getByKey(organizationId, key);

    Object.assign(config, {
      ...dto,
      updatedBy,
    });

    return this.configRepository.save(config);
  }

  /**
   * Bulk update configs (upsert)
   */
  async bulkUpdate(
    organizationId: string,
    configs: BulkUpdateWebsiteConfigDto[],
    updatedBy: string,
  ): Promise<WebsiteConfig[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const results: WebsiteConfig[] = [];

    for (const dto of configs) {
      let config = await this.configRepository.findOne({
        where: { organizationId, key: dto.key, deletedAt: IsNull() },
      });

      if (!config) {
        config = this.configRepository.create({
          organizationId,
          key: dto.key,
          value: dto.value,
          section: dto.section || WebsiteConfigSection.GENERAL,
          updatedBy,
        });
      } else {
        config.value = dto.value;
        if (dto.section) {
          config.section = dto.section;
        }
        config.updatedBy = updatedBy;
      }

      results.push(await this.configRepository.save(config));
    }

    return results;
  }

  /**
   * Delete a config (soft delete)
   */
  async deleteByKey(organizationId: string, key: string): Promise<void> {
    const config = await this.getByKey(organizationId, key);
    await this.configRepository.softRemove(config);
    this.logger.log(
      `Website config "${key}" soft deleted for organization ${organizationId}`,
    );
  }
}
