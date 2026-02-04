/**
 * AI Controller
 * REST endpoints for AI-powered features
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { AiService } from './ai.service';

// DTOs
class ImportFromImageDto {
  imageBase64: string;
  context?: string;
}

class ImportFromTextDto {
  text: string;
  format?: 'csv' | 'json' | 'plain';
}

class AnalyzeComplaintDto {
  subject: string;
  description: string;
  category?: string;
}

class SuggestResponseDto {
  subject: string;
  description: string;
  category: string;
  customerName?: string;
  language?: 'ru' | 'uz' | 'en';
}

class DetectAnomalyDto {
  machineId: string;
  salesData: { date: string; amount: number; transactions: number }[];
  historicalAverage: { avgAmount: number; avgTransactions: number };
}

class CategorizeProductDto {
  name: string;
  barcode?: string;
}

class SuggestProductsDto {
  locationType: string;
  existingProducts: string[];
  targetAudience?: string;
}

class SuggestPricingDto {
  productName: string;
  category: string;
  costPrice: number;
  locationType: string;
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ========================================================================
  // AI IMPORT
  // ========================================================================

  @Post('import/image')
  @Roles('owner', 'admin', 'manager', 'warehouse')
  @ApiOperation({ summary: 'Parse products from image (menu, price list)' })
  @ApiResponse({ status: 200, description: 'Products extracted' })
  async importFromImage(@Body() dto: ImportFromImageDto) {
    if (!dto.imageBase64) {
      throw new BadRequestException('Image required');
    }

    return this.aiService.parseProductsFromImage(dto.imageBase64, dto.context);
  }

  @Post('import/image-upload')
  @Roles('owner', 'admin', 'manager', 'warehouse')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        context: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload and parse image for products' })
  async importFromImageUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('context') context?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File required');
    }

    const imageBase64 = file.buffer.toString('base64');
    return this.aiService.parseProductsFromImage(imageBase64, context);
  }

  @Post('import/text')
  @Roles('owner', 'admin', 'manager', 'warehouse')
  @ApiOperation({ summary: 'Parse products from text (CSV, pasted data)' })
  @ApiResponse({ status: 200, description: 'Products extracted' })
  async importFromText(@Body() dto: ImportFromTextDto) {
    if (!dto.text) {
      throw new BadRequestException('Text required');
    }

    return this.aiService.parseProductsFromText(dto.text, dto.format);
  }

  // ========================================================================
  // COMPLAINT ANALYSIS
  // ========================================================================

  @Post('complaints/analyze')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Analyze complaint sentiment and priority' })
  @ApiResponse({ status: 200, description: 'Analysis complete' })
  async analyzeComplaint(@Body() dto: AnalyzeComplaintDto) {
    return this.aiService.analyzeComplaint(
      dto.subject,
      dto.description,
      dto.category,
    );
  }

  @Post('complaints/suggest-response')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Generate response suggestion for complaint' })
  @ApiResponse({ status: 200, description: 'Response generated' })
  async suggestComplaintResponse(@Body() dto: SuggestResponseDto) {
    const response = await this.aiService.suggestComplaintResponse(
      {
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
        customerName: dto.customerName,
      },
      dto.language || 'ru',
    );

    return { suggestion: response };
  }

  // ========================================================================
  // ANOMALY DETECTION
  // ========================================================================

  @Post('anomaly/sales')
  @Roles('owner', 'admin', 'manager', 'accountant')
  @ApiOperation({ summary: 'Detect sales anomalies for machine' })
  @ApiResponse({ status: 200, description: 'Anomaly analysis complete' })
  async detectSalesAnomaly(@Body() dto: DetectAnomalyDto) {
    return this.aiService.detectSalesAnomaly(
      dto.machineId,
      dto.salesData,
      dto.historicalAverage,
    );
  }

  // ========================================================================
  // PRODUCT CATEGORIZATION
  // ========================================================================

  @Post('categorize')
  @Roles('owner', 'admin', 'manager', 'warehouse')
  @ApiOperation({ summary: 'Suggest category for a product' })
  @ApiResponse({ status: 200, description: 'Category suggested' })
  async categorizeProduct(@Body() dto: CategorizeProductDto) {
    return this.aiService.suggestCategory(dto.name, dto.barcode);
  }

  @Post('categorize/batch')
  @Roles('owner', 'admin', 'manager', 'warehouse')
  @ApiOperation({ summary: 'Batch categorize multiple products' })
  @ApiResponse({ status: 200, description: 'Categories suggested' })
  async batchCategorize(
    @Body() products: { id: string; name: string; barcode?: string }[],
  ) {
    const results = await this.aiService.batchCategorize(products);
    return Object.fromEntries(results);
  }

  // ========================================================================
  // SMART SUGGESTIONS
  // ========================================================================

  @Post('suggest/products')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Suggest products for location' })
  @ApiResponse({ status: 200, description: 'Product suggestions' })
  async suggestProducts(@Body() dto: SuggestProductsDto) {
    const suggestions = await this.aiService.suggestProductsForLocation(
      dto.locationType,
      dto.existingProducts,
      dto.targetAudience,
    );

    return { suggestions };
  }

  @Post('suggest/pricing')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Suggest pricing for product' })
  @ApiResponse({ status: 200, description: 'Pricing suggestions' })
  async suggestPricing(@Body() dto: SuggestPricingDto) {
    return this.aiService.suggestPricing(
      dto.productName,
      dto.category,
      dto.costPrice,
      dto.locationType,
    );
  }

  // ========================================================================
  // STATUS
  // ========================================================================

  @Get('status')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Check AI service status' })
  async getStatus() {
    return {
      status: 'operational',
      features: [
        'import_from_image',
        'import_from_text',
        'complaint_analysis',
        'anomaly_detection',
        'product_categorization',
        'smart_suggestions',
      ],
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
      },
    };
  }
}
