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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";

import { BadRequestException } from "@nestjs/common";
import {
  StorageService,
  UploadResult,
  PresignedUrlResult,
  FileMetadata,
} from "./storage.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentOrganizationId } from "../../common/decorators/current-user.decorator";

import { UploadFileDto, FileCategory } from "./dto/upload-file.dto";
import { UploadBase64Dto } from "./dto/upload-base64.dto";
import { PresignedUploadDto } from "./dto/presigned-upload.dto";
import { PresignedDownloadQueryDto } from "./dto/presigned-download-query.dto";
import { ListFilesQueryDto } from "./dto/list-files-query.dto";
import { DeleteFilesDto } from "./dto/delete-files.dto";
import { CopyFileDto } from "./dto/copy-file.dto";
import { MoveFileDto } from "./dto/move-file.dto";

@ApiTags("Storage")
@ApiBearerAuth()
@Controller("storage")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ========================================================================
  // UPLOAD
  // ========================================================================

  @Post("upload")
  @Roles("operator", "manager", "admin", "owner")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload file directly" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        folder: { type: "string", example: "tasks/photos" },
        category: {
          type: "string",
          enum: ["image", "document", "spreadsheet", "any"],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "File uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid file or parameters" })
  async uploadFile(
    @CurrentOrganizationId() organizationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ): Promise<UploadResult> {
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate MIME type against category allowlist
    const category = dto.category || FileCategory.ANY;
    if (dto.category && dto.category !== FileCategory.ANY) {
      const allowed = this.storageService.getAllowedMimeTypes(dto.category);
      if (allowed.length > 0 && !allowed.includes(file.mimetype)) {
        throw new BadRequestException(
          `MIME type ${file.mimetype} not allowed for category ${dto.category}`,
        );
      }
    }

    // Validate file size
    const sizeCategory =
      category === FileCategory.ANY
        ? "default"
        : (category as "image" | "document" | "spreadsheet" | "default");
    if (!this.storageService.validateFileSize(file.size, sizeCategory)) {
      const maxSize = this.storageService.getMaxFileSize(sizeCategory);
      throw new BadRequestException(
        `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
      );
    }

    return this.storageService.uploadFile(
      organizationId,
      dto.folder,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
  }

  @Post("upload/base64")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Upload base64 encoded file" })
  @ApiResponse({
    status: 201,
    description: "Base64 file uploaded successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid base64 data or parameters",
  })
  async uploadBase64(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: UploadBase64Dto,
  ): Promise<UploadResult> {
    return this.storageService.uploadBase64(
      organizationId,
      dto.folder,
      dto.base64_data,
      dto.file_name,
    );
  }

  @Post("presigned-url")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get presigned URL for client-side upload" })
  @ApiResponse({ status: 201, description: "Presigned upload URL generated" })
  @ApiResponse({
    status: 400,
    description: "Invalid parameters or MIME type not allowed",
  })
  async getPresignedUploadUrl(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: PresignedUploadDto,
  ): Promise<PresignedUrlResult> {
    return this.storageService.getPresignedUploadUrl(
      organizationId,
      dto.folder,
      dto.file_name,
      dto.mime_type,
      dto.category || "any",
      dto.expires_in_seconds || 3600,
    );
  }

  // ========================================================================
  // DOWNLOAD
  // ========================================================================

  @Get("download/:key(*)")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Download file" })
  @ApiParam({ name: "key", description: "File key" })
  @ApiResponse({ status: 200, description: "File stream returned" })
  @ApiResponse({ status: 404, description: "File not found" })
  async downloadFile(
    @Param("key") key: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, contentType } = await this.storageService.getFile(key);

    const rawName = key.split("/").pop() || "download";
    const sanitizedName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${sanitizedName}"`,
    });

    return new StreamableFile(buffer);
  }

  @Get("presigned-download/:key(*)")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get presigned download URL" })
  @ApiParam({ name: "key", description: "File key" })
  @ApiResponse({ status: 200, description: "Presigned download URL generated" })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  async getPresignedDownloadUrl(
    @Param("key") key: string,
    @Query() query: PresignedDownloadQueryDto,
  ): Promise<{ url: string; expiresAt: Date }> {
    const expiresIn = query.expires_in || 3600;
    const url = await this.storageService.getPresignedDownloadUrl(
      key,
      expiresIn,
      query.file_name,
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    return { url, expiresAt };
  }

  // ========================================================================
  // FILE MANAGEMENT
  // ========================================================================

  @Get("files")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "List files in folder" })
  @ApiResponse({ status: 200, description: "List of files returned" })
  async listFiles(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ListFilesQueryDto,
  ): Promise<FileMetadata[]> {
    return this.storageService.listFiles(
      organizationId,
      query.folder,
      query.max_files || 1000,
    );
  }

  @Get("files/metadata/:key(*)")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get file metadata" })
  @ApiParam({ name: "key", description: "File key" })
  @ApiResponse({ status: 200, description: "File metadata returned" })
  @ApiResponse({ status: 404, description: "File not found" })
  async getFileMetadata(@Param("key") key: string): Promise<FileMetadata> {
    return this.storageService.getFileMetadata(key);
  }

  @Get("files/exists/:key(*)")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Check if file exists" })
  @ApiParam({ name: "key", description: "File key" })
  @ApiResponse({ status: 200, description: "File existence check result" })
  async fileExists(@Param("key") key: string): Promise<{ exists: boolean }> {
    const exists = await this.storageService.fileExists(key);
    return { exists };
  }

  @Delete("files/:key(*)")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Delete file" })
  @ApiParam({ name: "key", description: "File key" })
  @ApiResponse({ status: 204, description: "File deleted successfully" })
  @ApiResponse({ status: 400, description: "Failed to delete file" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param("key") key: string): Promise<void> {
    await this.storageService.deleteFile(key);
  }

  @Post("files/delete-bulk")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Delete multiple files" })
  @ApiResponse({ status: 200, description: "Bulk delete result" })
  @ApiResponse({ status: 400, description: "Invalid parameters" })
  async deleteFiles(
    @Body() dto: DeleteFilesDto,
  ): Promise<{ deleted: number; failed: number }> {
    return this.storageService.deleteFiles(dto.keys);
  }

  @Post("files/copy")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Copy file" })
  @ApiResponse({ status: 200, description: "File copied successfully" })
  @ApiResponse({ status: 400, description: "Failed to copy file" })
  async copyFile(@Body() dto: CopyFileDto): Promise<{ url: string }> {
    const url = await this.storageService.copyFile(
      dto.source_key,
      dto.destination_key,
    );
    return { url };
  }

  @Post("files/move")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Move file" })
  @ApiResponse({ status: 200, description: "File moved successfully" })
  @ApiResponse({ status: 400, description: "Failed to move file" })
  async moveFile(@Body() dto: MoveFileDto): Promise<{ url: string }> {
    const url = await this.storageService.moveFile(
      dto.source_key,
      dto.destination_key,
    );
    return { url };
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  @Get("config")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get storage configuration" })
  @ApiResponse({ status: 200, description: "Storage configuration returned" })
  async getConfig(): Promise<{
    maxFileSizes: Record<string, number>;
    allowedMimeTypes: Record<string, string[]>;
  }> {
    return {
      maxFileSizes: {
        image: this.storageService.getMaxFileSize("image"),
        document: this.storageService.getMaxFileSize("document"),
        spreadsheet: this.storageService.getMaxFileSize("spreadsheet"),
        default: this.storageService.getMaxFileSize("default"),
      },
      allowedMimeTypes: {
        image: this.storageService.getAllowedMimeTypes("image"),
        document: this.storageService.getAllowedMimeTypes("document"),
        spreadsheet: this.storageService.getAllowedMimeTypes("spreadsheet"),
      },
    };
  }
}
