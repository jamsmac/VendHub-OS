/**
 * Contractors Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContractorsService } from './contractors.service';
import {
  CreateContractorDto,
  UpdateContractorDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordInvoicePaymentDto,
  ContractorFilterDto,
  InvoiceFilterDto,
  ContractorDto,
  ContractorListDto,
  InvoiceDto,
  InvoiceListDto,
  ContractorStatsDto,
} from './dto/contractor.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { ServiceType } from './entities/contractor.entity';

@ApiTags('Contractors')
@ApiBearerAuth()
@Controller('contractors')
export class ContractorsController {
  constructor(private readonly service: ContractorsService) {}

  // ============================================================================
  // CONTRACTORS CRUD
  // ============================================================================

  @Post()
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create contractor' })
  @ApiResponse({ status: 201, type: ContractorDto })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateContractorDto,
  ): Promise<ContractorDto> {
    return this.service.createContractor(organizationId, dto);
  }

  @Get()
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get contractors list' })
  @ApiResponse({ status: 200, type: ContractorListDto })
  async getList(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filter: ContractorFilterDto,
  ): Promise<ContractorListDto> {
    return this.service.getContractors(organizationId, filter);
  }

  @Get('stats')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get contractors statistics' })
  @ApiResponse({ status: 200, type: ContractorStatsDto })
  async getStats(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<ContractorStatsDto> {
    return this.service.getStats(organizationId);
  }

  @Get('by-service/:serviceType')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get contractors by service type' })
  @ApiParam({ name: 'serviceType', enum: ServiceType })
  @ApiResponse({ status: 200, type: [ContractorDto] })
  async getByServiceType(
    @Param('serviceType') serviceType: ServiceType,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<ContractorDto[]> {
    return this.service.getContractorsByServiceType(organizationId, serviceType);
  }

  @Get(':id')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get contractor by ID' })
  @ApiParam({ name: 'id', description: 'Contractor ID' })
  @ApiResponse({ status: 200, type: ContractorDto })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<ContractorDto> {
    return this.service.getContractor(id, organizationId);
  }

  @Put(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update contractor' })
  @ApiParam({ name: 'id', description: 'Contractor ID' })
  @ApiResponse({ status: 200, type: ContractorDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateContractorDto,
  ): Promise<ContractorDto> {
    return this.service.updateContractor(id, organizationId, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete contractor (deactivate)' })
  @ApiParam({ name: 'id', description: 'Contractor ID' })
  @ApiResponse({ status: 204 })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<void> {
    return this.service.deleteContractor(id, organizationId);
  }

  // ============================================================================
  // INVOICES
  // ============================================================================

  @Post(':id/invoices')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create invoice for contractor' })
  @ApiParam({ name: 'id', description: 'Contractor ID' })
  @ApiResponse({ status: 201, type: InvoiceDto })
  async createInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateInvoiceDto,
  ): Promise<InvoiceDto> {
    return this.service.createInvoice(id, organizationId, dto);
  }

  @Get(':id/invoices')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get contractor invoices' })
  @ApiParam({ name: 'id', description: 'Contractor ID' })
  @ApiResponse({ status: 200, type: InvoiceListDto })
  async getContractorInvoices(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query() filter: InvoiceFilterDto,
  ): Promise<InvoiceListDto> {
    return this.service.getContractorInvoices(id, organizationId, filter);
  }

  @Get('invoices/all')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiResponse({ status: 200, type: InvoiceListDto })
  async getAllInvoices(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filter: InvoiceFilterDto,
  ): Promise<InvoiceListDto> {
    return this.service.getInvoices(organizationId, filter);
  }

  @Put('invoices/:invoiceId')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, type: InvoiceDto })
  async updateInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceDto> {
    return this.service.updateInvoice(invoiceId, organizationId, dto);
  }

  @Post('invoices/:invoiceId/approve')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve invoice' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, type: InvoiceDto })
  async approveInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<InvoiceDto> {
    return this.service.approveInvoice(invoiceId, organizationId, userId);
  }

  @Post('invoices/:invoiceId/pay')
  @Roles('accountant', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record invoice payment' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, type: InvoiceDto })
  async payInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: RecordInvoicePaymentDto,
  ): Promise<InvoiceDto> {
    return this.service.recordInvoicePayment(invoiceId, organizationId, dto);
  }

  @Post('invoices/:invoiceId/cancel')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, type: InvoiceDto })
  async cancelInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<InvoiceDto> {
    return this.service.cancelInvoice(invoiceId, organizationId);
  }
}
