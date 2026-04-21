import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import { SalesImportService } from "./sales-import.service";
import { SalesImportIngestService } from "./services/sales-import-ingest.service";
import {
  CreateSalesImportDto,
  QuerySalesImportsDto,
} from "./dto/create-sales-import.dto";
import {
  ConfirmMappingDto,
  ExecuteImportDto,
  UploadSalesImportDto,
} from "./dto/hicon-import.dto";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  Roles,
  UserRole,
  CurrentUser,
  ICurrentUser,
} from "../../common/decorators";

@ApiTags("Sales Import")
@Controller("sales-import")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SalesImportController {
  constructor(
    private readonly salesImportService: SalesImportService,
    private readonly ingestService: SalesImportIngestService,
  ) {}

  @Post("upload")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: "Upload + parse a sales CSV (HICON). Creates a parse session.",
  })
  @ApiResponse({ status: 201, description: "Parse session created" })
  uploadAndParse(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UploadSalesImportDto,
  ) {
    return this.ingestService.uploadAndParse(user.organizationId, user.id, {
      fileName: dto.fileName,
      fileContent: dto.fileContent,
      ...(dto.format !== undefined && { format: dto.format }),
    });
  }

  @Post("confirm-mapping")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary:
      "Confirm machine + date + column mapping; returns fuzzy-matched product suggestions.",
  })
  @ApiResponse({ status: 200, description: "Suggested product mapping" })
  confirmMapping(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ConfirmMappingDto,
  ) {
    return this.ingestService.confirmMapping(user.organizationId, {
      sessionId: dto.sessionId,
      machineId: dto.machineId,
      reportDay: dto.reportDay,
      ...(dto.productCol !== undefined && { productCol: dto.productCol }),
      ...(dto.quantityCol !== undefined && { quantityCol: dto.quantityCol }),
      ...(dto.totalAmountCol !== undefined && {
        totalAmountCol: dto.totalAmountCol,
      }),
      ...(dto.txnIdCol !== undefined && { txnIdCol: dto.txnIdCol }),
    });
  }

  @Post("execute")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary:
      "Execute the import: apply 3-level dedup, record stock movements, persist summary.",
  })
  @ApiResponse({ status: 201, description: "Import executed" })
  execute(@CurrentUser() user: ICurrentUser, @Body() dto: ExecuteImportDto) {
    return this.ingestService.execute(user.organizationId, user.id, {
      sessionId: dto.sessionId,
      machineId: dto.machineId,
      reportDay: dto.reportDay,
      productMap: dto.productMap,
      ...(dto.productCol !== undefined && { productCol: dto.productCol }),
      ...(dto.txnIdCol !== undefined && { txnIdCol: dto.txnIdCol }),
      ...(dto.unmappedNames !== undefined && {
        unmappedNames: dto.unmappedNames,
      }),
    });
  }

  @Get("history")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Paginated history of sales imports" })
  history(
    @CurrentUser() user: ICurrentUser,
    @Query() params: QuerySalesImportsDto,
  ) {
    return this.salesImportService.findAll(user.organizationId, params);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 imports/min per user
  @ApiOperation({ summary: "Create a new sales import record" })
  @ApiResponse({
    status: 201,
    description: "Sales import record created successfully",
  })
  create(@CurrentUser() user: ICurrentUser, @Body() dto: CreateSalesImportDto) {
    return this.salesImportService.create(user.organizationId, user.id, dto);
  }

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "List sales imports with filters and pagination" })
  @ApiResponse({ status: 200, description: "Paginated list of sales imports" })
  findAll(
    @CurrentUser() user: ICurrentUser,
    @Query() params: QuerySalesImportsDto,
  ) {
    return this.salesImportService.findAll(user.organizationId, params);
  }

  @Get("stats")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: "Get sales import statistics" })
  @ApiResponse({
    status: 200,
    description: "Import statistics (total, success rate, by status)",
  })
  getStats(@CurrentUser() user: ICurrentUser) {
    return this.salesImportService.getStats(user.organizationId);
  }

  @Get(":id")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({
    summary: "Get a single sales import with full error details",
  })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({
    status: 200,
    description: "Sales import record with full details",
  })
  @ApiResponse({ status: 404, description: "Sales import not found" })
  findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.salesImportService.findById(id, user.organizationId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Soft delete a sales import record" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({
    status: 204,
    description: "Sales import deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Sales import not found" })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.salesImportService.remove(id, user.organizationId);
  }
}
