/**
 * Orders Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  OrderFilterDto,
  OrderDto,
  OrderListDto,
  OrderStatsDto,
} from './dto/order.dto';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, type: OrderDto })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDto> {
    return this.service.createOrder(userId, organizationId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiResponse({ status: 200, type: OrderListDto })
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query() filter: OrderFilterDto,
  ): Promise<OrderListDto> {
    return this.service.getUserOrders(userId, organizationId, filter);
  }

  @Get('my/:id')
  @ApiOperation({ summary: 'Get current user order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async getMyOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<OrderDto> {
    return this.service.getOrder(id, organizationId);
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Get()
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get all orders (admin)' })
  @ApiResponse({ status: 200, type: OrderListDto })
  async getList(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filter: OrderFilterDto,
  ): Promise<OrderListDto> {
    return this.service.getOrders(organizationId, filter);
  }

  @Get('stats')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get order statistics' })
  @ApiResponse({ status: 200, type: OrderStatsDto })
  async getStats(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<OrderStatsDto> {
    return this.service.getStats(
      organizationId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get('by-number/:orderNumber')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get order by number' })
  @ApiParam({ name: 'orderNumber', description: 'Order number' })
  @ApiResponse({ status: 200, type: OrderDto })
  async getByNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<OrderDto> {
    return this.service.getOrderByNumber(orderNumber, organizationId);
  }

  @Get(':id')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<OrderDto> {
    return this.service.getOrder(id, organizationId);
  }

  @Put(':id/status')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, dto);
  }

  @Put(':id/payment')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async updatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ): Promise<OrderDto> {
    return this.service.updatePaymentStatus(id, organizationId, dto);
  }

  // ============================================================================
  // QUICK ACTIONS
  // ============================================================================

  @Post(':id/confirm')
  @Roles('operator', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: 'confirmed' as any,
    });
  }

  @Post(':id/prepare')
  @Roles('operator', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark order as preparing' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async prepare(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: 'preparing' as any,
    });
  }

  @Post(':id/ready')
  @Roles('operator', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark order as ready' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async ready(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: 'ready' as any,
    });
  }

  @Post(':id/complete')
  @Roles('operator', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: 'completed' as any,
    });
  }

  @Post(':id/cancel')
  @Roles('operator', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body('reason') reason?: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: 'cancelled' as any,
      reason,
    });
  }
}
