/**
 * Storage Service
 * S3 + CloudFront integration for file storage
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { FileRecord } from "./entities/file.entity";
// AWS SDK is optional - provide types for dynamic require
type S3CommandConstructor = new (input: Record<string, unknown>) => unknown;
interface S3Response {
  [key: string]: unknown;
  ETag?: string;
  ContentLength?: number;
  ContentType?: string;
  LastModified?: Date;
  Contents?: Array<{
    Key?: string;
    Size?: number;
    LastModified?: Date;
    ETag?: string;
  }>;
  Body?: unknown;
}
type S3ClientConstructor = new (config: Record<string, unknown>) => {
  send: (command: unknown) => Promise<S3Response>;
};
type GetSignedUrlFn = (
  client: unknown,
  command: unknown,
  options: { expiresIn: number },
) => Promise<string>;

let S3Client: S3ClientConstructor | undefined;
let PutObjectCommand: S3CommandConstructor | undefined;
let GetObjectCommand: S3CommandConstructor | undefined;
let DeleteObjectCommand: S3CommandConstructor | undefined;
let ListObjectsV2Command: S3CommandConstructor | undefined;
let CopyObjectCommand: S3CommandConstructor | undefined;
let HeadObjectCommand: S3CommandConstructor | undefined;
let getSignedUrl: GetSignedUrlFn | undefined;

try {
  const s3Module = require("@aws-sdk/client-s3");
  S3Client = s3Module.S3Client;
  PutObjectCommand = s3Module.PutObjectCommand;
  GetObjectCommand = s3Module.GetObjectCommand;
  DeleteObjectCommand = s3Module.DeleteObjectCommand;
  ListObjectsV2Command = s3Module.ListObjectsV2Command;
  CopyObjectCommand = s3Module.CopyObjectCommand;
  HeadObjectCommand = s3Module.HeadObjectCommand;

  getSignedUrl = require("@aws-sdk/s3-request-presigner").getSignedUrl;
} catch {
  // AWS SDK not installed - will throw at runtime if used
}
import * as crypto from "crypto";
import * as path from "path";
import { validateMagicBytes } from "../../common/utils/file-validation";

export interface UploadResult {
  key: string;
  url: string;
  cdnUrl?: string;
  size: number;
  mimeType: string;
  etag?: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  cdnUrl: string;
  expiresAt: Date;
}

export interface FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: {
    send: (command: unknown) => Promise<S3Response>;
  };
  private readonly bucket: string;
  private readonly cdnDomain: string | undefined;
  private readonly region: string;
  private readonly endpoint: string | undefined;
  private readonly publicBaseUrl: string | undefined;
  private readonly forcePathStyle: boolean;

  // Allowed MIME types for different categories
  private readonly allowedMimeTypes = {
    image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    document: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    spreadsheet: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
    any: ["*/*"],
  };

  // Max file sizes in bytes
  private readonly maxFileSizes = {
    image: 10 * 1024 * 1024, // 10 MB
    document: 50 * 1024 * 1024, // 50 MB
    spreadsheet: 20 * 1024 * 1024, // 20 MB
    default: 100 * 1024 * 1024, // 100 MB
  };

  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRecordRepository: Repository<FileRecord>,
    private readonly configService: ConfigService,
  ) {
    this.region = this.configService.get(
      "STORAGE_REGION",
      this.configService.get("AWS_REGION", "us-east-1"),
    );
    this.bucket = this.configService.get(
      "STORAGE_BUCKET",
      this.configService.get("AWS_S3_BUCKET", "vendhub-storage"),
    );
    this.endpoint = this.normalizeUrl(
      this.configService.get<string>("STORAGE_ENDPOINT"),
    );
    this.forcePathStyle = this.endpoint
      ? this.configService.get("STORAGE_FORCE_PATH_STYLE", "true") !== "false"
      : false;
    this.cdnDomain = this.configService.get("AWS_CLOUDFRONT_DOMAIN");
    this.publicBaseUrl = this.resolvePublicBaseUrl();

    if (!S3Client) {
      this.logger.warn(
        "AWS S3 SDK not installed. Storage operations will be unavailable. Install @aws-sdk/client-s3 to enable.",
      );
      return;
    }

    this.s3Client = new S3Client({
      region: this.region,
      ...(this.endpoint && {
        endpoint: this.endpoint,
        forcePathStyle: this.forcePathStyle,
      }),
      credentials: {
        accessKeyId: this.configService.get(
          "STORAGE_ACCESS_KEY",
          this.configService.get("AWS_ACCESS_KEY_ID", ""),
        ),
        secretAccessKey: this.configService.get(
          "STORAGE_SECRET_KEY",
          this.configService.get("AWS_SECRET_ACCESS_KEY", ""),
        ),
      },
    });
  }

  // ========================================================================
  // UPLOAD METHODS
  // ========================================================================

  /**
   * Upload file directly
   */
  async uploadFile(
    organizationId: string,
    folder: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    const key = this.generateKey(organizationId, folder, fileName);

    try {
      const command = new (PutObjectCommand as S3CommandConstructor)({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          organizationId,
          originalName: fileName,
          ...metadata,
        },
        CacheControl: "max-age=31536000", // 1 year for immutable files
      });

      const result = await this.s3Client.send(command);

      const url = this.getS3Url(key);
      const cdnUrl = this.getCdnUrl(key);

      this.logger.log(`Uploaded file: ${key}`);

      return {
        key,
        url,
        cdnUrl,
        size: buffer.length,
        mimeType,
        ...(result.ETag !== undefined && { etag: result.ETag }),
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw new BadRequestException("Failed to upload file");
    }
  }

  /**
   * Upload base64 encoded file
   */
  // Dangerous MIME types that should never be uploaded
  private readonly blockedMimeTypes = [
    "application/x-executable",
    "application/x-sharedlib",
    "application/x-shellscript",
    "application/x-msdos-program",
    "application/x-msdownload",
    "application/vnd.microsoft.portable-executable",
    "text/html",
    "application/javascript",
    "text/javascript",
  ];

  async uploadBase64(
    organizationId: string,
    folder: string,
    base64Data: string,
    fileName: string,
  ): Promise<UploadResult> {
    // Extract MIME type and data from base64 string
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new BadRequestException("Invalid base64 data format");
    }

    const mimeType = matches[1]!;

    // Block dangerous MIME types
    if (this.blockedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `MIME type ${mimeType} is not allowed for upload`,
      );
    }

    const buffer = Buffer.from(matches[2]!, "base64");

    // Verify magic bytes match the claimed MIME type
    validateMagicBytes(buffer, mimeType);

    return this.uploadFile(organizationId, folder, fileName, buffer, mimeType);
  }

  /**
   * Generate presigned URL for client-side upload
   */
  async getPresignedUploadUrl(
    organizationId: string,
    folder: string,
    fileName: string,
    mimeType: string,
    fileCategory: "image" | "document" | "spreadsheet" | "any" = "any",
    expiresInSeconds: number = 3600,
  ): Promise<PresignedUrlResult> {
    // Validate MIME type
    if (fileCategory !== "any") {
      const allowed = this.allowedMimeTypes[fileCategory];
      if (!allowed.includes(mimeType)) {
        throw new BadRequestException(
          `File type ${mimeType} not allowed for ${fileCategory}`,
        );
      }
    }

    const key = this.generateKey(organizationId, folder, fileName);

    try {
      const command = new (PutObjectCommand as S3CommandConstructor)({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
        Metadata: {
          organizationId,
          originalName: fileName,
        },
        // NOTE: S3 PUT presigned URLs cannot enforce max content-length.
        // Size enforcement must be done via S3 bucket policy with
        // s3:content-length-range condition, or by verifying after upload.
      });

      const uploadUrl = await (getSignedUrl as GetSignedUrlFn)(
        this.s3Client,
        command,
        {
          expiresIn: expiresInSeconds,
        },
      );

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      return {
        uploadUrl,
        key,
        cdnUrl: this.getCdnUrl(key),
        expiresAt,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to generate presigned URL`, error);
      throw new BadRequestException("Failed to generate upload URL");
    }
  }

  // ========================================================================
  // DOWNLOAD METHODS
  // ========================================================================

  /**
   * Get file as buffer
   */
  async getFile(
    organizationId: string,
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    this.validateKeyAccess(key, organizationId);
    try {
      const command = new (GetObjectCommand as S3CommandConstructor)({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      const body = response.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of body) {
        chunks.push(chunk);
      }

      return {
        buffer: Buffer.concat(chunks),
        contentType: response.ContentType || "application/octet-stream",
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "NoSuchKey") {
        throw new NotFoundException("File not found");
      }
      this.logger.error(`Failed to get file: ${key}`, error);
      throw new BadRequestException("Failed to retrieve file");
    }
  }

  /**
   * Generate presigned URL for download
   */
  async getPresignedDownloadUrl(
    organizationId: string,
    key: string,
    expiresInSeconds: number = 3600,
    downloadFileName?: string,
  ): Promise<string> {
    this.validateKeyAccess(key, organizationId);
    try {
      const command = new (GetObjectCommand as S3CommandConstructor)({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: downloadFileName
          ? `attachment; filename="${downloadFileName}"`
          : undefined,
      });

      return await (getSignedUrl as GetSignedUrlFn)(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error: unknown) {
      this.logger.error(`Failed to generate download URL: ${key}`, error);
      throw new BadRequestException("Failed to generate download URL");
    }
  }

  // ========================================================================
  // FILE MANAGEMENT
  // ========================================================================

  /**
   * Check if file exists
   */
  async fileExists(organizationId: string, key: string): Promise<boolean> {
    this.validateKeyAccess(key, organizationId);
    try {
      const command = new (HeadObjectCommand as S3CommandConstructor)({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(
    organizationId: string,
    key: string,
  ): Promise<FileMetadata> {
    this.validateKeyAccess(key, organizationId);
    try {
      const command = new (HeadObjectCommand as S3CommandConstructor)({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        ...(response.ContentType !== undefined && {
          contentType: response.ContentType,
        }),
        ...(response.ETag !== undefined && { etag: response.ETag }),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "NotFound") {
        throw new NotFoundException("File not found");
      }
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(organizationId: string, key: string): Promise<void> {
    this.validateKeyAccess(key, organizationId);
    try {
      const command = new (DeleteObjectCommand as S3CommandConstructor)({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file: ${key}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw new BadRequestException("Failed to delete file");
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(
    organizationId: string,
    keys: string[],
  ): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        await this.deleteFile(organizationId, key);
        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }

  /**
   * Copy file
   */
  async copyFile(
    organizationId: string,
    sourceKey: string,
    destinationKey: string,
  ): Promise<string> {
    this.validateKeyAccess(sourceKey, organizationId);
    try {
      const command = new (CopyObjectCommand as S3CommandConstructor)({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`Copied file from ${sourceKey} to ${destinationKey}`);

      return this.getCdnUrl(destinationKey);
    } catch (error: unknown) {
      this.logger.error(`Failed to copy file`, error);
      throw new BadRequestException("Failed to copy file");
    }
  }

  /**
   * Move file (copy + delete)
   */
  async moveFile(
    organizationId: string,
    sourceKey: string,
    destinationKey: string,
  ): Promise<string> {
    const newUrl = await this.copyFile(
      organizationId,
      sourceKey,
      destinationKey,
    );
    await this.deleteFile(organizationId, sourceKey);
    return newUrl;
  }

  /**
   * List files in a folder
   */
  async listFiles(
    organizationId: string,
    folder: string,
    maxFiles: number = 1000,
  ): Promise<FileMetadata[]> {
    const prefix = `org/${organizationId}/${folder}/`;

    try {
      const command = new (ListObjectsV2Command as S3CommandConstructor)({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxFiles,
      });

      const response = await this.s3Client.send(command);

      return (response.Contents || []).map(
        (item): FileMetadata => ({
          key: item.Key || "",
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
          ...(item.ETag !== undefined && { etag: item.ETag }),
        }),
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to list files in ${prefix}`, error);
      throw new BadRequestException("Failed to list files");
    }
  }

  // ========================================================================
  // FILE RECORD TRACKING
  // ========================================================================

  async trackFileUpload(
    organizationId: string,
    uploadResult: UploadResult,
    userId: string,
    entityType: string,
    entityId: string,
    categoryCode: string = "general",
    originalFilename?: string,
  ): Promise<FileRecord> {
    const record = this.fileRecordRepository.create({
      organizationId,
      originalFilename:
        originalFilename || uploadResult.key.split("/").pop() || "unknown",
      storedFilename: uploadResult.key.split("/").pop() || "",
      filePath: uploadResult.key,
      mimeType: uploadResult.mimeType,
      fileSize: uploadResult.size,
      categoryCode,
      entityType,
      entityId,
      uploadedByUserId: userId,
      url: uploadResult.cdnUrl || uploadResult.url,
    });

    return this.fileRecordRepository.save(record);
  }

  async getFilesByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<FileRecord[]> {
    return this.fileRecordRepository.find({
      where: { organizationId, entityType, entityId },
      order: { createdAt: "DESC" },
    });
  }

  async getFileRecordById(
    organizationId: string,
    id: string,
  ): Promise<FileRecord> {
    const record = await this.fileRecordRepository.findOne({
      where: { id, organizationId },
    });
    if (!record) {
      throw new NotFoundException("File record not found");
    }
    return record;
  }

  async softDeleteFileRecord(
    organizationId: string,
    id: string,
  ): Promise<void> {
    const record = await this.getFileRecordById(organizationId, id);
    await this.deleteFile(organizationId, record.filePath);
    await this.fileRecordRepository.softDelete(id);
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Generate unique file key
   */
  private generateKey(
    organizationId: string,
    folder: string,
    fileName: string,
  ): string {
    const ext = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, path.extname(fileName));
    const hash = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();

    // Sanitize file name
    const sanitizedName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .substring(0, 50);

    // Sanitize folder (defense-in-depth against path traversal)
    const safeFolder = folder
      .replace(/\.\./g, "")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+/g, "/");

    // Sanitize extension (only allow alphanumeric)
    const safeExt = ext.replace(/[^a-z0-9.]/g, "");

    return `org/${organizationId}/${safeFolder}/${sanitizedName}-${timestamp}-${hash}${safeExt}`;
  }

  /**
   * Validate that a file key belongs to the given organization
   */
  private validateKeyAccess(key: string, organizationId: string): void {
    const newPrefix = `org/${organizationId}/`;
    const legacyPrefix = `${organizationId}/`;
    if (!key.startsWith(newPrefix) && !key.startsWith(legacyPrefix)) {
      throw new ForbiddenException("Access denied to this file");
    }
  }

  /**
   * Get direct S3 URL
   */
  private getS3Url(key: string): string {
    if (this.endpoint) {
      const baseUrl = this.forcePathStyle
        ? `${this.endpoint}/${this.bucket}`
        : this.endpoint;
      return this.buildUrl(baseUrl, key);
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Get CloudFront CDN URL
   */
  getCdnUrl(key: string): string {
    if (this.cdnDomain) {
      return this.buildUrl(`https://${this.cdnDomain}`, key);
    }

    if (this.publicBaseUrl) {
      return this.buildUrl(this.publicBaseUrl, key);
    }

    return this.getS3Url(key);
  }

  /**
   * Extract key from URL
   */
  getKeyFromUrl(url: string): string | null {
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) {
      return null;
    }

    // Handle CDN URL
    if (this.cdnDomain) {
      const cdnPrefix = `https://${this.cdnDomain}`;
      if (normalizedUrl.startsWith(`${cdnPrefix}/`)) {
        return normalizedUrl.slice(cdnPrefix.length + 1);
      }
    }

    if (
      this.publicBaseUrl &&
      normalizedUrl.startsWith(`${this.publicBaseUrl}/`)
    ) {
      return normalizedUrl.slice(this.publicBaseUrl.length + 1);
    }

    if (this.endpoint) {
      const endpointPrefix = this.forcePathStyle
        ? `${this.endpoint}/${this.bucket}`
        : this.endpoint;
      if (normalizedUrl.startsWith(`${endpointPrefix}/`)) {
        return normalizedUrl.slice(endpointPrefix.length + 1);
      }
    }

    // Handle S3 URL
    const s3UrlPattern = new RegExp(
      `https://${this.bucket}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`,
    );
    const match = url.match(s3UrlPattern);

    return match ? (match[1] ?? null) : null;
  }

  /**
   * Validate file size
   */
  validateFileSize(
    size: number,
    category: "image" | "document" | "spreadsheet" | "default" = "default",
  ): boolean {
    const maxSize = this.maxFileSizes[category] || this.maxFileSizes.default;
    return size <= maxSize;
  }

  /**
   * Get max file size for category
   */
  getMaxFileSize(
    category: "image" | "document" | "spreadsheet" | "default",
  ): number {
    return this.maxFileSizes[category] || this.maxFileSizes.default;
  }

  /**
   * Get allowed MIME types for category
   */
  getAllowedMimeTypes(
    category: "image" | "document" | "spreadsheet" | "any",
  ): string[] {
    return this.allowedMimeTypes[category] || [];
  }

  private resolvePublicBaseUrl(): string | undefined {
    const configuredPublicUrl = this.normalizeUrl(
      this.configService.get<string>("STORAGE_PUBLIC_URL"),
    );
    if (configuredPublicUrl) {
      return configuredPublicUrl;
    }

    const supabaseUrl = this.normalizeUrl(
      this.configService.get<string>("SUPABASE_URL"),
    );
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/${this.bucket}`;
    }

    if (!this.endpoint) {
      return undefined;
    }

    const supabaseEndpointMatch = this.endpoint.match(
      /^(https:\/\/)([^.]+)\.storage\.supabase\.co\/storage\/v1\/s3$/,
    );

    if (!supabaseEndpointMatch) {
      return undefined;
    }

    const [, protocol, projectRef] = supabaseEndpointMatch;
    return `${protocol}${projectRef}.supabase.co/storage/v1/object/public/${this.bucket}`;
  }

  private buildUrl(baseUrl: string, key: string): string {
    return `${baseUrl.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
  }

  private normalizeUrl(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}
