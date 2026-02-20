import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<Repository<Organization>>;

  const mockOrganization = {
    id: 'org-uuid-1',
    name: 'VendHub Test Org',
    slug: 'vendhub-test',
    description: 'Test organization',
    isActive: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Organization;

  const mockOrganization2 = {
    id: 'org-uuid-2',
    name: 'Another Org',
    slug: 'another-org',
    description: 'Another organization',
    isActive: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  } as unknown as Organization;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationRepository = module.get(getRepositoryToken(Organization));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE
  // ============================================================================

  describe('create', () => {
    it('should create a new organization', async () => {
      organizationRepository.create.mockReturnValue(mockOrganization);
      organizationRepository.save.mockResolvedValue(mockOrganization);

      const data = { name: 'VendHub Test Org', slug: 'vendhub-test' };
      const result = await service.create(data);

      expect(result).toEqual(mockOrganization);
      expect(organizationRepository.create).toHaveBeenCalledWith(data);
      expect(organizationRepository.save).toHaveBeenCalledWith(mockOrganization);
    });

    it('should pass all partial data to repository.create', async () => {
      const data = { name: 'New Org', slug: 'new-org', description: 'desc' };
      organizationRepository.create.mockReturnValue(mockOrganization);
      organizationRepository.save.mockResolvedValue(mockOrganization);

      await service.create(data);

      expect(organizationRepository.create).toHaveBeenCalledWith(data);
    });
  });

  // ============================================================================
  // FIND ALL
  // ============================================================================

  describe('findAll', () => {
    it('should return all organizations ordered by created_at DESC', async () => {
      organizationRepository.find.mockResolvedValue([mockOrganization, mockOrganization2]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(organizationRepository.find).toHaveBeenCalledWith({
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array when no organizations exist', async () => {
      organizationRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe('findById', () => {
    it('should return organization when found', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findById('org-uuid-1');

      expect(result).toEqual(mockOrganization);
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-uuid-1' },
      });
    });

    it('should return null when organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // FIND BY SLUG
  // ============================================================================

  describe('findBySlug', () => {
    it('should return organization by slug', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findBySlug('vendhub-test');

      expect(result).toEqual(mockOrganization);
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'vendhub-test' },
      });
    });

    it('should return null for non-existent slug', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const result = await service.findBySlug('non-existent-slug');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // UPDATE
  // ============================================================================

  describe('update', () => {
    it('should update organization when found', async () => {
      organizationRepository.findOne.mockResolvedValue({ ...mockOrganization } as any);
      organizationRepository.save.mockResolvedValue({ ...mockOrganization, name: 'Updated Name' } as any);

      const result = await service.update('org-uuid-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(organizationRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should merge partial data into existing organization', async () => {
      const existingOrg = { ...mockOrganization } as any;
      organizationRepository.findOne.mockResolvedValue(existingOrg);
      organizationRepository.save.mockImplementation(async (org) => org as Organization);

      await service.update('org-uuid-1', { description: 'new desc' });

      expect(existingOrg.description).toBe('new desc');
    });
  });

  // ============================================================================
  // REMOVE
  // ============================================================================

  describe('remove', () => {
    it('should soft delete organization when found', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      organizationRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('org-uuid-1');

      expect(organizationRepository.softDelete).toHaveBeenCalledWith('org-uuid-1');
    });

    it('should throw NotFoundException when organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should call findById internally before soft deleting', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      organizationRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('org-uuid-1');

      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-uuid-1' },
      });
    });
  });
});
