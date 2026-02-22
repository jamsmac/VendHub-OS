/**
 * Transactions Controller for VendHub OS
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
  Logger,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import {
  TransactionStatus,
  PaymentMethod,
  CommissionStatus,
} from "./entities/transaction.entity";
import {
  CreateTransactionBodyDto,
  ProcessPaymentBodyDto,
  DispenseResultBodyDto,
  CancelTransactionDto,
  CreateRefundDto,
  ProcessRefundDto,
  QueryTransactionsBodyDto,
  FiscalDataDto,
} from "./dto/transaction-operations.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentOrganizationId,
  CurrentUserId,
} from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import {
  CreateCollectionRecordDto,
  VerifyCollectionDto,
  QueryCollectionRecordsDto,
} from "./dto/collection-record.dto";
import {
  QueryDailySummariesDto,
  RebuildDailySummaryDto,
  QueryCommissionsDto,
} from "./dto/daily-summary-query.dto";

@ApiTags("Transactions")
@ApiBearerAuth()
@Controller("transactions")
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  // ============================================================================
  // Transaction Lifecycle (called by machines)
  // ============================================================================

  @Post()
  @Roles("owner", "admin", "manager", "operator")
  @ApiOperation({ summary: "Create new transaction" })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateTransactionBodyDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.transactionsService.create({
      ...dto,
      organizationId: orgId,
    });
  }

  @Post(":id/payment")
  @Roles("owner", "admin", "manager", "operator")
  @ApiOperation({ summary: "Process payment for transaction" })
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ProcessPaymentBodyDto,
  ) {
    return this.transactionsService.processPayment({
      ...dto,
      transactionId: id,
    });
  }

  @Post(":id/dispense")
  @Roles("owner", "admin", "manager", "operator")
  @ApiOperation({ summary: "Record dispense result" })
  @HttpCode(HttpStatus.OK)
  async recordDispense(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DispenseResultBodyDto,
  ) {
    return this.transactionsService.recordDispense({
      ...dto,
      transactionId: id,
    });
  }

  @Post(":id/cancel")
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Cancel transaction" })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelTransactionDto,
  ) {
    return this.transactionsService.cancel(id, dto.reason);
  }

  // ============================================================================
  // Queries
  // ============================================================================

  @Get()
  @ApiOperation({ summary: "Query transactions" })
  @ApiQuery({ name: "machineId", required: false })
  @ApiQuery({ name: "locationId", required: false })
  @ApiQuery({
    name: "status",
    required: false,
    enum: TransactionStatus,
    isArray: true,
  })
  @ApiQuery({
    name: "paymentMethod",
    required: false,
    enum: PaymentMethod,
    isArray: true,
  })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Roles("owner", "admin", "manager", "accountant")
  async query(
    @Query() query: QueryTransactionsBodyDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.transactionsService.query({
      ...query,
      organizationId: orgId,
    });
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get transaction statistics" })
  @ApiQuery({ name: "dateFrom", required: true })
  @ApiQuery({ name: "dateTo", required: true })
  @ApiQuery({ name: "machineId", required: false })
  @Roles("owner", "admin", "manager", "accountant")
  async getStatistics(
    @CurrentOrganizationId() orgId: string,
    @Query("dateFrom") dateFrom: string,
    @Query("dateTo") dateTo: string,
    @Query("machineId") machineId?: string,
  ) {
    return this.transactionsService.getStatistics(
      orgId,
      new Date(dateFrom),
      new Date(dateTo),
      machineId,
    );
  }

  // ============================================================================
  // Collection Records
  // ============================================================================

  @Get("collections")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "List collection records" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of collection records",
  })
  @ApiQuery({
    name: "machineId",
    required: false,
    description: "Filter by machine UUID",
  })
  @ApiQuery({
    name: "collectedByUserId",
    required: false,
    description: "Filter by collector UUID",
  })
  @ApiQuery({
    name: "dateFrom",
    required: false,
    description: "Filter from date",
  })
  @ApiQuery({ name: "dateTo", required: false, description: "Filter to date" })
  @ApiQuery({
    name: "isVerified",
    required: false,
    description: "Filter by verification status",
  })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Roles("owner", "admin", "manager", "accountant")
  async getCollectionRecords(
    @CurrentOrganizationId() orgId: string,
    @Query() query: QueryCollectionRecordsDto,
  ) {
    return this.transactionsService.getCollectionRecords(orgId, query);
  }

  @Post("collections")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "Create a collection record" })
  @ApiResponse({ status: 201, description: "Collection record created" })
  @HttpCode(HttpStatus.CREATED)
  @Roles("owner", "admin", "manager", "operator")
  async createCollectionRecord(
    @CurrentOrganizationId() orgId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateCollectionRecordDto,
  ) {
    return this.transactionsService.createCollectionRecord(orgId, userId, dto);
  }

  @Patch("collections/:collectionId/verify")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "Verify a collection record" })
  @ApiResponse({ status: 200, description: "Collection record verified" })
  @ApiResponse({ status: 404, description: "Collection record not found" })
  @ApiResponse({ status: 400, description: "Already verified" })
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin", "manager", "accountant")
  async verifyCollection(
    @Param("collectionId", ParseUUIDPipe) collectionId: string,
    @CurrentUserId() userId: string,
    @Body() dto: VerifyCollectionDto,
  ) {
    return this.transactionsService.verifyCollection(
      collectionId,
      userId,
      dto.notes,
    );
  }

  // ============================================================================
  // Daily Summaries
  // ============================================================================

  @Get("daily-summaries")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "List daily transaction summaries" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of daily summaries",
  })
  @ApiQuery({
    name: "machineId",
    required: false,
    description: "Filter by machine UUID",
  })
  @ApiQuery({
    name: "dateFrom",
    required: false,
    description: "Filter from date",
  })
  @ApiQuery({ name: "dateTo", required: false, description: "Filter to date" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Roles("owner", "admin", "manager", "accountant")
  async getDailySummaries(
    @CurrentOrganizationId() orgId: string,
    @Query() query: QueryDailySummariesDto,
  ) {
    return this.transactionsService.getDailySummaries(orgId, query);
  }

  @Post("daily-summaries/rebuild")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "Rebuild daily summary from transactions" })
  @ApiResponse({ status: 200, description: "Daily summary rebuilt" })
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin")
  async rebuildDailySummary(
    @CurrentOrganizationId() orgId: string,
    @Body() dto: RebuildDailySummaryDto,
  ) {
    return this.transactionsService.rebuildDailySummary(
      orgId,
      dto.date,
      dto.machineId,
    );
  }

  // ============================================================================
  // Commissions
  // ============================================================================

  @Get("commissions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "List commissions" })
  @ApiResponse({ status: 200, description: "Paginated list of commissions" })
  @ApiQuery({
    name: "contractId",
    required: false,
    description: "Filter by contract UUID",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: CommissionStatus,
    description: "Filter by status",
  })
  @ApiQuery({
    name: "dateFrom",
    required: false,
    description: "Filter from date",
  })
  @ApiQuery({ name: "dateTo", required: false, description: "Filter to date" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Roles("owner", "admin", "accountant")
  async getCommissions(
    @CurrentOrganizationId() orgId: string,
    @Query() query: QueryCommissionsDto,
  ) {
    return this.transactionsService.getCommissions(orgId, query);
  }

  // ============================================================================
  // Transaction by ID (must be AFTER all named routes)
  // ============================================================================

  @Get(":id")
  @Roles("owner", "admin", "accountant")
  @ApiOperation({ summary: "Get transaction by ID" })
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.transactionsService.findById(id, orgId);
  }

  @Get("number/:number")
  @Roles("owner", "admin", "accountant")
  @ApiOperation({ summary: "Get transaction by number" })
  async findByNumber(
    @Param("number") number: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.transactionsService.findByNumber(number, orgId);
  }

  // ============================================================================
  // Refunds
  // ============================================================================

  @Post(":id/refund")
  @ApiOperation({ summary: "Create refund for transaction" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  async createRefund(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.transactionsService.createRefund(id, dto.amount, dto.reason);
  }

  @Post("refunds/:refundId/process")
  @ApiOperation({ summary: "Process refund" })
  @Roles("owner", "admin", "accountant")
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Param("refundId", ParseUUIDPipe) refundId: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.transactionsService.processRefund(
      refundId,
      dto.success,
      dto.referenceNumber,
    );
  }

  // ============================================================================
  // Fiscalization
  // ============================================================================

  @Post(":id/fiscalize")
  @ApiOperation({ summary: "Add fiscal data to transaction" })
  @Roles("owner", "admin", "accountant")
  @HttpCode(HttpStatus.OK)
  async fiscalize(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: FiscalDataDto,
  ) {
    return this.transactionsService.fiscalize(id, dto);
  }
}
