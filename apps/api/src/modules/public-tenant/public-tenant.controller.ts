import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators";
import { PublicTenantService } from "./public-tenant.service";

/**
 * Public tenant endpoints — no authentication required. All responses use a
 * generic 404 when data is unavailable (including when publicEnabled=false) to
 * prevent slug enumeration.
 *
 * Rate-limited at 30 req/min per IP, matching the existing site-cms pattern.
 */
@ApiTags("Public Tenant")
@Controller("public")
export class PublicTenantController {
  constructor(private readonly service: PublicTenantService) {}

  @Public()
  @Get("tenant/:slug")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get public organization info by slug" })
  @ApiParam({ name: "slug", example: "globerent" })
  @ApiResponse({ status: 200, description: "Public organization data" })
  @ApiResponse({ status: 404, description: "Not found or not public" })
  async getTenant(@Param("slug") slug: string) {
    return this.service.getTenant(slug);
  }

  @Public()
  @Get("tenant/:slug/menu")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get public product menu for tenant" })
  @ApiParam({ name: "slug", example: "globerent" })
  @ApiResponse({ status: 200, description: "Products (no cost/margin fields)" })
  @ApiResponse({ status: 404, description: "Not found or not public" })
  async getTenantMenu(@Param("slug") slug: string) {
    return this.service.getTenantMenu(slug);
  }

  @Public()
  @Get("tenant/:slug/locations")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "List public locations for tenant" })
  @ApiParam({ name: "slug", example: "globerent" })
  @ApiResponse({
    status: 200,
    description: "Public locations with coordinates",
  })
  @ApiResponse({ status: 404, description: "Not found or not public" })
  async getTenantLocations(@Param("slug") slug: string) {
    return this.service.getTenantLocations(slug);
  }

  @Public()
  @Get("location/:slug")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get public location detail (machines, grid)" })
  @ApiParam({ name: "slug", example: "business-center-1" })
  @ApiResponse({ status: 200, description: "Location + machines" })
  @ApiResponse({
    status: 404,
    description: "Not found, not public, or org not public",
  })
  async getLocation(@Param("slug") slug: string) {
    return this.service.getLocation(slug);
  }
}
