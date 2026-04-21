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
import { PurchasesService } from "./services/purchases.service";
import { CreateDraftPurchaseDto } from "./dto/create-draft.dto";
import { AddPurchaseItemDto } from "./dto/add-item.dto";
import { QueryPurchasesDto } from "./dto/query-purchases.dto";

@ApiTags("Purchases")
@ApiBearerAuth()
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Post("draft")
  @HttpCode(HttpStatus.CREATED)
  @Roles("owner", "admin", "manager", "warehouse")
  @ApiOperation({ summary: "Create a new DRAFT purchase" })
  @ApiCreatedResponse({ description: "Draft purchase created" })
  createDraft(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateDraftPurchaseDto,
  ) {
    return this.service.createDraft({
      organizationId,
      warehouseLocationId: dto.warehouseLocationId,
      byUserId: userId,
      ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
      ...(dto.paymentMethod !== undefined && {
        paymentMethod: dto.paymentMethod,
      }),
      ...(dto.note !== undefined && { note: dto.note }),
    });
  }

  @Post(":id/items")
  @HttpCode(HttpStatus.CREATED)
  @Roles("owner", "admin", "manager", "warehouse")
  @ApiOperation({ summary: "Add an item to a DRAFT purchase" })
  @ApiCreatedResponse({ description: "Purchase item added" })
  addItem(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) purchaseId: string,
    @Body() dto: AddPurchaseItemDto,
  ) {
    return this.service.addItem({
      purchaseId,
      organizationId,
      productId: dto.productId,
      quantity: dto.quantity,
      unitCost: dto.unitCost,
      ...(dto.note !== undefined && { note: dto.note }),
    });
  }

  @Post(":id/submit")
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin", "manager")
  @ApiOperation({
    summary:
      "Submit a DRAFT purchase (RECEIVED) — creates PURCHASE_IN stock movements",
  })
  @ApiOkResponse({ description: "Purchase submitted (RECEIVED)" })
  submit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) purchaseId: string,
  ) {
    return this.service.submit(purchaseId, organizationId, userId);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin", "manager")
  @ApiOperation({ summary: "Cancel a DRAFT purchase" })
  @ApiOkResponse({ description: "Purchase cancelled" })
  cancel(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) purchaseId: string,
  ) {
    return this.service.cancel(purchaseId, organizationId);
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
  @ApiOperation({ summary: "List purchases (paginated, filtered)" })
  @ApiOkResponse({ description: "Purchases retrieved" })
  list(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryPurchasesDto,
  ) {
    return this.service.list({
      organizationId,
      ...(query.status !== undefined && { status: query.status }),
      ...(query.supplierId !== undefined && { supplierId: query.supplierId }),
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
  @ApiOperation({ summary: "Get a single purchase by ID" })
  @ApiOkResponse({ description: "Purchase retrieved" })
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(id, organizationId);
  }
}
