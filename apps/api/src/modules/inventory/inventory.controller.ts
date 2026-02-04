import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsEnum, IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InventoryService } from './inventory.service';
import { InventoryLevel, MovementType } from './entities/inventory.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles, UserRole } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateReservationRequestDto,
  FulfillReservationDto,
  ConfirmReservationDto,
  CancelReservationDto,
  QueryReservationsDto,
} from './dto/inventory-reservation.dto';

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: UserRole;
}

export class TransferInventoryDto {
  @ApiProperty({ enum: InventoryLevel, description: 'Source inventory level' })
  @IsEnum(InventoryLevel)
  fromLevel: InventoryLevel;

  @ApiProperty({ enum: InventoryLevel, description: 'Target inventory level' })
  @IsEnum(InventoryLevel)
  toLevel: InventoryLevel;

  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Transfer quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Operator UUID (required for operator-level transfers)' })
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional({ description: 'Machine UUID (required for machine-level transfers)' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Transfer notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('warehouse')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get warehouse inventory' })
  getWarehouseInventory(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getWarehouseInventory(user.organizationId);
  }

  @Get('operator')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Get operator inventory' })
  @ApiQuery({ name: 'operatorId', required: false })
  getOperatorInventory(@CurrentUser() user: AuthenticatedUser, @Query('operatorId') operatorId?: string) {
    const opId = operatorId || (user.role === UserRole.OPERATOR ? user.id : undefined);
    if (!opId) {
      throw new BadRequestException('Operator ID required');
    }
    return this.inventoryService.getOperatorInventory(user.organizationId, opId);
  }

  @Get('machine')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get machine inventory' })
  @ApiQuery({ name: 'machineId', required: true })
  getMachineInventory(@CurrentUser() user: AuthenticatedUser, @Query('machineId') machineId: string) {
    return this.inventoryService.getMachineInventory(user.organizationId, machineId);
  }

  @Get('low-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStock(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getWarehouseLowStock(user.organizationId);
  }

  @Post('transfer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Transfer inventory between levels' })
  async transfer(@Body() data: TransferInventoryDto, @CurrentUser() user: AuthenticatedUser) {
    // Route to appropriate transfer method based on fromLevel and toLevel
    const { fromLevel, toLevel, productId, quantity, operatorId, machineId, notes } = data;

    if (fromLevel === InventoryLevel.WAREHOUSE && toLevel === InventoryLevel.OPERATOR) {
      return this.inventoryService.transferWarehouseToOperator({
        organizationId: user.organizationId,
        operatorId: operatorId!,
        productId,
        quantity,
        notes,
      }, user.id);
    }

    if (fromLevel === InventoryLevel.OPERATOR && toLevel === InventoryLevel.WAREHOUSE) {
      return this.inventoryService.transferOperatorToWarehouse({
        organizationId: user.organizationId,
        operatorId: operatorId!,
        productId,
        quantity,
        notes,
      }, user.id);
    }

    if (fromLevel === InventoryLevel.OPERATOR && toLevel === InventoryLevel.MACHINE) {
      return this.inventoryService.transferOperatorToMachine({
        organizationId: user.organizationId,
        operatorId: operatorId!,
        machineId: machineId!,
        productId,
        quantity,
        notes,
      }, user.id);
    }

    if (fromLevel === InventoryLevel.MACHINE && toLevel === InventoryLevel.OPERATOR) {
      return this.inventoryService.transferMachineToOperator({
        organizationId: user.organizationId,
        operatorId: operatorId!,
        machineId: machineId!,
        productId,
        quantity,
        notes,
      }, user.id);
    }

    throw new BadRequestException(`Unsupported transfer: ${fromLevel} -> ${toLevel}`);
  }

  @Get('movements')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.OWNER)
  @ApiOperation({ summary: 'Get inventory movements' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiQuery({ name: 'movementType', required: false })
  getMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Query('productId') productId?: string,
    @Query('machineId') machineId?: string,
    @Query('movementType') movementType?: MovementType,
  ) {
    return this.inventoryService.getMovements(user.organizationId, {
      productId,
      machineId,
      movementType,
    });
  }

  // ==========================================================================
  // RESERVATIONS
  // ==========================================================================

  @Get('reservations')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get inventory reservations' })
  @ApiResponse({ status: 200, description: 'Returns list of reservations' })
  async getReservations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryReservationsDto,
  ) {
    if (query.activeOnly) {
      return this.inventoryService.getActiveReservations(user.organizationId);
    }
    return this.inventoryService.getReservations(user.organizationId, query);
  }

  @Get('reservations/summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get reservations summary' })
  @ApiResponse({ status: 200, description: 'Returns reservations summary with counts by status' })
  async getReservationsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getReservationsSummary(user.organizationId);
  }

  @Get('reservations/task/:taskId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Get reservations for a task' })
  @ApiParam({ name: 'taskId', type: String, description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Returns reservations linked to a specific task' })
  async getReservationsByTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.getReservationsByTask(user.organizationId, taskId);
  }

  @Get('reservations/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Get reservation by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Reservation UUID' })
  @ApiResponse({ status: 200, description: 'Returns a single reservation' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async getReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.getReservationById(user.organizationId, id);
  }

  @Post('reservations')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Create inventory reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock for reservation' })
  async createReservation(
    @Body() dto: CreateReservationRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createReservation({
      organizationId: user.organizationId,
      taskId: dto.taskId,
      productId: dto.productId,
      quantity: dto.quantity,
      inventoryLevel: dto.inventoryLevel,
      referenceId: dto.referenceId,
      expiresAt: dto.expiresAt,
      notes: dto.notes,
      createdByUserId: user.id,
    });
  }

  @Post('reservations/:id/confirm')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Confirm reservation' })
  @ApiParam({ name: 'id', type: String, description: 'Reservation UUID' })
  @ApiResponse({ status: 200, description: 'Reservation confirmed' })
  @ApiResponse({ status: 400, description: 'Reservation is not in PENDING status' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @HttpCode(HttpStatus.OK)
  async confirmReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmReservationDto,
  ) {
    return this.inventoryService.confirmReservation(id, dto.adjustedQuantity);
  }

  @Post('reservations/:id/fulfill')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Fulfill reservation' })
  @ApiParam({ name: 'id', type: String, description: 'Reservation UUID' })
  @ApiResponse({ status: 200, description: 'Reservation fulfilled (or partially fulfilled)' })
  @ApiResponse({ status: 400, description: 'Reservation is not active' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @HttpCode(HttpStatus.OK)
  async fulfillReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FulfillReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.fulfillReservation(id, dto.fulfilledQuantity, user.id);
  }

  @Post('reservations/:id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel reservation' })
  @ApiParam({ name: 'id', type: String, description: 'Reservation UUID' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled and reserved stock released' })
  @ApiResponse({ status: 400, description: 'Reservation is already inactive' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @HttpCode(HttpStatus.OK)
  async cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.cancelReservation(id, dto.reason, user.id);
  }
}
