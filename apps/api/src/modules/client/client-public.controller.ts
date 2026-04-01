/**
 * Client Public Controller
 *
 * Public (no-auth) endpoints for the customer-facing website (vendhub.uz).
 * All endpoints are @Public() decorated — no JWT required.
 * Throttled to prevent abuse.
 */

import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators";
import { ClientPublicService } from "./client-public.service";

@ApiTags("Client Public")
@Controller("client/public")
export class ClientPublicController {
  constructor(private readonly publicService: ClientPublicService) {}

  // ============================================
  // PUBLIC STATS
  // ============================================

  @Public()
  @Get("stats")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: "Get platform statistics for landing page",
    description:
      "Returns total machines, products, orders, average rating. No auth required.",
  })
  @ApiResponse({
    status: 200,
    description: "Platform statistics",
  })
  async getStats() {
    return this.publicService.getStats();
  }

  // ============================================
  // PUBLIC PRODUCTS
  // ============================================

  @Public()
  @Get("products")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: "Get all active products for public catalog",
    description:
      "Returns products with name, description, image, price, category. No auth required.",
  })
  @ApiQuery({
    name: "category",
    required: false,
    type: String,
    description: "Filter by product category",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by product name",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 50)",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated product list",
  })
  async getProducts(
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.publicService.getProducts({
      category,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ============================================
  // PUBLIC PROMOTIONS
  // ============================================

  @Public()
  @Get("promotions")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: "Get active promotions for public display",
    description:
      "Returns currently active promotions/campaigns. No auth required.",
  })
  @ApiResponse({
    status: 200,
    description: "Active promotions list",
  })
  async getPromotions() {
    return this.publicService.getPromotions();
  }

  // ============================================
  // PUBLIC LOYALTY TIERS
  // ============================================

  @Public()
  @Get("loyalty-tiers")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: "Get loyalty program tiers and benefits",
    description:
      "Returns loyalty levels with thresholds, multipliers, and privileges. No auth required.",
  })
  @ApiResponse({
    status: 200,
    description: "Loyalty tiers information",
  })
  async getLoyaltyTiers() {
    return this.publicService.getLoyaltyTiers();
  }
}
