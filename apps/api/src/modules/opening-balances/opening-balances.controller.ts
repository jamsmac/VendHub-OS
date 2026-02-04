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
import { OpeningBalancesService } from './opening-balances.service';
import {
  CreateOpeningBalanceDto,
  BulkCreateOpeningBalanceDto,
  UpdateOpeningBalanceDto,
  QueryOpeningBalancesDto,
  ApplyAllDto,
} from './dto/create-opening-balance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: UserRole;
}

@ApiTags('Opening Balances')
@Controller('opening-balances')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OpeningBalancesController {
  constructor(private readonly openingBalancesService: OpeningBalancesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a single opening balance record' })
  @ApiResponse({ status: 201, description: 'Opening balance created successfully' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOpeningBalanceDto,
  ) {
    return this.openingBalancesService.create(user.organizationId, user.id, dto);
  }

  @Post('bulk')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Bulk create opening balance records (max 500)' })
  @ApiResponse({ status: 201, description: 'Opening balances created successfully' })
  bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkCreateOpeningBalanceDto,
  ) {
    return this.openingBalancesService.bulkCreate(user.organizationId, user.id, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.VIEWER)
  @ApiOperation({ summary: 'List opening balances with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of opening balances' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() params: QueryOpeningBalancesDto,
  ) {
    return this.openingBalancesService.findAll(user.organizationId, params);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get opening balance statistics' })
  @ApiResponse({ status: 200, description: 'Opening balance statistics' })
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.openingBalancesService.getStats(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a single opening balance by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Opening balance record' })
  @ApiResponse({ status: 404, description: 'Opening balance not found' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.openingBalancesService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update an opening balance (only unapplied records)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Opening balance updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update applied balance' })
  @ApiResponse({ status: 404, description: 'Opening balance not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpeningBalanceDto,
  ) {
    return this.openingBalancesService.update(id, dto);
  }

  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Apply a single opening balance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Opening balance applied successfully' })
  @ApiResponse({ status: 400, description: 'Opening balance already applied' })
  @ApiResponse({ status: 404, description: 'Opening balance not found' })
  apply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.openingBalancesService.apply(id, user.id);
  }

  @Post('apply-all')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Apply all unapplied opening balances for a specific date' })
  @ApiResponse({ status: 200, description: 'Opening balances applied successfully' })
  applyAll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyAllDto,
  ) {
    return this.openingBalancesService.applyAll(user.organizationId, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete an opening balance (only unapplied records)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Opening balance deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete applied balance' })
  @ApiResponse({ status: 404, description: 'Opening balance not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.openingBalancesService.remove(id);
  }
}
