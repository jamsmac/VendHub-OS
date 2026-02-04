/**
 * Settings Service
 *
 * Manages system-wide and per-organization configuration settings,
 * as well as AI provider API keys.
 *
 * - CRUD for SystemSetting (key-value config store)
 * - CRUD for AiProviderKey (AI provider credentials)
 * - Public settings endpoint for unauthenticated access
 * - Multi-tenant filtering by organizationId
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository, IsNull } from 'typeorm';
import { SystemSetting, SettingCategory } from './entities/system-setting.entity';
import { AiProviderKey } from './entities/ai-provider-key.entity';
import {
  CreateSettingDto,
  UpdateSettingDto,
  CreateAiProviderKeyDto,
  UpdateAiProviderKeyDto,
} from './dto/settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  /** Cache TTL for settings: 5 minutes (settings rarely change) */
  private readonly CACHE_TTL = 300_000;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,

    @InjectRepository(AiProviderKey)
    private readonly aiProviderKeyRepository: Repository<AiProviderKey>,
  ) {}

  // ============================================================================
  // SYSTEM SETTINGS
  // ============================================================================

  /**
   * Get a single setting by its unique key (cached for 5 minutes).
   */
  async getSetting(key: string): Promise<SystemSetting> {
    const cacheKey = `settings:key:${key}`;
    const cached = await this.cacheManager.get<SystemSetting>(cacheKey);
    if (cached) return cached;

    const setting = await this.settingRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }

    await this.cacheManager.set(cacheKey, setting, this.CACHE_TTL);
    return setting;
  }

  /**
   * Get all settings for a given category, optionally filtered by organization.
   */
  async getSettingsByCategory(
    category: SettingCategory,
    organizationId?: string,
  ): Promise<SystemSetting[]> {
    const where: any = { category };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.settingRepository.find({
      where,
      order: { key: 'ASC' },
    });
  }

  /**
   * Get all settings, optionally filtered by organization and/or category.
   */
  async getAllSettings(
    organizationId?: string,
    category?: SettingCategory,
  ): Promise<SystemSetting[]> {
    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (category) {
      where.category = category;
    }

    return this.settingRepository.find({
      where,
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  /**
   * Get only public settings (accessible without authentication, cached for 5 minutes).
   */
  async getPublicSettings(): Promise<SystemSetting[]> {
    const cacheKey = 'settings:public';
    const cached = await this.cacheManager.get<SystemSetting[]>(cacheKey);
    if (cached) return cached;

    const settings = await this.settingRepository.find({
      where: { isPublic: true },
      order: { category: 'ASC', key: 'ASC' },
    });

    await this.cacheManager.set(cacheKey, settings, this.CACHE_TTL);
    return settings;
  }

  /**
   * Create a new setting. Throws ConflictException if key already exists.
   */
  async createSetting(dto: CreateSettingDto): Promise<SystemSetting> {
    // Check for duplicate key
    const existing = await this.settingRepository.findOne({
      where: { key: dto.key },
    });

    if (existing) {
      throw new ConflictException(`Setting with key "${dto.key}" already exists`);
    }

    const setting = this.settingRepository.create({
      key: dto.key,
      value: dto.value ?? null,
      category: dto.category ?? SettingCategory.GENERAL,
      description: (dto.description ?? null) as string,
      isEncrypted: dto.isEncrypted ?? false,
      isPublic: dto.isPublic ?? false,
      organizationId: (dto.organizationId ?? null) as string,
    } as Partial<SystemSetting>);

    const saved = await this.settingRepository.save(setting);
    this.logger.log(`Setting created: ${dto.key}`);
    await this.invalidateSettingsCache(dto.key);
    return saved;
  }

  /**
   * Update an existing setting by key.
   */
  async updateSetting(key: string, dto: UpdateSettingDto): Promise<SystemSetting> {
    const setting = await this.getSetting(key);

    if (dto.value !== undefined) {
      setting.value = dto.value;
    }
    if (dto.description !== undefined) {
      setting.description = dto.description;
    }
    if (dto.isEncrypted !== undefined) {
      setting.isEncrypted = dto.isEncrypted;
    }
    if (dto.isPublic !== undefined) {
      setting.isPublic = dto.isPublic;
    }

    const saved = await this.settingRepository.save(setting);
    this.logger.log(`Setting updated: ${key}`);
    await this.invalidateSettingsCache(key);
    return saved;
  }

  /**
   * Soft-delete a setting by key.
   */
  async deleteSetting(key: string): Promise<void> {
    const setting = await this.getSetting(key);
    await this.settingRepository.softDelete(setting.id);
    this.logger.log(`Setting deleted: ${key}`);
    await this.invalidateSettingsCache(key);
  }

  /**
   * Invalidate setting caches after mutation.
   */
  private async invalidateSettingsCache(key: string): Promise<void> {
    await this.cacheManager.del(`settings:key:${key}`);
    await this.cacheManager.del('settings:public');
  }

  // ============================================================================
  // AI PROVIDER KEYS
  // ============================================================================

  /**
   * Get all AI provider keys, optionally filtered by organization.
   * API keys are masked in the response for security.
   */
  async getAiProviderKeys(organizationId?: string): Promise<AiProviderKey[]> {
    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const keys = await this.aiProviderKeyRepository.find({
      where,
      order: { provider: 'ASC', name: 'ASC' },
    });

    // Mask API keys in list responses
    return keys.map((key) => ({
      ...key,
      apiKey: this.maskApiKey(key.apiKey),
    })) as AiProviderKey[];
  }

  /**
   * Get a single AI provider key by ID.
   * API key is masked in the response.
   */
  async getAiProviderKey(id: string): Promise<AiProviderKey> {
    const providerKey = await this.aiProviderKeyRepository.findOne({
      where: { id },
    });

    if (!providerKey) {
      throw new NotFoundException(`AI provider key with id "${id}" not found`);
    }

    // Mask API key in response
    return {
      ...providerKey,
      apiKey: this.maskApiKey(providerKey.apiKey),
    } as AiProviderKey;
  }

  /**
   * Create a new AI provider key.
   * Throws ConflictException if provider+org combination already exists.
   */
  async createAiProviderKey(dto: CreateAiProviderKeyDto): Promise<AiProviderKey> {
    // Check for duplicate provider per organization
    const existing = await this.aiProviderKeyRepository.findOne({
      where: {
        provider: dto.provider,
        organizationId: dto.organizationId ?? IsNull(),
      },
    });

    if (existing) {
      throw new ConflictException(
        `AI provider key for "${dto.provider}" already exists for this organization`,
      );
    }

    const providerKey = this.aiProviderKeyRepository.create({
      provider: dto.provider,
      name: dto.name,
      apiKey: dto.apiKey,
      model: (dto.model ?? null) as string,
      baseUrl: (dto.baseUrl ?? null) as string,
      organizationId: (dto.organizationId ?? null) as string,
      config: dto.config ?? {},
      isActive: true,
      usageCount: 0,
    } as Partial<AiProviderKey>);

    const saved = await this.aiProviderKeyRepository.save(providerKey);
    this.logger.log(`AI provider key created: ${dto.provider} - ${dto.name}`);

    // Return with masked key
    return {
      ...saved,
      apiKey: this.maskApiKey(saved.apiKey),
    } as AiProviderKey;
  }

  /**
   * Update an existing AI provider key.
   */
  async updateAiProviderKey(
    id: string,
    dto: UpdateAiProviderKeyDto,
  ): Promise<AiProviderKey> {
    const providerKey = await this.aiProviderKeyRepository.findOne({
      where: { id },
    });

    if (!providerKey) {
      throw new NotFoundException(`AI provider key with id "${id}" not found`);
    }

    if (dto.name !== undefined) {
      providerKey.name = dto.name;
    }
    if (dto.apiKey !== undefined) {
      providerKey.apiKey = dto.apiKey;
    }
    if (dto.model !== undefined) {
      providerKey.model = dto.model;
    }
    if (dto.baseUrl !== undefined) {
      providerKey.baseUrl = dto.baseUrl;
    }
    if (dto.isActive !== undefined) {
      providerKey.isActive = dto.isActive;
    }
    if (dto.config !== undefined) {
      providerKey.config = dto.config;
    }

    const saved = await this.aiProviderKeyRepository.save(providerKey);
    this.logger.log(`AI provider key updated: ${id}`);

    // Return with masked key
    return {
      ...saved,
      apiKey: this.maskApiKey(saved.apiKey),
    } as AiProviderKey;
  }

  /**
   * Soft-delete an AI provider key.
   */
  async deleteAiProviderKey(id: string): Promise<void> {
    const providerKey = await this.aiProviderKeyRepository.findOne({
      where: { id },
    });

    if (!providerKey) {
      throw new NotFoundException(`AI provider key with id "${id}" not found`);
    }

    await this.aiProviderKeyRepository.softDelete(id);
    this.logger.log(`AI provider key deleted: ${id} (${providerKey.provider})`);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Mask an API key for safe display.
   * Shows first 4 and last 4 characters, replaces middle with asterisks.
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length <= 8) {
      return '****';
    }
    return `${apiKey.substring(0, 4)}${'*'.repeat(Math.min(apiKey.length - 8, 20))}${apiKey.substring(apiKey.length - 4)}`;
  }
}
