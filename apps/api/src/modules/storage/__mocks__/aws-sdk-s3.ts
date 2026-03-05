/**
 * Manual mock for @aws-sdk/client-s3
 * Used when the package is not installed (optional peer dependency)
 */
export class S3Client {
  send = jest.fn();
  constructor(_config?: unknown) {}
}
export class PutObjectCommand {
  constructor(public input: unknown) {}
}
export class GetObjectCommand {
  constructor(public input: unknown) {}
}
export class DeleteObjectCommand {
  constructor(public input: unknown) {}
}
export class ListObjectsV2Command {
  constructor(public input: unknown) {}
}
export class CopyObjectCommand {
  constructor(public input: unknown) {}
}
export class HeadObjectCommand {
  constructor(public input: unknown) {}
}
export class DeleteObjectsCommand {
  constructor(public input: unknown) {}
}
