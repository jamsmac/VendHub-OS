import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { BillingService } from './billing.service';
import {
  Invoice,
  BillingPayment,
  InvoiceStatus,
  BillingPaymentStatus,
} from './entities/billing.entity';

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-uuid-00000000-0000-0000-0000-000000000001';

describe('BillingService', () => {
  let service: BillingService;
  let invoiceRepo: jest.Mocked<Repository<Invoice>>;
  let paymentRepo: jest.Mocked<Repository<BillingPayment>>;

  const mockInvoice = {
    id: 'inv-uuid-1',
    organizationId: ORG_ID,
    invoiceNumber: 'INV-202401-00001',
    customerId: 'cust-uuid-1',
    customerName: 'Test Customer',
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    status: InvoiceStatus.DRAFT,
    subtotal: 100000,
    taxAmount: 12000,
    discountAmount: 0,
    totalAmount: 112000,
    paidAmount: 0,
    currency: 'UZS',
    lineItems: [
      { description: 'Service A', amount: 60000, taxRate: 12 },
      { description: 'Service B', amount: 40000, taxRate: 12 },
    ],
    notes: null,
    payments: [],
    paidAt: null,
    created_by_id: USER_ID,
    updated_by_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Invoice;

  const mockSentInvoice = {
    ...mockInvoice,
    id: 'inv-uuid-2',
    invoiceNumber: 'INV-202401-00002',
    status: InvoiceStatus.SENT,
  } as unknown as Invoice;

  const mockPaidInvoice = {
    ...mockInvoice,
    id: 'inv-uuid-3',
    status: InvoiceStatus.PAID,
    paidAmount: 112000,
  } as unknown as Invoice;

  const mockPayment = {
    id: 'pay-uuid-1',
    organizationId: ORG_ID,
    invoiceId: 'inv-uuid-2',
    paymentNumber: 'INV-202401-00002-P01',
    amount: 50000,
    currency: 'UZS',
    paymentMethod: 'bank_transfer',
    status: BillingPaymentStatus.COMPLETED,
    paymentDate: new Date(),
    referenceNumber: null,
    notes: null,
    created_by_id: USER_ID,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as BillingPayment;

  const mockInvoiceQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockInvoice], 1]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const mockPaymentQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockInvoiceQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(BillingPayment),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockPaymentQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    invoiceRepo = module.get(getRepositoryToken(Invoice));
    paymentRepo = module.get(getRepositoryToken(BillingPayment));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE INVOICE
  // ============================================================================

  describe('createInvoice', () => {
    it('should create an invoice with auto-generated number and calculated totals', async () => {
      invoiceRepo.count.mockResolvedValue(0);
      invoiceRepo.create.mockReturnValue(mockInvoice);
      invoiceRepo.save.mockResolvedValue(mockInvoice);

      const dto = {
        customerId: 'cust-uuid-1',
        customerName: 'Test Customer',
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        lineItems: [
          { description: 'Service A', amount: 60000, taxRate: 12 },
          { description: 'Service B', amount: 40000, taxRate: 12 },
        ],
      };

      const result = await service.createInvoice(ORG_ID, USER_ID, dto as any);

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: ORG_ID,
        status: InvoiceStatus.DRAFT,
        created_by_id: USER_ID,
      }));
    });

    it('should calculate subtotal and tax from line items', async () => {
      invoiceRepo.count.mockResolvedValue(0);
      invoiceRepo.create.mockImplementation((data) => data as any);
      invoiceRepo.save.mockImplementation(async (data) => data as Invoice);

      const dto = {
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        lineItems: [
          { description: 'Item', amount: 100000, taxRate: 12 },
        ],
      };

      await service.createInvoice(ORG_ID, USER_ID, dto as any);

      expect(invoiceRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        subtotal: 100000,
        taxAmount: 12000,
        totalAmount: 112000,
      }));
    });
  });

  // ============================================================================
  // FIND ALL INVOICES
  // ============================================================================

  describe('findAllInvoices', () => {
    it('should return paginated invoices', async () => {
      const result = await service.findAllInvoices(ORG_ID, { page: 1, limit: 20 } as any);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages', 1);
    });

    it('should filter by status', async () => {
      await service.findAllInvoices(ORG_ID, { status: InvoiceStatus.SENT, page: 1, limit: 20 } as any);

      expect(mockInvoiceQueryBuilder.andWhere).toHaveBeenCalledWith(
        'i.status = :status',
        { status: InvoiceStatus.SENT },
      );
    });
  });

  // ============================================================================
  // FIND INVOICE BY ID
  // ============================================================================

  describe('findInvoiceById', () => {
    it('should return invoice with payments', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockInvoice);

      const result = await service.findInvoiceById('inv-uuid-1');

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'inv-uuid-1' },
        relations: ['payments'],
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      invoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.findInvoiceById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // UPDATE INVOICE
  // ============================================================================

  describe('updateInvoice', () => {
    it('should update a DRAFT invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue({ ...mockInvoice } as any);
      invoiceRepo.save.mockImplementation(async (inv) => inv as Invoice);

      const result = await service.updateInvoice('inv-uuid-1', USER_ID, { notes: 'Updated' } as any);

      expect(result.notes).toBe('Updated');
    });

    it('should throw BadRequestException when invoice is not DRAFT', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockSentInvoice);

      await expect(
        service.updateInvoice('inv-uuid-2', USER_ID, { notes: 'Test' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // SEND INVOICE
  // ============================================================================

  describe('sendInvoice', () => {
    it('should transition DRAFT invoice to SENT', async () => {
      invoiceRepo.findOne.mockResolvedValue({ ...mockInvoice } as any);
      invoiceRepo.save.mockImplementation(async (inv) => inv as Invoice);

      const result = await service.sendInvoice('inv-uuid-1', USER_ID);

      expect(result.status).toBe(InvoiceStatus.SENT);
    });

    it('should throw BadRequestException when invoice is not DRAFT', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockSentInvoice);

      await expect(service.sendInvoice('inv-uuid-2', USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // CANCEL INVOICE
  // ============================================================================

  describe('cancelInvoice', () => {
    it('should cancel a sent invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue({ ...mockSentInvoice } as any);
      invoiceRepo.save.mockImplementation(async (inv) => inv as Invoice);

      const result = await service.cancelInvoice('inv-uuid-2', USER_ID);

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should throw BadRequestException when invoice is PAID', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockPaidInvoice);

      await expect(service.cancelInvoice('inv-uuid-3', USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when invoice is already CANCELLED', async () => {
      invoiceRepo.findOne.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      } as any);

      await expect(service.cancelInvoice('inv-uuid-1', USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // RECORD PAYMENT
  // ============================================================================

  describe('recordPayment', () => {
    it('should record payment and update invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue({ ...mockSentInvoice, totalAmount: 112000, paidAmount: 0 } as any);
      invoiceRepo.save.mockImplementation(async (inv) => inv as Invoice);
      paymentRepo.count.mockResolvedValue(0);
      paymentRepo.create.mockReturnValue(mockPayment as any);
      paymentRepo.save.mockResolvedValue(mockPayment as any);

      const dto = { amount: 50000, paymentMethod: 'bank_transfer', paymentDate: '2024-02-01' };
      const result = await service.recordPayment('inv-uuid-2', ORG_ID, USER_ID, dto as any);

      expect(result).toEqual(mockPayment);
    });

    it('should throw BadRequestException for DRAFT invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockInvoice);

      await expect(
        service.recordPayment('inv-uuid-1', ORG_ID, USER_ID, { amount: 50000 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payment exceeds remaining balance', async () => {
      invoiceRepo.findOne.mockResolvedValue({
        ...mockSentInvoice,
        totalAmount: 112000,
        paidAmount: 110000,
      } as any);

      await expect(
        service.recordPayment('inv-uuid-2', ORG_ID, USER_ID, { amount: 50000, paymentMethod: 'cash', paymentDate: '2024-01-01' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // REMOVE INVOICE
  // ============================================================================

  describe('removeInvoice', () => {
    it('should soft delete a DRAFT invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockInvoice);
      invoiceRepo.softDelete.mockResolvedValue(undefined as any);

      await service.removeInvoice('inv-uuid-1');

      expect(invoiceRepo.softDelete).toHaveBeenCalledWith('inv-uuid-1');
    });

    it('should throw BadRequestException for non-DRAFT invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockSentInvoice);

      await expect(service.removeInvoice('inv-uuid-2')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      invoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.removeInvoice('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GET INVOICE STATS
  // ============================================================================

  describe('getInvoiceStats', () => {
    it('should return aggregated invoice statistics', async () => {
      invoiceRepo.find.mockResolvedValue([
        { ...mockInvoice, status: InvoiceStatus.PAID, totalAmount: 100000, paidAmount: 100000 } as any,
        { ...mockSentInvoice, status: InvoiceStatus.OVERDUE, totalAmount: 50000, paidAmount: 0 } as any,
      ]);

      const result = await service.getInvoiceStats(ORG_ID);

      expect(result.totalAmount).toBe(150000);
      expect(result.paidAmount).toBe(100000);
      expect(result.overdueAmount).toBe(50000);
      expect(result.totalInvoices).toBe(2);
      expect(result.paidInvoices).toBe(1);
      expect(result.overdueInvoices).toBe(1);
    });

    it('should return zeros when no invoices exist', async () => {
      invoiceRepo.find.mockResolvedValue([]);

      const result = await service.getInvoiceStats(ORG_ID);

      expect(result.totalAmount).toBe(0);
      expect(result.totalInvoices).toBe(0);
    });
  });
});
