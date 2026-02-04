/**
 * Reconciliation Controller
 * API эндпоинты для сверки данных
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import {
  CreateReconciliationRunDto,
  ResolveMismatchDto,
  ImportHwSalesDto,
  QueryReconciliationRunsDto,
  QueryMismatchesDto,
} from './dto/create-reconciliation-run.dto';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Reconciliation')
@ApiBearerAuth()
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}

  // ============================================================================
  // RECONCILIATION RUNS
  // ============================================================================

  @Post('runs')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create and trigger a reconciliation run' })
  @ApiResponse({ status: 201, description: 'Reconciliation run created and processing started' })
  async createRun(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateReconciliationRunDto,
  ) {
    const run = await this.service.createRun(organizationId, userId, dto);

    // Trigger processing asynchronously (fire and forget)
    this.service.processReconciliation(run.id).catch((err) => {
      // Error is already handled inside processReconciliation
    });

    return run;
  }

  @Get('runs')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List reconciliation runs' })
  @ApiResponse({ status: 200, description: 'Paginated list of reconciliation runs' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() params: QueryReconciliationRunsDto,
  ) {
    return this.service.findAll(organizationId, params);
  }

  @Get('runs/:id')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get reconciliation run with summary' })
  @ApiParam({ name: 'id', description: 'Reconciliation run ID' })
  @ApiResponse({ status: 200, description: 'Reconciliation run details with summary' })
  @ApiResponse({ status: 404, description: 'Run not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get('runs/:id/mismatches')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get mismatches for a reconciliation run' })
  @ApiParam({ name: 'id', description: 'Reconciliation run ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of mismatches' })
  async getMismatches(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() params: QueryMismatchesDto,
  ) {
    return this.service.getMismatches(id, params);
  }

  @Delete('runs/:id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reconciliation run (soft delete)' })
  @ApiParam({ name: 'id', description: 'Reconciliation run ID' })
  @ApiResponse({ status: 204, description: 'Run deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete run with current status' })
  @ApiResponse({ status: 404, description: 'Run not found' })
  async deleteRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteRun(id);
  }

  // ============================================================================
  // MISMATCHES
  // ============================================================================

  @Patch('mismatches/:id/resolve')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Resolve a mismatch' })
  @ApiParam({ name: 'id', description: 'Mismatch ID' })
  @ApiResponse({ status: 200, description: 'Mismatch resolved' })
  @ApiResponse({ status: 400, description: 'Mismatch already resolved' })
  @ApiResponse({ status: 404, description: 'Mismatch not found' })
  async resolveMismatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ResolveMismatchDto,
  ) {
    return this.service.resolveMismatch(id, userId, dto);
  }

  // ============================================================================
  // IMPORT
  // ============================================================================

  @Post('import')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Import HW sales data for reconciliation' })
  @ApiResponse({ status: 201, description: 'Sales data imported successfully' })
  async importHwSales(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ImportHwSalesDto,
  ) {
    return this.service.importHwSales(organizationId, userId, dto);
  }
}
