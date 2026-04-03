import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../common/decorators";
import { SiteCmsService } from "./site-cms.service";
import { CreateCooperationRequestDto } from "./dto/site-cms.dto";

@ApiTags("Client Public")
@Controller("client/public")
export class SiteCmsPublicController {
  private readonly publicOrgId: string;

  constructor(
    private readonly service: SiteCmsService,
    private readonly configService: ConfigService,
  ) {
    this.publicOrgId =
      this.configService.get<string>("VENDHUB_PUBLIC_ORG_ID") ??
      "a0000000-0000-0000-0000-000000000001";
  }

  @Public()
  @Get("partners")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get partners for landing page" })
  @ApiResponse({ status: 200, description: "Partners list" })
  async getPartners() {
    return this.service.findByCollection(this.publicOrgId, "partners", {
      isActive: true,
    });
  }

  @Public()
  @Get("machine-types")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get machine types for landing page" })
  @ApiResponse({ status: 200, description: "Machine types list" })
  async getMachineTypes() {
    return this.service.findByCollection(this.publicOrgId, "machine_types", {
      isActive: true,
    });
  }

  @Public()
  @Get("site-cms/:collection")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get active site CMS items by collection (public)" })
  @ApiParam({ name: "collection", example: "products" })
  @ApiResponse({ status: 200, description: "Collection items" })
  async getCollection(@Param("collection") collection: string) {
    return this.service.findByCollection(this.publicOrgId, collection, {
      isActive: true,
    });
  }

  @Public()
  @Post("cooperation-requests")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Submit a cooperation request (public form)" })
  @ApiResponse({ status: 201, description: "Request submitted" })
  async submitCooperationRequest(@Body() dto: CreateCooperationRequestDto) {
    return this.service.create(this.publicOrgId, "cooperation_requests", {
      data: {
        model: dto.model,
        name: dto.name,
        phone: dto.phone,
        comment: dto.comment ?? null,
        status: "new",
        admin_notes: null,
      },
    });
  }
}
