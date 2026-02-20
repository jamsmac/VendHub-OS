/**
 * Directories Controller for VendHub OS
 *
 * REST endpoints for managing directories (справочники), their field
 * definitions, entries, external sources, sync, audit, and hierarchy.
 *
 * All endpoints require JWT authentication. Role-based access:
 * - Read: all authenticated users
 * - Write: owner, admin, manager
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { DirectoriesService } from './directories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles, UserRole } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateDirectoryDto,
  UpdateDirectoryDto,
  CreateDirectoryFieldDto,
  UpdateDirectoryFieldDto,
  CreateDirectoryEntryDto,
  UpdateDirectoryEntryDto,
  QueryDirectoriesDto,
  QueryEntriesDto,
  SearchEntriesDto,
} from './dto/directory.dto';
import {
  CreateDirectorySourceDto,
  UpdateDirectorySourceDto,
  QueryDirectorySourcesDto,
} from './dto/directory-source.dto';
import { TriggerSyncDto, QuerySyncLogsDto } from './dto/directory-sync.dto';
import { QueryAuditLogsDto } from './dto/directory-audit.dto';
import { MoveEntryDto, InlineCreateEntryDto } from './dto/directory-hierarchy.dto';

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: string;
}

// =============================================================================
// DIRECTORIES CONTROLLER
// =============================================================================

@ApiTags('directories')
@Controller('directories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DirectoriesController {
  constructor(private readonly directoriesService: DirectoriesService) {}

  // ===========================================================================
  // DIRECTORY CRUD
  // ===========================================================================

  @Get()
  @ApiOperation({ summary: 'List all directories (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of directories' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryDirectoriesDto,
  ) {
    return this.directoriesService.findAll(user.organizationId, query);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new directory' })
  @ApiResponse({ status: 201, description: 'Directory created' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  create(
    @Body() dto: CreateDirectoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.create(dto, user.organizationId, user.id);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get directory by slug' })
  @ApiParam({ name: 'slug', description: 'Directory slug', example: 'units' })
  @ApiResponse({ status: 200, description: 'Directory with fields' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.findBySlug(slug, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get directory by ID with field definitions' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 200, description: 'Directory with fields' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 200, description: 'Directory updated' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDirectoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.update(id, dto, user.organizationId, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 204, description: 'Directory deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete system directory' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.remove(id, user.organizationId);
  }

  // ===========================================================================
  // FIELD DEFINITIONS
  // ===========================================================================

  @Post(':id/fields')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Add a field definition to a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 201, description: 'Field created' })
  @ApiResponse({ status: 409, description: 'Field name already exists in directory' })
  addField(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Body() dto: CreateDirectoryFieldDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.addField(directoryId, dto, user.organizationId);
  }

  @Patch(':id/fields/:fieldId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update a field definition' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'fieldId', description: 'Field UUID' })
  @ApiResponse({ status: 200, description: 'Field updated' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  updateField(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() dto: UpdateDirectoryFieldDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.updateField(
      directoryId,
      fieldId,
      dto,
      user.organizationId,
    );
  }

  @Delete(':id/fields/:fieldId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a field definition from a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'fieldId', description: 'Field UUID' })
  @ApiResponse({ status: 204, description: 'Field removed' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  removeField(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.removeField(
      directoryId,
      fieldId,
      user.organizationId,
    );
  }

  // ===========================================================================
  // ENTRIES
  // ===========================================================================

  @Get(':id/entries')
  @ApiOperation({ summary: 'List entries for a directory (paginated)' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of entries' })
  findAllEntries(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryEntriesDto,
  ) {
    return this.directoriesService.findAllEntries(
      directoryId,
      user.organizationId,
      query,
    );
  }

  @Get(':id/entries/search')
  @ApiOperation({ summary: 'Search entries within a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 200, description: 'Matching entries' })
  searchEntries(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchEntriesDto,
  ) {
    return this.directoriesService.searchEntries(
      directoryId,
      query.q,
      user.organizationId,
      query.limit,
    );
  }

  @Post(':id/entries')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create an entry in a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 201, description: 'Entry created' })
  createEntry(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Body() dto: CreateDirectoryEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.createEntry(
      directoryId,
      dto,
      user.organizationId,
      user.id,
    );
  }

  @Post(':id/entries/inline')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Create an entry with minimal data (inline from DirectorySelect)' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 201, description: 'Entry created' })
  @ApiResponse({ status: 400, description: 'Inline create not allowed' })
  inlineCreateEntry(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Body() dto: InlineCreateEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.inlineCreateEntry(
      directoryId,
      dto,
      user.organizationId,
      user.id,
    );
  }

  @Get(':id/entries/:entryId')
  @ApiOperation({ summary: 'Get a single entry by ID' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'entryId', description: 'Entry UUID' })
  @ApiResponse({ status: 200, description: 'Entry details' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  findOneEntry(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.findOneEntry(
      directoryId,
      entryId,
      user.organizationId,
    );
  }

  @Patch(':id/entries/:entryId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update an entry' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'entryId', description: 'Entry UUID' })
  @ApiResponse({ status: 200, description: 'Entry updated' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  updateEntry(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateDirectoryEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.updateEntry(
      directoryId,
      entryId,
      dto,
      user.organizationId,
      user.id,
    );
  }

  @Delete(':id/entries/:entryId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an entry' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'entryId', description: 'Entry UUID' })
  @ApiResponse({ status: 204, description: 'Entry deleted' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  removeEntry(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.removeEntry(
      directoryId,
      entryId,
      user.organizationId,
      user.id,
    );
  }

  @Get(':id/entries/:entryId/audit')
  @ApiOperation({ summary: 'Get audit logs for a specific entry' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'entryId', description: 'Entry UUID' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  findEntryAuditLogs(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.directoriesService.findEntryAuditLogs(
      directoryId,
      entryId,
      user.organizationId,
      query,
    );
  }

  @Post(':id/entries/:entryId/move')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Move an entry to a new parent in hierarchy' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'entryId', description: 'Entry UUID' })
  @ApiResponse({ status: 200, description: 'Entry moved' })
  @ApiResponse({ status: 400, description: 'Invalid move (cycle or non-hierarchical)' })
  moveEntry(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: MoveEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.moveEntry(
      directoryId,
      entryId,
      dto,
      user.organizationId,
      user.id,
    );
  }

  // ===========================================================================
  // SOURCES
  // ===========================================================================

  @Get(':id/sources')
  @ApiOperation({ summary: 'List external sources for a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of sources' })
  findAllSources(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryDirectorySourcesDto,
  ) {
    return this.directoriesService.findAllSources(
      directoryId,
      user.organizationId,
      query,
    );
  }

  @Post(':id/sources')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create an external source for a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 201, description: 'Source created' })
  createSource(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Body() dto: CreateDirectorySourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.createSource(
      directoryId,
      dto,
      user.organizationId,
    );
  }

  @Get(':id/sources/:sourceId')
  @ApiOperation({ summary: 'Get a single source by ID' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'sourceId', description: 'Source UUID' })
  @ApiResponse({ status: 200, description: 'Source details' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  findOneSource(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.findOneSource(
      directoryId,
      sourceId,
      user.organizationId,
    );
  }

  @Patch(':id/sources/:sourceId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update a source configuration' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'sourceId', description: 'Source UUID' })
  @ApiResponse({ status: 200, description: 'Source updated' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  updateSource(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() dto: UpdateDirectorySourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.updateSource(
      directoryId,
      sourceId,
      dto,
      user.organizationId,
    );
  }

  @Delete(':id/sources/:sourceId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a source configuration' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'sourceId', description: 'Source UUID' })
  @ApiResponse({ status: 204, description: 'Source deleted' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  removeSource(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.removeSource(
      directoryId,
      sourceId,
      user.organizationId,
    );
  }

  @Post(':id/sources/:sourceId/sync')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Trigger a sync from an external source' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiParam({ name: 'sourceId', description: 'Source UUID' })
  @ApiResponse({ status: 200, description: 'Sync log' })
  @ApiResponse({ status: 400, description: 'Source is inactive' })
  triggerSync(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() dto: TriggerSyncDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.triggerSync(
      directoryId,
      sourceId,
      user.organizationId,
      user.id,
      dto.sourceVersion,
    );
  }

  // ===========================================================================
  // SYNC LOGS
  // ===========================================================================

  @Get(':id/sync-logs')
  @ApiOperation({ summary: 'List sync logs for a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 200, description: 'Paginated sync logs' })
  findSyncLogs(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuerySyncLogsDto,
  ) {
    return this.directoriesService.findSyncLogs(
      directoryId,
      user.organizationId,
      query,
    );
  }

  // ===========================================================================
  // AUDIT
  // ===========================================================================

  @Get(':id/audit')
  @ApiOperation({ summary: 'List audit logs for a directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  findAuditLogs(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.directoriesService.findAuditLogs(
      directoryId,
      user.organizationId,
      query,
    );
  }

  // ===========================================================================
  // HIERARCHY
  // ===========================================================================

  @Get(':id/tree')
  @ApiOperation({ summary: 'Get hierarchy tree for a hierarchical directory' })
  @ApiParam({ name: 'id', description: 'Directory UUID' })
  @ApiResponse({ status: 200, description: 'Nested tree of entries' })
  @ApiResponse({ status: 400, description: 'Directory is not hierarchical' })
  getTree(
    @Param('id', ParseUUIDPipe) directoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directoriesService.getHierarchyTree(
      directoryId,
      user.organizationId,
    );
  }
}
