/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  EntityCustomTab,
  EntityCustomField,
} from "./entities/custom-field.entity";
import {
  CreateCustomTabDto,
  UpdateCustomTabDto,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from "./dto/custom-field.dto";

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(EntityCustomTab)
    private readonly tabRepo: Repository<EntityCustomTab>,
    @InjectRepository(EntityCustomField)
    private readonly fieldRepo: Repository<EntityCustomField>,
  ) {}

  // ========================================================================
  // TABS
  // ========================================================================

  async getTabs(
    organizationId: string,
    entityType?: string,
  ): Promise<EntityCustomTab[]> {
    const where: any = { organizationId, isActive: true };
    if (entityType) where.entityType = entityType;
    return this.tabRepo.find({ where, order: { sortOrder: "ASC" } });
  }

  async createTab(
    organizationId: string,
    dto: CreateCustomTabDto,
  ): Promise<EntityCustomTab> {
    const existing = await this.tabRepo.findOne({
      where: {
        organizationId,
        entityType: dto.entityType,
        tabName: dto.tabName,
      },
    });
    if (existing)
      throw new ConflictException("Tab with this name already exists");

    return this.tabRepo.save(this.tabRepo.create({ ...dto, organizationId }));
  }

  async updateTab(
    id: string,
    organizationId: string,
    dto: UpdateCustomTabDto,
  ): Promise<EntityCustomTab> {
    const tab = await this.tabRepo.findOne({ where: { id, organizationId } });
    if (!tab) throw new NotFoundException("Tab not found");
    Object.assign(tab, dto);
    return this.tabRepo.save(tab);
  }

  async deleteTab(id: string, organizationId: string): Promise<void> {
    const tab = await this.tabRepo.findOne({ where: { id, organizationId } });
    if (!tab) throw new NotFoundException("Tab not found");
    await this.tabRepo.softDelete(id);
    // Also deactivate fields on this tab
    await this.fieldRepo.update(
      { organizationId, entityType: tab.entityType, tabName: tab.tabName },
      { isActive: false },
    );
  }

  // ========================================================================
  // FIELDS
  // ========================================================================

  async getFields(
    organizationId: string,
    entityType: string,
    tabName?: string,
  ): Promise<EntityCustomField[]> {
    const where: any = { organizationId, entityType, isActive: true };
    if (tabName) where.tabName = tabName;
    return this.fieldRepo.find({ where, order: { sortOrder: "ASC" } });
  }

  async createField(
    organizationId: string,
    dto: CreateCustomFieldDto,
  ): Promise<EntityCustomField> {
    const existing = await this.fieldRepo.findOne({
      where: {
        organizationId,
        entityType: dto.entityType,
        fieldKey: dto.fieldKey,
      },
    });
    if (existing)
      throw new ConflictException(
        `Field key "${dto.fieldKey}" already exists for this entity type`,
      );

    return this.fieldRepo.save(
      this.fieldRepo.create({ ...dto, organizationId }),
    );
  }

  async updateField(
    id: string,
    organizationId: string,
    dto: UpdateCustomFieldDto,
  ): Promise<EntityCustomField> {
    const field = await this.fieldRepo.findOne({
      where: { id, organizationId },
    });
    if (!field) throw new NotFoundException("Field not found");
    Object.assign(field, dto);
    return this.fieldRepo.save(field);
  }

  async deleteField(id: string, organizationId: string): Promise<void> {
    const field = await this.fieldRepo.findOne({
      where: { id, organizationId },
    });
    if (!field) throw new NotFoundException("Field not found");
    await this.fieldRepo.softDelete(id);
  }

  // ========================================================================
  // FIELD VALUES (read/write from entity metadata)
  // ========================================================================

  /**
   * Get custom field values for a specific entity.
   * Values are stored in the entity's metadata JSONB under "customFields" key.
   */
  async getFieldValues(
    organizationId: string,
    entityType: string,
    metadata: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const fields = await this.getFields(organizationId, entityType);
    const customValues =
      (metadata?.customFields as Record<string, unknown>) || {};

    const result: Record<string, unknown> = {};
    for (const field of fields) {
      result[field.fieldKey] =
        customValues[field.fieldKey] ?? field.defaultValue ?? null;
    }
    return result;
  }

  /**
   * Validate and merge custom field values into entity metadata.
   * Returns the updated metadata object.
   */
  mergeFieldValues(
    currentMetadata: Record<string, unknown>,
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    const customFields = {
      ...((currentMetadata?.customFields as Record<string, unknown>) || {}),
      ...values,
    };
    return { ...currentMetadata, customFields };
  }
}
