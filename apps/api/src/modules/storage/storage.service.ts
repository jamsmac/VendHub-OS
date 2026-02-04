/**
 * Storage Service
 * S3 + CloudFront integration for file storage
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// AWS SDK is optional - provide mock types if not installed
let S3Client: any, PutObjectCommand: any, GetObjectCommand: any,
  DeleteObjectCommand: any, ListObjectsV2Command: any, CopyObjectCommand: any, HeadObjectCommand: any;
let getSignedUrl: any;

try {
  const s3Module = require('@aws-sdk/client-s3');
  S3Client = s3Module.S3Client;
  PutObjectCommand = s3Module.PutObjectCommand;
  GetObjectCommand = s3Module.GetObjectCommand;
  DeleteObjectCommand = s3Module.DeleteObjectCommand;
  ListObjectsV2Command = s3Module.ListObjectsV2Command;
  CopyObjectCommand = s3Module.CopyObjectCommand;
  HeadObjectCommand = s3Module.HeadObjectCommand;
  getSignedUrl = require('@aws-sdk/s3-request-presigner').getSignedUrl;
} catch {
  // AWS SDK not installed - will throw at runtime if used
}
import * as crypto from 'crypto';
import * as path from 'path';

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
  private readonly s3Client: typeof S3Client;
  private readonly bucket: string;
  private readonly cdnDomain?: string;
  private readonly region: string;

  // Allowed MIME types for different categories
  private readonly allowedMimeTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    any: ['*/*'],
  };

  // Max file sizes in bytes
  private readonly maxFileSizes = {
    image: 10 * 1024 * 1024,     // 10 MB
    document: 50 * 1024 * 1024,   // 50 MB
    spreadsheet: 20 * 1024 * 1024, // 20 MB
    default: 100 * 1024 * 1024,   // 100 MB
  };

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get('AWS_REGION', 'us-east-1');
    this.bucket = this.configService.get('AWS_S3_BUCKET', 'vendhub-storage');
    this.cdnDomain = this.configService.get('AWS_CLOUDFRONT_DOMAIN');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', ''),
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
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          organizationId,
          originalName: fileName,
          ...metadata,
        },
        CacheControl: 'max-age=31536000', // 1 year for immutable files
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
        etag: result.ETag,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Upload base64 encoded file
   */
  async uploadBase64(
    organizationId: string,
    folder: string,
    base64Data: string,
    fileName: string,
  ): Promise<UploadResult> {
    // Extract MIME type and data from base64 string
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new BadRequestException('Invalid base64 data format');
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

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
    fileCategory: 'image' | 'document' | 'spreadsheet' | 'any' = 'any',
    expiresInSeconds: number = 3600,
  ): Promise<PresignedUrlResult> {
    // Validate MIME type
    if (fileCategory !== 'any') {
      const allowed = this.allowedMimeTypes[fileCategory];
      if (!allowed.includes(mimeType)) {
        throw new BadRequestException(`File type ${mimeType} not allowed for ${fileCategory}`);
      }
    }

    const key = this.generateKey(organizationId, folder, fileName);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
        Metadata: {
          organizationId,
          originalName: fileName,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      return {
        uploadUrl,
        key,
        cdnUrl: this.getCdnUrl(key),
        expiresAt,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate presigned URL`, error);
      throw new BadRequestException('Failed to generate upload URL');
    }
  }

  // ========================================================================
  // DOWNLOAD METHODS
  // ========================================================================

  /**
   * Get file as buffer
   */
  async getFile(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      // @ts-ignore - Body is a readable stream
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }

      return {
        buffer: Buffer.concat(chunks),
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        throw new NotFoundException('File not found');
      }
      this.logger.error(`Failed to get file: ${key}`, error);
      throw new BadRequestException('Failed to retrieve file');
    }
  }

  /**
   * Generate presigned URL for download
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 3600,
    downloadFileName?: string,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: downloadFileName
          ? `attachment; filename="${downloadFileName}"`
          : undefined,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error: any) {
      this.logger.error(`Failed to generate download URL: ${key}`, error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  // ========================================================================
  // FILE MANAGEMENT
  // ========================================================================

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<FileMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
        etag: response.ETag,
      };
    } catch (error: any) {
      if (error.name === 'NotFound') {
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file: ${key}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        await this.deleteFile(key);
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
  async copyFile(sourceKey: string, destinationKey: string): Promise<string> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`Copied file from ${sourceKey} to ${destinationKey}`);

      return this.getCdnUrl(destinationKey);
    } catch (error: any) {
      this.logger.error(`Failed to copy file`, error);
      throw new BadRequestException('Failed to copy file');
    }
  }

  /**
   * Move file (copy + delete)
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<string> {
    const newUrl = await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
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
    const prefix = `${organizationId}/${folder}/`;

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxFiles,
      });

      const response = await this.s3Client.send(command);

      return (response.Contents || []).map((item: any) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        etag: item.ETag,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to list files in ${prefix}`, error);
      throw new BadRequestException('Failed to list files');
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Generate unique file key
   */
  private generateKey(organizationId: string, folder: string, fileName: string): string {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const hash = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();

    // Sanitize file name
    const sanitizedName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);

    return `${organizationId}/${folder}/${sanitizedName}-${timestamp}-${hash}${ext}`;
  }

  /**
   * Get direct S3 URL
   */
  private getS3Url(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Get CloudFront CDN URL
   */
  getCdnUrl(key: string): string {
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${key}`;
    }
    return this.getS3Url(key);
  }

  /**
   * Extract key from URL
   */
  getKeyFromUrl(url: string): string | null {
    // Handle CDN URL
    if (this.cdnDomain && url.includes(this.cdnDomain)) {
      return url.replace(`https://${this.cdnDomain}/`, '');
    }

    // Handle S3 URL
    const s3UrlPattern = new RegExp(
      `https://${this.bucket}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`,
    );
    const match = url.match(s3UrlPattern);

    return match ? match[1] : null;
  }

  /**
   * Validate file size
   */
  validateFileSize(
    size: number,
    category: 'image' | 'document' | 'spreadsheet' | 'default' = 'default',
  ): boolean {
    const maxSize = this.maxFileSizes[category] || this.maxFileSizes.default;
    return size <= maxSize;
  }

  /**
   * Get max file size for category
   */
  getMaxFileSize(category: 'image' | 'document' | 'spreadsheet' | 'default'): number {
    return this.maxFileSizes[category] || this.maxFileSizes.default;
  }

  /**
   * Get allowed MIME types for category
   */
  getAllowedMimeTypes(category: 'image' | 'document' | 'spreadsheet' | 'any'): string[] {
    return this.allowedMimeTypes[category] || [];
  }
}
