/**
 * Settings Controller
 *
 * REST endpoints for system settings and AI provider key management.
 *
 * System Settings:
 *   GET    /settings              - List all settings (Owner, Admin)
 *   GET    /settings/public       - Public settings (no auth)
 *   GET    /settings/:key         - Get setting by key (Owner, Admin)
 *   POST   /settings              - Create setting (Owner)
 *   PATCH  /settings/:key         - Update setting (Owner, Admin)
 *   DELETE /settings/:key         - Delete setting (Owner)
 *
 * AI Provider Keys:
 *   GET    /settings/ai-providers      - List AI keys (Owner, Admin)
 *   GET    /settings/ai-providers/:id  - Get AI key by ID (Owner, Admin)
 *   POST   /settings/ai-providers      - Create AI key (Owner)
 *   PATCH  /settings/ai-providers/:id  - Update AI key (Owner, Admin)
 *   DELETE /settings/ai-providers/:id  - Delete AI key (Owner)
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
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SettingsService } from './settings.service';
import { SettingCategory } from './entities/system-setting.entity';
import {
  CreateSettingDto,
  UpdateSettingDto,
  CreateAiProviderKeyDto,
  UpdateAiProviderKeyDto,
} from './dto/settings.dto';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ============================================================================
  // SYSTEM SETTINGS
  // ============================================================================

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'List of system settings' })
  @ApiQuery({ name: 'category', required: false, enum: SettingCategory })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async getAllSettings(
    @Query('category') category?: SettingCategory,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.settingsService.getAllSettings(organizationId, category);
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get public settings (no auth required)' })
  @ApiResponse({ status: 200, description: 'List of public settings' })
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get('ai-providers')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all AI provider keys' })
  @ApiResponse({ status: 200, description: 'List of AI provider keys (API keys masked)' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async getAiProviderKeys(
    @Query('organizationId') organizationId?: string,
  ) {
    return this.settingsService.getAiProviderKeys(organizationId);
  }

  @Get('ai-providers/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get AI provider key by ID' })
  @ApiResponse({ status: 200, description: 'AI provider key details (API key masked)' })
  @ApiResponse({ status: 404, description: 'AI provider key not found' })
  @ApiParam({ name: 'id', type: String, description: 'AI provider key UUID' })
  async getAiProviderKey(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.getAiProviderKey(id);
  }

  @Get(':key')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get setting by key' })
  @ApiResponse({ status: 200, description: 'Setting details' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiParam({ name: 'key', type: String, description: 'Setting key' })
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new system setting' })
  @ApiResponse({ status: 201, description: 'Setting created' })
  @ApiResponse({ status: 409, description: 'Setting key already exists' })
  async createSetting(@Body() dto: CreateSettingDto) {
    return this.settingsService.createSetting(dto);
  }

  @Post('ai-providers')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new AI provider key' })
  @ApiResponse({ status: 201, description: 'AI provider key created (API key masked in response)' })
  @ApiResponse({ status: 409, description: 'Provider key already exists for this organization' })
  async createAiProviderKey(@Body() dto: CreateAiProviderKeyDto) {
    return this.settingsService.createAiProviderKey(dto);
  }

  @Patch('ai-providers/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an AI provider key' })
  @ApiResponse({ status: 200, description: 'AI provider key updated' })
  @ApiResponse({ status: 404, description: 'AI provider key not found' })
  @ApiParam({ name: 'id', type: String, description: 'AI provider key UUID' })
  async updateAiProviderKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiProviderKeyDto,
  ) {
    return this.settingsService.updateAiProviderKey(id, dto);
  }

  @Delete('ai-providers/:id')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an AI provider key' })
  @ApiResponse({ status: 204, description: 'AI provider key deleted' })
  @ApiResponse({ status: 404, description: 'AI provider key not found' })
  @ApiParam({ name: 'id', type: String, description: 'AI provider key UUID' })
  async deleteAiProviderKey(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.deleteAiProviderKey(id);
  }

  @Patch(':key')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a system setting' })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiParam({ name: 'key', type: String, description: 'Setting key' })
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.settingsService.updateSetting(key, dto);
  }

  @Delete(':key')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a system setting' })
  @ApiResponse({ status: 204, description: 'Setting deleted' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiParam({ name: 'key', type: String, description: 'Setting key' })
  async deleteSetting(@Param('key') key: string) {
    return this.settingsService.deleteSetting(key);
  }
}
