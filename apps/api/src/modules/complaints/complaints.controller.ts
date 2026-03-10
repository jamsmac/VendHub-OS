/**
 * Complaints Controller for VendHub OS
 * REST API for complaint management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  ComplaintsService,
  CreateComplaintDto,
  UpdateComplaintDto,
  CreateRefundDto,
  QueryComplaintsDto,
} from "./complaints.service";
import {
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory,
  ComplaintSource,
} from "./entities/complaint.entity";
import { CreatePublicComplaintDto } from "./dto/create-public-complaint.dto";
import {
  ResolveComplaintDto,
  EscalateComplaintDto,
  SubmitFeedbackDto,
  AddCommentDto,
  ProcessRefundReferenceDto,
  RejectRefundReasonDto,
  RejectComplaintDto,
} from "./dto/complaint-operations.dto";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums";
import { StorageService } from "../storage/storage.service";
import { FileCategory } from "../storage/dto/upload-file.dto";
import { validateMagicBytes } from "../../common/utils/file-validation";

@ApiTags("Complaints")
@ApiBearerAuth()
@Controller("complaints")
export class ComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly storageService: StorageService,
  ) {}

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  @Post()
  @ApiOperation({ summary: "Create new complaint" })
  @ApiResponse({ status: 201, description: "Complaint created" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateComplaintDto,
    @CurrentOrganizationId() orgId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @CurrentUser() user: any,
  ) {
    const organizationId =
      user && user.role === UserRole.OWNER && dto.organizationId
        ? dto.organizationId
        : orgId;
    return this.complaintsService.create({
      ...dto,
      organizationId,
    });
  }

  @Post("public")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 complaints/min per IP -- prevent spam
  @UseInterceptors(
    FileInterceptor("photo", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard cap for public uploads
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create complaint via QR code (public)" })
  @ApiResponse({ status: 201, description: "Complaint created" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        qrCode: { type: "string", example: "QR-2024-ABC123" },
        machineId: {
          type: "string",
          format: "uuid",
          example: "9e7e1467-a7e3-4ff5-9f4f-37b3dfe0d868",
        },
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        customerEmail: { type: "string" },
        category: { type: "string", enum: Object.values(ComplaintCategory) },
        subject: { type: "string" },
        description: { type: "string" },
        photo: { type: "string", format: "binary" },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async createPublic(
    @Body() dto: CreatePublicComplaintDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    if (!dto.qrCode && !dto.machineId) {
      throw new BadRequestException("qrCode or machineId is required");
    }

    let organizationId: string;
    let machineId: string;
    let qrCodeId: string | undefined;
    let source: ComplaintSource;

    if (dto.qrCode) {
      const qrCodeInfo = await this.complaintsService.getQrCodeByCode(
        dto.qrCode,
      );
      organizationId = qrCodeInfo.organizationId;
      machineId = qrCodeInfo.machineId;
      qrCodeId = qrCodeInfo.id;
      source = ComplaintSource.QR_CODE;
    } else {
      const machine = await this.complaintsService.getMachineContext(
        dto.machineId!,
      );
      organizationId = machine.organizationId;
      machineId = machine.id;
      source = ComplaintSource.MOBILE_APP;
    }

    const attachments = [...(dto.attachments || [])];

    if (photo) {
      const allowedMimeTypes = this.storageService.getAllowedMimeTypes(
        FileCategory.IMAGE,
      );
      if (!allowedMimeTypes.includes(photo.mimetype)) {
        throw new BadRequestException(
          `MIME type ${photo.mimetype} not allowed for complaint photos`,
        );
      }

      // Verify file content matches claimed MIME via magic bytes
      validateMagicBytes(photo.buffer, photo.mimetype, "image");

      if (!this.storageService.validateFileSize(photo.size, "image")) {
        const maxSize = this.storageService.getMaxFileSize("image");
        throw new BadRequestException(
          `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
        );
      }

      const uploadResult = await this.storageService.uploadFile(
        organizationId,
        "complaints/public",
        photo.originalname,
        photo.buffer,
        photo.mimetype,
      );
      attachments.push(uploadResult.cdnUrl || uploadResult.url);
    }

    return this.complaintsService.createPublicComplaint({
      organizationId,
      machineId,
      qrCodeId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      category: dto.category,
      source,
      subject: dto.subject,
      description: dto.description,
      attachments,
    });
  }

  @Get("machines/:machineId")
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get public machine context for complaints" })
  @ApiParam({
    name: "machineId",
    description: "Machine identifier used by public complaint flows",
  })
  async getPublicMachineContext(@Param("machineId") machineId: string) {
    return this.complaintsService.getMachineContext(machineId);
  }

  @Get()
  @ApiOperation({ summary: "Query complaints with filters" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ComplaintStatus,
    isArray: true,
  })
  @ApiQuery({
    name: "priority",
    required: false,
    enum: ComplaintPriority,
    isArray: true,
  })
  @ApiQuery({
    name: "category",
    required: false,
    enum: ComplaintCategory,
    isArray: true,
  })
  @ApiQuery({ name: "assignedToId", required: false })
  @ApiQuery({ name: "machineId", required: false })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Roles("owner", "admin", "manager", "operator")
  async query(
    @Query() query: QueryComplaintsDto,
    @CurrentOrganizationId() orgId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @CurrentUser() user: any,
  ) {
    const organizationId =
      user.role === UserRole.OWNER && query.organizationId
        ? query.organizationId
        : orgId;
    return this.complaintsService.query({
      ...query,
      organizationId,
    });
  }

  @Get("new")
  @ApiOperation({ summary: "Get unreviewed complaints queue" })
  @Roles("owner", "admin", "manager")
  async getNewComplaints(@CurrentOrganizationId() orgId: string) {
    return this.complaintsService.getNewComplaints(orgId);
  }

  @Get("my")
  @ApiOperation({ summary: "Get complaints assigned to me" })
  @Roles("owner", "admin", "manager", "operator")
  async getMyComplaints(
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
    @Query("status") status?: ComplaintStatus[],
  ) {
    return this.complaintsService.query({
      organizationId: orgId,
      assignedToId: userId,
      status,
    });
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get complaint statistics" })
  @ApiQuery({ name: "dateFrom", required: true })
  @ApiQuery({ name: "dateTo", required: true })
  @Roles("owner", "admin", "manager")
  async getStatistics(
    @CurrentOrganizationId() orgId: string,
    @Query("dateFrom") dateFrom: string,
    @Query("dateTo") dateTo: string,
  ) {
    return this.complaintsService.getStatistics(
      orgId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Get("templates")
  @ApiOperation({ summary: "Get complaint templates" })
  @Roles("owner", "admin", "manager")
  async getTemplates(@CurrentOrganizationId() orgId: string) {
    return this.complaintsService.getTemplates(orgId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get complaint by ID" })
  @ApiParam({ name: "id", type: String })
  @Roles("owner", "admin", "manager", "operator")
  async findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.complaintsService.findById(id);
  }

  @Get("number/:number")
  @ApiOperation({ summary: "Get complaint by number" })
  @ApiParam({ name: "number", type: String })
  @Roles("owner", "admin", "manager", "operator")
  async findByNumber(@Param("number") number: string) {
    return this.complaintsService.findByNumber(number);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update complaint" })
  @ApiParam({ name: "id", type: String })
  @Roles("owner", "admin", "manager", "operator")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintDto,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.update(id, dto, userId);
  }

  // ============================================================================
  // Actions
  // ============================================================================

  @Post(":id/assign")
  @ApiOperation({ summary: "Assign complaint to user" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.OK)
  async assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("assignedToId", ParseUUIDPipe) assignedToId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.assign(id, assignedToId, userId);
  }

  @Post(":id/resolve")
  @ApiOperation({ summary: "Resolve complaint" })
  @Roles("owner", "admin", "manager", "operator")
  @HttpCode(HttpStatus.OK)
  async resolve(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolveComplaintDto,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.resolve(id, dto.resolution, userId);
  }

  @Post(":id/escalate")
  @ApiOperation({ summary: "Escalate complaint" })
  @Roles("owner", "admin", "manager", "operator")
  @HttpCode(HttpStatus.OK)
  async escalate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EscalateComplaintDto,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.escalate(id, dto.reason, userId);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Reject complaint" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectComplaintDto,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.reject(id, dto.reason, userId);
  }

  @Post(":id/feedback")
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 feedback submissions/min per IP
  @ApiOperation({ summary: "Submit customer feedback" })
  @HttpCode(HttpStatus.OK)
  async submitFeedback(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.complaintsService.submitFeedback(id, dto.rating, dto.comment);
  }

  // ============================================================================
  // Comments
  // ============================================================================

  @Get(":id/comments")
  @ApiOperation({ summary: "Get complaint comments" })
  @ApiQuery({ name: "includeInternal", required: false, type: Boolean })
  @Roles("owner", "admin", "manager", "operator")
  async getComments(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("includeInternal") includeInternal?: boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @CurrentUser() user?: any,
  ) {
    // Only internal users can see internal comments
    const canSeeInternal =
      user && ["owner", "admin", "manager", "operator"].includes(user.role);
    return this.complaintsService.getComments(
      id,
      canSeeInternal && includeInternal !== false,
    );
  }

  @Post(":id/comments")
  @ApiOperation({ summary: "Add comment to complaint" })
  @Roles("owner", "admin", "manager", "operator")
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddCommentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.addComment({
      complaintId: id,
      userId,
      isInternal: dto.isInternal || false,
      content: dto.content,
      attachments: dto.attachments,
    });
  }

  // ============================================================================
  // Refunds
  // ============================================================================

  @Post(":id/refunds")
  @ApiOperation({ summary: "Request refund for complaint" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  async createRefund(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: Omit<CreateRefundDto, "complaintId" | "requestedById">,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.createRefund({
      ...dto,
      complaintId: id,
      requestedById: userId,
    });
  }

  @Post("refunds/:refundId/approve")
  @ApiOperation({ summary: "Approve refund" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.OK)
  async approveRefund(
    @Param("refundId", ParseUUIDPipe) refundId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.approveRefund(refundId, userId);
  }

  @Post("refunds/:refundId/process")
  @ApiOperation({ summary: "Process refund" })
  @Roles("owner", "admin", "accountant")
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Param("refundId", ParseUUIDPipe) refundId: string,
    @Body() dto: ProcessRefundReferenceDto,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.processRefund(
      refundId,
      userId,
      dto.referenceNumber,
    );
  }

  @Post("refunds/:refundId/reject")
  @ApiOperation({ summary: "Reject refund" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.OK)
  async rejectRefund(
    @Param("refundId", ParseUUIDPipe) refundId: string,
    @Body() dto: RejectRefundReasonDto,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.rejectRefund(refundId, userId, dto.reason);
  }

  // ============================================================================
  // QR Codes
  // ============================================================================

  @Post("qr-codes/generate")
  @ApiOperation({ summary: "Generate QR code for machine" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  async generateQrCode(
    @Body("machineId", ParseUUIDPipe) machineId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.complaintsService.generateQrCode(orgId, machineId);
  }

  @Get("qr-codes/machine/:machineId")
  @ApiOperation({ summary: "Get QR codes for machine" })
  @Roles("owner", "admin", "manager")
  async getQrCodesForMachine(
    @Param("machineId", ParseUUIDPipe) machineId: string,
  ) {
    return this.complaintsService.getQrCodesForMachine(machineId);
  }

  @Get("qr-codes/:code")
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 lookups/min -- prevent QR code enumeration
  @ApiOperation({ summary: "Get QR code info" })
  async getQrCode(@Param("code") code: string) {
    return this.complaintsService.getQrCodeByCode(code);
  }
}
