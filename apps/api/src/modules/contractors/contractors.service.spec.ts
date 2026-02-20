import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ContractorsService } from './contractors.service';
import {
  Contractor,
  ContractorInvoice,
  ServiceType,
  InvoiceStatus,
} from './entities/contractor.entity';

describe('ContractorsService', () => {
  let service: ContractorsService;
  let contractorRepo: jest.Mocked<Repository<Contractor>>;
  let invoiceRepo: jest.Mocked<Repository<ContractorInvoice>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = 'org-uuid-1';
  const contractorId = 'contractor-uuid-1';
  const invoiceId = 'invoice-uuid-1';

  const mockContractor: Contractor = {
    id: contractorId,
    organizationId: orgId,
    companyName: 'TechServ LLC',
    contactPerson: 'Ivan Petrov',
    phone: '+998901234567',
    email: 'techserv@test.com',
    address: 'Tashkent, Amir Temur 1',
    serviceType: ServiceType.MAINTENANCE,
    contractStart: new Date('2024-01-01'),
    contractEnd: new Date('2024-12-31'),
    contractNumber: 'C-001',
    paymentTerms: 'Net 30',
    rating: 4.5,
    notes: 'Reliable contractor',
    isActive: true,
    bankDetails: {
      bankName: 'Kapital Bank',
      accountNumber: '20208000',
      mfo: '00000',
    },
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Contractor;

  const mockInvoice: ContractorInvoice = {
    id: invoiceId,
    organizationId: orgId,
    contractorId,
    invoiceNumber: 'INV-001',
    amount: 5000000,
    paidAmount: 0,
    status: InvoiceStatus.PENDING,
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    paidDate: null,
    description: 'Monthly maintenance',
    approvedBy: null,
    approvedAt: null,
    attachmentUrls: [],
    contractor: mockContractor,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as ContractorInvoice;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockContractor], 1]),
    getMany: jest.fn().mockResolvedValue([mockContractor]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractorsService,
        {
          provide: getRepositoryToken(Contractor),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ContractorInvoice),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
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

    service = module.get<ContractorsService>(ContractorsService);
    contractorRepo = module.get(getRepositoryToken(Contractor));
    invoiceRepo = module.get(getRepositoryToken(ContractorInvoice));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CONTRACTOR CRUD
  // ============================================================================

  describe('createContractor', () => {
    it('should create a new contractor', async () => {
      const dto = {
        companyName: 'TechServ LLC',
        serviceType: ServiceType.MAINTENANCE,
        contactPerson: 'Ivan Petrov',
        phone: '+998901234567',
      };

      contractorRepo.create.mockReturnValue(mockContractor);
      contractorRepo.save.mockResolvedValue(mockContractor);

      const result = await service.createContractor(orgId, dto as any);

      expect(result).toEqual(expect.objectContaining({
        id: contractorId,
        companyName: 'TechServ LLC',
      }));
      expect(contractorRepo.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('contractor.created', {
        contractorId: contractorId,
        organizationId: orgId,
      });
    });

    it('should handle contractStart and contractEnd dates', async () => {
      const dto = {
        companyName: 'Test',
        serviceType: ServiceType.REPAIR,
        contractStart: '2024-01-01',
        contractEnd: '2024-12-31',
      };

      contractorRepo.create.mockReturnValue(mockContractor);
      contractorRepo.save.mockResolvedValue(mockContractor);

      await service.createContractor(orgId, dto as any);

      expect(contractorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          contractStart: expect.any(Date),
          contractEnd: expect.any(Date),
        }),
      );
    });
  });

  describe('updateContractor', () => {
    it('should update contractor fields', async () => {
      const dto = { companyName: 'Updated Name' };
      const updated = { ...mockContractor, companyName: 'Updated Name' };

      contractorRepo.findOne.mockResolvedValue(mockContractor);
      contractorRepo.save.mockResolvedValue(updated as Contractor);

      const result = await service.updateContractor(
        contractorId,
        orgId,
        dto as any,
      );

      expect(result.companyName).toEqual('Updated Name');
    });

    it('should throw NotFoundException when contractor not found', async () => {
      contractorRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateContractor('non-existent', orgId, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteContractor', () => {
    it('should deactivate contractor when no pending invoices', async () => {
      contractorRepo.findOne.mockResolvedValue(mockContractor);
      invoiceRepo.count.mockResolvedValue(0);
      contractorRepo.save.mockResolvedValue({
        ...mockContractor,
        isActive: false,
      } as Contractor);

      await service.deleteContractor(contractorId, orgId);

      expect(contractorRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('contractor.deleted', {
        contractorId,
        organizationId: orgId,
      });
    });

    it('should throw BadRequestException when pending invoices exist', async () => {
      contractorRepo.findOne.mockResolvedValue(mockContractor);
      invoiceRepo.count.mockResolvedValue(3);

      await expect(
        service.deleteContractor(contractorId, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when contractor not found', async () => {
      contractorRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteContractor('non-existent', orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getContractor', () => {
    it('should return contractor DTO', async () => {
      contractorRepo.findOne.mockResolvedValue(mockContractor);

      const result = await service.getContractor(contractorId, orgId);

      expect(result).toEqual(expect.objectContaining({
        id: contractorId,
        companyName: 'TechServ LLC',
        serviceType: ServiceType.MAINTENANCE,
      }));
    });
  });

  describe('getContractors', () => {
    it('should return paginated contractors', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockContractor], 1]);

      const result = await service.getContractors(orgId, {} as any);

      expect(result.total).toEqual(1);
      expect(result.items).toHaveLength(1);
      expect(result.page).toEqual(1);
    });

    it('should apply serviceType filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getContractors(orgId, {
        serviceType: ServiceType.REPAIR,
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'c.serviceType = :serviceType',
        { serviceType: ServiceType.REPAIR },
      );
    });

    it('should apply search filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getContractors(orgId, { search: 'tech' } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(c.companyName ILIKE :search OR c.contactPerson ILIKE :search OR c.phone ILIKE :search)',
        { search: '%tech%' },
      );
    });
  });

  describe('getContractorsByServiceType', () => {
    it('should return active contractors by service type', async () => {
      contractorRepo.find.mockResolvedValue([mockContractor]);

      const result = await service.getContractorsByServiceType(
        orgId,
        ServiceType.MAINTENANCE,
      );

      expect(result).toHaveLength(1);
      expect(contractorRepo.find).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          serviceType: ServiceType.MAINTENANCE,
          isActive: true,
        },
        order: { companyName: 'ASC' },
      });
    });
  });

  // ============================================================================
  // INVOICES CRUD
  // ============================================================================

  describe('createInvoice', () => {
    it('should create a new invoice', async () => {
      const dto = {
        invoiceNumber: 'INV-002',
        amount: 3000000,
        issueDate: '2024-02-01',
        dueDate: '2024-03-01',
        description: 'Repair work',
      };

      contractorRepo.findOne.mockResolvedValue(mockContractor);
      invoiceRepo.findOne.mockResolvedValue(null); // no duplicate
      invoiceRepo.create.mockReturnValue(mockInvoice);
      invoiceRepo.save.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice(
        contractorId,
        orgId,
        dto as any,
      );

      expect(result).toEqual(expect.objectContaining({
        id: invoiceId,
        invoiceNumber: 'INV-001',
      }));
    });

    it('should throw ConflictException for duplicate invoice number', async () => {
      contractorRepo.findOne.mockResolvedValue(mockContractor);
      invoiceRepo.findOne.mockResolvedValue(mockInvoice);

      await expect(
        service.createInvoice(contractorId, orgId, {
          invoiceNumber: 'INV-001',
          amount: 1000,
          issueDate: '2024-01-01',
          dueDate: '2024-02-01',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateInvoice', () => {
    it('should update a pending invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockInvoice);
      invoiceRepo.save.mockResolvedValue(mockInvoice);
      contractorRepo.findOne.mockResolvedValue(mockContractor);

      const result = await service.updateInvoice(
        invoiceId,
        orgId,
        { description: 'Updated' } as any,
      );

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for non-pending invoice', async () => {
      const paidInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.PAID,
      };
      invoiceRepo.findOne.mockResolvedValue(paidInvoice as ContractorInvoice);

      await expect(
        service.updateInvoice(invoiceId, orgId, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveInvoice', () => {
    it('should approve a pending invoice', async () => {
      const approved = {
        ...mockInvoice,
        status: InvoiceStatus.APPROVED,
        approvedBy: 'user-uuid-1',
      };

      invoiceRepo.findOne.mockResolvedValue(mockInvoice);
      invoiceRepo.save.mockResolvedValue(approved as ContractorInvoice);
      contractorRepo.findOne.mockResolvedValue(mockContractor);

      const result = await service.approveInvoice(
        invoiceId,
        orgId,
        'user-uuid-1',
      );

      expect(result.status).toEqual(InvoiceStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contractor-invoice.approved',
        expect.objectContaining({ invoiceId }),
      );
    });

    it('should throw BadRequestException for already approved invoice', async () => {
      const approved = {
        ...mockInvoice,
        status: InvoiceStatus.APPROVED,
      };
      invoiceRepo.findOne.mockResolvedValue(approved as ContractorInvoice);

      await expect(
        service.approveInvoice(invoiceId, orgId, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordInvoicePayment', () => {
    it('should record payment and mark as paid when fully paid', async () => {
      const invoice = { ...mockInvoice, paidAmount: 4000000, amount: 5000000 };
      const paid = {
        ...invoice,
        paidAmount: 5000000,
        status: InvoiceStatus.PAID,
      };

      invoiceRepo.findOne.mockResolvedValue(invoice as ContractorInvoice);
      invoiceRepo.save.mockResolvedValue(paid as ContractorInvoice);
      contractorRepo.findOne.mockResolvedValue(mockContractor);

      const result = await service.recordInvoicePayment(
        invoiceId,
        orgId,
        { amount: 1000000 } as any,
      );

      expect(result.status).toEqual(InvoiceStatus.PAID);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contractor-invoice.paid',
        expect.objectContaining({ amount: 1000000 }),
      );
    });

    it('should throw BadRequestException for cancelled invoice', async () => {
      const cancelled = {
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      };
      invoiceRepo.findOne.mockResolvedValue(cancelled as ContractorInvoice);

      await expect(
        service.recordInvoicePayment(
          invoiceId,
          orgId,
          { amount: 1000 } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelInvoice', () => {
    it('should cancel a pending invoice', async () => {
      const cancelled = {
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      };

      invoiceRepo.findOne.mockResolvedValue(mockInvoice);
      invoiceRepo.save.mockResolvedValue(cancelled as ContractorInvoice);
      contractorRepo.findOne.mockResolvedValue(mockContractor);

      const result = await service.cancelInvoice(invoiceId, orgId);

      expect(result.status).toEqual(InvoiceStatus.CANCELLED);
    });

    it('should throw BadRequestException for paid invoice', async () => {
      const paidInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.PAID,
      };
      invoiceRepo.findOne.mockResolvedValue(paidInvoice as ContractorInvoice);

      await expect(
        service.cancelInvoice(invoiceId, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe('getStats', () => {
    it('should return contractor statistics', async () => {
      contractorRepo.find.mockResolvedValue([mockContractor]);
      invoiceRepo.find.mockResolvedValue([mockInvoice]);

      const result = await service.getStats(orgId);

      expect(result.totalContractors).toEqual(1);
      expect(result.activeContractors).toEqual(1);
      expect(result.totalInvoices).toEqual(1);
      expect(result.totalInvoiceAmount).toBeGreaterThan(0);
    });

    it('should handle empty data', async () => {
      contractorRepo.find.mockResolvedValue([]);
      invoiceRepo.find.mockResolvedValue([]);

      const result = await service.getStats(orgId);

      expect(result.totalContractors).toEqual(0);
      expect(result.activeContractors).toEqual(0);
      expect(result.totalInvoices).toEqual(0);
    });
  });

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  describe('markOverdueInvoices', () => {
    it('should mark overdue invoices and emit events', async () => {
      const overdueInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.APPROVED,
      };
      invoiceRepo.find.mockResolvedValue([overdueInvoice as ContractorInvoice]);
      invoiceRepo.save.mockResolvedValue({
        ...overdueInvoice,
        status: InvoiceStatus.OVERDUE,
      } as ContractorInvoice);

      await service.markOverdueInvoices();

      expect(invoiceRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contractor-invoice.overdue',
        expect.objectContaining({
          invoiceId: overdueInvoice.id,
        }),
      );
    });

    it('should handle no overdue invoices', async () => {
      invoiceRepo.find.mockResolvedValue([]);

      await service.markOverdueInvoices();

      expect(invoiceRepo.save).not.toHaveBeenCalled();
    });
  });
});
