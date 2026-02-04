/**
 * Telegram Payments Controller
 * API endpoints для Telegram Bot Payments
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TelegramPaymentsService } from './telegram-payments.service';
import {
  CreateInvoiceDto,
  CreateInvoiceLinkDto,
  PreCheckoutQueryDto,
  SuccessfulPaymentDto,
  RefundPaymentDto,
  PaymentFilterDto,
  InvoiceResponseDto,
  PaymentDto,
  PaymentListDto,
  PaymentStatsDto,
  WebhookResponseDto,
} from './dto/telegram-payment.dto';

@ApiTags('Telegram Payments')
@Controller('telegram-payments')
export class TelegramPaymentsController {
  constructor(private readonly paymentsService: TelegramPaymentsService) {}

  private validateWebhookSecret(secretToken: string): void {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expectedSecret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }
    if (secretToken !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  @Post('invoice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create invoice',
    description: 'Создать инвойс для оплаты заказа через Telegram',
  })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  async createInvoice(
    @CurrentUser() user: User,
    @Body() dto: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.paymentsService.createInvoice(user.id, user.organizationId, dto);
  }

  @Post('invoice-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create invoice link',
    description: 'Создать ссылку на инвойс',
  })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  async createInvoiceLink(
    @CurrentUser() user: User,
    @Body() dto: CreateInvoiceLinkDto,
  ): Promise<InvoiceResponseDto> {
    return this.paymentsService.createInvoiceLink(user.id, user.organizationId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my payments',
    description: 'Получить мои платежи',
  })
  @ApiResponse({ status: 200, type: PaymentListDto })
  async getMyPayments(
    @CurrentUser() user: User,
    @Query() filter: PaymentFilterDto,
  ): Promise<PaymentListDto> {
    return this.paymentsService.getUserPayments(user.id, filter);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my payment by ID',
    description: 'Получить мой платеж по ID',
  })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, type: PaymentDto })
  async getMyPayment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentDto> {
    return this.paymentsService.getPayment(id, user.organizationId);
  }

  // ============================================================================
  // WEBHOOK ENDPOINTS (No Auth - Telegram Bot API)
  // ============================================================================

  @Post('webhook/pre-checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pre-checkout query webhook',
    description: 'Webhook для pre_checkout_query от Telegram',
  })
  @ApiResponse({ status: 200, type: WebhookResponseDto })
  async handlePreCheckout(
    @Headers('x-telegram-bot-api-secret-token') secretToken: string,
    @Body() dto: PreCheckoutQueryDto,
  ): Promise<WebhookResponseDto> {
    this.validateWebhookSecret(secretToken);
    const result = await this.paymentsService.handlePreCheckoutQuery(dto);
    return { success: result.ok, message: result.errorMessage };
  }

  @Post('webhook/successful-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Successful payment webhook',
    description: 'Webhook для successful_payment от Telegram',
  })
  @ApiResponse({ status: 200, type: PaymentDto })
  async handleSuccessfulPayment(
    @Headers('x-telegram-bot-api-secret-token') secretToken: string,
    @Body() body: { telegramUserId: number; payment: SuccessfulPaymentDto },
  ): Promise<PaymentDto> {
    this.validateWebhookSecret(secretToken);
    return this.paymentsService.handleSuccessfulPayment(
      body.telegramUserId,
      body.payment,
    );
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'accountant')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all payments',
    description: 'Получить все платежи организации (admin)',
  })
  @ApiResponse({ status: 200, type: PaymentListDto })
  async getPayments(
    @CurrentUser() user: User,
    @Query() filter: PaymentFilterDto,
  ): Promise<PaymentListDto> {
    return this.paymentsService.getPayments(filter, user.organizationId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'accountant')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment statistics',
    description: 'Получить статистику платежей',
  })
  @ApiResponse({ status: 200, type: PaymentStatsDto })
  async getStats(
    @CurrentUser() user: User,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<PaymentStatsDto> {
    return this.paymentsService.getStats(
      user.organizationId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'accountant')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Получить платеж по ID (admin)',
  })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, type: PaymentDto })
  async getPayment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentDto> {
    return this.paymentsService.getPayment(id, user.organizationId);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refund payment',
    description: 'Возврат платежа',
  })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, type: PaymentDto })
  async refundPayment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<RefundPaymentDto>,
  ): Promise<PaymentDto> {
    return this.paymentsService.refundPayment(user.organizationId, {
      paymentId: id,
      ...dto,
    });
  }
}
