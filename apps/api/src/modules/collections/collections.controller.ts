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
import { ApiTags, ApiOperation } from "@nestjs/swagger";
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
import {
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";

@ApiTags("Collections")
@Controller("collections")
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  // ── LIST ──────────────────────────────────────────────
  // Roles: ALL (operators see only their own via IDOR guard in service)
  @ApiOperation({ summary: "List all collections with optional filters" })
  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: CollectionQueryDto,
  ) {
    return this.collectionsService.findAll(organizationId, query);
  }

  // ── PENDING (Stage 1 waiting for Stage 2) ─────────────
  // Roles: MANAGER, ADMIN
  @ApiOperation({
    summary: "Get pending collections awaiting stage 2 processing",
  })
  @Get("pending")
  findPending(@CurrentOrganizationId() organizationId: string) {
    return this.collectionsService.findPending(organizationId);
  }

  // ── MY COLLECTIONS TODAY ──────────────────────────────
  // Roles: ALL
  @ApiOperation({ summary: "Get collections created by the current operator" })
  @Get("my")
  findMy(@CurrentUserId() operatorId: string) {
    return this.collectionsService.findByOperator(operatorId);
  }

  // ── STATS ─────────────────────────────────────────────
  // Roles: MANAGER, ADMIN
  @ApiOperation({ summary: "Get collection statistics for the organization" })
  @Get("stats")
  getStats(@CurrentOrganizationId() organizationId: string) {
    return this.collectionsService.getStats(organizationId);
  }

  // ── SINGLE ────────────────────────────────────────────
  // Roles: ALL (IDOR guard for operators in findOne)
  @ApiOperation({ summary: "Get a specific collection by ID" })
  @Get(":id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.collectionsService.findOne(id, organizationId);
  }

  // ── HISTORY (audit trail) ─────────────────────────────
  // Roles: MANAGER, ADMIN
  @ApiOperation({ summary: "Get audit history for a specific collection" })
  @Get(":id/history")
  getHistory(@Param("id", ParseUUIDPipe) id: string) {
    return this.collectionsService.getHistory(id);
  }

  // ── CREATE (Stage 1) ──────────────────────────────────
  // Roles: OPERATOR
  @ApiOperation({ summary: "Create a new collection (stage 1)" })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() operatorId: string,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collectionsService.create(organizationId, operatorId, dto);
  }

  // ── BULK CREATE (historical import) ───────────────────
  // Roles: MANAGER, ADMIN
  @ApiOperation({ summary: "Bulk create collections for historical import" })
  @Post("bulk")
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkCreateCollectionDto,
  ) {
    return this.collectionsService.bulkCreate(organizationId, userId, dto);
  }

  // ── RECEIVE (Stage 2) ─────────────────────────────────
  // Roles: MANAGER, ADMIN
  @ApiOperation({ summary: "Receive a collection (stage 2 processing)" })
  @Patch(":id/receive")
  receive(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() managerId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReceiveCollectionDto,
  ) {
    return this.collectionsService.receive(id, organizationId, managerId, dto);
  }

  // ── EDIT ──────────────────────────────────────────────
  // Roles: MANAGER, ADMIN
  @ApiOperation({ summary: "Edit an existing collection" })
  @Patch(":id/edit")
  edit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EditCollectionDto,
  ) {
    return this.collectionsService.edit(id, organizationId, userId, dto);
  }

  // ── CANCEL ────────────────────────────────────────────
  // Roles: MANAGER, ADMIN
  @ApiOperation({ summary: "Cancel a collection with optional notes" })
  @Patch(":id/cancel")
  cancel(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelCollectionDto,
  ) {
    return this.collectionsService.cancel(id, organizationId, userId, dto);
  }

  // ── BULK CANCEL ───────────────────────────────────────
  // Roles: MANAGER, ADMIN
  @ApiOperation({ summary: "Bulk cancel multiple collections" })
  @Patch("bulk-cancel")
  bulkCancel(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkCancelCollectionDto,
  ) {
    return this.collectionsService.bulkCancel(organizationId, userId, dto);
  }

  // ── HARD DELETE ───────────────────────────────────────
  // Roles: ADMIN only
  @ApiOperation({ summary: "Permanently delete a collection (admin only)" })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.collectionsService.remove(id, organizationId, userId);
  }
}
