/**
 * Billing Controller
 * API эндпоинты для управления счетами и платежами
 */

import {
  Controller,
  Get,
  Post,
  Patch,
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
import { BillingService } from './billing.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  QueryInvoicesDto,
} from './dto/create-invoice.dto';
import { CreatePaymentDto, QueryPaymentsDto } from './dto/create-payment.dto';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  // ============================================================================
  // INVOICES
  // ============================================================================

  @Post('invoices')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async createInvoice(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.service.createInvoice(organizationId, userId, dto);
  }

  @Get('invoices')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List invoices' })
  @ApiResponse({ status: 200, description: 'Paginated list of invoices' })
  async findAllInvoices(
    @CurrentUser('organizationId') organizationId: string,
    @Query() params: QueryInvoicesDto,
  ) {
    return this.service.findAllInvoices(organizationId, params);
  }

  @Get('invoices/stats')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get invoice statistics' })
  @ApiResponse({ status: 200, description: 'Invoice statistics for the organization' })
  async getInvoiceStats(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.service.getInvoiceStats(organizationId);
  }

  @Get('invoices/:id')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice details with payments' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findInvoiceById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findInvoiceById(id);
  }

  @Patch('invoices/:id')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update an invoice (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  @ApiResponse({ status: 400, description: 'Only DRAFT invoices can be updated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async updateInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.service.updateInvoice(id, userId, dto);
  }

  @Post('invoices/:id/send')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an invoice (DRAFT -> SENT)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice sent' })
  @ApiResponse({ status: 400, description: 'Only DRAFT invoices can be sent' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async sendInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.sendInvoice(id, userId);
  }

  @Post('invoices/:id/cancel')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled' })
  @ApiResponse({ status: 400, description: 'Paid invoices cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async cancelInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.cancelInvoice(id, userId);
  }

  @Delete('invoices/:id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice (DRAFT only, soft delete)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 204, description: 'Invoice deleted' })
  @ApiResponse({ status: 400, description: 'Only DRAFT invoices can be deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async removeInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeInvoice(id);
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  @Post('invoices/:id/payments')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  @ApiResponse({ status: 400, description: 'Invalid payment or exceeds balance' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async recordPayment(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.service.recordPayment(invoiceId, organizationId, userId, dto);
  }

  @Get('payments')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List all payments' })
  @ApiResponse({ status: 200, description: 'Paginated list of payments' })
  async findAllPayments(
    @CurrentUser('organizationId') organizationId: string,
    @Query() params: QueryPaymentsDto,
  ) {
    return this.service.findAllPayments(organizationId, params);
  }
}
