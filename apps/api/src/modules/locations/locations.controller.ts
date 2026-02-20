import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles, UserRole } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new location' })
  create(@Body() data: any, @CurrentUser() user: any) {
    return this.locationsService.create({
      ...data,
      organizationId: user.organizationId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all locations with pagination' })
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.locationsService.findAll(user.organizationId, { page, limit, search });
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby locations' })
  findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number = 5,
    @CurrentUser() user: any,
  ) {
    return this.locationsService.findNearby(lat, lng, radius, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  findOne(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update location' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.locationsService.update(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete location' })
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
