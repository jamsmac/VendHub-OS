import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

describe("StorageController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      StorageController,
      StorageService,
      [
        "uploadFile",
        "uploadBase64",
        "getPresignedUploadUrl",
        "getFile",
        "getPresignedDownloadUrl",
        "listFiles",
        "getFileMetadata",
        "fileExists",
        "deleteFile",
        "deleteFiles",
        "copyFile",
        "moveFile",
        "getFilesByEntity",
        "getAllowedMimeTypes",
        "validateFileSize",
        "getMaxFileSize",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    // Default returns for helper methods used in controller logic
    mockService.getAllowedMimeTypes.mockReturnValue([]);
    mockService.validateFileSize.mockReturnValue(true);
    mockService.getMaxFileSize.mockReturnValue(10 * 1024 * 1024);
  });

  // ============================================================================
  // AUTH
  // ============================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/storage/files")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // UPLOAD (base64)
  // ============================================================================

  it("POST /storage/upload/base64 returns 201", async () => {
    mockService.uploadBase64.mockResolvedValue({
      key: "test.png",
      url: "https://storage.example.com/test.png",
    });
    await request(app.getHttpServer())
      .post("/storage/upload/base64")
      .set("Authorization", "Bearer admin-token")
      .send({
        base64_data: "iVBORw0KGgo=",
        file_name: "test.png",
        folder: "uploads",
      })
      .expect(HttpStatus.CREATED);
  });

  // ============================================================================
  // PRESIGNED URL
  // ============================================================================

  it("POST /storage/presigned-url returns 201", async () => {
    mockService.getPresignedUploadUrl.mockResolvedValue({
      url: "https://s3.example.com/presigned",
      key: "uploads/test.png",
    });
    await request(app.getHttpServer())
      .post("/storage/presigned-url")
      .set("Authorization", "Bearer admin-token")
      .send({
        file_name: "test.png",
        mime_type: "image/png",
        folder: "uploads",
      })
      .expect(HttpStatus.CREATED);
  });

  // ============================================================================
  // FILE MANAGEMENT
  // ============================================================================

  it("GET /storage/files returns 200 with folder param", async () => {
    mockService.listFiles.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/storage/files?folder=uploads")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /storage/files/metadata/:key returns 200", async () => {
    mockService.getFileMetadata.mockResolvedValue({
      key: "test.png",
      size: 1024,
    });
    await request(app.getHttpServer())
      .get("/storage/files/metadata/test.png")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /storage/files/exists/:key returns 200", async () => {
    mockService.fileExists.mockResolvedValue(true);
    await request(app.getHttpServer())
      .get("/storage/files/exists/test.png")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /storage/files/:key returns 204", async () => {
    mockService.deleteFile.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete("/storage/files/test.png")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("POST /storage/files/delete-bulk returns 201 (default POST status)", async () => {
    mockService.deleteFiles.mockResolvedValue({ deleted: 2, failed: 0 });
    await request(app.getHttpServer())
      .post("/storage/files/delete-bulk")
      .set("Authorization", "Bearer admin-token")
      .send({ keys: ["file1.png", "file2.png"] })
      .expect(HttpStatus.CREATED);
  });

  it("POST /storage/files/copy returns 201 (default POST status)", async () => {
    mockService.copyFile.mockResolvedValue("https://storage.example.com/copy");
    await request(app.getHttpServer())
      .post("/storage/files/copy")
      .set("Authorization", "Bearer admin-token")
      .send({ source_key: "file1.png", destination_key: "file2.png" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /storage/files/move returns 201 (default POST status)", async () => {
    mockService.moveFile.mockResolvedValue("https://storage.example.com/moved");
    await request(app.getHttpServer())
      .post("/storage/files/move")
      .set("Authorization", "Bearer admin-token")
      .send({ source_key: "file1.png", destination_key: "file2.png" })
      .expect(HttpStatus.CREATED);
  });

  // ============================================================================
  // FILE RECORDS
  // ============================================================================

  it("GET /storage/records/:entityType/:entityId returns 200", async () => {
    mockService.getFilesByEntity.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/storage/records/task/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // CONFIG
  // ============================================================================

  it("GET /storage/config returns 200", async () => {
    await request(app.getHttpServer())
      .get("/storage/config")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // ROLE RESTRICTIONS
  // ============================================================================

  it("GET /storage/files rejects viewer (requires manager+)", async () => {
    await request(app.getHttpServer())
      .get("/storage/files?folder=uploads")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /storage/upload/base64 rejects viewer", async () => {
    await request(app.getHttpServer())
      .post("/storage/upload/base64")
      .set("Authorization", "Bearer viewer-token")
      .send({
        base64_data: "iVBORw0KGgo=",
        file_name: "test.png",
        folder: "uploads",
      })
      .expect(HttpStatus.FORBIDDEN);
  });
});
