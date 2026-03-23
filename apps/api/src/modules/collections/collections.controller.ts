/**
 * Collections Controller
 * API endpoints for two-stage cash collection workflow
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CollectionsService } from "./collections.service";
import {
  CreateCollectionDto,
  ReceiveCollectionDto,
  EditCollectionDto,
  CancelCollectionDto,
  BulkCreateCollectionDto,
  BulkCancelCollectionDto,
  CollectionQueryDto,
} from "./dto/collection.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";

@ApiTags("Collections")
@ApiBearerAuth()
@Controller("collections")
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  // ── LIST ──────────────────────────────────────────────
  @ApiOperation({ summary: "List all collections with optional filters" })
  @Get()
  @Roles("owner", "admin", "manager", "operator", "accountant")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: CollectionQueryDto,
  ) {
    return this.collectionsService.findAll(organizationId, query);
  }

  // ── PENDING (Stage 1 waiting for Stage 2) ─────────────
  @ApiOperation({
    summary: "Get pending collections awaiting stage 2 processing",
  })
  @Get("pending")
  @Roles("owner", "admin", "manager")
  findPending(@CurrentOrganizationId() organizationId: string) {
    return this.collectionsService.findPending(organizationId);
  }

  // ── MY COLLECTIONS TODAY ──────────────────────────────
  @ApiOperation({ summary: "Get collections created by the current operator" })
  @Get("my")
  @Roles("owner", "admin", "manager", "operator")
  findMy(
    @CurrentUserId() operatorId: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.collectionsService.findByOperator(operatorId, organizationId);
  }

  // ── STATS ─────────────────────────────────────────────
  @ApiOperation({ summary: "Get collection statistics for the organization" })
  @Get("stats")
  @Roles("owner", "admin", "manager")
  getStats(@CurrentOrganizationId() organizationId: string) {
    return this.collectionsService.getStats(organizationId);
  }

  // ── SINGLE ────────────────────────────────────────────
  @ApiOperation({ summary: "Get a specific collection by ID" })
  @Get(":id")
  @Roles("owner", "admin", "manager", "operator", "accountant")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.collectionsService.findOne(id, organizationId);
  }

  // ── HISTORY (audit trail) ─────────────────────────────
  @ApiOperation({ summary: "Get audit history for a specific collection" })
  @Get(":id/history")
  @Roles("owner", "admin", "manager")
  getHistory(@Param("id", ParseUUIDPipe) id: string) {
    return this.collectionsService.getHistory(id);
  }

  // ── CREATE (Stage 1) ──────────────────────────────────
  @ApiOperation({ summary: "Create a new collection (stage 1)" })
  @Post()
  @Roles("owner", "admin", "manager", "operator")
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() operatorId: string,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collectionsService.create(organizationId, operatorId, dto);
  }

  // ── BULK CREATE (historical import) ───────────────────
  @ApiOperation({ summary: "Bulk create collections for historical import" })
  @Post("bulk")
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkCreateCollectionDto,
  ) {
    return this.collectionsService.bulkCreate(organizationId, userId, dto);
  }

  // ── RECEIVE (Stage 2) ─────────────────────────────────
  @ApiOperation({ summary: "Receive a collection (stage 2 processing)" })
  @Patch(":id/receive")
  @Roles("owner", "admin", "manager")
  receive(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() managerId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReceiveCollectionDto,
  ) {
    return this.collectionsService.receive(id, organizationId, managerId, dto);
  }

  // ── EDIT ──────────────────────────────────────────────
  @ApiOperation({ summary: "Edit an existing collection" })
  @Patch(":id/edit")
  @Roles("owner", "admin", "manager")
  edit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EditCollectionDto,
  ) {
    return this.collectionsService.edit(id, organizationId, userId, dto);
  }

  // ── CANCEL ────────────────────────────────────────────
  @ApiOperation({ summary: "Cancel a collection with optional notes" })
  @Patch(":id/cancel")
  @Roles("owner", "admin", "manager")
  cancel(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelCollectionDto,
  ) {
    return this.collectionsService.cancel(id, organizationId, userId, dto);
  }

  // ── BULK CANCEL ───────────────────────────────────────
  @ApiOperation({ summary: "Bulk cancel multiple collections" })
  @Patch("bulk-cancel")
  @Roles("owner", "admin", "manager")
  bulkCancel(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkCancelCollectionDto,
  ) {
    return this.collectionsService.bulkCancel(organizationId, userId, dto);
  }

  // ── HARD DELETE ───────────────────────────────────────
  @ApiOperation({ summary: "Permanently delete a collection (admin only)" })
  @Delete(":id")
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.collectionsService.remove(id, organizationId, userId);
  }
}
