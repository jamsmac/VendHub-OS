/**
 * Promo Codes Controller for VendHub OS
 * Manages promotional codes lifecycle and redemption
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
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/create-promo-code.dto';
import { RedeemPromoCodeDto, ValidatePromoCodeDto } from './dto/redeem-promo-code.dto';
import { QueryPromoCodesDto } from './dto/query-promo-codes.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentOrganizationId } from '../../common/decorators/current-user.decorator';

@ApiTags('Promo Codes')
@ApiBearerAuth()
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new promo code' })
  @ApiResponse({ status: 201, description: 'Promo code created successfully' })
  @Roles('admin', 'owner', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePromoCodeDto,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.promoCodesService.create(dto, organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List promo codes with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of promo codes' })
  @Roles('admin', 'owner', 'manager')
  async findAll(
    @Query() query: QueryPromoCodesDto,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.promoCodesService.findAll(query, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get promo code by ID' })
  @ApiParam({ name: 'id', description: 'Promo code UUID' })
  @ApiResponse({ status: 200, description: 'Promo code details' })
  @Roles('admin', 'owner', 'manager')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.promoCodesService.findById(id, organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a promo code' })
  @ApiParam({ name: 'id', description: 'Promo code UUID' })
  @ApiResponse({ status: 200, description: 'Promo code updated successfully' })
  @Roles('admin', 'owner', 'manager')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoCodeDto,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.promoCodesService.update(id, dto, organizationId);
  }

  // ============================================================================
  // VALIDATION & REDEMPTION
  // ============================================================================

  @Post('validate')
  @ApiOperation({ summary: 'Validate a promo code (customer-facing, public)' })
  @ApiResponse({ status: 200, description: 'Validation result with discount amount' })
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 validations/min to prevent brute-force code enumeration
  @HttpCode(HttpStatus.OK)
  async validate(
    @Body() dto: ValidatePromoCodeDto,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.promoCodesService.validate(dto, organizationId);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a promo code' })
  @ApiResponse({ status: 200, description: 'Redemption result with discount applied' })
  @HttpCode(HttpStatus.OK)
  async redeem(
    @Body() dto: RedeemPromoCodeDto,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.promoCodesService.redeem(dto, organizationId);
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate (pause) a promo code' })
  @ApiParam({ name: 'id', description: 'Promo code UUID' })
  @ApiResponse({ status: 200, description: 'Promo code deactivated' })
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.promoCodesService.deactivate(id, organizationId);
  }

  // ============================================================================
  // STATS & REDEMPTIONS
  // ============================================================================

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get promo code usage statistics' })
  @ApiParam({ name: 'id', description: 'Promo code UUID' })
  @ApiResponse({ status: 200, description: 'Usage statistics for the promo code' })
  @Roles('admin', 'owner', 'manager')
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.promoCodesService.getStats(id, organizationId);
  }

  @Get(':id/redemptions')
  @ApiOperation({ summary: 'Get paginated redemptions for a promo code' })
  @ApiParam({ name: 'id', description: 'Promo code UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of redemptions' })
  @Roles('admin', 'owner', 'manager')
  async getRedemptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentOrganizationId() organizationId: string = '',
  ) {
    return this.promoCodesService.getRedemptions(id, { page, limit }, organizationId);
  }
}
