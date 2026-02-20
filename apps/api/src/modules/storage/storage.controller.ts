/**
 * Storage Controller
 * REST API endpoints for file storage
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { StorageService, UploadResult, PresignedUrlResult, FileMetadata } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganizationId } from '../../common/decorators/current-user.decorator';

// DTOs
class UploadFileDto {
  folder: string;
  category?: 'image' | 'document' | 'spreadsheet' | 'any';
}

class PresignedUploadDto {
  folder: string;
  fileName: string;
  mimeType: string;
  category?: 'image' | 'document' | 'spreadsheet' | 'any';
  expiresInSeconds?: number;
}

class UploadBase64Dto {
  folder: string;
  fileName: string;
  base64Data: string;
}

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ========================================================================
  // UPLOAD
  // ========================================================================

  @Post('upload')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file directly' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'tasks/photos' },
        category: { type: 'string', enum: ['image', 'document', 'spreadsheet', 'any'] },
      },
    },
  })
  @ApiResponse({ status: 201 })
  async uploadFile(
    @CurrentOrganizationId() organizationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ): Promise<UploadResult> {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file size
    const category = dto.category || 'default';
    if (!this.storageService.validateFileSize(file.size, category as any)) {
      const maxSize = this.storageService.getMaxFileSize(category as any);
      throw new Error(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    return this.storageService.uploadFile(
      organizationId,
      dto.folder,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
  }

  @Post('upload/base64')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Upload base64 encoded file' })
  @ApiResponse({ status: 201 })
  async uploadBase64(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: UploadBase64Dto,
  ): Promise<UploadResult> {
    return this.storageService.uploadBase64(
      organizationId,
      dto.folder,
      dto.base64Data,
      dto.fileName,
    );
  }

  @Post('presigned-url')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get presigned URL for client-side upload' })
  @ApiResponse({ status: 201 })
  async getPresignedUploadUrl(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: PresignedUploadDto,
  ): Promise<PresignedUrlResult> {
    return this.storageService.getPresignedUploadUrl(
      organizationId,
      dto.folder,
      dto.fileName,
      dto.mimeType,
      dto.category || 'any',
      dto.expiresInSeconds || 3600,
    );
  }

  // ========================================================================
  // DOWNLOAD
  // ========================================================================

  @Get('download/:key(*)')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Download file' })
  @ApiParam({ name: 'key', description: 'File key' })
  async downloadFile(
    @Param('key') key: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, contentType } = await this.storageService.getFile(key);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${key.split('/').pop()}"`,
    });

    return new StreamableFile(buffer);
  }

  @Get('presigned-download/:key(*)')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get presigned download URL' })
  @ApiParam({ name: 'key', description: 'File key' })
  @ApiQuery({ name: 'expiresIn', required: false, type: Number })
  @ApiQuery({ name: 'fileName', required: false, type: String })
  async getPresignedDownloadUrl(
    @Param('key') key: string,
    @Query('expiresIn') expiresIn?: number,
    @Query('fileName') fileName?: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const url = await this.storageService.getPresignedDownloadUrl(
      key,
      expiresIn || 3600,
      fileName,
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expiresIn || 3600));

    return { url, expiresAt };
  }

  // ========================================================================
  // FILE MANAGEMENT
  // ========================================================================

  @Get('files')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List files in folder' })
  @ApiQuery({ name: 'folder', required: true })
  @ApiQuery({ name: 'maxFiles', required: false, type: Number })
  async listFiles(
    @CurrentOrganizationId() organizationId: string,
    @Query('folder') folder: string,
    @Query('maxFiles') maxFiles?: number,
  ): Promise<FileMetadata[]> {
    return this.storageService.listFiles(organizationId, folder, maxFiles || 1000);
  }

  @Get('files/metadata/:key(*)')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiParam({ name: 'key', description: 'File key' })
  async getFileMetadata(@Param('key') key: string): Promise<FileMetadata> {
    return this.storageService.getFileMetadata(key);
  }

  @Get('files/exists/:key(*)')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Check if file exists' })
  @ApiParam({ name: 'key', description: 'File key' })
  async fileExists(@Param('key') key: string): Promise<{ exists: boolean }> {
    const exists = await this.storageService.fileExists(key);
    return { exists };
  }

  @Delete('files/:key(*)')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Delete file' })
  @ApiParam({ name: 'key', description: 'File key' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('key') key: string): Promise<void> {
    await this.storageService.deleteFile(key);
  }

  @Post('files/delete-bulk')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Delete multiple files' })
  async deleteFiles(@Body('keys') keys: string[]): Promise<{ deleted: number; failed: number }> {
    return this.storageService.deleteFiles(keys);
  }

  @Post('files/copy')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Copy file' })
  async copyFile(
    @Body('sourceKey') sourceKey: string,
    @Body('destinationKey') destinationKey: string,
  ): Promise<{ url: string }> {
    const url = await this.storageService.copyFile(sourceKey, destinationKey);
    return { url };
  }

  @Post('files/move')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Move file' })
  async moveFile(
    @Body('sourceKey') sourceKey: string,
    @Body('destinationKey') destinationKey: string,
  ): Promise<{ url: string }> {
    const url = await this.storageService.moveFile(sourceKey, destinationKey);
    return { url };
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  @Get('config')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get storage configuration' })
  async getConfig(): Promise<{
    maxFileSizes: Record<string, number>;
    allowedMimeTypes: Record<string, string[]>;
  }> {
    return {
      maxFileSizes: {
        image: this.storageService.getMaxFileSize('image'),
        document: this.storageService.getMaxFileSize('document'),
        spreadsheet: this.storageService.getMaxFileSize('spreadsheet'),
        default: this.storageService.getMaxFileSize('default'),
      },
      allowedMimeTypes: {
        image: this.storageService.getAllowedMimeTypes('image'),
        document: this.storageService.getAllowedMimeTypes('document'),
        spreadsheet: this.storageService.getAllowedMimeTypes('spreadsheet'),
      },
    };
  }
}
