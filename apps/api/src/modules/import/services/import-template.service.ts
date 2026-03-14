/**
 * Import Template Service
 * Template CRUD operations
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";

import { ImportTemplate, ImportType } from "../entities/import.entity";

@Injectable()
export class ImportTemplateService {
  constructor(
    @InjectRepository(ImportTemplate)
    private readonly templateRepository: Repository<ImportTemplate>,
  ) {}

  async createTemplate(
    organizationId: string,
    userId: string,
    data: Partial<ImportTemplate>,
  ): Promise<ImportTemplate> {
    const template = this.templateRepository.create({
      organizationId,
      createdByUserId: userId,
      ...data,
    });

    return this.templateRepository.save(template);
  }

  async getTemplates(
    organizationId: string,
    importType?: ImportType,
  ): Promise<ImportTemplate[]> {
    const where: FindOptionsWhere<ImportTemplate> = {
      organizationId,
      isActive: true,
    };
    if (importType) {
      where.importType = importType;
    }

    return this.templateRepository.find({
      where,
      order: { name: "ASC" },
    });
  }

  async getTemplate(
    organizationId: string,
    id: string,
  ): Promise<ImportTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async deleteTemplate(organizationId: string, id: string): Promise<void> {
    await this.templateRepository.update(
      { id, organizationId },
      { isActive: false },
    );
  }
}
