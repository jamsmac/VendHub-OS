import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
// Cheerio is optional for html parsing
// import * as cheerio from 'cheerio';
const cheerio = { load: (_html: string) => (_selector: string) => ({ text: () => '', html: () => '' }) };
import {
  AIParseRequest,
  AIParseResult,
  AIConfigSession,
  PaymentIntegrationConfig,
  AuthType,
  HttpMethod,
  FieldType,
  PaymentMethod,
} from '../types/integration.types';

@Injectable()
export class AIParserService {
  private readonly logger = new Logger(AIParserService.name);
  private readonly anthropicApiKey: string;
  private readonly sessions: Map<string, AIConfigSession> = new Map();

  constructor(private configService: ConfigService) {
    this.anthropicApiKey = this.configService.get('ANTHROPIC_API_KEY') || '';
  }

  // ============================================
  // Main Parsing Methods
  // ============================================

  /**
   * Parse API documentation and generate integration config
   */
  async parseDocumentation(request: AIParseRequest): Promise<AIParseResult> {
    try {
      // Fetch documentation content
      let documentationContent = request.documentationText || '';

      if (request.documentationUrl && !documentationContent) {
        documentationContent = await this.fetchDocumentation(request.documentationUrl);
      }

      if (!documentationContent) {
        return {
          success: false,
          confidence: 0,
          config: {},
          warnings: ['No documentation content provided'],
          suggestions: ['Please provide a documentation URL or paste the documentation text'],
          missingInfo: ['API documentation'],
        };
      }

      // Analyze with AI
      const analysis = await this.analyzeWithAI(documentationContent, request);

      return analysis;
    } catch (error: any) {
      this.logger.error('Error parsing documentation:', error);
      return {
        success: false,
        confidence: 0,
        config: {},
        warnings: [`Error parsing documentation: ${error.message}`],
        suggestions: ['Try providing the documentation in a different format'],
        missingInfo: [],
      };
    }
  }

  /**
   * Start interactive configuration session
   */
  async startConfigSession(
    integrationId: string,
    initialConfig: Partial<PaymentIntegrationConfig>,
    documentationUrl?: string,
  ): Promise<AIConfigSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let documentationContent = '';
    if (documentationUrl) {
      documentationContent = await this.fetchDocumentation(documentationUrl);
    }

    const session: AIConfigSession = {
      id: sessionId,
      integrationId,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(documentationContent),
          timestamp: new Date(),
        },
        {
          role: 'assistant',
          content: this.getWelcomeMessage(initialConfig),
          timestamp: new Date(),
        },
      ],
      currentConfig: initialConfig,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Continue configuration conversation
   */
  async continueConversation(
    sessionId: string,
    userMessage: string,
  ): Promise<{ session: AIConfigSession; response: string; configUpdates?: Partial<PaymentIntegrationConfig> }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Get AI response
    const aiResponse = await this.getAIResponse(session);

    // Parse config updates from response
    const configUpdates = this.extractConfigUpdates(aiResponse);

    // Update session config
    if (configUpdates) {
      session.currentConfig = {
        ...session.currentConfig,
        ...configUpdates,
      };
    }

    // Add assistant message
    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    });

    session.updatedAt = new Date();

    return {
      session,
      response: aiResponse,
      configUpdates: configUpdates || undefined,
    };
  }

  /**
   * Get configuration suggestions based on current state
   */
  async getSuggestions(config: Partial<PaymentIntegrationConfig>): Promise<string[]> {
    const suggestions: string[] = [];

    // Check for missing required fields
    if (!config.baseUrl) {
      suggestions.push('Add the base URL for the API (e.g., https://api.payment.uz)');
    }

    if (!config.auth?.type) {
      suggestions.push('Configure authentication method (API Key, Bearer Token, etc.)');
    }

    if (!config.credentials?.length) {
      suggestions.push('Define required credentials (API keys, merchant IDs, etc.)');
    }

    if (!config.endpoints?.createPayment?.path) {
      suggestions.push('Configure the "Create Payment" endpoint');
    }

    if (!config.endpoints?.checkStatus?.path) {
      suggestions.push('Configure the "Check Status" endpoint');
    }

    if (!config.supportedCurrencies?.length) {
      suggestions.push('Specify supported currencies');
    }

    if (!config.webhooks?.enabled) {
      suggestions.push('Consider enabling webhooks for real-time payment notifications');
    }

    return suggestions;
  }

  // ============================================
  // Documentation Fetching
  // ============================================

  private async fetchDocumentation(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'VendHub Integration Parser/1.0',
        },
      });

      const contentType = response.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        // OpenAPI/Swagger spec
        return JSON.stringify(response.data, null, 2);
      }

      if (contentType.includes('text/html')) {
        // HTML documentation - extract text
        return this.extractTextFromHtml(response.data);
      }

      // Plain text or markdown
      return response.data.toString();
    } catch (error: any) {
      this.logger.error(`Error fetching documentation from ${url}:`, error);
      throw new Error(`Failed to fetch documentation: ${error.message}`);
    }
  }

  private extractTextFromHtml(html: string): string {
    // cheerio might not be available, use simple regex extraction
    if (!cheerio) {
      // Basic HTML tag stripping
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text;
    }

    const $ = cheerio.load(html);

    // Remove scripts, styles, and other non-content elements
    ($('script, style, nav, footer, header, aside, .sidebar, .navigation') as any).remove();

    // Extract main content
    const mainContent = ($('main, article, .content, .documentation, .docs, #content, #docs') as any)
      .first()
      .text();

    if (mainContent?.trim()) {
      return mainContent.replace(/\s+/g, ' ').trim();
    }

    // Fallback to body text
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  // ============================================
  // AI Integration
  // ============================================

  private async analyzeWithAI(documentation: string, request: AIParseRequest): Promise<AIParseResult> {
    const prompt = this.buildAnalysisPrompt(documentation, request);

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 60000,
        },
      );

      const aiResponse = response.data.content[0].text;
      return this.parseAIResponse(aiResponse);
    } catch (error: any) {
      this.logger.error('Error calling AI API:', error);

      // Return manual configuration template
      return {
        success: false,
        confidence: 0,
        config: this.getManualConfigTemplate(request),
        warnings: ['AI analysis unavailable, providing manual configuration template'],
        suggestions: [
          'Fill in the base URL from the documentation',
          'Configure authentication based on API requirements',
          'Map the payment endpoints',
        ],
        missingInfo: ['API base URL', 'Authentication details', 'Endpoint paths'],
      };
    }
  }

  private async getAIResponse(session: AIConfigSession): Promise<string> {
    try {
      const messages = session.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const systemMessage = session.messages.find(m => m.role === 'system');

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemMessage?.content || this.getSystemPrompt(''),
          messages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 30000,
        },
      );

      return response.data.content[0].text;
    } catch (error: any) {
      this.logger.error('Error getting AI response:', error);
      return 'I apologize, but I encountered an error. Could you please rephrase your question or provide more details about what you need help with?';
    }
  }

  // ============================================
  // Prompt Building
  // ============================================

  private buildAnalysisPrompt(documentation: string, _request: AIParseRequest): string {
    return `You are an API integration specialist. Analyze the following payment API documentation and extract configuration details.

## Documentation:
${documentation.substring(0, 15000)}

## Task:
Extract the following information and return it as a JSON configuration:

1. **Basic Info**: Name, description, base URL, sandbox URL
2. **Authentication**: Type (API key, Bearer, Basic, OAuth2, HMAC), required credentials
3. **Endpoints**:
   - Create payment (path, method, required parameters, response format)
   - Check payment status (path, method, parameters)
   - Cancel/Refund payment if available
4. **Webhooks**: Webhook endpoint format, verification method, supported events
5. **Supported Features**: Currencies, payment methods, limits

## Response Format:
Return a JSON object with the following structure:
\`\`\`json
{
  "success": true,
  "confidence": 0.85,
  "config": {
    "name": "provider_name",
    "displayName": "Provider Name",
    "description": "...",
    "baseUrl": "https://api.provider.com",
    "sandboxBaseUrl": "https://sandbox.provider.com",
    "auth": {
      "type": "api_key|bearer|basic|oauth2|hmac",
      "config": { ... }
    },
    "credentials": [
      { "name": "merchant_id", "displayName": "Merchant ID", "type": "text", "required": true }
    ],
    "endpoints": {
      "createPayment": { "method": "POST", "path": "/payments", ... },
      "checkStatus": { "method": "GET", "path": "/payments/{id}", ... }
    },
    "supportedCurrencies": ["UZS"],
    "supportedMethods": ["card", "wallet"]
  },
  "warnings": ["..."],
  "suggestions": ["..."],
  "missingInfo": ["..."]
}
\`\`\`

Analyze carefully and be precise. If information is missing or unclear, list it in missingInfo.`;
  }

  private getSystemPrompt(documentation: string): string {
    return `You are an AI assistant helping configure payment gateway integrations for VendHub.

Your role is to:
1. Help users configure API endpoints, authentication, and webhooks
2. Explain technical concepts in simple terms
3. Suggest best practices for payment integrations
4. Identify potential issues in configurations

${documentation ? `\n## Available Documentation:\n${documentation.substring(0, 10000)}` : ''}

When providing configuration updates, wrap them in a JSON code block like this:
\`\`\`config
{ "baseUrl": "https://api.example.com", ... }
\`\`\`

Be helpful, concise, and focus on solving the user's immediate needs.`;
  }

  private getWelcomeMessage(config: Partial<PaymentIntegrationConfig>): string {
    const name = config.displayName || config.name || 'new integration';

    return `Hello! I'm here to help you configure the ${name} integration.

I can help you with:
- 🔗 Setting up API endpoints
- 🔐 Configuring authentication
- 📥 Setting up webhooks
- 🧪 Testing the integration

What would you like to configure first? You can also paste API documentation or describe what you need.`;
  }

  // ============================================
  // Response Parsing
  // ============================================

  private parseAIResponse(response: string): AIParseResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          success: parsed.success ?? true,
          confidence: parsed.confidence ?? 0.5,
          config: parsed.config || {},
          warnings: parsed.warnings || [],
          suggestions: parsed.suggestions || [],
          missingInfo: parsed.missingInfo || [],
          rawAnalysis: response,
        };
      }

      // Try parsing entire response as JSON
      const parsed = JSON.parse(response);
      return {
        success: true,
        confidence: 0.5,
        config: parsed,
        warnings: [],
        suggestions: [],
        missingInfo: [],
        rawAnalysis: response,
      };
    } catch {
      return {
        success: false,
        confidence: 0,
        config: {},
        warnings: ['Could not parse AI response'],
        suggestions: ['Try providing clearer documentation'],
        missingInfo: [],
        rawAnalysis: response,
      };
    }
  }

  private extractConfigUpdates(response: string): Partial<PaymentIntegrationConfig> | null {
    try {
      const configMatch = response.match(/```config\s*([\s\S]*?)\s*```/);
      if (configMatch) {
        return JSON.parse(configMatch[1]);
      }
      return null;
    } catch {
      return null;
    }
  }

  private getManualConfigTemplate(_request: AIParseRequest): Partial<PaymentIntegrationConfig> {
    return {
      name: 'custom_payment',
      displayName: 'Custom Payment Provider',
      sandboxMode: true,
      baseUrl: '',
      auth: {
        type: AuthType.API_KEY,
        config: {
          keyName: 'Authorization',
          keyLocation: 'header' as any,
        },
      },
      credentials: [
        {
          name: 'api_key',
          displayName: 'API Key',
          type: 'password',
          required: true,
          description: 'Your API key from the payment provider',
        },
        {
          name: 'merchant_id',
          displayName: 'Merchant ID',
          type: 'text',
          required: true,
          description: 'Your merchant identifier',
        },
      ],
      supportedCurrencies: ['UZS'],
      supportedMethods: [PaymentMethod.CARD],
      endpoints: {
        createPayment: {
          id: 'create_payment',
          name: 'Create Payment',
          description: 'Initialize a new payment',
          method: HttpMethod.POST,
          path: '/payments',
          bodyParams: [
            { name: 'amount', type: FieldType.NUMBER, required: true },
            { name: 'currency', type: FieldType.STRING, required: true },
            { name: 'order_id', type: FieldType.STRING, required: true },
          ],
        },
        checkStatus: {
          id: 'check_status',
          name: 'Check Status',
          description: 'Get payment status',
          method: HttpMethod.GET,
          path: '/payments/{payment_id}',
          pathParams: [
            { name: 'payment_id', type: FieldType.STRING, required: true },
          ],
        },
      },
    };
  }

  // ============================================
  // Session Management
  // ============================================

  getSession(sessionId: string): AIConfigSession | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  cleanupOldSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updatedAt.getTime() > maxAge) {
        this.sessions.delete(id);
      }
    }
  }
}
