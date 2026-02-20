import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReportsService, GenerateReportDto, CreateScheduledReportDto, CreateDashboardDto } from './reports.service';
import {
  ReportDefinition,
  ScheduledReport,
  GeneratedReport,
  Dashboard,
  DashboardWidget,
  SavedReportFilter,
  ReportSubscription,
  ReportType,
  ExportFormat,
  ReportStatus,
  ReportFrequency,
} from './entities/report.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { Product } from '../products/entities/product.entity';

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
  increment: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  clone: jest.fn(),
  getCount: jest.fn(),
  getMany: jest.fn(),
  getManyAndCount: jest.fn(),
  getOne: jest.fn(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
});

describe('ReportsService', () => {
  let service: ReportsService;
  let definitionRepo: MockRepository<ReportDefinition>;
  let scheduledRepo: MockRepository<ScheduledReport>;
  let generatedRepo: MockRepository<GeneratedReport>;
  let dashboardRepo: MockRepository<Dashboard>;
  let widgetRepo: MockRepository<DashboardWidget>;
  let filterRepo: MockRepository<SavedReportFilter>;
  let subscriptionRepo: MockRepository<ReportSubscription>;
  let transactionRepo: MockRepository<Transaction>;
  let machineRepo: MockRepository<Machine>;
  let productRepo: MockRepository<Product>;

  beforeEach(async () => {
    definitionRepo = createMockRepository<ReportDefinition>();
    scheduledRepo = createMockRepository<ScheduledReport>();
    generatedRepo = createMockRepository<GeneratedReport>();
    dashboardRepo = createMockRepository<Dashboard>();
    widgetRepo = createMockRepository<DashboardWidget>();
    filterRepo = createMockRepository<SavedReportFilter>();
    subscriptionRepo = createMockRepository<ReportSubscription>();
    transactionRepo = createMockRepository<Transaction>();
    machineRepo = createMockRepository<Machine>();
    productRepo = createMockRepository<Product>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(ReportDefinition), useValue: definitionRepo },
        { provide: getRepositoryToken(ScheduledReport), useValue: scheduledRepo },
        { provide: getRepositoryToken(GeneratedReport), useValue: generatedRepo },
        { provide: getRepositoryToken(Dashboard), useValue: dashboardRepo },
        { provide: getRepositoryToken(DashboardWidget), useValue: widgetRepo },
        { provide: getRepositoryToken(SavedReportFilter), useValue: filterRepo },
        { provide: getRepositoryToken(ReportSubscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // REPORT DEFINITIONS
  // ==========================================================================

  describe('getDefinitions', () => {
    it('should return active definitions for organization and system ones', async () => {
      const orgId = 'org-1';
      const definitions = [
        { id: 'def-1', name: 'Sales', organizationId: orgId, isActive: true },
        { id: 'def-2', name: 'System', isSystem: true, isActive: true },
      ];
      definitionRepo.find!.mockResolvedValue(definitions);

      const result = await service.getDefinitions(orgId);

      expect(definitionRepo.find).toHaveBeenCalledWith({
        where: [
          { organizationId: orgId, isActive: true },
          { isSystem: true, isActive: true },
        ],
        order: { category: 'ASC', name: 'ASC' },
      });
      expect(result).toEqual(definitions);
    });
  });

  describe('getDefinition', () => {
    it('should return a definition by id', async () => {
      const definition = { id: 'def-1', name: 'Sales Report' };
      definitionRepo.findOne!.mockResolvedValue(definition);

      const result = await service.getDefinition('def-1');

      expect(result).toEqual(definition);
      expect(definitionRepo.findOne).toHaveBeenCalledWith({ where: { id: 'def-1' } });
    });

    it('should throw NotFoundException when definition not found', async () => {
      definitionRepo.findOne!.mockResolvedValue(null);

      await expect(service.getDefinition('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getDefinitionByCode', () => {
    it('should return a definition by code', async () => {
      const definition = { id: 'def-1', code: 'SALES_DAILY' };
      definitionRepo.findOne!.mockResolvedValue(definition);

      const result = await service.getDefinitionByCode('SALES_DAILY');

      expect(result).toEqual(definition);
    });

    it('should throw NotFoundException when code not found', async () => {
      definitionRepo.findOne!.mockResolvedValue(null);

      await expect(service.getDefinitionByCode('INVALID'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('createDefinition', () => {
    it('should create a new definition with default flags', async () => {
      const data = { name: 'Custom Report', type: ReportType.CUSTOM };
      const created = { ...data, isActive: true, isSystem: false, isPublic: false };
      definitionRepo.create!.mockReturnValue(created);
      definitionRepo.save!.mockResolvedValue({ id: 'def-new', ...created });

      const result = await service.createDefinition(data);

      expect(definitionRepo.create).toHaveBeenCalledWith({
        ...data,
        isActive: true,
        isSystem: false,
        isPublic: false,
      });
      expect(result.id).toBe('def-new');
    });
  });

  // ==========================================================================
  // REPORT GENERATION
  // ==========================================================================

  describe('generate', () => {
    it('should generate a report with CUSTOM type when no definition', async () => {
      const dto: GenerateReportDto = {
        organizationId: 'org-1',
        format: ExportFormat.JSON,
        parameters: {},
      };

      const mockReport = {
        id: 'rpt-1',
        organizationId: 'org-1',
        status: ReportStatus.GENERATING,
        reportNumber: 'RPT-2025-00001',
      };

      generatedRepo.create!.mockReturnValue(mockReport);
      generatedRepo.save!.mockResolvedValue(mockReport);

      const result = await service.generate(dto);

      expect(generatedRepo.create).toHaveBeenCalled();
      expect(result.status).toBe(ReportStatus.COMPLETED);
    });

    it('should generate a report with definition lookup', async () => {
      const definition = { id: 'def-1', name: 'Sales Summary', type: ReportType.SALES_SUMMARY };
      definitionRepo.findOne!.mockResolvedValue(definition);

      const mockQb = createMockQueryBuilder();
      mockQb.clone.mockReturnValue(mockQb);
      mockQb.getRawMany.mockResolvedValue([]);
      mockQb.getRawOne.mockResolvedValue({ totalTransactions: '0', totalRevenue: '0', averageTransaction: '0' });
      transactionRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const dto: GenerateReportDto = {
        organizationId: 'org-1',
        reportDefinitionId: 'def-1',
        format: ExportFormat.PDF,
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-31'),
      };

      const mockReport = {
        id: 'rpt-2',
        organizationId: 'org-1',
        status: ReportStatus.GENERATING,
        reportNumber: 'RPT-2025-00002',
      };

      generatedRepo.create!.mockReturnValue(mockReport);
      generatedRepo.save!.mockResolvedValue(mockReport);

      const result = await service.generate(dto);

      expect(definitionRepo.findOne).toHaveBeenCalledWith({ where: { id: 'def-1' } });
      expect(result).toBeDefined();
    });

    it('should set report status to FAILED on error', async () => {
      const mockReport = {
        id: 'rpt-err',
        organizationId: 'org-1',
        status: ReportStatus.GENERATING,
        reportNumber: 'RPT-2025-00003',
      };

      generatedRepo.create!.mockReturnValue(mockReport);
      generatedRepo.save!.mockResolvedValueOnce(mockReport);

      // Cause an error by making machineRepo fail
      machineRepo.find!.mockRejectedValue(new Error('DB error'));

      const dto: GenerateReportDto = {
        organizationId: 'org-1',
        type: ReportType.MACHINE_PERFORMANCE,
        format: ExportFormat.JSON,
      };

      // Save on error path
      generatedRepo.save!.mockResolvedValueOnce({ ...mockReport, status: ReportStatus.FAILED });

      await expect(service.generate(dto)).rejects.toThrow('DB error');
      expect(generatedRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReportStatus.FAILED }),
      );
    });
  });

  // ==========================================================================
  // GENERATED REPORTS
  // ==========================================================================

  describe('getGeneratedReports', () => {
    it('should return paginated completed reports', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(2);
      mockQb.getMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
      generatedRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getGeneratedReports('org-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should apply type and date filters', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      generatedRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.getGeneratedReports('org-1', {
        type: ReportType.SALES_SUMMARY,
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-12-31'),
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('r.type = :type', { type: ReportType.SALES_SUMMARY });
    });

    it('should cap limit at 100', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      generatedRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getGeneratedReports('org-1', { limit: 500 });

      expect(result.limit).toBe(100);
    });
  });

  describe('getGeneratedReport', () => {
    it('should return a generated report by id', async () => {
      const report = { id: 'rpt-1', name: 'Test Report' };
      generatedRepo.findOne!.mockResolvedValue(report);

      const result = await service.getGeneratedReport('rpt-1');
      expect(result).toEqual(report);
    });

    it('should throw NotFoundException when report not found', async () => {
      generatedRepo.findOne!.mockResolvedValue(null);

      await expect(service.getGeneratedReport('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteExpiredReports', () => {
    it('should delete expired reports and return count', async () => {
      generatedRepo.delete!.mockResolvedValue({ affected: 5, raw: {} });

      const result = await service.deleteExpiredReports();
      expect(result).toBe(5);
    });

    it('should return 0 when no expired reports', async () => {
      generatedRepo.delete!.mockResolvedValue({ affected: 0, raw: {} });

      const result = await service.deleteExpiredReports();
      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // SCHEDULED REPORTS
  // ==========================================================================

  describe('createScheduledReport', () => {
    it('should create a scheduled report with calculated next run', async () => {
      const dto: CreateScheduledReportDto = {
        organizationId: 'org-1',
        reportDefinitionId: 'def-1',
        name: 'Daily Sales',
        frequency: ReportFrequency.DAILY,
        scheduleConfig: { time: '09:00', timezone: 'Asia/Tashkent' },
        parameters: {},
        format: ExportFormat.PDF,
        deliveryMethod: 'email',
        deliveryConfig: { emails: ['admin@test.com'] },
      };

      const created = { id: 'sched-1', ...dto, isActive: true, runCount: 0, failCount: 0 };
      scheduledRepo.create!.mockReturnValue(created);
      scheduledRepo.save!.mockResolvedValue(created);

      const result = await service.createScheduledReport(dto, 'user-1');

      expect(scheduledRepo.create).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });
  });

  describe('getScheduledReports', () => {
    it('should return all scheduled reports for organization', async () => {
      const scheduled = [{ id: 's1' }, { id: 's2' }];
      scheduledRepo.find!.mockResolvedValue(scheduled);

      const result = await service.getScheduledReports('org-1');

      expect(result).toEqual(scheduled);
      expect(scheduledRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('updateScheduledReport', () => {
    it('should update a scheduled report', async () => {
      const existing = { id: 's1', name: 'Old Name', schedule: { frequency: ReportFrequency.DAILY } };
      scheduledRepo.findOne!.mockResolvedValue(existing);
      scheduledRepo.save!.mockResolvedValue({ ...existing, name: 'New Name' });

      const result = await service.updateScheduledReport('s1', { name: 'New Name' } as any);

      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundException when schedule not found', async () => {
      scheduledRepo.findOne!.mockResolvedValue(null);

      await expect(service.updateScheduledReport('non-existent', {}))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteScheduledReport', () => {
    it('should delete a scheduled report', async () => {
      scheduledRepo.delete!.mockResolvedValue({ affected: 1, raw: {} });

      await service.deleteScheduledReport('s1');

      expect(scheduledRepo.delete).toHaveBeenCalledWith('s1');
    });
  });

  // ==========================================================================
  // DASHBOARDS
  // ==========================================================================

  describe('getDashboards', () => {
    it('should return dashboards with widgets for organization', async () => {
      const dashboards = [{ id: 'd1', widgets: [] }];
      dashboardRepo.find!.mockResolvedValue(dashboards);

      const result = await service.getDashboards('org-1');

      expect(dashboardRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        relations: ['widgets'],
        order: { isDefault: 'DESC', created_at: 'DESC' },
      });
      expect(result).toEqual(dashboards);
    });
  });

  describe('getDashboard', () => {
    it('should return a dashboard and increment view count', async () => {
      const dashboard = { id: 'd1', name: 'Main', widgets: [] };
      dashboardRepo.findOne!.mockResolvedValue(dashboard);
      dashboardRepo.increment!.mockResolvedValue(undefined);

      const result = await service.getDashboard('d1');

      expect(result).toEqual(dashboard);
      expect(dashboardRepo.increment).toHaveBeenCalledWith({ id: 'd1' }, 'viewCount', 1);
    });

    it('should throw NotFoundException when dashboard not found', async () => {
      dashboardRepo.findOne!.mockResolvedValue(null);

      await expect(service.getDashboard('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDashboard', () => {
    it('should delete widgets then dashboard', async () => {
      widgetRepo.delete!.mockResolvedValue({ affected: 3, raw: {} });
      dashboardRepo.delete!.mockResolvedValue({ affected: 1, raw: {} });

      await service.deleteDashboard('d1');

      expect(widgetRepo.delete).toHaveBeenCalledWith({ dashboardId: 'd1' });
      expect(dashboardRepo.delete).toHaveBeenCalledWith('d1');
    });
  });

  describe('setDefaultDashboard', () => {
    it('should clear default flag then set new default', async () => {
      dashboardRepo.update!.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.setDefaultDashboard('org-1', 'd1');

      expect(dashboardRepo.update).toHaveBeenCalledWith(
        { organizationId: 'org-1' },
        { isDefault: false },
      );
      expect(dashboardRepo.update).toHaveBeenCalledWith('d1', { isDefault: true });
    });
  });

  // ==========================================================================
  // WIDGETS
  // ==========================================================================

  describe('createWidget', () => {
    it('should create a widget for existing dashboard', async () => {
      const dashboard = { id: 'd1', organizationId: 'org-1' };
      dashboardRepo.findOne!.mockResolvedValue(dashboard);

      const widgetData = {
        dashboardId: 'd1',
        title: 'Revenue',
        positionX: 0,
        positionY: 0,
        width: 6,
        height: 3,
      };

      const created = { id: 'w1', ...widgetData, organizationId: 'org-1', isVisible: true, isActive: true };
      widgetRepo.create!.mockReturnValue(created);
      widgetRepo.save!.mockResolvedValue(created);

      const result = await service.createWidget(widgetData);

      expect(result.id).toBe('w1');
      expect(widgetRepo.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when dashboard not found', async () => {
      dashboardRepo.findOne!.mockResolvedValue(null);

      await expect(service.createWidget({
        dashboardId: 'invalid',
        title: 'Test',
        positionX: 0,
        positionY: 0,
        width: 4,
        height: 2,
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateWidget', () => {
    it('should update an existing widget', async () => {
      const widget = { id: 'w1', title: 'Old' };
      widgetRepo.findOne!.mockResolvedValue(widget);
      widgetRepo.save!.mockResolvedValue({ ...widget, title: 'New' });

      const result = await service.updateWidget('w1', { title: 'New' } as any);
      expect(result.title).toBe('New');
    });

    it('should throw NotFoundException when widget not found', async () => {
      widgetRepo.findOne!.mockResolvedValue(null);

      await expect(service.updateWidget('non-existent', {}))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderWidgets', () => {
    it('should update positionY for each widget in order', async () => {
      widgetRepo.update!.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.reorderWidgets('d1', ['w3', 'w1', 'w2']);

      expect(widgetRepo.update).toHaveBeenCalledWith('w3', { positionY: 0 });
      expect(widgetRepo.update).toHaveBeenCalledWith('w1', { positionY: 1 });
      expect(widgetRepo.update).toHaveBeenCalledWith('w2', { positionY: 2 });
    });
  });

  // ==========================================================================
  // SAVED FILTERS
  // ==========================================================================

  describe('saveFilter', () => {
    it('should create a saved filter', async () => {
      const filterData = { name: 'My Filter', filters: { machineIds: ['m1'] } };
      const created = { id: 'f1', ...filterData };
      filterRepo.create!.mockReturnValue(created);
      filterRepo.save!.mockResolvedValue(created);

      const result = await service.saveFilter('user-1', 'org-1', 'def-1', 'My Filter', filterData.filters);

      expect(filterRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('f1');
    });

    it('should clear default flag from other filters when isDefault is true', async () => {
      filterRepo.update!.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      const created = { id: 'f1', isDefault: true };
      filterRepo.create!.mockReturnValue(created);
      filterRepo.save!.mockResolvedValue(created);

      await service.saveFilter('user-1', 'org-1', 'def-1', 'Default Filter', {}, true);

      expect(filterRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', definitionId: 'def-1' },
        { isDefault: false },
      );
    });
  });

  describe('getSavedFilters', () => {
    it('should return saved filters for user', async () => {
      const filters = [{ id: 'f1' }, { id: 'f2' }];
      filterRepo.find!.mockResolvedValue(filters);

      const result = await service.getSavedFilters('user-1');

      expect(filterRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { isDefault: 'DESC', name: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by report definition id when provided', async () => {
      filterRepo.find!.mockResolvedValue([]);

      await service.getSavedFilters('user-1', 'def-1');

      expect(filterRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1', definitionId: 'def-1' },
        order: { isDefault: 'DESC', name: 'ASC' },
      });
    });
  });

  describe('deleteSavedFilter', () => {
    it('should delete a saved filter', async () => {
      filterRepo.delete!.mockResolvedValue({ affected: 1, raw: {} });

      await service.deleteSavedFilter('f1');

      expect(filterRepo.delete).toHaveBeenCalledWith('f1');
    });
  });
});
