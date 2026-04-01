import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { WarehouseService } from "./warehouse.service";
import { StockTakeService } from "./stock-take.service";
import { InventoryBatchService } from "./services/inventory-batch.service";
import { StockReservationService } from "./services/stock-reservation.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CurrentOrganizationId } from "../../common/decorators/current-user.decorator";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
} from "./dto/create-warehouse.dto";
import { CreateStockMovementDto } from "./dto/create-stock-movement.dto";
import { CreateInventoryBatchDto } from "./dto/create-inventory-batch.dto";
import {
  TransferStockDto,
  DepleteFromBatchDto,
} from "./dto/warehouse-operations.dto";
import {
  CreateReservationDto,
  WarehouseFulfillReservationDto,
  WarehouseCancelReservationDto,
  QuarantineBatchDto,
} from "./dto/stock-reservation.dto";
import {
  WarehouseType,
  StockMovementType,
  StockMovementStatus,
} from "./entities/warehouse.entity";
import { resolveOrganizationId } from "../../common/utils";

@ApiTags("warehouses")
@Controller("warehouses")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarehouseController {
  constructor(
    private readonly warehouseService: WarehouseService,
    private readonly stockTakeService: StockTakeService,
    private readonly inventoryBatchService: InventoryBatchService,
    private readonly stockReservationService: StockReservationService,
  ) {}

  // ============================================================================
  // WAREHOUSE CRUD
  // ============================================================================

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new warehouse" })
  @ApiResponse({ status: 201, description: "Warehouse created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: User) {
    const organizationId = resolveOrganizationId(user, dto.organizationId);
    return this.warehouseService.create({ ...dto, organizationId }, user.id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get all warehouses with pagination and filters" })
  @ApiResponse({ status: 200, description: "List of warehouses" })
  @ApiQuery({ name: "type", required: false, enum: WarehouseType })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(
    @CurrentUser() user: User,
    @Query("type") type?: WarehouseType,
    @Query("isActive") isActive?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.warehouseService.findAll(user.organizationId, {
      type,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get warehouse by ID" })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "Warehouse found" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const orgId =
      user.role === UserRole.OWNER ? undefined : user.organizationId;
    return this.warehouseService.findById(id, orgId);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update warehouse" })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "Warehouse updated" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.warehouseService.update(id, dto, user.organizationId, user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Delete warehouse (soft delete)" })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "Warehouse deleted" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.verifyWarehouseAccess(id, user);
    await this.warehouseService.remove(id, user.organizationId);
  }

  // ============================================================================
  // WAREHOUSE INVENTORY (stock overview per warehouse)
  // ============================================================================

  @Get(":id/stock")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({
    summary: "Get current inventory for a warehouse (aggregated by product)",
  })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "Warehouse inventory" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async getWarehouseStock(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.warehouseService.getWarehouseInventory(id, user.organizationId);
  }

  @Get(":id/stock/summary")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get stock summary with expiry stats" })
  @ApiParam({ name: "id", description: "Warehouse UUID", format: "uuid" })
  @ApiResponse({ status: 200, description: "Stock summary" })
  async getStockSummary(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.inventoryBatchService.getStockSummary(id, user.organizationId);
  }

  // ============================================================================
  // STOCK MOVEMENTS
  // ============================================================================

  @Get(":id/movements")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get stock movements for a warehouse" })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiQuery({ name: "productId", required: false, type: String })
  @ApiQuery({ name: "type", required: false, enum: StockMovementType })
  @ApiQuery({ name: "status", required: false, enum: StockMovementStatus })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Stock movements list" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async getMovements(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query("productId") productId?: string,
    @Query("type") type?: StockMovementType,
    @Query("status") status?: StockMovementStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.stockTakeService.getMovements(user.organizationId, {
      warehouseId: id,
      productId,
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(":id/movements")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new stock movement for a warehouse" })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 201, description: "Stock movement created" })
  @ApiResponse({ status: 400, description: "Validation error" })
  async createMovement(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    const movementDto: CreateStockMovementDto = {
      ...dto,
      organizationId: user.organizationId,
    };
    return this.stockTakeService.createMovement(movementDto, user.id);
  }

  @Patch("movements/:movementId/complete")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Complete a pending stock movement" })
  @ApiParam({
    name: "movementId",
    description: "Stock movement UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "Movement completed" })
  @ApiResponse({
    status: 400,
    description: "Movement already completed or cancelled",
  })
  @ApiResponse({ status: 404, description: "Movement not found" })
  async completeMovement(
    @Param("movementId", ParseUUIDPipe) movementId: string,
    @CurrentUser() user: User,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.stockTakeService.completeMovement(
      movementId,
      user.id,
      organizationId,
    );
  }

  @Patch("movements/:movementId/cancel")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Cancel a pending stock movement" })
  @ApiParam({
    name: "movementId",
    description: "Stock movement UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "Movement cancelled" })
  @ApiResponse({
    status: 400,
    description: "Movement already completed or cancelled",
  })
  @ApiResponse({ status: 404, description: "Movement not found" })
  async cancelMovement(
    @Param("movementId", ParseUUIDPipe) movementId: string,
    @CurrentUser() user: User,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.stockTakeService.cancelMovement(
      movementId,
      user.id,
      organizationId,
    );
  }

  @Post(":id/transfer")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Transfer stock from this warehouse to another" })
  @ApiParam({
    name: "id",
    description: "Source warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 201, description: "Stock transfer initiated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async transferStock(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TransferStockDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.warehouseService.transferStock(
      user.organizationId,
      id,
      dto.toWarehouseId,
      dto.productId,
      dto.quantity,
      user.id,
      {
        referenceNumber: dto.referenceNumber,
        cost: dto.cost,
        notes: dto.notes,
      },
    );
  }

  // ============================================================================
  // INVENTORY BATCHES
  // ============================================================================

  @Get(":id/batches")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get inventory batches for a warehouse" })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiQuery({ name: "productId", required: false, type: String })
  @ApiQuery({ name: "onlyAvailable", required: false, type: Boolean })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Inventory batches list" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async getBatches(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query("productId") productId?: string,
    @Query("onlyAvailable") onlyAvailable?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.stockTakeService.getBatches(user.organizationId, {
      warehouseId: id,
      productId,
      onlyAvailable: onlyAvailable === "true",
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(":id/batches")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new inventory batch in a warehouse" })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 201, description: "Inventory batch created" })
  @ApiResponse({ status: 400, description: "Validation error" })
  async createBatch(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateInventoryBatchDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    const batchDto: CreateInventoryBatchDto = {
      ...dto,
      warehouseId: id,
      organizationId: user.organizationId,
    };
    return this.stockTakeService.createBatch(batchDto, user.id);
  }

  @Post(":id/batches/deplete")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Deplete stock from batches using FIFO strategy" })
  @ApiParam({
    name: "id",
    description: "Warehouse UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "Stock depleted successfully" })
  @ApiResponse({
    status: 400,
    description: "Insufficient stock or validation error",
  })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async depleteFromBatch(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: DepleteFromBatchDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.stockTakeService.depleteFromBatch(
      id,
      body.productId,
      user.organizationId,
      body.quantity,
      user.id,
    );
  }

  // ============================================================================
  // BATCH EXPIRY & QUARANTINE
  // ============================================================================

  @Get(":id/batches/expiring")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get batches expiring within N days" })
  @ApiParam({ name: "id", description: "Warehouse UUID", format: "uuid" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Threshold days (default 30)",
  })
  @ApiResponse({ status: 200, description: "Expiring batches" })
  async getExpiringBatches(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query("days") days?: string,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.inventoryBatchService.getExpiringBatches(
      id,
      user.organizationId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get(":id/batches/expired")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get already-expired batches" })
  @ApiParam({ name: "id", description: "Warehouse UUID", format: "uuid" })
  @ApiResponse({ status: 200, description: "Expired batches" })
  async getExpiredBatches(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.inventoryBatchService.getExpiredBatches(
      id,
      user.organizationId,
    );
  }

  @Post(":id/batches/write-off-expired")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Write off all expired stock in warehouse" })
  @ApiParam({ name: "id", description: "Warehouse UUID", format: "uuid" })
  @ApiResponse({ status: 200, description: "Expired stock written off" })
  async writeOffExpiredStock(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.inventoryBatchService.writeOffExpiredStock(
      id,
      user.organizationId,
      user.id,
    );
  }

  @Post("batches/:batchId/quarantine")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Quarantine a batch" })
  @ApiParam({ name: "batchId", description: "Batch UUID", format: "uuid" })
  @ApiResponse({ status: 200, description: "Batch quarantined" })
  async quarantineBatch(
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @Body() dto: QuarantineBatchDto,
    @CurrentUser() user: User,
  ) {
    return this.inventoryBatchService.quarantineBatch(
      batchId,
      user.organizationId,
      dto.reason,
      user.id,
    );
  }

  @Post("batches/:batchId/release-quarantine")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Release a batch from quarantine" })
  @ApiParam({ name: "batchId", description: "Batch UUID", format: "uuid" })
  @ApiResponse({ status: 200, description: "Batch released from quarantine" })
  async releaseFromQuarantine(
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @CurrentUser() user: User,
  ) {
    return this.inventoryBatchService.releaseFromQuarantine(
      batchId,
      user.organizationId,
      user.id,
    );
  }

  // ============================================================================
  // STOCK RESERVATIONS
  // ============================================================================

  @Get(":id/reservations")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get active reservations for a warehouse" })
  @ApiParam({ name: "id", description: "Warehouse UUID", format: "uuid" })
  @ApiQuery({ name: "productId", required: false, type: String })
  @ApiResponse({ status: 200, description: "Active reservations" })
  async getActiveReservations(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query("productId") productId?: string,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.stockReservationService.getActiveReservations(
      id,
      user.organizationId,
      productId,
    );
  }

  @Post(":id/reservations")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a stock reservation" })
  @ApiParam({ name: "id", description: "Warehouse UUID", format: "uuid" })
  @ApiResponse({ status: 201, description: "Reservation created" })
  @ApiResponse({ status: 400, description: "Insufficient stock" })
  async createReservation(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.stockReservationService.createReservation(
      user.organizationId,
      id,
      dto.productId,
      dto.quantity,
      dto.unit,
      dto.reservedFor,
      user.id,
      {
        batchId: dto.batchId,
        expiresInHours: dto.expiresInHours,
        notes: dto.notes,
      },
    );
  }

  @Patch("reservations/:reservationId/confirm")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Confirm a pending reservation" })
  @ApiParam({ name: "reservationId", format: "uuid" })
  @ApiResponse({ status: 200, description: "Reservation confirmed" })
  async confirmReservation(
    @Param("reservationId", ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: User,
  ) {
    return this.stockReservationService.confirmReservation(
      reservationId,
      user.organizationId,
      user.id,
    );
  }

  @Patch("reservations/:reservationId/fulfill")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Fulfill (partially or fully) a reservation" })
  @ApiParam({ name: "reservationId", format: "uuid" })
  @ApiResponse({ status: 200, description: "Reservation fulfilled" })
  async fulfillReservation(
    @Param("reservationId", ParseUUIDPipe) reservationId: string,
    @Body() dto: WarehouseFulfillReservationDto,
    @CurrentUser() user: User,
  ) {
    return this.stockReservationService.fulfillReservation(
      reservationId,
      user.organizationId,
      dto.quantity,
      user.id,
    );
  }

  @Patch("reservations/:reservationId/cancel")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Cancel a reservation" })
  @ApiParam({ name: "reservationId", format: "uuid" })
  @ApiResponse({ status: 200, description: "Reservation cancelled" })
  async cancelReservation(
    @Param("reservationId", ParseUUIDPipe) reservationId: string,
    @Body() dto: WarehouseCancelReservationDto,
    @CurrentUser() user: User,
  ) {
    return this.stockReservationService.cancelReservation(
      reservationId,
      user.organizationId,
      user.id,
      dto.reason,
    );
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async verifyWarehouseAccess(
    warehouseId: string,
    user: User,
  ): Promise<void> {
    const orgId =
      user.role === UserRole.OWNER ? undefined : user.organizationId;
    const warehouse = await this.warehouseService.findById(warehouseId, orgId);
    if (!warehouse) {
      throw new ForbiddenException("Access denied to this warehouse");
    }
  }
}
