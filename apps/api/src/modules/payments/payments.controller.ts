/**
 * Payments Controller
 * Endpoints for payment management, provider webhooks, refunds, and transaction queries
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  PaymentsService,
  PaymeWebhookData,
  ClickWebhookData,
  UzumWebhookData,
} from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePaymentDto, UzumCreateDto, GenerateQRDto } from './dto/create-payment.dto';
import { InitiateRefundDto, QueryTransactionsDto } from './dto/refund.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ============================================
  // PAYMENT CREATION ENDPOINTS
  // ============================================

  @Post('payme/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Payme payment checkout URL' })
  @ApiResponse({ status: 201, description: 'Payme checkout URL generated' })
  @ApiResponse({ status: 400, description: 'Invalid input or Payme not configured' })
  createPayme(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.createPaymeTransaction(
      dto.amount,
      dto.orderId,
      organizationId,
      dto.machineId,
      dto.clientUserId,
    );
  }

  @Post('click/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Click payment checkout URL' })
  @ApiResponse({ status: 201, description: 'Click checkout URL generated' })
  @ApiResponse({ status: 400, description: 'Invalid input or Click not configured' })
  createClick(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.createClickTransaction(
      dto.amount,
      dto.orderId,
      organizationId,
      dto.machineId,
      dto.clientUserId,
    );
  }

  @Post('uzum/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Uzum Bank payment checkout URL' })
  @ApiResponse({ status: 201, description: 'Uzum checkout URL generated' })
  @ApiResponse({ status: 400, description: 'Invalid input or Uzum not configured' })
  createUzum(
    @Body() dto: UzumCreateDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.createUzumTransaction(dto, organizationId);
  }

  @Post('qr/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate QR payment code for vending machine' })
  @ApiResponse({ status: 201, description: 'QR code generated' })
  generateQR(@Body() dto: GenerateQRDto) {
    return this.paymentsService.generateQRPayment(dto.amount, dto.machineId);
  }

  // ============================================
  // WEBHOOK ENDPOINTS (Public, signature-verified)
  // ============================================

  @Post('webhook/payme')
  @Public()
  @ApiOperation({ summary: 'Payme webhook callback (JSON-RPC, Basic Auth verified)' })
  @ApiResponse({ status: 200, description: 'Payme webhook processed' })
  paymeWebhook(
    @Body() data: PaymeWebhookData,
    @Headers('authorization') authHeader: string,
  ) {
    return this.paymentsService.handlePaymeWebhook(data, authHeader);
  }

  @Post('webhook/click')
  @Public()
  @ApiOperation({ summary: 'Click webhook callback (MD5 signature verified)' })
  @ApiResponse({ status: 200, description: 'Click webhook processed' })
  clickWebhook(@Body() data: ClickWebhookData) {
    return this.paymentsService.handleClickWebhook(data);
  }

  @Post('webhook/uzum')
  @Public()
  @ApiOperation({ summary: 'Uzum Bank webhook callback (HMAC SHA-256 verified)' })
  @ApiResponse({ status: 200, description: 'Uzum webhook processed' })
  uzumWebhook(@Body() data: UzumWebhookData) {
    return this.paymentsService.handleUzumWebhook(data);
  }

  // ============================================
  // REFUND ENDPOINT
  // ============================================

  @Post('refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a refund for a completed payment transaction' })
  @ApiResponse({ status: 201, description: 'Refund initiated' })
  @ApiResponse({ status: 400, description: 'Invalid refund request' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  initiateRefund(
    @Body() dto: InitiateRefundDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.initiateRefund(dto, organizationId, userId);
  }

  // ============================================
  // TRANSACTION QUERY ENDPOINTS
  // ============================================

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner', 'manager', 'accountant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payment transactions with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
  getTransactions(
    @Query() query: QueryTransactionsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.getTransactions(query, organizationId);
  }

  @Get('transactions/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get aggregated transaction statistics (revenue, counts by provider/status)' })
  @ApiResponse({ status: 200, description: 'Transaction statistics' })
  getTransactionStats(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.getTransactionStats(organizationId);
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner', 'manager', 'accountant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single payment transaction with its refunds' })
  @ApiParam({ name: 'id', description: 'Transaction UUID', type: String })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  getTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.getTransaction(id, organizationId);
  }
}
