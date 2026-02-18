/**
 * Manual mock for @aws-sdk/client-s3
 * Used when the package is not installed (optional peer dependency)
 */
export class S3Client {
  send = jest.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_config?: any) {}
}
export class PutObjectCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public input: any) {}
}
export class GetObjectCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public input: any) {}
}
export class DeleteObjectCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public input: any) {}
}
export class ListObjectsV2Command {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public input: any) {}
}
export class CopyObjectCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public input: any) {}
}
export class HeadObjectCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public input: any) {}
}
export class DeleteObjectsCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public input: any) {}
}
