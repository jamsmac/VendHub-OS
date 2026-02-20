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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { WebhooksService, WebhookEvent } from "./webhooks.service";
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  FilterWebhooksDto,
  WebhookLogsQueryDto,
  TestWebhookDto,
} from "./dto";
import * as crypto from "crypto";

@ApiTags("webhooks")
@Controller("webhooks")
export class WebhooksController {
  // In-memory storage (would be database in production)
  private webhooks: Map<
    string,
    {
      id: string;
      organization_id: string;
      url: string;
      events: WebhookEvent[];
      secret: string;
      description?: string;
      is_active: boolean;
      createdAt: Date;
      last_triggered_at?: Date;
      failure_count: number;
    }
  > = new Map();

  constructor(private readonly webhooksService: WebhooksService) {}

  // ========================================================================
  // WEBHOOK MANAGEMENT (for organization admins)
  // ========================================================================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new webhook endpoint" })
  @ApiResponse({ status: 201, description: "Webhook created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  createWebhook(
    @Req() req: Request & { user: { organizationId: string } },
    @Body() dto: CreateWebhookDto,
  ) {
    const organization_id = req.user.organizationId;
    const id = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = {
      id,
      organization_id,
      url: dto.url,
      events: dto.events,
      secret,
      description: dto.description,
      is_active: dto.is_active ?? true,
      createdAt: new Date(),
      failure_count: 0,
    };

    this.webhooks.set(id, webhook);

    return {
      id,
      url: dto.url,
      events: dto.events,
      secret, // Only shown once on creation!
      description: dto.description,
      is_active: webhook.is_active,
      createdAt: webhook.createdAt,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all webhooks for organization" })
  @ApiResponse({ status: 200, description: "List of webhooks" })
  listWebhooks(
    @Req() req: Request & { user: { organizationId: string } },
    @Query() filter: FilterWebhooksDto,
  ) {
    const organization_id = req.user.organizationId;

    let orgWebhooks = Array.from(this.webhooks.values()).filter(
      (w) => w.organization_id === organization_id,
    );

    // Apply filters
    if (filter.is_active !== undefined) {
      orgWebhooks = orgWebhooks.filter((w) => w.is_active === filter.is_active);
    }

    if (filter.event) {
      orgWebhooks = orgWebhooks.filter((w) => w.events.includes(filter.event!));
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      orgWebhooks = orgWebhooks.filter(
        (w) =>
          w.url.toLowerCase().includes(searchLower) ||
          (w.description && w.description.toLowerCase().includes(searchLower)),
      );
    }

    // Pagination
    const total = orgWebhooks.length;
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;
    const paginatedWebhooks = orgWebhooks.slice(offset, offset + limit);

    return {
      webhooks: paginatedWebhooks.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        description: w.description,
        is_active: w.is_active,
        createdAt: w.createdAt,
        last_triggered_at: w.last_triggered_at,
        failure_count: w.failure_count,
      })),
      total,
      page,
      limit,
    };
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get webhook details" })
  @ApiResponse({ status: 200, description: "Webhook details" })
  @ApiResponse({ status: 400, description: "Webhook not found" })
  getWebhook(
    @Req() req: Request & { user: { organizationId: string } },
    @Param("id") id: string,
  ) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organization_id !== req.user.organizationId) {
      throw new BadRequestException("Webhook not found");
    }

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description,
      is_active: webhook.is_active,
      createdAt: webhook.createdAt,
      last_triggered_at: webhook.last_triggered_at,
      failure_count: webhook.failure_count,
    };
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update webhook" })
  @ApiResponse({ status: 200, description: "Webhook updated" })
  @ApiResponse({ status: 400, description: "Webhook not found" })
  updateWebhook(
    @Req() req: Request & { user: { organizationId: string } },
    @Param("id") id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organization_id !== req.user.organizationId) {
      throw new BadRequestException("Webhook not found");
    }

    const updated = {
      ...webhook,
      url: dto.url ?? webhook.url,
      events: dto.events ?? webhook.events,
      description: dto.description ?? webhook.description,
      is_active: dto.is_active ?? webhook.is_active,
    };

    this.webhooks.set(id, updated);

    return {
      id: updated.id,
      url: updated.url,
      events: updated.events,
      description: updated.description,
      is_active: updated.is_active,
    };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete webhook" })
  @ApiResponse({ status: 204, description: "Webhook deleted" })
  @ApiResponse({ status: 400, description: "Webhook not found" })
  deleteWebhook(
    @Req() req: Request & { user: { organizationId: string } },
    @Param("id") id: string,
  ) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organization_id !== req.user.organizationId) {
      throw new BadRequestException("Webhook not found");
    }

    this.webhooks.delete(id);
  }

  @Post(":id/regenerate-secret")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Regenerate webhook secret" })
  @ApiResponse({ status: 200, description: "New secret generated" })
  @ApiResponse({ status: 400, description: "Webhook not found" })
  regenerateSecret(
    @Req() req: Request & { user: { organizationId: string } },
    @Param("id") id: string,
  ) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organization_id !== req.user.organizationId) {
      throw new BadRequestException("Webhook not found");
    }

    const newSecret = crypto.randomBytes(32).toString("hex");
    webhook.secret = newSecret;
    this.webhooks.set(id, webhook);

    return {
      id: webhook.id,
      secret: newSecret, // Only shown once!
    };
  }

  @Post(":id/test")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send test webhook delivery" })
  @ApiResponse({ status: 200, description: "Test webhook sent" })
  @ApiResponse({ status: 400, description: "Webhook not found" })
  async testWebhook(
    @Req() req: Request & { user: { organizationId: string } },
    @Param("id") id: string,
    @Body() dto: TestWebhookDto,
  ) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organization_id !== req.user.organizationId) {
      throw new BadRequestException("Webhook not found");
    }

    const event = dto.event ?? WebhookEvent.MACHINE_STATUS_CHANGED;
    const payload = dto.payload ?? {
      test: true,
      message: "This is a test webhook",
      timestamp: new Date().toISOString(),
    };

    await this.webhooksService.send(webhook.organization_id, event, payload, [
      {
        url: webhook.url,
        events: webhook.events as string[],
        secret: webhook.secret,
        isActive: webhook.is_active,
      },
    ]);

    return { message: "Test webhook sent", event };
  }

  // ========================================================================
  // WEBHOOK EVENTS LIST
  // ========================================================================

  @Get("events/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List available webhook events" })
  @ApiResponse({ status: 200, description: "Available webhook events" })
  listEvents() {
    return {
      events: [
        {
          name: WebhookEvent.MACHINE_STATUS_CHANGED,
          description: "Machine status changed (online/offline/error)",
        },
        {
          name: WebhookEvent.INVENTORY_LOW,
          description: "Inventory level below threshold",
        },
        {
          name: WebhookEvent.TASK_CREATED,
          description: "New task created",
        },
        {
          name: WebhookEvent.TASK_COMPLETED,
          description: "Task completed",
        },
        {
          name: WebhookEvent.SALE_COMPLETED,
          description: "Sale/transaction completed",
        },
        {
          name: WebhookEvent.PAYMENT_RECEIVED,
          description: "Payment received",
        },
      ],
    };
  }

  // ========================================================================
  // WEBHOOK LOGS
  // ========================================================================

  @Get(":id/logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get webhook delivery logs" })
  @ApiResponse({ status: 200, description: "Webhook delivery logs" })
  @ApiResponse({ status: 400, description: "Webhook not found" })
  getWebhookLogs(
    @Req() req: Request & { user: { organizationId: string } },
    @Param("id") id: string,
    @Query() query: WebhookLogsQueryDto,
  ) {
    const webhook = this.webhooks.get(id);

    if (!webhook || webhook.organization_id !== req.user.organizationId) {
      throw new BadRequestException("Webhook not found");
    }

    // In production, fetch from database with query filters applied
    return {
      logs: [],
      total: 0,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    };
  }
}
