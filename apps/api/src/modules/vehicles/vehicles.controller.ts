import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateVehicleDto, UpdateVehicleDto, UpdateOdometerDto } from './dto/create-vehicle.dto';
import { VehicleType, VehicleStatus } from './entities/vehicle.entity';

@ApiTags('vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle created' })
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: User) {
    const organizationId = dto.organizationId || user.organizationId;
    return this.vehiclesService.create(dto, organizationId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all vehicles' })
  @ApiQuery({ name: 'type', required: false, enum: VehicleType })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: VehicleStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: User,
    @Query('type') type?: VehicleType,
    @Query('ownerId') ownerId?: string,
    @Query('status') status?: VehicleStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vehiclesService.findAll(user.organizationId, {
      type,
      ownerId,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const vehicle = await this.vehiclesService.findById(id);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.organizationId !== user.organizationId && user.role !== UserRole.OWNER) {
      throw new ForbiddenException();
    }
    return vehicle;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyVehicleAccess(id, user);
    return this.vehiclesService.update(id, dto, user.id);
  }

  @Patch(':id/odometer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Update vehicle odometer' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async updateOdometer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOdometerDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyVehicleAccess(id, user);
    return this.vehiclesService.updateOdometer(id, dto.odometer, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete vehicle (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyVehicleAccess(id, user);
    return this.vehiclesService.remove(id);
  }

  private async verifyVehicleAccess(vehicleId: string, user: User): Promise<void> {
    const vehicle = await this.vehiclesService.findById(vehicleId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.organizationId !== user.organizationId && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Access denied to this vehicle');
    }
  }
}
