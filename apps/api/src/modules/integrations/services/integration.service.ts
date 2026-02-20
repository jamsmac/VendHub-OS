import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationTemplate, IntegrationLog } from '../entities/integration.entity';
import {
  IntegrationCategory,
  IntegrationStatus,
  PaymentIntegrationConfig,
} from '../types/integration.types';

@Injectable()
export class IntegrationService {
  constructor(
    @InjectRepository(Integration)
    private integrationRepo: Repository<Integration>,
    @InjectRepository(IntegrationTemplate)
    private templateRepo: Repository<IntegrationTemplate>,
    @InjectRepository(IntegrationLog)
    private logRepo: Repository<IntegrationLog>,
  ) {}

  // ============================================
  // Integration CRUD
  // ============================================

  async findAll(organizationId: string, category?: IntegrationCategory) {
    const query = this.integrationRepo
      .createQueryBuilder('integration')
      .where('integration.organizationId = :organizationId', { organizationId });

    if (category) {
      query.andWhere('integration.category = :category', { category });
    }

    return query.orderBy('integration.priority', 'DESC').getMany();
  }

  async findOne(id: string, organizationId: string) {
    const integration = await this.integrationRepo.findOne({
      where: { id, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return integration;
  }

  async findActivePaymentIntegrations(organizationId: string) {
    return this.integrationRepo.find({
      where: {
        organizationId,
        category: IntegrationCategory.PAYMENT,
        status: IntegrationStatus.ACTIVE,
      },
      order: { priority: 'DESC' },
    });
  }

  async create(
    organizationId: string,
    data: {
      name: string;
      displayName: string;
      category: IntegrationCategory;
      description?: string;
      templateId?: string;
      documentationUrl?: string;
    },
    userId: string,
  ) {
    let config: PaymentIntegrationConfig;

    // If template is provided, copy its config
    if (data.templateId) {
      const template = await this.templateRepo.findOne({
        where: { id: data.templateId },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      config = { ...template.defaultConfig };

      // Increment template usage
      await this.templateRepo.increment({ id: data.templateId }, 'usageCount', 1);
    } else {
      // Create empty config
      config = this.createEmptyConfig(data.name, data.displayName);
    }

    const integration = this.integrationRepo.create({
      organizationId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      category: data.category,
      documentationUrl: data.documentationUrl,
      templateId: data.templateId,
      config,
      status: IntegrationStatus.DRAFT,
      created_by_id: userId,
    });

    return this.integrationRepo.save(integration);
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<Integration>,
    userId: string,
  ) {
    const integration = await this.findOne(id, organizationId);

    Object.assign(integration, {
      ...data,
      updated_by_id: userId,
    });

    return this.integrationRepo.save(integration);
  }

  async updateConfig(
    id: string,
    organizationId: string,
    config: Partial<PaymentIntegrationConfig>,
    userId: string,
  ) {
    const integration = await this.findOne(id, organizationId);

    integration.config = {
      ...integration.config,
      ...config,
    };
    integration.updated_by_id = userId;

    return this.integrationRepo.save(integration);
  }

  async updateCredentials(
    id: string,
    organizationId: string,
    credentials: Record<string, string>,
    isSandbox: boolean,
    userId: string,
  ) {
    const integration = await this.findOne(id, organizationId);

    if (isSandbox) {
      integration.sandboxCredentials = credentials;
    } else {
      integration.credentials = credentials;
    }
    integration.updated_by_id = userId;

    return this.integrationRepo.save(integration);
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: IntegrationStatus,
    userId: string,
  ) {
    const integration = await this.findOne(id, organizationId);

    // Validate status transition
    this.validateStatusTransition(integration.status, status);

    integration.status = status;
    integration.updated_by_id = userId;

    return this.integrationRepo.save(integration);
  }

  async delete(id: string, organizationId: string) {
    const integration = await this.findOne(id, organizationId);
    await this.integrationRepo.remove(integration);
  }

  async toggleSandboxMode(id: string, organizationId: string, sandboxMode: boolean, userId: string) {
    const integration = await this.findOne(id, organizationId);
    integration.sandboxMode = sandboxMode;
    integration.updated_by_id = userId;
    return this.integrationRepo.save(integration);
  }

  // ============================================
  // Templates
  // ============================================

  async findAllTemplates(category?: IntegrationCategory, country?: string) {
    const query = this.templateRepo
      .createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true });

    if (category) {
      query.andWhere('template.category = :category', { category });
    }

    if (country) {
      query.andWhere('template.country = :country', { country });
    }

    return query.orderBy('template.usageCount', 'DESC').getMany();
  }

  async findTemplate(id: string) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async createTemplate(data: Partial<IntegrationTemplate>) {
    const template = this.templateRepo.create(data);
    return this.templateRepo.save(template);
  }

  // ============================================
  // Logs
  // ============================================

  async getLogs(
    integrationId: string,
    organizationId: string,
    options: { limit?: number; offset?: number; success?: boolean },
  ) {
    const query = this.logRepo
      .createQueryBuilder('log')
      .where('log.integrationId = :integrationId', { integrationId })
      .andWhere('log.organizationId = :organizationId', { organizationId });

    if (options.success !== undefined) {
      query.andWhere('log.success = :success', { success: options.success });
    }

    return query
      .orderBy('log.createdAt', 'DESC')
      .take(options.limit || 50)
      .skip(options.offset || 0)
      .getMany();
  }

  async createLog(data: Partial<IntegrationLog>) {
    const log = this.logRepo.create(data);
    return this.logRepo.save(log);
  }

  // ============================================
  // Statistics
  // ============================================

  async getStatistics(integrationId: string, organizationId: string) {
    const integration = await this.findOne(integrationId, organizationId);

    const [totalRequests, successfulRequests, avgDuration] = await Promise.all([
      this.logRepo.count({ where: { integrationId } }),
      this.logRepo.count({ where: { integrationId, success: true } }),
      this.logRepo
        .createQueryBuilder('log')
        .where('log.integrationId = :integrationId', { integrationId })
        .select('AVG(log.duration)', 'avg')
        .getRawOne(),
    ]);

    return {
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      avgDuration: avgDuration?.avg || 0,
      lastUsedAt: integration.lastUsedAt,
      lastTestedAt: integration.lastTestedAt,
    };
  }

  // ============================================
  // Helpers
  // ============================================

  private createEmptyConfig(name: string, displayName: string): PaymentIntegrationConfig {
    return {
      name,
      displayName,
      sandboxMode: true,
      baseUrl: '',
      auth: {
        type: 'api_key' as any,
        config: {
          keyName: 'Authorization',
          keyLocation: 'header' as any,
        },
      },
      credentials: [],
      supportedCurrencies: ['UZS'],
      supportedMethods: [],
      endpoints: {
        createPayment: {
          id: 'create_payment',
          name: 'Create Payment',
          description: 'Create a new payment',
          method: 'POST' as any,
          path: '/payments',
        },
        checkStatus: {
          id: 'check_status',
          name: 'Check Status',
          description: 'Check payment status',
          method: 'GET' as any,
          path: '/payments/{id}',
        },
      },
    };
  }

  private validateStatusTransition(currentStatus: IntegrationStatus, newStatus: IntegrationStatus) {
    const validTransitions: Record<IntegrationStatus, IntegrationStatus[]> = {
      [IntegrationStatus.DRAFT]: [IntegrationStatus.CONFIGURING, IntegrationStatus.TESTING],
      [IntegrationStatus.CONFIGURING]: [IntegrationStatus.DRAFT, IntegrationStatus.TESTING, IntegrationStatus.ERROR],
      [IntegrationStatus.TESTING]: [IntegrationStatus.ACTIVE, IntegrationStatus.DRAFT, IntegrationStatus.ERROR],
      [IntegrationStatus.ACTIVE]: [IntegrationStatus.PAUSED, IntegrationStatus.ERROR, IntegrationStatus.DEPRECATED],
      [IntegrationStatus.PAUSED]: [IntegrationStatus.ACTIVE, IntegrationStatus.DEPRECATED],
      [IntegrationStatus.ERROR]: [IntegrationStatus.DRAFT, IntegrationStatus.CONFIGURING, IntegrationStatus.TESTING],
      [IntegrationStatus.DEPRECATED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
