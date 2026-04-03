import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SiteCmsService } from "./site-cms.service";
import {
  CreateSiteCmsItemDto,
  UpdateSiteCmsItemDto,
  QuerySiteCmsItemsDto,
} from "./dto/site-cms.dto";

@ApiTags("Site CMS")
@ApiBearerAuth()
@Controller("site-cms")
export class SiteCmsController {
  constructor(private readonly service: SiteCmsService) {}

  @Get(":collection")
  @Roles("owner", "admin")
  @ApiOperation({ summary: "List items in a site CMS collection" })
  @ApiParam({ name: "collection", example: "products" })
  @ApiResponse({ status: 200, description: "Collection items" })
  async findAll(
    @Param("collection") collection: string,
    @Query() query: QuerySiteCmsItemsDto,
    @CurrentUser("organizationId") orgId: string,
  ) {
    return this.service.findByCollection(orgId, collection, {
      isActive: query.isActive,
      search: query.search,
    });
  }

  @Get(":collection/count")
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Count items in a collection" })
  async count(
    @Param("collection") collection: string,
    @Query() query: QuerySiteCmsItemsDto,
    @CurrentUser("organizationId") orgId: string,
  ) {
    const count = await this.service.countByCollection(orgId, collection, {
      isActive: query.isActive,
    });
    return { count };
  }

  @Get(":collection/:id")
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Get a single site CMS item" })
  async findOne(
    @Param("collection") _collection: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("organizationId") orgId: string,
  ) {
    return this.service.findById(orgId, id);
  }

  @Post(":collection")
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a site CMS item" })
  async create(
    @Param("collection") collection: string,
    @Body() dto: CreateSiteCmsItemDto,
    @CurrentUser("organizationId") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.create(orgId, collection, dto, userId);
  }

  @Patch(":collection/:id")
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Update a site CMS item" })
  async update(
    @Param("collection") _collection: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSiteCmsItemDto,
    @CurrentUser("organizationId") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.update(orgId, id, dto, userId);
  }

  @Delete(":collection/:id")
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete a site CMS item" })
  async remove(
    @Param("collection") _collection: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("organizationId") orgId: string,
  ) {
    await this.service.remove(orgId, id);
  }
}
