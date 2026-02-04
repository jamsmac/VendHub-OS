/**
 * Webhooks Controller
 * Manages webhook endpoints and receives incoming webhooks
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { WebhooksService, WebhookEvent } from './webhooks.service';
import * as crypto from 'crypto';

// DTOs
class CreateWebhookDto {
  url: string;
  events: WebhookEvent[];
  description?: string;
  isActive?: boolean;
}

class UpdateWebhookDto {
  url?: string;
  events?: WebhookEvent[];
  description?: string;
  isActive?: boolean;
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  // In-memory storage (would be database in production)
  private webhooks: Map<
    string,
    {
      id: string;
      organizationId: string;
      url: string;
      events: WebhookEvent[];
      secret: string;
      description?: string;
      isActive: boolean;
      createdAt: Date;
      lastTriggeredAt?: Date;
      failureCount: number;
    }
  > = new Map();

  constructor(private readonly webhooksService: WebhooksService) {}

  // ========================================================================
  // WEBHOOK MANAGEMENT (for organization admins)
  // ========================================================================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  createWebhook(@Req() req: any, @Body() dto: CreateWebhookDto) {
    const organizationId = req.user.organizationId;
    const id = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = {
      id,
      organizationId,
      url: dto.url,
      events: dto.events,
      secret,
      description: dto.description,
      isActive: dto.isActive ?? true,
      createdAt: new Date(),
      failureCount: 0,
    };

    this.webhooks.set(id, webhook);

    return {
      id,
      url: dto.url,
      events: dto.events,
      secret, // Only shown once on creation!
      description: dto.description,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all webhooks for organization' })
  listWebhooks(@Req() req: any) {
    const organizationId = req.user.organizationId;

    const orgWebhooks = Array.from(this.webhooks.values())
      .filter((w) => w.organizationId === organizationId)
      .map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        description: w.description,
        isActive: w.isActive,
        createdAt: w.createdAt,
        lastTriggeredAt: w.lastTriggeredAt,
        failureCount: w.failureCount,
      }));

    return {
      webhooks: orgWebhooks,
      total: orgWebhooks.length,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook details' })
  getWebhook(@Req() req: any, @Param('id') id: string) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organizationId !== req.user.organizationId) {
      throw new BadRequestException('Webhook not found');
    }

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
      lastTriggeredAt: webhook.lastTriggeredAt,
      failureCount: webhook.failureCount,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update webhook' })
  updateWebhook(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organizationId !== req.user.organizationId) {
      throw new BadRequestException('Webhook not found');
    }

    const updated = {
      ...webhook,
      url: dto.url ?? webhook.url,
      events: dto.events ?? webhook.events,
      description: dto.description ?? webhook.description,
      isActive: dto.isActive ?? webhook.isActive,
    };

    this.webhooks.set(id, updated);

    return {
      id: updated.id,
      url: updated.url,
      events: updated.events,
      description: updated.description,
      isActive: updated.isActive,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook' })
  deleteWebhook(@Req() req: any, @Param('id') id: string) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organizationId !== req.user.organizationId) {
      throw new BadRequestException('Webhook not found');
    }

    this.webhooks.delete(id);
  }

  @Post(':id/regenerate-secret')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  regenerateSecret(@Req() req: any, @Param('id') id: string) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organizationId !== req.user.organizationId) {
      throw new BadRequestException('Webhook not found');
    }

    const newSecret = crypto.randomBytes(32).toString('hex');
    webhook.secret = newSecret;
    this.webhooks.set(id, webhook);

    return {
      id: webhook.id,
      secret: newSecret, // Only shown once!
    };
  }

  @Post(':id/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send test webhook' })
  async testWebhook(@Req() req: any, @Param('id') id: string) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organizationId !== req.user.organizationId) {
      throw new BadRequestException('Webhook not found');
    }

    await this.webhooksService.send(
      webhook.organizationId,
      WebhookEvent.MACHINE_STATUS_CHANGED,
      {
        test: true,
        message: 'This is a test webhook',
        timestamp: new Date().toISOString(),
      },
      [webhook],
    );

    return { message: 'Test webhook sent' };
  }

  // ========================================================================
  // WEBHOOK EVENTS LIST
  // ========================================================================

  @Get('events/list')
  @ApiOperation({ summary: 'List available webhook events' })
  listEvents() {
    return {
      events: [
        {
          name: WebhookEvent.MACHINE_STATUS_CHANGED,
          description: 'Machine status changed (online/offline/error)',
        },
        {
          name: WebhookEvent.INVENTORY_LOW,
          description: 'Inventory level below threshold',
        },
        {
          name: WebhookEvent.TASK_CREATED,
          description: 'New task created',
        },
        {
          name: WebhookEvent.TASK_COMPLETED,
          description: 'Task completed',
        },
        {
          name: WebhookEvent.SALE_COMPLETED,
          description: 'Sale/transaction completed',
        },
        {
          name: WebhookEvent.PAYMENT_RECEIVED,
          description: 'Payment received',
        },
      ],
    };
  }

  // ========================================================================
  // INCOMING WEBHOOKS (from external services)
  // ========================================================================

  @Post('incoming/payme')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payme payment callback' })
  async paymeCallback(
    @Body() body: any,
    @Headers('authorization') _auth: string,
  ) {
    // Validate Basic auth header
    // Process Payme callback
    return {
      jsonrpc: '2.0',
      id: body.id,
      result: { allow: true },
    };
  }

  @Post('incoming/click/prepare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Click prepare callback' })
  async clickPrepare(@Body() body: any) {
    // Process Click prepare request
    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_prepare_id: Date.now(),
      error: 0,
      error_note: 'Success',
    };
  }

  @Post('incoming/click/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Click complete callback' })
  async clickComplete(@Body() body: any) {
    // Process Click complete request
    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_confirm_id: Date.now(),
      error: 0,
      error_note: 'Success',
    };
  }

  @Post('incoming/uzum')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Uzum Bank callback' })
  async uzumCallback(@Body() _body: any) {
    // Process Uzum callback
    return { success: true };
  }

  // ========================================================================
  // WEBHOOK LOGS
  // ========================================================================

  @Get(':id/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook delivery logs' })
  getWebhookLogs(
    @Req() req: any,
    @Param('id') id: string,
    @Query('limit') _limit = 50,
  ) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organizationId !== req.user.organizationId) {
      throw new BadRequestException('Webhook not found');
    }

    // In production, fetch from database
    return {
      logs: [],
      total: 0,
    };
  }
}
