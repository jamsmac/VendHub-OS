/**
 * Client B2C Controller
 *
 * SECURITY NOTE: Customer-facing endpoints require JWT authentication
 * (except register). The authenticated client's ID is derived from
 * the JWT token to prevent IDOR attacks -- a client can only access
 * their own profile, orders, wallet, and loyalty data.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
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

import { ClientService } from './client.service';
import { Public, Roles, CurrentUser, ICurrentUser } from '../../common/decorators';
import { Throttle } from '@nestjs/throttler';

import { CreateClientUserDto, UpdateClientUserDto } from './dto/create-client-user.dto';
import { TopUpWalletDto, WalletAdjustmentDto } from './dto/wallet.dto';
import { CreateClientOrderDto } from './dto/client-order.dto';
import { QueryClientsDto, QueryOrdersDto } from './dto/query-clients.dto';

@ApiTags('Client B2C')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // ============================================
  // PUBLIC (customer-facing) ENDPOINTS
  // ============================================

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registrations per minute per IP
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new B2C client' })
  @ApiResponse({ status: 201, description: 'Client registered successfully' })
  @ApiResponse({ status: 409, description: 'Client already exists' })
  async register(@Body() dto: CreateClientUserDto) {
    return this.clientService.createClient(dto);
  }

  @Get('profile/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own client profile (authenticated)' })
  @ApiResponse({ status: 200, description: 'Client profile returned' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getProfile(@CurrentUser() user: ICurrentUser) {
    return this.clientService.findClientById(user.id);
  }

  @Put('profile/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own client profile (authenticated)' })
  @ApiResponse({ status: 200, description: 'Client profile updated' })
  @ApiResponse({ status: 409, description: 'Duplicate identifier' })
  async updateProfile(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateClientUserDto,
  ) {
    return this.clientService.updateClient(user.id, dto);
  }

  @Post('orders')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order (authenticated client)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async createOrder(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateClientOrderDto,
  ) {
    return this.clientService.createOrder(user.id, dto);
  }

  @Get('orders/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own order history (authenticated client)' })
  @ApiResponse({ status: 200, description: 'Order history returned' })
  async getOrderHistory(
    @CurrentUser() user: ICurrentUser,
    @Query() query: QueryOrdersDto,
  ) {
    return this.clientService.getOrderHistory({ ...query, clientUserId: user.id });
  }

  @Get('wallet/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own wallet balance (authenticated client)' })
  @ApiResponse({ status: 200, description: 'Wallet info returned' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWallet(@CurrentUser() user: ICurrentUser) {
    return this.clientService.getWallet(user.id);
  }

  @Get('loyalty/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own loyalty account (authenticated client)' })
  @ApiResponse({ status: 200, description: 'Loyalty account returned' })
  @ApiResponse({ status: 404, description: 'Loyalty account not found' })
  async getLoyalty(@CurrentUser() user: ICurrentUser) {
    return this.clientService.getLoyaltyAccount(user.id);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('admin/clients')
  @Roles('admin', 'owner', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all B2C clients (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated client list' })
  async listClients(
    @Query() query: QueryClientsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.clientService.getClients(query, user.organizationId);
  }

  @Get('admin/clients/:id')
  @Roles('admin', 'owner', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get client details (admin)' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({ status: 200, description: 'Client details returned' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getClientDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findClientById(id);
  }

  @Post('admin/wallet/:clientId/top-up')
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Top up client wallet (admin)' })
  @ApiParam({ name: 'clientId', description: 'Client UUID' })
  @ApiResponse({ status: 200, description: 'Wallet topped up' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async topUpWallet(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: TopUpWalletDto,
  ) {
    return this.clientService.topUpWallet(clientId, dto);
  }

  @Post('admin/wallet/:clientId/adjust')
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manual wallet adjustment (admin)' })
  @ApiParam({ name: 'clientId', description: 'Client UUID' })
  @ApiResponse({ status: 200, description: 'Wallet adjusted' })
  @ApiResponse({ status: 400, description: 'Insufficient balance for negative adjustment' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async adjustWallet(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: WalletAdjustmentDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.clientService.adjustWallet(clientId, dto, user.id);
  }

  @Get('admin/orders')
  @Roles('admin', 'owner', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all client orders (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  async listOrders(
    @Query() query: QueryOrdersDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.clientService.getOrderHistory(query, user.organizationId);
  }
}
