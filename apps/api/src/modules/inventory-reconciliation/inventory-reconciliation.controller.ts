import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentOrganizationId,
  CurrentUserId,
} from "../../common/decorators/current-user.decorator";
import { InventoryReconciliationService } from "./services/inventory-reconciliation.service";
import { StartReconciliationDto } from "./dto/start-reconciliation.dto";
import { SubmitReconciliationDto } from "./dto/submit-reconciliation.dto";
import { QueryReconciliationsDto } from "./dto/query-reconciliations.dto";

@ApiTags("Inventory Reconciliation")
@ApiBearerAuth()
@Controller("inventory-reconciliation")
export class InventoryReconciliationController {
  constructor(private readonly service: InventoryReconciliationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("owner", "admin", "manager", "warehouse", "operator")
  @ApiOperation({
    summary: "Start a new DRAFT inventory reconciliation at a location",
  })
  @ApiCreatedResponse({ description: "Draft reconciliation created" })
  start(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: StartReconciliationDto,
  ) {
    return this.service.start(organizationId, dto.locationId, userId);
  }

  @Get(":id/expected")
  @Roles(
    "owner",
    "admin",
    "manager",
    "warehouse",
    "accountant",
    "operator",
    "viewer",
  )
  @ApiOperation({
    summary:
      "Get expected balances at the reconciliation's location for filling the form",
  })
  @ApiOkResponse({ description: "Expected balances" })
  async getExpected(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const recon = await this.service.findById(organizationId, id);
    return this.service.getExpectedBalances(organizationId, recon.locationId);
  }

  @Post(":id/submit")
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin", "manager", "warehouse", "operator")
  @ApiOperation({
    summary:
      "Submit reconciliation — creates ADJUSTMENT stock movements and calculates nedostacha",
  })
  @ApiOkResponse({ description: "Reconciliation submitted" })
  submit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubmitReconciliationDto,
  ) {
    return this.service.submit(
      organizationId,
      id,
      dto.items.map((i) => ({
        productId: i.productId,
        actualQty: i.actualQty,
        ...(i.note !== undefined && { note: i.note }),
      })),
      userId,
    );
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin", "manager", "warehouse")
  @ApiOperation({ summary: "Cancel a DRAFT reconciliation" })
  @ApiOkResponse({ description: "Reconciliation cancelled" })
  cancel(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(organizationId, id);
  }

  @Get()
  @Roles(
    "owner",
    "admin",
    "manager",
    "warehouse",
    "accountant",
    "operator",
    "viewer",
  )
  @ApiOperation({ summary: "List reconciliations (paginated, filtered)" })
  @ApiOkResponse({ description: "Reconciliations retrieved" })
  list(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryReconciliationsDto,
  ) {
    return this.service.list({
      organizationId,
      ...(query.status !== undefined && { status: query.status }),
      ...(query.locationId !== undefined && { locationId: query.locationId }),
      ...(query.limit !== undefined && { limit: query.limit }),
      ...(query.offset !== undefined && { offset: query.offset }),
    });
  }

  @Get(":id")
  @Roles(
    "owner",
    "admin",
    "manager",
    "warehouse",
    "accountant",
    "operator",
    "viewer",
  )
  @ApiOperation({ summary: "Get a single reconciliation by ID (with items)" })
  @ApiOkResponse({ description: "Reconciliation retrieved" })
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(organizationId, id);
  }
}
