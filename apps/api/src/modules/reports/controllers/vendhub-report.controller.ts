/**
 * VendHub Report Controller
 * API endpoints для генерации и экспорта отчетов VendHub
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { VendHubReportGeneratorService } from '../services/vendhub-report-generator.service';
import { VendHubExcelExportService } from '../services/vendhub-excel-export.service';
import {
  GenerateVendHubReportDto,
  ReportStructure,
  VendHubFullReportDto,
} from '../dto/vendhub-report.dto';

@ApiTags('VendHub Reports')
@ApiBearerAuth()
@Controller('reports/vendhub')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendHubReportController {
  constructor(
    private readonly generatorService: VendHubReportGeneratorService,
    private readonly excelService: VendHubExcelExportService,
  ) {}

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  @Post('generate')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Generate VendHub report',
    description: `
Генерирует отчет VendHub согласно спецификации v11.0.

**Структуры отчетов:**
- **A (По типам платежей)**: Детализация по Наличные/QR/VIP/Кредит, 46 листов
- **B (Финансовая аналитика)**: Себестоимость/Прибыль/Маржа/Ингредиенты, 13 листов
- **A+B (Полная)**: Объединение обеих структур с аналитикой

**Ключевые отличия:**
- Structure A: "По_дням" = по ДНЯМ НЕДЕЛИ (7 строк)
- Structure B: "По дням" = по ДАТАМ (много строк)
- Structure A: НЕТ себестоимости и ингредиентов
- Structure B: ЕСТЬ категория продуктов и себестоимость/ед.
    `,
  })
  @ApiResponse({ status: 201, description: 'Report generated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @HttpCode(HttpStatus.CREATED)
  async generateReport(
    @Body(ValidationPipe) dto: GenerateVendHubReportDto,
    @CurrentUser() user: User,
  ): Promise<VendHubFullReportDto> {
    return this.generatorService.generate(user.organizationId, dto);
  }

  @Post('generate/excel')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Generate and download VendHub report as Excel',
    description: 'Генерирует отчет VendHub и возвращает Excel файл для скачивания',
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({
    status: 200,
    description: 'Excel file',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  @HttpCode(HttpStatus.OK)
  async generateExcelReport(
    @Body(ValidationPipe) dto: GenerateVendHubReportDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    // Generate report
    const report = await this.generatorService.generate(user.organizationId, dto);

    // Export to Excel
    const buffer = await this.excelService.exportToExcel(report);

    // Generate filename
    const dateFrom = new Date(dto.dateFrom).toISOString().split('T')[0];
    const dateTo = new Date(dto.dateTo).toISOString().split('T')[0];
    const structureName = dto.structure === ReportStructure.FULL ? 'Full' : dto.structure;
    const filename = `VendHub_Report_${structureName}_${dateFrom}_${dateTo}.xlsx`;

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // ============================================================================
  // QUICK REPORTS
  // ============================================================================

  @Get('quick/structure-a')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Quick Structure A report (last 30 days)',
    description: 'Быстрый отчет Structure A за последние 30 дней',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
  async quickStructureA(
    @CurrentUser() user: User,
    @Query('days') days?: number,
  ): Promise<VendHubFullReportDto> {
    const numDays = days || 30;
    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - numDays * 24 * 60 * 60 * 1000);

    return this.generatorService.generate(user.organizationId, {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      structure: ReportStructure.A,
    });
  }

  @Get('quick/structure-b')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Quick Structure B report (last 30 days)',
    description: 'Быстрый отчет Structure B за последние 30 дней',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
  async quickStructureB(
    @CurrentUser() user: User,
    @Query('days') days?: number,
  ): Promise<VendHubFullReportDto> {
    const numDays = days || 30;
    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - numDays * 24 * 60 * 60 * 1000);

    return this.generatorService.generate(user.organizationId, {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      structure: ReportStructure.B,
    });
  }

  @Get('quick/full')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Quick Full report (last 30 days)',
    description: 'Быстрый полный отчет (A+B) за последние 30 дней',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
  async quickFullReport(
    @CurrentUser() user: User,
    @Query('days') days?: number,
  ): Promise<VendHubFullReportDto> {
    const numDays = days || 30;
    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - numDays * 24 * 60 * 60 * 1000);

    return this.generatorService.generate(user.organizationId, {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      structure: ReportStructure.FULL,
    });
  }

  // ============================================================================
  // SPECIFIC REPORT SECTIONS
  // ============================================================================

  @Get('payment-types')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get payment types summary',
    description: 'Получить сводку по типам платежей (Наличные/QR/VIP/Кредит)',
  })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getPaymentTypesSummary(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const report = await this.generatorService.generate(user.organizationId, {
      dateFrom,
      dateTo,
      structure: ReportStructure.A,
    });

    return report.structureA?.summary;
  }

  @Get('financial')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get financial summary',
    description: 'Получить финансовую сводку (Выручка/Себестоимость/Прибыль/Маржа)',
  })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getFinancialSummary(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const report = await this.generatorService.generate(user.organizationId, {
      dateFrom,
      dateTo,
      structure: ReportStructure.B,
    });

    return report.structureB?.summary;
  }

  @Get('qr-reconciliation')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get QR reconciliation report',
    description: 'Сверка QR-платежей (Order vs Payme + Click)',
  })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getQRReconciliation(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const report = await this.generatorService.generate(user.organizationId, {
      dateFrom,
      dateTo,
      structure: ReportStructure.A,
    });

    return {
      reconciliation: report.structureA?.qrReconciliation,
      verification: {
        tolerance: {
          ok: '< 1%',
          warning: '1-3%',
          critical: '> 3%',
        },
        principle: 'Order[Таможенный платеж] ≈ Payme + Click',
      },
    };
  }

  @Get('ingredients')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({
    summary: 'Get ingredients consumption report',
    description: 'Расход ингредиентов (сводка, по месяцам, по автоматам)',
  })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getIngredientsReport(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const report = await this.generatorService.generate(user.organizationId, {
      dateFrom,
      dateTo,
      structure: ReportStructure.B,
    });

    return report.structureB?.ingredients;
  }

  @Get('delivery-failures')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Get delivery failures report',
    description: 'Отчет по сбоям доставки',
  })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getDeliveryFailures(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const report = await this.generatorService.generate(user.organizationId, {
      dateFrom,
      dateTo,
      structure: ReportStructure.B,
    });

    return {
      failures: report.structureB?.deliveryFailures,
      summary: {
        total: report.structureB?.summary.orders.failed,
        successRate: report.structureB?.summary.orders.successRate,
      },
    };
  }

  @Get('cross-analysis')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get cross analysis (TOP-5 x TOP-5 + hourly)',
    description: 'Кросс-анализ: TOP-5 продуктов × TOP-5 автоматов + почасовой анализ',
  })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getCrossAnalysis(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const report = await this.generatorService.generate(user.organizationId, {
      dateFrom,
      dateTo,
      structure: ReportStructure.A,
    });

    return report.structureA?.crossAnalysis;
  }

  // ============================================================================
  // REPORT STRUCTURES INFO
  // ============================================================================

  @Get('structures')
  @ApiOperation({
    summary: 'Get available report structures info',
    description: 'Информация о доступных структурах отчетов',
  })
  getStructuresInfo() {
    return {
      structures: [
        {
          code: 'A',
          name: 'По типам платежей',
          description: 'Детализация по Наличные/QR/VIP/Кредит',
          sheets: 46,
          features: [
            'Сводка по типам платежей',
            'Помесячные листы (Нал_/QR_/Прод_)',
            'По дням НЕДЕЛИ (7 строк)',
            'Кросс-анализ TOP-5 × TOP-5',
            'Почасовой анализ',
            'Сверка QR',
            'Средний чек детальный',
          ],
          notIncluded: ['Себестоимость', 'Прибыль/Маржа', 'Расход ингредиентов'],
        },
        {
          code: 'B',
          name: 'Финансовая аналитика',
          description: 'Себестоимость/Прибыль/Маржа',
          sheets: 13,
          features: [
            'Себестоимость по продуктам',
            'Валовая прибыль и маржа',
            'По ДАТАМ (много строк)',
            'Расход ингредиентов (5 листов)',
            'Категории продуктов',
            'Закупки',
            'История цен',
          ],
          notIncluded: ['Помесячные листы', 'Кросс-анализ', 'Почасовой анализ'],
        },
        {
          code: 'A+B',
          name: 'Полная',
          description: 'Объединение обеих структур',
          sheets: 64,
          features: [
            'Все листы из Structure A',
            'Все листы из Structure B',
            'Сводная аналитика',
            'Тренды (рост выручки, заказов, маржи)',
            'Автоматические предупреждения',
          ],
          recommended: true,
        },
      ],
      criticalDifferences: {
        byDays: {
          structureA: 'По ДНЯМ НЕДЕЛИ (7 строк: Пн-Вс)',
          structureB: 'По ДАТАМ (много строк)',
        },
        products: {
          structureA: 'БЕЗ колонки "Категория"',
          structureB: 'ЕСТЬ колонка "Категория" и "Себестоимость/ед."',
        },
        finance: {
          structureA: 'НЕТ себестоимости, прибыли, маржи',
          structureB: 'ЕСТЬ все финансовые показатели',
        },
        ingredients: {
          structureA: 'НЕТ',
          structureB: 'ЕСТЬ (5 листов)',
        },
      },
      verificationRules: {
        paymeHeaderRow: 6,
        paymeAmountColumn: 'СУММА БЕЗ КОМИССИИ',
        qrTolerance: {
          ok: '< 1%',
          warning: '1-3%',
          critical: '> 3%',
        },
        ingredientFilter: ['Доставлен', 'Доставка подтверждена'],
        paymentFilter: ['Оплачено'],
      },
    };
  }
}
