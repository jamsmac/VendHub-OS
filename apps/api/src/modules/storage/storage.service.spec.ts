import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from './storage.service';

// Mock S3 commands and client
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'PutObject' })),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'GetObject' })),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'DeleteObject' })),
  ListObjectsV2Command: jest.fn().mockImplementation((params) => ({ ...params, _type: 'ListObjects' })),
  CopyObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'CopyObject' })),
  HeadObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'HeadObject' })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com'),
}));

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;

  const mockConfigValues: Record<string, string> = {
    AWS_REGION: 'us-east-1',
    AWS_S3_BUCKET: 'vendhub-test-bucket',
    AWS_CLOUDFRONT_DOMAIN: 'cdn.vendhub.test',
    AWS_ACCESS_KEY_ID: 'test-access-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  };

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return mockConfigValues[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // UPLOAD FILE
  // ==========================================================================

  describe('uploadFile', () => {
    it('should upload a file and return UploadResult', async () => {
      mockSend.mockResolvedValue({ ETag: '"abc123"' });

      const buffer = Buffer.from('test file content');
      const result = await service.uploadFile(
        'org-1',
        'images',
        'photo.jpg',
        buffer,
        'image/jpeg',
      );

      expect(result.key).toContain('org-1/images/');
      expect(result.key).toContain('.jpg');
      expect(result.size).toBe(buffer.length);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.etag).toBe('"abc123"');
      expect(result.url).toContain('vendhub-test-bucket');
      expect(result.cdnUrl).toContain('cdn.vendhub.test');
    });

    it('should include custom metadata in upload', async () => {
      mockSend.mockResolvedValue({ ETag: '"xyz"' });

      const buffer = Buffer.from('data');
      await service.uploadFile('org-1', 'docs', 'report.pdf', buffer, 'application/pdf', {
        category: 'finance',
      });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw BadRequestException on S3 error', async () => {
      mockSend.mockRejectedValue(new Error('S3 error'));

      const buffer = Buffer.from('data');
      await expect(
        service.uploadFile('org-1', 'images', 'fail.jpg', buffer, 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // UPLOAD BASE64
  // ==========================================================================

  describe('uploadBase64', () => {
    it('should parse base64 data and upload', async () => {
      mockSend.mockResolvedValue({ ETag: '"b64"' });

      const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
      const result = await service.uploadBase64('org-1', 'images', base64, 'image.png');

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('image/png');
    });

    it('should throw BadRequestException for invalid base64 format', async () => {
      await expect(
        service.uploadBase64('org-1', 'images', 'not-valid-base64', 'bad.png'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // PRESIGNED UPLOAD URL
  // ==========================================================================

  describe('getPresignedUploadUrl', () => {
    it('should generate a presigned upload URL', async () => {
      const result = await service.getPresignedUploadUrl(
        'org-1',
        'uploads',
        'file.pdf',
        'application/pdf',
      );

      expect(result.uploadUrl).toBe('https://presigned-url.example.com');
      expect(result.key).toContain('org-1/uploads/');
      expect(result.cdnUrl).toContain('cdn.vendhub.test');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject disallowed MIME types for image category', async () => {
      await expect(
        service.getPresignedUploadUrl('org-1', 'images', 'file.exe', 'application/exe', 'image'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow any MIME type for "any" category', async () => {
      const result = await service.getPresignedUploadUrl(
        'org-1',
        'misc',
        'data.bin',
        'application/octet-stream',
        'any',
      );

      expect(result.uploadUrl).toBeDefined();
    });
  });

  // ==========================================================================
  // GET FILE
  // ==========================================================================

  describe('getFile', () => {
    it('should retrieve file buffer and content type', async () => {
      const chunks = [Buffer.from('hello'), Buffer.from(' world')];
      mockSend.mockResolvedValue({
        Body: (async function* () {
          for (const chunk of chunks) yield chunk;
        })(),
        ContentType: 'text/plain',
      });

      const result = await service.getFile('org-1/docs/file.txt');

      expect(result.buffer.toString()).toBe('hello world');
      expect(result.contentType).toBe('text/plain');
    });

    it('should throw NotFoundException when key does not exist', async () => {
      const error: any = new Error('Not found');
      error.name = 'NoSuchKey';
      mockSend.mockRejectedValue(error);

      await expect(service.getFile('non/existent/key'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for other S3 errors', async () => {
      mockSend.mockRejectedValue(new Error('S3 internal error'));

      await expect(service.getFile('some/key'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // PRESIGNED DOWNLOAD URL
  // ==========================================================================

  describe('getPresignedDownloadUrl', () => {
    it('should generate a presigned download URL', async () => {
      const result = await service.getPresignedDownloadUrl('org-1/docs/file.pdf');

      expect(result).toBe('https://presigned-url.example.com');
    });
  });

  // ==========================================================================
  // FILE EXISTS
  // ==========================================================================

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.fileExists('org-1/images/photo.jpg');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const error: any = new Error('Not found');
      error.name = 'NotFound';
      mockSend.mockRejectedValue(error);

      const result = await service.fileExists('non/existent/key');

      expect(result).toBe(false);
    });

    it('should re-throw non-NotFound errors', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      await expect(service.fileExists('some/key')).rejects.toThrow('Network error');
    });
  });

  // ==========================================================================
  // GET FILE METADATA
  // ==========================================================================

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const lastModified = new Date('2025-06-01');
      mockSend.mockResolvedValue({
        ContentLength: 1024,
        LastModified: lastModified,
        ContentType: 'image/jpeg',
        ETag: '"abc"',
      });

      const result = await service.getFileMetadata('org-1/images/photo.jpg');

      expect(result.key).toBe('org-1/images/photo.jpg');
      expect(result.size).toBe(1024);
      expect(result.lastModified).toEqual(lastModified);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.etag).toBe('"abc"');
    });

    it('should throw NotFoundException when file not found', async () => {
      const error: any = new Error('Not found');
      error.name = 'NotFound';
      mockSend.mockRejectedValue(error);

      await expect(service.getFileMetadata('non/existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // DELETE FILE
  // ==========================================================================

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      mockSend.mockResolvedValue({});

      await service.deleteFile('org-1/images/photo.jpg');

      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw BadRequestException on S3 error', async () => {
      mockSend.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteFile('some/key'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // DELETE FILES (BATCH)
  // ==========================================================================

  describe('deleteFiles', () => {
    it('should delete multiple files and count results', async () => {
      mockSend
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('fail'));

      const result = await service.deleteFiles(['key1', 'key2', 'key3']);

      expect(result.deleted).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should return all deleted when all succeed', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.deleteFiles(['k1', 'k2']);

      expect(result.deleted).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  // ==========================================================================
  // COPY FILE
  // ==========================================================================

  describe('copyFile', () => {
    it('should copy a file and return CDN URL', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.copyFile('source/key', 'dest/key');

      expect(result).toContain('cdn.vendhub.test/dest/key');
    });

    it('should throw BadRequestException on copy error', async () => {
      mockSend.mockRejectedValue(new Error('Copy failed'));

      await expect(service.copyFile('src', 'dst'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // MOVE FILE
  // ==========================================================================

  describe('moveFile', () => {
    it('should copy then delete the source file', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.moveFile('old/key', 'new/key');

      expect(result).toContain('new/key');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // LIST FILES
  // ==========================================================================

  describe('listFiles', () => {
    it('should return list of files in a folder', async () => {
      const lastModified = new Date('2025-05-01');
      mockSend.mockResolvedValue({
        Contents: [
          { Key: 'org-1/images/photo1.jpg', Size: 1024, LastModified: lastModified, ETag: '"a"' },
          { Key: 'org-1/images/photo2.jpg', Size: 2048, LastModified: lastModified, ETag: '"b"' },
        ],
      });

      const result = await service.listFiles('org-1', 'images');

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('org-1/images/photo1.jpg');
      expect(result[0].size).toBe(1024);
    });

    it('should return empty array when no files', async () => {
      mockSend.mockResolvedValue({ Contents: undefined });

      const result = await service.listFiles('org-1', 'empty-folder');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  describe('getCdnUrl', () => {
    it('should return CDN URL when domain is configured', () => {
      const result = service.getCdnUrl('org-1/images/file.jpg');

      expect(result).toBe('https://cdn.vendhub.test/org-1/images/file.jpg');
    });
  });

  describe('getKeyFromUrl', () => {
    it('should extract key from CDN URL', () => {
      const result = service.getKeyFromUrl('https://cdn.vendhub.test/org-1/images/file.jpg');

      expect(result).toBe('org-1/images/file.jpg');
    });

    it('should extract key from S3 URL', () => {
      const result = service.getKeyFromUrl(
        'https://vendhub-test-bucket.s3.us-east-1.amazonaws.com/org-1/images/file.jpg',
      );

      expect(result).toBe('org-1/images/file.jpg');
    });

    it('should return null for unrecognized URL', () => {
      const result = service.getKeyFromUrl('https://other-domain.com/file.jpg');

      expect(result).toBeNull();
    });
  });

  describe('validateFileSize', () => {
    it('should return true when file size is within limit', () => {
      expect(service.validateFileSize(5 * 1024 * 1024, 'image')).toBe(true);
    });

    it('should return false when file size exceeds limit', () => {
      expect(service.validateFileSize(15 * 1024 * 1024, 'image')).toBe(false);
    });

    it('should use default limit when category is default', () => {
      expect(service.validateFileSize(99 * 1024 * 1024, 'default')).toBe(true);
      expect(service.validateFileSize(101 * 1024 * 1024, 'default')).toBe(false);
    });
  });

  describe('getMaxFileSize', () => {
    it('should return correct max size for image', () => {
      expect(service.getMaxFileSize('image')).toBe(10 * 1024 * 1024);
    });

    it('should return correct max size for document', () => {
      expect(service.getMaxFileSize('document')).toBe(50 * 1024 * 1024);
    });

    it('should return correct max size for spreadsheet', () => {
      expect(service.getMaxFileSize('spreadsheet')).toBe(20 * 1024 * 1024);
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should return image MIME types for image category', () => {
      const types = service.getAllowedMimeTypes('image');

      expect(types).toContain('image/jpeg');
      expect(types).toContain('image/png');
      expect(types).toContain('image/webp');
    });

    it('should return document MIME types for document category', () => {
      const types = service.getAllowedMimeTypes('document');

      expect(types).toContain('application/pdf');
    });

    it('should return wildcard for "any" category', () => {
      const types = service.getAllowedMimeTypes('any');

      expect(types).toContain('*/*');
    });
  });
});
