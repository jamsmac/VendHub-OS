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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { StockTakeService } from './stock-take.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/create-warehouse.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateInventoryBatchDto } from './dto/create-inventory-batch.dto';
import {
  WarehouseType,
  StockMovementType,
  StockMovementStatus,
} from './entities/warehouse.entity';

@ApiTags('warehouses')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarehouseController {
  constructor(
    private readonly warehouseService: WarehouseService,
    private readonly stockTakeService: StockTakeService,
  ) {}

  // ============================================================================
  // WAREHOUSE CRUD
  // ============================================================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: User) {
    const organizationId = dto.organizationId || user.organizationId;
    return this.warehouseService.create(
      { ...dto, organizationId },
      user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all warehouses with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of warehouses' })
  @ApiQuery({ name: 'type', required: false, enum: WarehouseType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: User,
    @Query('type') type?: WarehouseType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehouseService.findAll(user.organizationId, {
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Warehouse found' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const warehouse = await this.warehouseService.findById(id);
    if (warehouse && warehouse.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this warehouse');
      }
    }
    return warehouse;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.warehouseService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete warehouse (soft delete)' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.warehouseService.remove(id);
  }

  // ============================================================================
  // WAREHOUSE INVENTORY (stock overview per warehouse)
  // ============================================================================

  @Get(':id/stock')
  @ApiOperation({ summary: 'Get current inventory for a warehouse (aggregated by product)' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Warehouse inventory' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async getWarehouseStock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.warehouseService.getWarehouseInventory(id, user.organizationId);
  }

  // ============================================================================
  // STOCK MOVEMENTS
  // ============================================================================

  @Get(':id/movements')
  @ApiOperation({ summary: 'Get stock movements for a warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: StockMovementType })
  @ApiQuery({ name: 'status', required: false, enum: StockMovementStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Stock movements list' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async getMovements(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('productId') productId?: string,
    @Query('type') type?: StockMovementType,
    @Query('status') status?: StockMovementStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
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

  @Post(':id/movements')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new stock movement for a warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Stock movement created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createMovement(
    @Param('id', ParseUUIDPipe) id: string,
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

  @Patch('movements/:movementId/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Complete a pending stock movement' })
  @ApiParam({ name: 'movementId', description: 'Stock movement UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Movement completed' })
  @ApiResponse({ status: 400, description: 'Movement already completed or cancelled' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async completeMovement(
    @Param('movementId', ParseUUIDPipe) movementId: string,
    @CurrentUser() user: User,
  ) {
    return this.stockTakeService.completeMovement(movementId, user.id);
  }

  @Patch('movements/:movementId/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel a pending stock movement' })
  @ApiParam({ name: 'movementId', description: 'Stock movement UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Movement cancelled' })
  @ApiResponse({ status: 400, description: 'Movement already completed or cancelled' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async cancelMovement(
    @Param('movementId', ParseUUIDPipe) movementId: string,
    @CurrentUser() user: User,
  ) {
    return this.stockTakeService.cancelMovement(movementId, user.id);
  }

  @Post(':id/transfer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Transfer stock from this warehouse to another' })
  @ApiParam({ name: 'id', description: 'Source warehouse UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Stock transfer initiated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async transferStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { toWarehouseId: string; productId: string; quantity: number; referenceNumber?: string; cost?: number; notes?: string },
    @CurrentUser() user: User,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.warehouseService.transferStock(
      user.organizationId,
      id,
      body.toWarehouseId,
      body.productId,
      body.quantity,
      user.id,
      {
        referenceNumber: body.referenceNumber,
        cost: body.cost,
        notes: body.notes,
      },
    );
  }

  // ============================================================================
  // INVENTORY BATCHES
  // ============================================================================

  @Get(':id/batches')
  @ApiOperation({ summary: 'Get inventory batches for a warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'onlyAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Inventory batches list' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async getBatches(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('productId') productId?: string,
    @Query('onlyAvailable') onlyAvailable?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.verifyWarehouseAccess(id, user);
    return this.stockTakeService.getBatches(user.organizationId, {
      warehouseId: id,
      productId,
      onlyAvailable: onlyAvailable === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':id/batches')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new inventory batch in a warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Inventory batch created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createBatch(
    @Param('id', ParseUUIDPipe) id: string,
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

  @Post(':id/batches/deplete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Deplete stock from batches using FIFO strategy' })
  @ApiParam({ name: 'id', description: 'Warehouse UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Stock depleted successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or validation error' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async depleteFromBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { productId: string; quantity: number },
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
  // HELPERS
  // ============================================================================

  private async verifyWarehouseAccess(
    warehouseId: string,
    user: User,
  ): Promise<void> {
    const warehouse = await this.warehouseService.findById(warehouseId);
    if (warehouse && warehouse.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this warehouse');
      }
    }
  }
}
