import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/decorators/roles.decorator';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { SyncPermissionsDto } from './dto/sync-permissions.dto';

@ApiTags('rbac')
@Controller('rbac')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ==================== Roles ====================

  @Get('roles')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'Roles list' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAllRoles(
    @Query('organizationId') organizationId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.rbacService.findAllRoles({
      organizationId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('roles')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Get('roles/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  async findRoleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbacService.findRoleById(id);
  }

  @Patch('roles/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  async deleteRole(@Param('id', ParseUUIDPipe) id: string) {
    await this.rbacService.deleteRole(id);
    return { message: 'Role deleted' };
  }

  @Put('roles/:id/permissions')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Sync permissions for a role' })
  @ApiResponse({ status: 200, description: 'Permissions synced' })
  async syncPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncPermissionsDto,
  ) {
    return this.rbacService.syncRolePermissions(id, dto.permissionIds);
  }

  // ==================== Permissions ====================

  @Get('permissions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions list' })
  @ApiQuery({ name: 'resource', required: false })
  async findAllPermissions(@Query('resource') resource?: string) {
    return this.rbacService.findAllPermissions({ resource });
  }

  @Post('permissions')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created' })
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  // ==================== User-Role Assignment ====================

  @Post('users/:userId/roles')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  async assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    await this.rbacService.assignRoleToUser(userId, dto.roleId);
    return { message: 'Role assigned to user' };
  }

  @Delete('users/:userId/roles/:roleId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed' })
  async removeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    await this.rbacService.removeRoleFromUser(userId, roleId);
    return { message: 'Role removed from user' };
  }

  @Get('users/:userId/roles')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user roles' })
  @ApiResponse({ status: 200, description: 'User roles' })
  async getUserRoles(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.rbacService.getUserRoles(userId);
  }

  @Get('users/:userId/permissions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user permissions (flattened from all roles)' })
  @ApiResponse({ status: 200, description: 'User permissions' })
  async getUserPermissions(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.rbacService.getUserPermissions(userId);
  }
}
