/**
 * VHM24 Integration Controller
 * Webhook endpoint + machine sync + task verification management.
 */

import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import {
  Vhm24IntegrationService,
  WebhookPayload,
} from "./vhm24-integration.service";
import { TripReconciliationService } from "./services/trip-reconciliation.service";
import {
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { SyncMachinesDto } from "./dto/sync-machines.dto";
import { LinkTasksDto } from "./dto/link-tasks.dto";
import { ManualVerifyDto } from "./dto/manual-verify.dto";
import { ResolveReconciliationDto } from "./dto/resolve-reconciliation.dto";

@ApiTags("VHM24 Integration")
@ApiBearerAuth()
@Controller("integration/vhm24")
@Roles("owner", "admin", "manager")
export class Vhm24IntegrationController {
  constructor(
    private readonly integrationService: Vhm24IntegrationService,
    private readonly reconciliationService: TripReconciliationService,
  ) {}

  // ── Webhook ─────────────────────────────────────────

  @ApiOperation({ summary: "Handle VHM24 webhook events" })
  @ApiOkResponse({ description: "Webhook event processed successfully" })
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @CurrentOrganizationId() organizationId: string,
    @Body() payload: WebhookPayload,
  ) {
    return this.integrationService.handleWebhook(organizationId, payload);
  }

  // ── Machine Sync ────────────────────────────────────

  @ApiOperation({ summary: "Synchronize machine data from VHM24" })
  @ApiCreatedResponse({ description: "Machine data synchronized successfully" })
  @Post("sync/machines")
  syncMachines(
    @CurrentOrganizationId() organizationId: string,
    @Body() body: SyncMachinesDto,
  ) {
    return this.integrationService.syncMachines(organizationId, body.machines);
  }

  // ── Task Linking ────────────────────────────────────

  @ApiOperation({ summary: "Link VHM24 tasks to a trip" })
  @ApiCreatedResponse({ description: "Tasks linked to trip successfully" })
  @Post("trips/:tripId/tasks")
  linkTasks(
    @Param("tripId", ParseUUIDPipe) tripId: string,
    @Body() body: LinkTasksDto,
  ) {
    return this.integrationService.linkTasksToTrip(tripId, body.tasks);
  }

  // ── Manual Verification ─────────────────────────────

  @ApiOperation({ summary: "Manually verify a task link" })
  @ApiOkResponse({ description: "Task link verified successfully" })
  @Patch("task-links/:id/verify")
  manualVerify(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ManualVerifyDto,
  ) {
    return this.integrationService.manualVerifyTask(
      id,
      userId,
      body.status,
      body.notes,
    );
  }

  // ── Reconciliation ──────────────────────────────────

  @ApiOperation({ summary: "Reconcile a trip with VHM24 data" })
  @ApiCreatedResponse({ description: "Trip reconciliation completed" })
  @Post("trips/:tripId/reconcile")
  reconcileTrip(
    @CurrentOrganizationId() organizationId: string,
    @Param("tripId", ParseUUIDPipe) tripId: string,
  ) {
    return this.reconciliationService.reconcileTrip(tripId, organizationId);
  }

  @ApiOperation({ summary: "Resolve a reconciliation discrepancy" })
  @ApiOkResponse({ description: "Reconciliation discrepancy resolved" })
  @Patch("reconciliations/:id/resolve")
  resolveReconciliation(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ResolveReconciliationDto,
  ) {
    return this.reconciliationService.resolve(id, userId, body.notes);
  }
}
