import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SystemSetting, SettingCategory } from './entities/system-setting.entity';
import { AiProviderKey, AiProvider } from './entities/ai-provider-key.entity';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockCacheManager = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
});

describe('SettingsService', () => {
  let service: SettingsService;
  let settingRepo: MockRepository<SystemSetting>;
  let aiProviderKeyRepo: MockRepository<AiProviderKey>;
  let cacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(async () => {
    settingRepo = createMockRepository<SystemSetting>();
    aiProviderKeyRepo = createMockRepository<AiProviderKey>();
    cacheManager = createMockCacheManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(SystemSetting), useValue: settingRepo },
        { provide: getRepositoryToken(AiProviderKey), useValue: aiProviderKeyRepo },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // GET SETTING
  // ==========================================================================

  describe('getSetting', () => {
    it('should return cached setting if available', async () => {
      const cached = { id: 's1', key: 'smtp.host', value: 'smtp.example.com' };
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getSetting('smtp.host');

      expect(result).toEqual(cached);
      expect(settingRepo.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      const setting = { id: 's1', key: 'smtp.host', value: 'smtp.example.com' };
      settingRepo.findOne!.mockResolvedValue(setting);

      const result = await service.getSetting('smtp.host');

      expect(result).toEqual(setting);
      expect(settingRepo.findOne).toHaveBeenCalledWith({ where: { key: 'smtp.host' } });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'settings:key:smtp.host',
        setting,
        300_000,
      );
    });

    it('should throw NotFoundException when setting not found', async () => {
      cacheManager.get.mockResolvedValue(null);
      settingRepo.findOne!.mockResolvedValue(null);

      await expect(service.getSetting('non.existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // GET SETTINGS BY CATEGORY
  // ==========================================================================

  describe('getSettingsByCategory', () => {
    it('should return settings for a given category', async () => {
      const settings = [
        { id: 's1', key: 'smtp.host', category: SettingCategory.SMTP },
        { id: 's2', key: 'smtp.port', category: SettingCategory.SMTP },
      ];
      settingRepo.find!.mockResolvedValue(settings);

      const result = await service.getSettingsByCategory(SettingCategory.SMTP);

      expect(settingRepo.find).toHaveBeenCalledWith({
        where: { category: SettingCategory.SMTP },
        order: { key: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by organization when provided', async () => {
      settingRepo.find!.mockResolvedValue([]);

      await service.getSettingsByCategory(SettingCategory.PAYMENT, 'org-1');

      expect(settingRepo.find).toHaveBeenCalledWith({
        where: { category: SettingCategory.PAYMENT, organizationId: 'org-1' },
        order: { key: 'ASC' },
      });
    });
  });

  // ==========================================================================
  // GET ALL SETTINGS
  // ==========================================================================

  describe('getAllSettings', () => {
    it('should return all settings without filters', async () => {
      const settings = [{ id: 's1' }, { id: 's2' }];
      settingRepo.find!.mockResolvedValue(settings);

      const result = await service.getAllSettings();

      expect(settingRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { category: 'ASC', key: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by organization and category when provided', async () => {
      settingRepo.find!.mockResolvedValue([]);

      await service.getAllSettings('org-1', SettingCategory.GENERAL);

      expect(settingRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', category: SettingCategory.GENERAL },
        order: { category: 'ASC', key: 'ASC' },
      });
    });
  });

  // ==========================================================================
  // GET PUBLIC SETTINGS
  // ==========================================================================

  describe('getPublicSettings', () => {
    it('should return cached public settings when available', async () => {
      const cached = [{ id: 's1', isPublic: true }];
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getPublicSettings();

      expect(result).toEqual(cached);
      expect(settingRepo.find).not.toHaveBeenCalled();
    });

    it('should fetch public settings from db and cache them', async () => {
      cacheManager.get.mockResolvedValue(null);
      const settings = [{ id: 's1', isPublic: true }];
      settingRepo.find!.mockResolvedValue(settings);

      const result = await service.getPublicSettings();

      expect(result).toEqual(settings);
      expect(cacheManager.set).toHaveBeenCalledWith('settings:public', settings, 300_000);
    });
  });

  // ==========================================================================
  // CREATE SETTING
  // ==========================================================================

  describe('createSetting', () => {
    it('should create a new setting', async () => {
      settingRepo.findOne!.mockResolvedValue(null);
      const created = { id: 's1', key: 'new.key', value: 'value' };
      settingRepo.create!.mockReturnValue(created);
      settingRepo.save!.mockResolvedValue(created);

      const result = await service.createSetting({
        key: 'new.key',
        value: 'value',
      });

      expect(result).toEqual(created);
      expect(cacheManager.del).toHaveBeenCalledWith('settings:key:new.key');
      expect(cacheManager.del).toHaveBeenCalledWith('settings:public');
    });

    it('should throw ConflictException when key already exists', async () => {
      settingRepo.findOne!.mockResolvedValue({ id: 's1', key: 'existing.key' });

      await expect(service.createSetting({ key: 'existing.key' }))
        .rejects.toThrow(ConflictException);
    });

    it('should use defaults for optional fields', async () => {
      settingRepo.findOne!.mockResolvedValue(null);
      settingRepo.create!.mockReturnValue({});
      settingRepo.save!.mockResolvedValue({});

      await service.createSetting({ key: 'test.key' });

      expect(settingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test.key',
          value: null,
          category: SettingCategory.GENERAL,
          isEncrypted: false,
          isPublic: false,
        }),
      );
    });
  });

  // ==========================================================================
  // UPDATE SETTING
  // ==========================================================================

  describe('updateSetting', () => {
    it('should update setting value', async () => {
      const existing = { id: 's1', key: 'smtp.host', value: 'old.host' };
      cacheManager.get.mockResolvedValue(existing);
      settingRepo.save!.mockResolvedValue({ ...existing, value: 'new.host' });

      const result = await service.updateSetting('smtp.host', { value: 'new.host' });

      expect(result.value).toBe('new.host');
      expect(cacheManager.del).toHaveBeenCalledWith('settings:key:smtp.host');
    });

    it('should update description and isPublic', async () => {
      const existing = { id: 's1', key: 'test', value: 'v', description: 'old', isPublic: false };
      cacheManager.get.mockResolvedValue(existing);
      settingRepo.save!.mockImplementation((e) => Promise.resolve(e));

      await service.updateSetting('test', { description: 'new desc', isPublic: true });

      expect(existing.description).toBe('new desc');
      expect(existing.isPublic).toBe(true);
    });

    it('should throw NotFoundException when setting does not exist', async () => {
      cacheManager.get.mockResolvedValue(null);
      settingRepo.findOne!.mockResolvedValue(null);

      await expect(service.updateSetting('non.existent', { value: 'x' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // DELETE SETTING
  // ==========================================================================

  describe('deleteSetting', () => {
    it('should soft delete a setting and invalidate cache', async () => {
      const existing = { id: 's1', key: 'old.key' };
      cacheManager.get.mockResolvedValue(existing);
      settingRepo.softDelete!.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.deleteSetting('old.key');

      expect(settingRepo.softDelete).toHaveBeenCalledWith('s1');
      expect(cacheManager.del).toHaveBeenCalledWith('settings:key:old.key');
      expect(cacheManager.del).toHaveBeenCalledWith('settings:public');
    });

    it('should throw NotFoundException when setting does not exist', async () => {
      cacheManager.get.mockResolvedValue(null);
      settingRepo.findOne!.mockResolvedValue(null);

      await expect(service.deleteSetting('non.existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // AI PROVIDER KEYS
  // ==========================================================================

  describe('getAiProviderKeys', () => {
    it('should return keys with masked API keys', async () => {
      const keys = [
        { id: 'k1', provider: AiProvider.OPENAI, apiKey: 'sk-1234567890abcdef1234567890abcdef' },
      ];
      aiProviderKeyRepo.find!.mockResolvedValue(keys);

      const result = await service.getAiProviderKeys();

      expect(result[0].apiKey).not.toBe('sk-1234567890abcdef1234567890abcdef');
      expect(result[0].apiKey).toContain('sk-1');
      expect(result[0].apiKey).toContain('****');
    });

    it('should filter by organization when provided', async () => {
      aiProviderKeyRepo.find!.mockResolvedValue([]);

      await service.getAiProviderKeys('org-1');

      expect(aiProviderKeyRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        order: { provider: 'ASC', name: 'ASC' },
      });
    });
  });

  describe('getAiProviderKey', () => {
    it('should return a key with masked API key', async () => {
      const key = { id: 'k1', provider: AiProvider.ANTHROPIC, apiKey: 'sk-ant-1234567890abcdef' };
      aiProviderKeyRepo.findOne!.mockResolvedValue(key);

      const result = await service.getAiProviderKey('k1');

      expect(result.apiKey).toContain('****');
      expect(result.apiKey).not.toBe('sk-ant-1234567890abcdef');
    });

    it('should throw NotFoundException when key not found', async () => {
      aiProviderKeyRepo.findOne!.mockResolvedValue(null);

      await expect(service.getAiProviderKey('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('createAiProviderKey', () => {
    it('should create a new AI provider key', async () => {
      aiProviderKeyRepo.findOne!.mockResolvedValue(null);
      const created = {
        id: 'k1',
        provider: AiProvider.OPENAI,
        name: 'OpenAI Prod',
        apiKey: 'sk-real-key-very-long-string-here',
        isActive: true,
        usageCount: 0,
      };
      aiProviderKeyRepo.create!.mockReturnValue(created);
      aiProviderKeyRepo.save!.mockResolvedValue(created);

      const result = await service.createAiProviderKey({
        provider: AiProvider.OPENAI,
        name: 'OpenAI Prod',
        apiKey: 'sk-real-key-very-long-string-here',
      });

      expect(result.apiKey).toContain('****');
      expect(aiProviderKeyRepo.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when provider+org already exists', async () => {
      aiProviderKeyRepo.findOne!.mockResolvedValue({ id: 'existing' });

      await expect(service.createAiProviderKey({
        provider: AiProvider.OPENAI,
        name: 'Duplicate',
        apiKey: 'sk-test',
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('updateAiProviderKey', () => {
    it('should update key fields and return masked key', async () => {
      const existing = {
        id: 'k1',
        provider: AiProvider.OPENAI,
        name: 'Old Name',
        apiKey: 'sk-original-key-long-enough-to-mask',
        model: 'gpt-4o',
        isActive: true,
      };
      aiProviderKeyRepo.findOne!.mockResolvedValue(existing);
      aiProviderKeyRepo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateAiProviderKey('k1', {
        name: 'New Name',
        model: 'gpt-4o-mini',
      });

      expect(result.name).toBe('New Name');
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.apiKey).toContain('****');
    });

    it('should throw NotFoundException when key not found', async () => {
      aiProviderKeyRepo.findOne!.mockResolvedValue(null);

      await expect(service.updateAiProviderKey('non-existent', { name: 'X' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should update apiKey when provided', async () => {
      const existing = {
        id: 'k1',
        apiKey: 'sk-old-key-long-enough-here-for-masking',
      };
      aiProviderKeyRepo.findOne!.mockResolvedValue(existing);
      aiProviderKeyRepo.save!.mockImplementation((e) => Promise.resolve(e));

      await service.updateAiProviderKey('k1', { apiKey: 'sk-new-key-also-long-enough-for-test' });

      expect(existing.apiKey).toBe('sk-new-key-also-long-enough-for-test');
    });
  });

  describe('deleteAiProviderKey', () => {
    it('should soft delete an AI provider key', async () => {
      const key = { id: 'k1', provider: AiProvider.GOOGLE };
      aiProviderKeyRepo.findOne!.mockResolvedValue(key);
      aiProviderKeyRepo.softDelete!.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.deleteAiProviderKey('k1');

      expect(aiProviderKeyRepo.softDelete).toHaveBeenCalledWith('k1');
    });

    it('should throw NotFoundException when key not found', async () => {
      aiProviderKeyRepo.findOne!.mockResolvedValue(null);

      await expect(service.deleteAiProviderKey('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
