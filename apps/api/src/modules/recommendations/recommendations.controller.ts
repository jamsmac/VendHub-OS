/**
 * Recommendations Controller
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RecommendationsService, RecommendedProduct } from './recommendations.service';
import {
  GetRecommendationsDto,
  RecommendationType,
  RecommendedProductDto,
  RecommendationsResponseDto,
} from './dto/recommendation.dto';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get recommendations',
    description: 'Получить персонализированные рекомендации',
  })
  @ApiResponse({ status: 200, type: RecommendationsResponseDto })
  async getRecommendations(
    @CurrentUser() user: User,
    @Query() query: GetRecommendationsDto,
  ): Promise<RecommendationsResponseDto> {
    const { type, machineId, productId, limit = 10 } = query;

    let recommendations: RecommendedProduct[];
    let recommendationType = type || RecommendationType.PERSONALIZED;

    switch (type) {
      case RecommendationType.MACHINE:
        if (!machineId) {
          recommendations = await this.recommendationsService.getPersonalizedRecommendations(
            user.id,
            user.organizationId,
            limit,
          );
        } else {
          recommendations = await this.recommendationsService.getMachineRecommendations(
            machineId,
            user.organizationId,
            user.id,
            limit,
          );
        }
        break;

      case RecommendationType.SIMILAR:
        if (!productId) {
          recommendations = [];
        } else {
          recommendations = await this.recommendationsService.getSimilarProducts(
            productId,
            user.organizationId,
            limit,
          );
        }
        break;

      case RecommendationType.COMPLEMENTARY:
        if (!productId) {
          recommendations = [];
        } else {
          recommendations = await this.recommendationsService.getComplementaryProducts(
            productId,
            user.organizationId,
            limit,
          );
        }
        break;

      case RecommendationType.TIME_BASED:
        recommendations = await this.recommendationsService.getTimeBasedRecommendations(
          user.organizationId,
          undefined,
          limit,
        );
        break;

      case RecommendationType.NEW_ARRIVALS:
        recommendations = await this.recommendationsService.getNewArrivals(
          user.organizationId,
          limit,
        );
        break;

      default:
        recommendations = await this.recommendationsService.getPersonalizedRecommendations(
          user.id,
          user.organizationId,
          limit,
        );
        recommendationType = RecommendationType.PERSONALIZED;
    }

    return {
      items: recommendations.map(r => this.mapToDto(r)),
      total: recommendations.length,
      type: recommendationType,
    };
  }

  @Get('for-you')
  @ApiOperation({
    summary: 'Get personalized recommendations',
    description: 'Получить рекомендации "Для вас"',
  })
  @ApiResponse({ status: 200, type: RecommendationsResponseDto })
  async getForYou(@CurrentUser() user: User): Promise<RecommendationsResponseDto> {
    const recommendations = await this.recommendationsService.getPersonalizedRecommendations(
      user.id,
      user.organizationId,
      10,
    );

    return {
      items: recommendations.map(r => this.mapToDto(r)),
      total: recommendations.length,
      type: RecommendationType.PERSONALIZED,
    };
  }

  @Get('new')
  @ApiOperation({
    summary: 'Get new arrivals',
    description: 'Получить новинки',
  })
  @ApiResponse({ status: 200, type: RecommendationsResponseDto })
  async getNewArrivals(@CurrentUser() user: User): Promise<RecommendationsResponseDto> {
    const recommendations = await this.recommendationsService.getNewArrivals(
      user.organizationId,
      10,
    );

    return {
      items: recommendations.map(r => this.mapToDto(r)),
      total: recommendations.length,
      type: RecommendationType.NEW_ARRIVALS,
    };
  }

  private mapToDto(rec: RecommendedProduct): RecommendedProductDto {
    return {
      id: rec.product.id,
      name: rec.product.name,
      nameUz: rec.product.nameUz,
      price: Number(rec.product.sellingPrice) || 0,  // Using sellingPrice
      imageUrl: rec.product.imageUrl,
      categoryId: rec.product.category,  // category is an enum string, not a relation
      categoryName: rec.product.category?.replace(/_/g, ' ') || '',
      isAvailable: rec.product.isActive,
      score: rec.score,
      reason: rec.reason,
      reasonText: rec.reasonText,
    };
  }
}
