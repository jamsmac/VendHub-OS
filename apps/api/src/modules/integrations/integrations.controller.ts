import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { IntegrationService } from './services/integration.service';
import { AIParserService } from './services/ai-parser.service';
import { IntegrationTesterService } from './services/integration-tester.service';
import { PaymentExecutorService, CreatePaymentRequest } from './services/payment-executor.service';
import {
  IntegrationStatus,
  IntegrationCategory,
  PaymentIntegrationConfig,
  AIParseRequest,
} from './types/integration.types';
import { templates, getTemplate, searchTemplates } from './templates';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(
    private integrationService: IntegrationService,
    private aiParserService: AIParserService,
    private testerService: IntegrationTesterService,
    private paymentExecutor: PaymentExecutorService,
  ) {}

  // ============================================
  // Integration CRUD
  // ============================================

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get all integrations for organization' })
  @ApiQuery({ name: 'category', enum: IntegrationCategory, required: false })
  async findAll(
    @Req() req: any,
    @Query('category') category?: IntegrationCategory,
  ) {
    return this.integrationService.findAll(req.user.organizationId, category);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get integration by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.integrationService.findOne(id, req.user.organizationId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create new integration' })
  async create(
    @Body() data: {
      name: string;
      displayName: string;
      category: IntegrationCategory;
      description?: string;
      templateId?: string;
      documentationUrl?: string;
    },
    @Req() req: any,
  ) {
    return this.integrationService.create(
      req.user.organizationId,
      data,
      req.user.id,
    );
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update integration' })
  async update(
    @Param('id') id: string,
    @Body() data: Partial<{
      displayName: string;
      description: string;
      priority: number;
      sandboxMode: boolean;
    }>,
    @Req() req: any,
  ) {
    return this.integrationService.update(
      id,
      req.user.organizationId,
      data,
      req.user.id,
    );
  }

  @Patch(':id/config')
  @Roles('admin')
  @ApiOperation({ summary: 'Update integration configuration' })
  async updateConfig(
    @Param('id') id: string,
    @Body() config: Partial<PaymentIntegrationConfig>,
    @Req() req: any,
  ) {
    return this.integrationService.updateConfig(
      id,
      req.user.organizationId,
      config,
      req.user.id,
    );
  }

  @Patch(':id/credentials')
  @Roles('admin')
  @ApiOperation({ summary: 'Update integration credentials' })
  async updateCredentials(
    @Param('id') id: string,
    @Body() data: {
      credentials: Record<string, string>;
      isSandbox: boolean;
    },
    @Req() req: any,
  ) {
    return this.integrationService.updateCredentials(
      id,
      req.user.organizationId,
      data.credentials,
      data.isSandbox,
      req.user.id,
    );
  }

  @Patch(':id/status')
  @Roles('admin')
  @ApiOperation({ summary: 'Update integration status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: IntegrationStatus },
    @Req() req: any,
  ) {
    return this.integrationService.updateStatus(
      id,
      req.user.organizationId,
      data.status,
      req.user.id,
    );
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete integration' })
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.integrationService.delete(id, req.user.organizationId);
  }

  // ============================================
  // Templates
  // ============================================

  @Get('templates/all')
  @ApiOperation({ summary: 'Get all available templates' })
  @ApiQuery({ name: 'category', enum: IntegrationCategory, required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getTemplates(
    @Query('category') category?: IntegrationCategory,
    @Query('country') country?: string,
    @Query('search') search?: string,
  ) {
    let result = templates;

    if (category) {
      result = result.filter(t => t.category === category);
    }

    if (country) {
      result = result.filter(t => t.country === country);
    }

    if (search) {
      result = searchTemplates(search);
    }

    // Return without full config for listing
    return result.map(({ config, ...rest }) => ({
      ...rest,
      hasWebhooks: !!config.webhooks?.enabled,
      supportedMethods: config.supportedMethods,
      supportedCurrencies: config.supportedCurrencies,
    }));
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  async getTemplate(@Param('id') id: string) {
    const template = getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // ============================================
  // AI Configuration
  // ============================================

  @Post('ai/parse')
  @Roles('admin')
  @ApiOperation({ summary: 'Parse API documentation with AI' })
  async parseDocumentation(@Body() request: AIParseRequest) {
    return this.aiParserService.parseDocumentation(request);
  }

  @Post(':id/ai/session')
  @Roles('admin')
  @ApiOperation({ summary: 'Start AI configuration session' })
  async startAISession(
    @Param('id') id: string,
    @Body() data: { documentationUrl?: string },
    @Req() req: any,
  ) {
    const integration = await this.integrationService.findOne(id, req.user.organizationId);
    return this.aiParserService.startConfigSession(
      id,
      integration.config,
      data.documentationUrl,
    );
  }

  @Post('ai/session/:sessionId/message')
  @Roles('admin')
  @ApiOperation({ summary: 'Send message to AI configuration session' })
  async sendAIMessage(
    @Param('sessionId') sessionId: string,
    @Body() data: { message: string },
  ) {
    return this.aiParserService.continueConversation(sessionId, data.message);
  }

  @Get('ai/session/:sessionId')
  @Roles('admin')
  @ApiOperation({ summary: 'Get AI session state' })
  async getAISession(@Param('sessionId') sessionId: string) {
    return this.aiParserService.getSession(sessionId);
  }

  @Post(':id/ai/suggestions')
  @Roles('admin')
  @ApiOperation({ summary: 'Get AI suggestions for integration' })
  async getAISuggestions(@Param('id') id: string, @Req() req: any) {
    const integration = await this.integrationService.findOne(id, req.user.organizationId);
    return this.aiParserService.getSuggestions(integration.config);
  }

  // ============================================
  // Testing
  // ============================================

  @Post(':id/test')
  @Roles('admin')
  @ApiOperation({ summary: 'Run test suite for integration' })
  async runTests(@Param('id') id: string, @Req() req: any) {
    const integration = await this.integrationService.findOne(id, req.user.organizationId);
    return this.testerService.runTestSuite(integration);
  }

  @Post(':id/test/connectivity')
  @Roles('admin')
  @ApiOperation({ summary: 'Test connectivity' })
  async testConnectivity(@Param('id') id: string, @Req() req: any) {
    const integration = await this.integrationService.findOne(id, req.user.organizationId);
    return this.testerService.testConnectivity(integration);
  }

  @Post(':id/test/credentials')
  @Roles('admin')
  @ApiOperation({ summary: 'Validate credentials' })
  async validateCredentials(@Param('id') id: string, @Req() req: any) {
    const integration = await this.integrationService.findOne(id, req.user.organizationId);
    return this.testerService.validateCredentials(integration);
  }

  // ============================================
  // Logs & Statistics
  // ============================================

  @Get(':id/logs')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get integration logs' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'success', required: false })
  async getLogs(
    @Param('id') id: string,
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('success') success?: string,
  ) {
    return this.integrationService.getLogs(id, req.user.organizationId, {
      limit: limit || 50,
      offset: offset || 0,
      success: success === undefined ? undefined : success === 'true',
    });
  }

  @Get(':id/stats')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get integration statistics' })
  async getStatistics(@Param('id') id: string, @Req() req: any) {
    return this.integrationService.getStatistics(id, req.user.organizationId);
  }

  // ============================================
  // Payment Operations (for internal use)
  // ============================================

  @Post(':id/pay')
  @Roles('admin')
  @ApiOperation({ summary: 'Create payment (sandbox testing)' })
  async createPayment(
    @Param('id') id: string,
    @Body() request: CreatePaymentRequest,
    @Req() req: any,
  ) {
    const integration = await this.integrationService.findOne(id, req.user.organizationId);
    return this.paymentExecutor.createPayment(integration, request);
  }

  @Get(':id/pay/:paymentId')
  @Roles('admin')
  @ApiOperation({ summary: 'Check payment status (sandbox testing)' })
  async checkPaymentStatus(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Req() req: any,
  ) {
    const integration = await this.integrationService.findOne(id, req.user.organizationId);
    return this.paymentExecutor.checkPaymentStatus(integration, paymentId);
  }
}
