import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { PurchaseHistoryService } from './purchase-history.service';
import {
  CreatePurchaseHistoryDto,
  BulkCreatePurchaseHistoryDto,
  UpdatePurchaseHistoryDto,
  ReceivePurchaseDto,
  ReturnPurchaseDto,
} from './dto/create-purchase-history.dto';
import { QueryPurchaseHistoryDto, PurchaseStatsQueryDto } from './dto/query-purchase-history.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: UserRole;
}

@ApiTags('Purchase History')
@Controller('purchase-history')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PurchaseHistoryController {
  constructor(private readonly purchaseHistoryService: PurchaseHistoryService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a single purchase history record' })
  @ApiResponse({ status: 201, description: 'Purchase record created successfully' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseHistoryDto,
  ) {
    return this.purchaseHistoryService.create(user.organizationId, user.id, dto);
  }

  @Post('bulk')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Bulk create purchase history records (max 500)' })
  @ApiResponse({ status: 201, description: 'Purchase records created successfully' })
  bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkCreatePurchaseHistoryDto,
  ) {
    return this.purchaseHistoryService.bulkCreate(user.organizationId, user.id, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.VIEWER)
  @ApiOperation({ summary: 'List purchase history with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase history records' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() params: QueryPurchaseHistoryDto,
  ) {
    return this.purchaseHistoryService.findAll(user.organizationId, params);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get purchase statistics (totals, by supplier, by product)' })
  @ApiResponse({ status: 200, description: 'Purchase statistics' })
  getStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query() params: PurchaseStatsQueryDto,
  ) {
    return this.purchaseHistoryService.getStats(user.organizationId, params);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a single purchase history record by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Purchase history record' })
  @ApiResponse({ status: 404, description: 'Purchase record not found' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseHistoryService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update a purchase record (only PENDING status)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Purchase record updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update non-PENDING purchase' })
  @ApiResponse({ status: 404, description: 'Purchase record not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseHistoryDto,
  ) {
    return this.purchaseHistoryService.update(id, dto);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Mark purchase as received (PENDING -> RECEIVED)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Purchase marked as received' })
  @ApiResponse({ status: 400, description: 'Cannot receive non-PENDING purchase' })
  @ApiResponse({ status: 404, description: 'Purchase record not found' })
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto?: ReceivePurchaseDto,
  ) {
    return this.purchaseHistoryService.receive(id, user.id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel a purchase (PENDING -> CANCELLED)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Purchase cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel non-PENDING purchase' })
  @ApiResponse({ status: 404, description: 'Purchase record not found' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseHistoryService.cancel(id);
  }

  @Post(':id/return')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Return a purchase (RECEIVED -> RETURNED)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Purchase returned successfully' })
  @ApiResponse({ status: 400, description: 'Cannot return non-RECEIVED purchase' })
  @ApiResponse({ status: 404, description: 'Purchase record not found' })
  returnPurchase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnPurchaseDto,
  ) {
    return this.purchaseHistoryService.returnPurchase(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete a purchase (only PENDING or CANCELLED)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Purchase record deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete non-PENDING/CANCELLED purchase' })
  @ApiResponse({ status: 404, description: 'Purchase record not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseHistoryService.remove(id);
  }
}
