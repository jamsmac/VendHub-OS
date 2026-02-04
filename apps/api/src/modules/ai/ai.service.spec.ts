import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const makeAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  });

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;

    configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'OPENAI_API_KEY':
            return 'test-openai-key';
          case 'ANTHROPIC_API_KEY':
            return 'test-anthropic-key';
          case 'AI_PROVIDER':
            return 'openai';
          default:
            return '';
        }
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================================================
  // parseProductsFromImage
  // ========================================================================

  describe('parseProductsFromImage', () => {
    const mockImageResult = {
      products: [
        { name: 'Cola', category: 'beverage', price: 5000, confidence: 0.95 },
      ],
      confidence: 0.9,
    };

    it('should parse products from image using OpenAI when preferred', async () => {
      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: JSON.stringify(mockImageResult) } }],
          }),
        ),
      );

      const result = await service.parseProductsFromImage('base64imagedata', 'Menu photo');

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Cola');
      expect(result.confidence).toBe(0.9);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({ model: 'gpt-4o' }),
        expect.any(Object),
      );
    });

    it('should fall back to Anthropic when OpenAI key is not set', async () => {
      // Recreate service with no OpenAI key
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return '';
        if (key === 'ANTHROPIC_API_KEY') return 'test-anthropic-key';
        if (key === 'AI_PROVIDER') return 'openai';
        return '';
      });

      const module = await Test.createTestingModule({
        providers: [
          AiService,
          { provide: HttpService, useValue: httpService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const svcNoOpenAI = module.get<AiService>(AiService);

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            content: [{ text: JSON.stringify(mockImageResult) }],
          }),
        ),
      );

      const result = await svcNoOpenAI.parseProductsFromImage('base64imagedata');

      expect(result.products).toHaveLength(1);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when no AI provider is configured', async () => {
      configService.get.mockReturnValue('');

      const module = await Test.createTestingModule({
        providers: [
          AiService,
          { provide: HttpService, useValue: httpService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const svcNoProvider = module.get<AiService>(AiService);

      await expect(svcNoProvider.parseProductsFromImage('base64'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OpenAI vision API fails', async () => {
      httpService.post.mockReturnValue(
        throwError(() => new Error('API error')),
      );

      await expect(service.parseProductsFromImage('base64'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // parseProductsFromText
  // ========================================================================

  describe('parseProductsFromText', () => {
    it('should parse products from text using OpenAI', async () => {
      const mockResult = {
        products: [{ name: 'Snickers', category: 'snack', price: 8000, confidence: 0.9 }],
        confidence: 0.85,
        rawText: 'Snickers - 8000',
      };

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: JSON.stringify(mockResult) } }],
          }),
        ),
      );

      const result = await service.parseProductsFromText('Snickers - 8000 UZS', 'plain');

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Snickers');
    });
  });

  // ========================================================================
  // analyzeComplaint
  // ========================================================================

  describe('analyzeComplaint', () => {
    it('should return sentiment analysis result', async () => {
      const mockSentiment = {
        sentiment: 'negative',
        score: -0.7,
        keywords: ['не работает', 'возврат'],
        suggestedPriority: 'high',
      };

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: JSON.stringify(mockSentiment) } }],
          }),
        ),
      );

      const result = await service.analyzeComplaint(
        'Machine not working',
        'Machine at location X is not dispensing products',
        'technical',
      );

      expect(result.sentiment).toBe('negative');
      expect(result.suggestedPriority).toBe('high');
      expect(result.keywords).toContain('не работает');
    });
  });

  // ========================================================================
  // suggestComplaintResponse
  // ========================================================================

  describe('suggestComplaintResponse', () => {
    it('should return a suggested response string', async () => {
      const responseText = 'Dear customer, we apologize for the inconvenience...';

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: responseText } }],
          }),
        ),
      );

      const result = await service.suggestComplaintResponse({
        subject: 'Broken machine',
        description: 'Machine stuck',
        category: 'technical',
        customerName: 'Aziz',
      }, 'ru');

      // Result is either string or JSON stringified
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // detectSalesAnomaly
  // ========================================================================

  describe('detectSalesAnomaly', () => {
    it('should return no anomaly when sales are within normal range', async () => {
      const salesData = Array.from({ length: 7 }, (_, i) => ({
        date: `2025-01-${15 + i}`,
        amount: 100000,
        transactions: 20,
      }));

      const result = await service.detectSalesAnomaly(
        'machine-1',
        salesData,
        { avgAmount: 100000, avgTransactions: 20 },
      );

      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBe('low');
    });

    it('should detect anomaly when sales deviate significantly', async () => {
      const salesData = Array.from({ length: 7 }, (_, i) => ({
        date: `2025-01-${15 + i}`,
        amount: 30000, // Much lower than historical
        transactions: 5,
      }));

      const mockAnomalyResult = {
        isAnomaly: true,
        type: 'sales_drop',
        severity: 'high',
        description: 'Significant drop in sales',
        recommendation: 'Check machine location',
      };

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: JSON.stringify(mockAnomalyResult) } }],
          }),
        ),
      );

      const result = await service.detectSalesAnomaly(
        'machine-1',
        salesData,
        { avgAmount: 100000, avgTransactions: 20 },
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('sales_drop');
    });
  });

  // ========================================================================
  // detectInventoryAnomaly
  // ========================================================================

  describe('detectInventoryAnomaly', () => {
    it('should return no anomaly when stock is within 10% range', async () => {
      const result = await service.detectInventoryAnomaly(
        'product-1',
        [],
        48, // current
        50, // expected
      );

      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBe('low');
    });

    it('should detect medium anomaly when discrepancy is 10-30%', async () => {
      const result = await service.detectInventoryAnomaly(
        'product-1',
        [],
        35, // current
        50, // expected -- 30% off
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('inventory_discrepancy');
      expect(result.severity).toBe('medium');
    });

    it('should detect high anomaly when discrepancy exceeds 30%', async () => {
      const result = await service.detectInventoryAnomaly(
        'product-1',
        [],
        10, // current
        50, // expected -- 80% off
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should handle zero expected stock gracefully', async () => {
      const result = await service.detectInventoryAnomaly(
        'product-1',
        [],
        0,
        0,
      );

      expect(result.isAnomaly).toBe(false);
    });
  });

  // ========================================================================
  // suggestCategory
  // ========================================================================

  describe('suggestCategory', () => {
    it('should return category suggestion for a product', async () => {
      const mockCategory = {
        category: 'snack',
        subcategory: 'chocolate',
        confidence: 0.95,
        mxikCode: '10710001001000000',
      };

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: JSON.stringify(mockCategory) } }],
          }),
        ),
      );

      const result = await service.suggestCategory('Snickers');

      expect(result.category).toBe('snack');
      expect(result.confidence).toBe(0.95);
    });
  });

  // ========================================================================
  // batchCategorize
  // ========================================================================

  describe('batchCategorize', () => {
    it('should batch categorize products', async () => {
      const mockCategories = [
        { category: 'snack', subcategory: 'chocolate', confidence: 0.9 },
        { category: 'beverage', subcategory: 'soda', confidence: 0.85 },
      ];

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: JSON.stringify(mockCategories) } }],
          }),
        ),
      );

      const products = [
        { id: '1', name: 'Snickers', barcode: '123' },
        { id: '2', name: 'Cola', barcode: '456' },
      ];

      const result = await service.batchCategorize(products);

      expect(result.size).toBe(2);
      expect(result.get('1')?.category).toBe('snack');
      expect(result.get('2')?.category).toBe('beverage');
    });

    it('should handle API failure in batch gracefully', async () => {
      httpService.post.mockReturnValue(
        throwError(() => new Error('API error')),
      );

      const products = [{ id: '1', name: 'Test' }];

      // Should not throw, just return empty results
      const result = await service.batchCategorize(products);
      expect(result.size).toBe(0);
    });
  });

  // ========================================================================
  // suggestProductsForLocation
  // ========================================================================

  describe('suggestProductsForLocation', () => {
    it('should return product suggestions', async () => {
      const suggestions = ['Coca-Cola 0.5', 'Snickers', 'Lay\'s'];

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: JSON.stringify(suggestions) } }],
          }),
        ),
      );

      const result = await service.suggestProductsForLocation(
        'office',
        ['Water'],
        'office workers',
      );

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(3);
    });
  });

  // ========================================================================
  // suggestPricing
  // ========================================================================

  describe('suggestPricing', () => {
    it('should return pricing suggestion', async () => {
      const pricing = {
        minPrice: 6500,
        maxPrice: 10000,
        suggestedPrice: 8000,
      };

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            choices: [{ message: { content: JSON.stringify(pricing) } }],
          }),
        ),
      );

      const result = await service.suggestPricing('Snickers', 'snack', 5000, 'office');

      expect(result.minPrice).toBe(6500);
      expect(result.maxPrice).toBe(10000);
      expect(result.suggestedPrice).toBe(8000);
    });
  });

  // ========================================================================
  // Mock Fallback
  // ========================================================================

  describe('mock fallback (no AI keys)', () => {
    let noKeyService: AiService;

    beforeEach(async () => {
      const noKeyConfig = {
        get: jest.fn(() => ''),
      } as any;

      const module = await Test.createTestingModule({
        providers: [
          AiService,
          { provide: HttpService, useValue: httpService },
          { provide: ConfigService, useValue: noKeyConfig },
        ],
      }).compile();

      noKeyService = module.get<AiService>(AiService);
    });

    it('should return mock sentiment for complaint prompt', async () => {
      const result = await noKeyService.analyzeComplaint('Issue', 'Problem with machine', 'technical');

      expect(result.sentiment).toBe('negative');
      expect(result.suggestedPriority).toBe('medium');
    });

    it('should return mock category for categorization prompt', async () => {
      const result = await noKeyService.suggestCategory('Chocolate bar');

      expect(result.category).toBe('snack');
    });

    it('should return mock products for product prompt', async () => {
      const result = await noKeyService.parseProductsFromText('some products text');

      expect(result.products).toBeDefined();
    });
  });

  // ========================================================================
  // Anthropic provider path
  // ========================================================================

  describe('Anthropic API provider', () => {
    let anthropicService: AiService;

    beforeEach(async () => {
      const anthropicConfig = {
        get: jest.fn((key: string) => {
          if (key === 'OPENAI_API_KEY') return '';
          if (key === 'ANTHROPIC_API_KEY') return 'test-key';
          if (key === 'AI_PROVIDER') return 'anthropic';
          return '';
        }),
      } as any;

      const module = await Test.createTestingModule({
        providers: [
          AiService,
          { provide: HttpService, useValue: httpService },
          { provide: ConfigService, useValue: anthropicConfig },
        ],
      }).compile();

      anthropicService = module.get<AiService>(AiService);
    });

    it('should call Anthropic API for text prompts', async () => {
      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            content: [{ text: JSON.stringify({ category: 'beverage', confidence: 0.9 }) }],
          }),
        ),
      );

      const result = await anthropicService.suggestCategory('Cola');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01',
          }),
        }),
      );
      expect(result.category).toBe('beverage');
    });

    it('should throw BadRequestException when Anthropic API fails', async () => {
      httpService.post.mockReturnValue(
        throwError(() => new Error('Anthropic error')),
      );

      await expect(anthropicService.suggestCategory('Cola'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
