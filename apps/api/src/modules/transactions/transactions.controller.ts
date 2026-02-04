/**
 * Transactions Controller for VendHub OS
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  Logger,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  TransactionsService,
  CreateTransactionDto,
  ProcessPaymentDto,
  DispenseResultDto,
  QueryTransactionsDto,
} from './transactions.service';
import { TransactionStatus, PaymentMethod, CommissionStatus } from './entities/transaction.entity';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganizationId, CurrentUserId } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import {
  CreateCollectionRecordDto,
  VerifyCollectionDto,
  QueryCollectionRecordsDto,
} from './dto/collection-record.dto';
import {
  QueryDailySummariesDto,
  RebuildDailySummaryDto,
  QueryCommissionsDto,
} from './dto/daily-summary-query.dto';

// ============================================================================
// Payment Callback DTOs
// ============================================================================

interface PaymeCallbackDto {
  id: number;
  method: string;
  params: {
    id: string;
    amount?: number;
    time?: number;
    account?: {
      order_id?: string;
    };
  };
}

interface ClickCallbackDto {
  click_trans_id: string;
  merchant_trans_id: string;
  amount: number;
  action: number;
  error: number;
  error_note?: string;
  sign_time: string;
  sign_string: string;
}

interface UzumCallbackDto {
  transactionId: string;
  status: 'PAID' | 'CANCELLED' | 'FAILED';
  amount: number;
  timestamp: string;
  signature: string;
}

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================================
  // Webhook Signature Verification
  // ============================================================================

  /**
   * Verify Payme webhook signature
   * Payme uses Basic Auth with merchant_id:key
   */
  private verifyPaymeSignature(authHeader: string): boolean {
    const merchantId = this.configService.get<string>('PAYME_MERCHANT_ID');
    const secretKey = this.configService.get<string>('PAYME_SECRET_KEY');

    if (!merchantId || !secretKey) {
      this.logger.error('Payme credentials not configured');
      return false;
    }

    const expectedAuth = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
    const providedAuth = authHeader?.replace('Basic ', '');

    return providedAuth === expectedAuth;
  }

  /**
   * Verify Click webhook signature
   * Click uses MD5 hash: click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time
   */
  private verifyClickSignature(body: ClickCallbackDto): boolean {
    const secretKey = this.configService.get<string>('CLICK_SECRET_KEY');
    const serviceId = this.configService.get<string>('CLICK_SERVICE_ID');

    if (!secretKey || !serviceId) {
      this.logger.error('Click credentials not configured');
      return false;
    }

    const signString = `${body.click_trans_id}${serviceId}${secretKey}${body.merchant_trans_id}${body.amount}${body.action}${body.sign_time}`;
    const expectedSign = crypto.createHash('md5').update(signString).digest('hex');

    return body.sign_string === expectedSign;
  }

  /**
   * Verify Uzum webhook signature
   * Uzum uses HMAC-SHA256
   */
  private verifyUzumSignature(body: UzumCallbackDto, _rawBody: string): boolean {
    const secretKey = this.configService.get<string>('UZUM_SECRET_KEY');

    if (!secretKey) {
      this.logger.error('Uzum credentials not configured');
      return false;
    }

    // Uzum signature: HMAC-SHA256 of body without signature field
    const dataToSign = JSON.stringify({
      transactionId: body.transactionId,
      status: body.status,
      amount: body.amount,
      timestamp: body.timestamp,
    });

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(dataToSign)
      .digest('hex');

    return body.signature === expectedSignature;
  }

  // ============================================================================
  // Transaction Lifecycle (called by machines)
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create new transaction' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateTransactionDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.transactionsService.create({
      ...dto,
      organizationId: dto.organizationId || orgId,
    });
  }

  @Post(':id/payment')
  @ApiOperation({ summary: 'Process payment for transaction' })
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Omit<ProcessPaymentDto, 'transactionId'>,
  ) {
    return this.transactionsService.processPayment({
      ...dto,
      transactionId: id,
    });
  }

  @Post(':id/dispense')
  @ApiOperation({ summary: 'Record dispense result' })
  @HttpCode(HttpStatus.OK)
  async recordDispense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Omit<DispenseResultDto, 'transactionId'>,
  ) {
    return this.transactionsService.recordDispense({
      ...dto,
      transactionId: id,
    });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel transaction' })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.transactionsService.cancel(id, reason);
  }

  // ============================================================================
  // Payment Provider Callbacks
  // ============================================================================

  @Post('callback/payme')
  @Public()
  @ApiOperation({ summary: 'Payme payment callback' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @HttpCode(HttpStatus.OK)
  async paymeCallback(
    @Body() body: PaymeCallbackDto,
    @Headers('authorization') authHeader: string,
  ) {
    // SECURITY: Verify Payme signature
    if (!this.verifyPaymeSignature(authHeader)) {
      this.logger.warn('Invalid Payme webhook signature', {
        method: body.method,
        transactionId: body.params?.id,
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { method, params } = body;
    this.logger.log(`Payme callback: ${method}`, { transactionId: params?.id });

    if (method === 'PerformTransaction') {
      await this.transactionsService.confirmPayment(
        params.id,
        'payme',
        true,
        body as unknown as Record<string, unknown>,
      );
    } else if (method === 'CancelTransaction') {
      await this.transactionsService.confirmPayment(
        params.id,
        'payme',
        false,
        body as unknown as Record<string, unknown>,
      );
    }

    return { result: { allow: true } };
  }

  @Post('callback/click')
  @Public()
  @ApiOperation({ summary: 'Click payment callback' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @HttpCode(HttpStatus.OK)
  async clickCallback(@Body() body: ClickCallbackDto) {
    // SECURITY: Verify Click signature
    if (!this.verifyClickSignature(body)) {
      this.logger.warn('Invalid Click webhook signature', {
        clickTransId: body.click_trans_id,
        merchantTransId: body.merchant_trans_id,
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { click_trans_id, merchant_trans_id, error } = body;
    this.logger.log(`Click callback: action=${body.action}`, {
      clickTransId: click_trans_id,
      merchantTransId: merchant_trans_id,
      error,
    });

    await this.transactionsService.confirmPayment(
      merchant_trans_id,
      'click',
      error === 0,
      body as unknown as Record<string, unknown>,
    );

    return { error: 0, error_note: 'Success' };
  }

  @Post('callback/uzum')
  @Public()
  @ApiOperation({ summary: 'Uzum payment callback' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @HttpCode(HttpStatus.OK)
  async uzumCallback(
    @Body() body: UzumCallbackDto,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // SECURITY: Verify Uzum signature
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    if (!this.verifyUzumSignature(body, rawBody)) {
      this.logger.warn('Invalid Uzum webhook signature', {
        transactionId: body.transactionId,
        status: body.status,
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { transactionId, status } = body;
    this.logger.log(`Uzum callback: status=${status}`, { transactionId });

    await this.transactionsService.confirmPayment(
      transactionId,
      'uzum',
      status === 'PAID',
      body as unknown as Record<string, unknown>,
    );

    return { success: true };
  }

  // ============================================================================
  // Queries
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Query transactions' })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus, isArray: true })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: PaymentMethod, isArray: true })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async query(
    @Query() query: Omit<QueryTransactionsDto, 'organizationId'>,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.transactionsService.query({
      ...query,
      organizationId: orgId,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiQuery({ name: 'machineId', required: false })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async getStatistics(
    @CurrentOrganizationId() orgId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('machineId') machineId?: string,
  ) {
    return this.transactionsService.getStatistics(
      orgId,
      new Date(dateFrom),
      new Date(dateTo),
      machineId,
    );
  }

  // ============================================================================
  // Collection Records
  // ============================================================================

  @Get('collections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List collection records' })
  @ApiResponse({ status: 200, description: 'Paginated list of collection records' })
  @ApiQuery({ name: 'machineId', required: false, description: 'Filter by machine UUID' })
  @ApiQuery({ name: 'collectedByUserId', required: false, description: 'Filter by collector UUID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
  @ApiQuery({ name: 'isVerified', required: false, description: 'Filter by verification status' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async getCollectionRecords(
    @CurrentOrganizationId() orgId: string,
    @Query() query: QueryCollectionRecordsDto,
  ) {
    return this.transactionsService.getCollectionRecords(orgId, query);
  }

  @Post('collections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a collection record' })
  @ApiResponse({ status: 201, description: 'Collection record created' })
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'admin', 'manager', 'operator')
  async createCollectionRecord(
    @CurrentOrganizationId() orgId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateCollectionRecordDto,
  ) {
    return this.transactionsService.createCollectionRecord(orgId, userId, dto);
  }

  @Patch('collections/:collectionId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Verify a collection record' })
  @ApiResponse({ status: 200, description: 'Collection record verified' })
  @ApiResponse({ status: 404, description: 'Collection record not found' })
  @ApiResponse({ status: 400, description: 'Already verified' })
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin', 'manager', 'accountant')
  async verifyCollection(
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @CurrentUserId() userId: string,
    @Body() dto: VerifyCollectionDto,
  ) {
    return this.transactionsService.verifyCollection(collectionId, userId, dto.notes);
  }

  // ============================================================================
  // Daily Summaries
  // ============================================================================

  @Get('daily-summaries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List daily transaction summaries' })
  @ApiResponse({ status: 200, description: 'Paginated list of daily summaries' })
  @ApiQuery({ name: 'machineId', required: false, description: 'Filter by machine UUID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async getDailySummaries(
    @CurrentOrganizationId() orgId: string,
    @Query() query: QueryDailySummariesDto,
  ) {
    return this.transactionsService.getDailySummaries(orgId, query);
  }

  @Post('daily-summaries/rebuild')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Rebuild daily summary from transactions' })
  @ApiResponse({ status: 200, description: 'Daily summary rebuilt' })
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin')
  async rebuildDailySummary(
    @CurrentOrganizationId() orgId: string,
    @Body() dto: RebuildDailySummaryDto,
  ) {
    return this.transactionsService.rebuildDailySummary(orgId, dto.date, dto.machineId);
  }

  // ============================================================================
  // Commissions
  // ============================================================================

  @Get('commissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List commissions' })
  @ApiResponse({ status: 200, description: 'Paginated list of commissions' })
  @ApiQuery({ name: 'contractId', required: false, description: 'Filter by contract UUID' })
  @ApiQuery({ name: 'status', required: false, enum: CommissionStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('owner', 'admin', 'accountant')
  async getCommissions(
    @CurrentOrganizationId() orgId: string,
    @Query() query: QueryCommissionsDto,
  ) {
    return this.transactionsService.getCommissions(orgId, query);
  }

  // ============================================================================
  // Transaction by ID (must be AFTER all named routes)
  // ============================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findById(id);
  }

  @Get('number/:number')
  @ApiOperation({ summary: 'Get transaction by number' })
  async findByNumber(@Param('number') number: string) {
    return this.transactionsService.findByNumber(number);
  }

  // ============================================================================
  // Refunds
  // ============================================================================

  @Post(':id/refund')
  @ApiOperation({ summary: 'Create refund for transaction' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async createRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.transactionsService.createRefund(id, body.amount, body.reason);
  }

  @Post('refunds/:refundId/process')
  @ApiOperation({ summary: 'Process refund' })
  @Roles('owner', 'admin', 'accountant')
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Param('refundId', ParseUUIDPipe) refundId: string,
    @Body() body: { success: boolean; referenceNumber?: string },
  ) {
    return this.transactionsService.processRefund(
      refundId,
      body.success,
      body.referenceNumber,
    );
  }

  // ============================================================================
  // Fiscalization
  // ============================================================================

  @Post(':id/fiscalize')
  @ApiOperation({ summary: 'Add fiscal data to transaction' })
  @Roles('owner', 'admin', 'accountant')
  @HttpCode(HttpStatus.OK)
  async fiscalize(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() fiscalData: Partial<{
      receiptNumber: string;
      fiscalSign: string;
      qrCode: string;
      ofdName: string;
    }>,
  ) {
    return this.transactionsService.fiscalize(id, fiscalData);
  }
}
