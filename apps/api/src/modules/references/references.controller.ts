import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles, UserRole } from '../../common/decorators';
import { ReferencesService } from './references.service';

import { QueryGoodsClassifiersDto } from './dto/query-goods-classifiers.dto';
import { QueryIkpuCodesDto } from './dto/query-ikpu-codes.dto';
import { QueryReferencesDto } from './dto/query-references.dto';
import { CreateGoodsClassifierDto, UpdateGoodsClassifierDto } from './dto/create-goods-classifier.dto';
import { CreateIkpuCodeDto, UpdateIkpuCodeDto } from './dto/create-ikpu-code.dto';
import { CreateVatRateDto, UpdateVatRateDto } from './dto/create-vat-rate.dto';
import { CreatePackageTypeDto, UpdatePackageTypeDto } from './dto/create-package-type.dto';
import { CreatePaymentProviderDto, UpdatePaymentProviderDto } from './dto/create-payment-provider.dto';

/**
 * References API
 * Provides CRUD access to Uzbekistan tax system reference data and
 * payment provider configuration. Read operations are available to
 * all authenticated users. Write operations require owner or admin role.
 */
@ApiTags('references')
@Controller('references')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  // ========================================================================
  // GOODS CLASSIFIERS (MXIK)
  // ========================================================================

  @Get('goods-classifiers')
  @ApiOperation({
    summary: 'List MXIK goods classifier codes',
    description: 'Search and filter MXIK commodity classification codes from Uzbekistan tax system. Supports text search, group/parent filtering, and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of goods classifiers' })
  findAllGoodsClassifiers(@Query() query: QueryGoodsClassifiersDto) {
    return this.referencesService.findAllGoodsClassifiers(query);
  }

  @Get('goods-classifiers/:code')
  @ApiOperation({
    summary: 'Get a goods classifier by MXIK code',
    description: 'Retrieve a single MXIK code entry by its unique code.',
  })
  @ApiParam({ name: 'code', description: 'MXIK code', example: '10820001001000000' })
  @ApiResponse({ status: 200, description: 'Goods classifier details' })
  @ApiResponse({ status: 404, description: 'Goods classifier not found' })
  findGoodsClassifierByCode(@Param('code') code: string) {
    return this.referencesService.findGoodsClassifierByCode(code);
  }

  @Post('goods-classifiers')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a goods classifier entry',
    description: 'Create a new MXIK goods classifier entry. Requires owner or admin role.',
  })
  @ApiResponse({ status: 201, description: 'Goods classifier created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  createGoodsClassifier(@Body() dto: CreateGoodsClassifierDto) {
    return this.referencesService.createGoodsClassifier(dto);
  }

  @Patch('goods-classifiers/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a goods classifier entry',
    description: 'Update an existing MXIK goods classifier by UUID. Code field is immutable. Requires owner or admin role.',
  })
  @ApiParam({ name: 'id', description: 'Goods classifier UUID' })
  @ApiResponse({ status: 200, description: 'Goods classifier updated' })
  @ApiResponse({ status: 404, description: 'Goods classifier not found' })
  updateGoodsClassifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoodsClassifierDto,
  ) {
    return this.referencesService.updateGoodsClassifier(id, dto);
  }

  // ========================================================================
  // IKPU CODES
  // ========================================================================

  @Get('ikpu-codes')
  @ApiOperation({
    summary: 'List IKPU tax codes',
    description: 'Search and filter IKPU tax identification codes. Supports text search, MXIK code filtering, marking filter, and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of IKPU codes' })
  findAllIkpuCodes(@Query() query: QueryIkpuCodesDto) {
    return this.referencesService.findAllIkpuCodes(query);
  }

  @Get('ikpu-codes/:code')
  @ApiOperation({
    summary: 'Get an IKPU code by its code',
    description: 'Retrieve a single IKPU tax code entry.',
  })
  @ApiParam({ name: 'code', description: 'IKPU code', example: '11014001001000001' })
  @ApiResponse({ status: 200, description: 'IKPU code details' })
  @ApiResponse({ status: 404, description: 'IKPU code not found' })
  findIkpuCodeByCode(@Param('code') code: string) {
    return this.referencesService.findIkpuCodeByCode(code);
  }

  @Post('ikpu-codes')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create an IKPU code entry',
    description: 'Create a new IKPU tax identification code. Requires owner or admin role.',
  })
  @ApiResponse({ status: 201, description: 'IKPU code created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  createIkpuCode(@Body() dto: CreateIkpuCodeDto) {
    return this.referencesService.createIkpuCode(dto);
  }

  @Patch('ikpu-codes/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update an IKPU code entry',
    description: 'Update an existing IKPU code by UUID. Code field is immutable. Requires owner or admin role.',
  })
  @ApiParam({ name: 'id', description: 'IKPU code UUID' })
  @ApiResponse({ status: 200, description: 'IKPU code updated' })
  @ApiResponse({ status: 404, description: 'IKPU code not found' })
  updateIkpuCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIkpuCodeDto,
  ) {
    return this.referencesService.updateIkpuCode(id, dto);
  }

  // ========================================================================
  // VAT RATES
  // ========================================================================

  @Get('vat-rates')
  @ApiOperation({
    summary: 'List VAT rates',
    description: 'Retrieve all VAT rates defined for Uzbekistan. Ordered by sort_order.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of VAT rates' })
  findAllVatRates(@Query() query: QueryReferencesDto) {
    return this.referencesService.findAllVatRates(query);
  }

  @Get('vat-rates/:code')
  @ApiOperation({
    summary: 'Get a VAT rate by code',
    description: 'Retrieve a single VAT rate entry by its unique code (e.g. STANDARD, ZERO, EXEMPT).',
  })
  @ApiParam({ name: 'code', description: 'VAT rate code', example: 'STANDARD' })
  @ApiResponse({ status: 200, description: 'VAT rate details' })
  @ApiResponse({ status: 404, description: 'VAT rate not found' })
  findVatRateByCode(@Param('code') code: string) {
    return this.referencesService.findVatRateByCode(code);
  }

  @Post('vat-rates')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a VAT rate entry',
    description: 'Create a new VAT rate entry. Requires owner or admin role.',
  })
  @ApiResponse({ status: 201, description: 'VAT rate created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  createVatRate(@Body() dto: CreateVatRateDto) {
    return this.referencesService.createVatRate(dto);
  }

  @Patch('vat-rates/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a VAT rate entry',
    description: 'Update an existing VAT rate by UUID. Code field is immutable. Requires owner or admin role.',
  })
  @ApiParam({ name: 'id', description: 'VAT rate UUID' })
  @ApiResponse({ status: 200, description: 'VAT rate updated' })
  @ApiResponse({ status: 404, description: 'VAT rate not found' })
  updateVatRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVatRateDto,
  ) {
    return this.referencesService.updateVatRate(id, dto);
  }

  // ========================================================================
  // PACKAGE TYPES
  // ========================================================================

  @Get('package-types')
  @ApiOperation({
    summary: 'List package types',
    description: 'Retrieve all package types (BOX, BOTTLE, CAN, etc.). Ordered by sort_order.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of package types' })
  findAllPackageTypes(@Query() query: QueryReferencesDto) {
    return this.referencesService.findAllPackageTypes(query);
  }

  @Get('package-types/:code')
  @ApiOperation({
    summary: 'Get a package type by code',
    description: 'Retrieve a single package type entry by its unique code.',
  })
  @ApiParam({ name: 'code', description: 'Package type code', example: 'BOTTLE' })
  @ApiResponse({ status: 200, description: 'Package type details' })
  @ApiResponse({ status: 404, description: 'Package type not found' })
  findPackageTypeByCode(@Param('code') code: string) {
    return this.referencesService.findPackageTypeByCode(code);
  }

  @Post('package-types')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a package type entry',
    description: 'Create a new package type. Requires owner or admin role.',
  })
  @ApiResponse({ status: 201, description: 'Package type created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  createPackageType(@Body() dto: CreatePackageTypeDto) {
    return this.referencesService.createPackageType(dto);
  }

  @Patch('package-types/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a package type entry',
    description: 'Update an existing package type by UUID. Code field is immutable. Requires owner or admin role.',
  })
  @ApiParam({ name: 'id', description: 'Package type UUID' })
  @ApiResponse({ status: 200, description: 'Package type updated' })
  @ApiResponse({ status: 404, description: 'Package type not found' })
  updatePackageType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageTypeDto,
  ) {
    return this.referencesService.updatePackageType(id, dto);
  }

  // ========================================================================
  // PAYMENT PROVIDERS
  // ========================================================================

  @Get('payment-providers')
  @ApiOperation({
    summary: 'List payment providers',
    description: 'Retrieve all payment providers (Payme, Click, Uzum, cash, etc.). Ordered by sort_order.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of payment providers' })
  findAllPaymentProviders(@Query() query: QueryReferencesDto) {
    return this.referencesService.findAllPaymentProviders(query);
  }

  @Get('payment-providers/:code')
  @ApiOperation({
    summary: 'Get a payment provider by code',
    description: 'Retrieve a single payment provider by its unique code.',
  })
  @ApiParam({ name: 'code', description: 'Payment provider code', example: 'payme' })
  @ApiResponse({ status: 200, description: 'Payment provider details' })
  @ApiResponse({ status: 404, description: 'Payment provider not found' })
  findPaymentProviderByCode(@Param('code') code: string) {
    return this.referencesService.findPaymentProviderByCode(code);
  }

  @Post('payment-providers')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a payment provider entry',
    description: 'Create a new payment provider. Requires owner or admin role.',
  })
  @ApiResponse({ status: 201, description: 'Payment provider created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  createPaymentProvider(@Body() dto: CreatePaymentProviderDto) {
    return this.referencesService.createPaymentProvider(dto);
  }

  @Patch('payment-providers/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a payment provider entry',
    description: 'Update an existing payment provider by UUID. Code field is immutable. Requires owner or admin role.',
  })
  @ApiParam({ name: 'id', description: 'Payment provider UUID' })
  @ApiResponse({ status: 200, description: 'Payment provider updated' })
  @ApiResponse({ status: 404, description: 'Payment provider not found' })
  updatePaymentProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentProviderDto,
  ) {
    return this.referencesService.updatePaymentProvider(id, dto);
  }

  // ========================================================================
  // STATIC REFERENCE DATA
  // ========================================================================

  @Get('marking-requirements')
  @ApiOperation({
    summary: 'Get mandatory marking requirements',
    description: 'Retrieve the list of product categories with mandatory marking requirements in Uzbekistan.',
  })
  @ApiResponse({ status: 200, description: 'List of marking requirements' })
  getMarkingRequirements() {
    return this.referencesService.getMarkingRequirements();
  }

  @Get('currencies')
  @ApiOperation({
    summary: 'Get supported currencies',
    description: 'Retrieve the list of supported currencies (UZS, USD).',
  })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  getCurrencies() {
    return this.referencesService.getCurrencies();
  }

  @Get('regions')
  @ApiOperation({
    summary: 'Get Uzbekistan regions',
    description: 'Retrieve the list of all regions (viloyatlar) in Uzbekistan.',
  })
  @ApiResponse({ status: 200, description: 'List of regions' })
  getRegions() {
    return this.referencesService.getRegions();
  }
}
