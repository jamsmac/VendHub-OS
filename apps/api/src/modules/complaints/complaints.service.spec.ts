import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ComplaintsService, CreateComplaintDto, QueryComplaintsDto } from './complaints.service';
import {
  Complaint,
  ComplaintComment,
  ComplaintAction,
  ComplaintRefund,
  ComplaintTemplate,
  ComplaintQrCode,
  ComplaintAutomationRule,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory,
  ComplaintSource,
  RefundStatus,
} from './entities/complaint.entity';

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-uuid-00000000-0000-0000-0000-000000000001';

describe('ComplaintsService', () => {
  let service: ComplaintsService;
  let complaintRepo: jest.Mocked<Repository<Complaint>>;
  let commentRepo: jest.Mocked<Repository<ComplaintComment>>;
  let actionRepo: jest.Mocked<Repository<ComplaintAction>>;
  let refundRepo: jest.Mocked<Repository<ComplaintRefund>>;
  let templateRepo: jest.Mocked<Repository<ComplaintTemplate>>;
  let qrCodeRepo: jest.Mocked<Repository<ComplaintQrCode>>;
  let automationRepo: jest.Mocked<Repository<ComplaintAutomationRule>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockComplaint = {
    id: 'cmp-uuid-1',
    organizationId: ORG_ID,
    machineId: 'machine-uuid-1',
    locationId: null,
    ticketNumber: 'CMP-202401-00001',
    status: ComplaintStatus.NEW,
    priority: ComplaintPriority.MEDIUM,
    category: ComplaintCategory.PRODUCT_NOT_DISPENSED,
    source: ComplaintSource.QR_CODE,
    subject: 'Product stuck in machine',
    description: 'I paid but the product did not come out',
    customer: { name: 'Test Customer', phone: '+998901234567' },
    attachments: [],
    assignedToId: null,
    resolution: null,
    resolvedAt: null,
    resolvedById: null,
    isEscalated: false,
    escalatedAt: null,
    escalationReason: null,
    isSlaBreached: false,
    resolutionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    commentCount: 0,
    satisfactionRating: null,
    satisfactionFeedback: null,
    feedbackReceivedAt: null,
    tags: [],
    comments: [],
    actions: [],
    refunds: [],
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Complaint;

  const mockResolvedComplaint = {
    ...mockComplaint,
    id: 'cmp-uuid-2',
    status: ComplaintStatus.RESOLVED,
    resolvedAt: new Date(),
    resolvedById: USER_ID,
    resolution: 'Refund issued',
  } as unknown as Complaint;

  const mockRefund = {
    id: 'refund-uuid-1',
    complaintId: 'cmp-uuid-1',
    organizationId: ORG_ID,
    amount: 5000,
    currency: 'UZS',
    status: RefundStatus.PENDING,
    reason: 'Product not dispensed',
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as ComplaintRefund;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockComplaint]),
    getCount: jest.fn().mockResolvedValue(1),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        {
          provide: getRepositoryToken(Complaint),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ComplaintComment),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComplaintAction),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComplaintRefund),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComplaintTemplate),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComplaintQrCode),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComplaintAutomationRule),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
    complaintRepo = module.get(getRepositoryToken(Complaint));
    commentRepo = module.get(getRepositoryToken(ComplaintComment));
    actionRepo = module.get(getRepositoryToken(ComplaintAction));
    refundRepo = module.get(getRepositoryToken(ComplaintRefund));
    templateRepo = module.get(getRepositoryToken(ComplaintTemplate));
    qrCodeRepo = module.get(getRepositoryToken(ComplaintQrCode));
    automationRepo = module.get(getRepositoryToken(ComplaintAutomationRule));
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE
  // ============================================================================

  describe('create', () => {
    it('should create a complaint with ticket number and SLA deadline', async () => {
      complaintRepo.findOne.mockResolvedValue(null); // for generateComplaintNumber
      automationRepo.find.mockResolvedValue([]); // no automation rules
      complaintRepo.create.mockReturnValue(mockComplaint);
      complaintRepo.save.mockResolvedValue(mockComplaint);
      actionRepo.create.mockReturnValue({} as any);
      actionRepo.save.mockResolvedValue({} as any);

      const dto: CreateComplaintDto = {
        organizationId: ORG_ID,
        machineId: 'machine-uuid-1',
        category: ComplaintCategory.PRODUCT_NOT_DISPENSED,
        source: ComplaintSource.QR_CODE,
        subject: 'Product stuck',
        description: 'Product did not come out',
        customerName: 'Test',
        customerPhone: '+998901234567',
      };

      const result = await service.create(dto);

      expect(result).toEqual(mockComplaint);
      expect(complaintRepo.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('complaint.created', mockComplaint);
    });

    it('should apply automation rules when creating', async () => {
      complaintRepo.findOne.mockResolvedValue(null);
      automationRepo.find.mockResolvedValue([
        {
          organizationId: ORG_ID,
          isActive: true,
          conditions: [{ field: 'category', operator: 'equals', value: ComplaintCategory.PAYMENT_FAILED }],
          actions: [{ type: 'set_priority', params: { priority: ComplaintPriority.HIGH } }],
          stopOnMatch: true,
          priority: 1,
        } as any,
      ]);
      complaintRepo.create.mockReturnValue(mockComplaint);
      complaintRepo.save.mockResolvedValue(mockComplaint);
      actionRepo.create.mockReturnValue({} as any);
      actionRepo.save.mockResolvedValue({} as any);

      const dto: CreateComplaintDto = {
        organizationId: ORG_ID,
        category: ComplaintCategory.PAYMENT_FAILED,
        source: ComplaintSource.QR_CODE,
        subject: 'Payment failed',
        description: 'Money charged but no product',
      };

      await service.create(dto);

      expect(complaintRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        priority: ComplaintPriority.HIGH,
      }));
    });
  });

  // ============================================================================
  // FIND ALL
  // ============================================================================

  describe('findAll', () => {
    it('should return paginated complaints for organization', async () => {
      const result = await service.findAll(ORG_ID, { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe('findById', () => {
    it('should return complaint with relations', async () => {
      complaintRepo.findOne.mockResolvedValue(mockComplaint);

      const result = await service.findById('cmp-uuid-1');

      expect(result).toEqual(mockComplaint);
      expect(complaintRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cmp-uuid-1' },
        relations: ['comments', 'actions', 'refunds'],
      });
    });

    it('should throw NotFoundException when complaint not found', async () => {
      complaintRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // QUERY
  // ============================================================================

  describe('query', () => {
    it('should filter by status array', async () => {
      const query: QueryComplaintsDto = {
        organizationId: ORG_ID,
        status: [ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS],
        page: 1,
        limit: 20,
      };

      await service.query(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'c.status IN (:...status)',
        { status: [ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS] },
      );
    });

    it('should filter by priority array', async () => {
      const query: QueryComplaintsDto = {
        organizationId: ORG_ID,
        priority: [ComplaintPriority.HIGH, ComplaintPriority.CRITICAL],
        page: 1,
        limit: 20,
      };

      await service.query(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'c.priority IN (:...priority)',
        { priority: [ComplaintPriority.HIGH, ComplaintPriority.CRITICAL] },
      );
    });

    it('should filter by search term', async () => {
      const query: QueryComplaintsDto = {
        organizationId: ORG_ID,
        search: 'stuck',
        page: 1,
        limit: 20,
      };

      await service.query(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('c.ticketNumber ILIKE'),
        { search: '%stuck%' },
      );
    });
  });

  // ============================================================================
  // RESOLVE
  // ============================================================================

  describe('resolve', () => {
    it('should resolve a complaint with resolution text', async () => {
      complaintRepo.findOne.mockResolvedValue({ ...mockComplaint } as any);
      complaintRepo.save.mockImplementation(async (c) => c as Complaint);
      actionRepo.create.mockReturnValue({} as any);
      actionRepo.save.mockResolvedValue({} as any);

      const result = await service.resolve('cmp-uuid-1', 'Refund issued', USER_ID);

      expect(result.status).toBe(ComplaintStatus.RESOLVED);
      expect(result.resolution).toBe('Refund issued');
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // ESCALATE
  // ============================================================================

  describe('escalate', () => {
    it('should escalate complaint to critical priority', async () => {
      complaintRepo.findOne.mockResolvedValue({ ...mockComplaint } as any);
      complaintRepo.save.mockImplementation(async (c) => c as Complaint);
      actionRepo.create.mockReturnValue({} as any);
      actionRepo.save.mockResolvedValue({} as any);

      const result = await service.escalate('cmp-uuid-1', 'Customer very upset', USER_ID);

      expect(result.status).toBe(ComplaintStatus.ESCALATED);
      expect(result.priority).toBe(ComplaintPriority.CRITICAL);
      expect(result.isEscalated).toBe(true);
      expect(result.escalationReason).toBe('Customer very upset');
      expect(eventEmitter.emit).toHaveBeenCalledWith('complaint.escalated', expect.any(Object));
    });
  });

  // ============================================================================
  // ADD COMMENT
  // ============================================================================

  describe('addComment', () => {
    it('should add a comment and increment comment count', async () => {
      complaintRepo.findOne.mockResolvedValue({ ...mockComplaint, commentCount: 0 } as any);
      complaintRepo.save.mockImplementation(async (c) => c as Complaint);
      commentRepo.create.mockReturnValue({} as any);
      commentRepo.save.mockResolvedValue({ id: 'comment-uuid-1' } as any);

      const dto = {
        complaintId: 'cmp-uuid-1',
        userId: USER_ID,
        isInternal: false,
        content: 'We are looking into this.',
      };

      const result = await service.addComment(dto);

      expect(result).toBeDefined();
      expect(commentRepo.create).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CREATE REFUND
  // ============================================================================

  describe('createRefund', () => {
    it('should create a refund for a complaint', async () => {
      complaintRepo.findOne.mockResolvedValue(mockComplaint);
      refundRepo.create.mockReturnValue(mockRefund as any);
      refundRepo.save.mockResolvedValue(mockRefund as any);
      actionRepo.create.mockReturnValue({} as any);
      actionRepo.save.mockResolvedValue({} as any);

      const dto = {
        complaintId: 'cmp-uuid-1',
        amount: 5000,
        method: 'cash' as const,
        reason: 'Product not dispensed',
      };

      const result = await service.createRefund(dto);

      expect(result).toEqual(mockRefund);
      expect(eventEmitter.emit).toHaveBeenCalledWith('complaint.refund.requested', expect.any(Object));
    });
  });

  // ============================================================================
  // APPROVE REFUND
  // ============================================================================

  describe('approveRefund', () => {
    it('should approve a pending refund', async () => {
      refundRepo.findOne.mockResolvedValue({ ...mockRefund } as any);
      refundRepo.save.mockImplementation(async (r) => r as ComplaintRefund);

      const result = await service.approveRefund('refund-uuid-1', USER_ID);

      expect(result.status).toBe(RefundStatus.APPROVED);
      expect(result.approvedById).toBe(USER_ID);
    });

    it('should throw NotFoundException when refund not found', async () => {
      refundRepo.findOne.mockResolvedValue(null);

      await expect(service.approveRefund('non-existent', USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when refund is not pending', async () => {
      refundRepo.findOne.mockResolvedValue({ ...mockRefund, status: RefundStatus.COMPLETED } as any);

      await expect(service.approveRefund('refund-uuid-1', USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // REMOVE (SOFT DELETE)
  // ============================================================================

  describe('remove', () => {
    it('should soft delete a rejected complaint', async () => {
      complaintRepo.findOne.mockResolvedValue({
        ...mockComplaint,
        status: ComplaintStatus.REJECTED,
      } as any);
      complaintRepo.softDelete.mockResolvedValue(undefined as any);
      actionRepo.create.mockReturnValue({} as any);
      actionRepo.save.mockResolvedValue({} as any);

      await service.remove('cmp-uuid-1', USER_ID);

      expect(complaintRepo.softDelete).toHaveBeenCalledWith('cmp-uuid-1');
    });

    it('should throw BadRequestException when status does not allow deletion', async () => {
      complaintRepo.findOne.mockResolvedValue(mockComplaint); // status is NEW

      await expect(service.remove('cmp-uuid-1', USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when complaint not found', async () => {
      complaintRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent', USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // SUBMIT FEEDBACK
  // ============================================================================

  describe('submitFeedback', () => {
    it('should submit satisfaction rating for resolved complaint', async () => {
      complaintRepo.findOne.mockResolvedValue({ ...mockResolvedComplaint } as any);
      complaintRepo.save.mockImplementation(async (c) => c as Complaint);

      const result = await service.submitFeedback('cmp-uuid-2', 4, 'Good support');

      expect(result.satisfactionRating).toBe(4);
      expect(result.satisfactionFeedback).toBe('Good support');
    });

    it('should throw BadRequestException for non-resolved complaint', async () => {
      complaintRepo.findOne.mockResolvedValue(mockComplaint); // status is NEW

      await expect(service.submitFeedback('cmp-uuid-1', 4)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid rating', async () => {
      complaintRepo.findOne.mockResolvedValue({ ...mockResolvedComplaint } as any);

      await expect(service.submitFeedback('cmp-uuid-2', 6)).rejects.toThrow(BadRequestException);
    });
  });
});
