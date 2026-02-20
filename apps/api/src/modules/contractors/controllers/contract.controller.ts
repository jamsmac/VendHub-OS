/**
 * Contract Controller
 * REST endpoints for contract lifecycle management and commission calculations
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, Roles } from '../../../common/decorators';
import { RolesGuard } from '../../../common/guards';
import { ContractService } from '../services/contract.service';
import { CommissionService } from '../services/commission.service';
import { CreateContractDto, UpdateContractDto } from '../dto/create-contract.dto';
import {
  CalculateCommissionDto,
  QueryCommissionsDto,
  MarkCommissionPaidDto,
} from '../dto/commission.dto';
import { ContractStatus } from '../entities/contract.entity';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly commissionService: CommissionService,
  ) {}

  // ============================================================================
  // CONTRACT CRUD
  // ============================================================================

  @Post()
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({ status: 201, description: 'Contract created successfully' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractService.create(organizationId, userId, dto);
  }

  @Get()
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List all contracts' })
  @ApiResponse({ status: 200, description: 'Paginated list of contracts' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query('contractorId') contractorId?: string,
    @Query('status') status?: ContractStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contractService.findAll(organizationId, {
      contractorId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Contract details with contractor relation' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.contractService.findById(id, organizationId);
  }

  @Patch(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Contract updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete contract (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 204, description: 'Contract deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.contractService.remove(id, organizationId);
  }

  // ============================================================================
  // CONTRACT LIFECYCLE
  // ============================================================================

  @Post(':id/activate')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a DRAFT contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Contract activated' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.contractService.activate(id, organizationId);
  }

  @Post(':id/suspend')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend an ACTIVE contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Contract suspended' })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.contractService.suspend(id, organizationId);
  }

  @Post(':id/terminate')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate a contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Contract terminated' })
  async terminate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.contractService.terminate(id, organizationId);
  }

  // ============================================================================
  // COMMISSIONS
  // ============================================================================

  @Post(':id/commissions/calculate')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate commission for a contract and period' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Commission calculated' })
  async calculateCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CalculateCommissionDto,
  ) {
    return this.commissionService.calculate(
      organizationId,
      id,
      dto.periodStart,
      dto.periodEnd,
      userId,
    );
  }

  @Get(':id/commissions')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List commissions for a specific contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of commissions' })
  async getContractCommissions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryCommissionsDto,
  ) {
    return this.commissionService.findAll(organizationId, {
      ...query,
      contractId: id,
    });
  }

  @Post('commissions/:id/pay')
  @Roles('accountant', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a commission as paid' })
  @ApiParam({ name: 'id', description: 'Commission Calculation ID' })
  @ApiResponse({ status: 200, description: 'Commission marked as paid' })
  async markCommissionPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: MarkCommissionPaidDto,
  ) {
    return this.commissionService.markAsPaid(
      id,
      organizationId,
      dto.paymentTransactionId,
      dto.notes,
    );
  }
}
