import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MaterialRequestsService } from './material-requests.service';
import {
  MaterialRequest,
  MaterialRequestItem,
  MaterialRequestHistory,
  MaterialRequestStatus,
  RequestPriority,
} from './entities/material-request.entity';

// ============================================================================
// MOCK HELPERS
// ============================================================================

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

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
});

// ============================================================================
// CONSTANTS
// ============================================================================

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-uuid-00000000-0000-0000-0000-000000000001';
const APPROVER_ID = 'approver-uuid-00000000-0000-0000-0000-000000000001';

// ============================================================================
// TESTS
// ============================================================================

describe('MaterialRequestsService', () => {
  let service: MaterialRequestsService;
  let requestRepo: MockRepository<MaterialRequest>;
  let itemRepo: MockRepository<MaterialRequestItem>;
  let historyRepo: MockRepository<MaterialRequestHistory>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  const mockItem: Partial<MaterialRequestItem> = {
    id: 'item-uuid-1',
    requestId: 'req-uuid-1',
    productId: 'prod-uuid-1',
    productName: 'Coca-Cola 0.5L',
    productSku: 'CC-500',
    quantity: 100,
    unitPrice: 5000,
    totalPrice: 500000,
    deliveredQuantity: 0,
    notes: undefined,
    created_at: new Date(),
  };

  const mockRequest: Partial<MaterialRequest> = {
    id: 'req-uuid-1',
    organizationId: ORG_ID,
    requestNumber: 'MR-2025-00001',
    requesterId: USER_ID,
    requester: { firstName: 'Test', lastName: 'User' } as any,
    status: MaterialRequestStatus.DRAFT,
    priority: RequestPriority.NORMAL,
    supplierId: 'supplier-uuid-1',
    notes: 'Monthly order',
    totalAmount: 500000,
    paidAmount: 0,
    approvedBy: null as any,
    approver: null as any,
    approvedAt: null as any,
    rejectionReason: null as any,
    submittedAt: null as any,
    sentAt: null as any,
    deliveredAt: null as any,
    completedAt: null as any,
    cancelledAt: null as any,
    items: [mockItem as MaterialRequestItem],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockNewRequest: Partial<MaterialRequest> = {
    ...mockRequest,
    id: 'req-uuid-2',
    status: MaterialRequestStatus.NEW,
    submittedAt: new Date(),
  };

  const mockApprovedRequest: Partial<MaterialRequest> = {
    ...mockRequest,
    id: 'req-uuid-3',
    status: MaterialRequestStatus.APPROVED,
    approvedBy: APPROVER_ID,
    approvedAt: new Date(),
  };

  const mockSentRequest: Partial<MaterialRequest> = {
    ...mockRequest,
    id: 'req-uuid-4',
    status: MaterialRequestStatus.SENT,
    sentAt: new Date(),
  };

  const mockPaidRequest: Partial<MaterialRequest> = {
    ...mockRequest,
    id: 'req-uuid-5',
    status: MaterialRequestStatus.PAID,
    paidAmount: 500000,
  };

  const mockDeliveredRequest: Partial<MaterialRequest> = {
    ...mockRequest,
    id: 'req-uuid-6',
    status: MaterialRequestStatus.DELIVERED,
    deliveredAt: new Date(),
  };

  const mockRejectedRequest: Partial<MaterialRequest> = {
    ...mockRequest,
    id: 'req-uuid-7',
    status: MaterialRequestStatus.REJECTED,
    rejectionReason: 'Budget exceeded',
  };

  beforeEach(async () => {
    requestRepo = createMockRepository<MaterialRequest>();
    itemRepo = createMockRepository<MaterialRequestItem>();
    historyRepo = createMockRepository<MaterialRequestHistory>();
    mockQb = createMockQueryBuilder();
    requestRepo.createQueryBuilder!.mockReturnValue(mockQb);

    eventEmitter = { emit: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialRequestsService,
        { provide: getRepositoryToken(MaterialRequest), useValue: requestRepo },
        { provide: getRepositoryToken(MaterialRequestItem), useValue: itemRepo },
        { provide: getRepositoryToken(MaterialRequestHistory), useValue: historyRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MaterialRequestsService>(MaterialRequestsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // createRequest
  // ==========================================================================

  describe('createRequest', () => {
    it('should create a material request in DRAFT status', async () => {
      requestRepo.count!.mockResolvedValue(0);
      requestRepo.create!.mockReturnValue(mockRequest);
      requestRepo.save!.mockResolvedValue(mockRequest);
      itemRepo.create!.mockReturnValue(mockItem);

      const dto = {
        supplierId: 'supplier-uuid-1',
        notes: 'Monthly order',
        items: [{ productId: 'prod-uuid-1', productName: 'Coca-Cola 0.5L', productSku: 'CC-500', quantity: 100, unitPrice: 5000 }],
      };

      const result = await service.createRequest(USER_ID, ORG_ID, dto as any);

      expect(requestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          requesterId: USER_ID,
          status: MaterialRequestStatus.DRAFT,
        }),
      );
      expect(result).toBeDefined();
      expect(result.requestNumber).toBeDefined();
    });

    it('should generate unique request numbers', async () => {
      requestRepo.count!.mockResolvedValueOnce(5).mockResolvedValueOnce(6);
      requestRepo.create!.mockReturnValue(mockRequest);
      requestRepo.save!.mockResolvedValue(mockRequest);
      itemRepo.create!.mockReturnValue(mockItem);

      const dto = {
        items: [{ productId: 'p1', productName: 'Test', quantity: 1, unitPrice: 1000 }],
      };

      await service.createRequest(USER_ID, ORG_ID, dto as any);

      expect(requestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestNumber: expect.stringMatching(/^MR-\d{4}-\d{5}$/),
        }),
      );
    });

    it('should calculate totalAmount from items', async () => {
      requestRepo.count!.mockResolvedValue(0);
      requestRepo.create!.mockImplementation((data) => data);
      requestRepo.save!.mockImplementation((entity) => Promise.resolve({
        ...entity,
        requester: { firstName: 'T', lastName: 'U' },
        items: entity.items || [],
        created_at: new Date(),
        updated_at: new Date(),
      }));
      itemRepo.create!.mockImplementation((data) => data);

      const dto = {
        items: [
          { productId: 'p1', productName: 'A', quantity: 10, unitPrice: 1000 },
          { productId: 'p2', productName: 'B', quantity: 5, unitPrice: 2000 },
        ],
      };

      const result = await service.createRequest(USER_ID, ORG_ID, dto as any);

      // 10*1000 + 5*2000 = 20000
      expect(result.totalAmount).toBe(20000);
    });
  });

  // ==========================================================================
  // updateRequest
  // ==========================================================================

  describe('updateRequest', () => {
    it('should update a draft request', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockRequest });
      requestRepo.save!.mockResolvedValue(mockRequest);
      itemRepo.find!.mockResolvedValue([mockItem]);
      // For the second getRequest call
      requestRepo.findOne!.mockResolvedValue({ ...mockRequest, notes: 'Updated notes' });

      const dto = { notes: 'Updated notes' };
      const result = await service.updateRequest('req-uuid-1', USER_ID, ORG_ID, dto as any);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when updating non-draft request', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockNewRequest });

      await expect(
        service.updateRequest('req-uuid-2', USER_ID, ORG_ID, { notes: 'X' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // submitRequest
  // ==========================================================================

  describe('submitRequest', () => {
    it('should transition DRAFT -> NEW', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockRequest });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const result = await service.submitRequest('req-uuid-1', USER_ID, ORG_ID);

      expect(result.status).toBe(MaterialRequestStatus.NEW);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'material-request.submitted',
        expect.objectContaining({ requestId: 'req-uuid-1' }),
      );
    });

    it('should throw BadRequestException when submitting request without items', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockRequest, items: [] });

      await expect(
        service.submitRequest('req-uuid-1', USER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      requestRepo.findOne!.mockResolvedValue({
        ...mockRequest,
        status: MaterialRequestStatus.COMPLETED,
      });

      await expect(
        service.submitRequest('req-uuid-1', USER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // approveRequest
  // ==========================================================================

  describe('approveRequest', () => {
    it('should approve a NEW request', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockNewRequest });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const result = await service.approveRequest('req-uuid-2', APPROVER_ID, ORG_ID);

      expect(result.status).toBe(MaterialRequestStatus.APPROVED);
      expect(result.approvedBy).toBe(APPROVER_ID);
      expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('should record history on approval', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockNewRequest });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      await service.approveRequest('req-uuid-2', APPROVER_ID, ORG_ID, { comment: 'Approved' } as any);

      expect(historyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: MaterialRequestStatus.NEW,
          toStatus: MaterialRequestStatus.APPROVED,
        }),
      );
    });
  });

  // ==========================================================================
  // rejectRequest
  // ==========================================================================

  describe('rejectRequest', () => {
    it('should reject a NEW request with reason', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockNewRequest });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const result = await service.rejectRequest(
        'req-uuid-2', USER_ID, ORG_ID,
        { reason: 'Budget exceeded' } as any,
      );

      expect(result.status).toBe(MaterialRequestStatus.REJECTED);
      expect(result.rejectionReason).toBe('Budget exceeded');
      expect(result.rejectedBy).toBe(USER_ID);
    });
  });

  // ==========================================================================
  // sendToSupplier
  // ==========================================================================

  describe('sendToSupplier', () => {
    it('should transition APPROVED -> SENT', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockApprovedRequest });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const result = await service.sendToSupplier('req-uuid-3', USER_ID, ORG_ID);

      expect(result.status).toBe(MaterialRequestStatus.SENT);
      expect(result.sentAt).toBeInstanceOf(Date);
    });

    it('should throw for invalid transition', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockRequest });

      await expect(
        service.sendToSupplier('req-uuid-1', USER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // recordPayment
  // ==========================================================================

  describe('recordPayment', () => {
    it('should record full payment and set status to PAID', async () => {
      requestRepo.findOne!.mockResolvedValue({
        ...mockSentRequest,
        totalAmount: 500000,
        paidAmount: 0,
      });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const result = await service.recordPayment(
        'req-uuid-4', USER_ID, ORG_ID,
        { amount: 500000 } as any,
      );

      expect(result.status).toBe(MaterialRequestStatus.PAID);
      expect(result.paidAmount).toBe(500000);
    });

    it('should set PARTIALLY_PAID when partial payment', async () => {
      requestRepo.findOne!.mockResolvedValue({
        ...mockSentRequest,
        totalAmount: 500000,
        paidAmount: 0,
      });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const result = await service.recordPayment(
        'req-uuid-4', USER_ID, ORG_ID,
        { amount: 200000 } as any,
      );

      expect(result.status).toBe(MaterialRequestStatus.PARTIALLY_PAID);
      expect(result.paidAmount).toBe(200000);
    });

    it('should throw BadRequestException for invalid payment status', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockRequest });

      await expect(
        service.recordPayment('req-uuid-1', USER_ID, ORG_ID, { amount: 100000 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // confirmDelivery
  // ==========================================================================

  describe('confirmDelivery', () => {
    it('should confirm delivery and update item quantities', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockPaidRequest });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      itemRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const dto = {
        items: [{ itemId: 'item-uuid-1', deliveredQuantity: 95 }],
        notes: 'Some items damaged',
      };

      const result = await service.confirmDelivery('req-uuid-5', USER_ID, ORG_ID, dto as any);

      expect(result.status).toBe(MaterialRequestStatus.DELIVERED);
    });
  });

  // ==========================================================================
  // cancelRequest
  // ==========================================================================

  describe('cancelRequest', () => {
    it('should cancel a draft request', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockRequest });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const result = await service.cancelRequest(
        'req-uuid-1', USER_ID, ORG_ID,
        { reason: 'No longer needed' } as any,
      );

      expect(result.status).toBe(MaterialRequestStatus.CANCELLED);
      expect(result.cancellationReason).toBe('No longer needed');
    });

    it('should throw for completed request (no transitions allowed)', async () => {
      requestRepo.findOne!.mockResolvedValue({
        ...mockRequest,
        status: MaterialRequestStatus.COMPLETED,
      });

      await expect(
        service.cancelRequest('req-uuid-1', USER_ID, ORG_ID, { reason: 'X' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // returnToDraft
  // ==========================================================================

  describe('returnToDraft', () => {
    it('should return REJECTED request to DRAFT', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockRejectedRequest });
      requestRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      historyRepo.create!.mockReturnValue({});
      historyRepo.save!.mockResolvedValue({});

      const result = await service.returnToDraft('req-uuid-7', USER_ID, ORG_ID);

      expect(result.status).toBe(MaterialRequestStatus.DRAFT);
    });

    it('should throw for non-rejected request', async () => {
      requestRepo.findOne!.mockResolvedValue({ ...mockNewRequest });

      await expect(
        service.returnToDraft('req-uuid-2', USER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // getRequests
  // ==========================================================================

  describe('getRequests', () => {
    it('should return paginated requests', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[mockRequest], 1]);

      const result = await service.getRequests(ORG_ID, {} as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should apply status filter', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getRequests(ORG_ID, { status: MaterialRequestStatus.NEW } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'r.status = :status',
        { status: MaterialRequestStatus.NEW },
      );
    });

    it('should apply search filter', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getRequests(ORG_ID, { search: 'MR-2025' } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(r.requestNumber ILIKE :search OR r.notes ILIKE :search)',
        { search: '%MR-2025%' },
      );
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe('getStats', () => {
    it('should calculate statistics correctly', async () => {
      const requests = [
        { status: MaterialRequestStatus.DRAFT, totalAmount: 100000, paidAmount: 0 },
        { status: MaterialRequestStatus.NEW, totalAmount: 200000, paidAmount: 0 },
        { status: MaterialRequestStatus.APPROVED, totalAmount: 300000, paidAmount: 0 },
        { status: MaterialRequestStatus.COMPLETED, totalAmount: 400000, paidAmount: 400000 },
        { status: MaterialRequestStatus.REJECTED, totalAmount: 50000, paidAmount: 0 },
      ];

      requestRepo.find!.mockResolvedValue(requests);

      const result = await service.getStats(ORG_ID);

      expect(result.totalRequests).toBe(5);
      expect(result.draftCount).toBe(1);
      expect(result.pendingApprovalCount).toBe(1);
      expect(result.approvedCount).toBe(1);
      expect(result.completedCount).toBe(1);
      expect(result.rejectedCount).toBe(1);
      expect(result.totalAmount).toBe(1050000);
      expect(result.paidAmount).toBe(400000);
      expect(result.unpaidAmount).toBe(650000);
    });

    it('should return zeros when no requests', async () => {
      requestRepo.find!.mockResolvedValue([]);

      const result = await service.getStats(ORG_ID);

      expect(result.totalRequests).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  // ==========================================================================
  // getPendingApprovals
  // ==========================================================================

  describe('getPendingApprovals', () => {
    it('should return requests in NEW status', async () => {
      requestRepo.find!.mockResolvedValue([mockNewRequest]);

      const result = await service.getPendingApprovals(ORG_ID);

      expect(requestRepo.find).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID, status: MaterialRequestStatus.NEW },
        relations: ['items', 'requester'],
        order: { created_at: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // getRequestHistory
  // ==========================================================================

  describe('getRequestHistory', () => {
    it('should return history for a valid request', async () => {
      requestRepo.findOne!.mockResolvedValue(mockRequest);
      historyRepo.find!.mockResolvedValue([
        { fromStatus: MaterialRequestStatus.DRAFT, toStatus: MaterialRequestStatus.NEW },
      ]);

      const result = await service.getRequestHistory('req-uuid-1', ORG_ID);

      expect(historyRepo.find).toHaveBeenCalledWith({
        where: { requestId: 'req-uuid-1' },
        order: { created_at: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when request not found', async () => {
      requestRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getRequestHistory('nonexistent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
