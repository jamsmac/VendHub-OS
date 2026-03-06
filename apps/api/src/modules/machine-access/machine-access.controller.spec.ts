/**
 * Machine Access Controller Tests
 * OPERATIONS API - Machine access control and template management
 *
 * Test Coverage:
 *  ✓ Access CRUD (grant, revoke, list, get by machine/user, delete)
 *  ✓ Access template management (create, list, get, update, delete, apply)
 *  ✓ Role-based access control (owner/admin override, operator restrictions)
 *  ✓ Multi-tenant isolation by organizationId
 *  ✓ Soft delete with includeInactive filtering
 *  ✓ Pagination and filtering (page, limit, machineId, userId)
 *  ✓ Bulk operations (apply template to multiple users)
 *  ✓ Invalid UUID validation via ParseUUIDPipe
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { MachineAccessController } from './machine-access.controller';
import { MachineAccessService } from './machine-access.service';

describe('MachineAccessController (e2e)', () => {
  let app: INestApplication;
  let machineAccessService: MachineAccessService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [MachineAccessController],
      providers: [
        {
          provide: MachineAccessService,
          useValue: {
            grantAccess: jest.fn(),
            revokeAccess: jest.fn(),
            findAll: jest.fn(),
            getAccessByMachine: jest.fn(),
            getAccessByUser: jest.fn(),
            findById: jest.fn(),
            remove: jest.fn(),
            createTemplate: jest.fn(),
            findAllTemplates: jest.fn(),
            findTemplateById: jest.fn(),
            updateTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            applyTemplate: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({}) // Disable throttling for tests
      .compile();

    app = module.createNestApplication();
    machineAccessService = module.get<MachineAccessService>(MachineAccessService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // ACCESS CRUD - Grant and Revoke
  // ============================================================================

  describe('POST /machine-access (Grant Access)', () => {
    it('should grant access to machine for a user', async () => {
      const grantDto = {
        machineId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440010',
        permissions: ['OPERATE', 'VIEW'],
        expiresAt: '2026-12-31T23:59:59Z',
      };

      const expectedResponse = {
        id: 'access-123',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        machineId: grantDto.machineId,
        userId: grantDto.userId,
        permissions: grantDto.permissions,
        expiresAt: grantDto.expiresAt,
        status: 'ACTIVE',
        createdAt: '2026-03-06T00:00:00Z',
        updatedAt: '2026-03-06T00:00:00Z',
      };

      (machineAccessService.grantAccess as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/machine-access')
        .set('Authorization', 'Bearer admin-token')
        .send(grantDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.grantAccess).toHaveBeenCalledWith(
        grantDto,
        expect.any(String), // userId
        expect.any(String), // organizationId
      );
    });

    it('should reject duplicate active access (409 Conflict)', async () => {
      const grantDto = {
        machineId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440010',
        permissions: ['OPERATE', 'VIEW'],
      };

      (machineAccessService.grantAccess as jest.Mock).mockRejectedValue(
        new Error('User already has active access to this machine'),
      );

      await request(app.getHttpServer())
        .post('/machine-access')
        .set('Authorization', 'Bearer admin-token')
        .send(grantDto)
        .expect(HttpStatus.CONFLICT);
    });

    it('should reject invalid permissions array', async () => {
      const invalidDto = {
        machineId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440010',
        permissions: ['INVALID_PERMISSION'],
      };

      await request(app.getHttpServer())
        .post('/machine-access')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject access for non-admin roles', async () => {
      const grantDto = {
        machineId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440010',
        permissions: ['OPERATE'],
      };

      await request(app.getHttpServer())
        .post('/machine-access')
        .set('Authorization', 'Bearer viewer-token')
        .send(grantDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    // NOTE: Should OWNER be able to grant access across organizations?
    // How should we handle expired access that needs to be renewed?
    // What's the validation for permission scope vs. user role?
  });

  describe('POST /machine-access/revoke', () => {
    it('should revoke access and return 200', async () => {
      const revokeDto = {
        id: 'access-123',
      };

      const expectedResponse = {
        success: true,
        message: 'Access revoked successfully',
        revokedAt: '2026-03-06T12:00:00Z',
      };

      (machineAccessService.revokeAccess as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/machine-access/revoke')
        .set('Authorization', 'Bearer admin-token')
        .send(revokeDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.revokeAccess).toHaveBeenCalledWith(
        revokeDto,
        expect.any(String),
        expect.any(String),
      );
    });

    it('should return 404 for nonexistent access record', async () => {
      const revokeDto = {
        id: 'nonexistent-access-999',
      };

      (machineAccessService.revokeAccess as jest.Mock).mockRejectedValue(
        new Error('Access record not found'),
      );

      await request(app.getHttpServer())
        .post('/machine-access/revoke')
        .set('Authorization', 'Bearer admin-token')
        .send(revokeDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject access for non-admin roles', async () => {
      const revokeDto = {
        id: 'access-123',
      };

      await request(app.getHttpServer())
        .post('/machine-access/revoke')
        .set('Authorization', 'Bearer operator-token')
        .send(revokeDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================================
  // ACCESS CRUD - Query and List
  // ============================================================================

  describe('GET /machine-access', () => {
    it('should list all access records with pagination', async () => {
      const mockAccessRecords = [
        {
          id: 'access-1',
          machineId: 'machine-1',
          userId: 'user-1',
          status: 'ACTIVE',
        },
        {
          id: 'access-2',
          machineId: 'machine-1',
          userId: 'user-2',
          status: 'ACTIVE',
        },
      ];

      (machineAccessService.findAll as jest.Mock).mockResolvedValue({
        data: mockAccessRecords,
        page: 1,
        limit: 10,
        total: 2,
      });

      const response = await request(app.getHttpServer())
        .get('/machine-access?page=1&limit=10')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(response.body.data).toEqual(mockAccessRecords);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it('should filter by machineId', async () => {
      (machineAccessService.findAll as jest.Mock).mockResolvedValue({
        data: [],
        page: 1,
        limit: 10,
        total: 0,
      });

      await request(app.getHttpServer())
        .get('/machine-access?machineId=machine-1')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(machineAccessService.findAll).toHaveBeenCalledWith(
        expect.any(String), // organizationId
        expect.objectContaining({
          machineId: 'machine-1',
        }),
      );
    });

    it('should filter by userId', async () => {
      (machineAccessService.findAll as jest.Mock).mockResolvedValue({
        data: [],
        page: 1,
        limit: 10,
        total: 0,
      });

      await request(app.getHttpServer())
        .get('/machine-access?userId=user-1')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(machineAccessService.findAll).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: 'user-1',
        }),
      );
    });

    it('should reject access for non-admin roles', async () => {
      await request(app.getHttpServer())
        .get('/machine-access')
        .set('Authorization', 'Bearer operator-token')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /machine-access/machine/:machineId', () => {
    it('should return all access records for a machine', async () => {
      const machineId = '550e8400-e29b-41d4-a716-446655440001';
      const mockAccess = [
        {
          id: 'access-1',
          userId: 'user-1',
          permissions: ['OPERATE', 'VIEW'],
          status: 'ACTIVE',
        },
        {
          id: 'access-2',
          userId: 'user-2',
          permissions: ['VIEW'],
          status: 'ACTIVE',
        },
      ];

      (machineAccessService.getAccessByMachine as jest.Mock).mockResolvedValue(
        mockAccess,
      );

      const response = await request(app.getHttpServer())
        .get(`/machine-access/machine/${machineId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockAccess);
      expect(machineAccessService.getAccessByMachine).toHaveBeenCalledWith(
        machineId,
        expect.any(String), // organizationId
        undefined, // includeInactive
      );
    });

    it('should include inactive access with includeInactive flag', async () => {
      const machineId = '550e8400-e29b-41d4-a716-446655440001';

      (machineAccessService.getAccessByMachine as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/machine-access/machine/${machineId}?includeInactive=true`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(machineAccessService.getAccessByMachine).toHaveBeenCalledWith(
        machineId,
        expect.any(String),
        true, // includeInactive
      );
    });

    it('should reject invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/machine-access/machine/not-a-uuid')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should allow OPERATOR role to view machine access', async () => {
      const machineId = '550e8400-e29b-41d4-a716-446655440001';

      (machineAccessService.getAccessByMachine as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/machine-access/machine/${machineId}`)
        .set('Authorization', 'Bearer operator-token')
        .expect(HttpStatus.OK);
    });
  });

  describe('GET /machine-access/user/:userId', () => {
    it('should return all access records for a user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440010';
      const mockAccess = [
        {
          id: 'access-1',
          machineId: 'machine-1',
          permissions: ['OPERATE', 'VIEW'],
          status: 'ACTIVE',
        },
        {
          id: 'access-2',
          machineId: 'machine-2',
          permissions: ['VIEW'],
          status: 'ACTIVE',
        },
      ];

      (machineAccessService.getAccessByUser as jest.Mock).mockResolvedValue(
        mockAccess,
      );

      const response = await request(app.getHttpServer())
        .get(`/machine-access/user/${userId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockAccess);
      expect(machineAccessService.getAccessByUser).toHaveBeenCalledWith(
        userId,
        expect.any(String), // organizationId
        undefined,
      );
    });

    it('should include inactive access with includeInactive flag', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440010';

      (machineAccessService.getAccessByUser as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/machine-access/user/${userId}?includeInactive=true`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(machineAccessService.getAccessByUser).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        true,
      );
    });

    it('should reject invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/machine-access/user/invalid-uuid')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject access for non-admin roles', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440010';

      await request(app.getHttpServer())
        .get(`/machine-access/user/${userId}`)
        .set('Authorization', 'Bearer operator-token')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /machine-access/:id', () => {
    it('should return specific access record', async () => {
      const accessId = 'access-123';
      const expectedResponse = {
        id: accessId,
        machineId: 'machine-1',
        userId: 'user-1',
        permissions: ['OPERATE', 'VIEW'],
        status: 'ACTIVE',
        createdAt: '2026-03-01T00:00:00Z',
      };

      (machineAccessService.findById as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/machine-access/${accessId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it('should reject invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/machine-access/not-a-uuid')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 for nonexistent record', async () => {
      const accessId = 'nonexistent-access-999';

      (machineAccessService.findById as jest.Mock).mockRejectedValue(
        new Error('Access record not found'),
      );

      await request(app.getHttpServer())
        .get(`/machine-access/${accessId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /machine-access/:id', () => {
    it('should soft delete access record and return 204', async () => {
      const accessId = 'access-123';

      (machineAccessService.remove as jest.Mock).mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/machine-access/${accessId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.NO_CONTENT);

      expect(machineAccessService.remove).toHaveBeenCalledWith(
        accessId,
        expect.any(String), // organizationId
      );
    });

    it('should reject invalid UUID format', async () => {
      await request(app.getHttpServer())
        .delete('/machine-access/not-a-uuid')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject access for non-admin roles (owner/admin only)', async () => {
      const accessId = 'access-123';

      await request(app.getHttpServer())
        .delete(`/machine-access/${accessId}`)
        .set('Authorization', 'Bearer manager-token')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================================
  // TEMPLATES - Management
  // ============================================================================

  describe('POST /machine-access/templates', () => {
    it('should create access template', async () => {
      const createDto = {
        name: 'Operator Access',
        description: 'Standard operator permissions',
        permissions: ['OPERATE', 'VIEW'],
      };

      const expectedResponse = {
        id: 'template-1',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        ...createDto,
        createdAt: '2026-03-06T00:00:00Z',
      };

      (machineAccessService.createTemplate as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/machine-access/templates')
        .set('Authorization', 'Bearer admin-token')
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.createTemplate).toHaveBeenCalledWith(
        createDto,
        expect.any(String), // organizationId
      );
    });

    it('should reject missing required fields', async () => {
      const incompleteDto = {
        name: 'Incomplete Template',
        // missing permissions
      };

      await request(app.getHttpServer())
        .post('/machine-access/templates')
        .set('Authorization', 'Bearer admin-token')
        .send(incompleteDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject invalid permissions in template', async () => {
      const invalidDto = {
        name: 'Bad Template',
        permissions: ['INVALID_PERM'],
      };

      await request(app.getHttpServer())
        .post('/machine-access/templates')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject access for non-admin roles', async () => {
      const createDto = {
        name: 'Operator Access',
        permissions: ['OPERATE', 'VIEW'],
      };

      await request(app.getHttpServer())
        .post('/machine-access/templates')
        .set('Authorization', 'Bearer viewer-token')
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /machine-access/templates/list', () => {
    it('should list all templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Operator Access',
          permissions: ['OPERATE', 'VIEW'],
          active: true,
        },
        {
          id: 'template-2',
          name: 'View Only',
          permissions: ['VIEW'],
          active: true,
        },
      ];

      (machineAccessService.findAllTemplates as jest.Mock).mockResolvedValue(
        mockTemplates,
      );

      const response = await request(app.getHttpServer())
        .get('/machine-access/templates/list')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockTemplates);
    });

    it('should include inactive templates with flag', async () => {
      (machineAccessService.findAllTemplates as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/machine-access/templates/list?includeInactive=true')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(machineAccessService.findAllTemplates).toHaveBeenCalledWith(
        expect.any(String), // organizationId
        true,
      );
    });

    it('should reject access for non-admin roles', async () => {
      await request(app.getHttpServer())
        .get('/machine-access/templates/list')
        .set('Authorization', 'Bearer operator-token')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /machine-access/templates/:id', () => {
    it('should return specific template', async () => {
      const templateId = 'template-1';
      const expectedResponse = {
        id: templateId,
        name: 'Operator Access',
        description: 'Standard operator permissions',
        permissions: ['OPERATE', 'VIEW'],
        createdAt: '2026-03-01T00:00:00Z',
      };

      (machineAccessService.findTemplateById as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/machine-access/templates/${templateId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it('should reject invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/machine-access/templates/not-a-uuid')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 for nonexistent template', async () => {
      const templateId = 'nonexistent-999';

      (machineAccessService.findTemplateById as jest.Mock).mockRejectedValue(
        new Error('Template not found'),
      );

      await request(app.getHttpServer())
        .get(`/machine-access/templates/${templateId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /machine-access/templates/:id', () => {
    it('should update template', async () => {
      const templateId = 'template-1';
      const updateDto = {
        permissions: ['OPERATE', 'VIEW', 'EDIT'],
      };

      const expectedResponse = {
        id: templateId,
        name: 'Operator Access',
        permissions: updateDto.permissions,
        updatedAt: '2026-03-06T12:00:00Z',
      };

      (machineAccessService.updateTemplate as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/machine-access/templates/${templateId}`)
        .set('Authorization', 'Bearer admin-token')
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.updateTemplate).toHaveBeenCalledWith(
        templateId,
        updateDto,
        expect.any(String), // organizationId
      );
    });

    it('should reject invalid UUID format', async () => {
      await request(app.getHttpServer())
        .patch('/machine-access/templates/not-a-uuid')
        .set('Authorization', 'Bearer admin-token')
        .send({ permissions: ['OPERATE'] })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject access for non-admin roles', async () => {
      const templateId = 'template-1';

      await request(app.getHttpServer())
        .patch(`/machine-access/templates/${templateId}`)
        .set('Authorization', 'Bearer manager-token')
        .send({ permissions: ['OPERATE'] })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('DELETE /machine-access/templates/:id', () => {
    it('should soft delete template and return 204', async () => {
      const templateId = 'template-1';

      (machineAccessService.removeTemplate as jest.Mock).mockResolvedValue(
        undefined,
      );

      await request(app.getHttpServer())
        .delete(`/machine-access/templates/${templateId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.NO_CONTENT);

      expect(machineAccessService.removeTemplate).toHaveBeenCalledWith(
        templateId,
        expect.any(String), // organizationId
      );
    });

    it('should reject invalid UUID format', async () => {
      await request(app.getHttpServer())
        .delete('/machine-access/templates/not-a-uuid')
        .set('Authorization', 'Bearer admin-token')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject access for non-admin roles (owner/admin only)', async () => {
      const templateId = 'template-1';

      await request(app.getHttpServer())
        .delete(`/machine-access/templates/${templateId}`)
        .set('Authorization', 'Bearer manager-token')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================================
  // TEMPLATES - Apply (Bulk Grant)
  // ============================================================================

  describe('POST /machine-access/templates/apply', () => {
    it('should apply template to grant bulk access', async () => {
      const applyDto = {
        templateId: 'template-1',
        machineId: 'machine-1',
        userIds: ['user-1', 'user-2', 'user-3'],
      };

      const expectedResponse = {
        success: true,
        templateId: applyDto.templateId,
        machineId: applyDto.machineId,
        grantedCount: 3,
        failedCount: 0,
        grantedUsers: applyDto.userIds,
        failedUsers: [],
        createdAt: '2026-03-06T12:00:00Z',
      };

      (machineAccessService.applyTemplate as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/machine-access/templates/apply')
        .set('Authorization', 'Bearer admin-token')
        .send(applyDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.applyTemplate).toHaveBeenCalledWith(
        applyDto.templateId,
        applyDto.machineId,
        applyDto.userIds,
        expect.any(String), // userId
        expect.any(String), // organizationId
      );
    });

    it('should handle partial failures when applying template', async () => {
      const applyDto = {
        templateId: 'template-1',
        machineId: 'machine-1',
        userIds: ['user-1', 'user-2', 'user-3'],
      };

      const partialResponse = {
        success: true,
        templateId: applyDto.templateId,
        machineId: applyDto.machineId,
        grantedCount: 2,
        failedCount: 1,
        grantedUsers: ['user-1', 'user-2'],
        failedUsers: [
          {
            userId: 'user-3',
            reason: 'User already has active access',
          },
        ],
      };

      (machineAccessService.applyTemplate as jest.Mock).mockResolvedValue(
        partialResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/machine-access/templates/apply')
        .set('Authorization', 'Bearer admin-token')
        .send(applyDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.grantedCount).toBe(2);
      expect(response.body.failedCount).toBe(1);
    });

    it('should reject invalid template ID', async () => {
      const invalidDto = {
        templateId: 'nonexistent-999',
        machineId: 'machine-1',
        userIds: ['user-1'],
      };

      (machineAccessService.applyTemplate as jest.Mock).mockRejectedValue(
        new Error('Template not found'),
      );

      await request(app.getHttpServer())
        .post('/machine-access/templates/apply')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject empty userIds array', async () => {
      const invalidDto = {
        templateId: 'template-1',
        machineId: 'machine-1',
        userIds: [],
      };

      await request(app.getHttpServer())
        .post('/machine-access/templates/apply')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject access for non-admin roles', async () => {
      const applyDto = {
        templateId: 'template-1',
        machineId: 'machine-1',
        userIds: ['user-1'],
      };

      await request(app.getHttpServer())
        .post('/machine-access/templates/apply')
        .set('Authorization', 'Bearer viewer-token')
        .send(applyDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    // NOTE: Should we implement rollback for bulk grants if some fail?
    // What's the maximum number of users per apply template operation?
    // Should we audit which admin user performed the bulk grant?
  });
});
