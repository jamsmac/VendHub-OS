import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles, UserRole } from '../../common/decorators';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create organization' })
  create(@Body() data: any) {
    return this.organizationsService.create(data);
  }

  @Get()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get all organizations' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update organization' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.organizationsService.update(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Delete organization' })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
