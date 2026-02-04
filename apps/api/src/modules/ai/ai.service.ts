/**
 * AI Service
 * Integrates with OpenAI/Anthropic for intelligent features
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProductImportResult {
  products: ParsedProduct[];
  confidence: number;
  rawText?: string;
}

export interface ParsedProduct {
  name: string;
  nameUz?: string;
  category?: string;
  price?: number;
  barcode?: string;
  description?: string;
  confidence: number;
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  keywords: string[];
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnomalyResult {
  isAnomaly: boolean;
  type?: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation?: string;
}

export interface CategorySuggestion {
  category: string;
  subcategory?: string;
  confidence: number;
  mxikCode?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openaiApiKey: string;
  private readonly anthropicApiKey: string;
  private readonly preferredProvider: 'openai' | 'anthropic';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.openaiApiKey = this.configService.get('OPENAI_API_KEY') || '';
    this.anthropicApiKey = this.configService.get('ANTHROPIC_API_KEY') || '';
    this.preferredProvider = this.configService.get('AI_PROVIDER') || 'openai';
  }

  // ========================================================================
  // AI IMPORT - Parse products from images/documents
  // ========================================================================

  /**
   * Parse products from an image (menu, price list, invoice)
   */
  async parseProductsFromImage(
    imageBase64: string,
    context?: string,
  ): Promise<ProductImportResult> {
    this.logger.log('Parsing products from image');

    const prompt = `Analyze this image and extract product information.
Context: ${context || 'Vending machine products in Uzbekistan'}

For each product found, provide:
- name (in Russian)
- nameUz (in Uzbek if visible)
- category (coffee, snack, beverage, water, etc.)
- price (in UZS if visible)
- barcode (if visible)
- description (brief)

Return JSON array format:
{
  "products": [
    {"name": "...", "nameUz": "...", "category": "...", "price": 0, "barcode": "...", "description": "...", "confidence": 0.95}
  ],
  "confidence": 0.9
}`;

    try {
      if (this.preferredProvider === 'openai' && this.openaiApiKey) {
        return await this.parseWithOpenAI(imageBase64, prompt);
      } else if (this.anthropicApiKey) {
        return await this.parseWithAnthropic(imageBase64, prompt);
      } else {
        throw new BadRequestException('No AI provider configured');
      }
    } catch (error: any) {
      this.logger.error('Failed to parse products from image', error);
      throw error;
    }
  }

  /**
   * Parse products from text (OCR result, pasted text)
   */
  async parseProductsFromText(
    text: string,
    format?: 'csv' | 'json' | 'plain',
  ): Promise<ProductImportResult> {
    this.logger.log('Parsing products from text');

    const prompt = `Extract product information from this text.
Format hint: ${format || 'auto-detect'}

Text:
${text}

For each product found, provide:
- name (in Russian)
- nameUz (in Uzbek if present)
- category (coffee, snack, beverage, water, etc.)
- price (in UZS)
- barcode (if present)

Return JSON:
{
  "products": [
    {"name": "...", "category": "...", "price": 0, "confidence": 0.95}
  ],
  "confidence": 0.9,
  "rawText": "original text snippet"
}`;

    return this.callTextLLM(prompt);
  }

  // ========================================================================
  // COMPLAINT ANALYSIS
  // ========================================================================

  /**
   * Analyze complaint text for sentiment and priority
   */
  async analyzeComplaint(
    subject: string,
    description: string,
    category?: string,
  ): Promise<SentimentResult> {
    this.logger.log('Analyzing complaint sentiment');

    const prompt = `Analyze this customer complaint for a vending machine service in Uzbekistan.

Subject: ${subject}
Description: ${description}
Category: ${category || 'unknown'}

Determine:
1. Sentiment (positive, negative, neutral)
2. Sentiment score (-1 to 1)
3. Key issue keywords
4. Suggested priority (low, medium, high, critical)

Critical indicators: safety issues, health concerns, financial loss > 50000 UZS
High indicators: machine not working, refund needed, repeated issue
Medium indicators: product quality, slow response
Low indicators: suggestions, minor feedback

Return JSON:
{
  "sentiment": "negative",
  "score": -0.7,
  "keywords": ["не работает", "возврат", "деньги"],
  "suggestedPriority": "high"
}`;

    return this.callTextLLM(prompt);
  }

  /**
   * Generate response suggestion for complaint
   */
  async suggestComplaintResponse(
    complaint: {
      subject: string;
      description: string;
      category: string;
      customerName?: string;
    },
    language: 'ru' | 'uz' | 'en' = 'ru',
  ): Promise<string> {
    const langMap = {
      ru: 'Russian',
      uz: 'Uzbek',
      en: 'English',
    };

    const prompt = `Generate a professional customer service response for this vending machine complaint.

Subject: ${complaint.subject}
Description: ${complaint.description}
Category: ${complaint.category}
Customer: ${complaint.customerName || 'Уважаемый клиент'}

Language: ${langMap[language]}

Requirements:
- Be empathetic and professional
- Acknowledge the issue
- Provide next steps
- Keep it concise (2-3 paragraphs)
- Sign as "Команда VendHub"

Return only the response text.`;

    const result = await this.callTextLLM(prompt);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  // ========================================================================
  // ANOMALY DETECTION
  // ========================================================================

  /**
   * Detect anomalies in sales data
   */
  async detectSalesAnomaly(
    machineId: string,
    salesData: { date: string; amount: number; transactions: number }[],
    historicalAverage: { avgAmount: number; avgTransactions: number },
  ): Promise<AnomalyResult> {
    this.logger.log(`Detecting anomalies for machine ${machineId}`);

    const recentData = salesData.slice(-7); // Last 7 days
    const avgRecent =
      recentData.reduce((sum, d) => sum + d.amount, 0) / recentData.length;
    const avgTx =
      recentData.reduce((sum, d) => sum + d.transactions, 0) / recentData.length;

    // Simple statistical anomaly detection
    const amountDeviation =
      Math.abs(avgRecent - historicalAverage.avgAmount) /
      historicalAverage.avgAmount;
    const txDeviation =
      Math.abs(avgTx - historicalAverage.avgTransactions) /
      historicalAverage.avgTransactions;

    if (amountDeviation > 0.5 || txDeviation > 0.5) {
      const prompt = `Analyze this vending machine sales anomaly:

Machine ID: ${machineId}
Recent 7-day average: ${avgRecent.toFixed(0)} UZS, ${avgTx.toFixed(0)} transactions
Historical average: ${historicalAverage.avgAmount.toFixed(0)} UZS, ${historicalAverage.avgTransactions.toFixed(0)} transactions
Amount deviation: ${(amountDeviation * 100).toFixed(1)}%
Transaction deviation: ${(txDeviation * 100).toFixed(1)}%

Raw data:
${JSON.stringify(recentData)}

Determine:
1. Is this a significant anomaly?
2. Possible causes (location issue, machine problem, seasonal, theft, etc.)
3. Severity (low, medium, high)
4. Recommendation

Return JSON:
{
  "isAnomaly": true,
  "type": "sales_drop",
  "severity": "medium",
  "description": "...",
  "recommendation": "..."
}`;

      return this.callTextLLM(prompt);
    }

    return {
      isAnomaly: false,
      severity: 'low',
      description: 'Sales within normal range',
    };
  }

  /**
   * Detect inventory anomalies
   */
  async detectInventoryAnomaly(
    productId: string,
    movements: { date: string; type: string; quantity: number }[],
    currentStock: number,
    expectedStock: number,
  ): Promise<AnomalyResult> {
    const discrepancy = Math.abs(currentStock - expectedStock);
    const discrepancyPercent =
      expectedStock > 0 ? (discrepancy / expectedStock) * 100 : 0;

    if (discrepancyPercent > 10) {
      return {
        isAnomaly: true,
        type: 'inventory_discrepancy',
        severity: discrepancyPercent > 30 ? 'high' : 'medium',
        description: `Inventory discrepancy: expected ${expectedStock}, actual ${currentStock} (${discrepancyPercent.toFixed(1)}% difference)`,
        recommendation:
          'Conduct physical inventory count and review recent movements',
      };
    }

    return {
      isAnomaly: false,
      severity: 'low',
      description: 'Inventory within acceptable range',
    };
  }

  // ========================================================================
  // PRODUCT CATEGORIZATION
  // ========================================================================

  /**
   * Suggest category for a product
   */
  async suggestCategory(
    productName: string,
    barcode?: string,
  ): Promise<CategorySuggestion> {
    const prompt = `Categorize this product for a vending machine in Uzbekistan:

Product name: ${productName}
Barcode: ${barcode || 'not provided'}

Categories: coffee, tea, beverage, water, juice, snack, chocolate, chips, cookies, gum, sandwich, fresh_food, ice_cream, other

Also suggest MXIK code if possible (Uzbekistan goods classifier).

Return JSON:
{
  "category": "snack",
  "subcategory": "chocolate",
  "confidence": 0.95,
  "mxikCode": "10710001001000000"
}`;

    return this.callTextLLM(prompt);
  }

  /**
   * Batch categorize products
   */
  async batchCategorize(
    products: { id: string; name: string; barcode?: string }[],
  ): Promise<Map<string, CategorySuggestion>> {
    const results = new Map<string, CategorySuggestion>();

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const prompt = `Categorize these vending machine products:

${batch.map((p, idx) => `${idx + 1}. ${p.name} (barcode: ${p.barcode || 'N/A'})`).join('\n')}

Return JSON array with same order:
[
  {"category": "...", "subcategory": "...", "confidence": 0.9}
]`;

      try {
        const batchResults = await this.callTextLLM(prompt);
        if (Array.isArray(batchResults)) {
          batch.forEach((product, idx) => {
            results.set(product.id, batchResults[idx]);
          });
        }
      } catch (error: any) {
        this.logger.error('Batch categorization failed', error);
      }
    }

    return results;
  }

  // ========================================================================
  // SMART SUGGESTIONS
  // ========================================================================

  /**
   * Suggest products for a machine based on location type
   */
  async suggestProductsForLocation(
    locationType: string,
    existingProducts: string[],
    targetAudience?: string,
  ): Promise<string[]> {
    const prompt = `Suggest vending machine products for this location in Uzbekistan:

Location type: ${locationType}
Target audience: ${targetAudience || 'general'}
Existing products: ${existingProducts.join(', ')}

Consider:
- Local preferences (Uzbekistan market)
- Location demographics
- Complement existing products
- Profit potential

Return JSON array of 5-10 product suggestions:
["Coca-Cola 0.5л", "Сникерс", "Lay's классические", ...]`;

    return this.callTextLLM(prompt);
  }

  /**
   * Suggest optimal pricing
   */
  async suggestPricing(
    productName: string,
    category: string,
    costPrice: number,
    locationType: string,
  ): Promise<{ minPrice: number; maxPrice: number; suggestedPrice: number }> {
    const prompt = `Suggest pricing for this vending machine product in Uzbekistan:

Product: ${productName}
Category: ${category}
Cost price: ${costPrice} UZS
Location: ${locationType}

Consider:
- Typical vending margins (40-100%)
- Location premium
- Competition
- UZS currency

Return JSON:
{
  "minPrice": ${Math.round(costPrice * 1.3)},
  "maxPrice": ${Math.round(costPrice * 2)},
  "suggestedPrice": ${Math.round(costPrice * 1.6)}
}`;

    return this.callTextLLM(prompt);
  }

  // ========================================================================
  // PRIVATE METHODS - LLM CALLS
  // ========================================================================

  private async callTextLLM(prompt: string): Promise<any> {
    if (this.preferredProvider === 'openai' && this.openaiApiKey) {
      return this.callOpenAI(prompt);
    } else if (this.anthropicApiKey) {
      return this.callAnthropic(prompt);
    } else {
      // Fallback to mock response for development
      this.logger.warn('No AI provider configured, using mock response');
      return this.getMockResponse(prompt);
    }
  }

  private async callOpenAI(prompt: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are an AI assistant for VendHub vending machine management system in Uzbekistan. Always respond with valid JSON when asked.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          },
          {
            headers: {
              Authorization: `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const content = response.data.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    } catch (error: any) {
      this.logger.error('OpenAI API call failed', error);
      throw new BadRequestException('AI service unavailable');
    }
  }

  private async callAnthropic(prompt: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: {
              'x-api-key': this.anthropicApiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
            },
          },
        ),
      );

      const content = response.data.content[0].text;
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    } catch (error: any) {
      this.logger.error('Anthropic API call failed', error);
      throw new BadRequestException('AI service unavailable');
    }
  }

  private async parseWithOpenAI(
    imageBase64: string,
    prompt: string,
  ): Promise<ProductImportResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 4000,
          },
          {
            headers: {
              Authorization: `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error: any) {
      this.logger.error('OpenAI vision call failed', error);
      throw new BadRequestException('Failed to parse image');
    }
  }

  private async parseWithAnthropic(
    imageBase64: string,
    prompt: string,
  ): Promise<ProductImportResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/jpeg',
                      data: imageBase64,
                    },
                  },
                  { type: 'text', text: prompt },
                ],
              },
            ],
          },
          {
            headers: {
              'x-api-key': this.anthropicApiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
            },
          },
        ),
      );

      const content = response.data.content[0].text;
      return JSON.parse(content);
    } catch (error: any) {
      this.logger.error('Anthropic vision call failed', error);
      throw new BadRequestException('Failed to parse image');
    }
  }

  private getMockResponse(prompt: string): any {
    // Development fallback
    if (prompt.includes('categorize') || prompt.includes('category')) {
      return { category: 'snack', subcategory: 'chocolate', confidence: 0.8 };
    }
    if (prompt.includes('sentiment') || prompt.includes('complaint')) {
      return {
        sentiment: 'negative',
        score: -0.5,
        keywords: ['проблема'],
        suggestedPriority: 'medium',
      };
    }
    if (prompt.includes('products')) {
      return {
        products: [
          { name: 'Sample Product', category: 'snack', confidence: 0.7 },
        ],
        confidence: 0.7,
      };
    }
    return { success: true, message: 'Mock response' };
  }
}
