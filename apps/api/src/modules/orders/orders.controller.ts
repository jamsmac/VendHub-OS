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
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderPaymentStatusDto,
  OrderFilterDto,
  OrderDto,
  OrderListDto,
  OrderStatsDto,
} from "./dto/order.dto";
import { CurrentUser, Roles, Public } from "../../common/decorators";
import { OrderStatus } from "./entities/order.entity";
import { CancelOrderDto } from "./dto/order-operations.dto";

@ApiTags("Orders")
@ApiBearerAuth()
@Controller("orders")
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  @Post()
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @ApiOperation({ summary: "Create new order" })
  @ApiResponse({ status: 201, type: OrderDto })
  async create(
    @CurrentUser("id") userId: string,
    @CurrentUser("organizationId") organizationId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDto> {
    return this.service.createOrder(userId, organizationId, dto);
  }

  @Get("my")
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @ApiOperation({ summary: "Get current user orders" })
  @ApiResponse({ status: 200, type: OrderListDto })
  async getMyOrders(
    @CurrentUser("id") userId: string,
    @CurrentUser("organizationId") organizationId: string,
    @Query() filter: OrderFilterDto,
  ): Promise<OrderListDto> {
    return this.service.getUserOrders(userId, organizationId, filter);
  }

  @Get("my/:id")
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @ApiOperation({ summary: "Get current user order by ID" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async getMyOrder(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
  ): Promise<OrderDto> {
    return this.service.getOrder(id, organizationId);
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Get()
  @Roles("owner", "admin", "manager", "accountant")
  @ApiOperation({ summary: "Get all orders (admin)" })
  @ApiResponse({ status: 200, type: OrderListDto })
  async getList(
    @CurrentUser("organizationId") organizationId: string,
    @Query() filter: OrderFilterDto,
  ): Promise<OrderListDto> {
    return this.service.getOrders(organizationId, filter);
  }

  @Get("stats")
  @Roles("owner", "admin", "manager", "accountant")
  @ApiOperation({ summary: "Get order statistics" })
  @ApiResponse({ status: 200, type: OrderStatsDto })
  async getStats(
    @CurrentUser("organizationId") organizationId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ): Promise<OrderStatsDto> {
    return this.service.getStats(
      organizationId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get("by-number/:orderNumber")
  @Roles("owner", "admin", "manager", "accountant")
  @ApiOperation({ summary: "Get order by number" })
  @ApiParam({ name: "orderNumber", description: "Order number" })
  @ApiResponse({ status: 200, type: OrderDto })
  async getByNumber(
    @Param("orderNumber") orderNumber: string,
    @CurrentUser("organizationId") organizationId: string,
  ): Promise<OrderDto> {
    return this.service.getOrderByNumber(orderNumber, organizationId);
  }

  @Get(":id")
  @Roles("owner", "admin", "manager", "accountant")
  @ApiOperation({ summary: "Get order by ID" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async getById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
  ): Promise<OrderDto> {
    return this.service.getOrder(id, organizationId);
  }

  @Put(":id/status")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Update order status" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, dto);
  }

  @Put(":id/payment")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Update payment status" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async updatePayment(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
    @Body() dto: UpdateOrderPaymentStatusDto,
  ): Promise<OrderDto> {
    return this.service.updateOrderPaymentStatus(id, organizationId, dto);
  }

  // ============================================================================
  // QUICK ACTIONS
  // ============================================================================

  @Post(":id/confirm")
  @Roles("operator", "manager", "admin", "owner")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm order" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async confirm(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: OrderStatus.CONFIRMED,
    });
  }

  @Post(":id/prepare")
  @Roles("operator", "manager", "admin", "owner")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark order as preparing" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async prepare(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: OrderStatus.PREPARING,
    });
  }

  @Post(":id/ready")
  @Roles("operator", "manager", "admin", "owner")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark order as ready" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async ready(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: OrderStatus.READY,
    });
  }

  @Post(":id/complete")
  @Roles("operator", "manager", "admin", "owner")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete order" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async complete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: OrderStatus.COMPLETED,
    });
  }

  @Post(":id/cancel")
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel order" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, type: OrderDto })
  async cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") organizationId: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderDto> {
    return this.service.updateStatus(id, organizationId, {
      status: OrderStatus.CANCELLED,
      reason: dto.reason,
    });
  }

  // ============================================================================
  // PUBLIC ENDPOINTS (QR payment flow — no auth required)
  // ============================================================================

  @Get(":id/payment-info")
  @Public()
  @ApiOperation({
    summary: "Get order payment info (public, for QR payment page)",
  })
  @ApiParam({ name: "id", description: "Order ID from QR code" })
  @ApiResponse({ status: 200, description: "Order payment info" })
  async getPaymentInfo(@Param("id", ParseUUIDPipe) id: string) {
    const order = await this.service.findByIdPublic(id);
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Return minimal info needed for payment page — no sensitive data
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productName: order.items?.[0]?.productName || "Товар",
      amount: order.totalAmount,
      currency: "сум",
      status: order.status,
      paymentStatus: order.paymentStatus,
      machineCode: null,
    };
  }
}
